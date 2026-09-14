"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";
const BORDER = "rgba(121,197,28,0.16)";
const SOFT_BORDER = "rgba(255,255,255,0.07)";

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<
    PayoutRequest[]
  >([]);

  const [customersCount, setCustomersCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>("connecting");

  const [lastLiveUpdate, setLastLiveUpdate] =
    useState<Date | null>(null);

  const refreshTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const reconnectTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadDashboard = useCallback(async (silent = false) => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

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
          "Your admin session has expired. Please log in again.",
        );
      }

      const response = await fetch("/api/admin/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load admin dashboard.",
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setJobs(
        Array.isArray(data.jobs)
          ? data.jobs
          : [],
      );

      setDrivers(
        Array.isArray(data.drivers)
          ? data.drivers
          : [],
      );

      setBids(
        Array.isArray(data.bids)
          ? data.bids
          : [],
      );

      setPayoutRequests(
        Array.isArray(data.payoutRequests)
          ? data.payoutRequests
          : [],
      );

      setCustomersCount(
        Number(data.customersCount || 0),
      );

      setLastLiveUpdate(new Date());
    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error,
      );

      if (mountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load admin dashboard.",
        );
      }
    } finally {
      loadingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void loadDashboard();

    return () => {
      mountedRef.current = false;
    };
  }, [loadDashboard]);

  useEffect(() => {
    const supabase = createClient();

    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let reconnectAttempts = 0;
    let destroyed = false;

    const clearTimers = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const scheduleRefresh = () => {
      if (destroyed) {
        return;
      }

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;

        if (destroyed) {
          return;
        }

        void loadDashboard(true);
      }, 300);
    };

    const subscribe = () => {
      if (destroyed) {
        return;
      }

      setRealtimeState(
        reconnectAttempts === 0
          ? "connecting"
          : "reconnecting",
      );

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(
          `admin-dashboard-live-${Date.now()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
          },
          () => {
            setLastLiveUpdate(new Date());
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "drivers",
          },
          () => {
            setLastLiveUpdate(new Date());
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bids",
          },
          () => {
            setLastLiveUpdate(new Date());
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "driver_payout_requests",
          },
          () => {
            setLastLiveUpdate(new Date());
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: "role=eq.customer",
          },
          () => {
            setLastLiveUpdate(new Date());
            scheduleRefresh();
          },
        )
        .subscribe((status) => {
          if (destroyed) {
            return;
          }

          if (status === "SUBSCRIBED") {
            reconnectAttempts = 0;
            setRealtimeState("live");
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT"
          ) {
            setRealtimeState("reconnecting");

            reconnectAttempts += 1;

            const delay = Math.min(
              30000,
              Math.max(
                2000,
                reconnectAttempts * 2000,
              ),
            );

            if (reconnectTimeoutRef.current) {
              clearTimeout(
                reconnectTimeoutRef.current,
              );
            }

            reconnectTimeoutRef.current = setTimeout(
              () => {
                reconnectTimeoutRef.current = null;

                if (!destroyed) {
                  subscribe();
                }
              },
              delay,
            );

            return;
          }

          if (status === "CLOSED") {
            setRealtimeState("offline");

            reconnectAttempts += 1;

            const delay = Math.min(
              30000,
              Math.max(
                2000,
                reconnectAttempts * 2000,
              ),
            );

            if (reconnectTimeoutRef.current) {
              clearTimeout(
                reconnectTimeoutRef.current,
              );
            }

            reconnectTimeoutRef.current = setTimeout(
              () => {
                reconnectTimeoutRef.current = null;

                if (!destroyed) {
                  subscribe();
                }
              },
              delay,
            );
          }
        });
    };

    subscribe();

    const handleOnline = () => {
      reconnectAttempts = 0;

      if (!destroyed) {
        subscribe();
      }

      void loadDashboard(true);
    };

    const handleOffline = () => {
      setRealtimeState("offline");
    };

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    return () => {
      destroyed = true;

      clearTimers();

      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
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

  const openJobs = jobs.filter((job) =>
    ["open", "bidding"].includes(
      normalise(job.status),
    ),
  );

  const assignedJobs = jobs.filter(
    (job) =>
      normalise(job.status) === "assigned",
  );

  const onTheWayJobs = jobs.filter(
    (job) =>
      normalise(job.journey_status) ===
      "on_the_way",
  );

  const inProgressJobs = jobs.filter(
    (job) =>
      normalise(job.journey_status) ===
      "in_progress",
  );

  const completedJobs = jobs.filter(
    (job) =>
      normalise(job.status) === "completed" ||
      normalise(job.journey_status) ===
        "completed",
  );

  const pendingDrivers = drivers.filter(
    (driver) =>
      normalise(
        driver.application_status,
      ) === "pending",
  );

  const approvedDrivers = drivers.filter(
    (driver) =>
      normalise(
        driver.application_status,
      ) === "approved" ||
      driver.approved === true,
  );

  const suspendedDrivers = drivers.filter(
    (driver) =>
      normalise(
        driver.application_status,
      ) === "suspended",
  );

  const acceptedBids = bids.filter(
    (bid) =>
      normalise(bid.status) === "accepted",
  );

  const pendingBids = bids.filter(
    (bid) =>
      !bid.status ||
      normalise(bid.status) === "pending",
  );

  const paidJobs = jobs.filter(
    (job) =>
      normalise(job.payment_status) === "paid",
  );

  const totalAcceptedValue =
    acceptedBids.reduce(
      (total, bid) =>
        total + Number(bid.amount || 0),
      0,
    );

  const totalRcsFees =
    acceptedBids.reduce(
      (total, bid) =>
        total + Number(bid.platform_fee || 0),
      0,
    );

  const totalDriverPayouts =
    acceptedBids.reduce(
      (total, bid) =>
        total + Number(bid.driver_payout || 0),
      0,
    );

  const pendingPayoutRequests =
    payoutRequests.filter(
      (request) =>
        normalise(request.status) === "pending",
    );

  const totalPendingPayouts =
    pendingPayoutRequests.reduce(
      (total, request) =>
        total + Number(request.amount || 0),
      0,
    );

  if (loading) {
    return (
      <main
        className="min-h-screen text-white"
        style={{ background: BG }}
      >
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div
              className="mx-auto h-11 w-11 animate-spin rounded-full border-4"
              style={{
                borderColor:
                  "rgba(255,255,255,0.07)",
                borderTopColor: GREEN,
              }}
            />

            <p className="mt-5 text-lg font-black">
              Loading admin dashboard...
            </p>

            <p className="mt-2 text-sm text-white/35">
              Getting the latest marketplace data
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden text-white"
      style={{ background: BG }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: ${BG};
        }

        .admin-scroll::-webkit-scrollbar {
          height: 4px;
        }

        .admin-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .admin-scroll::-webkit-scrollbar-thumb {
          background: rgba(121, 197, 28, 0.3);
          border-radius: 999px;
        }

        .admin-card {
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .admin-card:hover {
          transform: translateY(-2px);
          border-color: rgba(
            121,
            197,
            28,
            0.34
          ) !important;
          background: #0c110c !important;
        }

        .admin-link:hover {
          color: ${GREEN_HOVER} !important;
        }
      `}</style>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          borderColor: BORDER,
          background:
            "rgba(5,7,5,0.96)",
          paddingTop:
            "env(safe-area-inset-top)",
        }}
      >
        <div className="mx-auto flex min-h-[70px] max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[78px] sm:px-6 lg:px-8">
          <Link
            href="/admin/dashboard"
            className="shrink-0"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={180}
              height={55}
              priority
              className="h-9 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <RealtimeIndicator
              state={realtimeState}
            />

            <button
              type="button"
              onClick={async () => {
                await createClient()
                  .auth
                  .signOut();

                window.location.href =
                  "/admin/login";
              }}
              className="min-h-[42px] rounded-xl border px-3 text-[10px] font-black transition sm:px-4 sm:text-xs"
              style={{
                borderColor:
                  "rgba(255,255,255,0.10)",
                background: CARD,
                color:
                  "rgba(255,255,255,0.70)",
              }}
            >
              LOG OUT
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================== */}
      {/* MOBILE BACK */}
      {/* ====================================================== */}

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
          className="flex min-h-[46px] w-full items-center justify-center rounded-xl border text-xs font-black"
          style={{
            borderColor:
              "rgba(121,197,28,0.20)",
            background:
              "rgba(121,197,28,0.05)",
            color: GREEN,
          }}
        >
          ADMIN CONTROL CENTRE
        </Link>
      </div>

      {/* ====================================================== */}
      {/* NAV */}
      {/* ====================================================== */}

      <nav
        className="border-b"
        style={{
          borderColor:
            "rgba(255,255,255,0.06)",
          background: SECTION,
        }}
      >
        <div
          className="admin-scroll mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8"
          style={{
            WebkitOverflowScrolling:
              "touch",
          }}
        >
          <AdminNavLink
            href="/admin/dashboard"
            label="Dashboard"
            active
          />

          <AdminNavLink
            href="/admin/jobs"
            label="Jobs"
            badge={
              openJobs.length > 0
                ? openJobs.length
                : undefined
            }
          />

          <AdminNavLink
            href="/admin/drivers"
            label="Drivers"
            badge={
              pendingDrivers.length > 0
                ? pendingDrivers.length
                : undefined
            }
          />

          <AdminNavLink
            href="/admin/customers"
            label="Customers"
          />

          <AdminNavLink
            href="/admin/bids"
            label="Bids"
            badge={
              pendingBids.length > 0
                ? pendingBids.length
                : undefined
            }
          />

          <AdminNavLink
            href="/admin/payouts"
            label="Payouts"
            badge={
              pendingPayoutRequests.length >
              0
                ? pendingPayoutRequests.length
                : undefined
            }
          />
        </div>
      </nav>

      {/* ====================================================== */}
      {/* CONTENT */}
      {/* ====================================================== */}

      <div
        className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8"
        style={{
          paddingBottom:
            "calc(2rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* HERO */}

        <section
          className="mb-6 overflow-hidden rounded-3xl border p-5 sm:mb-8 sm:p-7"
          style={{
            borderColor: BORDER,
            background: SECTION,
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs" style={{ color: GREEN }}>
                Rapid Clear Solutions
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                Admin Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">
                Your marketplace control centre.
                Monitor jobs, drivers, customers,
                bids and payments in real time.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              disabled={refreshing}
              className="min-h-[48px] rounded-xl px-5 text-sm font-black transition disabled:opacity-50"
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
              {refreshing
                ? "UPDATING..."
                : "REFRESH DASHBOARD"}
            </button>
          </div>

          <div
            className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4"
            style={{
              borderColor:
                "rgba(255,255,255,0.07)",
            }}
          >
            <RealtimeIndicator
              state={realtimeState}
              detailed
            />

            <span className="text-xs text-white/30">
              {realtimeState === "live"
                ? "Live marketplace updates enabled."
                : "Connecting to live updates..."}
            </span>

            {lastLiveUpdate && (
              <span className="text-xs text-white/20">
                Updated{" "}
                {lastLiveUpdate.toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  },
                )}
              </span>
            )}
          </div>
        </section>

        {/* ERROR */}

        {errorMessage && (
          <section className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 sm:p-5">
            <p className="text-sm font-bold leading-6 text-red-200">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              className="mt-3 text-xs font-black text-red-200 underline"
            >
              TRY AGAIN
            </button>
          </section>
        )}

        {/* ====================================================== */}
        {/* MAIN STATS */}
        {/* ====================================================== */}

        <SectionHeading
          eyebrow="Overview"
          title="Marketplace at a glance"
        />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Jobs"
            number={jobs.length}
            description="All marketplace jobs"
            icon="JOB"
            href="/admin/jobs"
          />

          <StatCard
            title="Approved Drivers"
            number={approvedDrivers.length}
            description="Active drivers"
            icon="DRV"
            href="/admin/drivers"
          />

          <StatCard
            title="Customers"
            number={customersCount}
            description="Registered accounts"
            icon="CUS"
            href="/admin/customers"
          />

          <StatCard
            title="Accepted Value"
            number={`£${formatMoney(
              totalAcceptedValue,
            )}`}
            description="Accepted driver bids"
            icon="£"
            href="/admin/jobs"
          />
        </section>

        {/* ====================================================== */}
        {/* ATTENTION */}
        {/* ====================================================== */}

        <div className="mt-7 sm:mt-9">
          <SectionHeading
            eyebrow="Action Centre"
            title="Needs your attention"
          />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              href="/admin/drivers"
              label="Driver Applications"
              value={pendingDrivers.length}
              description="Applications waiting for review"
              highlighted={
                pendingDrivers.length > 0
              }
            />

            <ActionCard
              href="/admin/jobs"
              label="Open Jobs"
              value={openJobs.length}
              description="Jobs waiting for drivers"
              highlighted={
                openJobs.length > 0
              }
            />

            <ActionCard
              href="/admin/bids"
              label="Pending Bids"
              value={pendingBids.length}
              description="Driver quotes awaiting decisions"
              highlighted={
                pendingBids.length > 0
              }
            />

            <ActionCard
              href="/admin/payouts"
              label="Driver Payouts"
              value={
                pendingPayoutRequests.length
              }
              description={
                pendingPayoutRequests.length
                  ? `£${formatMoney(
                      totalPendingPayouts,
                    )} waiting to process`
                  : "No payout requests waiting"
              }
              highlighted={
                pendingPayoutRequests.length > 0
              }
            />
          </section>
        </div>

        {/* ====================================================== */}
        {/* OPERATIONS */}
        {/* ====================================================== */}

        <div className="mt-7 sm:mt-9">
          <SectionHeading
            eyebrow="Operations"
            title="Job Overview"
            description="Track every stage of the customer journey."
          />

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          </section>
        </div>

        {/* ====================================================== */}
        {/* DRIVERS */}
        {/* ====================================================== */}

        <div className="mt-7 sm:mt-9">
          <SectionHeading
            eyebrow="Workforce"
            title="Driver Overview"
          />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          </section>
        </div>

        {/* ====================================================== */}
        {/* FINANCE */}
        {/* ====================================================== */}

        <div className="mt-7 sm:mt-9">
          <SectionHeading
            eyebrow="Finance"
            title="Financial Overview"
            description="Marketplace payment and commission figures."
          />

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceCard
              title="Accepted Value"
              value={`£${formatMoney(
                totalAcceptedValue,
              )}`}
              description="Accepted bids"
            />

            <FinanceCard
              title="RCS Fees"
              value={`£${formatMoney(
                totalRcsFees,
              )}`}
              description="Platform fees"
            />

            <FinanceCard
              title="Driver Payouts"
              value={`£${formatMoney(
                totalDriverPayouts,
              )}`}
              description="Driver earnings"
            />

            <FinanceCard
              title="Paid Jobs"
              value={String(
                paidJobs.length,
              )}
              description="Payment received"
            />
          </section>
        </div>

        {/* ====================================================== */}
        {/* MANAGEMENT */}
        {/* ====================================================== */}

        <div className="mt-7 sm:mt-9">
          <SectionHeading
            eyebrow="Management"
            title="Marketplace Management"
          />

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ManagementCard
              href="/admin/jobs"
              title="Jobs"
              description="View and manage marketplace jobs."
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
              description="View customers and their jobs."
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
              description="Review driver payments."
              number={
                pendingPayoutRequests.length
              }
              highlighted={
                pendingPayoutRequests.length > 0
              }
            />
          </section>
        </div>

        {/* ====================================================== */}
        {/* RECENT ACTIVITY */}
        {/* ====================================================== */}

        <section className="mt-7 grid gap-7 lg:grid-cols-2">
          <RecentJobs
            jobs={jobs.slice(0, 5)}
          />

          <RecentDrivers
            drivers={drivers.slice(0, 5)}
          />
        </section>

        {/* ====================================================== */}
        {/* PAYOUT CONTROL */}
        {/* ====================================================== */}

        <section className="mt-7">
          <Link
            href="/admin/payouts"
            className="admin-card block rounded-3xl border p-5 sm:p-7"
            style={{
              borderColor: BORDER,
              background: SECTION,
            }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ color: GREEN }}
                >
                  Driver Payments
                </p>

                <h2 className="mt-2 text-xl font-black sm:text-2xl">
                  Driver Payout Control
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                  Review payout requests, check
                  driver payment information and
                  process driver payments.
                </p>
              </div>

              <div
                className="flex min-h-[48px] items-center justify-center rounded-xl px-5 text-sm font-black"
                style={{
                  background: GREEN,
                  color: BG,
                }}
              >
                OPEN PAYOUTS
              </div>
            </div>
          </Link>
        </section>

        {/* ====================================================== */}
        {/* FOOTER CONTROL */}
        {/* ====================================================== */}

        <section
          className="mt-7 rounded-3xl border p-5 sm:p-7"
          style={{
            borderColor: BORDER,
            background: CARD,
          }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: GREEN }}
              >
                RCS Marketplace
              </p>

              <h2 className="mt-2 text-xl font-black">
                Operations Control Centre
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                Monitor customer jobs, driver
                activity, marketplace payments and
                driver payouts from one dashboard.
              </p>
            </div>

            <div
              className="rounded-2xl border px-6 py-4 text-center"
              style={{
                borderColor: BORDER,
                background:
                  "rgba(121,197,28,0.06)",
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-white/25">
                RCS Platform Fee
              </p>

              <p
                className="mt-1 text-3xl font-black"
                style={{ color: GREEN }}
              >
                10%
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================ */
/* COMPONENTS */
/* ============================================================ */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <p
        className="text-[10px] font-black uppercase tracking-[0.18em] sm:text-xs"
        style={{ color: GREEN }}
      >
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-white/30">
          {description}
        </p>
      )}
    </div>
  );
}

