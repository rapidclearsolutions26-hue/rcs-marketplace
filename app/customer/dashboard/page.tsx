"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  preferred_time: string | null;
  status: string | null;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  journey_status: string | null;
  created_at: string;
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

export default function CustomerDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /*
   * =========================================================
   * LOAD DASHBOARD
   * =========================================================
   */

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        /*
         * -----------------------------------------------------
         * GET LOGGED IN CUSTOMER
         * -----------------------------------------------------
         */

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Customer auth error:", authError);

          setErrorMessage(
            "We couldn't verify your customer account."
          );

          return;
        }

        if (!user) {
          router.replace("/customer/login");
          return;
        }

        /*
         * -----------------------------------------------------
         * LOAD CUSTOMER JOBS
         * -----------------------------------------------------
         */

        const { data, error } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq("customer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          console.error("Customer jobs error:", error);

          setErrorMessage(
            error.message ||
              "We couldn't load your jobs."
          );

          return;
        }

        setJobs((data || []) as Job[]);
      } catch (error) {
        console.error(
          "Customer dashboard error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong loading your dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase]
  );

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
   * =========================================================
   * AUTO REFRESH
   * =========================================================
   *
   * Checks for new bids/status changes every 15 seconds.
   */

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadDashboard(true);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  async function handleLogout() {
    try {
      await supabase.auth.signOut();

      router.replace("/customer/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);

      setErrorMessage(
        "Unable to log out. Please try again."
      );
    }
  }

  /*
   * =========================================================
   * JOB GROUPS
   * =========================================================
   */

  const pendingJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);

      return (
        status === "pending" ||
        status === "new" ||
        status === "open"
      );
    });
  }, [jobs]);

  const biddingJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);

      return status === "bidding";
    });
  }, [jobs]);

  const activeJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);

      return (
        status === "assigned" ||
        status === "accepted" ||
        status === "booked" ||
        status === "in_progress" ||
        status === "in progress"
      );
    });
  }, [jobs]);

  const completedJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);

      return (
        status === "completed" ||
        status === "complete"
      );
    });
  }, [jobs]);

  const actionRequiredCount =
    biddingJobs.length;

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

            <p className="mt-5 text-lg font-black">
              Loading your account...
            </p>

            <p className="mt-2 text-sm text-[#71867c]">
              Getting your latest jobs
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * MAIN
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#06100c] pb-24 text-white">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur">

        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">

          <Link
            href="/"
            className="text-base font-black tracking-tight sm:text-lg"
          >
            RAPID CLEAR{" "}
            <span className="text-[#1BBB8C]">
              SOLUTIONS
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-[#29483a] px-3.5 py-2 text-xs font-bold text-[#b8c6c0] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
          >
            Log out
          </button>

        </div>

      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">

        {/* ================================================= */}
        {/* WELCOME */}
        {/* ================================================= */}

        <section>

          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
            Customer Portal
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Your dashboard
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#82958c] sm:text-base">
            Manage your collections and choose
            the right driver.
          </p>

        </section>

        {/* ================================================= */}
        {/* MAIN POST JOB BUTTON */}
        {/* ================================================= */}

        <Link
          href="/customer/post-job"
          className="mt-6 flex min-h-[64px] w-full items-center justify-center rounded-2xl bg-[#1BBB8C] px-5 text-base font-black text-[#06100c] shadow-lg shadow-[#1BBB8C]/10 transition active:scale-[0.98] hover:bg-[#16a77c]"
        >
          <span className="mr-2 text-xl">
            +
          </span>

          POST A NEW JOB
        </Link>

        {/* ================================================= */}
        {/* ACTION REQUIRED */}
        {/* ================================================= */}

        {actionRequiredCount > 0 && (
          <section className="mt-6">

            <Link
              href="/customer/quotes"
              className="block overflow-hidden rounded-2xl border border-[#3f8d24] bg-[#10230f] transition active:scale-[0.99]"
            >

              <div className="flex items-center gap-4 p-5">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1BBB8C] text-xl font-black text-[#06100c]">
                  £
                </div>

                <div className="min-w-0 flex-1">

                  <p className="text-xs font-black uppercase tracking-wide text-[#1BBB8C]">
                    Action required
                  </p>

                  <h2 className="mt-1 text-base font-black">
                    Driver quotes available
                  </h2>

                  <p className="mt-1 text-sm text-[#82958c]">
                    Tap to compare your quotes.
                  </p>

                </div>

                <div className="text-2xl font-black text-[#1BBB8C]">
                  →
                </div>

              </div>

              {actionRequiredCount > 1 && (
                <div className="border-t border-[#214333] px-5 py-3 text-xs font-bold text-[#91a99e]">
                  {actionRequiredCount} jobs have
                  quotes available
                </div>
              )}

            </Link>

          </section>
        )}

        {/* ================================================= */}
        {/* ACTIVE JOB */}
        {/* ================================================= */}

        {activeJobs.length > 0 && (
          <section className="mt-8">

            <SectionTitle
              eyebrow="Next up"
              title="Your collection"
            />

            <div className="space-y-3">

              {activeJobs.slice(0, 1).map(
                (job) => (
                  <ActiveJobCard
                    key={job.id}
                    job={job}
                  />
                )
              )}

            </div>

          </section>
        )}

        {/* ================================================= */}
        {/* QUICK MENU */}
        {/* ================================================= */}

        <section className="mt-8">

          <SectionTitle
            eyebrow="Quick access"
            title="What do you need?"
          />

          <div className="grid grid-cols-2 gap-3">

            <QuickAction
              href="/customer/quotes"
              icon="£"
              title="My Quotes"
              subtitle={
                actionRequiredCount > 0
                  ? `${actionRequiredCount} waiting`
                  : "View quotes"
              }
            />

            <QuickAction
              href="#my-jobs"
              icon="▣"
              title="My Jobs"
              subtitle={`${jobs.length} total`}
            />

            <QuickAction
              href="/customer/post-job"
              icon="+"
              title="New Job"
              subtitle="Request collection"
              primary
            />

            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={refreshing}
              className="flex min-h-[108px] flex-col justify-between rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 text-left transition active:scale-[0.98] disabled:opacity-60"
            >

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123529] text-lg font-black text-[#1BBB8C]">
                ↻
              </span>

              <span>
                <span className="block text-sm font-black">
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </span>

                <span className="mt-0.5 block text-xs text-[#71867c]">
                  Check for updates
                </span>
              </span>

            </button>

          </div>

        </section>

        {/* ================================================= */}
        {/* SMALL SUMMARY */}
        {/* ================================================= */}

        <section className="mt-8">

          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#17382b] bg-[#0b1b14]">

            <SummaryItem
              value={pendingJobs.length}
              label="Waiting"
            />

            <SummaryItem
              value={activeJobs.length}
              label="Active"
              border
            />

            <SummaryItem
              value={completedJobs.length}
              label="Completed"
              border
            />

          </div>

        </section>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#230e0e] p-5">

            <p className="text-sm font-semibold leading-6 text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => loadDashboard()}
              className="mt-3 text-sm font-black text-red-200 underline"
            >
              Try again
            </button>

          </div>
        )}

        {/* ================================================= */}
        {/* MY JOBS */}
        {/* ================================================= */}

        <section
          id="my-jobs"
          className="mt-10"
        >

          <div className="flex items-end justify-between gap-4">

            <SectionTitle
              eyebrow="Activity"
              title="My jobs"
            />

            {jobs.length > 0 && (
              <span className="mb-5 text-xs font-bold text-[#657a70]">
                {jobs.length} total
              </span>
            )}

          </div>

          {jobs.length === 0 ? (
            <EmptyJobs />
          ) : (
            <div className="space-y-3">

              {jobs.map((job) => (
                <CustomerJobCard
                  key={job.id}
                  job={job}
                />
              ))}

            </div>
          )}

        </section>

      </div>

      {/* ================================================= */}
      {/* MOBILE BOTTOM NAV */}
      {/* ================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#17382b] bg-[#081710]/95 backdrop-blur">

        <div className="mx-auto grid max-w-4xl grid-cols-4">

          <BottomNavItem
            href="/customer/dashboard"
            icon="⌂"
            label="Home"
            active
          />

          <BottomNavItem
            href="#my-jobs"
            icon="▣"
            label="Jobs"
          />

          <BottomNavItem
            href="/customer/quotes"
            icon="£"
            label="Quotes"
            badge={
              actionRequiredCount > 0
                ? actionRequiredCount
                : undefined
            }
          />

          <BottomNavItem
            href="/customer/post-job"
            icon="+"
            label="New Job"
          />

        </div>

      </nav>

    </main>
  );
}

/* ========================================================= */
/* ACTIVE JOB CARD                                           */
/* ========================================================= */

function ActiveJobCard({
  job,
}: {
  job: Job;
}) {
  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="block rounded-2xl border border-[#3f8d24] bg-[#0b1b14] p-5 transition active:scale-[0.99]"
    >

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#123529] text-xl">
          🚚
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-[#1BBB8C]">
                {job.reference ||
                  `RC-${String(job.id).padStart(6, "0")}`}
              </p>

              <h3 className="mt-1 font-black">
                {job.job_type ||
                  "Waste Collection"}
              </h3>

            </div>

            <StatusBadge
              status={job.status || "assigned"}
            />

          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <MiniDetail
              label="Date"
              value={
                job.preferred_date
                  ? formatDate(
                      job.preferred_date
                    )
                  : "Not set"
              }
            />

            <MiniDetail
              label="Time"
              value={
                job.preferred_time ||
                "Not set"
              }
            />

          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#214333] pt-4">

            <span className="text-xs font-bold text-[#71867c]">
              {job.postcode ||
                "Location not provided"}
            </span>

            <span className="text-sm font-black text-[#1BBB8C]">
              View →
            </span>

          </div>

        </div>

      </div>

    </Link>
  );
}

/* ========================================================= */
/* CUSTOMER JOB CARD                                         */
/* ========================================================= */

function CustomerJobCard({
  job,
}: {
  job: Job;
}) {
  const status = normaliseStatus(job.status);

  const isCompleted =
    status === "completed" ||
    status === "complete";

  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="block rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 transition active:scale-[0.99] hover:border-[#29483a]"
    >

      <div className="flex items-center gap-4">

        {/* ICON */}

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg ${
            isCompleted
              ? "bg-[#102019] text-[#657a70]"
              : "bg-[#123529] text-[#1BBB8C]"
          }`}
        >
          🚚
        </div>

        {/* MAIN */}

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">

            <p className="truncate text-sm font-black">
              {job.job_type ||
                "Waste Collection"}
            </p>

          </div>

          <p className="mt-1 truncate text-xs text-[#71867c]">
            {job.postcode ||
              "Postcode not provided"}
          </p>

          <div className="mt-2 flex items-center gap-2">

            <StatusBadge
              status={job.status || "pending"}
            />

            {job.preferred_date && (
              <span className="truncate text-xs text-[#657a70]">
                {formatDate(
                  job.preferred_date
                )}
              </span>
            )}

          </div>

        </div>

        {/* ARROW */}

        <div className="shrink-0 text-xl font-black text-[#52665d]">
          →
        </div>

      </div>

    </Link>
  );
}

/* ========================================================= */
/* QUICK ACTION                                              */
/* ========================================================= */

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  primary = false,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[108px] flex-col justify-between rounded-2xl border p-4 transition active:scale-[0.98] ${
        primary
          ? "border-[#3f8d24] bg-[#10230f]"
          : "border-[#17382b] bg-[#0b1b14]"
      }`}
    >

      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${
          primary
            ? "bg-[#1BBB8C] text-[#06100c]"
            : "bg-[#123529] text-[#1BBB8C]"
        }`}
      >
        {icon}
      </span>

      <span>

        <span className="block text-sm font-black">
          {title}
        </span>

        <span className="mt-0.5 block text-xs text-[#71867c]">
          {subtitle}
        </span>

      </span>

    </Link>
  );
}

/* ========================================================= */
/* BOTTOM NAV                                                */
/* ========================================================= */

function BottomNavItem({
  href,
  icon,
  label,
  active = false,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-bold ${
        active
          ? "text-[#1BBB8C]"
          : "text-[#687d73]"
      }`}
    >

      <span className="relative text-xl leading-none">

        {icon}

        {badge !== undefined && (
          <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1BBB8C] px-1 text-[9px] font-black text-[#06100c]">
            {badge > 9 ? "9+" : badge}
          </span>
        )}

      </span>

      <span>
        {label}
      </span>

    </Link>
  );
}

