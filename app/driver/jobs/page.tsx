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

        /*
         * CUSTOMER PHOTOS
         */

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
    return (
      <Loading />
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] pb-28 text-white">
      <PageHeader
        title="Available Jobs"
        subtitle={`${jobs.length} jobs currently available`}
        refreshing={refreshing}
        onRefresh={() =>
          loadJobs()
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-8">
        <Link
          href="/driver/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#1BBB8C]"
        >
          ← Back to Home
        </Link>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4">
            <p className="text-sm text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadJobs()
              }
              className="mt-2 text-sm font-black underline"
            >
              Try again
            </button>
          </div>
        )}

        {jobs.length === 0 ? (
          <Empty
            title="No jobs available"
            description="New customer jobs will appear here when they're ready for drivers to bid on."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
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
    <article className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#17382b] p-5">
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

          <span className="rounded-full bg-[#15392e] px-2.5 py-1 text-[9px] font-black text-[#1BBB8C]">
            {job.status ===
            "bidding"
              ? "BIDDING"
              : "OPEN"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <PhotoGallery photos={photos} />

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
            label="Date"
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
            Access
          </p>

          <p className="mt-1 text-sm leading-5 text-[#aebbb5]">
            {job.access_notes ||
              "No access details provided"}
          </p>
        </div>

        {(job.floor ||
          job.stairs) && (
          <div className="flex flex-wrap gap-2">
            {job.floor && (
              <span className="rounded-xl border border-[#29483a] bg-[#081710] px-3 py-2 text-xs font-bold">
                Floor: {job.floor}
              </span>
            )}

            {job.stairs && (
              <span className="rounded-xl border border-[#29483a] bg-[#081710] px-3 py-2 text-xs font-bold">
                Stairs
              </span>
            )}
          </div>
        )}

        {job.description && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#657a70]">
              Description
            </p>

            <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#aebbb5]">
              {job.description}
            </p>
          </div>
        )}

        <Link
          href={`/driver/jobs/${job.id}`}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-sm font-black text-[#06100c]"
        >
          View Job & Bid →
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
      <div className="rounded-2xl border border-dashed border-[#29483a] bg-[#081710] p-4">
        <p className="text-sm font-bold text-[#9aaba4]">
          No customer photos
        </p>

        <p className="mt-1 text-xs text-[#657a70]">
          No waste photos uploaded.
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
            className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-[#29483a]"
          >
            <img
              src={photo.url}
              alt="Customer waste"
              className="h-full w-full object-cover"
            />
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
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black text-2xl font-black"
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
    <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
            RCS Marketplace
          </p>

          <h1 className="text-lg font-black sm:text-xl">
            {title}
          </h1>

          <p className="text-[10px] text-[#71867c] sm:text-xs">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#29483a] text-lg font-black text-[#1BBB8C] disabled:opacity-50 sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
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
          Loading available jobs...
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