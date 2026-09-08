"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: number;
  reference: string | null;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  description: string | null;
  preferred_date: string | null;
  preferred_time: number | null;
  status: string | null;
  journey_status: string | null;
  payment_status: string | null;
  created_at: string;
};

type Filter = "all" | "open" | "active" | "completed";

const supabase = createClient();

function formatDate(date: string | null) {
  if (!date) return "Date not set";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not set";
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time: number | null) {
  if (time === null || time === undefined) return "Time not set";

  if (time === 8) return "Morning";
  if (time === 13) return "Afternoon";
  if (time === 18) return "Evening";

  return `${String(time).padStart(2, "0")}:00`;
}

function getJobCategory(job: Job): "open" | "active" | "completed" {
  const journey = (job.journey_status || "").toLowerCase();
  const status = (job.status || "").toLowerCase();

  if (
    journey === "completed" ||
    status === "completed" ||
    status === "complete"
  ) {
    return "completed";
  }

  if (
    journey === "assigned" ||
    journey === "on_way" ||
    journey === "on the way" ||
    journey === "in_progress" ||
    journey === "in progress" ||
    status === "assigned" ||
    status === "accepted" ||
    status === "in_progress"
  ) {
    return "active";
  }

  return "open";
}

function getStatusLabel(job: Job) {
  const journey = (job.journey_status || "").toLowerCase();
  const status = (job.status || "").toLowerCase();

  if (
    journey === "completed" ||
    status === "completed" ||
    status === "complete"
  ) {
    return "Completed";
  }

  if (journey === "on_way" || journey === "on the way") {
    return "Driver on the way";
  }

  if (journey === "in_progress" || journey === "in progress") {
    return "Collection in progress";
  }

  if (
    journey === "assigned" ||
    status === "assigned" ||
    status === "accepted"
  ) {
    return "Driver assigned";
  }

  if (status === "cancelled" || status === "canceled") {
    return "Cancelled";
  }

  return "Waiting for quotes";
}

