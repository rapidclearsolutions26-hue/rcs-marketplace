import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://rcs-marketplace.vercel.app";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const next =
    requestUrl.searchParams.get("next") ||
    "/customer/login";

  /*
   * Only allow internal paths.
   * This prevents the confirmation URL being used
   * to redirect customers to an external website.
   */
  const safeNext =
    next.startsWith("/") &&
    !next.startsWith("//")
      ? next
      : "/customer/login";

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/customer/login?verified=error",
        SITE_URL,
      ),
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Missing Supabase environment variables.",
    );

    return NextResponse.redirect(
      new URL(
        "/customer/login?verified=error",
        SITE_URL,
      ),
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  /*
   * Exchange the email confirmation code for
   * the customer's authenticated session.
   */
  const {
    error,
  } =
    await supabase.auth.exchangeCodeForSession(
      code,
    );

  if (error) {
    console.error(
      "Supabase email confirmation error:",
      error,
    );

    return NextResponse.redirect(
      new URL(
        "/customer/login?verified=error",
        SITE_URL,
      ),
    );
  }

  /*
   * Send the customer to the requested internal
   * destination after successful verification.
   */
  const redirectUrl =
    new URL(
      safeNext,
      SITE_URL,
    );

  redirectUrl.searchParams.set(
    "verified",
    "success",
  );

  return NextResponse.redirect(
    redirectUrl,
  );
}