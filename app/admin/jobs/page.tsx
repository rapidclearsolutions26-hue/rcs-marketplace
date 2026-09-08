"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: number;
  reference: string;
  customer_id: string;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  description: string | null;
  floor: string | null;
  stairs: boolean | null;
  access_notes: string | null;
  preferred_date: string | null;
  preferred_time: number | string | null;
  status: string | null;
  accepted_bid_id: number | null;
  created_at: string;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  journey_status: string | null;
  payment_status: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number | null;
  message: string | null;
  status: string | null;
  created_at: string;
  accepted_at: string | null;
  platform_fee_percent: number | null;
  platform_fee: number | null;
  driver_payout: number | null;
};

type JobWithBid = Job & {
  winningBid: Bid | null;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobWithBid[]>([]);
  const [selectedJob, setSelectedJob] =
    useState<JobWithBid | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadJobs() {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { data: jobsData, error: jobsError } =
        await supabase
          .from("jobs")
          .select("*")
          .order("created_at", {
            ascending: false,
          });

      if (jobsError) {
        console.error("Jobs loading error:", jobsError);
        setErrorMessage(jobsError.message);
        setJobs([]);
        return;
      }

      const loadedJobs = (jobsData as Job[]) || [];

      if (loadedJobs.length === 0) {
        setJobs([]);
        return;
      }

      const jobIds = loadedJobs.map((job) => job.id);

      const { data: bidsData, error: bidsError } =
        await supabase
          .from("bids")
          .select("*")
          .in("job_id", jobIds)
          .order("created_at", {
            ascending: false,
          });

      if (bidsError) {
        console.error("Bids loading error:", bidsError);
        setErrorMessage(
          `Jobs loaded, but bids could not be loaded: ${bidsError.message}`
        );

        setJobs(
          loadedJobs.map((job) => ({
            ...job,
            winningBid: null,
          }))
        );

        return;
      }

      const loadedBids = (bidsData as Bid[]) || [];

      const jobsWithBids: JobWithBid[] =
        loadedJobs.map((job) => {
          const winningBid =
            loadedBids.find(
              (bid) =>
                bid.id === job.accepted_bid_id ||
                bid.id === job.assigned_bid_id
            ) || null;

          return {
            ...job,
            winningBid,
          };
        });

      setJobs(jobsWithBids);
    } catch (error) {
      console.error("Jobs loading error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load jobs."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  const openJobs = jobs.filter((job) =>
    ["open", "bidding"].includes(
      normalise(job.status)
    )
  );

  const assignedJobs = jobs.filter(
    (job) =>
      normalise(job.status) === "assigned" ||
      normalise(job.journey_status) === "assigned"
  );

  const completedJobs = jobs.filter(
    (job) =>
      normalise(job.status) === "completed" ||
      normalise(job.journey_status) === "completed"
  );

  const paidJobs = jobs.filter(
    (job) =>
      normalise(job.payment_status) === "paid"
  );

  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      {/* HEADER */}

      <header className="border-b border-[#dde5d8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin">
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>

          <div className="text-right">
            <p className="text-sm font-bold text-[#529027]">
              RCS ADMIN
            </p>

            <p className="text-xs text-[#777777]">
              Job Management
            </p>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* TITLE */}

        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-bold text-[#529027] hover:underline"
          >
            ← Back to Admin
          </Link>

          <h1 className="mt-4 text-4xl font-black text-[#111111]">
            Job Management
          </h1>

          <p className="mt-2 text-[#666666]">
            View and manage every RCS Marketplace job.
          </p>
        </div>

        {/* STATS */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Jobs"
            number={jobs.length}
            description="All marketplace jobs"
          />

          <StatCard
            title="Open / Bidding"
            number={openJobs.length}
            description="Waiting for a driver"
          />

          <StatCard
            title="Assigned"
            number={assignedJobs.length}
            description="Jobs with a driver"
          />

          <StatCard
            title="Completed"
            number={completedJobs.length}
            description="Finished jobs"
          />
        </div>

        {/* SECONDARY STATS */}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
              Paid Jobs
            </p>

            <p className="mt-2 text-4xl font-black text-[#111111]">
              {paidJobs.length}
            </p>

            <p className="mt-1 text-sm text-[#777777]">
              Payments marked as paid
            </p>
          </div>

          <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
              Total Job Value
            </p>

            <p className="mt-2 text-4xl font-black text-[#111111]">
              £
              {formatMoney(
                jobs.reduce(
                  (total, job) =>
                    total +
                    (job.winningBid?.amount || 0),
                  0
                )
              )}
            </p>

            <p className="mt-1 text-sm text-[#777777]">
              Accepted / assigned bid values
            </p>
          </div>
        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              {errorMessage}
            </p>
          </div>
        )}

        {/* JOBS */}

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#111111]">
                Marketplace Jobs
              </h2>

              <p className="mt-1 text-sm text-[#777777]">
                {jobs.length} total{" "}
                {jobs.length === 1 ? "job" : "jobs"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadJobs()}
              disabled={loading}
              className="rounded-xl border border-[#cbd5c5] bg-white px-4 py-2 text-sm font-bold text-[#315c18] hover:bg-[#f5f7f4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#e7f1df] border-t-[#529027]" />

              <p className="mt-4 font-semibold text-[#666666]">
                Loading jobs...
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-4xl">📋</p>

              <h3 className="mt-4 text-xl font-black text-[#111111]">
                No jobs yet
              </h3>

              <p className="mt-2 text-[#666666]">
                Customer jobs will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onView={() =>
                    setSelectedJob(job)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* JOB MODAL */}

      {selectedJob && (
        <JobModal
          job={selectedJob}
          onClose={() =>
            setSelectedJob(null)
          }
        />
      )}
    </main>
  );
}

