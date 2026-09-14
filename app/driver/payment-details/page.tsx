"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DriverBottomNav from "@/app/components/driver/DriverBottomNav";

type PaymentDetails = {
  id: number;
  driver_id: string;
  account_holder_name: string;
  bank_name: string | null;
  sort_code: string;
  account_number: string;
  created_at: string;
  updated_at: string;
};

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

export default function DriverPaymentDetailsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("Driver");

  const [details, setDetails] = useState<PaymentDetails | null>(null);

  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadDetails();
  }, []);

  async function loadDetails() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/driver/login";
      return;
    }

    setUserId(user.id);

    const { data: driver } = await supabase
      .from("drivers")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (driver?.full_name) {
      setDriverName(driver.full_name);
    }

    const { data, error: detailsError } = await supabase
      .from("driver_payment_details")
      .select(
        "id, driver_id, account_holder_name, bank_name, sort_code, account_number, created_at, updated_at",
      )
      .eq("driver_id", user.id)
      .maybeSingle();

    if (detailsError) {
      console.error(detailsError);
      setError("We couldn't load your payment details.");
      setLoading(false);
      return;
    }

    if (data) {
      const paymentDetails = data as PaymentDetails;

      setDetails(paymentDetails);
      setAccountHolderName(paymentDetails.account_holder_name);
      setBankName(paymentDetails.bank_name ?? "");
      setSortCode(paymentDetails.sort_code);
      setAccountNumber(paymentDetails.account_number);
    }

    setLoading(false);
  }

  function formatSortCode(value: string) {
    const numbers = value.replace(/\D/g, "").slice(0, 6);

    if (numbers.length <= 2) {
      return numbers;
    }

    if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    }

    return `${numbers.slice(0, 2)}-${numbers.slice(2, 4)}-${numbers.slice(4)}`;
  }

  function handleSortCodeChange(value: string) {
    setSortCode(formatSortCode(value));
  }

  function handleAccountNumberChange(value: string) {
    setAccountNumber(value.replace(/\D/g, "").slice(0, 8));
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!userId) {
      setError("You need to be logged in.");
      return;
    }

    const cleanSortCode = sortCode.replace(/\D/g, "");
    const cleanAccountNumber = accountNumber.replace(/\D/g, "");

    if (!accountHolderName.trim()) {
      setError("Please enter the account holder name.");
      return;
    }

    if (cleanSortCode.length !== 6) {
      setError("Please enter a valid 6-digit sort code.");
      return;
    }

    if (cleanAccountNumber.length !== 8) {
      setError("Please enter a valid 8-digit account number.");
      return;
    }

    setSaving(true);

    const payload = {
      driver_id: userId,
      account_holder_name: accountHolderName.trim(),
      bank_name: bankName.trim() || null,
      sort_code: formatSortCode(cleanSortCode),
      account_number: cleanAccountNumber,
    };

    let saveError = null;

    if (details) {
      const { error: updateError } = await supabase
        .from("driver_payment_details")
        .update({
          account_holder_name: payload.account_holder_name,
          bank_name: payload.bank_name,
          sort_code: payload.sort_code,
          account_number: payload.account_number,
        })
        .eq("id", details.id)
        .eq("driver_id", userId);

      saveError = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("driver_payment_details")
        .insert(payload);

      saveError = insertError;
    }

    if (saveError) {
      console.error(saveError);

      setError(
        saveError.code === "23505"
          ? "Payment details already exist for this account."
          : "We couldn't save your payment details.",
      );

      setSaving(false);
      return;
    }

    setSuccess("Your payment details have been saved.");

    setEditing(false);
    setSaving(false);

    await loadDetails();
  }

  function maskAccountNumber(value: string) {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length < 4) {
      return "••••";
    }

    return `•••• ${numbers.slice(-4)}`;
  }

  function maskSortCode(value: string) {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length !== 6) {
      return "••-••-••";
    }

    return `••-••-${numbers.slice(-2)}`;
  }

  if (loading) {
    return (
      <main
        className="min-h-screen text-white"
        style={{ background: BG }}
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                borderTopColor: GREEN,
              }}
            />

            <p className="text-sm text-white/50">
              Loading payment details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen pb-28 text-white"
      style={{ background: BG }}
    >
      {/* HEADER */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(5,7,5,0.94)",
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/driver/wallet"
            className="flex items-center gap-3"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black"
              style={{
                background: GREEN,
                color: BG,
              }}
            >
              RCS
            </div>

            <div>
              <p className="text-sm font-black">
                Payment Details
              </p>

              <p className="text-xs text-white/45">
                {driverName}
              </p>
            </div>
          </Link>

          <Link
            href="/driver/wallet"
            className="rounded-xl border px-4 py-2 text-sm font-bold transition"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: CARD,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* PAGE INTRO */}
        <div className="mb-6">
          <p
            className="text-xs font-black uppercase tracking-[0.18em]"
            style={{ color: GREEN }}
          >
            Driver wallet
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Payment details
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Manage the bank account used for your RCS driver payouts.
          </p>
        </div>

        {details && !editing ? (
          <div className="space-y-5">
            {/* SAVED DETAILS */}
            <section
              className="overflow-hidden rounded-3xl border"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: CARD,
              }}
            >
              <div
                className="border-b p-6"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: SECTION,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black"
                      style={{
                        background: `${GREEN}15`,
                        color: GREEN,
                      }}
                    >
                      £
                    </div>

                    <div>
                      <h2 className="text-xl font-black">
                        Bank account
                      </h2>

                      <p className="mt-1 text-sm text-white/45">
                        Your current payout details
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-full px-3 py-1.5 text-[10px] font-black tracking-wide"
                    style={{
                      background: `${GREEN}15`,
                      color: GREEN,
                    }}
                  >
                    ✓ VERIFIED
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5 sm:p-6">
                <DetailRow
                  label="Account holder"
                  value={details.account_holder_name}
                />

                <DetailRow
                  label="Bank"
                  value={details.bank_name || "Not provided"}
                />

                <DetailRow
                  label="Sort code"
                  value={maskSortCode(details.sort_code)}
                />

                <DetailRow
                  label="Account number"
                  value={maskAccountNumber(details.account_number)}
                />
              </div>
            </section>

            {/* EDIT CTA */}
            <section
              className="rounded-3xl border p-5 sm:p-6"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: SECTION,
              }}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-black">
                    Need to change your bank details?
                  </p>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-white/40">
                    Make sure your details are correct before requesting
                    a payout.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess("");
                    setError("");
                    setEditing(true);
                  }}
                  className="w-full rounded-2xl px-5 py-3.5 text-sm font-black transition sm:w-auto"
                  style={{
                    background: GREEN,
                    color: BG,
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = GREEN_HOVER;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = GREEN;
                  }}
                >
                  EDIT DETAILS
                </button>
              </div>
            </section>

            {success && <SuccessMessage message={success} />}
          </div>
        ) : (
          <form onSubmit={saveDetails} className="space-y-5">
            {/* FORM */}
            <section
              className="rounded-3xl border p-5 sm:p-7"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: CARD,
              }}
            >
              <div className="mb-7">
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black"
                  style={{
                    background: `${GREEN}15`,
                    color: GREEN,
                  }}
                >
                  £
                </div>

                <h2 className="text-2xl font-black">
                  {details
                    ? "Update payment details"
                    : "Add payment details"}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                  Enter the bank account where you want RCS to send
                  your driver payouts.
                </p>
              </div>

              <div className="space-y-5">
                <Field
                  label="Account holder name"
                  value={accountHolderName}
                  onChange={setAccountHolderName}
                  placeholder="Name on the bank account"
                  autoComplete="name"
                  required
                />

                <Field
                  label="Bank name"
                  value={bankName}
                  onChange={setBankName}
                  placeholder="e.g. Barclays"
                  autoComplete="organization"
                />

                <Field
                  label="Sort code"
                  value={sortCode}
                  onChange={handleSortCodeChange}
                  placeholder="12-34-56"
                  inputMode="numeric"
                  maxLength={8}
                  required
                />

                <Field
                  label="Account number"
                  value={accountNumber}
                  onChange={handleAccountNumberChange}
                  placeholder="12345678"
                  inputMode="numeric"
                  maxLength={8}
                  required
                />
              </div>
            </section>

            {/* WARNING */}
            <section
              className="rounded-2xl border p-4"
              style={{
                borderColor: "rgba(234,179,8,0.20)",
                background: "rgba(234,179,8,0.05)",
              }}
            >
              <p className="text-xs leading-5 text-yellow-200/75">
                Please check your bank details carefully. Incorrect
                details could delay your payout.
              </p>
            </section>

            {error && <ErrorMessage message={error} />}

            {success && <SuccessMessage message={success} />}

            {/* ACTIONS */}
            <div className="grid grid-cols-2 gap-3">
              {details && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError("");
                    setSuccess("");
                  }}
                  disabled={saving}
                  className="rounded-2xl border px-4 py-4 text-sm font-black transition disabled:opacity-50"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: CARD,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  CANCEL
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className={`rounded-2xl px-4 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  details ? "" : "col-span-2"
                }`}
                style={{
                  background: GREEN,
                  color: BG,
                }}
                onMouseEnter={(event) => {
                  if (!saving) {
                    event.currentTarget.style.background = GREEN_HOVER;
                  }
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = GREEN;
                }}
              >
                {saving
                  ? "SAVING..."
                  : details
                    ? "SAVE CHANGES"
                    : "SAVE PAYMENT DETAILS"}
              </button>
            </div>
          </form>
        )}
      </div>

      <DriverBottomNav />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  autoComplete,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white/80">
        {label}

        {required && (
          <span className="ml-1" style={{ color: GREEN }}>
            *
          </span>
        )}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-2xl border px-4 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/20"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          background: "#070907",
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = GREEN;
          event.currentTarget.style.boxShadow = `0 0 0 3px ${GREEN}12`;
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor =
            "rgba(255,255,255,0.10)";
          event.currentTarget.style.boxShadow = "none";
        }}
      />
    </label>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{
        borderColor: "rgba(255,255,255,0.07)",
        background: SECTION,
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl border p-4 text-sm font-bold"
      style={{
        borderColor: `${GREEN}30`,
        background: `${GREEN}0d`,
        color: GREEN_HOVER,
      }}
    >
      {message}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
      {message}
    </div>
  );
}