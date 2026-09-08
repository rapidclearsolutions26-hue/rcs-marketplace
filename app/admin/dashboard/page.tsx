"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

type PayoutRequest = {
  id: number;
  driver_id: string;
  amount: number;
  status: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
};

type RealtimeState =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline";

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<
    PayoutRequest[]
  >([]);

  const [customersCount, setCustomersCount] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>("connecting");

  const refreshTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        const supabase = createClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session?.access_token) {
          throw new Error(
            "Your admin session has expired. Please log in again."
          );
        }

        const response = await fetch(
          "/api/admin/dashboard",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load admin dashboard."
          );
        }

        setJobs(
          Array.isArray(data.jobs)
            ? (data.jobs as Job[])
            : []
        );

        setDrivers(
          Array.isArray(data.drivers)
            ? (data.drivers as Driver[])
            : []
        );

        setBids(
          Array.isArray(data.bids)
            ? (data.bids as Bid[])
            : []
        );

        setPayoutRequests(
          Array.isArray(data.payoutRequests)
            ? (data.payoutRequests as PayoutRequest[])
            : []
        );

        setCustomersCount(
          typeof data.customersCount === "number"
            ? data.customersCount
            : 0
        );
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
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const supabase = createClient();

    setRealtimeState("connecting");

    const scheduleRealtimeRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        void loadDashboard(true);
      }, 250);
    };

    const channel = supabase
      .channel("admin-dashboard-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        () => {
          scheduleRealtimeRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers",
        },
        () => {
          scheduleRealtimeRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
        },
        () => {
          scheduleRealtimeRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_payout_requests",
        },
        () => {
          scheduleRealtimeRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          scheduleRealtimeRefresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeState("live");
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          setRealtimeState("reconnecting");
          return;
        }

        if (status === "CLOSED") {
          setRealtimeState("offline");
        }
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(
          refreshTimeoutRef.current
        );
      }

      void supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDashboard(true);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  /*
   * JOB STATS
   */

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
      normalise(job.status) === "completed" ||
      normalise(job.journey_status) === "completed"
  );

  /*
   * DRIVER STATS
   */

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

  /*
   * BID STATS
   */

  const acceptedBids = bids.filter(
    (bid) =>
      normalise(bid.status) === "accepted"
  );

  const pendingBids = bids.filter(
    (bid) =>
      !bid.status ||
      normalise(bid.status) === "pending"
  );

  /*
   * PAYMENT STATS
   */

  const paidJobs = jobs.filter(
    (job) =>
      normalise(job.payment_status) === "paid"
  );

  /*
   * FINANCIAL TOTALS
   */

  const totalAcceptedValue =
    acceptedBids.reduce(
      (total, bid) =>
        total + Number(bid.amount || 0),
      0
    );

  const totalRcsFees =
    acceptedBids.reduce(
      (total, bid) =>
        total + Number(bid.platform_fee || 0),
      0
    );

  const totalDriverPayouts =
    acceptedBids.reduce(
      (total, bid) =>
        total + Number(bid.driver_payout || 0),
      0
    );

  /*
   * PAYOUT REQUESTS
   */

  const pendingPayoutRequests =
    payoutRequests.filter(
      (request) =>
        normalise(request.status) ===
        "pending"
    );

  const totalPendingPayouts =
    pendingPayoutRequests.reduce(
      (total, request) =>
        total + Number(request.amount || 0),
      0
    );

  /*
   * RECENT
   */

  const recentJobs = jobs.slice(0, 5);
  const recentDrivers = drivers.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/admin/dashboard"
            className="shrink-0"
          >
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-11 w-auto object-contain sm:h-14"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            <RealtimeIndicator
              state={realtimeState}
            />

            <div className="hidden text-right sm:block">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
                RCS Admin
              </p>

              <p className="mt-1 text-xs text-[#71857b]">
                Marketplace Control Centre
              </p>
            </div>

            <div className="sm:hidden">
              <p className="text-right text-[10px] font-black uppercase tracking-widest text-[#1BBB8C]">
                ADMIN
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE NAV */}

      <div className="border-b border-[#17382b] bg-[#07130e] sm:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
          <MobileNavLink
            href="/admin/dashboard"
            label="Dashboard"
            active
          />

          <MobileNavLink
            href="/admin/jobs"
            label="Jobs"
          />

          <MobileNavLink
            href="/admin/drivers"
            label="Drivers"
          />

          <MobileNavLink
            href="/admin/bids"
            label="Bids"
          />

          <MobileNavLink
            href="/admin/payouts"
            label="Payouts"
          />
        </div>
      </div>

      {/* CONTENT */}

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-10">
        {/* INTRO */}

        <section className="mb-6 rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:mb-8 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C] sm:text-xs">
                Rapid Clear Solutions
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                Admin Control Centre
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#82958c] sm:text-base">
                Track marketplace activity, manage
                drivers and monitor jobs, payments and
                payouts from one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              disabled={
                loading || refreshing
              }
              className="min-h-12 rounded-xl border border-[#29483a] bg-[#07130e] px-5 py-3 text-sm font-black text-[#d5dfda] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Updating..."
                : loading
                  ? "Loading..."
                  : "Refresh Dashboard"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#17382b] pt-4">
            <RealtimeIndicator
              state={realtimeState}
              detailed
            />

            <span className="text-xs text-[#64786e]">
              Changes are updated automatically.
            </span>
          </div>
        </section>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-900/60 bg-[#230e0e] p-5">
            <p className="text-sm font-semibold leading-6 text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              className="mt-3 text-sm font-black text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* KEY NUMBERS */}

        <section>
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              Overview
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Marketplace at a glance
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatCard
              title="Total Jobs"
              number={jobs.length}
              description="All jobs"
              icon="JOB"
              href="/admin/jobs"
            />

            <StatCard
              title="Drivers"
              number={approvedDrivers.length}
              description="Approved"
              icon="DRV"
              href="/admin/drivers"
            />

            <StatCard
              title="Customers"
              number={customersCount}
              description="Registered customers"
              icon="CUS"
              href="/admin/customers"
            />

            <StatCard
              title="Accepted Value"
              number={`£${formatMoney(
                totalAcceptedValue
              )}`}
              description="Accepted bids"
              icon="£"
              href="/admin/jobs"
            />
          </div>
        </section>

        {/* ACTION CENTRE */}

        <section className="mt-7">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              Action Centre
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Needs your attention
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              href="/admin/drivers"
              label="Driver Applications"
              value={pendingDrivers.length}
              description="Applications waiting for review"
            />

            <ActionCard
              href="/admin/jobs"
              label="Open Jobs"
              value={openJobs.length}
              description="Jobs waiting for drivers"
            />

            <ActionCard
              href="/admin/bids"
              label="Pending Bids"
              value={pendingBids.length}
              description="Driver quotes awaiting decisions"
            />

            <ActionCard
              href="/admin/payouts"
              label="Driver Payouts"
              value={pendingPayoutRequests.length}
              description={
                pendingPayoutRequests.length > 0
                  ? `£${formatMoney(
                      totalPendingPayouts
                    )} waiting to be processed`
                  : "No payout requests waiting"
              }
              highlighted
            />
          </div>
        </section>

        {/* JOB OVERVIEW */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              Operations
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Job Overview
            </h2>

            <p className="mt-1 text-sm text-[#71857b]">
              Track every stage of the customer journey.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <OverviewCard
              title="Open / Bidding"
              number={openJobs.length}
              description="Waiting for drivers"
              link="/admin/jobs"
            />

            <OverviewCard
              title="Assigned"
              number={assignedJobs.length}
              description="Driver assigned"
              link="/admin/jobs"
            />

            <OverviewCard
              title="On The Way"
              number={onTheWayJobs.length}
              description="Driver travelling"
              link="/admin/jobs"
            />

            <OverviewCard
              title="In Progress"
              number={inProgressJobs.length}
              description="Collection underway"
              link="/admin/jobs"
            />

            <OverviewCard
              title="Completed"
              number={completedJobs.length}
              description="Finished jobs"
              link="/admin/jobs"
            />
          </div>
        </section>

        {/* DRIVER OVERVIEW */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              Workforce
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Driver Overview
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
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

        {/* FINANCE */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              Finance
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Financial Overview
            </h2>

            <p className="mt-1 text-sm text-[#71857b]">
              Marketplace payment and commission figures.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              description="Platform fees"
            />

            <FinanceCard
              title="Driver Payouts"
              value={`£${formatMoney(
                totalDriverPayouts
              )}`}
              description="Stored payouts"
            />

            <FinanceCard
              title="Paid Jobs"
              value={String(paidJobs.length)}
              description="Payment received"
            />
          </div>
        </section>

        {/* MANAGEMENT */}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              Management
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Marketplace Management
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ManagementCard
              href="/admin/jobs"
              title="Jobs"
              description="View and manage all marketplace jobs."
              number={jobs.length}
            />

            <ManagementCard
              href="/admin/drivers"
              title="Drivers"
              description="Review applications and manage drivers."
              number={drivers.length}
            />

            <ManagementCard
              href="/admin/customers"
              title="Customers"
              description="View registered customers."
              number={customersCount}
            />

            <ManagementCard
              href="/admin/bids"
              title="Bids"
              description="Review driver quotes and pricing."
              number={bids.length}
            />

            <ManagementCard
              href="/admin/payouts"
              title="Payouts"
              description="Review and process driver payments."
              number={pendingPayoutRequests.length}
              highlighted
            />
          </div>
        </section>

        {/* RECENT ACTIVITY */}

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* RECENT JOBS */}

          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
                  Latest Activity
                </p>

                <h2 className="mt-1 text-xl font-black sm:text-2xl">
                  Recent Jobs
                </h2>
              </div>

              <Link
                href="/admin/jobs"
                className="text-xs font-black text-[#1BBB8C] hover:underline sm:text-sm"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {recentJobs.length === 0 ? (
                <EmptyCard text="No jobs yet." />
              ) : (
                recentJobs.map((job) => (
                  <Link
                    href="/admin/jobs"
                    key={job.id}
                    className="block rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 transition hover:border-[#1BBB8C] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black sm:text-base">
                          {job.reference}
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-[#c0cdc6] sm:text-sm">
                          {job.job_type ||
                            "Job type not specified"}
                        </p>

                        <p className="mt-1 text-[11px] text-[#71857b]">
                          {job.postcode ||
                            "No postcode"}
                        </p>
                      </div>

                      <StatusBadge
                        status={job.status}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* RECENT DRIVERS */}

          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
                  Latest Activity
                </p>

                <h2 className="mt-1 text-xl font-black sm:text-2xl">
                  Recent Drivers
                </h2>
              </div>

              <Link
                href="/admin/drivers"
                className="text-xs font-black text-[#1BBB8C] hover:underline sm:text-sm"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {recentDrivers.length === 0 ? (
                <EmptyCard text="No drivers yet." />
              ) : (
                recentDrivers.map((driver) => (
                  <Link
                    href="/admin/drivers"
                    key={driver.id}
                    className="block rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 transition hover:border-[#1BBB8C] sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black sm:text-base">
                          {driver.full_name}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#71857b] sm:text-sm">
                          {driver.email}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          driver.application_status
                        }
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {/* PAYOUT CONTROL */}

        <section className="mt-8">
          <Link
            href="/admin/payouts"
            className="group block rounded-3xl border border-[#285c48] bg-[#0b1b14] p-5 shadow-xl transition hover:border-[#1BBB8C] sm:p-7"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
                  Driver Payments
                </p>

                <h2 className="mt-2 text-xl font-black sm:text-2xl">
                  Driver Payout Control
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#82958c]">
                  Review payout requests, check driver
                  payment information and process weekly
                  driver payments.
                </p>
              </div>

              <div className="flex min-h-12 items-center justify-center rounded-xl bg-[#1BBB8C] px-6 py-3 text-sm font-black text-[#06100c] transition group-hover:bg-[#16a77c]">
                Open Payouts
              </div>
            </div>
          </Link>
        </section>

        {/* FOOTER INFO */}

        <section className="mt-8 rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
                RCS Marketplace
              </p>

              <h2 className="mt-2 text-xl font-black">
                Operations Control Centre
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71857b]">
                Monitor customer jobs, driver activity,
                marketplace payments and driver payouts.
              </p>
            </div>

            <div className="rounded-2xl border border-[#285c48] bg-[#07130e] px-6 py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#657a70]">
                RCS Platform Fee
              </p>

              <p className="mt-1 text-3xl font-black text-[#1BBB8C]">
                10%
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ===================================================== */
/* REALTIME INDICATOR                                     */
/* ===================================================== */

function RealtimeIndicator({
  state,
  detailed = false,
}: {
  state: RealtimeState;
  detailed?: boolean;
}) {
  let label = "Connecting";
  let dotClass = "bg-amber-400";
  let textClass = "text-amber-300";

  if (state === "live") {
    label = "Live";
    dotClass = "bg-[#1BBB8C]";
    textClass = "text-[#1BBB8C]";
  }

  if (state === "reconnecting") {
    label = "Reconnecting";
    dotClass = "bg-amber-400";
    textClass = "text-amber-300";
  }

  if (state === "offline") {
    label = "Offline";
    dotClass = "bg-red-400";
    textClass = "text-red-300";
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-[#29483a] bg-[#07130e] ${
        detailed
          ? "px-3 py-1.5"
          : "px-2.5 py-1"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${dotClass} ${
          state === "live"
            ? "animate-pulse"
            : ""
        }`}
      />

      <span
        className={`text-[9px] font-black uppercase tracking-wider ${textClass}`}
      >
        {label}
      </span>
    </div>
  );
}

/* ===================================================== */
/* MOBILE NAV                                             */
/* ===================================================== */

function MobileNavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-black transition ${
        active
          ? "bg-[#1BBB8C] text-[#06100c]"
          : "border border-[#17382b] bg-[#0b1b14] text-[#9cafa6]"
      }`}
    >
      {label}
    </Link>
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
  href,
}: {
  title: string;
  number: number | string;
  description: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 shadow-lg transition hover:border-[#1BBB8C] sm:rounded-3xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wide text-[#1BBB8C] sm:text-xs">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-black sm:text-4xl">
            {number}
          </p>

          <p className="mt-1 truncate text-[10px] text-[#71857b] sm:text-sm">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#285c48] bg-[#123529] text-[9px] font-black text-[#1BBB8C] sm:h-12 sm:w-12 sm:text-[10px]">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-[10px] font-black text-[#1BBB8C] sm:text-xs">
        Open
      </div>
    </Link>
  );
}

/* ===================================================== */
/* ACTION CARD                                            */
/* ===================================================== */

function ActionCard({
  href,
  label,
  value,
  description,
  highlighted = false,
}: {
  href: string;
  label: string;
  value: number | string;
  description: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 transition hover:border-[#1BBB8C] sm:rounded-3xl sm:p-5 ${
        highlighted
          ? "border-[#1BBB8C] bg-[#0e251b]"
          : "border-[#17382b] bg-[#0b1b14]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-black sm:text-sm">
          {label}
        </p>

        <span className="text-xl font-black text-[#1BBB8C] sm:text-2xl">
          {value}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-5 text-[#71857b] sm:text-xs">
        {description}
      </p>
    </Link>
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
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 shadow-lg transition hover:border-[#1BBB8C] sm:p-5">
      <p className="text-xs font-black leading-5 sm:text-sm">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-[#1BBB8C] sm:text-3xl">
        {number}
      </p>

      <p className="mt-1 text-[10px] leading-4 text-[#71857b] sm:text-xs">
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
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 shadow-lg sm:rounded-3xl sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#1BBB8C] sm:text-xs">
        {title}
      </p>

      <p className="mt-2 truncate text-xl font-black sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-[#71857b] sm:text-sm">
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
  title,
  description,
  number,
  highlighted = false,
}: {
  href: string;
  title: string;
  description: string;
  number: number;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 shadow-lg transition hover:-translate-y-0.5 hover:border-[#1BBB8C] sm:rounded-3xl sm:p-6 ${
        highlighted
          ? "border-[#1BBB8C] bg-[#0e251b]"
          : "border-[#17382b] bg-[#0b1b14]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black sm:text-xl">
          {title}
        </h3>

        <span className="rounded-full border border-[#285c48] bg-[#07130e] px-2.5 py-1 text-[10px] font-black text-[#1BBB8C] sm:px-3 sm:text-xs">
          {number}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-5 text-[#71857b] sm:text-sm sm:leading-6">
        {description}
      </p>

      <p className="mt-3 text-[10px] font-black text-[#1BBB8C] sm:text-xs">
        Open {title}
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
    "border-[#29483a] bg-[#07130e] text-[#9cafa6]";

  if (
    safeStatus === "open" ||
    safeStatus === "bidding" ||
    safeStatus === "pending"
  ) {
    className =
      "border-amber-900/60 bg-amber-950/50 text-amber-300";
  }

  if (
    safeStatus === "assigned" ||
    safeStatus === "approved"
  ) {
    className =
      "border-[#285c48] bg-[#123529] text-[#1BBB8C]";
  }

  if (
    safeStatus === "completed" ||
    safeStatus === "paid"
  ) {
    className =
      "border-green-900/60 bg-green-950/40 text-green-300";
  }

  if (
    safeStatus === "rejected" ||
    safeStatus === "cancelled"
  ) {
    className =
      "border-red-900/60 bg-red-950/40 text-red-300";
  }

  if (safeStatus === "suspended") {
    className =
      "border-gray-700 bg-gray-900 text-gray-300";
  }

  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-[8px] font-black uppercase sm:px-2.5 sm:text-[10px] ${className}`}
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
    <div className="rounded-2xl border border-dashed border-[#29483a] bg-[#081710] p-6 text-center text-sm font-semibold text-[#71857b]">
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

function formatMoney(value: number) {
  return Number(value || 0).toFixed(2);
}