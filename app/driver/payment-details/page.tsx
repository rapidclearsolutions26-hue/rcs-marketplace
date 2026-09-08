"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

    return `••••${numbers.slice(-4)}`;
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
      <main className="min-h-screen bg-[#06100c] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />
            <p className="text-sm text-[#9fb5aa]">
              Loading payment details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] pb-10 text-white">
      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link
            href="/driver/wallet"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1BBB8C] text-xs font-black text-[#06100c]">
              RCS
            </div>

            <div>
              <p className="text-sm font-black">Payment Details</p>
              <p className="text-xs text-[#829b90]">
                {driverName}
              </p>
            </div>
          </Link>

          <Link
            href="/driver/wallet"
            className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#dce9e3] transition hover:bg-[#10251b]"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {details && !editing ? (
          <div className="space-y-5">
            <section className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1BBB8C]/15 text-xl text-[#1BBB8C]">
                    £
                  </div>

                  <h1 className="text-2xl font-black">
                    Payment details
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-[#829b90]">
                    These details are used by RCS when processing your
                    driver payouts.
                  </p>
                </div>

                <div className="shrink-0 rounded-full bg-[#1BBB8C]/15 px-3 py-1.5 text-xs font-black text-[#1BBB8C]">
                  ✓ ADDED
                </div>
              </div>

              <div className="mt-6 space-y-3">
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

            <section className="rounded-2xl border border-[#17382b] bg-[#081710] p-5">
              <p className="text-sm font-bold">
                Need to change your bank details?
              </p>

              <p className="mt-1 text-xs leading-5 text-[#829b90]">
                Make sure your details are correct before requesting
                a payout.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSuccess("");
                  setError("");
                  setEditing(true);
                }}
                className="mt-4 w-full rounded-2xl border border-[#29483a] bg-[#0b1b14] px-5 py-3.5 text-sm font-black text-white transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
              >
                EDIT PAYMENT DETAILS
              </button>
            </section>

            {success && (
              <div className="rounded-2xl border border-[#1BBB8C]/30 bg-[#1BBB8C]/10 p-4 text-sm font-bold text-[#8ff0ce]">
                {success}
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={saveDetails}
            className="space-y-5"
          >
            <section className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6">
              <div className="mb-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1BBB8C]/15 text-xl text-[#1BBB8C]">
                  £
                </div>

                <h1 className="text-2xl font-black">
                  {details
                    ? "Update payment details"
                    : "Add payment details"}
                </h1>

                <p className="mt-2 text-sm leading-6 text-[#829b90]">
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

            <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-xs leading-5 text-[#d7c98b]">
                Please check your bank details carefully. Incorrect
                details could delay your payout.
              </p>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-[#1BBB8C]/30 bg-[#1BBB8C]/10 p-4 text-sm font-bold text-[#8ff0ce]">
                {success}
              </div>
            )}

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
                  className="rounded-2xl border border-[#29483a] px-4 py-4 text-sm font-black text-[#dce9e3] transition hover:bg-[#10251b] disabled:opacity-50"
                >
                  CANCEL
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className={`rounded-2xl bg-[#1BBB8C] px-4 py-4 text-sm font-black text-[#06100c] transition hover:bg-[#22d3a0] disabled:cursor-not-allowed disabled:opacity-50 ${
                  details ? "" : "col-span-2"
                }`}
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
      <span className="mb-2 block text-sm font-bold text-[#dce9e3]">
        {label}
        {required && (
          <span className="ml-1 text-[#1BBB8C]">*</span>
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
        className="w-full rounded-2xl border border-[#29483a] bg-[#080d09] px-4 py-4 text-sm font-semibold text-white outline-none placeholder:text-[#53665d] transition focus:border-[#1BBB8C] focus:ring-2 focus:ring-[#1BBB8C]/15"
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
    <div className="rounded-2xl border border-[#17382b] bg-[#081710] px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#829b90]">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}