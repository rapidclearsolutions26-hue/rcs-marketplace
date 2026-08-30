"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";

type Job = {
  id: number;
  reference: string | null;
  customer_id: string;
  job_type: string;
  postcode: string;
  address: string;
  load_size: string | null;
  description: string;
  status: string;
  preferred_date: string | null;
  preferred_time: string | null;
  created_at: string;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
};

type Bid = {
  id: number;
  job_id: number;
  amount: number;
  status: string;
};

export default function CustomerDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] =
    useState("Customer");
  const [errorMessage, setErrorMessage] =
    useState("");

  /*
   * =========================================================
   * LOAD DASHBOARD
   * =========================================================
   */

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  async function loadDashboard(
    silent = false
  ) {
    if (!silent) {
      setLoading(true);
    }

    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/customer/login");
      return;
    }

    /*
     * =======================================================
     * CUSTOMER PROFILE
     * =======================================================
     */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Profile error:",
        profileError
      );
    }

    if (profile?.full_name) {
      setCustomerName(profile.full_name);
    }

    /*
     * =======================================================
     * CUSTOMER JOBS
     * =======================================================
     */

    const {
      data: jobsData,
      error: jobsError,
    } = await supabase
      .from("jobs")
      .select(
        `
          id,
          reference,
          customer_id,
          job_type,
          postcode,
          address,
          load_size,
          description,
          status,
          preferred_date,
          preferred_time,
          created_at,
          accepted_bid_id,
          assigned_driver_id,
          assigned_bid_id
        `
      )
      .eq("customer_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (jobsError) {
      console.error(
        "Jobs error:",
        jobsError
      );

      setErrorMessage(
        jobsError.message ||
          "We couldn't load your jobs."
      );

      setLoading(false);
      return;
    }

    const customerJobs =
      (jobsData || []) as Job[];

    setJobs(customerJobs);

    /*
     * =======================================================
     * DRIVER BIDS
     * =======================================================
     */

    if (customerJobs.length > 0) {
      const jobIds = customerJobs.map(
        (job) => job.id
      );

      const {
        data: bidsData,
        error: bidsError,
      } = await supabase
        .from("bids")
        .select(
          "id, job_id, amount, status"
        )
        .in("job_id", jobIds);

      if (bidsError) {
        console.error(
          "Bids error:",
          bidsError
        );
      } else {
        setBids(
          (bidsData || []) as Bid[]
        );
      }
    } else {
      setBids([]);
    }

    setLoading(false);
  }

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  async function logout() {
    await supabase.auth.signOut();
    router.push("/customer/login");
  }

  /*
   * =========================================================
   * JOB COUNTS
   * =========================================================
   */

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status !== "completed" &&
          job.status !== "cancelled"
      ),
    [jobs]
  );

  const completedJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "completed"
      ),
    [jobs]
  );

  const totalQuotes = bids.length;

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#07110b] text-white">

      {/* HEADER */}

      <header className="border-b border-white/10 bg-[#09150d]">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">

          {/* LOGO */}

          <Link
            href="/customer/dashboard"
            className="shrink-0"
          >
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* RIGHT */}

          <div className="flex items-center gap-3">

            {/* CUSTOMER */}

            <div className="hidden text-right sm:block">

              <p className="text-xs font-bold uppercase tracking-wider text-[#529027]">
                Customer
              </p>

              <p className="font-bold text-white">
                {customerName}
              </p>

            </div>

            {/* NOTIFICATION */}

            <NotificationBell />

            {/* LOGOUT */}

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Log out
            </button>

          </div>

        </div>

      </header>

      {/* MAIN */}

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">

        {/* HERO */}

        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#102218] to-[#0a150e] p-6 shadow-2xl sm:p-9">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#529027]">
            RCS CUSTOMER PORTAL
          </p>

          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">

            <div>

              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Welcome back
                {customerName !==
                "Customer"
                  ? `, ${customerName}`
                  : ""}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                Manage your waste collections,
                compare driver quotes and keep
                track of your bookings.
              </p>

            </div>

            <Link
              href="/customer/post-job"
              className="inline-flex items-center justify-center rounded-xl bg-[#529027] px-6 py-4 font-black text-white shadow-lg shadow-[#529027]/20 transition hover:bg-[#6aa63b]"
            >
              Get a quote
            </Link>

          </div>

        </section>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">

            <p className="font-semibold text-red-300">
              {errorMessage}
            </p>

          </div>
        )}

        {/* DASHBOARD BUTTONS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">

          <DashboardButton
            href="/customer/post-job"
            title="Get a quote"
            description="Tell us what needs collecting"
          />

          <DashboardButton
            href={
              jobs.length > 0
                ? `/customer/jobs/${jobs[0].id}`
                : "/customer/dashboard"
            }
            title="My quotes"
            description="Compare drivers and prices"
            disabled={
              jobs.length === 0
            }
          />

          <DashboardButton
            href={
              activeJobs.length > 0
                ? `/customer/jobs/${activeJobs[0].id}`
                : "/customer/dashboard"
            }
            title="My jobs"
            description="View your booked collections"
            disabled={
              activeJobs.length === 0
            }
          />

        </div>

        {/* STATS */}

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">

          <StatCard
            number={jobs.length}
            label="Jobs submitted"
          />

          <StatCard
            number={totalQuotes}
            label="Quotes received"
          />

          <StatCard
            number={activeJobs.length}
            label="Active jobs"
          />

          <StatCard
            number={
              completedJobs.length
            }
            label="Completed"
          />

        </div>

        {/* JOBS */}

        <section className="mt-8">

          <div className="mb-5 flex items-end justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-[#529027]">
                Your activity
              </p>

              <h2 className="mt-1 text-2xl font-black text-white">
                Your jobs
              </h2>

            </div>

            {jobs.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  loadDashboard()
                }
                className="text-sm font-bold text-[#6aa63b] transition hover:text-[#8bc45b]"
              >
                Refresh
              </button>
            )}

          </div>

          {/* LOADING */}

          {loading ? (

            <div className="rounded-3xl border border-white/10 bg-[#0d1a11] p-10 text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#529027]" />

              <p className="mt-4 font-semibold text-white/60">
                Loading your jobs...
              </p>

            </div>

          ) : jobs.length === 0 ? (

            /* NO JOBS */

            <div className="rounded-3xl border border-white/10 bg-[#0d1a11] p-10 text-center sm:p-14">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#529027]/15">

                <span className="text-2xl font-black text-[#529027]">
                  +
                </span>

              </div>

              <h3 className="mt-5 text-2xl font-black">
                No jobs yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
                Post your first job and let
                approved RCS drivers compete
                to complete your collection.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-6 inline-flex rounded-xl bg-[#529027] px-6 py-3 font-black text-white transition hover:bg-[#6aa63b]"
              >
                Get your first quote
              </Link>

            </div>

          ) : (

            /* JOB LIST */

            <div className="space-y-4">

              {jobs.map((job) => {

                const quoteCount =
                  bids.filter(
                    (bid) =>
                      bid.job_id ===
                      job.id
                  ).length;

                return (
                  <JobCard
                    key={job.id}
                    job={job}
                    quoteCount={
                      quoteCount
                    }
                  />
                );
              })}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}

/* ========================================================= */
/* DASHBOARD BUTTON                                          */
/* ========================================================= */

function DashboardButton({
  href,
  title,
  description,
  disabled,
}: {
  href: string;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="cursor-not-allowed rounded-2xl border border-white/10 bg-[#0d1a11] p-6 opacity-40">

        <h3 className="text-xl font-black">
          {title}
        </h3>

        <p className="mt-2 text-sm text-white/50">
          {description}
        </p>

      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-[#0d1a11] p-6 transition hover:-translate-y-1 hover:border-[#529027]/50 hover:bg-[#102218]"
    >

      <div className="flex items-center justify-between">

        <h3 className="text-xl font-black">
          {title}
        </h3>

        <span className="text-xl text-[#529027] transition group-hover:translate-x-1">
          →
        </span>

      </div>

      <p className="mt-2 text-sm text-white/50">
        {description}
      </p>

    </Link>
  );
}

/* ========================================================= */
/* STAT CARD                                                 */
/* ========================================================= */

function StatCard({
  number,
  label,
}: {
  number: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1a11] p-5">

      <p className="text-2xl font-black text-white sm:text-3xl">
        {number}
      </p>

      <p className="mt-1 text-xs font-bold text-white/40 sm:text-sm">
        {label}
      </p>

    </div>
  );
}

/* ========================================================= */
/* JOB CARD                                                  */
/* ========================================================= */

function JobCard({
  job,
  quoteCount,
}: {
  job: Job;
  quoteCount: number;
}) {
  const isAssigned =
    Boolean(job.assigned_driver_id) ||
    Boolean(job.accepted_bid_id) ||
    Boolean(job.assigned_bid_id) ||
    job.status === "assigned" ||
    job.status === "in_progress" ||
    job.status === "driver_assigned";

  const isCompleted =
    job.status === "completed";

  const isCancelled =
    job.status === "cancelled";

  const isWaitingForBids =
    !isAssigned &&
    !isCompleted &&
    !isCancelled;

  let statusLabel =
    "WAITING FOR DRIVER BIDS";

  if (isCompleted) {
    statusLabel = "COMPLETED";
  } else if (isCancelled) {
    statusLabel = "CANCELLED";
  } else if (isAssigned) {
    statusLabel = "BOOKED";
  } else if (quoteCount > 0) {
    statusLabel =
      quoteCount === 1
        ? "1 DRIVER QUOTE RECEIVED"
        : `${quoteCount} DRIVER QUOTES RECEIVED`;
  }

  const statusClass =
    isCompleted
      ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
      : isCancelled
        ? "border-red-500/20 bg-red-500/10 text-red-300"
        : isAssigned
          ? "border-[#529027]/30 bg-[#529027]/15 text-[#8bc45b]"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300";

  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="group block rounded-3xl border border-white/10 bg-[#0d1a11] p-5 transition hover:border-[#529027]/40 hover:bg-[#102218] sm:p-6"
    >

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-3">

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusClass}`}
            >
              {statusLabel}
            </span>

            <span className="text-xs font-bold text-white/30">
              {job.reference ||
                `RC-${String(job.id).padStart(6, "0")}`}
            </span>

          </div>

          <h3 className="mt-3 text-xl font-black text-white">
            {job.job_type}
          </h3>

          <div className="mt-2 space-y-1 text-sm text-white/50">

            <p>
              {job.postcode}

              {job.address
                ? ` · ${job.address}`
                : ""}
            </p>

            {job.preferred_date && (
              <p>
                Collection:{" "}
                {new Date(
                  job.preferred_date
                ).toLocaleDateString(
                  "en-GB"
                )}

                {job.preferred_time
                  ? ` · ${job.preferred_time}`
                  : ""}
              </p>
            )}

          </div>

          {!isAssigned &&
            !isCompleted &&
            !isCancelled && (
              <div className="mt-4 flex items-center gap-2">

                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />

                <p className="text-xs font-bold text-amber-300">
                  {quoteCount > 0
                    ? "Drivers are still able to submit quotes"
                    : "Waiting for drivers to submit bids"}
                </p>

              </div>
            )}

          {isAssigned &&
            !isCompleted && (
              <div className="mt-4 flex items-center gap-2">

                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#529027] text-xs font-black">
                  ✓
                </span>

                <p className="text-xs font-bold text-[#8bc45b]">
                  Driver selected — your
                  collection is booked
                </p>

              </div>
            )}

        </div>

        <div className="flex items-center justify-between gap-5 sm:block sm:min-w-[160px] sm:text-right">

          <div>

            <p className="text-2xl font-black text-white">
              {quoteCount}
            </p>

            <p className="text-xs font-bold text-white/40">
              {quoteCount === 1
                ? "Driver quote"
                : "Driver quotes"}
            </p>

          </div>

          <span className="mt-3 hidden text-sm font-black text-[#6aa63b] transition group-hover:text-[#8bc45b] sm:block">
            View job →
          </span>

        </div>

      </div>

    </Link>
  );
}