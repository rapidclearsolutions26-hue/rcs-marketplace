"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DriverBottomNav from "@/app/components/driver/DriverBottomNav";

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number;
  message: string | null;
  status: string | null;
};

const RCS_FEE_PERCENT = 10;

export default function DriverBidsPage() {
  const router = useRouter();

  const [bids, setBids] =
    useState<Bid[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadBids = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/driver/login");
          return;
        }

        const {
          data,
          error: bidsError,
        } = await supabase
          .from("bids")
          .select(
            `
              id,
              job_id,
              driver_id,
              amount,
              message,
              status
            `
          )
          .eq("driver_id", user.id)
          .order("id", {
            ascending: false,
          });

        if (bidsError) {
          throw bidsError;
        }

        setBids(
          ((data || []) as Bid[]).filter(
            (bid) =>
              !bid.status ||
              bid.status === "pending"
          )
        );
      } catch (err) {
        console.error(
          "Pending bids error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your bids."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        loadBids(true);
      }, 15000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [loadBids]);

  if (loading) {
    return (
      <Loading />
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              RCS Marketplace
            </p>

            <h1 className="text-lg font-black sm:text-xl">
              Pending Bids
            </h1>

            <p className="text-[10px] text-[#71867c] sm:text-xs">
              {bids.length} awaiting customer decision
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadBids()
            }
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#29483a] text-lg font-black text-[#1BBB8C] disabled:opacity-50 sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">
              ↻
            </span>

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-8">
        <Link
          href="/driver/dashboard"
          className="mb-5 inline-flex text-sm font-black text-[#1BBB8C]"
        >
          ← Back to Home
        </Link>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4">
            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        )}

        {bids.length === 0 ? (
          <Empty
            title="No pending bids"
            description="When you place a bid, it will appear here while the customer decides."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {bids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
              />
            ))}
          </div>
        )}
      </div>

      <DriverBottomNav />
    </main>
  );
}

function BidCard({
  bid,
}: {
  bid: Bid;
}) {
  const amount =
    Number(bid.amount || 0);

  const fee =
    amount *
    (RCS_FEE_PERCENT / 100);

  const payout =
    amount - fee;

  return (
    <article className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-[#657a70]">
            Job
          </p>

          <p className="mt-1 text-lg font-black">
            RC-
            {String(
              bid.job_id
            ).padStart(6, "0")}
          </p>
        </div>

        <span className="rounded-full border border-[#29483a] bg-[#18271f] px-2.5 py-1 text-[9px] font-black text-[#b8c6c0]">
          PENDING
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Money
          label="Your bid"
          value={amount}
        />

        <Money
          label={`RCS ${RCS_FEE_PERCENT}%`}
          value={fee}
        />

        <Money
          label="You receive"
          value={payout}
          highlight
        />
      </div>

      {bid.message && (
        <div className="mt-4 rounded-2xl bg-[#07130e] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">
            Your message
          </p>

          <p className="mt-1 text-sm leading-6 text-[#aab8b2]">
            {bid.message}
          </p>
        </div>
      )}

      <Link
        href={`/driver/jobs/${bid.job_id}`}
        className="mt-5 flex min-h-12 items-center justify-center rounded-xl border border-[#29483a] px-5 py-3 text-sm font-black text-white hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
      >
        View Job →
      </Link>
    </article>
  );
}

function Money({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-[#3f8d24] bg-[#162b13]"
          : "border-[#214333] bg-[#08150f]"
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-wide text-[#71867c]">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${
          highlight
            ? "text-[#1BBB8C]"
            : "text-white"
        }`}
      >
        £
        {value.toFixed(2)}
      </p>
    </div>
  );
}

function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] px-5 py-12 text-center">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-[#1BBB8C]" />

      <h2 className="mt-5 text-xl font-black">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#71857b]">
        {description}
      </p>
    </div>
  );
}

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06100c] text-white">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

        <p className="mt-5 font-black">
          Loading bids...
        </p>
      </div>
    </main>
  );
}