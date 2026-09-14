"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DriverBottomNav from "@/app/components/driver/DriverBottomNav";

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

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

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

  const [transactions, setTransactions] = useState<
    WalletTransaction[]
  >([]);

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

    const {
      data: transactionData,
      error: transactionError,
    } = await supabase
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

    const { data: payoutData, error: payoutError } =
      await supabase
        .from("driver_payout_requests")
        .select(
          "id, amount, status, requested_at, processed_at, notes",
        )
        .eq("driver_id", user.id)
        .order("requested_at", { ascending: false });

    if (payoutError) {
      console.error(payoutError);
    }

    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
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

    return `•••• ${numbers.slice(-4)}`;
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
      <main
        className="flex min-h-screen items-center justify-center text-white"
        style={{ background: BG }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              borderTopColor: GREEN,
            }}
          />

          <p className="text-sm text-white/45">
            Loading your wallet...
          </p>
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/driver/dashboard"
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
                Driver Wallet
              </p>

              <p className="text-xs text-white/45">
                {driverName}
              </p>
            </div>
          </Link>

          <Link
            href="/driver/dashboard"
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

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* PAGE INTRO */}
        <div>
          <p
            className="text-xs font-black uppercase tracking-[0.18em]"
            style={{ color: GREEN }}
          >
            Driver earnings
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Your wallet
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/45">
            View your earnings, payout balance and payment history.
          </p>
        </div>

        {/* BALANCE */}
        <section
          className="overflow-hidden rounded-3xl border"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: CARD,
          }}
        >
          <div
            className="p-6 sm:p-7"
            style={{
              background: `linear-gradient(135deg, ${GREEN}0c 0%, ${SECTION} 55%)`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white/50">
                  Available to withdraw
                </p>

                <p className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                  {money(
                    Math.max(availableBalance, 0),
                  )}
                </p>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                  Your completed driver earnings currently available
                  for payout.
                </p>
              </div>

              <div
                className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black sm:flex"
                style={{
                  background: `${GREEN}15`,
                  color: GREEN,
                }}
              >
                £
              </div>
            </div>

            {/* NEXT PAYOUT */}
            <div
              className="mt-6 rounded-2xl border p-4"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(5,7,5,0.65)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                    Next payout
                  </p>

                  <p className="mt-1 font-black">
                    {nextFridayText}
                  </p>
                </div>

                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-black"
                  style={{
                    background: `${GREEN}15`,
                    color: GREEN,
                  }}
                >
                  EVERY FRIDAY
                </span>
              </div>
            </div>

            {/* PAYMENT DETAILS */}
            {!paymentDetails && (
              <div
                className="mt-5 rounded-2xl border p-4"
                style={{
                  borderColor: "rgba(234,179,8,0.20)",
                  background: "rgba(234,179,8,0.05)",
                }}
              >
                <p className="text-sm font-black text-yellow-100">
                  Payment details required
                </p>

                <p className="mt-1 text-xs leading-5 text-yellow-100/55">
                  Add your bank details before requesting a payout.
                </p>

                <Link
                  href="/driver/payment-details"
                  className="mt-4 block rounded-2xl px-5 py-3.5 text-center text-sm font-black transition"
                  style={{
                    background: GREEN,
                    color: BG,
                  }}
                >
                  ADD PAYMENT DETAILS
                </Link>
              </div>
            )}

            {paymentDetails && (
              <div
                className="mt-5 rounded-2xl border p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(5,7,5,0.65)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                      Payment details
                    </p>

                    <p className="mt-1 font-black">
                      {paymentDetails.account_holder_name}
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      {paymentDetails.bank_name ||
                        "Bank details added"}
                    </p>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-white/55">
                        Sort code:{" "}
                        {maskSortCode(
                          paymentDetails.sort_code,
                        )}
                      </p>

                      <p className="text-xs font-semibold text-white/55">
                        Account:{" "}
                        {maskAccountNumber(
                          paymentDetails.account_number,
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-black"
                    style={{
                      background: `${GREEN}15`,
                      color: GREEN,
                    }}
                  >
                    ✓ ADDED
                  </span>
                </div>

                <Link
                  href="/driver/payment-details"
                  className="mt-4 block text-xs font-black transition"
                  style={{ color: GREEN }}
                >
                  EDIT PAYMENT DETAILS →
                </Link>
              </div>
            )}

            {/* REQUEST BUTTON */}
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!canRequestPayout}
              className="mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                background: canRequestPayout
                  ? GREEN
                  : "rgba(255,255,255,0.10)",
                color: canRequestPayout
                  ? BG
                  : "rgba(255,255,255,0.40)",
              }}
            >
              {hasActivePayout
                ? "PAYOUT REQUESTED"
                : paymentDetails
                  ? "REQUEST PAYOUT"
                  : "ADD PAYMENT DETAILS FIRST"}
            </button>

            {message && (
              <div
                className="mt-4 rounded-2xl border p-4 text-sm font-bold"
                style={{
                  borderColor: `${GREEN}30`,
                  background: `${GREEN}0d`,
                  color: GREEN_HOVER,
                }}
              >
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            title="Available"
            value={money(
              Math.max(availableBalance, 0),
            )}
            accent
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
        <section
          className="overflow-hidden rounded-3xl border"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: CARD,
          }}
        >
          <div
            className="border-b px-5 py-5 sm:px-6"
            style={{
              borderColor: "rgba(255,255,255,0.07)",
              background: SECTION,
            }}
          >
            <h2 className="text-lg font-black">
              Wallet Transactions
            </h2>

            <p className="mt-1 text-xs text-white/40">
              Your earnings and wallet history
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: `${GREEN}10`,
                  color: GREEN,
                }}
              >
                £
              </div>

              <p className="mt-4 text-sm font-bold">
                No wallet transactions yet
              </p>

              <p className="mt-1 text-xs text-white/35">
                Your earnings will appear here once you complete jobs.
              </p>
            </div>
          ) : (
            <div
              className="divide-y"
              style={{
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              {transactions.map((transaction) => {
                const isPayout =
                  transaction.type === "payout";

                const isAdjustment =
                  transaction.type === "adjustment";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.015] sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                        style={{
                          background: isPayout
                            ? "rgba(255,255,255,0.06)"
                            : isAdjustment
                              ? "rgba(234,179,8,0.10)"
                              : `${GREEN}12`,
                          color: isPayout
                            ? "rgba(255,255,255,0.55)"
                            : isAdjustment
                              ? "#facc15"
                              : GREEN,
                        }}
                      >
                        {isPayout
                          ? "↓"
                          : isAdjustment
                            ? "±"
                            : "£"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {transaction.description ||
                            (isPayout
                              ? "Driver payout"
                              : "Wallet transaction")}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/35">
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

                          <span className="capitalize">
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="shrink-0 text-right font-black"
                      style={{
                        color: isPayout
                          ? "rgba(255,255,255,0.80)"
                          : isAdjustment
                            ? "#facc15"
                            : GREEN,
                      }}
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
        <section
          className="overflow-hidden rounded-3xl border"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: CARD,
          }}
        >
          <div
            className="border-b px-5 py-5 sm:px-6"
            style={{
              borderColor: "rgba(255,255,255,0.07)",
              background: SECTION,
            }}
          >
            <h2 className="text-lg font-black">
              Payout Requests
            </h2>

            <p className="mt-1 text-xs text-white/40">
              Track your Friday payout requests
            </p>
          </div>

          {payouts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold">
                No payout requests yet
              </p>

              <p className="mt-1 text-xs text-white/35">
                Your payout requests will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div>
                    <p className="font-bold">
                      Payout #{payout.id}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
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

                    <PayoutStatus status={payout.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* INFO */}
        <section
          className="rounded-2xl border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: SECTION,
          }}
        >
          <p className="text-xs leading-5 text-white/40">
            Driver earnings are calculated after the current 10% RCS
            platform fee. Payout requests are processed by RCS on the
            weekly Friday payout cycle.
          </p>
        </section>
      </div>

      {/* CONFIRM PAYOUT */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center">
          <div
            className="w-full max-w-md rounded-3xl border p-6 shadow-2xl"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              background: CARD,
            }}
          >
            <div
              className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black"
              style={{
                background: `${GREEN}15`,
                color: GREEN,
              }}
            >
              £
            </div>

            <h2 className="text-xl font-black">
              Request Friday payout?
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/45">
              You are requesting the following amount:
            </p>

            <p
              className="mt-2 text-4xl font-black"
              style={{ color: GREEN }}
            >
              {money(
                Math.max(availableBalance, 0),
              )}
            </p>

            {paymentDetails && (
              <div
                className="mt-5 rounded-2xl border p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: SECTION,
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  Paying to
                </p>

                <p className="mt-1 text-sm font-bold">
                  {paymentDetails.account_holder_name}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {paymentDetails.bank_name ||
                    "Bank details added"}
                </p>

                <p className="mt-2 text-xs font-semibold text-white/50">
                  Account{" "}
                  {maskAccountNumber(
                    paymentDetails.account_number,
                  )}
                </p>
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-white/35">
              RCS will review and process your payout during the weekly
              Friday payout cycle.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={requesting}
                className="rounded-2xl border px-4 py-3.5 text-sm font-black transition disabled:opacity-50"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: SECTION,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={requestPayout}
                disabled={requesting}
                className="rounded-2xl px-4 py-3.5 text-sm font-black transition disabled:opacity-50"
                style={{
                  background: GREEN,
                  color: BG,
                }}
              >
                {requesting
                  ? "REQUESTING..."
                  : "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARED DRIVER NAV */}
      <DriverBottomNav />
    </main>
  );
}

function StatCard({
  title,
  value,
  accent = false,
}: {
  title: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: accent
          ? `${GREEN}25`
          : "rgba(255,255,255,0.08)",
        background: CARD,
      }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
        {title}
      </p>

      <p
        className="mt-2 text-lg font-black"
        style={{
          color: accent ? GREEN : "white",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function PayoutStatus({
  status,
}: {
  status: PayoutRequest["status"];
}) {
  const styles = {
    paid: {
      background: `${GREEN}15`,
      color: GREEN,
    },
    rejected: {
      background: "rgba(239,68,68,0.12)",
      color: "#fca5a5",
    },
    approved: {
      background: "rgba(59,130,246,0.12)",
      color: "#93c5fd",
    },
    requested: {
      background: "rgba(234,179,8,0.12)",
      color: "#fde68a",
    },
  };

  const style = styles[status];

  return (
    <span
      className="mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase"
      style={style}
    >
      {status}
    </span>
  );
}