import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is missing from environment variables."
  );
}

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing from environment variables."
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is missing from environment variables."
  );
}

const stripe = new Stripe(stripeSecretKey);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    /*
     * =====================================================
     * AUTHENTICATE MOBILE USER
     * =====================================================
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          error: "You must be logged in to make a payment.",
        },
        { status: 401 }
      );
    }

    const [scheme, accessToken] =
      authorization.split(" ");

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !accessToken
    ) {
      return NextResponse.json(
        {
          error: "Invalid authentication token.",
        },
        { status: 401 }
      );
    }

    /*
     * Verify the Supabase access token.
     */

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (userError || !user) {
      console.error(
        "Mobile Supabase authentication failed:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Your login session has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    /*
     * =====================================================
     * READ REQUEST
     * =====================================================
     */

    let body: {
      jobId?: unknown;
      bidId?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const jobId = Number(body.jobId);
    const bidId = Number(body.bidId);

    if (
      !Number.isInteger(jobId) ||
      jobId <= 0 ||
      !Number.isInteger(bidId) ||
      bidId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "A valid jobId and bidId are required.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * LOAD CUSTOMER JOB
     * =====================================================
     */

    const {
      data: job,
      error: jobError,
    } = await supabaseAdmin
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
          assigned_bid_id,
          payment_status
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
          error: "We couldn't find this job.",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * PAYMENT ALREADY COMPLETE
     * =====================================================
     */

    if (
      job.payment_status === "paid" ||
      job.payment_status === "succeeded"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment has already been completed for this job.",
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * VERIFY ACCEPTED QUOTE
     * =====================================================
     */

    if (
      !job.accepted_bid_id ||
      Number(job.accepted_bid_id) !== bidId
    ) {
      return NextResponse.json(
        {
          error:
            "This quote has not been accepted for payment.",
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * DRIVER MUST NOT ALREADY BE ASSIGNED
     * =====================================================
     */

    if (
      job.assigned_driver_id ||
      job.assigned_bid_id ||
      [
        "assigned",
        "in_progress",
        "completed",
      ].includes(job.status || "")
    ) {
      return NextResponse.json(
        {
          error:
            "A driver has already been booked for this job.",
        },
        { status: 409 }
      );
    }

    /*
     * =====================================================
     * LOAD ACCEPTED BID
     * =====================================================
     */

    const {
      data: bid,
      error: bidError,
    } = await supabaseAdmin
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
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * VERIFY BID
     * =====================================================
     */

    if (
      Number(bid.id) !==
      Number(job.accepted_bid_id)
    ) {
      return NextResponse.json(
        {
          error:
            "This quote is not the accepted quote for this job.",
        },
        { status: 409 }
      );
    }

    if (bid.status !== "accepted") {
      return NextResponse.json(
        {
          error:
            "This quote must be accepted before payment.",
        },
        { status: 409 }
      );
    }

    if (!bid.driver_id) {
      return NextResponse.json(
        {
          error:
            "This quote is missing its driver.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * CHECK PRICE
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
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * CREATE STRIPE CHECKOUT
     * =====================================================
     */

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.rapidclearsolutions.co.uk";

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
          driver_id: String(bid.driver_id),
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
            driver_id: String(bid.driver_id),
            job_reference: reference,
          },
        },
      });

    /*
     * =====================================================
     * SAVE CHECKOUT SESSION
     * =====================================================
     */

    const {
      error: sessionUpdateError,
    } = await supabaseAdmin
      .from("jobs")
      .update({
        stripe_checkout_session_id:
          checkoutSession.id,
      })
      .eq("id", job.id)
      .eq("customer_id", user.id);

    if (sessionUpdateError) {
      console.error(
        "Could not save Stripe checkout session:",
        sessionUpdateError
      );
    }

    /*
     * =====================================================
     * RETURN CHECKOUT URL
     * =====================================================
     */

    if (!checkoutSession.url) {
      console.error(
        "Stripe checkout session did not return a URL:",
        checkoutSession.id
      );

      return NextResponse.json(
        {
          error:
            "Stripe did not return a checkout URL.",
        },
        { status: 500 }
      );
    }

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
      { status: 500 }
    );
  }
}