function getStatusClasses(job: Job) {
  const category = getJobCategory(job);

  if (category === "completed") {
    return "border-white/10 bg-white/[0.04] text-white/60";
  }

  if (category === "active") {
    return "border-[#1BBB8C]/30 bg-[#1BBB8C]/10 text-[#1BBB8C]";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

function getJobIcon(jobType: string | null) {
  const type = (jobType || "").toLowerCase();

  if (type.includes("garden")) return "G";
  if (type.includes("furniture")) return "F";
  if (type.includes("builders")) return "B";
  if (type.includes("scrap")) return "S";
  if (type.includes("clearance")) return "C";

  return "RCS";
}

export default function CustomerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  async function loadJobs(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/customer/login";
        return;
      }

      const { data, error: jobsError } = await supabase
        .from("jobs")
        .select(
          `
            id,
            reference,
            job_type,
            postcode,
            address,
            load_size,
            description,
            preferred_date,
            preferred_time,
            status,
            journey_status,
            payment_status,
            created_at
          `,
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (jobsError) {
        throw jobsError;
      }

      setJobs((data || []) as Job[]);
    } catch (err) {
      console.error("Failed to load customer jobs:", err);

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load your jobs. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadJobs();

    const interval = setInterval(() => {
      loadJobs(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const filteredJobs = useMemo(() => {
    if (filter === "all") {
      return jobs;
    }

    return jobs.filter((job) => getJobCategory(job) === filter);
  }, [jobs, filter]);

  const counts = useMemo(() => {
    return {
      all: jobs.length,
      open: jobs.filter((job) => getJobCategory(job) === "open").length,
      active: jobs.filter((job) => getJobCategory(job) === "active").length,
      completed: jobs.filter(
        (job) => getJobCategory(job) === "completed",
      ).length,
    };
  }, [jobs]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/customer/login";
  }

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/customer/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1BBB8C] text-xs font-black text-[#06100c]">
              RCS
            </div>

            <div>
              <p className="text-sm font-bold tracking-wide">
                Rapid Clear
              </p>
              <p className="text-xs text-white/40">Customer Portal</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-white/20 hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6">
        {/* Page heading */}
        <section className="mb-6">
          <Link
            href="/customer/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white"
          >
            <span>←</span>
            Dashboard
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1BBB8C]">
                Customer portal
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                My Jobs
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
                View your rubbish collection jobs, check their progress and
                see your latest bookings.
              </p>
            </div>

            <Link
              href="/customer/post-job"
              className="inline-flex items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-bold text-[#06100c] transition hover:brightness-110"
            >
              + Post a new job
            </Link>
          </div>
        </section>

        {/* Summary */}
        <section className="mb-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setFilter("open")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "open"
                ? "border-[#1BBB8C]/50 bg-[#1BBB8C]/10"
                : "border-[#17382b] bg-[#0b1b14] hover:border-[#29483a]"
            }`}
          >
            <p className="text-2xl font-black">{counts.open}</p>
            <p className="mt-1 text-xs text-white/45">Open</p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "active"
                ? "border-[#1BBB8C]/50 bg-[#1BBB8C]/10"
                : "border-[#17382b] bg-[#0b1b14] hover:border-[#29483a]"
            }`}
          >
            <p className="text-2xl font-black">{counts.active}</p>
            <p className="mt-1 text-xs text-white/45">Active</p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "completed"
                ? "border-[#1BBB8C]/50 bg-[#1BBB8C]/10"
                : "border-[#17382b] bg-[#0b1b14] hover:border-[#29483a]"
            }`}
          >
            <p className="text-2xl font-black">{counts.completed}</p>
            <p className="mt-1 text-xs text-white/45">Completed</p>
          </button>
        </section>

        {/* Filters */}
        <section className="mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                ["all", "All jobs", counts.all],
                ["open", "Waiting", counts.open],
                ["active", "Active", counts.active],
                ["completed", "Completed", counts.completed],
              ] as [Filter, string, number][]
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  filter === value
                    ? "border-[#1BBB8C] bg-[#1BBB8C] text-[#06100c]"
                    : "border-[#17382b] bg-[#0b1b14] text-white/60 hover:border-[#29483a] hover:text-white"
                }`}
              >
                {label}
                <span
                  className={`ml-2 ${
                    filter === value ? "text-[#06100c]/60" : "text-white/30"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Refresh */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {refreshing ? "Updating..." : "Automatically updated"}
          </p>

          <button
            type="button"
            onClick={() => loadJobs(true)}
            disabled={refreshing}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-[#1BBB8C] transition hover:bg-[#1BBB8C]/10 disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-sm font-semibold text-red-300">
              Something went wrong
            </p>

            <p className="mt-1 text-xs leading-5 text-red-200/70">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadJobs()}
              className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-400/20"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5"
              >
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/5" />

                  <div className="flex-1">
                    <div className="h-4 w-40 rounded bg-white/5" />
                    <div className="mt-3 h-3 w-56 rounded bg-white/5" />
                    <div className="mt-2 h-3 w-32 rounded bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          /* Empty state */
          <section className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-8 text-center sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1BBB8C]/20 bg-[#1BBB8C]/10 text-sm font-black text-[#1BBB8C]">
              RCS
            </div>

            <h2 className="mt-5 text-xl font-black">
              {filter === "all"
                ? "No jobs yet"
                : `No ${filter} jobs`}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
              {filter === "all"
                ? "Post your first rubbish collection job and let approved RCS drivers send you quotes."
                : "There aren't any jobs in this section at the moment."}
            </p>

            {filter === "all" && (
              <Link
                href="/customer/post-job"
                className="mt-6 inline-flex rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-bold text-[#06100c]"
              >
                Post a job
              </Link>
            )}
          </section>
        ) : (
          /* Jobs */
          <section className="space-y-3">
            {filteredJobs.map((job) => {
              const category = getJobCategory(job);
              const statusLabel = getStatusLabel(job);

              return (
                <Link
                  key={job.id}
                  href={`/customer/jobs/${job.id}`}
                  className="group block rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 transition hover:border-[#29483a] hover:bg-[#0d2118] sm:p-5"
                >
                  <div className="flex gap-4">
                    {/* Job icon */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#1BBB8C]/20 bg-[#1BBB8C]/10 text-[10px] font-black tracking-wider text-[#1BBB8C]">
                      {getJobIcon(job.job_type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Top row */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold group-hover:text-[#1BBB8C]">
                            {job.job_type || "Rubbish collection"}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            {job.reference || `Job #${job.id}`}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                            job,
                          )}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="mt-4 grid gap-2 text-xs text-white/50 sm:grid-cols-2">
                        <div>
                          <span className="text-white/25">Collection</span>
                          <p className="mt-0.5 font-semibold text-white/70">
                            {formatDate(job.preferred_date)}
                          </p>
                        </div>

                        <div>
                          <span className="text-white/25">Time</span>
                          <p className="mt-0.5 font-semibold text-white/70">
                            {formatTime(job.preferred_time)}
                          </p>
                        </div>

                        <div>
                          <span className="text-white/25">Location</span>
                          <p className="mt-0.5 truncate font-semibold text-white/70">
                            {job.postcode || "Postcode not set"}
                          </p>
                        </div>

                        <div>
                          <span className="text-white/25">Load size</span>
                          <p className="mt-0.5 font-semibold text-white/70">
                            {job.load_size || "Not specified"}
                          </p>
                        </div>
                      </div>

                      {/* Payment / action */}
                      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                        <div>
                          {job.payment_status === "paid" ? (
                            <span className="text-xs font-semibold text-[#1BBB8C]">
                              Payment received
                            </span>
                          ) : category === "open" ? (
                            <span className="text-xs text-white/35">
                              Waiting for driver quotes
                            </span>
                          ) : (
                            <span className="text-xs text-white/35">
                              View job details
                            </span>
                          )}
                        </div>

                        <span className="text-lg text-white/25 transition group-hover:translate-x-1 group-hover:text-[#1BBB8C]">
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#17382b] bg-[#081710]/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-around">
          <Link
            href="/customer/dashboard"
            className="flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-white/40 transition hover:text-white"
          >
            <span className="text-lg">⌂</span>
            <span className="text-[10px] font-semibold">Home</span>
          </Link>

          <Link
            href="/customer/jobs"
            className="flex min-w-[70px] flex-col items-center gap-1 rounded-xl bg-[#1BBB8C]/10 px-3 py-2 text-[#1BBB8C]"
          >
            <span className="text-sm font-black">RCS</span>
            <span className="text-[10px] font-bold">Jobs</span>
          </Link>

          <Link
            href="/customer/quotes"
            className="flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-white/40 transition hover:text-white"
          >
            <span className="text-lg">£</span>
            <span className="text-[10px] font-semibold">Quotes</span>
          </Link>

          <Link
            href="/customer/post-job"
            className="flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-white/40 transition hover:text-white"
          >
            <span className="text-xl leading-none">+</span>
            <span className="text-[10px] font-semibold">New Job</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}