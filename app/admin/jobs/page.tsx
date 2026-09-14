"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number | null;
  message: string | null;
  status: string | null;
  created_at: string;
  accepted_at: string | null;
  platform_fee_percent: number | null;
  platform_fee: number | null;
  driver_payout: number | null;
  driver: Driver | null;
};

type Job = {
  id: number;
  reference: string;
  customer_id: string;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  description: string | null;
  floor: string | null;
  stairs: boolean | null;
  access_notes: string | null;
  preferred_date: string | null;
  preferred_time: number | string | null;
  status: string | null;
  accepted_bid_id: number | null;
  created_at: string;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  journey_status: string | null;
  payment_status: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  winningBid: Bid | null;
  assignedDriver: Driver | null;
  bidCount: number;
};

type Stats = {
  total: number;
  open: number;
  assigned: number;
  completed: number;
  paid: number;
  totalValue: number;
};

type Filter =
  | "all"
  | "open"
  | "assigned"
  | "completed"
  | "paid";

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

export default function AdminJobsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [jobs, setJobs] = useState<Job[]>([]);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    open: 0,
    assigned: 0,
    completed: 0,
    paid: 0,
    totalValue: 0,
  });

  const [selectedJob, setSelectedJob] =
    useState<Job | null>(null);

  const [filter, setFilter] =
    useState<Filter>("all");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadJobs = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setRefreshing(true);
        }

        setErrorMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error(
            "Your admin session has expired. Please log in again.",
          );
        }

        const response = await fetch(
          "/api/admin/jobs",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Failed to load jobs.",
          );
        }

        setJobs(data.jobs ?? []);

        setStats(
          data.stats ?? {
            total: 0,
            open: 0,
            assigned: 0,
            completed: 0,
            paid: 0,
            totalValue: 0,
          },
        );
      } catch (error) {
        console.error(
          "Admin jobs loading error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load jobs.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadJobs();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return jobs.filter((job) => {
      const status = normalise(job.status);

      const journey = normalise(
        job.journey_status,
      );

      const matchesFilter =
        filter === "all" ||
        (filter === "open" &&
          ["open", "bidding"].includes(status)) ||
        (filter === "assigned" &&
          (status === "assigned" ||
            journey === "assigned")) ||
        (filter === "completed" &&
          (status === "completed" ||
            journey === "completed")) ||
        (filter === "paid" &&
          normalise(job.payment_status) === "paid");

      if (!matchesFilter) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const values = [
        job.reference,
        job.customer_id,
        job.job_type,
        job.postcode,
        job.address,
        job.load_size,
        job.description,
        job.assigned_driver_id,
        String(job.id),
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(searchValue),
      );
    });
  }, [jobs, filter, search]);

  return (
    <main
      className="min-h-screen overflow-x-hidden text-white"
      style={{ background: BG }}
    >
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor:
            "rgba(255,255,255,0.08)",
          background:
            "rgba(5,7,5,0.96)",
        }}
      >
        <div
          className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8"
          style={{
            paddingTop:
              "max(0.75rem, env(safe-area-inset-top))",
          }}
        >
          {/* LOGO */}
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-9 w-auto object-contain sm:h-12"
              priority
            />

            <div className="hidden border-l border-white/10 pl-3 sm:block">
              <p className="text-sm font-black">
                Admin
              </p>

              <p className="text-xs text-white/35">
                Job Management
              </p>
            </div>
          </Link>

          {/* HEADER ACTIONS */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadJobs(true)
              }
              disabled={refreshing}
              className="min-h-[44px] rounded-xl border px-3.5 text-xs font-black transition sm:px-4 sm:text-sm"
              style={{
                borderColor:
                  "rgba(255,255,255,0.12)",
                background: CARD,
                color:
                  "rgba(255,255,255,0.78)",
              }}
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <Link
              href="/admin/dashboard"
              className="hidden min-h-[44px] items-center rounded-xl border px-4 text-sm font-black transition sm:flex"
              style={{
                borderColor:
                  "rgba(255,255,255,0.12)",
                background: CARD,
                color:
                  "rgba(255,255,255,0.78)",
              }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MOBILE BACK BUTTON */}
      {/* ========================================================= */}

      <div
        className="border-b px-4 py-3 sm:hidden"
        style={{
          borderColor:
            "rgba(255,255,255,0.07)",
          background: SECTION,
        }}
      >
        <Link
          href="/admin/dashboard"
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl border px-4 text-sm font-black transition active:scale-[0.99]"
          style={{
            borderColor:
              "rgba(255,255,255,0.10)",
            background: CARD,
            color:
              "rgba(255,255,255,0.80)",
          }}
        >
          ← BACK TO DASHBOARD
        </Link>
      </div>

      {/* ========================================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================================= */}

      <div
        className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8"
        style={{
          paddingBottom:
            "calc(2rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* ======================================================= */}
        {/* HERO */}
        {/* ======================================================= */}

        <section className="mb-6 sm:mb-8">
          <p
            className="text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs"
            style={{ color: GREEN }}
          >
            RCS Marketplace
          </p>

          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                Job Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                Manage marketplace jobs, drivers,
                bids, assignments and payments from
                one place.
              </p>
            </div>

            <div
              className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold"
              style={{
                borderColor: `${GREEN}25`,
                background: `${GREEN}0d`,
                color: GREEN,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: GREEN,
                  boxShadow: `0 0 10px ${GREEN}`,
                }}
              />

              Live marketplace
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* ERROR */}
        {/* ======================================================= */}

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-200 sm:p-5">
            {errorMessage}
          </div>
        )}

        {/* ======================================================= */}
        {/* STATS */}
        {/* ======================================================= */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            title="Total Jobs"
            value={stats.total}
            description="All marketplace jobs"
            accent
          />

          <StatCard
            title="Open"
            value={stats.open}
            description="Waiting for drivers"
          />

          <StatCard
            title="Assigned"
            value={stats.assigned}
            description="Driver assigned"
          />

          <StatCard
            title="Completed"
            value={stats.completed}
            description="Finished jobs"
          />

          <StatCard
            title="Paid"
            value={stats.paid}
            description="Payments recorded"
          />
        </section>

        {/* ======================================================= */}
        {/* SEARCH + VALUE */}
        {/* ======================================================= */}

        <section
          className="mt-4 rounded-2xl border p-4 sm:mt-5 sm:rounded-3xl sm:p-6"
          style={{
            borderColor:
              "rgba(255,255,255,0.08)",
            background: CARD,
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.16em]"
                style={{ color: GREEN }}
              >
                Accepted / Assigned Value
              </p>

              <p className="mt-2 text-2xl font-black sm:text-3xl">
                £{formatMoney(stats.totalValue)}
              </p>
            </div>

            <div className="w-full lg:max-w-lg">
              <label className="mb-2 block text-xs font-bold text-white/40">
                Search jobs
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Reference, customer, postcode, job ID..."
                className="min-h-[48px] w-full rounded-xl border px-4 py-3 text-base text-white outline-none transition placeholder:text-white/20 sm:rounded-2xl sm:text-sm"
                style={{
                  borderColor:
                    "rgba(255,255,255,0.10)",
                  background: "#070907",
                }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor =
                    GREEN;
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor =
                    "rgba(255,255,255,0.10)";
                }}
              />
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* FILTERS */}
        {/* ======================================================= */}

        <section className="mt-4">
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            style={{
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All ({stats.total})
            </FilterButton>

            <FilterButton
              active={filter === "open"}
              onClick={() => setFilter("open")}
            >
              Open ({stats.open})
            </FilterButton>

            <FilterButton
              active={filter === "assigned"}
              onClick={() =>
                setFilter("assigned")
              }
            >
              Assigned ({stats.assigned})
            </FilterButton>

            <FilterButton
              active={filter === "completed"}
              onClick={() =>
                setFilter("completed")
              }
            >
              Completed ({stats.completed})
            </FilterButton>

            <FilterButton
              active={filter === "paid"}
              onClick={() => setFilter("paid")}
            >
              Paid ({stats.paid})
            </FilterButton>
          </div>
        </section>

        {/* ======================================================= */}
        {/* JOBS */}
        {/* ======================================================= */}

        <section className="mt-6 sm:mt-7">
          <div className="mb-4">
            <h2 className="text-xl font-black sm:text-2xl">
              Marketplace Jobs
            </h2>

            <p className="mt-1 text-xs text-white/35 sm:text-sm">
              Showing {filteredJobs.length} of{" "}
              {jobs.length} jobs
            </p>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onView={() =>
                    setSelectedJob(job)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================= */}
      {/* JOB MODAL */}
      {/* ========================================================= */}

      {selectedJob && (
        <JobModal
          job={selectedJob}
          onClose={() =>
            setSelectedJob(null)
          }
        />
      )}
    </main>
  );
}