/* ========================================================= */
/* SUMMARY ITEM                                              */
/* ========================================================= */

function SummaryItem({
  value,
  label,
  border = false,
}: {
  value: number;
  label: string;
  border?: boolean;
}) {
  return (
    <div
      className={`px-3 py-4 text-center ${
        border
          ? "border-l border-[#17382b]"
          : ""
      }`}
    >

      <p className="text-xl font-black">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-bold text-[#657a70]">
        {label}
      </p>

    </div>
  );
}

/* ========================================================= */
/* MINI DETAIL                                               */
/* ========================================================= */

function MiniDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[10px] font-black uppercase tracking-wide text-[#657a70]">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-[#d5dfda]">
        {value}
      </p>

    </div>
  );
}

/* ========================================================= */
/* STATUS BADGE                                              */
/* ========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalised = normaliseStatus(status);

  let className =
    "border-[#29483a] bg-[#18271f] text-[#b8c6c0]";

  let text = formatStatus(status);

  if (
    normalised === "pending" ||
    normalised === "new" ||
    normalised === "open"
  ) {
    className =
      "border-amber-900/60 bg-amber-950/40 text-amber-300";

    text =
      normalised === "new"
        ? "New"
        : "Waiting";
  }

  if (normalised === "bidding") {
    className =
      "border-blue-900/60 bg-blue-950/40 text-blue-300";

    text = "Quotes";
  }

  if (
    normalised === "assigned" ||
    normalised === "accepted" ||
    normalised === "booked"
  ) {
    className =
      "border-[#3f8d24] bg-[#183017] text-[#1BBB8C]";

    text = "Booked";
  }

  if (
    normalised === "in_progress" ||
    normalised === "in progress"
  ) {
    className =
      "border-blue-900/60 bg-blue-950/40 text-blue-300";

    text = "In Progress";
  }

  if (
    normalised === "completed" ||
    normalised === "complete"
  ) {
    className =
      "border-green-900/60 bg-green-950/40 text-green-300";

    text = "Completed";
  }

  if (
    normalised === "cancelled" ||
    normalised === "canceled" ||
    normalised === "rejected"
  ) {
    className =
      "border-red-900/60 bg-red-950/40 text-red-300";
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${className}`}
    >
      {text}
    </span>
  );
}

/* ========================================================= */
/* SECTION TITLE                                             */
/* ========================================================= */

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4">

      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black">
        {title}
      </h2>

    </div>
  );
}

/* ========================================================= */
/* EMPTY STATE                                               */
/* ========================================================= */

function EmptyJobs() {
  return (
    <div className="rounded-2xl border border-dashed border-[#29483a] bg-[#081710] px-5 py-10 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123529] text-2xl">
        🚚
      </div>

      <h3 className="mt-5 text-xl font-black">
        No jobs yet
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#71867c]">
        Post a job and approved RCS drivers
        can send you quotes.
      </p>

      <Link
        href="/customer/post-job"
        className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[#1BBB8C] px-6 font-black text-[#06100c]"
      >
        POST YOUR FIRST JOB
      </Link>

    </div>
  );
}

/* ========================================================= */
/* HELPERS                                                   */
/* ========================================================= */

function normaliseStatus(
  status: string | null
) {
  return (status || "")
    .trim()
    .toLowerCase();
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(date: string) {
  const parsed = new Date(
    `${date}T00:00:00`
  );

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}