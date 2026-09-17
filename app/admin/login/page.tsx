"use client";

import {
  FormEvent,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase =
        createClient();

      const cleanEmail =
        email.trim();

      if (!cleanEmail) {
        setErrorMessage(
          "Please enter your email address.",
        );
        return;
      }

      if (!password) {
        setErrorMessage(
          "Please enter your password.",
        );
        return;
      }

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: cleanEmail,
            password,
          },
        );

      if (error) {
        setErrorMessage(
          error.message ||
            "Unable to sign in.",
        );
        return;
      }

      if (!data.user) {
        setErrorMessage(
          "Unable to verify your account.",
        );
        return;
      }

      router.replace(
        "/admin/dashboard",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Admin login error:",
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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050705] px-4 py-8 text-white sm:px-6">
      {/* ================================================= */}
      {/* BACKGROUND GLOW                                   */}
      {/* ================================================= */}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#79c51c]/[0.06] blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(121,197,28,0.08),transparent_38%)]" />
      </div>

      {/* ================================================= */}
      {/* LOGIN WRAPPER                                     */}
      {/* ================================================= */}

      <div className="relative z-10 w-full max-w-md">
        {/* LOGO */}

        <div className="mb-7 flex justify-center">
          <Link
            href="/"
            className="block"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              className="h-14 w-auto object-contain sm:h-16"
              priority
            />
          </Link>
        </div>

        {/* LOGIN CARD */}

        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#080b08] shadow-2xl">
          {/* TOP ACCENT */}

          <div className="h-1 bg-[#79c51c]" />

          <div className="p-5 sm:p-8">
            {/* HEADING */}

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/10">
                <span className="text-[10px] font-black tracking-tight text-[#79c51c]">
                  RCS
                </span>
              </div>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-[#79c51c]">
                RCS Marketplace
              </p>

              <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-4xl">
                Admin
                <span className="block text-[#79c51c]">
                  Login
                </span>
              </h1>

              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-gray-500">
                Sign in to access the RCS
                Marketplace Control Centre.
              </p>
            </div>

            {/* ERROR */}

            {errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-black text-red-300">
                    !
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-red-300">
                      Sign in failed
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-300/90">
                      {errorMessage}
                    </p>
                  </div>
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
                  className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  required
                  disabled={loading}
                  placeholder="admin@example.com"
                  className="min-h-[52px] w-full rounded-xl border border-white/[0.10] bg-[#050705] px-4 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-[#79c51c] focus:ring-2 focus:ring-[#79c51c]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* PASSWORD */}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    disabled={loading}
                    className="text-[10px] font-black uppercase tracking-wider text-[#79c51c] transition hover:text-[#91db32] disabled:opacity-50"
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    placeholder="Enter your password"
                    className="min-h-[52px] w-full rounded-xl border border-white/[0.10] bg-[#050705] px-4 pr-16 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-[#79c51c] focus:ring-2 focus:ring-[#79c51c]/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(121,197,28,0.12)] transition hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Signing in...
                  </>
                ) : (
                  "SIGN IN TO ADMIN →"
                )}
              </button>
            </form>

            {/* SECURITY NOTE */}

            <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#050705] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#79c51c]/20 bg-[#79c51c]/10">
                  <span className="text-xs font-black text-[#79c51c]">
                    ✓
                  </span>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-300">
                    Secure admin access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    This area is for authorised RCS
                    Marketplace administrators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER LINKS */}

        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-5">
          <Link
            href="/"
            className="text-xs font-black uppercase tracking-wider text-gray-600 transition hover:text-[#79c51c]"
          >
            ← Back to RCS
          </Link>

          <span className="hidden text-gray-800 sm:block">
            •
          </span>

          <span className="text-xs text-gray-700">
            RCS Marketplace Administration
          </span>
        </div>
      </div>
    </main>
  );
}