"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: number;
  reference: string;
  customer_id: string;
  job_type: string | null;
  postcode: string | null;
  status: string | null;
  journey_status: string | null;
  payment_status: string | null;
  created_at: string;
};

type Driver = {
  id: string;
  full_name: string;
  email: string;
  application_status: string | null;
  approved: boolean;
  created_at: string;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number | null;
  status: string | null;
  platform_fee_percent: number | null;
  platform_fee: number | null;
  driver_payout: number | null;
  created_at: string;
};

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const [
        jobsResult,
        driversResult,
        bidsResult,
      ] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id,reference,customer_id,job_type,postcode,status,journey_status,payment_status,created_at"
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("drivers")
          .select(
            "id,full_name,email,application_status,approved,created_at"
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("bids")
          .select(
            "id,job_id,driver_id,amount,status,platform_fee_percent,platform_fee,driver_payout,created_at"
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (jobsResult.error) {
        console.error(
          "Dashboard jobs error:",
          jobsResult.error
        );

        setErrorMessage(
          `Jobs: ${jobsResult.error.message}`
        );

        return;
      }

      if (driversResult.error) {
        console.error(
          "Dashboard drivers error:",
          driversResult.error
        );

        setErrorMessage(
          `Drivers: ${driversResult.error.message}`
        );

        return;
      }

      if (bidsResult.error) {
        console.error(
          "Dashboard bids error:",
          bidsResult.error
        );

        setErrorMessage(
          `Bids: ${bidsResult.error.message}`
        );

        return;
      }

      setJobs((jobsResult.data as Job[]) || []);
      setDrivers(
        (driversResult.data as Driver[]) || []
      );
      setBids((bidsResult.data as Bid[]) || []);
    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const openJobs = jobs.filter((job) =>
    ["open", "bidding"].includes(
      normalise(job.status)
    )
  );

  const assignedJobs = jobs.filter(
    (job) =>
      normalise(job.status) === "assigned"
  );

  const onTheWayJobs = jobs.filter(
    (job) =>
      normalise(job.journey_status) ===
      "on_the_way"
  );

  const inProgressJobs = jobs.filter(
    (job) =>
      normalise(job.journey_status) ===
      "in_progress"
  );

  const completedJobs = jobs.filter(
    (job) =>
      normalise(job.status) ===
        "completed" ||
      normalise(job.journey_status) ===
        "completed"
  );

  const pendingDrivers = drivers.filter(
    (driver) =>
      normalise(
        driver.application_status
      ) === "pending"
  );

  const approvedDrivers = drivers.filter(
    (driver) =>
      normalise(
        driver.application_status
      ) === "approved" ||
      driver.approved === true
  );

  const suspendedDrivers = drivers.filter(
    (driver) =>
      normalise(
        driver.application_status
      ) === "suspended"
  );

  const acceptedBids = bids.filter(
    (bid) =>
      normalise(bid.status) === "accepted"
  );

  const paidJobs = jobs.filter(
    (job) =>
      normalise(job.payment_status) === "paid"
  );

  const totalAcceptedValue =
    acceptedBids.reduce(
      (total, bid) =>
        total + Number(bid.amount || 0),
      0
    );

  const totalRcsFees =
    acceptedBids.reduce(
      (total, bid) =>
        total +
        Number(bid.platform_fee || 0),
      0
    );

  const totalDriverPayouts =
    acceptedBids.reduce(
      (total, bid) =>
        total +
        Number(bid.driver_payout || 0),
      0
    );

  const recentJobs = jobs.slice(0, 5);

  const recentDrivers = drivers.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      {/* HEADER */}

      <header className="border-b border-[#dde5d8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin">
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>

          <div className="text-right">
            <p className="text-sm font-bold text-[#529027]">
              RCS ADMIN
            </p>

            <p className="text-xs text-[#777777]">
              Marketplace Control Centre
            </p>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* TITLE */}

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#529027]">
              Rapid Clear Solutions
            </p>

            <h1 className="mt-2 text-4xl font-black text-[#111111]">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-[#666666]">
              Manage marketplace jobs, drivers,
              customers, bids and payments from one
              place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="rounded-xl border border-[#cbd5c5] bg-white px-5 py-3 text-sm font-black text-[#315c18] shadow-sm hover:bg-[#f5f7f4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh Dashboard"}
          </button>
        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              {errorMessage}
            </p>
          </div>
        )}

        {/* MAIN STATS */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Jobs"
            number={jobs.length}
            description="All marketplace jobs"
            icon="📋"
          />

          <StatCard
            title="Approved Drivers"
            number={approvedDrivers.length}
            description="Active drivers"
            icon="🚚"
          />

          <StatCard
            title="Customers"
            number={uniqueCustomers(
              jobs
            )}
            description="Customers with jobs"
            icon="👤"
          />

          <StatCard
            title="Accepted Value"
            number={`£${formatMoney(
              totalAcceptedValue
            )}`}
            description="Accepted job value"
            icon="💷"
          />
        </div>

        {/* JOB STATUS */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-[#111111]">
              Job Overview
            </h2>

            <p className="mt-1 text-sm text-[#777777]">
              Current marketplace activity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <OverviewCard
              title="Open / Bidding"
              number={openJobs.length}
              description="Waiting for drivers"
            />

            <OverviewCard
              title="Assigned"
              number={assignedJobs.length}
              description="Driver assigned"
            />

            <OverviewCard
              title="On The Way"
              number={onTheWayJobs.length}
              description="Driver travelling"
            />

            <OverviewCard
              title="In Progress"
              number={inProgressJobs.length}
              description="Collection underway"
            />

            <OverviewCard
              title="Completed"
              number={completedJobs.length}
              description="Finished jobs"
            />
          </div>
        </section>

        {/* DRIVER STATUS */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-[#111111]">
              Driver Overview
            </h2>

            <p className="mt-1 text-sm text-[#777777]">
              Driver application and account status.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <OverviewCard
              title="Pending Applications"
              number={pendingDrivers.length}
              description="Need reviewing"
              link="/admin/drivers"
            />

            <OverviewCard
              title="Approved Drivers"
              number={approvedDrivers.length}
              description="Currently active"
              link="/admin/drivers"
            />

            <OverviewCard
              title="Suspended"
              number={suspendedDrivers.length}
              description="Currently suspended"
              link="/admin/drivers"
            />
          </div>
        </section>

        {/* FINANCIAL */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-[#111111]">
              Financial Overview
            </h2>

            <p className="mt-1 text-sm text-[#777777]">
              Marketplace payment and commission figures.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceCard
              title="Accepted Value"
              value={`£${formatMoney(
                totalAcceptedValue
              )}`}
              description="Accepted bids"
            />

            <FinanceCard
              title="RCS Fees"
              value={`£${formatMoney(
                totalRcsFees
              )}`}
              description="Stored platform fees"
            />

            <FinanceCard
              title="Driver Payouts"
              value={`£${formatMoney(
                totalDriverPayouts
              )}`}
              description="Stored driver payouts"
            />

            <FinanceCard
              title="Paid Jobs"
              value={String(
                paidJobs.length
              )}
              description="Marked as paid"
            />
          </div>
        </section>

        {/* QUICK ACTIONS */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-[#111111]">
              Management
            </h2>

            <p className="mt-1 text-sm text-[#777777]">
              Access the main marketplace management areas.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ManagementCard
              href="/admin/jobs"
              icon="📋"
              title="Jobs"
              description="View and manage marketplace jobs."
              number={jobs.length}
            />

            <ManagementCard
              href="/admin/drivers"
              icon="🚚"
              title="Drivers"
              description="Review and manage driver applications."
              number={drivers.length}
            />

            <ManagementCard
              href="/admin/customers"
              icon="👤"
              title="Customers"
              description="View customers and their jobs."
              number={uniqueCustomers(
                jobs
              )}
            />

            <ManagementCard
              href="/admin/bids"
              icon="💬"
              title="Bids"
              description="Review driver bids and pricing."
              number={bids.length}
            />
          </div>
        </section>

        {/* RECENT ACTIVITY */}

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* RECENT JOBS */}

          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#111111]">
                  Recent Jobs
                </h2>

                <p className="mt-1 text-sm text-[#777777]">
                  Latest customer jobs.
                </p>
              </div>

              <Link
                href="/admin/jobs"
                className="text-sm font-black text-[#529027] hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="space-y-3">
              {recentJobs.length === 0 ? (
                <EmptyCard text="No jobs yet." />
              ) : (
                recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-[#dde5d8] bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-black text-[#111111]">
                          {job.reference}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#555555]">
                          {job.job_type ||
                            "Job type not specified"}
                        </p>

                        <p className="mt-1 text-xs text-[#777777]">
                          {job.postcode ||
                            "No postcode"}
                        </p>
                      </div>

                      <StatusBadge
                        status={job.status}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RECENT DRIVERS */}

          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#111111]">
                  Recent Drivers
                </h2>

                <p className="mt-1 text-sm text-[#777777]">
                  Latest driver applications.
                </p>
              </div>

              <Link
                href="/admin/drivers"
                className="text-sm font-black text-[#529027] hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="space-y-3">
              {recentDrivers.length === 0 ? (
                <EmptyCard text="No drivers yet." />
              ) : (
                recentDrivers.map(
                  (driver) => (
                    <div
                      key={driver.id}
                      className="rounded-2xl border border-[#dde5d8] bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-black text-[#111111]">
                            {driver.full_name}
                          </p>

                          <p className="mt-1 truncate text-sm text-[#666666]">
                            {driver.email}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            driver.application_status
                          }
                        />
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </section>

        {/* BOTTOM INFO */}

        <div className="mt-8 rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#529027]">
                RCS Marketplace
              </p>

              <h2 className="mt-1 text-xl font-black text-[#111111]">
                Control Centre
              </h2>

              <p className="mt-1 text-sm text-[#666666]">
                Keep an eye on jobs, drivers,
                payments and marketplace activity.
              </p>
            </div>

            <div className="rounded-2xl bg-[#e7f1df] px-5 py-4 text-center">
              <p className="text-xs font-black uppercase tracking-wide text-[#529027]">
                Platform Fee
              </p>

              <p className="mt-1 text-3xl font-black text-[#315c18]">
                10%
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ===================================================== */
/* STAT CARD                                              */
/* ===================================================== */

function StatCard({
  title,
  number,
  description,
  icon,
}: {
  title: string;
  number: number | string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
            {title}
          </p>

          <p className="mt-2 text-4xl font-black text-[#111111]">
            {number}
          </p>

          <p className="mt-1 text-sm text-[#777777]">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f1df] text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* OVERVIEW CARD                                          */
/* ===================================================== */

function OverviewCard({
  title,
  number,
  description,
  link,
}: {
  title: string;
  number: number;
  description: string;
  link?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-[#dde5d8] bg-white p-5 shadow-sm transition hover:border-[#b9cdb0] hover:shadow-md">
      <p className="text-sm font-black text-[#111111]">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-[#529027]">
        {number}
      </p>

      <p className="mt-1 text-xs text-[#777777]">
        {description}
      </p>
    </div>
  );

  if (link) {
    return (
      <Link href={link}>
        {content}
      </Link>
    );
  }

  return content;
}

/* ===================================================== */
/* FINANCE CARD                                           */
/* ===================================================== */

function FinanceCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-[#111111]">
        {value}
      </p>

      <p className="mt-1 text-sm text-[#777777]">
        {description}
      </p>
    </div>
  );
}

/* ===================================================== */
/* MANAGEMENT CARD                                        */
/* ===================================================== */

function ManagementCard({
  href,
  icon,
  title,
  description,
  number,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  number: number;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#b9cdb0] hover:shadow-md"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7f1df] text-3xl">
        {icon}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <h3 className="text-xl font-black text-[#111111]">
          {title}
        </h3>

        <span className="rounded-full bg-[#f5f7f4] px-3 py-1 text-sm font-black text-[#529027]">
          {number}
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-[#666666]">
        {description}
      </p>

      <p className="mt-4 text-sm font-black text-[#529027] group-hover:underline">
        Open {title} →
      </p>
    </Link>
  );
}

/* ===================================================== */
/* STATUS BADGE                                           */
/* ===================================================== */

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus =
    normalise(status) || "unknown";

  let className =
    "bg-[#f5f7f4] text-[#555555]";

  if (
    safeStatus === "open" ||
    safeStatus === "bidding" ||
    safeStatus === "pending"
  ) {
    className =
      "bg-amber-100 text-amber-800";
  }

  if (
    safeStatus === "assigned" ||
    safeStatus === "approved"
  ) {
    className =
      "bg-[#e7f1df] text-[#315c18]";
  }

  if (
    safeStatus === "completed"
  ) {
    className =
      "bg-green-100 text-green-800";
  }

  if (
    safeStatus === "rejected" ||
    safeStatus === "cancelled"
  ) {
    className =
      "bg-red-100 text-red-700";
  }

  if (
    safeStatus === "suspended"
  ) {
    className =
      "bg-gray-200 text-gray-700";
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {formatStatus(safeStatus)}
    </span>
  );
}

/* ===================================================== */
/* EMPTY CARD                                             */
/* ===================================================== */

function EmptyCard({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dde5d8] bg-white p-6 text-center text-sm font-semibold text-[#777777]">
      {text}
    </div>
  );
}

/* ===================================================== */
/* HELPERS                                                */
/* ===================================================== */

function normalise(
  value: string | null | undefined
) {
  return value?.trim().toLowerCase() || "";
}

function formatStatus(
  value: string | null | undefined
) {
  const safeValue =
    normalise(value) || "Unknown";

  return safeValue
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatMoney(
  value: number
) {
  return Number(value || 0).toFixed(2);
}

function uniqueCustomers(
  jobs: Job[]
) {
  return new Set(
    jobs
      .map((job) => job.customer_id)
      .filter(Boolean)
  ).size;
}