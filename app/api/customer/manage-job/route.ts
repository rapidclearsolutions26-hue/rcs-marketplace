import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Supabase server configuration is missing.",
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isLockedJob(
  job: {
    status?: string | null;
    journey_status?: string | null;
    accepted_bid_id?: number | null;
    assigned_driver_id?: string | null;
    assigned_bid_id?: number | null;
  },
) {
  const status =
    cleanText(job.status).toLowerCase();

  const journeyStatus =
    cleanText(
      job.journey_status,
    ).toLowerCase();

  /*
   * Once a driver has been selected/assigned,
   * the customer can no longer edit or delete
   * the job.
   */

  if (
    job.accepted_bid_id !== null &&
    job.accepted_bid_id !== undefined
  ) {
    return true;
  }

  if (
    job.assigned_driver_id
  ) {
    return true;
  }

  if (
    job.assigned_bid_id !== null &&
    job.assigned_bid_id !== undefined
  ) {
    return true;
  }

  const lockedStatuses = [
    "accepted",
    "assigned",
    "driver_assigned",
    "driver assigned",
    "booked",
    "in progress",
    "in_progress",
    "on the way",
    "on_way",
    "arriving",
    "started",
    "completed",
    "complete",
    "collected",
    "collection completed",
    "closed",
    "cancelled",
    "canceled",
  ];

  if (
    lockedStatuses.includes(
      status,
    )
  ) {
    return true;
  }

  if (
    lockedStatuses.includes(
      journeyStatus,
    )
  ) {
    return true;
  }

  return false;
}

async function getAuthenticatedUser(
  request: Request,
) {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const accessToken =
    authorization
      .substring(7)
      .trim();

  if (!accessToken) {
    return null;
  }

  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    return null;
  }

  const admin =
    getAdminClient();

  const {
    data,
    error,
  } =
    await admin.auth.getUser(
      accessToken,
    );

  if (
    error ||
    !data.user
  ) {
    return null;
  }

  return data.user;
}

