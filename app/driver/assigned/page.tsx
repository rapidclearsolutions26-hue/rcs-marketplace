"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

const RCS_FEE_PERCENT = 10;

export default function AssignedJobsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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

        const { data: jobsData, error: jobsError } = await supabase
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
            `,
          )
          .eq("assigned_driver_id", user.id)
          .order("preferred_date", {
            ascending: true,
          });

        if (jobsError) {
          throw jobsError;
        }

        const assigned = ((jobsData || []) as Job[]).filter(
          (job) =>
            job.status === "assigned" ||
            job.status === "accepted" ||
            job.status === "in_progress",
        );

        setJobs(assigned);

        const { data: bidsData, error: bidsError } = await supabase
          .from("bids")
          .select(
            `
              id,
              job_id,
              amount,
              status
            `,
          )
          .eq("driver_id", user.id)
          .eq("status", "accepted");

        if (bidsError) {
          console.error("Accepted bids error:", bidsError);
        } else {
          setBids((bidsData || []) as Bid[]);
        }
      } catch (err) {
        console.error("Assigned jobs error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load assigned jobs.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadJobs(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadJobs]);

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.status === "in_progress",
      ),
    [jobs],
  );

  const upcomingJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "assigned" ||
          job.status === "accepted",
      ),
    [jobs],
  );

  const totalPayout = useMemo(() => {
    return jobs.reduce((total, job) => {
      const bid = findBid(bids, job.id);
      const amount = Number(bid?.amount || 0);
      const fee = amount * (RCS_FEE_PERCENT / 100);

      return total + (amount - fee);
    }, 0);
  }, [jobs, bids]);

  if (loading) {
    return <Loading />;
  }

  return (
    <main
      className="min-h-screen pb-28 text-white"
      style={{ background: BG }}
    >
      {/* HEADER */}
      <header
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl"
        style={{
          background: "rgba(5,7,5,0.94)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <Link
            href="/driver/dashboard"
            className="flex items-center"
          >
            <img
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              className="h-9 w-auto object-contain sm:h-11"
            />
          </Link>

          <button
            type="button"
            onClick={() => loadJobs()}
            disabled={refreshing}
            className="flex h-10 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-black transition disabled:opacity-50 sm:px-4"
            style={{
              color: GREEN,
              background: CARD,
            }}
          >
            <span className="sm:hidden">
              {refreshing ? "…" : "↻"}
            </span>

            <span className="hidden sm:inline">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-10">
        {/* BACK */}
        <Link
          href="/driver/dashboard"
          className="mb-6 inline-flex text-sm font-black transition"
          style={{ color: GREEN }}
        >
          ← Dashboard
        </Link>

        {/* HERO */}
        <section
          className="overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8"
          style={{
            background: `linear-gradient(135deg, ${CARD} 0%, ${SECTION} 100%)`,
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]"
                style={{
                  borderColor: `${GREEN}40`,
                  background: `${GREEN}12`,
                  color: GREEN,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: GREEN }}
                />
                Your workload
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Assigned jobs.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
                Manage the collections you have won and keep track of
                everything currently assigned to you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[310px]">
              <Stat
                label="Assigned"
                value={jobs.length}
              />

              <Stat
                label="Your payout"
                value={`£${totalPayout.toFixed(2)}`}
              />
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-semibold text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* ACTIVE */}
        {activeJobs.length > 0 && (
          <section className="mt-8">
            <SectionTitle
              eyebrow="Working now"
              title="Active Jobs"
              count={activeJobs.length}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              {activeJobs.map((job) => (
                <AssignedCard
                  key={job.id}
                  job={job}
                  bid={findBid(bids, job.id)}
                  active
                />
              ))}
            </div>
          </section>
        )}

        {/* UPCOMING */}
        <section className={activeJobs.length > 0 ? "mt-10" : "mt-8"}>
          <SectionTitle
            eyebrow="Paid & assigned"
            title="Upcoming Jobs"
            count={upcomingJobs.length}
          />

          {upcomingJobs.length === 0 ? (
            <Empty />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {upcomingJobs.map((job) => (
                <AssignedCard
                  key={job.id}
                  job={job}
                  bid={findBid(bids, job.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* FOOTER SUPPORT */}
        <section
          className="mt-10 rounded-3xl border border-white/10 p-6 text-center sm:p-8"
          style={{ background: SECTION }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: GREEN }}
          >
            Need help?
          </p>

          <h2 className="mt-2 text-xl font-black">
            RCS support is here.
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
            If you have an issue with an assigned collection, contact the
            RCS team and we will help you get it sorted.
          </p>

          <a
            href="https://wa.me/447555980651?text=Hi%20RCS%20I%20need%20help%20with%20an%20assigned%20job"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-6 py-3 text-sm font-black transition"
            style={{
              background: GREEN,
              color: BG,
            }}
          >
            Contact RCS Support
          </a>
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
  const amount = Number(bid?.amount || 0);
  const fee = amount * (RCS_FEE_PERCENT / 100);
  const payout = amount - fee;

  return (
    <article
      className="group overflow-hidden rounded-3xl border border-white/10 transition hover:-translate-y-0.5 hover:border-white/20"
      style={{ background: CARD }}
    >
      {/* CARD HEADER */}
      <div
        className="border-b border-white/10 p-5 sm:p-6"
        style={{ background: SECTION }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-[10px] font-black uppercase tracking-[0.16em]"
              style={{ color: GREEN }}
            >
              {job.reference ||
                `RC-${String(job.id).padStart(6, "0")}`}
            </p>

            <h2 className="mt-1.5 text-xl font-black tracking-tight">
              {job.job_type || "Waste Collection"}
            </h2>
          </div>

          <span
            className="shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider"
            style={{
              borderColor: active
                ? `${GREEN}55`
                : "rgba(255,255,255,0.12)",
              background: active
                ? `${GREEN}12`
                : "rgba(255,255,255,0.04)",
              color: active ? GREEN : "rgba(255,255,255,0.65)",
            }}
          >
            {active ? "In progress" : "Assigned"}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* MONEY */}
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

        {/* DETAILS */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-5">
          <Info
            label="Location"
            value={job.postcode || "Not provided"}
          />

          <Info
            label="Load"
            value={job.load_size || "Not specified"}
          />

          <Info
            label="Collection date"
            value={
              job.preferred_date
                ? formatDate(job.preferred_date)
                : "Not provided"
            }
          />

          <Info
            label="Time"
            value={formatPreferredTime(job.preferred_time)}
          />
        </div>

        {/* JOURNEY */}
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: BG,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">
                Journey status
              </p>

              <p className="mt-1 text-sm font-black text-white/85">
                {formatJourneyStatus(
                  job.journey_status || job.status,
                )}
              </p>
            </div>

            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: active ? GREEN : "rgba(255,255,255,0.3)",
              }}
            />
          </div>
        </div>

        {/* ACTION */}
        <Link
          href={`/driver/jobs/${job.id}`}
          className="flex min-h-12 items-center justify-center rounded-xl px-5 py-3.5 text-sm font-black transition"
          style={{
            background: GREEN,
            color: BG,
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = GREEN_HOVER;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = GREEN;
          }}
        >
          Manage Job →
        </Link>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      className="rounded-2xl border border-white/10 p-4"
      style={{ background: BG }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>

      <p
        className="mt-1 text-xl font-black"
        style={{ color: GREEN }}
      >
        {value}
      </p>
    </div>
  );
}

function findBid(bids: Bid[], jobId: number) {
  return bids.find(
    (bid) => Number(bid.job_id) === Number(jobId),
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
      className="rounded-2xl border p-4"
      style={{
        borderColor: highlight
          ? `${GREEN}40`
          : "rgba(255,255,255,0.08)",
        background: highlight ? `${GREEN}0c` : BG,
      }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>

      <p
        className="mt-1 text-xl font-black"
        style={{
          color: highlight ? GREEN : "white",
        }}
      >
        £{value.toFixed(2)}
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
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold leading-5 text-white/80">
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
        <p
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: GREEN }}
        >
          {eyebrow}
        </p>

        <h2 className="mt-1 text-2xl font-black tracking-tight">
          {title}
        </h2>
      </div>

      <span
        className="rounded-full border px-3 py-1 text-xs font-black"
        style={{
          borderColor: "rgba(255,255,255,0.1)",
          background: CARD,
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

function Empty() {
  return (
    <div
      className="rounded-3xl border border-dashed border-white/10 px-5 py-14 text-center"
      style={{ background: SECTION }}
    >
      <div
        className="mx-auto h-1.5 w-12 rounded-full"
        style={{ background: GREEN }}
      />

      <h2 className="mt-5 text-xl font-black">
        No upcoming jobs
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/45">
        Jobs assigned to you will appear here after a customer accepts and
        pays for your bid.
      </p>

      <Link
        href="/driver/jobs"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-6 py-3 text-sm font-black"
        style={{
          background: GREEN,
          color: BG,
        }}
      >
        Find more jobs
      </Link>
    </div>
  );
}

function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center text-white"
      style={{ background: BG }}
    >
      <div className="text-center">
        <div
          className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10"
          style={{
            borderTopColor: GREEN,
          }}
        />

        <p className="mt-5 font-black">
          Loading assigned jobs...
        </p>

        <p className="mt-1 text-xs text-white/35">
          Getting your latest collections
        </p>
      </div>
    </main>
  );
}

function formatDate(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-GB",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
      },
    );
  } catch {
    return date;
  }
}

function formatPreferredTime(time: number | null) {
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

function formatJourneyStatus(status: string | null) {
  if (!status) {
    return "Assigned";
  }

  switch (status) {
    case "assigned":
      return "Assigned";
    case "accepted":
      return "Accepted";
    case "in_progress":
      return "Collection in progress";
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}