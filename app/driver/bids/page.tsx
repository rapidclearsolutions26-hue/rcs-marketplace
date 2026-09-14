"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
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

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

const RCS_FEE_PERCENT = 10;

export default function DriverBidsPage() {
  const router = useRouter();

  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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
      window.clearInterval(interval);
  }, [loadBids]);

  if (loading) {
    return <Loading />;
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
          background: "rgba(5,7,5,0.94)",
          borderColor: "#283326",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/driver/dashboard"
              className="hidden shrink-0 sm:block"
            >
              <Image
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                width={150}
                height={60}
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="min-w-0">
              <p
                className="text-[9px] font-black uppercase tracking-[0.18em]"
                style={{ color: GREEN }}
              >
                RCS Marketplace
              </p>

              <h1 className="truncate text-lg font-black sm:text-xl">
                My Bids
              </h1>

              <p className="truncate text-[10px] text-gray-600 sm:text-xs">
                {bids.length === 1
                  ? "1 bid awaiting customer decision"
                  : `${bids.length} bids awaiting customer decision`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadBids()}
            disabled={refreshing}
            className="flex h-10 shrink-0 items-center justify-center rounded-xl border px-3 text-sm font-black transition disabled:opacity-50 sm:px-4"
            style={{
              borderColor: "#354433",
              color: GREEN,
            }}
          >
            <span className="sm:hidden">
              ↻
            </span>

            <span className="hidden sm:inline">
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>
        </div>
      </header>

      {/* HERO */}

      <section
        className="border-b"
        style={{
          background: SECTION,
          borderColor: "#1d251b",
        }}
      >
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-11">
          <Link
            href="/driver/dashboard"
            className="inline-flex text-sm font-black transition"
            style={{ color: GREEN }}
          >
            ← Back to Driver Dashboard
          </Link>

          <div className="mt-7">
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{ color: GREEN }}
            >
              RCS Driver Marketplace
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Track your bids.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
              Keep an eye on the jobs you've bid for while
              customers decide which driver to choose.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Pending bids"
              value={String(bids.length)}
            />

            <Stat
              label="RCS fee"
              value={`${RCS_FEE_PERCENT}%`}
            />

            <Stat
              label="Auto refresh"
              value="15 sec"
            />
          </div>
        </div>
      </section>

      {/* CONTENT */}

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
        {error && (
          <div
            className="mb-6 rounded-2xl border p-5"
            style={{
              borderColor:
                "rgba(127,29,29,.7)",
              background:
                "rgba(69,10,10,.3)",
            }}
          >
            <p className="text-sm leading-6 text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadBids()
              }
              className="mt-3 text-sm font-black text-white underline"
            >
              Try again
            </button>
          </div>
        )}

        {bids.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
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
    <article
      className="overflow-hidden rounded-3xl border shadow-xl"
      style={{
        background: CARD,
        borderColor: "#283326",
      }}
    >
      {/* BID HEADER */}

      <div
        className="border-b p-5 sm:p-6"
        style={{
          borderColor: "#283326",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: "#65705f" }}
            >
              Marketplace Job
            </p>

            <p
              className="mt-1 text-xl font-black"
              style={{ color: GREEN }}
            >
              RC-
              {String(
                bid.job_id
              ).padStart(6, "0")}
            </p>
          </div>

          <span
            className="rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
            style={{
              color: GREEN,
              background: "#101a0d",
              borderColor: "#294126",
            }}
          >
            Pending
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* MONEY */}

        <div>
          <p
            className="mb-3 text-[10px] font-black uppercase tracking-[0.15em]"
            style={{ color: "#65705f" }}
          >
            Your bid breakdown
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Money
              label="Your bid"
              value={amount}
            />

            <Money
              label={`RCS ${RCS_FEE_PERCENT}%`}
              value={fee}
              muted
            />

            <Money
              label="You receive"
              value={payout}
              highlight
            />
          </div>
        </div>

        {/* EXPLANATION */}

        <div
          className="rounded-2xl border p-4"
          style={{
            background: SECTION,
            borderColor: "#283326",
          }}
        >
          <p className="text-xs font-bold text-gray-300">
            Estimated driver payout
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-600">
            If the customer accepts this bid, your
            estimated payout after the {RCS_FEE_PERCENT}%
            RCS marketplace fee is shown above.
          </p>
        </div>

        {/* MESSAGE */}

        {bid.message && (
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.15em]"
              style={{ color: "#65705f" }}
            >
              Your message
            </p>

            <div
              className="mt-2 rounded-2xl border p-4"
              style={{
                background: "#080d09",
                borderColor: "#283326",
              }}
            >
              <p className="text-sm leading-6 text-gray-400">
                {bid.message}
              </p>
            </div>
          </div>
        )}

        {/* VIEW JOB */}

        <Link
          href={`/driver/jobs/${bid.job_id}`}
          className="group flex min-h-14 w-full items-center justify-center rounded-xl px-5 py-4 text-sm font-black text-black transition"
          style={{
            background: GREEN,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              GREEN_HOVER)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background =
              GREEN)
          }
        >
          View Job
          <span className="ml-2 transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

function Money({
  label,
  value,
  highlight = false,
  muted = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: highlight
          ? "#101a0d"
          : SECTION,
        borderColor: highlight
          ? "#3b6126"
          : "#283326",
      }}
    >
      <p
        className="text-[9px] font-black uppercase tracking-[0.12em]"
        style={{
          color: muted
            ? "#65705f"
            : "#65705f",
        }}
      >
        {label}
      </p>

      <p
        className="mt-1.5 text-xl font-black"
        style={{
          color: highlight
            ? GREEN
            : "#ffffff",
        }}
      >
        £{value.toFixed(2)}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: CARD,
        borderColor: "#283326",
      }}
    >
      <p
        className="text-[9px] font-black uppercase tracking-[0.12em]"
        style={{ color: "#65705f" }}
      >
        {label}
      </p>

      <p
        className="mt-1.5 text-xl font-black"
        style={{ color: GREEN }}
      >
        {value}
      </p>
    </div>
  );
}

function Empty() {
  return (
    <div
      className="rounded-3xl border border-dashed px-5 py-16 text-center"
      style={{
        background: CARD,
        borderColor: "#294126",
      }}
    >
      <div
        className="mx-auto h-1.5 w-12 rounded-full"
        style={{ background: GREEN }}
      />

      <h2 className="mt-5 text-2xl font-black">
        No pending bids
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
        When you place a bid on an RCS marketplace job,
        it will appear here while the customer decides.
      </p>

      <Link
        href="/driver/jobs"
        className="mt-7 inline-flex rounded-xl px-5 py-3 text-sm font-black text-black transition"
        style={{ background: GREEN }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            GREEN_HOVER)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background =
            GREEN)
        }
      >
        Find Jobs
      </Link>
    </div>
  );
}

function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center text-white"
      style={{ background: BG }}
    >
      <div className="text-center">
        <div
          className="mx-auto h-11 w-11 animate-spin rounded-full border-4"
          style={{
            borderColor: "#283326",
            borderTopColor: GREEN,
          }}
        />

        <p className="mt-5 font-black">
          Loading your bids...
        </p>

        <p className="mt-1 text-sm text-gray-600">
          Connecting to the RCS Marketplace
        </p>
      </div>
    </main>
  );
}