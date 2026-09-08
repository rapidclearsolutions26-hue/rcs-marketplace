"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DriverBottomNav from "@/app/components/driver/DriverBottomNav";

type Job = {
  id: number;
  reference: string | null;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  preferred_date: string | null;
  preferred_time: number | null;
  status: string | null;
  journey_status: string | null;
  assigned_driver_id: string | null;
};

type Bid = {
  id: number;
  job_id: number;
  amount: number;
  status: string | null;
};

const RCS_FEE_PERCENT = 10;

export default function AssignedJobsPage() {
  const router = useRouter();

  const [jobs, setJobs] =
    useState<Job[]>([]);

  const [bids, setBids] =
    useState<Bid[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadJobs = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/driver/login");
          return;
        }

        const {
          data: jobsData,
          error: jobsError,
        } = await supabase
          .from("jobs")
          .select(
            `
              id,
              reference,
              job_type,
              postcode,
              address,
              load_size,
              preferred_date,
              preferred_time,
              status,
              journey_status,
              assigned_driver_id
            `
          )
          .eq(
            "assigned_driver_id",
            user.id
          )
          .order("preferred_date", {
            ascending: true,
          });

        if (jobsError) {
          throw jobsError;
        }

        const assigned =
          ((jobsData || []) as Job[]).filter(
            (job) =>
              job.status ===
                "assigned" ||
              job.status ===
                "accepted" ||
              job.status ===
                "in_progress"
          );

        setJobs(assigned);

        const {
          data: bidsData,
          error: bidsError,
        } = await supabase
          .from("bids")
          .select(
            `
              id,
              job_id,
              amount,
              status
            `
          )
          .eq(
            "driver_id",
            user.id
          )
          .eq(
            "status",
            "accepted"
          );

        if (bidsError) {
          console.error(
            "Accepted bids error:",
            bidsError
          );
        } else {
          setBids(
            (bidsData || []) as Bid[]
          );
        }
      } catch (err) {
        console.error(
          "Assigned jobs error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load assigned jobs."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        loadJobs(true);
      }, 15000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [loadJobs]);

  if (loading) {
    return (
      <Loading />
    );
  }

  const activeJobs =
    jobs.filter(
      (job) =>
        job.status ===
        "in_progress"
    );

  const upcomingJobs =
    jobs.filter(
      (job) =>
        job.status ===
          "assigned" ||
        job.status ===
          "accepted"
    );

  return (
    <main className="min-h-screen bg-[#06100c] pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              RCS Marketplace
            </p>

            <h1 className="text-lg font-black sm:text-xl">
              Assigned Jobs
            </h1>

            <p className="text-[10px] text-[#71867c] sm:text-xs">
              {jobs.length} jobs assigned to you
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadJobs()
            }
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#29483a] text-lg font-black text-[#1BBB8C] disabled:opacity-50 sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">
              ↻
            </span>

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-8">
        <Link
          href="/driver/dashboard"
          className="mb-6 inline-flex text-sm font-black text-[#1BBB8C]"
        >
          ← Back to Home
        </Link>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4">
            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        )}

        {activeJobs.length > 0 && (
          <section>
            <SectionTitle
              eyebrow="Working now"
              title="Active Jobs"
              count={activeJobs.length}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              {activeJobs.map(
                (job) => (
                  <AssignedCard
                    key={job.id}
                    job={job}
                    bid={findBid(
                      bids,
                      job.id
                    )}
                    active
                  />
                )
              )}
            </div>
          </section>
        )}

        <section
          className={
            activeJobs.length > 0
              ? "mt-8"
              : ""
          }
        >
          <SectionTitle
            eyebrow="Paid & assigned"
            title="Upcoming Jobs"
            count={upcomingJobs.length}
          />

          {upcomingJobs.length ===
          0 ? (
            <Empty
              title="No upcoming jobs"
              description="Jobs assigned to you will appear here after a customer accepts and pays for your bid."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {upcomingJobs.map(
                (job) => (
                  <AssignedCard
                    key={job.id}
                    job={job}
                    bid={findBid(
                      bids,
                      job.id
                    )}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>

      <DriverBottomNav />
    </main>
  );
}

function AssignedCard({
  job,
  bid,
  active = false,
}: {
  job: Job;
  bid?: Bid;
  active?: boolean;
}) {
  const amount =
    Number(bid?.amount || 0);

  const fee =
    amount *
    (RCS_FEE_PERCENT / 100);

  const payout =
    amount - fee;

  return (
    <article className="overflow-hidden rounded-3xl border border-[#3f8d24] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#214333] bg-[#10230f] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference ||
                `RC-${String(
                  job.id
                ).padStart(6, "0")}`}
            </p>

            <h2 className="mt-1 text-lg font-black">
              {job.job_type ||
                "Waste Collection"}
            </h2>
          </div>

          <span className="rounded-full border border-[#3f8d24] bg-[#183017] px-2.5 py-1 text-[9px] font-black text-[#1BBB8C]">
            {active
              ? "IN PROGRESS"
              : "ASSIGNED"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Money
            label={`RCS ${RCS_FEE_PERCENT}%`}
            value={fee}
          />

          <Money
            label="Your payout"
            value={payout}
            highlight
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Info
            label="Location"
            value={
              job.postcode ||
              "Not provided"
            }
          />

          <Info
            label="Load"
            value={
              job.load_size ||
              "Not specified"
            }
          />

          <Info
            label="Collection date"
            value={
              job.preferred_date
                ? formatDate(
                    job.preferred_date
                  )
                : "Not provided"
            }
          />

          <Info
            label="Time"
            value={formatPreferredTime(
              job.preferred_time
            )}
          />
        </div>

        <div className="rounded-2xl border border-[#214333] bg-[#07130e] p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#657a70]">
            Journey
          </p>

          <p className="mt-1 text-sm font-black text-[#d5dfda]">
            {job.journey_status ||
              job.status ||
              "Assigned"}
          </p>
        </div>

        <Link
          href={`/driver/jobs/${job.id}`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-sm font-black text-[#06100c]"
        >
          Manage Job →
        </Link>
      </div>
    </article>
  );
}

function findBid(
  bids: Bid[],
  jobId: number
) {
  return bids.find(
    (bid) =>
      Number(bid.job_id) ===
      Number(jobId)
  );
}

function Money({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-[#3f8d24] bg-[#162b13]"
          : "border-[#214333] bg-[#08150f]"
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-wide text-[#71867c]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          highlight
            ? "text-[#1BBB8C]"
            : "text-white"
        }`}
      >
        £
        {value.toFixed(2)}
      </p>
    </div>
  );
}

function Info({
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

      <p className="mt-1 text-xs font-semibold leading-5 text-[#d5dfda]">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-black sm:text-2xl">
          {title}
        </h2>
      </div>

      <span className="rounded-full border border-[#29483a] bg-[#0b1b14] px-3 py-1 text-xs font-black text-[#8fa39a]">
        {count}
      </span>
    </div>
  );
}

function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] px-5 py-12 text-center">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-[#1BBB8C]" />

      <h2 className="mt-5 text-xl font-black">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#71857b]">
        {description}
      </p>
    </div>
  );
}

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06100c] text-white">
      <div className="text-center">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

        <p className="mt-5 font-black">
          Loading assigned jobs...
        </p>
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

  return "Not specified";
}