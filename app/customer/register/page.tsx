"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CustomerRegister() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (!cleanPhone) {
      setError("Please enter your phone number.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Your password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user, session },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!user) {
        throw new Error(
          "Your account could not be created. Please try again."
        );
      }

      if (!session) {
        setNeedsConfirmation(true);
        setMessage(
          "Your account has been created. Please check your email and confirm your account before logging in."
        );
      } else {
        setSuccess(true);
        setMessage("Your account has been created successfully.");
      }
    } catch (registrationError) {
      console.error("Customer registration error:", registrationError);

      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "Something went wrong while creating your account."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#070907] px-4 py-8 text-white sm:px-6 sm:py-12">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
          <div className="w-full rounded-3xl border border-[#283326] bg-[#0d120d] p-7 text-center shadow-2xl sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#79c51c] text-4xl font-black text-black">
              ✓
            </div>

            <p className="mt-7 text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              Rapid Clear Solutions
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Account created
            </h1>

            <p className="mt-4 leading-7 text-gray-400">
              Your customer account is ready. You can now post a
              waste removal job and receive quotes from approved
              drivers.
            </p>

            <button
              type="button"
              onClick={() => router.push("/customer/dashboard")}
              className="mt-7 w-full rounded-xl bg-[#79c51c] px-5 py-4 font-black text-black transition hover:bg-[#91db32]"
            >
              Go to Customer Dashboard
            </button>

            <Link
              href="/customer/login"
              className="mt-4 block text-sm font-semibold text-[#79c51c] hover:underline"
            >
              Go to Customer Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (needsConfirmation) {
    return (
      <main className="min-h-screen bg-[#070907] px-4 py-8 text-white sm:px-6 sm:py-12">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
          <div className="w-full rounded-3xl border border-[#283326] bg-[#0d120d] p-7 text-center shadow-2xl sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#172615] text-4xl">
              ✉
            </div>

            <p className="mt-7 text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]">
              RCS Customer Account
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Check your email
            </h1>

            <p className="mt-4 leading-7 text-gray-400">
              Your account has been created. We have sent a
              confirmation email to:
            </p>

            <p className="mt-3 break-all font-bold text-white">
              {email.trim().toLowerCase()}
            </p>

            <div className="mt-6 rounded-2xl border border-[#283326] bg-[#0b0f0b] p-5 text-left">
              <p className="font-bold">Next step</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Confirm your email address, then use Customer Login
                to access your account.
              </p>
            </div>

            <Link
              href="/customer/login"
              className="mt-7 block w-full rounded-xl bg-[#79c51c] px-5 py-4 font-black text-center text-black transition hover:bg-[#91db32]"
            >
              Customer Login
            </Link>

            <button
              type="button"
              onClick={() => {
                setNeedsConfirmation(false);
                setMessage("");
              }}
              className="mt-4 text-sm font-semibold text-gray-500 hover:text-white"
            >
              Back to registration
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070907] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-bold uppercase tracking-[0.2em] text-[#79c51c]"
          >
            Rapid Clear Solutions
          </Link>

          <h1 className="mt-5 text-3xl font-black sm:text-4xl">
            Create your account
          </h1>

          <p className="mt-3 leading-6 text-gray-400">
            Create a customer account to post waste removal jobs
            and receive quotes from approved drivers.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="space-y-5 rounded-3xl border border-[#283326] bg-[#0d120d] p-6 shadow-2xl sm:p-8"
        >
          <Input
            id="fullName"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            placeholder="Your full name"
            autoComplete="name"
          />

          <Input
            id="phone"
            label="Phone number"
            value={phone}
            onChange={setPhone}
            placeholder="07xxx xxxxxx"
            type="tel"
            autoComplete="tel"
          />

          <Input
            id="email"
            label="Email address"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
          />

          <Input
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            type="password"
            autoComplete="new-password"
          />

          {error && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm leading-6 text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-[#365324] bg-[#101a0d] p-4 text-sm leading-6 text-[#b8d89d]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#79c51c] px-5 py-4 font-black text-black transition hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Customer Account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/customer/login"
              className="font-bold text-[#79c51c] hover:underline"
            >
              Customer Login
            </Link>
          </p>

          <Link
            href="/"
            className="block text-center text-sm text-gray-600 hover:text-white"
          >
            ← Back to RCS Marketplace
          </Link>
        </form>
      </div>
    </main>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-bold text-gray-200"
      >
        {label}
        <span className="ml-1 text-[#79c51c]">*</span>
      </label>

      <input
        id={id}
        required
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[#354433] bg-[#080d09] px-4 py-3 text-white placeholder:text-gray-600 outline-none transition focus:border-[#79c51c] focus:ring-2 focus:ring-[#79c51c]/20"
      />
    </div>
  );
}