"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP_NUMBER = "447555980651";
const WHATSAPP_MESSAGE =
  "Hi Rapid Clear Solutions, I need help with my customer account.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

type Job = {
  id: string;
  reference?: string | null;
  job_type?: string | null;
  postcode?: string | null;
  address?: string | null;
  load_size?: string | null;
  description?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type Filter = "all" | "waiting" | "active" | "completed";

const JOB_SELECT =
  "id,reference,job_type,postcode,address,load_size,description,preferred_date,preferred_time,status,created_at";

const PAGE_GREEN = "#79c51c";
const PAGE_GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

function normaliseStatus(status?: string | null) {
  return (status || "").trim().toLowerCase();
}

function isCompleted(status?: string | null) {
  const value = normaliseStatus(status);
  return [
    "completed",
    "complete",
    "collected",
    "collection completed",
    "closed",
    "cancelled",
    "canceled",
  ].includes(value);
}

function isActive(status?: string | null) {
  const value = normaliseStatus(status);
  return [
    "accepted",
    "assigned",
    "driver_assigned",
    "driver assigned",
    "in progress",
    "in_progress",
    "on the way",
    "on_way",
    "arriving",
    "started",
  ].includes(value);
}

function statusLabel(status?: string | null) {
  const value = normaliseStatus(status);

  if (!value) return "Waiting for quotes";
  if (isCompleted(value)) return "Completed";
  if (isActive(value)) return "Active";

  return status
    ? status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Waiting for quotes";
}

function statusClasses(status?: string | null) {
  const value = normaliseStatus(status);

  if (isCompleted(value)) {
    return {
      dot: "#6b7280",
      text: "#d1d5db",
      background: "rgba(107,114,128,0.12)",
      border: "rgba(107,114,128,0.28)",
    };
  }

  if (isActive(value)) {
    return {
      dot: PAGE_GREEN,
      text: "#b8ef7a",
      background: "rgba(121,197,28,0.12)",
      border: "rgba(121,197,28,0.28)",
    };
  }

  return {
    dot: "#f0b429",
    text: "#f6d68a",
    background: "rgba(240,180,41,0.12)",
    border: "rgba(240,180,41,0.28)",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Date to be confirmed";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerJobsPage() {
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  async function loadJobs(showRefresh = false) {
    if (showRefresh) setRefreshing(true);

    try {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        window.location.href = "/customer/login";
        return;
      }

      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.email?.split("@")[0] as string | undefined) ||
        "Customer";

      setUserName(fullName);

      const { data, error: jobsError } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      setJobs((data || []) as Job[]);
    } catch (err) {
      console.error("Customer jobs error:", err);
      setError("We couldn't load your jobs. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadJobs();

    const interval = window.setInterval(() => {
      loadJobs();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const counts = useMemo(() => {
    let waiting = 0;
    let active = 0;
    let completed = 0;

    for (const job of jobs) {
      if (isCompleted(job.status)) completed += 1;
      else if (isActive(job.status)) active += 1;
      else waiting += 1;
    }

    return {
      all: jobs.length,
      waiting,
      active,
      completed,
    };
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filter === "completed") return isCompleted(job.status);
      if (filter === "active") return isActive(job.status);
      if (filter === "waiting")
        return !isCompleted(job.status) && !isActive(job.status);
      return true;
    });
  }, [jobs, filter]);

  const firstName = userName.split(" ")[0] || "there";

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: BG,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: ${BG};
        }

        .rcs-scroll::-webkit-scrollbar {
          height: 5px;
        }

        .rcs-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .rcs-scroll::-webkit-scrollbar-thumb {
          background: rgba(121, 197, 28, 0.25);
          border-radius: 999px;
        }

        .rcs-link:hover {
          color: ${PAGE_GREEN_HOVER} !important;
        }

        .rcs-button:hover {
          background: ${PAGE_GREEN_HOVER} !important;
        }

        .job-card {
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .job-card:hover {
          transform: translateY(-2px);
          border-color: rgba(121, 197, 28, 0.35) !important;
          background: #0c110c !important;
        }

        @media (min-width: 768px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .desktop-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header
        className="pwa-header sticky top-0 z-50 border-b"
        style={{
          background: "rgba(5,7,5,0.94)",
          borderColor: "rgba(121,197,28,0.14)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/customer/dashboard" className="flex items-center gap-3">
            <img
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              className="h-11 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-sm font-black tracking-tight text-white">
                RCS
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Customer Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="desktop-only rounded-xl border px-4 py-2.5 text-sm font-bold text-zinc-200 transition"
              style={{
                borderColor: "rgba(121,197,28,0.22)",
                background: "rgba(121,197,28,0.05)",
              }}
            >
              WhatsApp Support
            </a>

            <Link
              href="/customer/post-job"
              className="rcs-button rounded-xl px-4 py-2.5 text-sm font-black text-black transition"
              style={{ background: PAGE_GREEN }}
            >
              Get a Quote
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 md:pb-12 lg:px-8 lg:pt-10">
        {/* Hero */}
        <section
          className="mb-7 overflow-hidden rounded-3xl border p-6 sm:p-8"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(121,197,28,0.13), transparent 36%), #080b08",
            borderColor: "rgba(121,197,28,0.14)",
          }}
        >
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <p
                className="mb-2 text-xs font-black uppercase tracking-[0.2em]"
                style={{ color: PAGE_GREEN }}
              >
                Customer Portal
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                My Jobs
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Hi {firstName}, keep track of your rubbish removal jobs,
                quotes and collections in one place.
              </p>
            </div>

            <Link
              href="/customer/post-job"
              className="rcs-button inline-flex items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-black text-black transition"
              style={{ background: PAGE_GREEN }}
            >
              + Post a New Job
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "All Jobs", value: counts.all },
            { label: "Waiting", value: counts.waiting },
            { label: "Active", value: counts.active },
            { label: "Completed", value: counts.completed },
          ].map((item, index) => (
            <button
              key={item.label}
              onClick={() =>
                setFilter(
                  index === 0
                    ? "all"
                    : index === 1
                      ? "waiting"
                      : index === 2
                        ? "active"
                        : "completed"
                )
              }
              className="rounded-2xl border p-4 text-left transition"
              style={{
                background: CARD,
                borderColor:
                  ((index === 0 && filter === "all") ||
                    (index === 1 && filter === "waiting") ||
                    (index === 2 && filter === "active") ||
                    (index === 3 && filter === "completed"))
                    ? "rgba(121,197,28,0.38)"
                    : "rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-black">{item.value}</p>
            </button>
          ))}
        </section>

        {/* Toolbar */}
        <section className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="rcs-scroll flex gap-2 overflow-x-auto pb-1">
            {(
              [
                ["all", "All Jobs"],
                ["waiting", "Waiting"],
                ["active", "Active"],
                ["completed", "Completed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className="whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-bold transition"
                style={{
                  background:
                    filter === value
                      ? "rgba(121,197,28,0.12)"
                      : "rgba(255,255,255,0.025)",
                  borderColor:
                    filter === value
                      ? "rgba(121,197,28,0.4)"
                      : "rgba(255,255,255,0.07)",
                  color: filter === value ? "#b8ef7a" : "#a1a1aa",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadJobs(true)}
            disabled={refreshing}
            className="rounded-xl border px-4 py-2.5 text-sm font-bold text-zinc-300 transition disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.025)",
              borderColor: "rgba(255,255,255,0.07)",
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div
            className="mb-5 rounded-2xl border p-4 text-sm text-red-200"
            style={{
              background: "rgba(127,29,29,0.12)",
              borderColor: "rgba(248,113,113,0.22)",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-3xl border"
                style={{
                  background: CARD,
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              />
            ))}
          </section>
        ) : visibleJobs.length === 0 ? (
          /* Empty state */
          <section
            className="rounded-3xl border px-6 py-14 text-center sm:px-10"
            style={{
              background: CARD,
              borderColor: "rgba(121,197,28,0.12)",
            }}
          >
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
              style={{
                background: "rgba(121,197,28,0.1)",
                color: PAGE_GREEN,
              }}
            >
              +
            </div>

            <h2 className="mt-5 text-xl font-black">
              {filter === "all"
                ? "You haven't posted a job yet"
                : `No ${filter} jobs`}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Post your rubbish removal job and local RCS drivers can review
              the details and send you quotes.
            </p>

            <Link
              href="/customer/post-job"
              className="rcs-button mt-6 inline-flex rounded-2xl px-5 py-3.5 text-sm font-black text-black transition"
              style={{ background: PAGE_GREEN }}
            >
              Post a New Job
            </Link>
          </section>
        ) : (
          /* Jobs */
          <section className="grid gap-4 lg:grid-cols-2">
            {visibleJobs.map((job) => {
              const status = statusClasses(job.status);

              return (
                <Link
                  key={job.id}
                  href={`/customer/jobs/${job.id}`}
                  className="job-card block rounded-3xl border p-5 sm:p-6"
                  style={{
                    background: CARD,
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        className="text-xs font-black uppercase tracking-[0.16em]"
                        style={{ color: PAGE_GREEN }}
                      >
                        {job.reference || "RCS Job"}
                      </p>

                      <h2 className="mt-1 truncate text-lg font-black sm:text-xl">
                        {job.job_type || "Waste Removal"}
                      </h2>
                    </div>

                    <span
                      className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black"
                      style={{
                        color: status.text,
                        background: status.background,
                        borderColor: status.border,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: status.dot }}
                      />
                      {statusLabel(job.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div
                      className="rounded-2xl border p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        borderColor: "rgba(255,255,255,0.055)",
                      }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                        Location
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-200">
                        {job.postcode || "Address provided"}
                      </p>
                    </div>

                    <div
                      className="rounded-2xl border p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.025)",
                        borderColor: "rgba(255,255,255,0.055)",
                      }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                        Collection
                      </p>
                      <p className="mt-1 text-sm font-bold text-zinc-200">
                        {formatDate(job.preferred_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.load_size && (
                      <span
                        className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-zinc-400"
                        style={{
                          borderColor: "rgba(255,255,255,0.07)",
                          background: "rgba(255,255,255,0.025)",
                        }}
                      >
                        {job.load_size}
                      </span>
                    )}

                    {job.preferred_time && (
                      <span
                        className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-zinc-400"
                        style={{
                          borderColor: "rgba(255,255,255,0.07)",
                          background: "rgba(255,255,255,0.025)",
                        }}
                      >
                        {job.preferred_time}
                      </span>
                    )}
                  </div>

                  <div
                    className="mt-5 flex items-center justify-between border-t pt-4"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-xs font-semibold text-zinc-600">
                      Posted {formatDate(job.created_at)}
                    </span>

                    <span
                      className="text-sm font-black"
                      style={{ color: PAGE_GREEN }}
                    >
                      View job →
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Support CTA */}
        <section
          className="mt-7 rounded-3xl border p-5 sm:p-6"
          style={{
            background: SECTION,
            borderColor: "rgba(121,197,28,0.12)",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-black">Need help with a job?</p>
              <p className="mt-1 text-sm text-zinc-500">
                Contact Rapid Clear Solutions directly through WhatsApp.
              </p>
            </div>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex justify-center rounded-xl border px-4 py-3 text-sm font-black text-zinc-200 transition"
              style={{
                background: "rgba(121,197,28,0.06)",
                borderColor: "rgba(121,197,28,0.22)",
              }}
            >
              WhatsApp RCS
            </a>
          </div>
        </section>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{
          background: "rgba(5,7,5,0.97)",
          borderColor: "rgba(121,197,28,0.14)",
          backdropFilter: "blur(18px)",
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          <Link
            href="/customer/dashboard"
            className="flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-bold text-zinc-500"
          >
            <span className="text-lg">⌂</span>
            Home
          </Link>

          <Link
            href="/customer/jobs"
            className="flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-black"
            style={{ color: PAGE_GREEN }}
          >
            <span className="text-lg">▣</span>
            Jobs
          </Link>

          <Link
            href="/customer/post-job"
            className="flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-bold text-zinc-500"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-base font-black text-black"
              style={{ background: PAGE_GREEN }}
            >
              +
            </span>
            Post Job
          </Link>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-bold text-zinc-500"
          >
            <span className="text-lg">↗</span>
            Support
          </a>
        </div>
      </nav>
    </main>
  );
}
