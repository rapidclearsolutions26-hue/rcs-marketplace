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
  console.log("");
  console.log("========================================");
  console.log("RCS STRIPE WEBHOOK RECEIVED");
  console.log("========================================");

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing Stripe signature.");

    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let body: string;

  try {
    body = await request.text();
  } catch (error) {
    console.error("Could not read Stripe webhook body:", error);

    return NextResponse.json(
      { error: "Could not read webhook body" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("STRIPE SIGNATURE VERIFICATION FAILED");
    console.error(error);

    return NextResponse.json(
      {
        error: "Webhook signature verification failed",
      },
      { status: 400 }
    );
  }

  console.log("Stripe event:", event.type);
  console.log("Stripe event ID:", event.id);

  let supabase;

  try {
    supabase = createClient(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  } catch (error) {
    console.error("SUPABASE ADMIN CLIENT ERROR");
    console.error(error);

    return NextResponse.json(
      {
        error: "Supabase server configuration is missing",
      },
      { status: 500 }
    );
  }

  try {
    /*
     * =====================================================
     * CHECKOUT SESSION COMPLETED
     * =====================================================
     */

    if (event.type === "checkout.session.completed") {
      const session =
        event.data.object as Stripe.Checkout.Session;

      console.log("");
      console.log("CHECKOUT SESSION COMPLETED");
      console.log("Session ID:", session.id);
      console.log("Payment status:", session.payment_status);
      console.log("Metadata:", session.metadata);

      /*
       * Only continue when Stripe confirms payment.
       */

      if (session.payment_status !== "paid") {
        console.log(
          "Checkout completed but payment is not marked as paid."
        );

        return NextResponse.json({
          received: true,
          paymentRecorded: false,
        });
      }

      /*
       * ===================================================
       * GET METADATA
       * ===================================================
       */

      const jobIdRaw = session.metadata?.job_id;
      const bidIdRaw = session.metadata?.bid_id;
      const customerId = session.metadata?.customer_id;
      const driverId = session.metadata?.driver_id;

      if (
        !jobIdRaw ||
        !bidIdRaw ||
        !customerId ||
        !driverId
      ) {
        console.error(
          "Stripe checkout session is missing required metadata."
        );

        return NextResponse.json(
          {
            error:
              "Stripe checkout session is missing required metadata",
          },
          { status: 400 }
        );
      }

      const jobId = Number(jobIdRaw);
      const bidId = Number(bidIdRaw);

      if (
        !Number.isInteger(jobId) ||
        !Number.isInteger(bidId)
      ) {
        console.error("Invalid job or bid ID.");

        return NextResponse.json(
          {
            error: "Invalid job or bid ID",
          },
          { status: 400 }
        );
      }

      /*
       * ===================================================
       * GET PAYMENT INTENT ID
       * ===================================================
       */

      let paymentIntentId: string | null = null;

      if (typeof session.payment_intent === "string") {
        paymentIntentId = session.payment_intent;
      } else if (session.payment_intent) {
        paymentIntentId = session.payment_intent.id;
      }

      /*
       * ===================================================
       * LOAD JOB
       * ===================================================
       */

      const {
        data: job,
        error: jobError,
      } = await supabase
        .from("jobs")
        .select(
          `
            id,
            reference,
            customer_id,
            status,
            accepted_bid_id,
            assigned_driver_id,
            assigned_bid_id,
            journey_status,
            payment_status,
            stripe_checkout_session_id,
            stripe_payment_intent_id
          `
        )
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        console.error("JOB LOOKUP ERROR");
        console.error(jobError);

        return NextResponse.json(
          {
            error: "Could not find job",
            details: jobError?.message,
          },
          { status: 500 }
        );
      }

      console.log("JOB FOUND:", job.id);
      console.log("Current status:", job.status);
      console.log(
        "Current payment status:",
        job.payment_status
      );
      console.log(
        "Current assigned driver:",
        job.assigned_driver_id
      );

      /*
       * ===================================================
       * VERIFY CUSTOMER
       * ===================================================
       */

      if (job.customer_id !== customerId) {
        console.error("CUSTOMER ID MISMATCH");

        return NextResponse.json(
          {
            error: "Customer does not own this job",
          },
          { status: 403 }
        );
      }

      /*
       * ===================================================
       * LOAD BID
       * ===================================================
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
            status,
            platform_fee_percent,
            platform_fee,
            driver_payout
          `
        )
        .eq("id", bidId)
        .eq("job_id", jobId)
        .single();

      if (bidError || !bid) {
        console.error("BID LOOKUP ERROR");
        console.error(bidError);

        return NextResponse.json(
          {
            error: "Could not find bid",
            details: bidError?.message,
          },
          { status: 500 }
        );
      }

      console.log("BID FOUND:", bid.id);

      /*
       * ===================================================
       * VERIFY DRIVER
       * ===================================================
       */

      if (bid.driver_id !== driverId) {
        console.error("DRIVER ID MISMATCH");

        return NextResponse.json(
          {
            error: "Driver does not match bid",
          },
          { status: 403 }
        );
      }

      /*
       * ===================================================
       * IMPORTANT PAYMENT STEP
       *
       * We update payment_status BEFORE checking whether
       * the job is already assigned.
       *
       * This is what was missing from the old webhook.
       *
       * The database wallet trigger will then create the
       * driver's earning.
       * ===================================================
       */

      const {
        data: paidJob,
        error: paymentUpdateError,
      } = await supabase
        .from("jobs")
        .update({
          payment_status: "paid",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", jobId)
        .eq("customer_id", customerId)
        .select(
          `
            id,
            reference,
            status,
            payment_status,
            accepted_bid_id,
            assigned_bid_id,
            assigned_driver_id,
            journey_status,
            stripe_checkout_session_id,
            stripe_payment_intent_id
          `
        )
        .single();

      if (paymentUpdateError) {
        console.error("PAYMENT STATUS UPDATE ERROR");
        console.error(paymentUpdateError);

        return NextResponse.json(
          {
            error: "Could not mark job as paid",
            details: paymentUpdateError.message,
          },
          { status: 500 }
        );
      }

      console.log("");
      console.log("PAYMENT RECORDED");
      console.log("Job:", jobId);
      console.log("Payment status:", paidJob.payment_status);
      console.log(
        "Stripe session:",
        paidJob.stripe_checkout_session_id
      );
      console.log(
        "Payment intent:",
        paidJob.stripe_payment_intent_id
      );

      /*
       * ===================================================
       * CHECK WHETHER JOB IS ALREADY ASSIGNED
       * ===================================================
       */

      const alreadyAssigned =
        Boolean(job.accepted_bid_id) ||
        Boolean(job.assigned_driver_id) ||
        Boolean(job.assigned_bid_id) ||
        [
          "assigned",
          "in_progress",
          "completed",
        ].includes(job.status || "");

      /*
       * ===================================================
       * ALREADY ASSIGNED
       *
       * Payment has already been recorded above.
       *
       * Do NOT reassign the driver.
       * ===================================================
       */

      if (alreadyAssigned) {
        console.log(
          `JOB ${jobId} IS ALREADY ASSIGNED`
        );

        /*
         * Verify the assignment still matches the paid bid.
         */

        if (
          job.assigned_driver_id &&
          job.assigned_driver_id !== bid.driver_id
        ) {
          console.error(
            "EXISTING ASSIGNED DRIVER DOES NOT MATCH PAYMENT"
          );

          return NextResponse.json(
            {
              error:
                "Job is already assigned to a different driver",
            },
            { status: 409 }
          );
        }

        if (
          job.assigned_bid_id &&
          Number(job.assigned_bid_id) !== bidId
        ) {
          console.error(
            "EXISTING ASSIGNED BID DOES NOT MATCH PAYMENT"
          );

          return NextResponse.json(
            {
              error:
                "Job is already assigned to a different bid",
            },
            { status: 409 }
          );
        }

        console.log(
          "Payment successfully recorded on existing assignment."
        );

        return NextResponse.json({
          received: true,
          success: true,
          paymentRecorded: true,
          alreadyAssigned: true,
          jobId,
          bidId,
          driverId: bid.driver_id,
        });
      }

      /*
       * ===================================================
       * CHECK BID
       * ===================================================
       */

      if (bid.status === "rejected") {
        console.error(
          `Bid ${bidId} has already been rejected.`
        );

        return NextResponse.json(
          {
            error:
              "This bid is no longer available",
          },
          { status: 409 }
        );
      }

      /*
       * ===================================================
       * ACCEPT BID
       * ===================================================
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
        console.error("ACCEPT BID ERROR");
        console.error(acceptBidError);

        return NextResponse.json(
          {
            error: "Could not accept bid",
            details: acceptBidError.message,
          },
          { status: 500 }
        );
      }

      /*
       * ===================================================
       * REJECT OTHER BIDS
       * ===================================================
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
        console.error(
          "REJECT OTHER BIDS ERROR"
        );

        console.error(rejectBidsError);
      }

      /*
       * ===================================================
       * ASSIGN DRIVER
       * ===================================================
       *
       * Payment was already recorded above.
       *
       * This update assigns the selected driver.
       * ===================================================
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
          assigned_driver_id: bid.driver_id,
          journey_status: "assigned",
        })
        .eq("id", jobId)
        .eq("customer_id", customerId)
        .select(
          `
            id,
            reference,
            status,
            accepted_bid_id,
            assigned_bid_id,
            assigned_driver_id,
            journey_status,
            payment_status,
            stripe_checkout_session_id,
            stripe_payment_intent_id
          `
        )
        .single();

      if (assignError) {
        console.error("ASSIGN DRIVER ERROR");
        console.error(assignError);

        return NextResponse.json(
          {
            error: "Could not assign driver",
            details: assignError.message,
          },
          { status: 500 }
        );
      }

      /*
       * ===================================================
       * SUCCESS
       * ===================================================
       */

      console.log("");
      console.log("========================================");
      console.log("RCS PAYMENT SUCCESSFUL");
      console.log("========================================");
      console.log(`Job: ${jobId}`);
      console.log(`Bid: ${bidId}`);
      console.log(`Driver: ${bid.driver_id}`);
      console.log(
        `Payment status: ${updatedJob.payment_status}`
      );
      console.log(
        `Stripe session: ${updatedJob.stripe_checkout_session_id}`
      );
      console.log(
        `Payment intent: ${updatedJob.stripe_payment_intent_id}`
      );
      console.log("========================================");

      return NextResponse.json({
        received: true,
        success: true,
        paymentRecorded: true,
        jobId,
        bidId,
        driverId: bid.driver_id,
      });
    }

    /*
     * =====================================================
     * PAYMENT FAILED
     * =====================================================
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

      console.log(
        "Payment intent metadata:",
        paymentIntent.metadata
      );

      return NextResponse.json({
        received: true,
      });
    }

    /*
     * =====================================================
     * CHECKOUT EXPIRED
     * =====================================================
     */

    if (
      event.type ===
      "checkout.session.expired"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      console.log(
        "CHECKOUT SESSION EXPIRED:",
        session.id
      );

      return NextResponse.json({
        received: true,
      });
    }

    /*
     * =====================================================
     * OTHER EVENTS
     * =====================================================
     */

    console.log(
      `Ignoring Stripe event: ${event.type}`
    );

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("");
    console.error("========================================");
    console.error("STRIPE WEBHOOK PROCESSING ERROR");
    console.error("========================================");
    console.error(error);

    return NextResponse.json(
      {
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}