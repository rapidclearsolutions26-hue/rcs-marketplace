"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CustomerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      /*
       * ================================================
       * SIGN IN
       * ================================================
       */

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        console.error(
          "Customer login error:",
          error
        );

        setErrorMessage(
          getLoginErrorMessage(error.message)
        );

        return;
      }

      /*
       * ================================================
       * CHECK SESSION
       * ================================================
       */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Login succeeded but we couldn't find your account session. Please try again."
        );

        return;
      }

      /*
       * ================================================
       * SEND CUSTOMER TO DASHBOARD
       * ================================================
       */

      router.replace("/customer/dashboard");
      router.refresh();
    } catch (error) {
      console.error(
        "Unexpected customer login error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#06100c] text-white">

      {/* HEADER */}

      <header className="border-b border-[#17382b] bg-[#081710]">

        <div className="mx-auto flex max-w-7xl items-center px-5 py-4">

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
              className="h-12 w-auto object-contain"
            />
          </Link>

        </div>

      </header>

      {/* LOGIN */}

      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center px-5 py-10">

        <div className="w-full max-w-md">

          {/* BACK */}

          <Link
            href="/"
            className="text-sm font-bold text-[#1BBB8C] hover:text-[#16a77c]"
          >
            ← Back to Rapid Clear Solutions
          </Link>

          {/* CARD */}

          <div className="mt-6 rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-2xl sm:p-8">

            <div className="text-center">

              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
                Customer Portal
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Welcome back
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#71867c]">
                Log in to manage your waste
                collection jobs and quotes.
              </p>

            </div>

            {/* ERROR */}

            {errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4">

                <p className="text-sm font-semibold leading-6 text-red-300">
                  {errorMessage}
                </p>

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
                  className="text-sm font-black text-[#d5dfda]"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-[#29483a] bg-[#07130e] px-4 py-3.5 text-white outline-none transition placeholder:text-[#50645b] focus:border-[#1BBB8C] disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

              {/* PASSWORD */}

              <div>

                <div className="flex items-center justify-between gap-3">

                  <label
                    htmlFor="password"
                    className="text-sm font-black text-[#d5dfda]"
                  >
                    Password
                  </label>

                  <Link
                    href="/customer/forgot-password"
                    className="text-xs font-bold text-[#1BBB8C] hover:underline"
                  >
                    Forgot password?
                  </Link>

                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-[#29483a] bg-[#07130e] px-4 py-3.5 text-white outline-none transition placeholder:text-[#50645b] focus:border-[#1BBB8C] disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={
                  loading ||
                  !email.trim() ||
                  !password
                }
                className="w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 font-black text-[#06100c] transition hover:bg-[#16a77c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Logging in..."
                  : "LOG IN"}
              </button>

            </form>

            {/* REGISTER */}

            <div className="mt-7 border-t border-[#17382b] pt-6 text-center">

              <p className="text-sm text-[#71867c]">
                Don't have a customer account?
              </p>

              <Link
                href="/customer/register"
                className="mt-2 inline-block font-black text-[#1BBB8C] hover:underline"
              >
                Create an account →
              </Link>

            </div>

          </div>

          {/* DRIVER LOGIN */}

          <div className="mt-5 text-center">

            <p className="text-xs text-[#50645b]">
              Are you a driver?
            </p>

            <Link
              href="/driver/login"
              className="mt-1 inline-block text-sm font-bold text-[#71867c] hover:text-[#1BBB8C]"
            >
              Driver Login →
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}

/* ========================================================= */
/* LOGIN ERROR                                               */
/* ========================================================= */

function getLoginErrorMessage(
  message: string
) {
  const normalised =
    message.toLowerCase();

  if (
    normalised.includes(
      "invalid login credentials"
    )
  ) {
    return "The email address or password is incorrect.";
  }

  if (
    normalised.includes(
      "email not confirmed"
    )
  ) {
    return "Please confirm your email address before logging in.";
  }

  if (
    normalised.includes(
      "too many requests"
    )
  ) {
    return "Too many login attempts. Please wait a moment and try again.";
  }

  return (
    message ||
    "Unable to log in. Please check your details and try again."
  );
}