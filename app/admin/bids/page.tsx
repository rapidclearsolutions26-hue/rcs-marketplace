"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

type Filter =
  | "all"
  | "pending"
  | "accepted"
  | "rejected";

type SortOption =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(
  value: string | null | undefined,
) {
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

function formatShortDate(
  value: string | null | undefined,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalise(
  value: string | null | undefined,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}

function formatStatus(
  value: string | null | undefined,
) {
  const safe =
    normalise(value) || "unknown";

  return safe
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getStatusClasses(
  status: string | null | undefined,
) {
  const value = normalise(status);

  if (value === "accepted") {
    return "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";
  }

  if (value === "rejected") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (value === "pending") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  return "border-white/10 bg-white/5 text-gray-400";
}

function getJobStatusClasses(
  status: string | null | undefined,
) {
  const value = normalise(status);

  if (
    value === "completed" ||
    value === "assigned" ||
    value === "paid"
  ) {
    return "text-[#79c51c]";
  }

  if (
    value === "open" ||
    value === "bidding" ||
    value === "pending"
  ) {
    return "text-yellow-300";
  }

  if (
    value === "cancelled" ||
    value === "rejected"
  ) {
    return "text-red-300";
  }

  return "text-gray-400";
}

function getDriverName(
  driver: Driver | null,
) {
  if (!driver) {
    return "Unknown driver";
  }

  return (
    driver.trading_name ||
    driver.company_name ||
    driver.full_name ||
    "Unknown driver"
  );
}

function getDriverInitials(
  driver: Driver | null,
) {
  const name =
    driver?.full_name?.trim();

  if (!name) {
    return "R";
  }

  const parts =
    name.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getBidTimestamp(
  bid: Bid,
) {
  const value =
    bid.created_at
      ? new Date(
          bid.created_at,
        ).getTime()
      : 0;

  return Number.isNaN(value)
    ? 0
    : value;
}

export default function AdminBidsPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [bids, setBids] =
    useState<Bid[]>([]);

  const [stats, setStats] =
    useState<Stats>({
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      totalValue: 0,
      totalPotentialFees: 0,
    });

  const [filter, setFilter] =
    useState<Filter>("all");

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<SortOption>("newest");

  const [selectedBid, setSelectedBid] =
    useState<Bid | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [copiedValue, setCopiedValue] =
    useState("");

  const loadBids =
    useCallback(
      async (
        showLoader = false,
      ) => {
        try {
          if (showLoader) {
            setRefreshing(true);
          }

          setError("");

          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (
            !session?.access_token
          ) {
            throw new Error(
              "Your admin session has expired.",
            );
          }

          const response =
            await fetch(
              "/api/admin/bids",
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                cache: "no-store",
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "Failed to load admin bids.",
            );
          }

          setBids(
            data.bids ?? [],
          );

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
          console.error(
            "Admin bids error:",
            err,
          );

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
    void loadBids();
  }, [loadBids]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        void loadBids();
      }, 15000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [loadBids]);

  const acceptedValue =
    useMemo(() => {
      return bids
        .filter(
          (bid) =>
            normalise(
              bid.status,
            ) === "accepted",
        )
        .reduce(
          (total, bid) =>
            total +
            Number(
              bid.financials
                ?.amount ?? 0,
            ),
          0,
        );
    }, [bids]);

  const averageBid =
    useMemo(() => {
      if (!bids.length) {
        return 0;
      }

      const total =
        bids.reduce(
          (sum, bid) =>
            sum +
            Number(
              bid.financials
                ?.amount ?? 0,
            ),
          0,
        );

      return total / bids.length;
    }, [bids]);

  const filteredBids =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      const filtered =
        bids.filter(
          (bid) => {
            const status =
              normalise(
                bid.status,
              );

            if (
              filter !== "all" &&
              status !== filter
            ) {
              return false;
            }

            if (!searchValue) {
              return true;
            }

            const driverName =
              bid.driver?.full_name?.toLowerCase() ??
              "";

            const tradingName =
              bid.driver?.trading_name?.toLowerCase() ??
              "";

            const companyName =
              bid.driver?.company_name?.toLowerCase() ??
              "";

            const email =
              bid.driver?.email?.toLowerCase() ??
              "";

            const reference =
              bid.job?.reference?.toLowerCase() ??
              "";

            const postcode =
              bid.job?.postcode?.toLowerCase() ??
              "";

            const address =
              bid.job?.address?.toLowerCase() ??
              "";

            const message =
              bid.message?.toLowerCase() ??
              "";

            const bidId =
              String(bid.id);

            const jobId =
              String(bid.job_id);

            const driverId =
              String(bid.driver_id);

            const customerId =
              String(
                bid.job
                  ?.customer_id ??
                  "",
              );

            return (
              driverName.includes(
                searchValue,
              ) ||
              tradingName.includes(
                searchValue,
              ) ||
              companyName.includes(
                searchValue,
              ) ||
              email.includes(
                searchValue,
              ) ||
              reference.includes(
                searchValue,
              ) ||
              postcode.includes(
                searchValue,
              ) ||
              address.includes(
                searchValue,
              ) ||
              message.includes(
                searchValue,
              ) ||
              bidId.includes(
                searchValue,
              ) ||
              jobId.includes(
                searchValue,
              ) ||
              driverId.includes(
                searchValue,
              ) ||
              customerId.includes(
                searchValue,
              )
            );
          },
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sort === "highest"
          ) {
            return (
              Number(
                b.financials
                  ?.amount ?? 0,
              ) -
              Number(
                a.financials
                  ?.amount ?? 0,
              )
            );
          }

          if (
            sort === "lowest"
          ) {
            return (
              Number(
                a.financials
                  ?.amount ?? 0,
              ) -
              Number(
                b.financials
                  ?.amount ?? 0,
              )
            );
          }

          if (
            sort === "oldest"
          ) {
            return (
              getBidTimestamp(a) -
              getBidTimestamp(b)
            );
          }

          return (
            getBidTimestamp(b) -
            getBidTimestamp(a)
          );
        },
      );
    }, [
      bids,
      filter,
      search,
      sort,
    ]);

  async function copyValue(
    value: string,
    label: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopiedValue(label);

      window.setTimeout(() => {
        setCopiedValue("");
      }, 1500);
    } catch {
      setCopiedValue("");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] text-white">
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:px-6 lg:px-8">
          <Link
            href="/admin/dashboard"
            className="shrink-0"
          >
            <span className="text-sm font-black tracking-tight sm:text-base">
              RAPID CLEAR{" "}
              <span className="text-[#79c51c]">
                SOLUTIONS
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadBids(true)
              }
              disabled={refreshing}
              className="rounded-xl border border-white/[0.10] bg-[#0a0e0a] px-3.5 py-2.5 text-xs font-black transition hover:border-[#79c51c] hover:text-[#79c51c] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <Link
              href="/admin/dashboard"
              className="hidden rounded-xl border border-white/[0.10] bg-[#0a0e0a] px-4 py-2.5 text-sm font-black text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c] sm:block"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ================================================= */}
      {/* CONTENT                                           */}
      {/* ================================================= */}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* INTRO */}

        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex text-xs font-black uppercase tracking-wider text-[#79c51c] transition hover:text-[#91db32]"
          >
            ← Back to Admin Dashboard
          </Link>

          <div className="mt-6">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#79c51c] sm:text-xs">
                RCS Marketplace
              </p>
            </div>

            <h1 className="mt-3 text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">
              Driver
              <span className="block text-[#79c51c]">
                Bids
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              Monitor every quote submitted
              through the RCS Marketplace and
              track customer decisions,
              driver payouts and RCS fees.
            </p>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
            <p className="text-sm font-bold text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* STATS                                             */}
        {/* ================================================= */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="Total Bids"
            value={stats.total}
            detail="All driver quotes"
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            detail="Awaiting customer decision"
            accent="yellow"
          />

          <StatCard
            label="Accepted"
            value={stats.accepted}
            detail={`${formatMoney(
              acceptedValue,
            )} accepted value`}
            accent="green"
          />

          <StatCard
            label="Bid Value"
            value={formatMoney(
              stats.totalValue,
            )}
            detail="Total quote value"
          />

          <StatCard
            label="RCS Fees"
            value={formatMoney(
              stats.totalPotentialFees,
            )}
            detail={`Avg bid ${formatMoney(
              averageBid,
            )}`}
            accent="green"
          />
        </section>

        {/* ================================================= */}
        {/* SEARCH / FILTERS                                  */}
        {/* ================================================= */}

        <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#080b08] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                Marketplace Activity
              </p>

              <h2 className="mt-2 text-2xl font-black uppercase">
                {filteredBids.length}{" "}
                bid
                {filteredBids.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </h2>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search driver, job, postcode..."
                className="w-full rounded-xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-[#79c51c]"
              />

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target
                      .value as SortOption,
                  )
                }
                className="rounded-xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm font-bold text-gray-300 outline-none focus:border-[#79c51c]"
              >
                <option value="newest">
                  Newest bids
                </option>

                <option value="oldest">
                  Oldest bids
                </option>

                <option value="highest">
                  Highest value
                </option>

                <option value="lowest">
                  Lowest value
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              active={filter === "all"}
              onClick={() =>
                setFilter("all")
              }
            >
              All ({stats.total})
            </FilterButton>

            <FilterButton
              active={
                filter === "pending"
              }
              onClick={() =>
                setFilter("pending")
              }
            >
              Pending ({stats.pending})
            </FilterButton>

            <FilterButton
              active={
                filter === "accepted"
              }
              onClick={() =>
                setFilter("accepted")
              }
            >
              Accepted ({stats.accepted})
            </FilterButton>

            <FilterButton
              active={
                filter === "rejected"
              }
              onClick={() =>
                setFilter("rejected")
              }
            >
              Rejected ({stats.rejected})
            </FilterButton>
          </div>
        </section>

        {/* ================================================= */}
        {/* BID LIST                                          */}
        {/* ================================================= */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
              Live Marketplace
            </p>

            <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
              Driver Quotes
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Bids refresh automatically every
              15 seconds.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-12 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />

              <p className="mt-5 text-sm font-semibold text-gray-500">
                Loading bids...
              </p>
            </div>
          ) : filteredBids.length ===
            0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.10] bg-[#050705]">
                <span className="font-black text-[#79c51c]">
                  RCS
                </span>
              </div>

              <h3 className="mt-5 text-xl font-black uppercase">
                No bids found
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Try changing the filter,
                search or sort order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBids.map(
                (bid) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    onOpen={() =>
                      setSelectedBid(
                        bid,
                      )
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>

      {/* ================================================= */}
      {/* MODAL                                             */}
      {/* ================================================= */}

      {selectedBid && (
        <BidModal
          bid={selectedBid}
          copiedValue={copiedValue}
          onCopy={copyValue}
          onClose={() =>
            setSelectedBid(null)
          }
        />
      )}
    </main>
  );
}

/* ===================================================== */
/* STAT CARD                                              */
/* ===================================================== */

function StatCard({
  label,
  value,
  detail,
  accent = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  accent?:
    | "default"
    | "green"
    | "yellow";
}) {
  const labelClass =
    accent === "green"
      ? "text-[#79c51c]"
      : accent === "yellow"
        ? "text-yellow-300"
        : "text-gray-400";

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#080b08] p-5">
      <p
        className={`text-[10px] font-black uppercase tracking-[0.18em] ${labelClass}`}
      >
        {label}
      </p>

      <p className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-600 sm:text-sm">
        {detail}
      </p>
    </div>
  );
}

