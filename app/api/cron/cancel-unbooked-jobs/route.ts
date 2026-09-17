import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const CRON_SECRET =
  process.env.CRON_SECRET;

const CANCELLATION_REASON =
  "We're sorry, but we couldn't find an available RCS driver for this collection.";

const CANCELLATION_MESSAGE =
  "We're sorry, but we couldn't find an available RCS driver for this collection. Please contact RCS if you'd like help arranging an alternative collection.";

function getAdminClient() {
  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Supabase server configuration is missing.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

/*
 * ============================================================
 * CRON AUTHENTICATION
 * ============================================================
 *
 * Vercel sends:
 *
 * Authorization: Bearer <CRON_SECRET>
 *
 * This prevents somebody else from manually
 * triggering the cancellation endpoint.
 * ============================================================
 */

function isAuthorised(
  request: Request,
) {
  if (!CRON_SECRET) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (!authorization) {
    return false;
  }

  return (
    authorization ===
    `Bearer ${CRON_SECRET}`
  );
}

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function getTodayUtcDate() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
}

/*
 * We cancel jobs whose collection date is
 * tomorrow or earlier.
 *
 * Because the cron runs automatically each day,
 * this gives the marketplace a sensible
 * cancellation window without touching jobs
 * that are booked.
 */
function getCancellationCutoffDate() {
  const today =
    getTodayUtcDate();

  today.setUTCDate(
    today.getUTCDate() + 1,
  );

  return today
    .toISOString()
    .slice(0, 10);
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: Request,
) {
  try {
    /*
     * --------------------------------------------------------
     * SECURITY
     * --------------------------------------------------------
     */

    if (!isAuthorised(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorised.",
        },
        {
          status: 401,
        },
      );
    }

    const supabase =
      getAdminClient();

    const cutoffDate =
      getCancellationCutoffDate();

    /*
     * --------------------------------------------------------
     * FIND UNBOOKED JOBS
     * --------------------------------------------------------
     *
     * IMPORTANT:
     *
     * A job is only cancelled if:
     *
     * - it is open/bidding
     * - it has a collection date
     * - the collection date is tomorrow or earlier
     * - it has NO assigned driver
     * - it has NO accepted bid
     * - it has NO assigned bid
     *
     * A job with bids is still considered unbooked.
     * --------------------------------------------------------
     */

    const {
      data: jobs,
      error: jobsError,
    } = await supabase
      .from("jobs")
      .select(
        `
        id,
        reference,
        customer_id,
        preferred_date,
        status,
        assigned_driver_id,
        accepted_bid_id,
        assigned_bid_id
        `,
      )
      .in("status", [
        "open",
        "bidding",
      ])
      .not(
        "preferred_date",
        "is",
        null,
      )
      .lte(
        "preferred_date",
        cutoffDate,
      )
      .is(
        "assigned_driver_id",
        null,
      )
      .is(
        "accepted_bid_id",
        null,
      )
      .is(
        "assigned_bid_id",
        null,
      );

    if (jobsError) {
      console.error(
        "UNBOOKED JOB LOOKUP ERROR:",
        jobsError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to find unbooked jobs.",
        },
        {
          status: 500,
        },
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        cancelled: 0,
        message:
          "No unbooked jobs required cancellation.",
        cutoffDate,
      });
    }

    /*
     * --------------------------------------------------------
     * CANCEL EACH JOB
     * --------------------------------------------------------
     */

    const cancelledJobs: Array<{
      id: number;
      reference: string;
      customerId: string;
    }> = [];

    const failedJobs: Array<{
      id: number;
      reference: string;
      error: string;
    }> = [];

    for (const job of jobs) {
      /*
       * Extra safety check immediately before
       * cancellation.
       *
       * This protects against a driver/customer
       * booking the job while the cron is running.
       */

      const {
        data: latestJob,
        error: latestJobError,
      } = await supabase
        .from("jobs")
        .select(
          `
          id,
          reference,
          status,
          assigned_driver_id,
          accepted_bid_id,
          assigned_bid_id
          `,
        )
        .eq(
          "id",
          job.id,
        )
        .maybeSingle();

      if (latestJobError) {
        failedJobs.push({
          id: job.id,
          reference:
            job.reference ||
            `Job #${job.id}`,
          error:
            latestJobError.message,
        });

        continue;
      }

      if (!latestJob) {
        continue;
      }

      const stillUnbooked =
        [
          "open",
          "bidding",
        ].includes(
          String(
            latestJob.status ||
              "",
          ).toLowerCase(),
        ) &&
        !latestJob.assigned_driver_id &&
        !latestJob.accepted_bid_id &&
        !latestJob.assigned_bid_id;

      if (!stillUnbooked) {
        /*
         * Somebody booked it while the cron
         * was processing.
         */
        continue;
      }

      /*
       * ------------------------------------------------------
       * UPDATE JOB
       * ------------------------------------------------------
       */

      const {
        error: updateError,
      } = await supabase
        .from("jobs")
        .update({
          status: "cancelled",
          journey_status: "cancelled",
          cancellation_reason:
            CANCELLATION_REASON,
          cancelled_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          job.id,
        )
        .in("status", [
          "open",
          "bidding",
        ])
        .is(
          "assigned_driver_id",
          null,
        )
        .is(
          "accepted_bid_id",
          null,
        )
        .is(
          "assigned_bid_id",
          null,
        );

      if (updateError) {
        console.error(
          `Failed to cancel job ${job.id}:`,
          updateError,
        );

        failedJobs.push({
          id: job.id,
          reference:
            job.reference ||
            `Job #${job.id}`,
          error:
            updateError.message,
        });

        continue;
      }

      /*
       * ------------------------------------------------------
       * DECLINE REMAINING BIDS
       * ------------------------------------------------------
       *
       * Drivers who already submitted a bid should
       * no longer see that bid as pending.
       */

      const {
        error: bidError,
      } = await supabase
        .from("bids")
        .update({
          status: "declined",
        })
        .eq(
          "job_id",
          job.id,
        )
        .in("status", [
          "pending",
          "",
        ]);

      if (bidError) {
        /*
         * Do not undo the job cancellation.
         *
         * The job itself has already been safely
         * cancelled.
         */

        console.warn(
          `Could not update bids for job ${job.id}:`,
          bidError,
        );
      }

      cancelledJobs.push({
        id: job.id,
        reference:
          job.reference ||
          `Job #${job.id}`,
        customerId:
          job.customer_id,
      });
    }

    /*
     * --------------------------------------------------------
     * RESULT
     * --------------------------------------------------------
     */

    return NextResponse.json({
      success: true,
      cancelled:
        cancelledJobs.length,
      failed:
        failedJobs.length,
      cutoffDate,
      cancellationMessage:
        CANCELLATION_MESSAGE,
      jobs: cancelledJobs,
      failures: failedJobs,
    });
  } catch (error) {
    console.error(
      "AUTO CANCELLATION ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Automatic job cancellation failed.",
      },
      {
        status: 500,
      },
    );
  }
}