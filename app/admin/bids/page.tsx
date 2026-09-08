"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Driver = {
  id: string;
  full_name: string | null;
  trading_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  vehicle_type: string | null;
  approved: boolean | null;
  application_status: string | null;
};

type Job = {
  id: number;
  reference: string | null;
  customer_id: string | null;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  status: string | null;
  journey_status: string | null;
  payment_status: string | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  accepted_bid_id: number | null;
  created_at: string | null;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
  accepted_at?: string | null;
  platform_fee_percent: number | null;
  platform_fee: number | null;
  driver_payout: number | null;

  job: Job | null;
  driver: Driver | null;

  financials: {
    amount: number;
    platformFeePercent: number;
    platformFee: number;
    driverPayout: number;
  };
};

type Stats = {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  totalValue: number;
  totalPotentialFees: number;
};

type Filter = "all" | "pending" | "accepted" | "rejected";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusClasses(status: string | null | undefined) {
  const value = String(status ?? "").toLowerCase();

  if (value === "accepted") {
    return "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";
  }

  if (value === "rejected") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (value === "pending") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  return "border-white/10 bg-white/5 text-gray-300";
}

function getJobStatusClasses(status: string | null | undefined) {
  const value = String(status ?? "").toLowerCase();

  if (
    value === "completed" ||
    value === "assigned" ||
    value === "paid"
  ) {
    return "text-[#79c51c]";
  }

  if (value === "open" || value === "bidding") {
    return "text-yellow-300";
  }

  return "text-gray-400";
}

