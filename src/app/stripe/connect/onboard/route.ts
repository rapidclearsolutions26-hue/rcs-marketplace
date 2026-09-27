import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing authorization token." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing authorization token." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, role, stripe_connect_account_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load driver profile.",
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: "Driver profile not found.",
        },
        { status: 404 }
      );
    }

    if (profile.role !== "driver") {
      return NextResponse.json(
        {
          success: false,
          error: "Only driver accounts can set up payouts.",
        },
        { status: 403 }
      );
    }

    let accountId = profile.stripe_connect_account_id;

    /*
     * Create the Stripe Connect Express account
     * only if the driver does not already have one.
     */
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email: user.email ?? undefined,
        business_type: "individual",
        capabilities: {
          transfers: {
            requested: true,
          },
        },
        metadata: {
          profile_id: profile.id,
          driver_name: profile.full_name ?? "",
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          stripe_connect_account_id: accountId,
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error("PROFILE UPDATE ERROR:", updateError);

        return NextResponse.json(
          {
            success: false,
            error:
              "Stripe account was created, but the driver profile could not be updated.",
          },
          { status: 500 }
        );
      }
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.rapidclearsolutions.co.uk";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url:
        `${siteUrl}/driver/stripe/onboarding?refresh=1`,
      return_url:
        `${siteUrl}/driver/stripe/onboarding?complete=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      success: true,
      accountId,
      url: accountLink.url,
    });
  } catch (error) {
    console.error("STRIPE CONNECT ONBOARDING ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Stripe payout setup.",
      },
      { status: 500 }
    );
  }
}