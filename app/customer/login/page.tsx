"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CustomerLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.push("/customer/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Customer login error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      {/* HEADER */}

      <header className="border-b border-[#dde5d8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="block">
            <div className="text-2xl font-black text-[#111111]">
              Rapid Clear
            </div>

            <div className="text-sm font-bold text-[#529027]">
              Solutions
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm font-bold text-[#529027] hover:underline"
          >
            ← Back to website
          </Link>
        </div>
      </header>

      {/* LOGIN */}

      <div className="flex min-h-[calc(100vh-86px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* TITLE */}

          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7f1df] text-3xl">
              👤
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-wide text-[#529027]">
              Customer Portal
            </p>

            <h1 className="mt-2 text-4xl font-black text-[#111111]">
              Welcome back
            </h1>

            <p className="mt-3 text-[#666666]">
              Log in to manage your jobs and quotes.
            </p>
          </div>

          {/* FORM */}

          <form
            onSubmit={handleLogin}
            className="mt-8 rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm"
          >
            {errorMessage && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* EMAIL */}

            <div>
              <label
                htmlFor="email"
                className="text-sm font-bold text-[#333333]"
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
                className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] outline-none transition placeholder:text-[#999999] focus:border-[#529027] focus:ring-2 focus:ring-[#529027]/20 disabled:bg-gray-100"
              />
            </div>

            {/* PASSWORD */}

            <div className="mt-5">
              <label
                htmlFor="password"
                className="text-sm font-bold text-[#333333]"
              >
                Password
              </label>

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
                className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] outline-none transition placeholder:text-[#999999] focus:border-[#529027] focus:ring-2 focus:ring-[#529027]/20 disabled:bg-gray-100"
              />
            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#529027] px-5 py-4 font-black text-white transition hover:bg-[#315c18] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>

            {/* REGISTER */}

            <div className="mt-6 border-t border-[#dde5d8] pt-6 text-center">
              <p className="text-sm text-[#666666]">
                Don't have a customer account?
              </p>

              <Link
                href="/customer/register"
                className="mt-2 inline-block font-black text-[#529027] hover:underline"
              >
                Create an account →
              </Link>
            </div>
          </form>

          {/* DRIVER LINK */}

          <div className="mt-6 text-center">
            <p className="text-sm text-[#777777]">
              Are you a driver?
            </p>

            <Link
              href="/driver/login"
              className="mt-1 inline-block text-sm font-bold text-[#529027] hover:underline"
            >
              Driver login →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}