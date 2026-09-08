"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DriverBottomNav from "@/app/components/driver/DriverBottomNav";

type Job = {
  id: number;
  reference: string | null;
  customer_id: string | null;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  description: string | null;
  floor: string | null;
  stairs: boolean | null;
  access_notes: string | null;
  preferred_date: string | null;
  preferred_time: number | null;
  status: string | null;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  journey_status: string | null;
  created_at: string;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number;
  message: string | null;
  status: string | null;
};

type Driver = {
  id: string;
  full_name: string | null;
  approved: boolean | null;
  application_status: string | null;
};

const JOB_SELECT = `
  id,
  reference,
  customer_id,
  job_type,
  postcode,
  address,
  load_size,
  description,
  floor,
  stairs,
  access_notes,
  preferred_date,
  preferred_time,
  status,
  accepted_bid_id,
  assigned_driver_id,
  assigned_bid_id,
  journey_status,
  created_at
`;

export default function DriverDashboard() {
  const router = useRouter();

  const [driver, setDriver] =
    useState<Driver | null>(null);

  const [availableCount, setAvailableCount] =
    useState(0);

  const [pendingBidCount, setPendingBidCount] =
    useState(0);

  const [activeCount, setActiveCount] =
    useState(0);

  const [assignedCount, setAssignedCount] =
    useState(0);

  const [nextJob, setNextJob] =
    useState<Job | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

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
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/driver/login");
          return;
        }

        const {
          data: driverData,
          error: driverError,
        } = await supabase
          .from("drivers")
          .select(
            "id, full_name, approved, application_status"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (driverError) {
          console.error(
            "Driver loading error:",
            driverError
          );

          setErrorMessage(
            driverError.message ||
              "We couldn't load your driver account."
          );

          return;
        }

        if (!driverData) {
          setDriver(null);

          setErrorMessage(
            "Your driver account could not be found. Please contact Rapid Clear Solutions."
          );

          return;
        }

        const currentDriver =
          driverData as Driver;

        setDriver(currentDriver);

        if (
          !currentDriver.approved ||
          currentDriver.application_status !==
            "approved"
        ) {
          setAvailableCount(0);
          setPendingBidCount(0);
          setActiveCount(0);
          setAssignedCount(0);
          setNextJob(null);

          return;
        }

        /*
         * AVAILABLE JOBS
         */

        const {
          data: availableData,
          error: availableError,
        } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .in("status", [
            "open",
            "bidding",
          ])
          .order("created_at", {
            ascending: false,
          });

        if (availableError) {
          console.error(
            "Available jobs error:",
            availableError
          );
        } else {
          const availableJobs =
            ((availableData || []) as Job[]).filter(
              (job) =>
                !job.assigned_driver_id &&
                job.status !== "completed" &&
                job.status !== "cancelled"
            );

          setAvailableCount(
            availableJobs.length
          );
        }

        /*
         * DRIVER BIDS
         */

        const {
          data: bidsData,
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
          .eq("driver_id", user.id);

        if (bidsError) {
          console.error(
            "Driver bids error:",
            bidsError
          );
        } else {
          const bids =
            (bidsData || []) as Bid[];

          setPendingBidCount(
            bids.filter(
              (bid) =>
                !bid.status ||
                bid.status === "pending"
            ).length
          );
        }

        /*
         * ASSIGNED JOBS
         */

        const {
          data: assignedData,
          error: assignedError,
        } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq(
            "assigned_driver_id",
            user.id
          )
          .order("preferred_date", {
            ascending: true,
          });

        if (assignedError) {
          console.error(
            "Assigned jobs error:",
            assignedError
          );
        } else {
          const assignedJobs =
            (assignedData || []) as Job[];

          const activeJobs =
            assignedJobs.filter(
              (job) =>
                job.status ===
                "in_progress"
            );

          const assigned =
            assignedJobs.filter(
              (job) =>
                job.status ===
                  "assigned" ||
                job.status ===
                  "accepted" ||
                job.status ===
                  "in_progress"
            );

          setActiveCount(
            activeJobs.length
          );

          setAssignedCount(
            assigned.length
          );

          const upcoming =
            assignedJobs.find(
              (job) =>
                job.status ===
                  "assigned" ||
                job.status ===
                  "accepted"
            );

          setNextJob(
            upcoming || activeJobs[0] || null
          );
        }
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong loading the dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        loadDashboard(true);
      }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  async function logout() {
    try {
      const supabase = createClient();

      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }

    router.replace("/driver/login");
  }

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  if (!driver && errorMessage) {
    return (
      <ErrorScreen
        message={errorMessage}
        onRetry={() =>
          loadDashboard()
        }
        onLogout={logout}
      />
    );
  }

  if (
    driver &&
    (!driver.approved ||
      driver.application_status !==
        "approved")
  ) {
    return (
      <main className="min-h-screen bg-[#06100c] pb-20 text-white">
        <DriverHeader
          driver={driver}
          refreshing={refreshing}
          onRefresh={() =>
            loadDashboard()
          }
          onLogout={logout}
        />

        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123529] text-2xl font-black text-[#1BBB8C]">
              !
            </div>

            <h1 className="mt-6 text-2xl font-black">
              Application under review
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#8fa39a]">
              Your driver account needs to be approved
              before you can view and bid on available work.
            </p>

            <button
              type="button"
              onClick={logout}
              className="mt-7 min-h-12 rounded-xl bg-[#1BBB8C] px-6 py-3 font-black text-[#06100c]"
            >
              Log out
            </button>
          </div>
        </div>

        <DriverBottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] pb-24 text-white">
      <DriverHeader
        driver={driver}
        refreshing={refreshing}
        onRefresh={() =>
          loadDashboard()
        }
        onLogout={logout}
      />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-8">
        <section className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C] sm:text-xs">
            RCS Marketplace
          </p>

          <h1 className="mt-2 text-2xl font-black sm:text-4xl">
            Hi,{" "}
            {driver?.full_name?.split(
              " "
            )[0] || "Driver"}{" "}
            👋
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#82958c] sm:text-base">
            Find work, manage your bids and keep track of your collections.
          </p>

          {refreshing && (
            <p className="mt-3 text-xs font-bold text-[#1BBB8C]">
              Updating dashboard...
            </p>
          )}
        </section>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4">
            <p className="text-sm font-semibold text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDashboard()
              }
              className="mt-3 text-sm font-bold text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardBox
            href="/driver/jobs"
            icon="▣"
            title="Available Jobs"
            value={availableCount}
            description="Jobs to bid on"
          />

          <DashboardBox
            href="/driver/bids"
            icon="£"
            title="Pending Bids"
            value={pendingBidCount}
            description="Awaiting decision"
          />

          <DashboardBox
            href="/driver/assigned"
            icon="→"
            title="Active Jobs"
            value={activeCount}
            description="Currently in progress"
          />

          <DashboardBox
            href="/driver/assigned"
            icon="✓"
            title="Assigned Jobs"
            value={assignedCount}
            description="Your paid work"
          />
        </section>

        <section className="mt-7 sm:mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
                Quick view
              </p>

              <h2 className="mt-1 text-xl font-black sm:text-2xl">
                Your next job
              </h2>
            </div>

            <Link
              href="/driver/assigned"
              className="text-xs font-black text-[#1BBB8C]"
            >
              View all →
            </Link>
          </div>

          {nextJob ? (
            <NextJobCard
              job={nextJob}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123529] text-xl font-black text-[#1BBB8C]">
                ✓
              </div>

              <h3 className="mt-4 text-lg font-black">
                No assigned work
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#71857b]">
                Browse available jobs and place a bid to get started.
              </p>

              <Link
                href="/driver/jobs"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-black text-[#06100c]"
              >
                Find Available Jobs
              </Link>
            </div>
          )}
        </section>

        <section className="mt-7 pb-5 sm:mt-10">
          <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              Driver tools
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <QuickLink
                href="/driver/jobs"
                title="Find more work"
                description="Browse available customer jobs"
              />

              <QuickLink
                href="/driver/bids"
                title="Check your bids"
                description="See quotes waiting for a decision"
              />

              <QuickLink
                href="/driver/assigned"
                title="Manage collections"
                description="View your assigned jobs"
              />

              <QuickLink
                href="/driver/register"
                title="Driver account"
                description="View your driver area"
              />
            </div>
          </div>
        </section>
      </div>

      <DriverBottomNav />
    </main>
  );
}