/* ===================================================== */
/* FILTER BUTTON                                          */
/* ===================================================== */

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
      className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black transition sm:text-sm ${
        active
          ? "border-[#79c51c] bg-[#79c51c]/10 text-[#79c51c]"
          : "border-white/[0.10] bg-[#050705] text-gray-500 hover:border-[#79c51c]/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/* ===================================================== */
/* BID CARD                                               */
/* ===================================================== */

function BidCard({
  bid,
  onOpen,
}: {
  bid: Bid;
  onOpen: () => void;
}) {
  const driverName =
    getDriverName(
      bid.driver,
    );

  const jobReference =
    bid.job?.reference ||
    `Job #${bid.job_id}`;

  const isAccepted =
    normalise(
      bid.status,
    ) === "accepted";

  const isAssigned =
    bid.job?.assigned_bid_id ===
      bid.id ||
    bid.job?.accepted_bid_id ===
      bid.id;

  const driverApproved =
    Boolean(
      bid.driver?.approved,
    ) &&
    normalise(
      bid.driver
        ?.application_status,
    ) === "approved";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-white/[0.08] bg-[#080b08] p-4 text-left transition hover:border-[#79c51c]/30 sm:p-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT */}

        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-xs font-black text-[#79c51c] sm:h-14 sm:w-14">
            {getDriverInitials(
              bid.driver,
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">
                Bid #{bid.id}
              </span>

              <span
                className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${getStatusClasses(
                  bid.status,
                )}`}
              >
                {formatStatus(
                  bid.status,
                )}
              </span>

              {isAssigned && (
                <span className="rounded-full border border-[#79c51c]/30 bg-[#79c51c]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#79c51c]">
                  Assigned
                </span>
              )}

              {driverApproved && (
                <span className="rounded-full border border-white/[0.10] bg-[#050705] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-500">
                  Verified Driver
                </span>
              )}
            </div>

            <h3 className="mt-3 truncate text-lg font-black text-white sm:text-xl">
              {jobReference}
            </h3>

            <p className="mt-1 text-sm font-bold text-gray-300">
              {driverName}
            </p>

            <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 sm:text-sm">
              <p>
                Job:{" "}
                <span className="font-bold text-gray-400">
                  {bid.job?.job_type ||
                    "Waste removal"}
                </span>
              </p>

              <p>
                Postcode:{" "}
                <span className="font-bold text-gray-400">
                  {bid.job?.postcode ||
                    "—"}
                </span>
              </p>

              <p>
                Submitted:{" "}
                <span className="font-bold text-gray-400">
                  {formatDate(
                    bid.created_at,
                  )}
                </span>
              </p>

              <p>
                Job status:{" "}
                <span
                  className={`font-bold ${getJobStatusClasses(
                    bid.job
                      ?.status,
                  )}`}
                >
                  {formatStatus(
                    bid.job
                      ?.status,
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* FINANCIAL */}

        <div className="grid shrink-0 grid-cols-2 gap-5 border-t border-white/[0.08] pt-4 lg:min-w-[330px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-600 sm:text-[10px]">
              Customer Price
            </p>

            <p className="mt-1 text-xl font-black text-white sm:text-2xl">
              {formatMoney(
                bid.financials
                  .amount,
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-600 sm:text-[10px]">
              Driver Payout
            </p>

            <p className="mt-1 text-xl font-black text-[#79c51c] sm:text-2xl">
              {formatMoney(
                bid.financials
                  .driverPayout,
              )}
            </p>
          </div>

          <div className="col-span-2 flex items-center justify-between border-t border-white/[0.07] pt-3">
            <span className="text-xs text-gray-600">
              RCS fee
            </span>

            <span className="text-xs font-black text-gray-400">
              {formatMoney(
                bid.financials
                  .platformFee,
              )}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ===================================================== */
/* BID MODAL                                              */
/* ===================================================== */

function BidModal({
  bid,
  copiedValue,
  onCopy,
  onClose,
}: {
  bid: Bid;
  copiedValue: string;
  onCopy: (
    value: string,
    label: string,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const driverName =
    getDriverName(
      bid.driver,
    );

  const jobReference =
    bid.job?.reference ||
    `Job #${bid.job_id}`;

  const assigned =
    bid.job?.assigned_bid_id ===
      bid.id ||
    bid.job?.accepted_bid_id ===
      bid.id;

  const driverApproved =
    Boolean(
      bid.driver?.approved,
    ) &&
    normalise(
      bid.driver
        ?.application_status,
    ) === "approved";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="my-2 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/[0.10] bg-[#080b08] shadow-2xl sm:my-8">
        {/* MODAL HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#050705]/95 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
              {getDriverInitials(
                bid.driver,
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                Bid Details
              </p>

              <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">
                Bid #{bid.id}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close bid"
            className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-xl text-gray-500 transition hover:border-[#79c51c] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="max-h-[86vh] overflow-y-auto p-4 sm:p-7">
          {/* STATUS */}

          <section className="rounded-2xl border border-white/[0.08] bg-[#050705] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
                  Job
                </p>

                <p className="mt-2 text-xl font-black">
                  {jobReference}
                </p>
              </div>

              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-black uppercase ${getStatusClasses(
                  bid.status,
                )}`}
              >
                {formatStatus(
                  bid.status,
                )}
              </span>
            </div>

            {assigned && (
              <div className="mt-4 rounded-xl border border-[#79c51c]/30 bg-[#79c51c]/10 px-4 py-3 text-sm font-bold text-[#79c51c]">
                This bid is the accepted or
                assigned bid for this job.
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail
                label="Job type"
                value={
                  bid.job?.job_type ||
                  "—"
                }
              />

              <Detail
                label="Load size"
                value={
                  bid.job?.load_size ||
                  "—"
                }
              />

              <Detail
                label="Postcode"
                value={
                  bid.job?.postcode ||
                  "—"
                }
              />

              <Detail
                label="Job status"
                value={formatStatus(
                  bid.job?.status,
                )}
                valueClass={getJobStatusClasses(
                  bid.job?.status,
                )}
              />

              <Detail
                label="Journey status"
                value={formatStatus(
                  bid.job
                    ?.journey_status,
                )}
                valueClass={getJobStatusClasses(
                  bid.job
                    ?.journey_status,
                )}
              />

              <Detail
                label="Payment status"
                value={formatStatus(
                  bid.job
                    ?.payment_status,
                )}
                valueClass={getJobStatusClasses(
                  bid.job
                    ?.payment_status,
                )}
              />
            </div>

            {bid.job?.address && (
              <div className="mt-5 border-t border-white/[0.08] pt-5">
                <Detail
                  label="Collection address"
                  value={bid.job.address}
                />
              </div>
            )}
          </section>

          {/* DRIVER */}

          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#050705] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
                  Driver
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black">
                    {driverName}
                  </h3>

                  {driverApproved ? (
                    <span className="rounded-full border border-[#79c51c]/30 bg-[#79c51c]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#79c51c]">
                      Approved
                    </span>
                  ) : (
                    <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-300">
                      Check Driver
                    </span>
                  )}
                </div>
              </div>

              <Link
                href="/admin/drivers"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                Driver Management →
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Full name"
                value={
                  bid.driver
                    ?.full_name ||
                  "—"
                }
              />

              <Detail
                label="Trading name"
                value={
                  bid.driver
                    ?.trading_name ||
                  "—"
                }
              />

              <Detail
                label="Company"
                value={
                  bid.driver
                    ?.company_name ||
                  "—"
                }
              />

              <Detail
                label="Vehicle"
                value={
                  bid.driver
                    ?.vehicle_type ||
                  "—"
                }
              />

              <Detail
                label="Phone"
                value={
                  bid.driver?.phone ||
                  "—"
                }
              />

              <Detail
                label="Email"
                value={
                  bid.driver?.email ||
                  "—"
                }
              />

              <Detail
                label="Approved"
                value={
                  bid.driver
                    ?.approved
                    ? "Yes"
                    : "No"
                }
              />

              <Detail
                label="Application status"
                value={formatStatus(
                  bid.driver
                    ?.application_status,
                )}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {bid.driver?.email ? (
                <a
                  href={`mailto:${bid.driver.email}`}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c]"
                >
                  Email Driver →
                </a>
              ) : (
                <div className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#080b08] text-xs font-black uppercase tracking-wider text-gray-700">
                  No Email
                </div>
              )}

              {bid.driver?.phone ? (
                <a
                  href={`tel:${bid.driver.phone}`}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c]"
                >
                  Call Driver →
                </a>
              ) : (
                <div className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#080b08] text-xs font-black uppercase tracking-wider text-gray-700">
                  No Phone
                </div>
              )}
            </div>
          </section>

          {/* FINANCIAL */}

          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#050705] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
              Financial Breakdown
            </p>

            <div className="mt-5 space-y-3">
              <MoneyRow
                label="Customer price"
                value={
                  bid.financials
                    .amount
                }
              />

              <MoneyRow
                label={`RCS fee (${bid.financials.platformFeePercent}%)`}
                value={
                  bid.financials
                    .platformFee
                }
              />

              <div className="border-t border-white/[0.08] pt-3">
                <MoneyRow
                  label="Driver payout"
                  value={
                    bid.financials
                      .driverPayout
                  }
                  highlight
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <FinancialBox
                label="Bid amount"
                value={formatMoney(
                  bid.financials
                    .amount,
                )}
              />

              <FinancialBox
                label="RCS fee"
                value={formatMoney(
                  bid.financials
                    .platformFee,
                )}
              />

              <FinancialBox
                label="Driver payout"
                value={formatMoney(
                  bid.financials
                    .driverPayout,
                )}
                green
              />
            </div>
          </section>

          {/* BID INFORMATION */}

          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#050705] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
              Bid Information
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail
                label="Bid ID"
                value={String(
                  bid.id,
                )}
              />

              <Detail
                label="Job ID"
                value={String(
                  bid.job_id,
                )}
              />

              <Detail
                label="Driver ID"
                value={
                  bid.driver_id
                }
              />

              <Detail
                label="Customer ID"
                value={
                  bid.job
                    ?.customer_id ||
                  "—"
                }
              />

              <Detail
                label="Submitted"
                value={formatDate(
                  bid.created_at,
                )}
              />

              <Detail
                label="Updated"
                value={formatDate(
                  bid.updated_at,
                )}
              />

              <Detail
                label="Accepted"
                value={formatDate(
                  bid.accepted_at,
                )}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <CopyButton
                label="Copy Bid ID"
                value={String(
                  bid.id,
                )}
                copied={
                  copiedValue ===
                  "bid"
                }
                onClick={() =>
                  void onCopy(
                    String(
                      bid.id,
                    ),
                    "bid",
                  )
                }
              />

              <CopyButton
                label="Copy Job ID"
                value={String(
                  bid.job_id,
                )}
                copied={
                  copiedValue ===
                  "job"
                }
                onClick={() =>
                  void onCopy(
                    String(
                      bid.job_id,
                    ),
                    "job",
                  )
                }
              />

              <CopyButton
                label="Copy Driver ID"
                value={
                  bid.driver_id
                }
                copied={
                  copiedValue ===
                  "driver"
                }
                onClick={() =>
                  void onCopy(
                    bid.driver_id,
                    "driver",
                  )
                }
              />
            </div>

            {bid.message && (
              <div className="mt-5 border-t border-white/[0.08] pt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-700">
                  Driver Message
                </p>

                <div className="mt-2 rounded-xl border border-white/[0.08] bg-[#080b08] p-4 text-sm leading-7 text-gray-400">
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

/* ===================================================== */
/* COPY BUTTON                                            */
/* ===================================================== */

function CopyButton({
  label,
  value,
  copied,
  onClick,
}: {
  label: string;
  value: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={value}
      className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-400 transition hover:border-[#79c51c] hover:text-[#79c51c]"
    >
      {copied
        ? "Copied"
        : label}
    </button>
  );
}

/* ===================================================== */
/* FINANCIAL BOX                                          */
/* ===================================================== */

function FinancialBox({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#080b08] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${
          green
            ? "text-[#79c51c]"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* MONEY ROW                                              */
/* ===================================================== */

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
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span
        className={`text-base font-black ${
          highlight
            ? "text-[#79c51c]"
            : "text-white"
        }`}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}

/* ===================================================== */
/* DETAIL                                                 */
/* ===================================================== */

function Detail({
  label,
  value,
  valueClass = "text-gray-300",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-sm font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}