"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP_NUMBER = "447555980651";

export default function CustomerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        console.error(
          "Customer login error:",
          error,
        );

        setErrorMessage(
          getLoginErrorMessage(error.message),
        );

        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Login succeeded but we couldn't find your account session. Please try again.",
        );

        return;
      }

      router.replace("/customer/dashboard");
      router.refresh();
    } catch (error) {
      console.error(
        "Unexpected customer login error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const whatsappUrl =
    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
    encodeURIComponent(
      "Hi RCS Support, I need help logging into my customer account.",
    );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] text-white">
      {/* HEADER */}

      <header className="pwa-header sticky top-0 z-50 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={190}
              height={70}
              priority
              className="h-11 w-auto object-contain sm:h-12"
            />
          </Link>

          <Link
            href="/customer/post-job"
            className="hidden rounded-xl bg-[#79c51c] px-5 py-3 text-xs font-black text-[#050705] transition hover:bg-[#91db32] sm:inline-flex"
          >
            GET A QUOTE
          </Link>
        </div>
      </header>

      {/* LOGIN AREA */}

      <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        {/* BACKGROUND GLOW */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#79c51c]/[0.06] blur-[120px]" />

          <div className="absolute bottom-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[#79c51c]/[0.025] blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md">
          {/* BACK */}

          <Link
            href="/"
            className="inline-flex items-center text-sm font-bold text-[#79c51c] transition hover:text-[#91db32]"
          >
            ← Back to Rapid Clear Solutions
          </Link>

          {/* LOGIN CARD */}

          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0a0e0a] shadow-2xl">
            {/* TOP ACCENT */}

            <div className="h-1 w-full bg-[#79c51c]" />

            <div className="p-6 sm:p-8">
              {/* TITLE */}

              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#79c51c]/10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-7 w-7 text-[#79c51c]"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m10 17 5-5-5-5"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12H3"
                    />
                  </svg>
                </div>

                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                  Customer Portal
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Welcome back
                </h1>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/40">
                  Log in to manage your waste
                  collection jobs, view driver
                  quotes and track your bookings.
                </p>
              </div>

              {/* ERROR */}

              {errorMessage && (
                <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-black text-red-300">
                      !
                    </div>

                    <p className="text-sm font-semibold leading-6 text-red-300">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* FORM */}

              <form
                onSubmit={handleLogin}
                className="mt-7 space-y-5"
              >
                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-black text-white/80"
                  >
                    Email address
                  </label>

                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect
                          x="3"
                          y="5"
                          width="18"
                          height="14"
                          rx="2"
                        />

                        <path d="m3 7 9 6 9-6" />
                      </svg>
                    </div>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value,
                        )
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-white/[0.1] bg-[#050705] py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#79c51c] focus:ring-2 focus:ring-[#79c51c]/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* PASSWORD */}

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="text-sm font-black text-white/80"
                    >
                      Password
                    </label>

                    <Link
                      href="/customer/forgot-password"
                      className="text-xs font-bold text-[#79c51c] transition hover:text-[#91db32] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect
                          x="4"
                          y="10"
                          width="16"
                          height="11"
                          rx="2"
                        />

                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    </div>

                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-white/[0.1] bg-[#050705] py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#79c51c] focus:ring-2 focus:ring-[#79c51c]/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* LOGIN BUTTON */}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !email.trim() ||
                    !password
                  }
                  className="group flex min-h-[54px] w-full items-center justify-center rounded-xl bg-[#79c51c] px-5 font-black text-[#050705] transition hover:bg-[#91db32] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#050705]/30 border-t-[#050705]" />

                      LOGGING IN...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      LOG IN

                      <span className="transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  )}
                </button>
              </form>

              {/* REGISTER */}

              <div className="mt-7 border-t border-white/[0.07] pt-6 text-center">
                <p className="text-sm text-white/35">
                  Don&apos;t have a customer account?
                </p>

                <Link
                  href="/customer/register"
                  className="mt-2 inline-block font-black text-[#79c51c] transition hover:text-[#91db32] hover:underline"
                >
                  Create an account →
                </Link>
              </div>
            </div>
          </div>

          {/* SUPPORT */}

          <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#0a0e0a] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-[#79c51c]"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.7-.85L3 20l1.35-4.9A8.4 8.4 0 1 1 21 11.5Z"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">
                  Need help?
                </p>

                <p className="mt-0.5 text-xs text-white/30">
                  Contact RCS Support on WhatsApp
                </p>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-[#79c51c]/30 px-3 py-2 text-[10px] font-black text-[#79c51c] transition hover:bg-[#79c51c]/10"
              >
                WHATSAPP
              </a>
            </div>
          </div>

          {/* DRIVER LOGIN */}

          <div className="mt-6 text-center">
            <p className="text-xs text-white/25">
              Are you an RCS driver?
            </p>

            <Link
              href="/driver/login"
              className="mt-1 inline-block text-sm font-bold text-white/40 transition hover:text-[#79c51c]"
            >
              Driver Login →
            </Link>
          </div>

          {/* TRUST */}

          <div className="mt-7 flex items-center justify-center gap-2 pb-6 text-center">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#79c51c]/10 text-[9px] font-black text-[#79c51c]">
              ✓
            </span>

            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/20">
              Rapid Clear Solutions Marketplace
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function getLoginErrorMessage(
  message: string,
) {
  const normalised = message.toLowerCase();

  if (
    normalised.includes(
      "invalid login credentials",
    )
  ) {
    return "The email address or password is incorrect.";
  }

  if (
    normalised.includes(
      "email not confirmed",
    )
  ) {
    return "Please confirm your email address before logging in.";
  }

  if (
    normalised.includes(
      "too many requests",
    )
  ) {
    return "Too many login attempts. Please wait a moment and try again.";
  }

  return (
    message ||
    "Unable to log in. Please check your details and try again."
  );
}