function DriverHeader({
  driver,
  refreshing,
  onRefresh,
  onLogout,
}: {
  driver: Driver | null;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <Link
          href="/driver/dashboard"
          className="shrink-0 text-base font-black sm:text-xl"
        >
          <span className="hidden sm:inline">
            RAPID CLEAR{" "}
          </span>

          <span className="sm:hidden">
            RCS{" "}
          </span>

          <span className="text-[#1BBB8C]">
            MARKETPLACE
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#687d73]">
              Driver
            </p>

            <p className="max-w-[180px] truncate text-sm font-bold">
              {driver?.full_name ||
                "Driver"}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#29483a] text-lg font-black text-[#aabbb4] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:opacity-50 sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
            aria-label="Refresh"
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

          <button
            type="button"
            onClick={onLogout}
            className="h-10 rounded-xl border border-[#29483a] px-3 text-xs font-black text-[#c5d1cb] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] sm:px-4 sm:text-sm"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

function DashboardBox({
  href,
  icon,
  title,
  value,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 shadow-lg transition hover:-translate-y-0.5 hover:border-[#1BBB8C] sm:rounded-3xl sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#8b9d95] sm:text-sm">
          {title}
        </p>

        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#123529] text-sm font-black text-[#1BBB8C] transition group-hover:bg-[#1BBB8C] group-hover:text-[#06100c]">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-black sm:mt-4 sm:text-4xl">
        {value}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[10px] text-[#64786e] sm:text-sm">
          {description}
        </p>

        <span className="text-xs font-black text-[#1BBB8C]">
          →
        </span>
      </div>
    </Link>
  );
}

function NextJobCard({
  job,
}: {
  job: Job;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#3f8d24] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#214333] bg-[#10230f] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference ||
                `RC-${String(
                  job.id
                ).padStart(6, "0")}`}
            </p>

            <h3 className="mt-1 text-lg font-black sm:text-xl">
              {job.job_type ||
                "Waste Collection"}
            </h3>
          </div>

          <span className="rounded-full border border-[#3f8d24] bg-[#183017] px-2.5 py-1 text-[9px] font-black text-[#1BBB8C]">
            {job.status ===
            "in_progress"
              ? "IN PROGRESS"
              : "ASSIGNED"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <InfoItem
          label="Location"
          value={
            job.postcode ||
            "Not provided"
          }
        />

        <InfoItem
          label="Date"
          value={
            job.preferred_date
              ? formatDate(
                  job.preferred_date
                )
              : "Not provided"
          }
        />

        <InfoItem
          label="Time"
          value={formatPreferredTime(
            job.preferred_time
          )}
        />

        <InfoItem
          label="Load"
          value={
            job.load_size ||
            "Not specified"
          }
        />

        <InfoItem
          label="Journey"
          value={
            job.journey_status ||
            job.status ||
            "Assigned"
          }
        />
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Link
          href={`/driver/jobs/${job.id}`}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c] sm:text-base"
        >
          Manage Job →
        </Link>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wide text-[#657a70]">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-semibold leading-5 text-[#d5dfda] sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-[#214333] bg-[#07130e] p-4 transition hover:border-[#1BBB8C]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-[#71857b]">
            {description}
          </p>
        </div>

        <span className="text-[#1BBB8C]">
          →
        </span>
      </div>
    </Link>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06100c] px-5 text-white">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

        <p className="mt-5 text-lg font-black">
          Loading dashboard...
        </p>

        <p className="mt-2 text-sm text-[#71867c]">
          Checking your jobs
        </p>
      </div>
    </main>
  );
}

function ErrorScreen({
  message,
  onRetry,
  onLogout,
}: {
  message: string;
  onRetry: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="border-b border-[#17382b] bg-[#081710]">
        <div className="flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-base font-black"
          >
            RCS{" "}
            <span className="text-[#1BBB8C]">
              MARKETPLACE
            </span>
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-[#29483a] px-3 py-2 text-xs font-bold"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border border-red-900/50 bg-[#0b1b14] p-6 text-center">
          <h1 className="text-2xl font-black">
            Driver account problem
          </h1>

          <p className="mt-4 text-sm leading-6 text-[#8fa39a]">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-7 min-h-12 rounded-xl bg-[#1BBB8C] px-6 py-3 font-black text-[#06100c]"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}

function formatDate(date: string) {
  try {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return date;
  }
}

function formatPreferredTime(
  time: number | null
) {
  const numericTime = Number(time);

  if (numericTime === 8) {
    return "Morning · 8–12";
  }

  if (numericTime === 13) {
    return "Afternoon · 1–5";
  }

  if (numericTime === 18) {
    return "Evening · 6–8";
  }

  if (!time && time !== 0) {
    return "Not specified";
  }

  return "Time not specified";
}