function AdminNavLink({
  href,
  label,
  active = false,
  badge,
}: {
  href: string;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-black transition sm:px-4 sm:text-sm"
      style={{
        background: active
          ? GREEN
          : "rgba(255,255,255,0.025)",
        color: active
          ? BG
          : "rgba(255,255,255,0.55)",
        borderColor: active
          ? GREEN
          : SOFT_BORDER,
      }}
    >
      {label}

      {badge !== undefined && (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[9px] font-black"
          style={{
            background: active
              ? BG
              : "rgba(121,197,28,0.12)",
            color: active
              ? GREEN
              : GREEN,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function RealtimeIndicator({
  state,
  detailed = false,
}: {
  state: RealtimeState;
  detailed?: boolean;
}) {
  let label = "Connecting";
  let dot = "#f0b429";
  let text = "#f6d68a";

  if (state === "live") {
    label = "Live";
    dot = GREEN;
    text = "#b8ef7a";
  }

  if (state === "reconnecting") {
    label = "Reconnecting";
  }

  if (state === "offline") {
    label = "Offline";
    dot = "#f87171";
    text = "#fca5a5";
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${
        detailed
          ? "px-3 py-1.5"
          : "px-2.5 py-1"
      }`}
      style={{
        background:
          "rgba(255,255,255,0.025)",
        borderColor: SOFT_BORDER,
      }}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          state === "live"
            ? "animate-pulse"
            : ""
        }`}
        style={{
          background: dot,
        }}
      />

      <span
        className="text-[9px] font-black uppercase tracking-wider"
        style={{
          color: text,
        }}
      >
        {label}
      </span>
    </div>
  );
}

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
      className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-6"
      style={{
        background: CARD,
        borderColor: SOFT_BORDER,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-[9px] font-black uppercase tracking-wide sm:text-xs"
            style={{ color: GREEN }}
          >
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-black sm:text-4xl">
            {number}
          </p>

          <p className="mt-1 truncate text-[10px] text-white/25 sm:text-xs">
            {description}
          </p>
        </div>

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[8px] font-black sm:h-11 sm:w-11 sm:text-[9px]"
          style={{
            borderColor: BORDER,
            background:
              "rgba(121,197,28,0.07)",
            color: GREEN,
          }}
        >
          {icon}
        </div>
      </div>

      <p
        className="mt-3 text-[9px] font-black sm:text-xs"
        style={{ color: GREEN }}
      >
        OPEN →
      </p>
    </Link>
  );
}

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
      className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-5"
      style={{
        background: highlighted
          ? "rgba(121,197,28,0.07)"
          : CARD,
        borderColor: highlighted
          ? "rgba(121,197,28,0.30)"
          : SOFT_BORDER,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-black">
          {label}
        </p>

        <span
          className="text-2xl font-black"
          style={{ color: GREEN }}
        >
          {value}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-white/25">
        {description}
      </p>

      <p
        className="mt-3 text-[10px] font-black"
        style={{ color: GREEN }}
      >
        OPEN →
      </p>
    </Link>
  );
}

function OverviewCard({
  title,
  number,
  description,
  link,
}: {
  title: string;
  number: number;
  description: string;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-5"
      style={{
        background: CARD,
        borderColor: SOFT_BORDER,
      }}
    >
      <p className="text-xs font-black leading-5 sm:text-sm">
        {title}
      </p>

      <p
        className="mt-2 text-2xl font-black sm:text-3xl"
        style={{ color: GREEN }}
      >
        {number}
      </p>

      <p className="mt-1 text-[10px] leading-4 text-white/25 sm:text-xs">
        {description}
      </p>
    </Link>
  );
}

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
    <div
      className="rounded-2xl border p-4 sm:rounded-3xl sm:p-6"
      style={{
        background: CARD,
        borderColor: SOFT_BORDER,
      }}
    >
      <p
        className="text-[9px] font-black uppercase tracking-wide sm:text-xs"
        style={{ color: GREEN }}
      >
        {title}
      </p>

      <p className="mt-2 truncate text-xl font-black sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-white/25 sm:text-xs">
        {description}
      </p>
    </div>
  );
}

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
      className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-6"
      style={{
        background: highlighted
          ? "rgba(121,197,28,0.07)"
          : CARD,
        borderColor: highlighted
          ? "rgba(121,197,28,0.30)"
          : SOFT_BORDER,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black sm:text-lg">
          {title}
        </h3>

        <span
          className="rounded-full border px-2 py-1 text-[9px] font-black"
          style={{
            borderColor: BORDER,
            background:
              "rgba(121,197,28,0.06)",
            color: GREEN,
          }}
        >
          {number}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-5 text-white/25 sm:text-xs sm:leading-6">
        {description}
      </p>

      <p
        className="mt-3 text-[9px] font-black sm:text-xs"
        style={{ color: GREEN }}
      >
        OPEN {title.toUpperCase()} →
      </p>
    </Link>
  );
}

function RecentJobs({
  jobs,
}: {
  jobs: Job[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: GREEN }}
          >
            Latest Activity
          </p>

          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            Recent Jobs
          </h2>
        </div>

        <Link
          href="/admin/jobs"
          className="admin-link text-xs font-black sm:text-sm"
          style={{ color: GREEN }}
        >
          VIEW ALL
        </Link>
      </div>

      <div className="space-y-3">
        {jobs.length === 0 ? (
          <EmptyCard text="No jobs yet." />
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href="/admin/jobs"
              className="admin-card block rounded-2xl border p-4 sm:p-5"
              style={{
                background: CARD,
                borderColor: SOFT_BORDER,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black sm:text-base">
                    {job.reference}
                  </p>

                  <p className="mt-1 truncate text-xs font-semibold text-white/45 sm:text-sm">
                    {job.job_type ||
                      "Waste removal"}
                  </p>

                  <p className="mt-1 text-[10px] text-white/20 sm:text-xs">
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
    </section>
  );
}

function RecentDrivers({
  drivers,
}: {
  drivers: Driver[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: GREEN }}
          >
            Latest Activity
          </p>

          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            Recent Drivers
          </h2>
        </div>

        <Link
          href="/admin/drivers"
          className="admin-link text-xs font-black sm:text-sm"
          style={{ color: GREEN }}
        >
          VIEW ALL
        </Link>
      </div>

      <div className="space-y-3">
        {drivers.length === 0 ? (
          <EmptyCard text="No drivers yet." />
        ) : (
          drivers.map((driver) => (
            <Link
              key={driver.id}
              href="/admin/drivers"
              className="admin-card block rounded-2xl border p-4 sm:p-5"
              style={{
                background: CARD,
                borderColor: SOFT_BORDER,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black sm:text-base">
                    {driver.full_name}
                  </p>

                  <p className="mt-1 truncate text-xs text-white/25 sm:text-sm">
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
    </section>
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
  const safe =
    normalise(status) || "unknown";

  let background =
    "rgba(255,255,255,0.025)";

  let border = SOFT_BORDER;
  let text = "#a1a1aa";

  if (
    ["open", "bidding", "pending"].includes(
      safe,
    )
  ) {
    background =
      "rgba(240,180,41,0.10)";
    border =
      "rgba(240,180,41,0.28)";
    text = "#f6d68a";
  } else if (
    [
      "assigned",
      "approved",
      "completed",
      "paid",
    ].includes(safe)
  ) {
    background =
      "rgba(121,197,28,0.10)";
    border =
      "rgba(121,197,28,0.28)";
    text = "#b8ef7a";
  } else if (
    ["rejected", "cancelled"].includes(
      safe,
    )
  ) {
    background =
      "rgba(127,29,29,0.14)";
    border =
      "rgba(248,113,113,0.24)";
    text = "#fca5a5";
  }

  return (
    <span
      className="inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-[8px] font-black uppercase sm:px-2.5 sm:text-[10px]"
      style={{
        background,
        borderColor: border,
        color: text,
      }}
    >
      {formatStatus(safe)}
    </span>
  );
}

function EmptyCard({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="rounded-2xl border border-dashed p-6 text-center text-sm font-semibold"
      style={{
        background: CARD,
        borderColor: SOFT_BORDER,
        color: "rgba(255,255,255,0.20)",
      }}
    >
      {text}
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
  return (
    normalise(value) || "unknown"
  )
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatMoney(value: number) {
  return Number(value || 0).toFixed(2);
}