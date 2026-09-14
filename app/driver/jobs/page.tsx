"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
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
  description: string | null;
  floor: string | null;
  stairs: boolean | null;
  access_notes: string | null;
  preferred_date: string | null;
  preferred_time: number | null;
  status: string | null;
  assigned_driver_id: string | null;
};

type JobPhoto = {
  id: number;
  job_id: number;
  storage_path: string;
  url: string;
};

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

const JOB_SELECT = `
  id,
  reference,
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
  assigned_driver_id
`;

export default function AvailableJobsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [photos, setPhotos] =
    useState<Record<number, JobPhoto[]>>({});
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

        const {
          data: driver,
          error: driverError,
        } = await supabase
          .from("drivers")
          .select(
            "id, approved, application_status"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (
          driverError ||
          !driver ||
          !driver.approved ||
          driver.application_status !==
            "approved"
        ) {
          setError(
            "Your driver account is not currently approved."
          );
          return;
        }

        const {
          data,
          error: jobsError,
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

        if (jobsError) {
          throw jobsError;
        }

        const available =
          ((data || []) as Job[]).filter(
            (job) =>
              !job.assigned_driver_id
          );

        setJobs(available);

        if (available.length > 0) {
          const jobIds = available.map(
            (job) => job.id
          );

          const {
            data: photoRows,
            error: photoError,
          } = await supabase
            .from("job_photos")
            .select(
              "id, job_id, storage_path"
            )
            .in("job_id", jobIds)
            .order("id", {
              ascending: true,
            });

          if (!photoError && photoRows) {
            const result: Record<
              number,
              JobPhoto[]
            > = {};

            for (const row of photoRows) {
              const {
                data: signed,
              } = await supabase.storage
                .from(
                  "customer-job-photos"
                )
                .createSignedUrl(
                  row.storage_path,
                  60 * 60
                );

              if (!signed?.signedUrl) {
                continue;
              }

              const photo: JobPhoto = {
                id: row.id,
                job_id: row.job_id,
                storage_path:
                  row.storage_path,
                url: signed.signedUrl,
              };

              if (!result[row.job_id]) {
                result[row.job_id] = [];
              }

              result[row.job_id].push(
                photo
              );
            }

            setPhotos(result);
          }
        } else {
          setPhotos({});
        }
      } catch (err) {
        console.error(
          "Available jobs error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load available jobs."
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
    return <Loading />;
  }

  return (
    <main
      className="min-h-screen pb-28 text-white"
      style={{ background: BG }}
    >
      <PageHeader
        title="Available Jobs"
        subtitle={
          jobs.length === 1
            ? "1 job available to bid on"
            : `${jobs.length} jobs available to bid on`
        }
        refreshing={refreshing}
        onRefresh={() =>
          loadJobs()
        }
      />

      <section
        className="border-b"
        style={{
          background: SECTION,
          borderColor: "#1d251b",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.18em]"
                style={{ color: GREEN }}
              >
                RCS Driver Marketplace
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Find your next job.
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                View customer jobs, check the waste details
                and submit your bid directly through RCS.
              </p>
            </div>

            <div
              className="inline-flex w-fit items-center rounded-xl border px-4 py-3"
              style={{
                borderColor: "#294126",
                background: "#101610",
              }}
            >
              <span
                className="mr-2 h-2 w-2 rounded-full"
                style={{ background: GREEN }}
              />

              <span className="text-sm font-bold text-gray-300">
                Live marketplace
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <Link
          href="/driver/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-black transition"
          style={{ color: GREEN }}
        >
          ← Back to Driver Dashboard
        </Link>

        {error && (
          <div
            className="mb-6 rounded-2xl border p-5"
            style={{
              borderColor:
                "rgba(127,29,29,.7)",
              background: "rgba(69,10,10,.3)",
            }}
          >
            <p className="text-sm leading-6 text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadJobs()
              }
              className="mt-3 text-sm font-black text-white underline"
            >
              Try again
            </button>
          </div>
        )}

        {jobs.length === 0 ? (
          <Empty
            title="No jobs available right now"
            description="New customer jobs will appear here automatically when they are ready for drivers to bid on."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {jobs.map((job) => (
              <AvailableJobCard
                key={job.id}
                job={job}
                photos={
                  photos[job.id] || []
                }
              />
            ))}
          </div>
        )}
      </div>

      <DriverBottomNav />
    </main>
  );
}

function AvailableJobCard({
  job,
  photos,
}: {
  job: Job;
  photos: JobPhoto[];
}) {
  return (
    <article
      className="overflow-hidden rounded-3xl border shadow-xl"
      style={{
        background: CARD,
        borderColor: "#283326",
      }}
    >
      {/* CARD HEADER */}

      <div
        className="border-b p-5 sm:p-6"
        style={{
          borderColor: "#283326",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: GREEN }}
            >
              {job.reference ||
                `RC-${String(
                  job.id
                ).padStart(6, "0")}`}
            </p>

            <h2 className="mt-1.5 text-xl font-black tracking-tight sm:text-2xl">
              {job.job_type ||
                "Waste Collection"}
            </h2>
          </div>

          <span
            className="shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
            style={{
              color: GREEN,
              background: "#101a0d",
              borderColor: "#294126",
            }}
          >
            {job.status ===
            "bidding"
              ? "Bidding"
              : "New Job"}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* PHOTOS */}

        <PhotoGallery photos={photos} />

        {/* JOB DETAILS */}

        <div
          className="grid grid-cols-2 gap-4 rounded-2xl border p-4 sm:grid-cols-4"
          style={{
            background: SECTION,
            borderColor: "#283326",
          }}
        >
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
            label="Collection"
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

        {/* ACCESS */}

        <div
          className="rounded-2xl border p-4"
          style={{
            background: "#080d09",
            borderColor: "#283326",
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.15em]"
            style={{ color: "#65705f" }}
          >
            Access details
          </p>

          <p className="mt-1.5 text-sm leading-6 text-gray-400">
            {job.access_notes ||
              "No access details provided."}
          </p>
        </div>

        {/* FLOOR / STAIRS */}

        {(job.floor ||
          job.stairs) && (
          <div className="flex flex-wrap gap-2">
            {job.floor && (
              <span
                className="rounded-xl border px-3 py-2 text-xs font-bold"
                style={{
                  background: "#101610",
                  borderColor: "#294126",
                }}
              >
                Floor: {job.floor}
              </span>
            )}

            {job.stairs && (
              <span
                className="rounded-xl border px-3 py-2 text-xs font-bold"
                style={{
                  background: "#101610",
                  borderColor: "#294126",
                }}
              >
                Stairs
              </span>
            )}
          </div>
        )}

        {/* DESCRIPTION */}

        {job.description && (
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.15em]"
              style={{ color: "#65705f" }}
            >
              Customer description
            </p>

            <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-gray-400">
              {job.description}
            </p>
          </div>
        )}

        {/* CTA */}

        <Link
          href={`/driver/jobs/${job.id}`}
          className="group flex min-h-14 w-full items-center justify-center rounded-xl px-5 py-4 text-sm font-black text-black transition"
          style={{
            background: GREEN,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background =
              GREEN_HOVER)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background =
              GREEN)
          }
        >
          View Job & Place Bid
          <span className="ml-2 transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

function PhotoGallery({
  photos,
}: {
  photos: JobPhoto[];
}) {
  const [selected, setSelected] =
    useState<JobPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed p-4"
        style={{
          background: SECTION,
          borderColor: "#294126",
        }}
      >
        <p className="text-sm font-bold text-gray-400">
          No customer photos
        </p>

        <p className="mt-1 text-xs text-gray-600">
          The customer did not upload any waste photos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() =>
              setSelected(photo)
            }
            className="relative h-36 w-36 shrink-0 overflow-hidden rounded-2xl border transition hover:opacity-90"
            style={{
              borderColor: "#294126",
            }}
          >
            <img
              src={photo.url}
              alt="Customer waste"
              className="h-full w-full object-cover"
            />

            <div className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-1 text-[9px] font-black text-white">
              VIEW
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4"
          onClick={() =>
            setSelected(null)
          }
        >
          <img
            src={selected.url}
            alt="Customer waste"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />

          <button
            type="button"
            onClick={() =>
              setSelected(null)
            }
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black text-2xl font-black text-white"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

function PageHeader({
  title,
  subtitle,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{
        background:
          "rgba(5,7,5,0.94)",
        borderColor: "#283326",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/driver/dashboard"
            className="hidden shrink-0 sm:block"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={150}
              height={60}
              className="h-10 w-auto object-contain"
            />
          </Link>

          <div className="min-w-0">
            <p
              className="text-[9px] font-black uppercase tracking-[0.18em]"
              style={{ color: GREEN }}
            >
              RCS Marketplace
            </p>

            <h1 className="truncate text-lg font-black sm:text-xl">
              {title}
            </h1>

            <p className="truncate text-[10px] text-gray-600 sm:text-xs">
              {subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex h-10 shrink-0 items-center justify-center rounded-xl border px-3 text-sm font-black transition disabled:opacity-50 sm:px-4"
          style={{
            borderColor: "#354433",
            color: GREEN,
          }}
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
      </div>
    </header>
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
    <div className="min-w-0">
      <p
        className="text-[9px] font-black uppercase tracking-[0.12em]"
        style={{ color: "#65705f" }}
      >
        {label}
      </p>

      <p className="mt-1 text-xs font-bold leading-5 text-gray-200">
        {value}
      </p>
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
    <div
      className="rounded-3xl border border-dashed px-5 py-16 text-center"
      style={{
        background: CARD,
        borderColor: "#294126",
      }}
    >
      <div
        className="mx-auto h-1.5 w-12 rounded-full"
        style={{ background: GREEN }}
      />

      <h2 className="mt-5 text-2xl font-black">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
        {description}
      </p>

      <Link
        href="/driver/dashboard"
        className="mt-7 inline-flex rounded-xl px-5 py-3 text-sm font-black text-black"
        style={{ background: GREEN }}
      >
        Back to Dashboard
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
          className="mx-auto h-11 w-11 animate-spin rounded-full border-4"
          style={{
            borderColor: "#283326",
            borderTopColor: GREEN,
          }}
        />

        <p className="mt-5 font-black">
          Loading available jobs...
        </p>

        <p className="mt-1 text-sm text-gray-600">
          Connecting to the RCS Marketplace
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