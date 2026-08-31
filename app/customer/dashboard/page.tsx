"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  created_at: string;
  status: string | null;
  service: string | null;
  description: string | null;
  postcode: string | null;
  address: string | null;
  quote_price: number | null;
};

export default function CustomerDashboard() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setErrorMessage("");

      try {
        // IMPORTANT:
        // Supabase is created only after the component
        // has mounted in the browser.
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/customer/login");
          return;
        }

        const { data, error } = await supabase
          .from("jobs")
          .select(
            "id, created_at, status, service, description, postcode, address, quote_price"
          )
          .eq("customer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setJobs((data as Job[]) || []);
        }
      } catch (error) {
        console.error("Customer dashboard error:", error);

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  const pendingJobs = jobs.filter(
    (job) =>
      job.status?.toLowerCase() === "pending"
  );

  const activeJobs = jobs.filter((job) => {
    const status = job.status?.toLowerCase();

    return (
      status === "accepted" ||
      status === "booked" ||
      status === "in_progress" ||
      status === "in progress"
    );
  });

  const completedJobs = jobs.filter((job) => {
    const status = job.status?.toLowerCase();

    return (
      status === "completed" ||
      status === "complete"
    );
  });

  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      {/* HEADER */}

      <header className="border-b border-[#dde5d8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="block">
            <div className="text-2xl font-black text-[#111111]">
              Rapid Clear
            </div>

            <div className="text-sm font-bold text-[#529027]">
              Solutions
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/customer/post-job"
              className="hidden rounded-xl bg-[#529027] px-5 py-3 text-sm font-black text-white hover:bg-[#315c18] sm:block"
            >
              + Post a Job
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-sm font-bold text-[#555555] hover:bg-[#f5f7f4]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* TITLE */}

        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#529027]">
            Customer Portal
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#111111]">
            Your Dashboard
          </h1>

          <p className="mt-2 text-[#666666]">
            Manage your waste collection jobs, quotes and bookings.
          </p>
        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {/* STATS */}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Jobs"
            number={jobs.length}
            description="All your jobs"
          />

          <StatCard
            title="Pending"
            number={pendingJobs.length}
            description="Awaiting action"
          />

          <StatCard
            title="Active"
            number={activeJobs.length}
            description="Jobs in progress"
          />

          <StatCard
            title="Completed"
            number={completedJobs.length}
            description="Finished jobs"
          />
        </div>

        {/* QUICK ACTIONS */}

        <section className="mt-10">
          <h2 className="text-2xl font-black text-[#111111]">
            Quick Actions
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ActionCard
              icon="＋"
              title="Post a New Job"
              description="Tell us what needs clearing."
              href="/customer/post-job"
            />

            <ActionCard
              icon="£"
              title="View Quotes"
              description="See quotes from drivers."
              href="/customer/quotes"
            />

            <ActionCard
              icon="🚚"
              title="My Jobs"
              description="View your collection jobs."
              href="/customer/dashboard"
            />
          </div>
        </section>

        {/* JOBS */}

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-black text-[#111111]">
              Your Jobs
            </h2>

            <p className="mt-1 text-sm text-[#777777]">
              Your latest collection requests.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#dde5d8] bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#dde5d8] border-t-[#529027]" />

              <p className="mt-4 font-semibold text-[#666666]">
                Loading your jobs...
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <EmptyJobs />
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard
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

/* -------------------------------- */
/* STAT CARD                        */
/* -------------------------------- */

function StatCard({
  title,
  number,
  description,
}: {
  title: string;
  number: number;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
      <p className="text-sm font-black uppercase tracking-wide text-[#529027]">
        {title}
      </p>

      <p className="mt-2 text-4xl font-black text-[#111111]">
        {number}
      </p>

      <p className="mt-1 text-sm text-[#777777]">
        {description}
      </p>
    </div>
  );
}

/* -------------------------------- */
/* ACTION CARD                      */
/* -------------------------------- */

function ActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#529027] hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e7f1df] text-xl font-black text-[#529027]">
          {icon}
        </div>

        <div>
          <h3 className="font-black text-[#111111]">
            {title}
          </h3>

          <p className="mt-1 text-sm text-[#777777]">
            {description}
          </p>

          <p className="mt-3 text-sm font-bold text-[#529027]">
            Open →
          </p>
        </div>
      </div>
    </Link>
  );
}

/* -------------------------------- */
/* JOB CARD                         */
/* -------------------------------- */

function JobCard({
  job,
}: {
  job: Job;
}) {
  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="block rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm transition hover:border-[#529027] hover:shadow-md"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e7f1df] text-xl">
            🚚
          </div>

          <div>
            <h3 className="text-lg font-black text-[#111111]">
              {job.service || "Waste Collection"}
            </h3>

            <p className="mt-1 text-sm text-[#666666]">
              Job #{job.id}
            </p>

            <p className="mt-2 text-sm font-semibold text-[#555555]">
              {job.postcode || "Postcode not provided"}
            </p>

            {job.description && (
              <p className="mt-2 line-clamp-2 text-sm text-[#777777]">
                {job.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <StatusBadge
            status={job.status || "pending"}
          />

          {job.quote_price !== null && (
            <p className="text-xl font-black text-[#111111]">
              £{Number(job.quote_price).toFixed(2)}
            </p>
          )}

          <p className="text-xs text-[#888888]">
            {formatDate(job.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/* -------------------------------- */
/* STATUS                           */
/* -------------------------------- */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalised = status.toLowerCase();

  let className = "bg-gray-100 text-gray-700";

  if (
    normalised === "pending" ||
    normalised === "new"
  ) {
    className = "bg-amber-100 text-amber-800";
  }

  if (
    normalised === "accepted" ||
    normalised === "approved" ||
    normalised === "booked"
  ) {
    className = "bg-[#e7f1df] text-[#315c18]";
  }

  if (
    normalised === "in_progress" ||
    normalised === "in progress"
  ) {
    className = "bg-blue-100 text-blue-700";
  }

  if (
    normalised === "completed" ||
    normalised === "complete"
  ) {
    className = "bg-green-100 text-green-700";
  }

  if (
    normalised === "cancelled" ||
    normalised === "canceled" ||
    normalised === "rejected"
  ) {
    className = "bg-red-100 text-red-700";
  }

  const text =
    status.charAt(0).toUpperCase() +
    status.slice(1).replace("_", " ");

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {text}
    </span>
  );
}

/* -------------------------------- */
/* EMPTY                            */
/* -------------------------------- */

function EmptyJobs() {
  return (
    <div className="rounded-3xl border border-[#dde5d8] bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7f1df] text-3xl">
        🚚
      </div>

      <h3 className="mt-5 text-xl font-black text-[#111111]">
        No jobs yet
      </h3>

      <p className="mx-auto mt-2 max-w-md text-[#777777]">
        Post your first waste collection job and
        let RCS Marketplace drivers provide you
        with a quote.
      </p>

      <Link
        href="/customer/post-job"
        className="mt-6 inline-block rounded-xl bg-[#529027] px-6 py-3 font-black text-white hover:bg-[#315c18]"
      >
        Post Your First Job
      </Link>
    </div>
  );
}

/* -------------------------------- */
/* DATE                             */
/* -------------------------------- */

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}