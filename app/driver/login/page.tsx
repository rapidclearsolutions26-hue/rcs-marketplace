"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DriverLogin() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      /*
       * =====================================================
       * SIGN IN
       * =====================================================
       */

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error || !data.user) {
        setErrorMessage(
          error?.message || "Unable to sign in."
        );

        setLoading(false);
        return;
      }

      /*
       * =====================================================
       * FIND DRIVER ACCOUNT
       * =====================================================
       */

      const {
        data: driver,
        error: driverError,
      } = await supabase
        .from("drivers")
        .select(
          "id, approved, application_status"
        )
        .eq("id", data.user.id)
        .maybeSingle();

      if (driverError) {
        console.error(
          "Driver lookup error:",
          driverError
        );

        setErrorMessage(
          "We couldn't load your driver account. Please try again."
        );

        await supabase.auth.signOut();

        setLoading(false);
        return;
      }

      if (!driver) {
        setErrorMessage(
          "Your driver account could not be found. Please contact RCS."
        );

        await supabase.auth.signOut();

        setLoading(false);
        return;
      }

      /*
       * =====================================================
       * CHECK APPROVAL
       * =====================================================
       */

      const isApproved =
        driver.approved === true &&
        driver.application_status ===
          "approved";

      if (!isApproved) {
        setErrorMessage(
          "Your driver application has not been approved yet."
        );

        await supabase.auth.signOut();

        setLoading(false);
        return;
      }

      /*
       * =====================================================
       * DRIVER IS APPROVED
       * =====================================================
       *
       * Send the driver DIRECTLY to the dashboard.
       *
       * We do NOT send them to a job page.
       */

      router.replace("/driver/dashboard");

      /*
       * Don't set loading back to false here.
       *
       * This prevents the login page from briefly
       * appearing again while Next.js changes page.
       */
    } catch (error) {
      console.error(
        "Unexpected driver login error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while signing in."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07100a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(82,144,39,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(82,144,39,0.10),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 py-10">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-[#26372a] bg-[#0d1710] shadow-2xl lg:grid-cols-2">

          {/* ================================================= */}
          {/* BRAND                                             */}
          {/* ================================================= */}

          <div className="relative hidden min-h-[650px] overflow-hidden lg:block">
            <Image
              src="/rapid-clear-solutions-removal-truck.png"
              alt="Rapid Clear Solutions removal truck"
              fill
              className="object-cover opacity-80"
              priority
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#07100a] via-[#07100a]/50 to-transparent" />

            <div className="absolute bottom-10 left-10 right-10">
              <Image
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                width={260}
                height={100}
                className="mb-6 h-auto w-[220px] object-contain object-left"
              />

              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#75b34c]">
                RCS Driver Network
              </p>

              <h2 className="mt-3 max-w-md text-4xl font-black leading-tight">
                More jobs.
                <br />
                More control.
              </h2>

              <p className="mt-4 max-w-md text-lg leading-7 text-white/70">
                Find available work, submit your price
                and manage your RCS jobs from one
                place.
              </p>
            </div>
          </div>

          {/* ================================================= */}
          {/* LOGIN                                             */}
          {/* ================================================= */}

          <div className="flex items-center justify-center p-7 sm:p-12">
            <div className="w-full max-w-md">

              {/* MOBILE LOGO */}

              <div className="lg:hidden">
                <Image
                  src="/rapid-clear-logo.png"
                  alt="Rapid Clear Solutions"
                  width={220}
                  height={80}
                  className="h-auto w-[190px]"
                />
              </div>

              {/* TITLE */}

              <div className="mt-8 lg:mt-0">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#75b34c]">
                  Driver portal
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight">
                  Driver sign in.
                </h1>

                <p className="mt-3 leading-6 text-white/60">
                  Sign in to view available RCS jobs
                  and manage your bids.
                </p>
              </div>

              {/* ERROR */}

              {errorMessage && (
                <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm font-semibold text-red-300">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* FORM */}

              <form
                onSubmit={handleLogin}
                className="mt-8 space-y-5"
              >

                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-bold text-white/80"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="driver@example.com"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl border border-[#344638] bg-[#101c13] px-4 py-4 text-white outline-none transition placeholder:text-white/30 focus:border-[#529027] focus:ring-2 focus:ring-[#529027]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                {/* PASSWORD */}

                <div>
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-white/80"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl border border-[#344638] bg-[#101c13] px-4 py-4 text-white outline-none transition placeholder:text-white/30 focus:border-[#529027] focus:ring-2 focus:ring-[#529027]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                {/* SIGN IN */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#529027] px-5 py-4 font-black text-white transition hover:bg-[#63a937] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Opening dashboard..."
                    : "Sign in as driver"}
                </button>
              </form>

              {/* REGISTER */}

              <div className="mt-8 text-center text-sm text-white/50">
                Want to work with RCS?

                <Link
                  href="/driver/register"
                  className="ml-1 font-bold text-[#75b34c] hover:text-white"
                >
                  Apply as a driver
                </Link>
              </div>

              {/* BACK */}

              <div className="mt-6 text-center">
                <Link
                  href="/"
                  className="text-sm font-semibold text-white/40 transition hover:text-white"
                >
                  ← Back to Rapid Clear Solutions
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}