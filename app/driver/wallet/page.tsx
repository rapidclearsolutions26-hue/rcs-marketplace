"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WalletTransaction = {
  id: number;
  job_id: number | null;
  type: "earning" | "payout" | "adjustment";
  amount: number;
  description: string | null;
  reference: string | null;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
};

type PayoutRequest = {
  id: number;
  amount: number;
  status: "requested" | "approved" | "paid" | "rejected";
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
};

type PaymentDetails = {
  account_holder_name: string;
  bank_name: string | null;
  sort_code: string;
  account_number: string;
};

function money(value: number) {
  return `£${value.toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getNextFriday() {
  const now = new Date();
  const result = new Date(now);
  const day = result.getDay();

  let daysUntilFriday = (5 - day + 7) % 7;

  if (daysUntilFriday === 0 && now.getHours() >= 17) {
    daysUntilFriday = 7;
  }

  result.setDate(result.getDate() + daysUntilFriday);

  return result;
}

export default function DriverWalletPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [paymentDetails, setPaymentDetails] =
    useState<PaymentDetails | null>(null);

  const [driverName, setDriverName] = useState("Driver");

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadWallet() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/driver/login";
      return;
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (driver?.full_name) {
      setDriverName(driver.full_name);
    }

    const { data: transactionData, error: transactionError } =
      await supabase
        .from("driver_wallet_transactions")
        .select(
          "id, job_id, type, amount, description, reference, status, created_at",
        )
        .eq("driver_id", user.id)
        .order("created_at", { ascending: false });

    if (transactionError) {
      console.error(transactionError);
      setError("We couldn't load your wallet.");
    }

    const { data: payoutData, error: payoutError } = await supabase
      .from("driver_payout_requests")
      .select(
        "id, amount, status, requested_at, processed_at, notes",
      )
      .eq("driver_id", user.id)
      .order("requested_at", { ascending: false });

    if (payoutError) {
      console.error(payoutError);
    }

    const { data: paymentData, error: paymentError } =
      await supabase
        .from("driver_payment_details")
        .select(
          "account_holder_name, bank_name, sort_code, account_number",
        )
        .eq("driver_id", user.id)
        .maybeSingle();

    if (paymentError) {
      console.error(paymentError);
    }

    setTransactions(
      (transactionData ?? []) as WalletTransaction[],
    );

    setPayouts((payoutData ?? []) as PayoutRequest[]);

    setPaymentDetails(
      paymentData
        ? (paymentData as PaymentDetails)
        : null,
    );

    setLoading(false);
  }

  useEffect(() => {
    loadWallet();
  }, []);

  const availableBalance = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.status === "completed",
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0,
      );
  }, [transactions]);

  const totalEarned = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "earning" &&
          transaction.status === "completed",
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0,
      );
  }, [transactions]);

  const pendingBalance = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "earning" &&
          transaction.status === "pending",
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0,
      );
  }, [transactions]);

  const thisWeek = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);

    const day = monday.getDay();
    const difference = day === 0 ? 6 : day - 1;

    monday.setDate(monday.getDate() - difference);
    monday.setHours(0, 0, 0, 0);

    return transactions
      .filter(
        (transaction) =>
          transaction.type === "earning" &&
          transaction.status === "completed" &&
          new Date(transaction.created_at) >= monday,
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0,
      );
  }, [transactions]);

  const hasActivePayout = payouts.some(
    (payout) =>
      payout.status === "requested" ||
      payout.status === "approved",
  );

  const canRequestPayout =
    paymentDetails !== null &&
    availableBalance > 0 &&
    !hasActivePayout;

  const nextFriday = getNextFriday();

  const nextFridayText = nextFriday.toLocaleDateString(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    },
  );

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

  async function requestPayout() {
    if (!canRequestPayout) {
      return;
    }

    setRequesting(true);
    setError("");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/driver/login";
      return;
    }

    const { error: payoutError } = await supabase
      .from("driver_payout_requests")
      .insert({
        driver_id: user.id,
        amount: Number(
          Math.max(availableBalance, 0).toFixed(2),
        ),
        status: "requested",
      });

    if (payoutError) {
      console.error(payoutError);

      setError(
        "We couldn't create your payout request. Please try again.",
      );

      setRequesting(false);
      return;
    }

    setShowConfirm(false);
    setRequesting(false);
    setMessage(
      "Your payout request has been submitted to RCS.",
    );

    await loadWallet();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06100c] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

          <p className="text-sm text-[#9fb5aa]">
            Loading your wallet...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/driver/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1BBB8C] text-xs font-black text-[#06100c]">
              RCS
            </div>

            <div>
              <p className="text-sm font-black">
                Driver Wallet
              </p>

              <p className="text-xs text-[#829b90]">
                {driverName}
              </p>
            </div>
          </Link>

          <Link
            href="/driver/dashboard"
            className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#dce9e3] transition hover:bg-[#10251b]"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {/* BALANCE */}
        <section className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-xl">
          <p className="text-sm font-semibold text-[#9fb5aa]">
            Available to withdraw
          </p>

          <p className="mt-2 text-4xl font-black tracking-tight">
            {money(Math.max(availableBalance, 0))}
          </p>

          <p className="mt-2 text-sm text-[#829b90]">
            Your driver earnings available for payout.
          </p>

          <div className="mt-5 rounded-2xl border border-[#29483a] bg-[#081710] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#829b90]">
                  Next payout
                </p>

                <p className="mt-1 font-bold">
                  {nextFridayText}
                </p>
              </div>

              <span className="rounded-full bg-[#1BBB8C]/15 px-3 py-1 text-xs font-black text-[#1BBB8C]">
                EVERY FRIDAY
              </span>
            </div>
          </div>

          {!paymentDetails && (
            <div className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <div className="flex gap-3">
                <div className="text-lg">⚠️</div>

                <div>
                  <p className="text-sm font-black text-yellow-200">
                    Payment details required
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#b8aa72]">
                    Add your bank details before requesting a
                    payout.
                  </p>
                </div>
              </div>

              <Link
                href="/driver/payment-details"
                className="mt-4 block rounded-2xl bg-[#1BBB8C] px-5 py-3.5 text-center text-sm font-black text-[#06100c] transition hover:bg-[#22d3a0]"
              >
                ADD PAYMENT DETAILS
              </Link>
            </div>
          )}

          {paymentDetails && (
            <div className="mt-5 rounded-2xl border border-[#29483a] bg-[#081710] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#829b90]">
                    Payment details
                  </p>

                  <p className="mt-1 font-bold">
                    {paymentDetails.account_holder_name}
                  </p>

                  <p className="mt-1 text-xs text-[#829b90]">
                    {paymentDetails.bank_name ||
                      "Bank details added"}
                  </p>

                  <p className="mt-2 text-xs font-semibold text-[#9fb5aa]">
                    Sort code:{" "}
                    {maskSortCode(paymentDetails.sort_code)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#9fb5aa]">
                    Account:{" "}
                    {maskAccountNumber(
                      paymentDetails.account_number,
                    )}
                  </p>
                </div>

                <span className="rounded-full bg-[#1BBB8C]/15 px-3 py-1 text-[10px] font-black text-[#1BBB8C]">
                  ✓ ADDED
                </span>
              </div>

              <Link
                href="/driver/payment-details"
                className="mt-4 block text-center text-xs font-black text-[#1BBB8C]"
              >
                EDIT PAYMENT DETAILS →
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!canRequestPayout}
            className="mt-5 w-full rounded-2xl bg-[#1BBB8C] px-5 py-4 text-sm font-black text-[#06100c] transition hover:bg-[#22d3a0] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {hasActivePayout
              ? "PAYOUT REQUESTED"
              : paymentDetails
                ? "REQUEST PAYOUT"
                : "ADD PAYMENT DETAILS FIRST"}
          </button>

          {message && (
            <div className="mt-4 rounded-2xl border border-[#1BBB8C]/30 bg-[#1BBB8C]/10 p-4 text-sm font-bold text-[#8ff0ce]">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
              {error}
            </div>
          )}
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            title="Available"
            value={money(
              Math.max(availableBalance, 0),
            )}
          />

          <StatCard
            title="Pending"
            value={money(
              Math.max(pendingBalance, 0),
            )}
          />

          <StatCard
            title="This Week"
            value={money(thisWeek)}
          />

          <StatCard
            title="Total Earned"
            value={money(totalEarned)}
          />
        </section>

        {/* TRANSACTIONS */}
        <section className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14]">
          <div className="border-b border-[#17382b] px-5 py-4">
            <h2 className="font-black">
              Wallet Transactions
            </h2>

            <p className="mt-1 text-xs text-[#829b90]">
              Your earnings and payout history
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#829b90]">
              No wallet transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-[#17382b]">
              {transactions.map((transaction) => {
                const isPayout =
                  transaction.type === "payout";

                const isAdjustment =
                  transaction.type === "adjustment";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {transaction.description ||
                          (isPayout
                            ? "Driver payout"
                            : "Wallet transaction")}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#829b90]">
                        {transaction.reference && (
                          <span>
                            {transaction.reference}
                          </span>
                        )}

                        <span>
                          {formatDate(
                            transaction.created_at,
                          )}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`shrink-0 text-right font-black ${
                        isPayout
                          ? "text-white"
                          : isAdjustment
                            ? "text-yellow-300"
                            : "text-[#1BBB8C]"
                      }`}
                    >
                      {Number(transaction.amount) > 0
                        ? "+"
                        : ""}
                      {money(
                        Number(transaction.amount),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PAYOUT HISTORY */}
        <section className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14]">
          <div className="border-b border-[#17382b] px-5 py-4">
            <h2 className="font-black">
              Payout Requests
            </h2>

            <p className="mt-1 text-xs text-[#829b90]">
              Track your Friday payouts
            </p>
          </div>

          {payouts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#829b90]">
              No payout requests yet.
            </div>
          ) : (
            <div className="divide-y divide-[#17382b]">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-bold">
                      Payout #{payout.id}
                    </p>

                    <p className="mt-1 text-xs text-[#829b90]">
                      Requested{" "}
                      {formatDate(
                        payout.requested_at,
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-black">
                      {money(Number(payout.amount))}
                    </p>

                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        payout.status === "paid"
                          ? "bg-[#1BBB8C]/15 text-[#1BBB8C]"
                          : payout.status ===
                              "rejected"
                            ? "bg-red-500/15 text-red-300"
                            : payout.status ===
                                "approved"
                              ? "bg-blue-500/15 text-blue-300"
                              : "bg-yellow-500/15 text-yellow-300"
                      }`}
                    >
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#17382b] bg-[#081710] p-4">
          <p className="text-xs leading-5 text-[#829b90]">
            Driver earnings are calculated after the current
            10% RCS platform fee. Payout requests are processed
            by RCS on the weekly Friday payout cycle.
          </p>
        </section>
      </div>

      {/* CONFIRM PAYOUT */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-[#29483a] bg-[#0b1b14] p-6 shadow-2xl">
            <h2 className="text-xl font-black">
              Request Friday payout?
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#9fb5aa]">
              You are requesting:
            </p>

            <p className="mt-2 text-3xl font-black text-[#1BBB8C]">
              {money(
                Math.max(availableBalance, 0),
              )}
            </p>

            {paymentDetails && (
              <div className="mt-4 rounded-2xl border border-[#17382b] bg-[#081710] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#829b90]">
                  Paying to
                </p>

                <p className="mt-1 text-sm font-bold">
                  {paymentDetails.account_holder_name}
                </p>

                <p className="mt-1 text-xs text-[#829b90]">
                  Account{" "}
                  {maskAccountNumber(
                    paymentDetails.account_number,
                  )}
                </p>
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-[#829b90]">
              RCS will review and process your payout during
              the weekly Friday payout cycle.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={requesting}
                className="rounded-2xl border border-[#29483a] px-4 py-3 font-bold text-[#dce9e3] transition hover:bg-[#10251b] disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={requestPayout}
                disabled={requesting}
                className="rounded-2xl bg-[#1BBB8C] px-4 py-3 font-black text-[#06100c] transition hover:bg-[#22d3a0] disabled:opacity-50"
              >
                {requesting
                  ? "REQUESTING..."
                  : "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#17382b] bg-[#081710]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <NavItem
            href="/driver/dashboard"
            icon="⌂"
            label="Home"
          />

          <NavItem
            href="/driver/jobs"
            icon="▣"
            label="Available"
          />

          <NavItem
            href="/driver/bids"
            icon="£"
            label="Bids"
          />

          <NavItem
            href="/driver/assigned"
            icon="✓"
            label="Assigned"
          />

          <NavItem
            href="/driver/wallet"
            icon="£"
            label="Wallet"
            active
          />
        </div>
      </nav>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#829b90]">
        {title}
      </p>

      <p className="mt-2 text-lg font-black">
        {value}
      </p>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-bold transition ${
        active
          ? "bg-[#1BBB8C]/15 text-[#1BBB8C]"
          : "text-[#829b90] hover:bg-[#10251b]"
      }`}
    >
      <span className="text-base leading-none">
        {icon}
      </span>

      <span className="mt-1 truncate">
        {label}
      </span>
    </Link>
  );
}