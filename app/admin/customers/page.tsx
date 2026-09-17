"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
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

type Filter =
  | "all"
  | "with_jobs"
  | "without_jobs";

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

function getStatusClasses(
  status: string | null,
) {
  const value = String(
    status ?? "",
  ).toLowerCase();

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

  return "border-white/10 bg-white/5 text-gray-400";
}

function formatStatus(
  status: string | null,
) {
  if (!status) return "Unknown";

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getCustomerName(
  customer: Customer,
) {
  return (
    customer.full_name ||
    customer.email ||
    "Unnamed customer"
  );
}

function getCustomerInitials(
  customer: Customer,
) {
  const name =
    customer.full_name?.trim();

  if (!name) {
    return "R";
  }

  const parts = name.split(/\s+/);

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

export default function AdminCustomersPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [stats, setStats] =
    useState<Stats>({
      totalCustomers: 0,
      customersWithJobs: 0,
      totalJobs: 0,
      totalJobValue: 0,
      paidJobValue: 0,
    });

  const [filter, setFilter] =
    useState<Filter>("all");

  const [search, setSearch] =
    useState("");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [copiedId, setCopiedId] =
    useState(false);

  const loadCustomers =
    useCallback(
      async (
        showRefreshing = false,
      ) => {
        try {
          if (showRefreshing) {
            setRefreshing(true);
          }

          setError("");

          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (!session?.access_token) {
            throw new Error(
              "Your admin session has expired. Please log in again.",
            );
          }

          const response = await fetch(
            "/api/admin/customers",
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
                "Failed to load customers.",
            );
          }

          setCustomers(
            data.customers ?? [],
          );

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
          console.error(
            "Admin customers error:",
            err,
          );

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
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        void loadCustomers();
      }, 15000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [loadCustomers]);

  const filteredCustomers =
    useMemo(() => {
      const searchValue =
        search.trim().toLowerCase();

      return customers.filter(
        (customer) => {
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
            customer.full_name?.toLowerCase() ??
            "";

          const email =
            customer.email?.toLowerCase() ??
            "";

          const phone =
            customer.phone?.toLowerCase() ??
            "";

          const id =
            customer.id.toLowerCase();

          const jobMatches =
            customer.jobs.some(
              (job) => {
                return (
                  String(job.id)
                    .toLowerCase()
                    .includes(
                      searchValue,
                    ) ||
                  (
                    job.reference ?? ""
                  )
                    .toLowerCase()
                    .includes(
                      searchValue,
                    ) ||
                  (
                    job.postcode ?? ""
                  )
                    .toLowerCase()
                    .includes(
                      searchValue,
                    ) ||
                  (
                    job.job_type ?? ""
                  )
                    .toLowerCase()
                    .includes(
                      searchValue,
                    )
                );
              },
            );

          return (
            name.includes(
              searchValue,
            ) ||
            email.includes(
              searchValue,
            ) ||
            phone.includes(
              searchValue,
            ) ||
            id.includes(
              searchValue,
            ) ||
            jobMatches
          );
        },
      );
    }, [
      customers,
      filter,
      search,
    ]);

  async function copyCustomerId(
    id: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        id,
      );

      setCopiedId(true);

      window.setTimeout(() => {
        setCopiedId(false);
      }, 1500);
    } catch {
      setCopiedId(false);
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
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              className="h-9 w-auto object-contain sm:h-12"
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadCustomers(true)
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
      {/* CONTENT                                            */}
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
              Customer
              <span className="block text-[#79c51c]">
                Management
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              View customers, their jobs,
              booking history and payment
              information.
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
            value={formatMoney(
              stats.totalJobValue,
            )}
            detail="Total customer job value"
          />

          <StatCard
            label="Paid Value"
            value={formatMoney(
              stats.paidJobValue,
            )}
            detail="Jobs marked paid"
          />
        </section>

        {/* ================================================= */}
        {/* SEARCH                                            */}
        {/* ================================================= */}

        <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#080b08] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                Customer Directory
              </p>

              <h2 className="mt-2 text-2xl font-black uppercase">
                {filteredCustomers.length}{" "}
                customer
                {filteredCustomers.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </h2>
            </div>

            <div className="w-full lg:max-w-md">
              <label
                htmlFor="customer-search"
                className="mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-700"
              >
                Search customers
              </label>

              <input
                id="customer-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Name, email, job or postcode..."
                className="w-full rounded-xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-[#79c51c]"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              active={filter === "all"}
              onClick={() =>
                setFilter("all")
              }
            >
              All ({stats.totalCustomers})
            </FilterButton>

            <FilterButton
              active={
                filter === "with_jobs"
              }
              onClick={() =>
                setFilter("with_jobs")
              }
            >
              With Jobs (
              {stats.customersWithJobs})
            </FilterButton>

            <FilterButton
              active={
                filter === "without_jobs"
              }
              onClick={() =>
                setFilter("without_jobs")
              }
            >
              No Jobs (
              {stats.totalCustomers -
                stats.customersWithJobs}
              )
            </FilterButton>
          </div>
        </section>

        {/* ================================================= */}
        {/* CUSTOMER LIST                                     */}
        {/* ================================================= */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
              Customer Network
            </p>

            <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
              Customers
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              {customers.length} registered
              customer
              {customers.length === 1
                ? ""
                : "s"}{" "}
              in the marketplace.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-12 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />

              <p className="mt-5 text-sm font-semibold text-gray-500">
                Loading customers...
              </p>
            </div>
          ) : filteredCustomers.length ===
            0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.10] bg-[#050705]">
                <span className="font-black text-[#79c51c]">
                  RCS
                </span>
              </div>

              <h3 className="mt-5 text-xl font-black uppercase">
                No customers found
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Try changing the filter or
                search term.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map(
                (customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onOpen={() =>
                      setSelectedCustomer(
                        customer,
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
      {/* CUSTOMER MODAL                                    */}
      {/* ================================================= */}

      {selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          copiedId={copiedId}
          onCopyId={copyCustomerId}
          onClose={() =>
            setSelectedCustomer(null)
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
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#080b08] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
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
/* CUSTOMER CARD                                          */
/* ===================================================== */

function CustomerCard({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: () => void;
}) {
  const name =
    getCustomerName(customer);

  const latestJob =
    customer.jobs.length > 0
      ? customer.jobs[0]
      : null;

  const initials =
    getCustomerInitials(customer);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-white/[0.08] bg-[#080b08] p-4 text-left transition hover:border-[#79c51c]/30 sm:p-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* CUSTOMER */}

        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-sm font-black text-[#79c51c] sm:h-14 sm:w-14">
            {initials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.10] bg-[#050705] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-500">
                Customer
              </span>

              {customer.job_count > 0 && (
                <span className="rounded-full border border-[#79c51c]/30 bg-[#79c51c]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#79c51c]">
                  {customer.job_count}{" "}
                  {customer.job_count ===
                  1
                    ? "Job"
                    : "Jobs"}
                </span>
              )}
            </div>

            <h3 className="mt-3 truncate text-xl font-black text-white">
              {name}
            </h3>

            <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 sm:text-sm">
              <p className="truncate">
                Email:{" "}
                <span className="font-bold text-gray-300">
                  {customer.email ||
                    "—"}
                </span>
              </p>

              <p>
                Phone:{" "}
                <span className="font-bold text-gray-300">
                  {customer.phone ||
                    "—"}
                </span>
              </p>

              <p>
                Joined:{" "}
                <span className="font-bold text-gray-300">
                  {formatShortDate(
                    customer.created_at,
                  )}
                </span>
              </p>

              {latestJob && (
                <p>
                  Latest:{" "}
                  <span className="font-bold text-gray-300">
                    {latestJob.reference ||
                      `Job #${latestJob.id}`}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}

        <div className="grid shrink-0 grid-cols-3 gap-3 border-t border-white/[0.08] pt-4 lg:min-w-[390px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <MiniStat
            label="Jobs"
            value={String(
              customer.job_count,
            )}
          />

          <MiniStat
            label="Value"
            value={formatMoney(
              customer.total_job_value,
            )}
          />

          <MiniStat
            label="Paid"
            value={formatMoney(
              customer.paid_job_value,
            )}
            green
          />
        </div>
      </div>
    </button>
  );
}

/* ===================================================== */
/* MINI STAT                                              */
/* ===================================================== */

function MiniStat({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-600 sm:text-[10px]">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black sm:text-lg ${
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
/* CUSTOMER MODAL                                         */
/* ===================================================== */

function CustomerModal({
  customer,
  copiedId,
  onCopyId,
  onClose,
}: {
  customer: Customer;
  copiedId: boolean;
  onCopyId: (
    id: string,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const name =
    getCustomerName(customer);

  const initials =
    getCustomerInitials(customer);

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
      <div className="my-2 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.10] bg-[#080b08] shadow-2xl sm:my-8">
        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#050705]/95 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                Customer Profile
              </p>

              <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">
                {name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close customer"
            className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-xl text-gray-500 transition hover:border-[#79c51c] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="max-h-[86vh] overflow-y-auto p-4 sm:p-7">
          {/* CUSTOMER OVERVIEW */}

          <section className="rounded-2xl border border-white/[0.08] bg-[#050705] p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail
                label="Full name"
                value={
                  customer.full_name ||
                  "—"
                }
              />

              <Detail
                label="Email"
                value={
                  customer.email ||
                  "—"
                }
              />

              <Detail
                label="Phone"
                value={
                  customer.phone ||
                  "—"
                }
              />

              <Detail
                label="Customer since"
                value={formatDate(
                  customer.created_at,
                )}
              />

              <Detail
                label="Last sign in"
                value={formatDate(
                  customer.last_sign_in_at,
                )}
              />

              <Detail
                label="Total jobs"
                value={String(
                  customer.job_count,
                )}
              />

              <Detail
                label="Total job value"
                value={formatMoney(
                  customer.total_job_value,
                )}
              />

              <Detail
                label="Paid value"
                value={formatMoney(
                  customer.paid_job_value,
                )}
                green
              />
            </div>
          </section>

          {/* QUICK ACTIONS */}

          <section className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
              Quick Actions
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex min-h-[50px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#050705] px-4 text-xs font-black uppercase tracking-wider text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c]"
                >
                  Email Customer →
                </a>
              ) : (
                <div className="flex min-h-[50px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#050705] px-4 text-xs font-black uppercase tracking-wider text-gray-700">
                  No Email
                </div>
              )}

              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex min-h-[50px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#050705] px-4 text-xs font-black uppercase tracking-wider text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c]"
                >
                  Call Customer →
                </a>
              ) : (
                <div className="flex min-h-[50px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#050705] px-4 text-xs font-black uppercase tracking-wider text-gray-700">
                  No Phone
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  void onCopyId(
                    customer.id,
                  )
                }
                className="flex min-h-[50px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#050705] px-4 text-xs font-black uppercase tracking-wider text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                {copiedId
                  ? "Customer ID Copied"
                  : "Copy Customer ID"}
              </button>
            </div>
          </section>

          {/* CUSTOMER ID */}

          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#080b08] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-700">
              Customer ID
            </p>

            <p className="mt-2 break-all font-mono text-xs text-gray-500">
              {customer.id}
            </p>
          </section>

          {/* JOB HISTORY */}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
                  Job History
                </p>

                <h3 className="mt-2 text-xl font-black uppercase">
                  Customer Jobs
                </h3>
              </div>

              <p className="text-xs font-bold text-gray-600">
                {customer.jobs.length}{" "}
                {customer.jobs.length ===
                1
                  ? "job"
                  : "jobs"}
              </p>
            </div>

            {customer.jobs.length ===
            0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#050705] p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080b08]">
                  <span className="font-black text-[#79c51c]">
                    RCS
                  </span>
                </div>

                <p className="mt-4 text-sm font-bold text-gray-400">
                  No jobs posted yet
                </p>

                <p className="mt-1 text-xs text-gray-700">
                  This customer has not
                  posted any jobs.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.jobs.map(
                  (job) => (
                    <JobHistoryCard
                      key={job.id}
                      job={job}
                    />
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* JOB HISTORY CARD                                       */
/* ===================================================== */

function JobHistoryCard({
  job,
}: {
  job: CustomerJob;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#050705] p-5 transition hover:border-white/[0.12]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-black">
              {job.reference ||
                `Job #${job.id}`}
            </p>

            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${getStatusClasses(
                job.status,
              )}`}
            >
              {formatStatus(
                job.status,
              )}
            </span>
          </div>

          <p className="mt-2 text-sm font-bold text-gray-300">
            {job.job_type ||
              "Waste removal"}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {job.postcode ||
              "No postcode"}

            {job.address
              ? ` • ${job.address}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="Journey"
            value={
              job.journey_status
            }
          />

          <StatusPill
            label="Payment"
            value={
              job.payment_status
            }
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/[0.08] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <Detail
          label="Load size"
          value={
            job.load_size || "—"
          }
        />

        <Detail
          label="Collection date"
          value={
            job.preferred_date
              ? formatShortDate(
                  job.preferred_date,
                )
              : "—"
          }
        />

        <Detail
          label="Collection time"
          value={
            job.preferred_time
              ? String(
                  job.preferred_time,
                )
              : "—"
          }
        />

        <Detail
          label="Created"
          value={formatDate(
            job.created_at,
          )}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoBox
          label="Driver"
          value={
            job.assigned_driver_id
              ? "Driver assigned"
              : "No driver assigned"
          }
        />

        <InfoBox
          label="Booking"
          value={
            job.accepted_bid_id
              ? "Quote accepted"
              : "No quote accepted"
          }
        />
      </div>

      {job.description && (
        <div className="mt-5 border-t border-white/[0.08] pt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-700">
            Description
          </p>

          <p className="mt-2 text-sm leading-7 text-gray-500">
            {job.description}
          </p>
        </div>
      )}
    </div>
  );
}

/* ===================================================== */
/* INFO BOX                                               */
/* ===================================================== */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#080b08] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-300">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* STATUS PILL                                            */
/* ===================================================== */

function StatusPill({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const classes =
    getStatusClasses(value);

  const textClass =
    classes.includes(
      "text-[#79c51c]",
    )
      ? "text-[#79c51c]"
      : classes.includes(
            "text-yellow-300",
          )
        ? "text-yellow-300"
        : classes.includes(
              "text-red-300",
            )
          ? "text-red-300"
          : "text-gray-400";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#080b08] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p
        className={`mt-0.5 text-xs font-black uppercase ${textClass}`}
      >
        {formatStatus(value)}
      </p>
    </div>
  );
}

/* ===================================================== */
/* DETAIL                                                 */
/* ===================================================== */

function Detail({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-sm font-bold ${
          green
            ? "text-[#79c51c]"
            : "text-gray-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}