function JobCard({
  job,
  onView,
}: {
  job: Job;
  onView: () => void;
}) {
  const driverName =
    job.assignedDriver?.trading_name ||
    job.assignedDriver?.company_name ||
    job.assignedDriver?.full_name ||
    null;

  const amount =
    job.winningBid?.amount !== null &&
    job.winningBid?.amount !== undefined
      ? `£${formatMoney(
          job.winningBid.amount,
        )}`
      : "—";

  return (
    <div
      className="overflow-hidden rounded-2xl border transition sm:rounded-3xl hover:border-white/15"
      style={{
        borderColor:
          "rgba(255,255,255,0.08)",
        background: CARD,
      }}
    >
      <div className="p-4 sm:p-6">
        {/* TOP */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-all text-lg font-black sm:text-xl">
                {job.reference ||
                  `Job #${job.id}`}
              </h3>

              <StatusBadge
                status={job.status}
              />

              <JourneyBadge
                status={job.journey_status}
              />
            </div>

            <p className="mt-2 text-sm font-bold text-white/75">
              {job.job_type ||
                "Waste removal"}
            </p>

            <p className="mt-1 break-words text-sm leading-5 text-white/35">
              {job.postcode ||
                "No postcode"}

              {job.address
                ? ` • ${job.address}`
                : ""}
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 lg:min-w-[150px] lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">
              Accepted Value
            </p>

            <p
              className="mt-1 text-2xl font-black"
              style={{ color: GREEN }}
            >
              {amount}
            </p>
          </div>
        </div>

        {/* DETAILS */}
        <div
          className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4"
          style={{
            borderColor:
              "rgba(255,255,255,0.07)",
          }}
        >
          <JobMeta
            label="Collection"
            value={formatDate(
              job.preferred_date,
            )}
          />

          <JobMeta
            label="Time"
            value={formatTime(
              job.preferred_time,
            )}
          />

          <JobMeta
            label="Load"
            value={
              job.load_size ||
              "Not specified"
            }
          />

          <JobMeta
            label="Bids"
            value={String(job.bidCount)}
          />
        </div>

        {/* BOTTOM */}
        <div
          className="mt-5 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor:
              "rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <PaymentStatus
              status={job.payment_status}
            />

            {driverName ? (
              <span className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/55">
                Driver: {driverName}
              </span>
            ) : (
              <span className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1.5 text-xs font-bold text-yellow-200/70">
                No driver assigned
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onView}
            className="min-h-[50px] w-full rounded-xl px-5 text-sm font-black transition active:scale-[0.99] sm:min-h-[46px] sm:w-auto sm:rounded-2xl"
            style={{
              background: GREEN,
              color: BG,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background =
                GREEN_HOVER;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background =
                GREEN;
            }}
          >
            VIEW JOB
          </button>
        </div>
      </div>
    </div>
  );
}

function JobMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/25 sm:text-[10px]">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-white/70">
        {value}
      </p>
    </div>
  );
}

