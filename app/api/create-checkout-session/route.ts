import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is missing from environment variables."
  );
}

const stripe = new Stripe(stripeSecretKey);

export async function POST(request: Request) {
  try {
    /*
     * =====================================================
     * SUPABASE SERVER CLIENT
     * =====================================================
     */

    const supabase = await createClient();

    /*
     * =====================================================
     * CHECK CUSTOMER LOGIN
     * =====================================================
     */

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be logged in to make a payment.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * READ REQUEST
     * =====================================================
     */

    const body = await request.json();

    const jobId = Number(body.jobId);
    const bidId = Number(body.bidId);

    if (!jobId || !bidId) {
      return NextResponse.json(
        {
          error:
            "jobId and bidId are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * LOAD JOB
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
          reference,
          customer_id,
          job_type,
          postcode,
          address,
          status,
          accepted_bid_id,
          assigned_driver_id,
          assigned_bid_id
        `
      )
      .eq("id", jobId)
      .eq("customer_id", user.id)
      .single();

    if (jobError || !job) {
      console.error(
        "Stripe job lookup error:",
        jobError
      );

      return NextResponse.json(
        {
          error:
            "We couldn't find this job.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * LOAD SELECTED BID
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

    if (bidError || !bid) {
      console.error(
        "Stripe bid lookup error:",
        bidError
      );

      return NextResponse.json(
        {
          error:
            "We couldn't find this driver's quote.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * CHECK BID PRICE
     * =====================================================
     */

    const amount = Number(bid.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "This driver's quote has an invalid price.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * DO NOT ALLOW ALREADY BOOKED JOBS
     * =====================================================
     */

    const alreadyAssigned =
      Boolean(job.accepted_bid_id) ||
      Boolean(job.assigned_driver_id) ||
      Boolean(job.assigned_bid_id) ||
      [
        "assigned",
        "in_progress",
        "completed",
      ].includes(job.status);

    if (alreadyAssigned) {
      return NextResponse.json(
        {
          error:
            "A driver has already been booked for this job.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * CREATE STRIPE CHECKOUT SESSION
     * =====================================================
     */

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const reference =
      job.reference ||
      `RC-${String(job.id).padStart(6, "0")}`;

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email:
          user.email || undefined,

        line_items: [
          {
            price_data: {
              currency: "gbp",

              product_data: {
                name: `RCS Collection - ${reference}`,

                description:
                  job.job_type ||
                  "Waste removal collection",
              },

              unit_amount: Math.round(
                amount * 100
              ),
            },

            quantity: 1,
          },
        ],

        metadata: {
          job_id: String(job.id),
          bid_id: String(bid.id),
          customer_id: user.id,
          driver_id: String(
            bid.driver_id
          ),
          job_reference: reference,
        },

        success_url:
          `${origin}/customer/jobs/${job.id}` +
          `?payment=success`,

        cancel_url:
          `${origin}/customer/jobs/${job.id}` +
          `?payment=cancelled`,

        payment_intent_data: {
          metadata: {
            job_id: String(job.id),
            bid_id: String(bid.id),
            customer_id: user.id,
            driver_id: String(
              bid.driver_id
            ),
            job_reference: reference,
          },
        },
      });

    /*
     * =====================================================
     * RETURN CHECKOUT URL
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error(
      "CREATE CHECKOUT SESSION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create payment.",
      },
      {
        status: 500,
      }
    );
  }
}