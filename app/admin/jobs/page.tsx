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

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
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

        const response = await fetch("/api/admin/jobs", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

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
        console.error("Admin jobs loading error:", error);

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
    const searchValue = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const status = normalise(job.status);
      const journey = normalise(job.journey_status);

      const matchesFilter =
        filter === "all" ||
        (filter === "open" &&
          ["open", "bidding"].includes(status)) ||
        (filter === "assigned" &&
          (status === "assigned" || journey === "assigned")) ||
        (filter === "completed" &&
          (status === "completed" || journey === "completed")) ||
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
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="border-b border-[#17382b] bg-[#081710]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/admin/dashboard"
            className="flex items-center"
          >
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadJobs(true)}
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
            RCS Marketplace
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Job Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            View and manage every marketplace job,
            assignment and payment.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Jobs"
            value={stats.total}
            description="All marketplace jobs"
          />

          <StatCard
            title="Open / Bidding"
            value={stats.open}
            description="Waiting for a driver"
          />

          <StatCard
            title="Assigned"
            value={stats.assigned}
            description="Jobs with a driver"
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

        <section className="mt-5 rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
                Accepted / Assigned Value
              </p>

              <p className="mt-2 text-3xl font-black">
                £{formatMoney(stats.totalValue)}
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, customer, postcode..."
                className="w-full rounded-xl border border-[#29483a] bg-[#06100c] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#79c51c]"
              />
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4">
          <div className="flex flex-wrap gap-2">
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
              onClick={() => setFilter("assigned")}
            >
              Assigned ({stats.assigned})
            </FilterButton>

            <FilterButton
              active={filter === "completed"}
              onClick={() => setFilter("completed")}
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

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black">
              Marketplace Jobs
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-12 text-center text-gray-400">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#17382b] border-t-[#79c51c]" />

              <p className="mt-4 font-semibold">
                Loading jobs...
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-12 text-center">
              <h3 className="text-xl font-black">
                No jobs found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try changing your filter or search.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onView={() => setSelectedJob(job)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedJob && (
        <JobModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
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

  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5 transition hover:border-[#29483a]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black">
              {job.reference || `Job #${job.id}`}
            </h3>

            <StatusBadge status={job.status} />
          </div>

          <p className="mt-2 text-sm font-bold text-gray-300">
            {job.job_type || "Waste removal"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {job.postcode || "No postcode"}
            {job.address ? ` • ${job.address}` : ""}
          </p>

          <div className="mt-4 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
            <p>
              <span className="text-gray-600">
                Collection:
              </span>{" "}
              <span className="font-bold text-gray-300">
                {formatDate(job.preferred_date)}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Time:
              </span>{" "}
              <span className="font-bold text-gray-300">
                {formatTime(job.preferred_time)}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Load:
              </span>{" "}
              <span className="font-bold text-gray-300">
                {job.load_size || "Not specified"}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Bids:
              </span>{" "}
              <span className="font-bold text-gray-300">
                {job.bidCount}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-[#17382b] pt-4 lg:min-w-[300px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-600">
                Accepted Value
              </p>

              <p className="mt-1 text-2xl font-black">
                {job.winningBid?.amount !== null &&
                job.winningBid?.amount !== undefined
                  ? `£${formatMoney(job.winningBid.amount)}`
                  : "—"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-600">
                Payment
              </p>

              <p
                className={`mt-1 text-sm font-black uppercase ${
                  normalise(job.payment_status) === "paid"
                    ? "text-[#79c51c]"
                    : "text-yellow-300"
                }`}
              >
                {formatStatus(job.payment_status)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <JourneyBadge status={job.journey_status} />

            {driverName && (
              <span className="rounded-full border border-[#29483a] bg-[#06100c] px-3 py-1.5 text-xs font-bold text-gray-300">
                {driverName}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onView}
            className="w-full rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-[#06100c] transition hover:bg-[#91df31]"
          >
            View Job
          </button>
        </div>
      </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="my-8 w-full max-w-5xl overflow-hidden rounded-3xl border border-[#29483a] bg-[#0b1b14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#17382b] bg-[#081710] p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
              Marketplace Job
            </p>

            <h2 className="mt-1 truncate text-2xl font-black">
              {job.reference}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#29483a] text-xl text-gray-400 transition hover:border-[#79c51c] hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-7">
          <section className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                label="Job status"
                value={<StatusBadge status={job.status} />}
              />

              <Info
                label="Journey status"
                value={
                  <JourneyBadge
                    status={job.journey_status}
                  />
                }
              />

              <Info
                label="Payment status"
                value={
                  <PaymentStatus
                    status={job.payment_status}
                  />
                }
              />

              <Info
                label="Created"
                value={formatDateTime(job.created_at)}
              />
            </div>
          </section>

          <DetailSection title="Collection Details">
            <Detail label="Reference" value={job.reference} />
            <Detail label="Job ID" value={job.id} />
            <Detail label="Job type" value={job.job_type} />
            <Detail label="Load size" value={job.load_size} />
            <Detail label="Postcode" value={job.postcode} />
            <Detail label="Address" value={job.address} />
            <Detail
              label="Preferred date"
              value={formatDate(job.preferred_date)}
            />
            <Detail
              label="Preferred time"
              value={formatTime(job.preferred_time)}
            />
            <Detail label="Floor" value={job.floor} />
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

          <section className="mt-8">
            <h3 className="text-lg font-black">
              Description
            </h3>

            <div className="mt-4 rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                {job.description ||
                  "No description provided."}
              </p>
            </div>
          </section>

          <DetailSection title="Customer">
            <Detail
              label="Customer ID"
              value={job.customer_id}
            />
          </DetailSection>

          <section className="mt-8">
            <h3 className="text-lg font-black">
              Driver Assignment
            </h3>

            <div className="mt-4 rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Detail
                  label="Driver"
                  value={driverName}
                />

                <Detail
                  label="Driver ID"
                  value={job.assigned_driver_id}
                />

                <Detail
                  label="Assigned bid ID"
                  value={job.assigned_bid_id}
                />

                <Detail
                  label="Accepted bid ID"
                  value={job.accepted_bid_id}
                />
              </div>

              {job.assignedDriver && (
                <div className="mt-5 grid gap-5 border-t border-[#17382b] pt-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail
                    label="Driver name"
                    value={job.assignedDriver.full_name}
                  />

                  <Detail
                    label="Trading name"
                    value={job.assignedDriver.trading_name}
                  />

                  <Detail
                    label="Phone"
                    value={job.assignedDriver.phone}
                  />

                  <Detail
                    label="Email"
                    value={job.assignedDriver.email}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-black">
              Accepted Bid
            </h3>

            <div className="mt-4 rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
              {job.winningBid ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                      label="Bid amount"
                      value={
                        job.winningBid.amount !== null
                          ? `£${formatMoney(
                              job.winningBid.amount,
                            )}`
                          : null
                      }
                    />

                    <Detail
                      label="Driver payout"
                      value={
                        job.winningBid.driver_payout !== null
                          ? `£${formatMoney(
                              job.winningBid.driver_payout,
                            )}`
                          : null
                      }
                    />

                    <Detail
                      label="RCS fee"
                      value={
                        job.winningBid.platform_fee !== null
                          ? `£${formatMoney(
                              job.winningBid.platform_fee,
                            )}`
                          : null
                      }
                    />

                    <Detail
                      label="RCS fee %"
                      value={
                        job.winningBid.platform_fee_percent !== null
                          ? `${job.winningBid.platform_fee_percent}%`
                          : null
                      }
                    />

                    <Detail
                      label="Bid status"
                      value={job.winningBid.status}
                    />

                    <Detail
                      label="Bid created"
                      value={formatDateTime(
                        job.winningBid.created_at,
                      )}
                    />

                    <Detail
                      label="Accepted"
                      value={
                        job.winningBid.accepted_at
                          ? formatDateTime(
                              job.winningBid.accepted_at,
                            )
                          : "Not recorded"
                      }
                    />

                    <Detail
                      label="Driver ID"
                      value={job.winningBid.driver_id}
                    />
                  </div>

                  <div className="mt-5 border-t border-[#17382b] pt-5">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-600">
                      Driver message
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                      {job.winningBid.message ||
                        "No message provided."}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  No accepted bid recorded.
                </p>
              )}
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-black">
              Stripe Payment
            </h3>

            <div className="mt-4 grid gap-5 rounded-2xl border border-[#17382b] bg-[#06100c] p-5 sm:grid-cols-2">
              <Detail
                label="Payment status"
                value={job.payment_status}
              />

              <Detail
                label="Checkout session"
                value={job.stripe_checkout_session_id}
              />

              <Detail
                label="Payment intent"
                value={job.stripe_payment_intent_id}
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
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>

      <p className="mt-1 text-sm text-gray-500">
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

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const value = normalise(status) || "unknown";

  let classes =
    "border-white/10 bg-white/5 text-gray-300";

  if (
    value === "open" ||
    value === "bidding"
  ) {
    classes =
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (value === "assigned") {
    classes =
      "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  if (value === "completed") {
    classes =
      "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";
  }

  if (
    value === "cancelled" ||
    value === "rejected"
  ) {
    classes =
      "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${classes}`}
    >
      {formatStatus(value)}
    </span>
  );
}

function JourneyBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const value = normalise(status) || "unknown";

  let classes =
    "border-white/10 bg-white/5 text-gray-300";

  if (value === "assigned") {
    classes =
      "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  if (value === "on_the_way") {
    classes =
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (value === "in_progress") {
    classes =
      "border-purple-500/30 bg-purple-500/10 text-purple-300";
  }

  if (value === "completed") {
    classes =
      "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${classes}`}
    >
      {formatStatus(value)}
    </span>
  );
}

function PaymentStatus({
  status,
}: {
  status: string | null | undefined;
}) {
  const value = normalise(status) || "unknown";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
        value === "paid"
          ? "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]"
          : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      }`}
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
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-600">
        {label}
      </p>

      <div className="mt-2">
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
    <section className="mt-8">
      <h3 className="text-lg font-black">
        {title}
      </h3>

      <div className="mt-4 grid gap-5 rounded-2xl border border-[#17382b] bg-[#06100c] p-5 sm:grid-cols-2">
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
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-gray-200">
        {value === null ||
        value === undefined ||
        value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}

function normalise(
  value: string | null | undefined,
) {
  return value?.trim().toLowerCase() || "";
}

function formatStatus(
  value: string | null | undefined,
) {
  const safe = normalise(value) || "Unknown";

  return safe
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatMoney(
  value: number | null | undefined,
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
  value: string | null | undefined,
) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

  if (numeric >= 0 && numeric <= 23) {
    return `${String(numeric).padStart(2, "0")}:00`;
  }

  return String(value);
}