function JobModal({
  job,
  onClose,
}: {
  job: Job;
  onClose: () => void;
}) {
  const driverName =
    job.assignedDriver?.trading_name ||
    job.assignedDriver?.company_name ||
    job.assignedDriver?.full_name ||
    "No driver assigned";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="min-h-screen w-full overflow-hidden border shadow-2xl sm:my-8 sm:min-h-0 sm:max-w-5xl sm:rounded-3xl"
        style={{
          borderColor:
            "rgba(255,255,255,0.10)",
          background: CARD,
        }}
      >
        {/* MODAL HEADER */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between border-b p-4 sm:static sm:p-6"
          style={{
            borderColor:
              "rgba(255,255,255,0.07)",
            background: SECTION,
            paddingTop:
              "max(1rem, env(safe-area-inset-top))",
          }}
        >
          <div className="min-w-0 pr-3">
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs"
              style={{ color: GREEN }}
            >
              Marketplace Job
            </p>

            <h2 className="mt-1 break-all text-xl font-black sm:text-2xl">
              {job.reference}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-2xl transition active:scale-95"
            style={{
              borderColor:
                "rgba(255,255,255,0.10)",
              color:
                "rgba(255,255,255,0.65)",
              background: CARD,
            }}
            aria-label="Close job"
          >
            ×
          </button>
        </div>

        <div
          className="max-h-[calc(100vh-76px)] overflow-y-auto p-4 sm:max-h-[78vh] sm:p-7"
          style={{
            paddingBottom:
              "calc(2rem + env(safe-area-inset-bottom))",
          }}
        >
          {/* STATUS */}
          <section
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              borderColor:
                "rgba(255,255,255,0.08)",
              background: SECTION,
            }}
          >
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                label="Job status"
                value={
                  <StatusBadge
                    status={job.status}
                  />
                }
              />

              <Info
                label="Journey status"
                value={
                  <JourneyBadge
                    status={
                      job.journey_status
                    }
                  />
                }
              />

              <Info
                label="Payment status"
                value={
                  <PaymentStatus
                    status={
                      job.payment_status
                    }
                  />
                }
              />

              <Info
                label="Created"
                value={formatDateTime(
                  job.created_at,
                )}
              />
            </div>
          </section>

          {/* COLLECTION */}
          <DetailSection title="Collection Details">
            <Detail
              label="Reference"
              value={job.reference}
            />

            <Detail
              label="Job ID"
              value={job.id}
            />

            <Detail
              label="Job type"
              value={job.job_type}
            />

            <Detail
              label="Load size"
              value={job.load_size}
            />

            <Detail
              label="Postcode"
              value={job.postcode}
            />

            <Detail
              label="Address"
              value={job.address}
            />

            <Detail
              label="Preferred date"
              value={formatDate(
                job.preferred_date,
              )}
            />

            <Detail
              label="Preferred time"
              value={formatTime(
                job.preferred_time,
              )}
            />

            <Detail
              label="Floor"
              value={job.floor}
            />

            <Detail
              label="Stairs"
              value={
                job.stairs === null
                  ? null
                  : job.stairs
                    ? "Yes"
                    : "No"
              }
            />

            <Detail
              label="Access notes"
              value={job.access_notes}
            />
          </DetailSection>

          {/* DESCRIPTION */}
          <section className="mt-7 sm:mt-8">
            <h3 className="text-lg font-black">
              Description
            </h3>

            <div
              className="mt-3 rounded-2xl border p-4 sm:mt-4 sm:p-5"
              style={{
                borderColor:
                  "rgba(255,255,255,0.08)",
                background: SECTION,
              }}
            >
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/65">
                {job.description ||
                  "No description provided."}
              </p>
            </div>
          </section>

          {/* CUSTOMER */}
          <DetailSection title="Customer">
            <Detail
              label="Customer ID"
              value={job.customer_id}
            />
          </DetailSection>

          {/* DRIVER */}
          <section className="mt-7 sm:mt-8">
            <h3 className="text-lg font-black">
              Driver Assignment
            </h3>

            <div
              className="mt-3 rounded-2xl border p-4 sm:mt-4 sm:p-5"
              style={{
                borderColor:
                  "rgba(255,255,255,0.08)",
                background: SECTION,
              }}
            >
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                <Detail
                  label="Driver"
                  value={driverName}
                />

                <Detail
                  label="Driver ID"
                  value={
                    job.assigned_driver_id
                  }
                />

                <Detail
                  label="Assigned bid ID"
                  value={
                    job.assigned_bid_id
                  }
                />

                <Detail
                  label="Accepted bid ID"
                  value={
                    job.accepted_bid_id
                  }
                />
              </div>

              {job.assignedDriver && (
                <div
                  className="mt-5 grid grid-cols-2 gap-5 border-t pt-5"
                  style={{
                    borderColor:
                      "rgba(255,255,255,0.07)",
                  }}
                >
                  <Detail
                    label="Driver name"
                    value={
                      job.assignedDriver
                        .full_name
                    }
                  />

                  <Detail
                    label="Trading name"
                    value={
                      job.assignedDriver
                        .trading_name
                    }
                  />

                  <Detail
                    label="Phone"
                    value={
                      job.assignedDriver
                        .phone
                    }
                  />

                  <Detail
                    label="Email"
                    value={
                      job.assignedDriver
                        .email
                    }
                  />
                </div>
              )}
            </div>
          </section>

          {/* ACCEPTED BID */}
          <section className="mt-7 sm:mt-8">
            <h3 className="text-lg font-black">
              Accepted Bid
            </h3>

            <div
              className="mt-3 rounded-2xl border p-4 sm:mt-4 sm:p-5"
              style={{
                borderColor:
                  "rgba(255,255,255,0.08)",
                background: SECTION,
              }}
            >
              {job.winningBid ? (
                <>
                  <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                    <Detail
                      label="Bid amount"
                      value={
                        job.winningBid
                          .amount !== null
                          ? `£${formatMoney(
                              job.winningBid
                                .amount,
                            )}`
                          : null
                      }
                    />

                    <Detail
                      label="Driver payout"
                      value={
                        job.winningBid
                          .driver_payout !==
                        null
                          ? `£${formatMoney(
                              job.winningBid
                                .driver_payout,
                            )}`
                          : null
                      }
                    />

                    <Detail
                      label="RCS fee"
                      value={
                        job.winningBid
                          .platform_fee !==
                        null
                          ? `£${formatMoney(
                              job.winningBid
                                .platform_fee,
                            )}`
                          : null
                      }
                    />

                    <Detail
                      label="RCS fee %"
                      value={
                        job.winningBid
                          .platform_fee_percent !==
                        null
                          ? `${job.winningBid.platform_fee_percent}%`
                          : null
                      }
                    />

                    <Detail
                      label="Bid status"
                      value={
                        job.winningBid.status
                      }
                    />

                    <Detail
                      label="Bid created"
                      value={formatDateTime(
                        job.winningBid
                          .created_at,
                      )}
                    />

                    <Detail
                      label="Accepted"
                      value={
                        job.winningBid
                          .accepted_at
                          ? formatDateTime(
                              job.winningBid
                                .accepted_at,
                            )
                          : "Not recorded"
                      }
                    />

                    <Detail
                      label="Driver ID"
                      value={
                        job.winningBid
                          .driver_id
                      }
                    />
                  </div>

                  <div
                    className="mt-5 border-t pt-5"
                    style={{
                      borderColor:
                        "rgba(255,255,255,0.07)",
                    }}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/25">
                      Driver message
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/65">
                      {job.winningBid
                        .message ||
                        "No message provided."}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/35">
                  No accepted bid recorded.
                </p>
              )}
            </div>
          </section>

          {/* STRIPE */}
          <section className="mt-7 sm:mt-8">
            <h3 className="text-lg font-black">
              Stripe Payment
            </h3>

            <div
              className="mt-3 grid gap-5 rounded-2xl border p-4 sm:mt-4 sm:grid-cols-2 sm:p-5"
              style={{
                borderColor:
                  "rgba(255,255,255,0.08)",
                background: SECTION,
              }}
            >
              <Detail
                label="Payment status"
                value={job.payment_status}
              />

              <Detail
                label="Checkout session"
                value={
                  job.stripe_checkout_session_id
                }
              />

              <Detail
                label="Payment intent"
                value={
                  job.stripe_payment_intent_id
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  accent = false,
}: {
  title: string;
  value: number;
  description: string;
  accent?: boolean;
}) {
  return (
    <div
      className="min-w-0 rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: accent
          ? `${GREEN}25`
          : "rgba(255,255,255,0.08)",
        background: CARD,
      }}
    >
      <p
        className="truncate text-[9px] font-black uppercase tracking-[0.14em] sm:text-[10px]"
        style={{
          color: accent
            ? GREEN
            : "rgba(255,255,255,0.30)",
        }}
      >
        {title}
      </p>

      <p className="mt-2 text-2xl font-black sm:mt-3 sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] leading-4 text-white/30 sm:text-xs">
        {description}
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
      className="min-h-[44px] shrink-0 rounded-xl border px-4 text-xs font-black transition active:scale-[0.98] sm:text-sm"
      style={{
        borderColor: active
          ? `${GREEN}60`
          : "rgba(255,255,255,0.10)",
        background: active
          ? `${GREEN}12`
          : CARD,
        color: active
          ? GREEN
          : "rgba(255,255,255,0.50)",
      }}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | string
    | null
    | undefined;
}) {
  const value =
    normalise(status) || "unknown";

  let background =
    "rgba(255,255,255,0.05)";
  let color =
    "rgba(255,255,255,0.55)";
  let border =
    "rgba(255,255,255,0.10)";

  if (
    value === "open" ||
    value === "bidding"
  ) {
    background =
      "rgba(234,179,8,0.10)";
    color = "#fde68a";
    border =
      "rgba(234,179,8,0.25)";
  }

  if (value === "assigned") {
    background =
      "rgba(59,130,246,0.10)";
    color = "#93c5fd";
    border =
      "rgba(59,130,246,0.25)";
  }

  if (value === "completed") {
    background = `${GREEN}12`;
    color = GREEN;
    border = `${GREEN}35`;
  }

  if (
    value === "cancelled" ||
    value === "rejected"
  ) {
    background =
      "rgba(239,68,68,0.10)";
    color = "#fca5a5";
    border =
      "rgba(239,68,68,0.25)";
  }

  return (
    <span
      className="inline-flex max-w-full rounded-full border px-2.5 py-1 text-[9px] font-black uppercase sm:px-3 sm:text-[10px]"
      style={{
        background,
        color,
        borderColor: border,
      }}
    >
      {formatStatus(value)}
    </span>
  );
}

