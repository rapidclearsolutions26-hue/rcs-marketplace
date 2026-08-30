import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const stripe = new Stripe(getEnv("STRIPE_SECRET_KEY"));

export async function POST(request: Request) {
  console.log("========================================");
  console.log("STRIPE WEBHOOK RECEIVED");
  console.log("========================================");

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing Stripe signature");

    return NextResponse.json(
      {
        error: "Missing Stripe signature",
      },
      {
        status: 400,
      }
    );
  }

  let body: string;

  try {
    body = await request.text();
  } catch (error) {
    console.error("Could not read webhook body:", error);

    return NextResponse.json(
      {
        error: "Could not read webhook body",
      },
      {
        status: 400,
      }
    );
  }

  let event: Stripe.Event;

  /*
   * =========================================================
   * VERIFY STRIPE WEBHOOK
   * =========================================================
   */

  try {
    const webhookSecret = getEnv(
      "STRIPE_WEBHOOK_SECRET"
    );

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "STRIPE SIGNATURE VERIFICATION FAILED:"
    );

    console.error(error);

    return NextResponse.json(
      {
        error: "Webhook signature verification failed",
      },
      {
        status: 400,
      }
    );
  }

  console.log("Stripe event:", event.type);
  console.log("Stripe event ID:", event.id);

  /*
   * =========================================================
   * SUPABASE ADMIN CLIENT
   * =========================================================
   */

  let supabase;

  try {
    const supabaseUrl = getEnv(
      "NEXT_PUBLIC_SUPABASE_URL"
    );

    const serviceRoleKey = getEnv(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  } catch (error) {
    console.error(
      "SUPABASE ADMIN CLIENT ERROR:"
    );

    console.error(error);

    return NextResponse.json(
      {
        error: "Supabase server configuration is missing",
      },
      {
        status: 500,
      }
    );
  }

  /*
   * =========================================================
   * HANDLE EVENTS
   * =========================================================
   */

  try {
    /*
     * =======================================================
     * CHECKOUT COMPLETED
     * =======================================================
     */

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      console.log(
        "CHECKOUT SESSION COMPLETED:",
        session.id
      );

      console.log(
        "Payment status:",
        session.payment_status
      );

      console.log(
        "Session metadata:",
        session.metadata
      );

      /*
       * Only continue if Stripe says payment is paid.
       */

      if (
        session.payment_status !== "paid"
      ) {
        console.log(
          "Payment is not marked as paid yet."
        );

        return NextResponse.json({
          received: true,
        });
      }

      /*
       * =====================================================
       * GET METADATA
       * =====================================================
       */

      const jobIdRaw =
        session.metadata?.job_id;

      const bidIdRaw =
        session.metadata?.bid_id;

      const customerId =
        session.metadata?.customer_id;

      const driverId =
        session.metadata?.driver_id;

      console.log("job_id:", jobIdRaw);
      console.log("bid_id:", bidIdRaw);
      console.log(
        "customer_id:",
        customerId
      );
      console.log(
        "driver_id:",
        driverId
      );

      if (
        !jobIdRaw ||
        !bidIdRaw ||
        !customerId ||
        !driverId
      ) {
        console.error(
          "STRIPE WEBHOOK IS MISSING METADATA"
        );

        return NextResponse.json(
          {
            error:
              "Stripe checkout session is missing required metadata",
          },
          {
            status: 400,
          }
        );
      }

      const jobId = Number(jobIdRaw);
      const bidId = Number(bidIdRaw);

      if (
        !Number.isInteger(jobId) ||
        !Number.isInteger(bidId)
      ) {
        console.error(
          "Invalid job_id or bid_id:",
          {
            jobIdRaw,
            bidIdRaw,
          }
        );

        return NextResponse.json(
          {
            error:
              "Invalid job or bid ID",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * =====================================================
       * FIND JOB
       * =====================================================
       */

      const {
        data: job,
        error: jobError,
      } = await supabase
        .from("jobs")
        .select(
          `
            id,
            customer_id,
            status,
            accepted_bid_id,
            assigned_driver_id,
            assigned_bid_id,
            journey_status
          `
        )
        .eq("id", jobId)
        .single();

      if (jobError) {
        console.error(
          "SUPABASE JOB LOOKUP ERROR:"
        );

        console.error(jobError);

        return NextResponse.json(
          {
            error:
              "Could not find job",
            details:
              jobError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (!job) {
        console.error(
          `Job ${jobId} was not found.`
        );

        return NextResponse.json(
          {
            error: "Job not found",
          },
          {
            status: 404,
          }
        );
      }

      console.log(
        "JOB FOUND:",
        job.id
      );

      /*
       * =====================================================
       * VERIFY CUSTOMER
       * =====================================================
       */

      if (
        job.customer_id !== customerId
      ) {
        console.error(
          "CUSTOMER ID MISMATCH"
        );

        console.error({
          jobCustomerId:
            job.customer_id,
          stripeCustomerId:
            customerId,
        });

        return NextResponse.json(
          {
            error:
              "Customer does not own this job",
          },
          {
            status: 403,
          }
        );
      }

      /*
       * =====================================================
       * IDEMPOTENCY
       * =====================================================
       *
       * If the job has already been assigned,
       * don't assign another driver.
       */

      const alreadyAssigned =
        Boolean(
          job.accepted_bid_id
        ) ||
        Boolean(
          job.assigned_driver_id
        ) ||
        Boolean(
          job.assigned_bid_id
        ) ||
        [
          "assigned",
          "in_progress",
          "completed",
        ].includes(job.status);

      if (alreadyAssigned) {
        console.log(
          `JOB ${jobId} IS ALREADY ASSIGNED`
        );

        return NextResponse.json({
          received: true,
          alreadyAssigned: true,
        });
      }

      /*
       * =====================================================
       * FIND BID
       * =====================================================
       */

      const {
        data: bid,
        error: bidError,
      } = await supabase
        .from("bids")
        .select(
          `
            id,
            job_id,
            driver_id,
            amount,
            status
          `
        )
        .eq("id", bidId)
        .eq("job_id", jobId)
        .single();

      if (bidError) {
        console.error(
          "SUPABASE BID LOOKUP ERROR:"
        );

        console.error(bidError);

        return NextResponse.json(
          {
            error:
              "Could not find bid",
            details:
              bidError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (!bid) {
        console.error(
          `Bid ${bidId} was not found for job ${jobId}.`
        );

        return NextResponse.json(
          {
            error: "Bid not found",
          },
          {
            status: 404,
          }
        );
      }

      console.log(
        "BID FOUND:",
        bid.id
      );

      /*
       * =====================================================
       * VERIFY DRIVER
       * =====================================================
       */

      if (
        bid.driver_id !== driverId
      ) {
        console.error(
          "DRIVER ID MISMATCH"
        );

        console.error({
          bidDriverId:
            bid.driver_id,
          stripeDriverId:
            driverId,
        });

        return NextResponse.json(
          {
            error:
              "Driver does not match bid",
          },
          {
            status: 403,
          }
        );
      }

      /*
       * =====================================================
       * ACCEPT BID
       * =====================================================
       */

      const {
        error: acceptBidError,
      } = await supabase
        .from("bids")
        .update({
          status: "accepted",
        })
        .eq("id", bidId)
        .eq("job_id", jobId);

      if (acceptBidError) {
        console.error(
          "ACCEPT BID ERROR:"
        );

        console.error(
          acceptBidError
        );

        return NextResponse.json(
          {
            error:
              "Could not accept bid",
            details:
              acceptBidError.message,
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        `Bid ${bidId} accepted.`
      );

      /*
       * =====================================================
       * REJECT OTHER BIDS
       * =====================================================
       */

      const {
        error: rejectBidsError,
      } = await supabase
        .from("bids")
        .update({
          status: "rejected",
        })
        .eq("job_id", jobId)
        .neq("id", bidId);

      if (rejectBidsError) {
        /*
         * Don't fail the payment because another
         * bid could not be rejected.
         */

        console.error(
          "REJECT OTHER BIDS ERROR:"
        );

        console.error(
          rejectBidsError
        );
      } else {
        console.log(
          "Other bids rejected."
        );
      }

      /*
       * =====================================================
       * ASSIGN DRIVER TO JOB
       * =====================================================
       */

      const {
        data: updatedJob,
        error: assignError,
      } = await supabase
        .from("jobs")
        .update({
          status: "assigned",
          accepted_bid_id: bidId,
          assigned_bid_id: bidId,
          assigned_driver_id:
            bid.driver_id,
          journey_status: "assigned",
        })
        .eq("id", jobId)
        .eq(
          "customer_id",
          customerId
        )
        .select(
          `
            id,
            status,
            accepted_bid_id,
            assigned_bid_id,
            assigned_driver_id,
            journey_status
          `
        )
        .single();

      if (assignError) {
        console.error(
          "ASSIGN DRIVER ERROR:"
        );

        console.error(
          assignError
        );

        return NextResponse.json(
          {
            error:
              "Could not assign driver",
            details:
              assignError.message,
          },
          {
            status: 500,
          }
        );
      }

      /*
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      console.log(
        "========================================"
      );

      console.log(
        "PAYMENT SUCCESSFUL"
      );

      console.log(
        `Job ${jobId} assigned to driver ${bid.driver_id}`
      );

      console.log(
        "Updated job:",
        updatedJob
      );

      console.log(
        "========================================"
      );

      return NextResponse.json({
        received: true,
        success: true,
        jobId,
        bidId,
        driverId: bid.driver_id,
      });
    }

    /*
     * =======================================================
     * PAYMENT FAILED
     * =======================================================
     */

    if (
      event.type ===
      "payment_intent.payment_failed"
    ) {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      console.log(
        "PAYMENT FAILED:",
        paymentIntent.id
      );

      return NextResponse.json({
        received: true,
      });
    }

    /*
     * =======================================================
     * ALL OTHER EVENTS
     * =======================================================
     *
     * Stripe sends several events for one payment.
     * We don't need to process them.
     */

    console.log(
      `Ignoring Stripe event: ${event.type}`
    );

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "========================================"
    );

    console.error(
      "STRIPE WEBHOOK PROCESSING ERROR"
    );

    console.error(error);

    console.error(
      "========================================"
    );

    return NextResponse.json(
      {
        error:
          "Webhook processing failed",
      },
      {
        status: 500,
      }
    );
  }
}