"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

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

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        setErrorMessage(
          error.message ||
            "Unable to sign in."
        );
        return;
      }

      if (!data.user) {
        setErrorMessage(
          "Unable to verify your account."
        );
        return;
      }

      router.replace(
        "/admin/dashboard"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06100c] px-4 py-8 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image
            src="/rcs-logo.jpg"
            alt="Rapid Clear Solutions"
            width={180}
            height={70}
            className="h-16 w-auto object-contain"
            priority
          />
        </div>

        <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
              Rapid Clear Solutions
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Admin Login
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#71857b]">
              Sign in to access the RCS Marketplace
              Control Centre.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4">
              <p className="text-sm leading-6 text-red-300">
                {errorMessage}
              </p>
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-black uppercase tracking-wide text-[#9cafa6]"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                required
                className="min-h-12 w-full rounded-xl border border-[#29483a] bg-[#07130e] px-4 text-sm text-white outline-none transition placeholder:text-[#52655c] focus:border-[#1BBB8C]"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-black uppercase tracking-wide text-[#9cafa6]"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                required
                className="min-h-12 w-full rounded-xl border border-[#29483a] bg-[#07130e] px-4 text-sm text-white outline-none transition placeholder:text-[#52655c] focus:border-[#1BBB8C]"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Signing in..."
                : "Sign in to Admin"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#52655c]">
          RCS Marketplace Administration
        </p>
      </div>
    </main>
  );
}