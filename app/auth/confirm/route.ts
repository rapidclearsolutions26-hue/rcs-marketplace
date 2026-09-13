import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://rapidclearsolutions.co.uk";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  const next =
    requestUrl.searchParams.get("next") ||
    "/customer/login";

  /*
   * Only allow internal paths.
   * This prevents the confirmation URL from
   * redirecting users to an external website.
   */
  const safeNext =
    next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/customer/login";

  /*
   * Decide where errors should go.
   * If a driver is confirming their email,
   * keep them on the driver login page.
   */
  const errorPath = safeNext.startsWith("/driver")
    ? "/driver/login"
    : "/customer/login";

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `${errorPath}?verified=error`,
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
        `${errorPath}?verified=error`,
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
        detectSessionInUrl: false,
      },
    },
  );

  /*
   * Exchange the Supabase email confirmation code
   * for a session.
   */
  const { error } =
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
        `${errorPath}?verified=error`,
        SITE_URL,
      ),
    );
  }

  /*
   * Successful verification.
   *
   * Driver:
   * /driver/login?verified=success
   *
   * Customer:
   * /customer/login?verified=success
   */
  const redirectUrl = new URL(
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