export async function POST(
  request: Request,
) {
  try {
    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey
    ) {
      return NextResponse.json(
        {
          error:
            "RCS is not configured correctly. Please contact support.",
        },
        { status: 500 },
      );
    }

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request. Please try again.",
        },
        { status: 400 },
      );
    }

    const action =
      cleanText(
        body?.action,
      ).toLowerCase();

    if (
      action !== "update" &&
      action !== "delete"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid job action.",
        },
        { status: 400 },
      );
    }

    const user =
      await getAuthenticatedUser(
        request,
      );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Your customer session has expired. Please log in again.",
        },
        { status: 401 },
      );
    }

    const jobId =
      Number(body?.jobId);

    if (
      !Number.isInteger(jobId) ||
      jobId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid job ID.",
        },
        { status: 400 },
      );
    }

    const admin =
      getAdminClient();

    /*
     * =======================================================
     * LOAD JOB
     * =======================================================
     *
     * We only look up a job belonging to the logged-in
     * customer.
     */

    const {
      data: job,
      error: jobError,
    } =
      await admin
        .from("jobs")
        .select(
          `
            id,
            reference,
            customer_id,
            job_type,
            postcode,
            address,
            load_size,
            description,
            floor,
            stairs,
            access_notes,
            preferred_date,
            preferred_time,
            status,
            journey_status,
            accepted_bid_id,
            assigned_driver_id,
            assigned_bid_id
          `,
        )
        .eq(
          "id",
          jobId,
        )
        .eq(
          "customer_id",
          user.id,
        )
        .single();

    if (
      jobError ||
      !job
    ) {
      console.error(
        "MANAGE JOB LOAD ERROR:",
        jobError,
      );

      return NextResponse.json(
        {
          error:
            "We couldn't find this job or you don't have access to it.",
        },
        { status: 404 },
      );
    }

    /*
     * =======================================================
     * PROTECT LOCKED JOBS
     * =======================================================
     */

    if (
      isLockedJob(job)
    ) {
      return NextResponse.json(
        {
          error:
            "This job can no longer be edited or deleted because a driver has been selected or the collection has started.",
          code:
            "JOB_LOCKED",
        },
        { status: 409 },
      );
    }

    /*
     * =======================================================
     * DELETE
     * =======================================================
     */

    if (
      action === "delete"
    ) {
      /*
       * Find all customer-uploaded photos belonging
       * to this job.
       */

      const {
        data: photoRows,
        error:
          photoRowsError,
      } =
        await admin
          .from(
            "job_photos",
          )
          .select(
            "storage_path",
          )
          .eq(
            "job_id",
            jobId,
          );

      if (
        photoRowsError
      ) {
        console.error(
          "JOB PHOTO LOOKUP ERROR:",
          photoRowsError,
        );

        return NextResponse.json(
          {
            error:
              "We couldn't prepare this job for deletion.",
          },
          { status: 500 },
        );
      }

      const storagePaths =
        (
          photoRows ||
          []
        )
          .map(
            (
              row,
            ) =>
              row.storage_path,
          )
          .filter(
            (
              path,
            ): path is string =>
              typeof path ===
              "string" &&
              path.length > 0,
          );

      /*
       * Delete customer job photos from storage.
       */

      if (
        storagePaths.length >
        0
      ) {
        const {
          error:
            storageError,
        } =
          await admin.storage
            .from(
              "customer-job-photos",
            )
            .remove(
              storagePaths,
            );

        if (
          storageError
        ) {
          console.error(
            "CUSTOMER JOB PHOTO DELETE ERROR:",
            storageError,
          );

          /*
           * Do not delete the database job if we
           * couldn't clean up its files.
           */

          return NextResponse.json(
            {
              error:
                "We couldn't remove the job photos. The job has not been deleted.",
            },
            { status: 500 },
          );
        }
      }

      /*
       * Delete photo database records first.
       */

      const {
        error:
          photoDeleteError,
      } =
        await admin
          .from(
            "job_photos",
          )
          .delete()
          .eq(
            "job_id",
            jobId,
          );

      if (
        photoDeleteError
      ) {
        console.error(
          "JOB PHOTO RECORD DELETE ERROR:",
          photoDeleteError,
        );

        return NextResponse.json(
          {
            error:
              "We couldn't remove the job photos. The job has not been deleted.",
          },
          { status: 500 },
        );
      }

      /*
       * Delete bids associated with the job.
       *
       * This is done before the job itself so that
       * foreign-key constraints don't prevent deletion.
       */

      const {
        error:
          bidsDeleteError,
      } =
        await admin
          .from("bids")
          .delete()
          .eq(
            "job_id",
            jobId,
          );

      if (
        bidsDeleteError
      ) {
        console.error(
          "JOB BID DELETE ERROR:",
          bidsDeleteError,
        );

        return NextResponse.json(
          {
            error:
              "We couldn't remove the job quotes. The job has not been deleted.",
          },
          { status: 500 },
        );
      }

      /*
       * Finally delete the job.
       */

      const {
        error:
          deleteError,
      } =
        await admin
          .from("jobs")
          .delete()
          .eq(
            "id",
            jobId,
          )
          .eq(
            "customer_id",
            user.id,
          );

      if (
        deleteError
      ) {
        console.error(
          "JOB DELETE ERROR:",
          deleteError,
        );

        return NextResponse.json(
          {
            error:
              deleteError.message ||
              "We couldn't delete this job.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          action:
            "delete",
          jobId,
          reference:
            job.reference,
        },
        { status: 200 },
      );
    }

    /*
     * =======================================================
     * UPDATE
     * =======================================================
     */

    const jobType =
      cleanText(
        body?.jobType,
      );

    const description =
      cleanText(
        body?.description,
      );

    const postcode =
      cleanText(
        body?.postcode,
      ).toUpperCase();

    const address =
      cleanText(
        body?.address,
      );

    const loadSize =
      cleanText(
        body?.loadSize,
      );

    const floor =
      cleanText(
        body?.floor,
      );

    const accessNotes =
      cleanText(
        body?.accessNotes,
      );

    const preferredDate =
      cleanText(
        body?.preferredDate,
      );

    const preferredTime =
      cleanText(
        body?.preferredTime,
      );

    const stairs =
      Boolean(
        body?.stairs,
      );

    /*
     * -------------------------------------------------------
     * VALIDATION
     * -------------------------------------------------------
     */

    if (!postcode) {
      return NextResponse.json(
        {
          error:
            "Please enter the postcode.",
        },
        { status: 400 },
      );
    }

    if (!address) {
      return NextResponse.json(
        {
          error:
            "Please enter the collection address.",
        },
        { status: 400 },
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          error:
            "Please describe what needs removing.",
        },
        { status: 400 },
      );
    }

    if (!loadSize) {
      return NextResponse.json(
        {
          error:
            "Please select an estimated load size.",
        },
        { status: 400 },
      );
    }

    if (!preferredDate) {
      return NextResponse.json(
        {
          error:
            "Please select a collection date.",
        },
        { status: 400 },
      );
    }

    /*
     * -------------------------------------------------------
     * UPDATE JOB
     * -------------------------------------------------------
     */

    const {
      data: updatedJob,
      error: updateError,
    } =
      await admin
        .from("jobs")
        .update({
          job_type:
            jobType ||
            "Waste removal",
          postcode,
          address,
          load_size:
            loadSize,
          description,
          floor:
            floor || null,
          stairs,
          access_notes:
            accessNotes ||
            null,
          preferred_date:
            preferredDate ||
            null,
          preferred_time:
            preferredTime ||
            "Any time",
        })
        .eq(
          "id",
          jobId,
        )
        .eq(
          "customer_id",
          user.id,
        )
        .select(
          `
            id,
            reference,
            job_type,
            postcode,
            address,
            load_size,
            description,
            floor,
            stairs,
            access_notes,
            preferred_date,
            preferred_time,
            status
          `,
        )
        .single();

    if (
      updateError ||
      !updatedJob
    ) {
      console.error(
        "JOB UPDATE ERROR:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "We couldn't update this job.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        action:
          "update",
        job:
          updatedJob,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "RCS MANAGE JOB API ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
  }
}