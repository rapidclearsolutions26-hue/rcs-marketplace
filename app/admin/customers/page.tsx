"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  job_count: number;
  total_job_value: number;
  paid_job_value: number;
  jobs: CustomerJob[];
};

type CustomerJob = {
  id: number;
  reference: string | null;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  description: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string | null;
  journey_status: string | null;
  payment_status: string | null;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  created_at: string | null;
};

type Stats = {
  totalCustomers: number;
  customersWithJobs: number;
  totalJobs: number;
  totalJobValue: number;
  paidJobValue: number;
};

type Filter = "all" | "with_jobs" | "without_jobs";

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

function formatShortDate(value: string | null | undefined) {
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

function getStatusClasses(status: string | null) {
  const value = String(status ?? "").toLowerCase();

  if (
    value === "completed" ||
    value === "paid" ||
    value === "assigned"
  ) {
    return "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";
  }

  if (
    value === "open" ||
    value === "bidding" ||
    value === "pending"
  ) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (
    value === "cancelled" ||
    value === "rejected"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-gray-300";
}

function getCustomerName(customer: Customer) {
  return (
    customer.full_name ||
    customer.email ||
    "Unnamed customer"
  );
}

export default function AdminCustomersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    customersWithJobs: 0,
    totalJobs: 0,
    totalJobValue: 0,
    paidJobValue: 0,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setRefreshing(true);
        }

        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error(
            "Your admin session has expired. Please log in again.",
          );
        }

        const response = await fetch("/api/admin/customers", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Failed to load customers.",
          );
        }

        setCustomers(data.customers ?? []);

        setStats(
          data.stats ?? {
            totalCustomers: 0,
            customersWithJobs: 0,
            totalJobs: 0,
            totalJobValue: 0,
            paidJobValue: 0,
          },
        );
      } catch (err) {
        console.error("Admin customers error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load customers.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadCustomers();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return customers.filter((customer) => {
      if (
        filter === "with_jobs" &&
        customer.job_count === 0
      ) {
        return false;
      }

      if (
        filter === "without_jobs" &&
        customer.job_count > 0
      ) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const name =
        customer.full_name?.toLowerCase() ?? "";

      const email =
        customer.email?.toLowerCase() ?? "";

      const phone =
        customer.phone?.toLowerCase() ?? "";

      const id =
        customer.id.toLowerCase();

      const jobMatches = customer.jobs.some((job) => {
        return (
          String(job.id)
            .toLowerCase()
            .includes(searchValue) ||
          (job.reference ?? "")
            .toLowerCase()
            .includes(searchValue) ||
          (job.postcode ?? "")
            .toLowerCase()
            .includes(searchValue) ||
          (job.job_type ?? "")
            .toLowerCase()
            .includes(searchValue)
        );
      });

      return (
        name.includes(searchValue) ||
        email.includes(searchValue) ||
        phone.includes(searchValue) ||
        id.includes(searchValue) ||
        jobMatches
      );
    });
  }, [customers, filter, search]);

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="border-b border-[#17382b] bg-[#081710]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
              Rapid Clear Solutions
            </p>

            <h1 className="mt-1 text-xl font-black sm:text-2xl">
              Admin Customers
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadCustomers(true)}
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
            Customer Management
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Customers
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            View customers, their jobs, booking history and
            payment information.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Customers"
            value={stats.totalCustomers}
            detail="Registered customers"
          />

          <StatCard
            label="With Jobs"
            value={stats.customersWithJobs}
            detail="Customers who have posted"
          />

          <StatCard
            label="Total Jobs"
            value={stats.totalJobs}
            detail="Customer jobs"
          />

          <StatCard
            label="Job Value"
            value={formatMoney(stats.totalJobValue)}
            detail="Total customer job value"
          />

          <StatCard
            label="Paid Value"
            value={formatMoney(stats.paidJobValue)}
            detail="Jobs marked paid"
          />
        </section>

        <section className="mt-8 rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All ({stats.totalCustomers})
              </FilterButton>

              <FilterButton
                active={filter === "with_jobs"}
                onClick={() => setFilter("with_jobs")}
              >
                With Jobs ({stats.customersWithJobs})
              </FilterButton>

              <FilterButton
                active={filter === "without_jobs"}
                onClick={() => setFilter("without_jobs")}
              >
                No Jobs (
                {stats.totalCustomers -
                  stats.customersWithJobs}
                )
              </FilterButton>
            </div>

            <div className="w-full lg:max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customer, email, job or postcode..."
                className="w-full rounded-xl border border-[#29483a] bg-[#06100c] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#79c51c]"
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] px-6 py-12 text-center text-gray-400">
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] px-6 py-12 text-center">
              <p className="text-lg font-bold text-white">
                No customers found
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Try changing the filter or search term.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onOpen={() =>
                    setSelectedCustomer(customer)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
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

      <p className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
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

function CustomerCard({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: () => void;
}) {
  const name = getCustomerName(customer);

  const latestJob =
    customer.jobs.length > 0
      ? customer.jobs[0]
      : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5 text-left transition hover:border-[#79c51c]/60 hover:bg-[#0d2118]"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#29483a] bg-[#06100c] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-400">
              Customer
            </span>

            {customer.job_count > 0 && (
              <span className="rounded-full border border-[#79c51c]/30 bg-[#79c51c]/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#79c51c]">
                {customer.job_count}{" "}
                {customer.job_count === 1 ? "Job" : "Jobs"}
              </span>
            )}
          </div>

          <h3 className="mt-3 truncate text-xl font-black text-white">
            {name}
          </h3>

          <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
            <p className="truncate">
              <span className="text-gray-600">
                Email:
              </span>{" "}
              <span className="font-bold text-gray-200">
                {customer.email || "—"}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Phone:
              </span>{" "}
              <span className="font-bold text-gray-200">
                {customer.phone || "—"}
              </span>
            </p>

            <p>
              <span className="text-gray-600">
                Joined:
              </span>{" "}
              <span className="font-bold text-gray-200">
                {formatShortDate(customer.created_at)}
              </span>
            </p>

            {latestJob && (
              <p>
                <span className="text-gray-600">
                  Latest:
                </span>{" "}
                <span className="font-bold text-gray-200">
                  {latestJob.reference ||
                    `Job #${latestJob.id}`}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-5 border-t border-[#17382b] pt-4 sm:grid-cols-3 lg:min-w-[390px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
              Jobs
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {customer.job_count}
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
              Job Value
            </p>

            <p className="mt-1 text-xl font-black text-white">
              {formatMoney(customer.total_job_value)}
            </p>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
              Paid
            </p>

            <p className="mt-1 text-xl font-black text-[#79c51c]">
              {formatMoney(customer.paid_job_value)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

function CustomerModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const name = getCustomerName(customer);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[#29483a] bg-[#0b1b14] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#17382b] bg-[#0b1b14] px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
              Customer Profile
            </p>

            <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">
              {name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-[#29483a] px-3 py-2 text-sm font-bold text-gray-300 transition hover:border-[#79c51c] hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <section className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail
                label="Full name"
                value={customer.full_name || "—"}
              />

              <Detail
                label="Email"
                value={customer.email || "—"}
              />

              <Detail
                label="Phone"
                value={customer.phone || "—"}
              />

              <Detail
                label="Customer since"
                value={formatDate(customer.created_at)}
              />

              <Detail
                label="Last sign in"
                value={formatDate(customer.last_sign_in_at)}
              />

              <Detail
                label="Customer ID"
                value={customer.id}
              />

              <Detail
                label="Total jobs"
                value={String(customer.job_count)}
              />

              <Detail
                label="Total job value"
                value={formatMoney(customer.total_job_value)}
              />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
                  Job History
                </p>

                <h3 className="mt-1 text-xl font-black">
                  Customer Jobs
                </h3>
              </div>

              <p className="text-sm text-gray-500">
                {customer.jobs.length}{" "}
                {customer.jobs.length === 1
                  ? "job"
                  : "jobs"}
              </p>
            </div>

            {customer.jobs.length === 0 ? (
              <div className="rounded-2xl border border-[#17382b] bg-[#06100c] p-6 text-center text-sm text-gray-500">
                This customer has not posted any jobs yet.
              </div>
            ) : (
              <div className="space-y-4">
                {customer.jobs.map((job) => (
                  <JobHistoryCard
                    key={job.id}
                    job={job}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function JobHistoryCard({
  job,
}: {
  job: CustomerJob;
}) {
  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-black">
              {job.reference ||
                `Job #${job.id}`}
            </p>

            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${getStatusClasses(
                job.status,
              )}`}
            >
              {job.status || "Unknown"}
            </span>
          </div>

          <p className="mt-2 text-sm font-bold text-gray-300">
            {job.job_type || "Waste removal"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {job.postcode || "No postcode"}
            {job.address
              ? ` • ${job.address}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="Journey"
            value={job.journey_status}
          />

          <StatusPill
            label="Payment"
            value={job.payment_status}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-[#17382b] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <Detail
          label="Load size"
          value={job.load_size || "—"}
        />

        <Detail
          label="Collection date"
          value={
            job.preferred_date
              ? formatShortDate(job.preferred_date)
              : "—"
          }
        />

        <Detail
          label="Collection time"
          value={
            job.preferred_time
              ? String(job.preferred_time)
              : "—"
          }
        />

        <Detail
          label="Created"
          value={formatDate(job.created_at)}
        />
      </div>

      {job.description && (
        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">
            Description
          </p>

          <p className="mt-1 text-sm leading-6 text-gray-400">
            {job.description}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-[#29483a] bg-[#0b1b14] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>

      <p
        className={`mt-0.5 text-xs font-black uppercase ${getStatusClasses(
          value,
        )
          .replace("border-", "text-")
          .replace(/bg-[^\s]+/g, "")
          .replace(/border-[^\s]+/g, "")
          .trim()}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  );
}