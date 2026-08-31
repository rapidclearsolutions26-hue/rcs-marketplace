"use client";

import { useCallback, useEffect, useState } from "react";
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

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

        /*
         * ================================================
         * GET LOGGED IN CUSTOMER
         * ================================================
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
         * ================================================
         * LOAD CUSTOMER JOBS
         * ================================================
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
    [router]
  );

  /*
   * ================================================
   * INITIAL LOAD
   * ================================================
   */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
   * ================================================
   * AUTO REFRESH
   * ================================================
   *
   * This checks for new bids / status changes.
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
   * ================================================
   * LOGOUT
   * ================================================
   */

  async function handleLogout() {
    try {
      const supabase = createClient();

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
   * ================================================
   * JOB FILTERS
   * ================================================
   */

  const pendingJobs = jobs.filter((job) => {
    const status = normaliseStatus(job.status);

    return (
      status === "pending" ||
      status === "open" ||
      status === "bidding" ||
      status === "new"
    );
  });

  const quotedJobs = jobs.filter((job) => {
    const status = normaliseStatus(job.status);

    return (
      status === "bidding" ||
      status === "open"
    );
  });

  const activeJobs = jobs.filter((job) => {
    const status = normaliseStatus(job.status);

    return (
      status === "assigned" ||
      status === "accepted" ||
      status === "booked" ||
      status === "in_progress" ||
      status === "in progress"
    );
  });

  const completedJobs = jobs.filter((job) => {
    const status = normaliseStatus(job.status);

    return (
      status === "completed" ||
      status === "complete"
    );
  });

  /*
   * ================================================
   * LOADING SCREEN
   * ================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

            <p className="mt-5 text-lg font-black">
              Loading your dashboard...
            </p>

            <p className="mt-2 text-sm text-[#71867c]">
              Checking your jobs and quotes
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ================================================
   * MAIN DASHBOARD
   * ================================================
   */

  return (
    <main className="min-h-screen bg-[#06100c] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

          <Link
            href="/"
            className="text-lg font-black sm:text-xl"
          >
            RAPID CLEAR{" "}
            <span className="text-[#1BBB8C]">
              SOLUTIONS
            </span>
          </Link>

          <div className="flex items-center gap-3">

            <Link
              href="/customer/post-job"
              className="hidden rounded-xl bg-[#1BBB8C] px-5 py-2.5 text-sm font-black text-[#06100c] hover:bg-[#16a77c] sm:block"
            >
              + Post a Job
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#29483a] px-4 py-2.5 text-sm font-bold text-[#c5d1cb] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
            >
              Log out
            </button>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-10">

        {/* ============================================ */}
        {/* MOBILE POST JOB */}
        {/* ============================================ */}

        <Link
          href="/customer/post-job"
          className="mb-6 flex w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] sm:hidden"
        >
          + POST A NEW JOB
        </Link>

        {/* ============================================ */}
        {/* TITLE */}
        {/* ============================================ */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
              Customer Portal
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Your Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-[#82958c]">
              Manage your waste collection jobs,
              compare driver quotes and track your
              bookings.
            </p>

          </div>

          <button
            type="button"
            onClick={() => loadDashboard()}
            disabled={refreshing}
            className="rounded-xl border border-[#29483a] px-4 py-2.5 text-sm font-bold text-[#aabbb4] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

        {/* ============================================ */}
        {/* ERROR */}
        {/* ============================================ */}

        {errorMessage && (
          <div className="mt-7 rounded-2xl border border-red-900/60 bg-[#230e0e] p-5">

            <p className="font-semibold text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => loadDashboard()}
              className="mt-3 text-sm font-bold text-red-200 underline"
            >
              Try again
            </button>

          </div>
        )}

        {/* ============================================ */}
        {/* STATS */}
        {/* ============================================ */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Total Jobs"
            value={jobs.length}
            description="All your jobs"
          />

          <StatCard
            title="Awaiting Quotes"
            value={pendingJobs.length}
            description="Jobs waiting for action"
          />

          <StatCard
            title="Active Jobs"
            value={activeJobs.length}
            description="Booked or in progress"
          />

          <StatCard
            title="Completed"
            value={completedJobs.length}
            description="Finished collections"
          />

        </div>

        {/* ============================================ */}
        {/* QUICK ACTIONS */}
        {/* ============================================ */}

        <section className="mt-10">

          <SectionHeading
            eyebrow="Quick Actions"
            title="What would you like to do?"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <ActionCard
              icon="+"
              title="Post a New Job"
              description="Tell drivers what needs collecting."
              href="/customer/post-job"
              primary
            />

            <ActionCard
              icon="£"
              title="View My Quotes"
              description="Compare driver bids and choose one."
              href="/customer/quotes"
            />

            <ActionCard
              icon="→"
              title="View My Jobs"
              description="See all your collection requests."
              href="#my-jobs"
            />

          </div>

        </section>

        {/* ============================================ */}
        {/* NEED ATTENTION */}
        {/* ============================================ */}

        {quotedJobs.length > 0 && (
          <section className="mt-10">

            <div className="overflow-hidden rounded-3xl border border-[#3f8d24] bg-[#0b1b14]">

              <div className="border-b border-[#214333] bg-[#10230f] p-6">

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
                  Action Required
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Driver quotes may be available
                </h2>

                <p className="mt-2 text-sm text-[#82958c]">
                  Check your quotes and select the
                  driver you want to complete your job.
                </p>

              </div>

              <div className="p-6">

                <Link
                  href="/customer/quotes"
                  className="inline-flex rounded-xl bg-[#1BBB8C] px-6 py-3 font-black text-[#06100c] hover:bg-[#16a77c]"
                >
                  View Driver Quotes →
                </Link>

              </div>

            </div>

          </section>
        )}

        {/* ============================================ */}
        {/* MY JOBS */}
        {/* ============================================ */}

        <section
          id="my-jobs"
          className="mt-10 pb-12"
        >

          <SectionHeading
            eyebrow="Your Activity"
            title="Your Jobs"
          />

          {jobs.length === 0 ? (
            <EmptyJobs />
          ) : (
            <div className="space-y-4">

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
    </main>
  );
}

/* ========================================================= */
/* STAT CARD                                                 */
/* ========================================================= */

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
    <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-xl">

      <p className="text-sm font-bold text-[#8b9d95]">
        {title}
      </p>

      <p className="mt-3 text-4xl font-black">
        {value}
      </p>

      <p className="mt-2 text-sm text-[#64786e]">
        {description}
      </p>

    </div>
  );
}

/* ========================================================= */
/* ACTION CARD                                               */
/* ========================================================= */

function ActionCard({
  icon,
  title,
  description,
  href,
  primary = false,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-3xl border p-6 shadow-xl transition hover:-translate-y-0.5 ${
        primary
          ? "border-[#3f8d24] bg-[#10230f]"
          : "border-[#17382b] bg-[#0b1b14]"
      }`}
    >

      <div className="flex items-start gap-4">

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${
            primary
              ? "bg-[#1BBB8C] text-[#06100c]"
              : "bg-[#123529] text-[#1BBB8C]"
          }`}
        >
          {icon}
        </div>

        <div>

          <h3 className="font-black">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-[#82958c]">
            {description}
          </p>

          <p className="mt-3 text-sm font-bold text-[#1BBB8C]">
            Open →
          </p>

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

  const hasDriver =
    Boolean(job.assigned_driver_id);

  const isCompleted =
    status === "completed" ||
    status === "complete";

  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="block overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl transition hover:border-[#1BBB8C]"
    >

      <div className="p-6">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div className="flex min-w-0 items-start gap-4">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#123529] text-xl">
              🚚
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-3">

                <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
                  {job.reference ||
                    `RC-${String(job.id).padStart(6, "0")}`}
                </p>

                <StatusBadge
                  status={job.status || "pending"}
                />

              </div>

              <h3 className="mt-2 text-xl font-black">
                {job.job_type ||
                  "Waste Collection"}
              </h3>

              <p className="mt-1 text-sm text-[#82958c]">
                {job.postcode ||
                  "Postcode not provided"}
              </p>

              {job.description && (
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-[#71867c]">
                  {job.description}
                </p>
              )}

            </div>

          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">

            {hasDriver && (
              <span className="text-xs font-bold text-[#1BBB8C]">
                Driver assigned
              </span>
            )}

            {isCompleted && (
              <span className="text-xs font-bold text-[#6d8178]">
                Collection completed
              </span>
            )}

            <span className="text-sm font-bold text-[#1BBB8C]">
              View Job →
            </span>

          </div>

        </div>

        {/* JOB DETAILS */}

        <div className="mt-6 grid gap-4 border-t border-[#17382b] pt-5 sm:grid-cols-3">

          <DetailItem
            label="Collection date"
            value={
              job.preferred_date
                ? formatDate(job.preferred_date)
                : "Not provided"
            }
          />

          <DetailItem
            label="Collection time"
            value={
              job.preferred_time ||
              "Not specified"
            }
          />

          <DetailItem
            label="Load size"
            value={
              job.load_size ||
              "Not specified"
            }
          />

        </div>

      </div>

    </Link>
  );
}

/* ========================================================= */
/* DETAIL ITEM                                               */
/* ========================================================= */

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[#d5dfda]">
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
  }

  if (normalised === "bidding") {
    className =
      "border-blue-900/60 bg-blue-950/40 text-blue-300";

    text = "Bidding";
  }

  if (
    normalised === "assigned" ||
    normalised === "accepted" ||
    normalised === "booked"
  ) {
    className =
      "border-[#3f8d24] bg-[#183017] text-[#1BBB8C]";
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
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {text}
    </span>
  );
}

/* ========================================================= */
/* EMPTY JOBS                                                */
/* ========================================================= */

function EmptyJobs() {
  return (
    <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] px-6 py-14 text-center">

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#123529] text-3xl">
        🚚
      </div>

      <h3 className="mt-6 text-2xl font-black">
        No jobs yet
      </h3>

      <p className="mx-auto mt-2 max-w-lg leading-7 text-[#71867c]">
        Post your first waste collection job
        and approved RCS drivers can submit
        quotes for you to choose from.
      </p>

      <Link
        href="/customer/post-job"
        className="mt-7 inline-flex rounded-xl bg-[#1BBB8C] px-7 py-3.5 font-black text-[#06100c] hover:bg-[#16a77c]"
      >
        POST YOUR FIRST JOB
      </Link>

    </div>
  );
}

/* ========================================================= */
/* SECTION HEADING                                           */
/* ========================================================= */

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">

      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl font-black">
        {title}
      </h2>

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
    year: "numeric",
  });
}