function JourneyBadge({
  status,
}: {
  status:
    | string
    | null
    | undefined;
}) {
  const value =
    normalise(status) || "not started";

  let background =
    "rgba(255,255,255,0.05)";
  let color =
    "rgba(255,255,255,0.45)";
  let border =
    "rgba(255,255,255,0.08)";

  if (value === "assigned") {
    background =
      "rgba(59,130,246,0.10)";
    color = "#93c5fd";
    border =
      "rgba(59,130,246,0.25)";
  }

  if (value === "on_the_way") {
    background =
      "rgba(234,179,8,0.10)";
    color = "#fde68a";
    border =
      "rgba(234,179,8,0.25)";
  }

  if (
    value === "in_progress" ||
    value === "at_location"
  ) {
    background =
      "rgba(168,85,247,0.10)";
    color = "#d8b4fe";
    border =
      "rgba(168,85,247,0.25)";
  }

  if (value === "completed") {
    background = `${GREEN}12`;
    color = GREEN;
    border = `${GREEN}35`;
  }

  return (
    <span
      className="inline-flex max-w-full rounded-full border px-2.5 py-1 text-[9px] font-black uppercase sm:px-3 sm:text-[10px]"
      style={{
        background,
        color,
        borderColor: border,
      }}
    >
      {formatStatus(value)}
    </span>
  );
}