/* ===================================================== */
/* JOB CARD                                               */
/* ===================================================== */

function JobCard({
  job,
  onView,
}: {
  job: JobWithBid;
  onView: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-black text-[#111111]">
              {job.reference}
            </h3>

            <StatusBadge status={job.status} />
          </div>

          <p className="mt-2 font-semibold text-[#444444]">
            {job.job_type || "Job type not specified"}
          </p>

          <p className="mt-1 text-sm text-[#666666]">
            {job.postcode || "No postcode"}
            {job.address
              ? ` • ${job.address}`
              : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#666666]">
            <span>
              📅 {formatDate(job.preferred_date)}
            </span>

            <span>
              🕐 {formatTime(job.preferred_time)}
            </span>

            <span>
              📦 {job.load_size || "Size not specified"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="text-left lg:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
              Accepted Bid
            </p>

            <p className="text-2xl font-black text-[#111111]">
              {job.winningBid?.amount !== null &&
              job.winningBid?.amount !==
                undefined
                ? `£${formatMoney(
                    job.winningBid.amount
                  )}`
                : "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <JourneyBadge
              status={job.journey_status}
            />

            <PaymentBadge
              status={job.payment_status}
            />
          </div>

          <button
            type="button"
            onClick={onView}
            className="rounded-xl bg-[#529027] px-5 py-3 font-bold text-white transition hover:bg-[#315c18]"
          >
            View Job
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* JOB MODAL                                              */
/* ===================================================== */

function JobModal({
  job,
  onClose,
}: {
  job: JobWithBid;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-modal-title"
    >
      <div className="my-8 w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[#dde5d8] p-6">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
              Marketplace Job
            </p>

            <h2
              id="job-modal-title"
              className="mt-1 truncate text-2xl font-black text-[#111111]"
            >
              {job.reference}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f7f4] text-xl font-bold text-[#555555] hover:bg-[#e7f1df]"
          >
            ×
          </button>
        </div>

        {/* CONTENT */}

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {/* STATUS */}

          <div className="rounded-2xl bg-[#f5f7f4] p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
                  Job Status
                </p>

                <StatusBadge status={job.status} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
                  Journey
                </p>

                <JourneyBadge
                  status={job.journey_status}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
                  Payment
                </p>

                <PaymentBadge
                  status={job.payment_status}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
                  Created
                </p>

                <p className="mt-2 font-bold text-[#111111]">
                  {formatDateTime(job.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* COLLECTION */}

          <DetailSection title="Collection Details">
            <Detail
              label="Reference"
              value={job.reference}
            />

            <Detail
              label="Job type"
              value={job.job_type}
            />

            <Detail
              label="Postcode"
              value={job.postcode}
            />

            <Detail
              label="Address"
              value={job.address}
            />

            <Detail
              label="Load size"
              value={job.load_size}
            />

            <Detail
              label="Preferred date"
              value={formatDate(
                job.preferred_date
              )}
            />

            <Detail
              label="Preferred time"
              value={formatTime(
                job.preferred_time
              )}
            />

            <Detail
              label="Floor"
              value={job.floor}
            />

            <Detail
              label="Stairs"
              value={
                job.stairs === null
                  ? null
                  : job.stairs
                    ? "Yes"
                    : "No"
              }
            />

            <Detail
              label="Access notes"
              value={job.access_notes}
            />
          </DetailSection>

          {/* DESCRIPTION */}

          <section className="mt-8">
            <h3 className="text-lg font-black text-[#111111]">
              Job Description
            </h3>

            <div className="mt-4 rounded-2xl border border-[#dde5d8] bg-[#f5f7f4] p-5">
              <p className="whitespace-pre-wrap break-words text-[#444444]">
                {job.description ||
                  "No description provided."}
              </p>
            </div>
          </section>

          {/* CUSTOMER */}

          <DetailSection title="Customer">
            <Detail
              label="Customer ID"
              value={job.customer_id}
            />

            <Detail
              label="Job ID"
              value={job.id}
            />
          </DetailSection>

          {/* DRIVER */}

          <DetailSection title="Driver Assignment">
            <Detail
              label="Assigned driver ID"
              value={job.assigned_driver_id}
            />

            <Detail
              label="Assigned bid ID"
              value={job.assigned_bid_id}
            />

            <Detail
              label="Accepted bid ID"
              value={job.accepted_bid_id}
            />
          </DetailSection>

          {/* BID */}

          <section className="mt-8">
            <h3 className="text-lg font-black text-[#111111]">
              Accepted Bid
            </h3>

            {job.winningBid ? (
              <div className="mt-4 rounded-2xl border border-[#dde5d8] bg-white p-5">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail
                    label="Bid amount"
                    value={`£${formatMoney(
                      job.winningBid.amount
                    )}`}
                  />

                  <Detail
                    label="Driver ID"
                    value={
                      job.winningBid.driver_id
                    }
                  />

                  <Detail
                    label="Bid status"
                    value={
                      job.winningBid.status
                    }
                  />

                  <Detail
                    label="Accepted"
                    value={
                      job.winningBid.accepted_at
                        ? formatDateTime(
                            job.winningBid
                              .accepted_at
                          )
                        : "Not recorded"
                    }
                  />

                  <Detail
                    label="RCS fee %"
                    value={
                      job.winningBid
                        .platform_fee_percent !==
                      null
                        ? `${job.winningBid.platform_fee_percent}%`
                        : null
                    }
                  />

                  <Detail
                    label="RCS fee"
                    value={
                      job.winningBid
                        .platform_fee !== null
                        ? `£${formatMoney(
                            job.winningBid
                              .platform_fee
                          )}`
                        : null
                    }
                  />

                  <Detail
                    label="Driver payout"
                    value={
                      job.winningBid
                        .driver_payout !== null
                        ? `£${formatMoney(
                            job.winningBid
                              .driver_payout
                          )}`
                        : null
                    }
                  />

                  <Detail
                    label="Bid created"
                    value={formatDateTime(
                      job.winningBid.created_at
                    )}
                  />
                </div>

                <div className="mt-5 border-t border-[#dde5d8] pt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
                    Driver message
                  </p>

                  <p className="mt-2 whitespace-pre-wrap break-words text-[#444444]">
                    {job.winningBid.message ||
                      "No message provided."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-[#dde5d8] bg-[#f5f7f4] p-5">
                <p className="font-semibold text-[#666666]">
                  No accepted bid recorded.
                </p>
              </div>
            )}
          </section>

          {/* STRIPE */}

          <DetailSection title="Stripe Payment">
            <Detail
              label="Payment status"
              value={job.payment_status}
            />

            <Detail
              label="Checkout session ID"
              value={
                job.stripe_checkout_session_id
              }
            />

            <Detail
              label="Payment intent ID"
              value={
                job.stripe_payment_intent_id
              }
            />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* STATUS BADGES                                          */
/* ===================================================== */

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus =
    normalise(status) || "unknown";

  const text = formatStatus(safeStatus);

  let className =
    "bg-[#f5f7f4] text-[#555555]";

  if (
    safeStatus === "open" ||
    safeStatus === "bidding"
  ) {
    className =
      "bg-amber-100 text-amber-800";
  }

  if (safeStatus === "assigned") {
    className =
      "bg-[#e7f1df] text-[#315c18]";
  }

  if (safeStatus === "completed") {
    className =
      "bg-green-100 text-green-800";
  }

  if (
    safeStatus === "cancelled" ||
    safeStatus === "rejected"
  ) {
    className =
      "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {text}
    </span>
  );
}

function JourneyBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus =
    normalise(status) || "unknown";

  let className =
    "bg-[#f5f7f4] text-[#555555]";

  if (safeStatus === "assigned") {
    className =
      "bg-blue-100 text-blue-800";
  }

  if (safeStatus === "on_the_way") {
    className =
      "bg-amber-100 text-amber-800";
  }

  if (safeStatus === "in_progress") {
    className =
      "bg-purple-100 text-purple-800";
  }

  if (safeStatus === "completed") {
    className =
      "bg-green-100 text-green-800";
  }

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {formatStatus(safeStatus)}
    </span>
  );
}

function PaymentBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus =
    normalise(status) || "unknown";

  let className =
    "bg-[#f5f7f4] text-[#555555]";

  if (safeStatus === "paid") {
    className =
      "bg-green-100 text-green-800";
  }

  if (
    safeStatus === "unpaid" ||
    safeStatus === "pending"
  ) {
    className =
      "bg-amber-100 text-amber-800";
  }

  if (
    safeStatus === "failed" ||
    safeStatus === "refunded"
  ) {
    className =
      "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {formatStatus(safeStatus)}
    </span>
  );
}

/* ===================================================== */
/* STAT CARD                                              */
/* ===================================================== */

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
      <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
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

/* ===================================================== */
/* DETAIL SECTION                                         */
/* ===================================================== */

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h3 className="text-lg font-black text-[#111111]">
        {title}
      </h3>

      <div className="mt-4 grid gap-4 rounded-2xl border border-[#dde5d8] bg-white p-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

/* ===================================================== */
/* DETAIL                                                 */
/* ===================================================== */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const displayValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "Not provided"
      : String(value);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold text-[#111111]">
        {displayValue}
      </p>
    </div>
  );
}

/* ===================================================== */
/* HELPERS                                                */
/* ===================================================== */

function normalise(
  value: string | null | undefined
) {
  return value?.trim().toLowerCase() || "";
}

function formatStatus(
  value: string | null | undefined
) {
  const safeValue =
    normalise(value) || "Unknown";

  return safeValue
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatMoney(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "0.00";
  }

  return Number(value).toFixed(2);
}

function formatDate(
  date: string | null | undefined
) {
  if (!date) {
    return "Not provided";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return parsedDate.toLocaleDateString(
    "en-GB"
  );
}

function formatDateTime(
  date: string | null | undefined
) {
  if (!date) {
    return "Not provided";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return parsedDate.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTime(
  time: number | string | null | undefined
) {
  if (
    time === null ||
    time === undefined ||
    time === ""
  ) {
    return "Not specified";
  }

  const numericTime = Number(time);

  if (numericTime === 8) {
    return "Morning";
  }

  if (numericTime === 13) {
    return "Afternoon";
  }

  if (numericTime === 18) {
    return "Evening";
  }

  if (
    numericTime >= 0 &&
    numericTime <= 23
  ) {
    return `${String(
      numericTime
    ).padStart(2, "0")}:00`;
  }

  return String(time);
}