export default function AdminBidsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [bids, setBids] = useState<Bid[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    totalValue: 0,
    totalPotentialFees: 0,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBids = useCallback(
    async (showLoader = false) => {
      try {
        if (showLoader) {
          setRefreshing(true);
        }

        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Your admin session has expired.");
        }

        const response = await fetch("/api/admin/bids", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Failed to load admin bids.",
          );
        }

        setBids(data.bids ?? []);

        setStats(
          data.stats ?? {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
            totalValue: 0,
            totalPotentialFees: 0,
          },
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load bids.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadBids();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadBids]);

  const filteredBids = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return bids.filter((bid) => {
      const status = String(bid.status ?? "").toLowerCase();

      if (filter !== "all" && status !== filter) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const driverName =
        bid.driver?.full_name?.toLowerCase() ?? "";

      const tradingName =
        bid.driver?.trading_name?.toLowerCase() ?? "";

      const companyName =
        bid.driver?.company_name?.toLowerCase() ?? "";

      const email = bid.driver?.email?.toLowerCase() ?? "";

      const reference =
        bid.job?.reference?.toLowerCase() ?? "";

      const postcode =
        bid.job?.postcode?.toLowerCase() ?? "";

      const message =
        bid.message?.toLowerCase() ?? "";

      const bidId = String(bid.id);

      return (
        driverName.includes(searchValue) ||
        tradingName.includes(searchValue) ||
        companyName.includes(searchValue) ||
        email.includes(searchValue) ||
        reference.includes(searchValue) ||
        postcode.includes(searchValue) ||
        message.includes(searchValue) ||
        bidId.includes(searchValue)
      );
    });
  }, [bids, filter, search]);

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="border-b border-[#17382b] bg-[#081710]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
              Rapid Clear Solutions
            </p>

            <h1 className="mt-1 text-xl font-black sm:text-2xl">
              Admin Bids
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadBids(true)}
              disabled={refreshing}
              className="rounded-xl border border-[#29483a] bg-[#0b1b14] px-4 py-2 text-sm font-bold text-white transition hover:border-[#79c51c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              href="/admin/dashboard"
              className="hidden rounded-xl border border-[#29483a] bg-[#0b1b14] px-4 py-2 text-sm font-bold text-gray-200 transition hover:border-[#79c51c] hover:text-white sm:block"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
            Marketplace
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Driver Bids
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            See every quote submitted by drivers and track which
            bids have been accepted or rejected.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Bids"
            value={stats.total}
            detail="All driver quotes"
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            detail="Awaiting customer decision"
          />

          <StatCard
            label="Accepted"
            value={stats.accepted}
            detail="Winning bids"
          />

          <StatCard
            label="Bid Value"
            value={formatMoney(stats.totalValue)}
            detail={`${formatMoney(stats.totalPotentialFees)} potential RCS fees`}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All ({stats.total})
              </FilterButton>

              <FilterButton
                active={filter === "pending"}
                onClick={() => setFilter("pending")}
              >
                Pending ({stats.pending})
              </FilterButton>

              <FilterButton
                active={filter === "accepted"}
                onClick={() => setFilter("accepted")}
              >
                Accepted ({stats.accepted})
              </FilterButton>

              <FilterButton
                active={filter === "rejected"}
                onClick={() => setFilter("rejected")}
              >
                Rejected ({stats.rejected})
              </FilterButton>
            </div>

            <div className="w-full lg:max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search driver, job or postcode..."
                className="w-full rounded-xl border border-[#29483a] bg-[#06100c] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#79c51c]"
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] px-6 py-12 text-center text-gray-400">
              Loading bids...
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] px-6 py-12 text-center">
              <p className="text-lg font-bold text-white">
                No bids found
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Try changing the filter or search term.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  onOpen={() => setSelectedBid(bid)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedBid && (
        <BidModal
          bid={selectedBid}
          onClose={() => setSelectedBid(null)}
        />
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        {detail}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
        active
          ? "border-[#79c51c] bg-[#79c51c]/10 text-[#79c51c]"
          : "border-[#29483a] bg-[#06100c] text-gray-400 hover:border-[#79c51c]/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function BidCard({
  bid,
  onOpen,
}: {
  bid: Bid;
  onOpen: () => void;
}) {
  const driverName =
    bid.driver?.trading_name ||
    bid.driver?.company_name ||
    bid.driver?.full_name ||
    "Unknown driver";

  const jobReference =
    bid.job?.reference || `Job #${bid.job_id}`;

  const isAssigned =
    bid.job?.assigned_bid_id === bid.id ||
    bid.job?.accepted_bid_id === bid.id;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5 text-left transition hover:border-[#79c51c]/60 hover:bg-[#0d2118]"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Bid #{bid.id}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${getStatusClasses(
                bid.status,
              )}`}
            >
              {bid.status || "Unknown"}
            </span>

            {isAssigned && (
              <span className="rounded-full border border-[#79c51c]/30 bg-[#79c51c]/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#79c51c]">
                Assigned
              </span>
            )}
          </div>

          <h3 className="mt-3 text-xl font-black text-white">
            {jobReference}
          </h3>

          <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
            <p>
              <span className="text-gray-600">Driver:</span>{" "}
              <span className="font-bold text-gray-200">
                {driverName}
              </span>
            </p>

            <p>
              <span className="text-gray-600">Job:</span>{" "}
              <span className="font-bold text-gray-200">
                {bid.job?.job_type || "Waste removal"}
              </span>
            </p>

            <p>
              <span className="text-gray-600">Postcode:</span>{" "}
              <span className="font-bold text-gray-200">
                {bid.job?.postcode || "—"}
              </span>
            </p>

            <p>
              <span className="text-gray-600">Submitted:</span>{" "}
              <span className="font-bold text-gray-200">
                {formatDate(bid.created_at)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-end justify-between gap-8 border-t border-[#17382b] pt-4 lg:min-w-[280px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Customer Price
            </p>

            <p className="mt-1 text-2xl font-black text-white">
              {formatMoney(bid.financials.amount)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Driver Payout
            </p>

            <p className="mt-1 text-xl font-black text-[#79c51c]">
              {formatMoney(bid.financials.driverPayout)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

function BidModal({
  bid,
  onClose,
}: {
  bid: Bid;
  onClose: () => void;
}) {
  const driverName =
    bid.driver?.trading_name ||
    bid.driver?.company_name ||
    bid.driver?.full_name ||
    "Unknown driver";

  const jobReference =
    bid.job?.reference || `Job #${bid.job_id}`;

  const assigned =
    bid.job?.assigned_bid_id === bid.id ||
    bid.job?.accepted_bid_id === bid.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#29483a] bg-[#0b1b14] shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#17382b] bg-[#0b1b14] px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
              Bid Details
            </p>

            <h2 className="mt-1 text-xl font-black">
              Bid #{bid.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#29483a] px-3 py-2 text-sm font-bold text-gray-300 hover:border-[#79c51c] hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <section className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                  Job
                </p>

                <p className="mt-1 text-xl font-black">
                  {jobReference}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase ${getStatusClasses(
                  bid.status,
                )}`}
              >
                {bid.status || "Unknown"}
              </span>
            </div>

            {assigned && (
              <div className="mt-4 rounded-xl border border-[#79c51c]/30 bg-[#79c51c]/10 px-4 py-3 text-sm font-bold text-[#79c51c]">
                This is the accepted/assigned bid for this job.
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Job type"
                value={bid.job?.job_type || "—"}
              />

              <Detail
                label="Load size"
                value={bid.job?.load_size || "—"}
              />

              <Detail
                label="Postcode"
                value={bid.job?.postcode || "—"}
              />

              <Detail
                label="Job status"
                value={bid.job?.status || "—"}
                valueClass={getJobStatusClasses(bid.job?.status)}
              />

              <Detail
                label="Journey status"
                value={bid.job?.journey_status || "—"}
                valueClass={getJobStatusClasses(
                  bid.job?.journey_status,
                )}
              />

              <Detail
                label="Payment status"
                value={bid.job?.payment_status || "—"}
                valueClass={getJobStatusClasses(
                  bid.job?.payment_status,
                )}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#79c51c]">
              Driver
            </p>

            <h3 className="mt-2 text-xl font-black">
              {driverName}
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Full name"
                value={bid.driver?.full_name || "—"}
              />

              <Detail
                label="Trading name"
                value={bid.driver?.trading_name || "—"}
              />

              <Detail
                label="Company"
                value={bid.driver?.company_name || "—"}
              />

              <Detail
                label="Vehicle"
                value={bid.driver?.vehicle_type || "—"}
              />

              <Detail
                label="Phone"
                value={bid.driver?.phone || "—"}
              />

              <Detail
                label="Email"
                value={bid.driver?.email || "—"}
              />

              <Detail
                label="Approved"
                value={bid.driver?.approved ? "Yes" : "No"}
              />

              <Detail
                label="Application status"
                value={bid.driver?.application_status || "—"}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#79c51c]">
              Financial Breakdown
            </p>

            <div className="mt-5 space-y-3">
              <MoneyRow
                label="Customer price"
                value={bid.financials.amount}
              />

              <MoneyRow
                label={`RCS fee (${bid.financials.platformFeePercent}%)`}
                value={bid.financials.platformFee}
              />

              <div className="border-t border-[#17382b] pt-3">
                <MoneyRow
                  label="Driver payout"
                  value={bid.financials.driverPayout}
                  highlight
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#79c51c]">
              Bid Information
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Bid ID"
                value={String(bid.id)}
              />

              <Detail
                label="Job ID"
                value={String(bid.job_id)}
              />

              <Detail
                label="Driver ID"
                value={bid.driver_id}
              />

              <Detail
                label="Submitted"
                value={formatDate(bid.created_at)}
              />

              <Detail
                label="Updated"
                value={formatDate(bid.updated_at)}
              />

              <Detail
                label="Accepted"
                value={formatDate(bid.accepted_at)}
              />
            </div>

            {bid.message && (
              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                  Driver message
                </p>

                <div className="mt-2 rounded-xl border border-[#17382b] bg-[#0b1b14] p-4 text-sm leading-6 text-gray-300">
                  {bid.message}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>

      <p className={`mt-1 break-words text-sm font-bold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-400">
        {label}
      </span>

      <span
        className={`text-base font-black ${
          highlight ? "text-[#79c51c]" : "text-white"
        }`}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}