function PaymentStatus({
  status,
}: {
  status:
    | string
    | null
    | undefined;
}) {
  const value =
    normalise(status) || "unknown";

  const paid = value === "paid";

  return (
    <span
      className="inline-flex max-w-full rounded-full border px-2.5 py-1 text-[9px] font-black uppercase sm:px-3 sm:text-[10px]"
      style={{
        background: paid
          ? `${GREEN}12`
          : "rgba(234,179,8,0.10)",
        color: paid
          ? GREEN
          : "#fde68a",
        borderColor: paid
          ? `${GREEN}35`
          : "rgba(234,179,8,0.25)",
      }}
    >
      {formatStatus(value)}
    </span>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25 sm:text-[10px]">
        {label}
      </p>

      <div className="mt-2 min-w-0">
        {value}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 sm:mt-8">
      <h3 className="text-lg font-black">
        {title}
      </h3>

      <div
        className="mt-3 grid grid-cols-2 gap-5 rounded-2xl border p-4 sm:mt-4 sm:grid-cols-2 sm:p-5"
        style={{
          borderColor:
            "rgba(255,255,255,0.08)",
          background: SECTION,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/25 sm:text-[10px]">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold leading-5 text-white/65">
        {value === null ||
        value === undefined ||
        value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="rounded-2xl border p-10 text-center sm:rounded-3xl sm:p-12"
      style={{
        borderColor:
          "rgba(255,255,255,0.08)",
        background: CARD,
      }}
    >
      <div
        className="mx-auto h-9 w-9 animate-spin rounded-full border-4"
        style={{
          borderColor:
            "rgba(255,255,255,0.08)",
          borderTopColor: GREEN,
        }}
      />

      <p className="mt-4 text-sm font-bold text-white/45">
        Loading jobs...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-2xl border p-10 text-center sm:rounded-3xl sm:p-12"
      style={{
        borderColor:
          "rgba(255,255,255,0.08)",
        background: CARD,
      }}
    >
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black"
        style={{
          background: `${GREEN}12`,
          color: GREEN,
        }}
      >
        ✓
      </div>

      <h3 className="mt-4 text-xl font-black">
        No jobs found
      </h3>

      <p className="mt-2 text-sm text-white/35">
        Try changing your filter or search.
      </p>
    </div>
  );
}

function normalise(
  value:
    | string
    | null
    | undefined,
) {
  return (
    value?.trim().toLowerCase() || ""
  );
}

function formatStatus(
  value:
    | string
    | null
    | undefined,
) {
  const safe =
    normalise(value) || "Unknown";

  return safe
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatMoney(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "0.00";
  }

  return Number(value).toFixed(2);
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTime(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatTime(
  value:
    | number
    | string
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not specified";
  }

  const numeric = Number(value);

  if (numeric === 8) {
    return "Morning";
  }

  if (numeric === 13) {
    return "Afternoon";
  }

  if (numeric === 18) {
    return "Evening";
  }

  if (
    numeric >= 0 &&
    numeric <= 23
  ) {
    return `${String(numeric).padStart(
      2,
      "0",
    )}:00`;
  }

  return String(value);
}