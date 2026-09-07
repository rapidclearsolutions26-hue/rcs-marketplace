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
  preferred_time: number | null;
  status: string | null;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  journey_status: string | null;
  created_at: string;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number;
  message: string | null;
  status: string | null;
};

type Driver = {
  id: string;
  full_name: string | null;
  approved: boolean | null;
  application_status: string | null;
};

type JobPhoto = {
  id: number;
  job_id: number;
  storage_path: string;
  url: string;
};

const RCS_FEE_PERCENT = 10;

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

export default function DriverDashboard() {
  const router = useRouter();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [pendingBids, setPendingBids] = useState<Bid[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [acceptedBids, setAcceptedBids] = useState<Bid[]>([]);

  const [jobPhotos, setJobPhotos] = useState<
    Record<number, JobPhoto[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getBidForJob = useCallback(
    (jobId: number) => {
      return acceptedBids.find(
        (bid) =>
          Number(bid.job_id) === Number(jobId) &&
          bid.status === "accepted"
      );
    },
    [acceptedBids]
  );

  const getCustomerPrice = useCallback(
    (jobId: number) => {
      const bid = getBidForJob(jobId);

      return Number(bid?.amount || 0);
    },
    [getBidForJob]
  );

  const getRcsFee = useCallback(
    (jobId: number) => {
      const customerPrice = getCustomerPrice(jobId);

      return customerPrice * (RCS_FEE_PERCENT / 100);
    },
    [getCustomerPrice]
  );

  const getDriverPayout = useCallback(
    (jobId: number) => {
      const customerPrice = getCustomerPrice(jobId);
      const rcsFee =
        customerPrice * (RCS_FEE_PERCENT / 100);

      return customerPrice - rcsFee;
    },
    [getCustomerPrice]
  );

  const loadJobPhotos = useCallback(
    async (jobs: Job[]) => {
      if (jobs.length === 0) {
        setJobPhotos({});
        return;
      }

      try {
        const supabase = createClient();

        const jobIds = jobs.map((job) => job.id);

        const {
          data: photoRows,
          error: photoError,
        } = await supabase
          .from("job_photos")
          .select("id, job_id, storage_path")
          .in("job_id", jobIds)
          .order("id", {
            ascending: true,
          });

        if (photoError) {
          console.error(
            "Customer job photos error:",
            photoError
          );

          setJobPhotos({});
          return;
        }

        const rows = (photoRows || []) as Array<{
          id: number;
          job_id: number;
          storage_path: string;
        }>;

        if (rows.length === 0) {
          setJobPhotos({});
          return;
        }

        const photoResults: Record<
          number,
          JobPhoto[]
        > = {};

        for (const row of rows) {
          const {
            data: signedUrlData,
            error: signedUrlError,
          } = await supabase.storage
            .from("customer-job-photos")
            .createSignedUrl(
              row.storage_path,
              60 * 60
            );

          if (signedUrlError) {
            console.error(
              "Signed photo URL error:",
              signedUrlError
            );
            continue;
          }

          if (!signedUrlData?.signedUrl) {
            continue;
          }

          const photo: JobPhoto = {
            id: row.id,
            job_id: row.job_id,
            storage_path: row.storage_path,
            url: signedUrlData.signedUrl,
          };

          if (!photoResults[row.job_id]) {
            photoResults[row.job_id] = [];
          }

          photoResults[row.job_id].push(photo);
        }

        setJobPhotos(photoResults);
      } catch (error) {
        console.error(
          "Job photo loading error:",
          error
        );

        setJobPhotos({});
      }
    },
    []
  );

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

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "Authentication error:",
            authError
          );

          setErrorMessage(
            "We couldn't verify your driver account."
          );

          return;
        }

        if (!user) {
          router.replace("/driver/login");
          return;
        }

        const {
          data: driverData,
          error: driverError,
        } = await supabase
          .from("drivers")
          .select(
            "id, full_name, approved, application_status"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (driverError) {
          console.error(
            "Driver loading error:",
            driverError
          );

          setErrorMessage(
            driverError.message ||
              "We couldn't load your driver account."
          );

          return;
        }

        if (!driverData) {
          setDriver(null);

          setErrorMessage(
            "Your driver account could not be found. Please contact Rapid Clear Solutions."
          );

          return;
        }

        const currentDriver =
          driverData as Driver;

        setDriver(currentDriver);

        if (
          !currentDriver.approved ||
          currentDriver.application_status !==
            "approved"
        ) {
          setAvailableJobs([]);
          setPendingBids([]);
          setActiveJobs([]);
          setAcceptedJobs([]);
          setAcceptedBids([]);
          setJobPhotos({});

          return;
        }

        /*
         * DRIVER BIDS
         */

        const {
          data: bidsData,
          error: bidsError,
        } = await supabase
          .from("bids")
          .select(`
            id,
            job_id,
            driver_id,
            amount,
            message,
            status
          `)
          .eq("driver_id", user.id)
          .order("id", {
            ascending: false,
          });

        let driverBids: Bid[] = [];

        if (bidsError) {
          console.error(
            "Driver bids error:",
            bidsError
          );
        } else {
          driverBids = (bidsData || []) as Bid[];

          setPendingBids(
            driverBids.filter(
              (bid) =>
                !bid.status ||
                bid.status === "pending"
            )
          );

          setAcceptedBids(
            driverBids.filter(
              (bid) => bid.status === "accepted"
            )
          );
        }

        /*
         * AVAILABLE JOBS
         */

        const {
          data: availableData,
          error: availableError,
        } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .in("status", ["open", "bidding"])
          .order("created_at", {
            ascending: false,
          });

        let availableJobsList: Job[] = [];

        if (availableError) {
          console.error(
            "Available jobs error:",
            availableError
          );

          setErrorMessage(
            availableError.message ||
              "We couldn't load available jobs."
          );
        } else {
          const jobs =
            (availableData || []) as Job[];

          availableJobsList = jobs.filter(
            (job) =>
              !job.assigned_driver_id &&
              job.status !== "completed" &&
              job.status !== "cancelled"
          );

          setAvailableJobs(
            availableJobsList
          );
        }

        /*
         * ASSIGNED JOBS
         */

        const {
          data: assignedData,
          error: assignedError,
        } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq("assigned_driver_id", user.id)
          .order("preferred_date", {
            ascending: true,
          });

        if (assignedError) {
          console.error(
            "Assigned jobs error:",
            assignedError
          );

          setErrorMessage(
            assignedError.message ||
              "We couldn't load your assigned jobs."
          );

          return;
        }

        const assignedJobs =
          (assignedData || []) as Job[];

        setAcceptedJobs(
          assignedJobs.filter(
            (job) =>
              job.status === "assigned" ||
              job.status === "accepted"
          )
        );

        setActiveJobs(
          assignedJobs.filter(
            (job) =>
              job.status === "in_progress"
          )
        );

        /*
         * LOAD CUSTOMER PHOTOS
         *
         * Photos are needed for available jobs
         * so drivers can inspect the waste before
         * submitting a bid.
         */

        await loadJobPhotos(
          availableJobsList
        );
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong loading the dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, loadJobPhotos]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadDashboard(true);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  async function logout() {
    try {
      const supabase = createClient();

      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }

    router.replace("/driver/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

            <p className="mt-5 text-lg font-black">
              Loading driver dashboard...
            </p>

            <p className="mt-2 text-sm text-[#71867c]">
              Checking your jobs and bids
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!driver && errorMessage) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <header className="border-b border-[#17382b] bg-[#081710]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
            <Link
              href="/"
              className="text-xl font-black"
            >
              RAPID CLEAR{" "}
              <span className="text-[#1BBB8C]">
                SOLUTIONS
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="rounded-3xl border border-red-900/50 bg-[#0b1b14] p-8 text-center">
            <h1 className="text-3xl font-black">
              Driver account problem
            </h1>

            <p className="mt-4 text-[#8fa39a]">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDashboard()
              }
              className="mt-7 rounded-xl bg-[#1BBB8C] px-6 py-3 font-black text-[#06100c]"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (
    driver &&
    (!driver.approved ||
      driver.application_status !==
        "approved")
  ) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <header className="border-b border-[#17382b] bg-[#081710]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
            <Link
              href="/"
              className="text-xl font-black"
            >
              RAPID CLEAR{" "}
              <span className="text-[#1BBB8C]">
                SOLUTIONS
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 py-16">
          <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123529] text-2xl font-black text-[#1BBB8C]">
              !
            </div>

            <h1 className="mt-6 text-3xl font-black">
              Application under review
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-[#8fa39a]">
              Your driver account needs to be approved
              before you can view and bid on available work.
            </p>

            <button
              type="button"
              onClick={logout}
              className="mt-7 rounded-xl bg-[#1BBB8C] px-6 py-3 font-black text-[#06100c]"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="sticky top-0 z-30 border-b border-[#17382b] bg-[#081710]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/"
            className="text-lg font-black sm:text-xl"
          >
            RAPID CLEAR{" "}
            <span className="text-[#1BBB8C]">
              SOLUTIONS
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-[#687d73]">
                Driver
              </p>

              <p className="text-sm font-bold">
                {driver?.full_name ||
                  "Driver"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadDashboard()
              }
              disabled={refreshing}
              className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#aabbb4] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#c5d1cb] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
              RCS Marketplace
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Driver Dashboard
            </h1>

            <p className="mt-2 text-[#82958c]">
              Find work, submit bids and manage your accepted jobs.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-7 rounded-2xl border border-red-900/60 bg-[#230e0e] p-5">
            <p className="font-semibold text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDashboard()
              }
              className="mt-3 text-sm font-bold text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Available Jobs"
            value={availableJobs.length}
            description="Jobs available to bid on"
          />

          <StatCard
            title="My Pending Bids"
            value={pendingBids.length}
            description="Bids awaiting customer decision"
          />

          <StatCard
            title="Active Jobs"
            value={activeJobs.length}
            description="Jobs currently in progress"
          />

          <StatCard
            title="Accepted Work"
            value={acceptedJobs.length}
            description="Paid jobs assigned to you"
          />
        </div>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Paid & Assigned"
            title="Your Assigned Jobs"
          />

          {acceptedJobs.length === 0 ? (
            <EmptyState
              title="No assigned jobs"
              description="When a customer pays for one of your bids, the job will appear here."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {acceptedJobs.map(
                (job) => (
                  <AssignedJobCard
                    key={job.id}
                    job={job}
                    customerPrice={getCustomerPrice(
                      job.id
                    )}
                    rcsFee={getRcsFee(
                      job.id
                    )}
                    driverPayout={getDriverPayout(
                      job.id
                    )}
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="In Progress"
            title="Active Jobs"
          />

          {activeJobs.length === 0 ? (
            <EmptyState
              title="No active jobs"
              description="Jobs you start will appear here until they are completed."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {activeJobs.map(
                (job) => (
                  <AcceptedJobCard
                    key={job.id}
                    job={job}
                    driverPayout={getDriverPayout(
                      job.id
                    )}
                    rcsFee={getRcsFee(
                      job.id
                    )}
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Marketplace"
            title="Available Jobs"
          />

          {availableJobs.length === 0 ? (
            <EmptyState
              title="No jobs available"
              description="New customer jobs will appear here when they are available to bid on."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {availableJobs.map(
                (job) => (
                  <AvailableJobCard
                    key={job.id}
                    job={job}
                    photos={
                      jobPhotos[job.id] ||
                      []
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-10 pb-12">
          <SectionHeading
            eyebrow="Your Bids"
            title="My Pending Bids"
          />

          {pendingBids.length === 0 ? (
            <EmptyState
              title="No pending bids"
              description="Jobs you bid on will appear here while the customer is deciding."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {pendingBids.map(
                (bid) => (
                  <PendingBidCard
                    key={bid.id}
                    bid={bid}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MoneyBox({
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
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-[#3f8d24] bg-[#162b13]"
          : "border-[#214333] bg-[#08150f]"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-wide text-[#71867c]">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-black ${
          highlight
            ? "text-[#1BBB8C]"
            : "text-white"
        }`}
      >
        £
        {Number(value || 0).toFixed(
          2
        )}
      </p>
    </div>
  );
}

function AssignedJobCard({
  job,
  customerPrice,
  rcsFee,
  driverPayout,
}: {
  job: Job;
  customerPrice: number;
  rcsFee: number;
  driverPayout: number;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#3f8d24] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#214333] bg-[#10230f] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference ||
                `RC-${String(
                  job.id
                ).padStart(6, "0")}`}
            </p>

            <h3 className="mt-2 text-xl font-black">
              {job.job_type ||
                "Waste Collection"}
            </h3>
          </div>

          <span className="rounded-full border border-[#3f8d24] bg-[#183017] px-3 py-1 text-xs font-black text-[#1BBB8C]">
            {job.status ===
            "in_progress"
              ? "IN PROGRESS"
              : "PAID & ASSIGNED"}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <MoneyBox
            label="Customer paid"
            value={customerPrice}
          />

          <MoneyBox
            label={`RCS ${RCS_FEE_PERCENT}%`}
            value={rcsFee}
          />

          <MoneyBox
            label="Your payout"
            value={driverPayout}
            highlight
          />
        </div>

        <div className="rounded-2xl border border-[#214333] bg-[#07130e] p-4">
          <p className="text-sm font-black text-white">
            Payment confirmed
          </p>

          <p className="mt-1 text-sm text-[#82958c]">
            The customer has paid and the job
            has been assigned to you.
          </p>
        </div>

        <div className="space-y-4">
          <JobLine
            label="Location"
            value={
              job.postcode ||
              "Not provided"
            }
          />

          <JobLine
            label="Collection date"
            value={
              job.preferred_date
                ? formatDate(
                    job.preferred_date
                  )
                : "Not provided"
            }
          />

          <JobLine
            label="Collection time"
            value={formatPreferredTime(
              job.preferred_time
            )}
          />

          <JobLine
            label="Load size"
            value={
              job.load_size ||
              "Not specified"
            }
          />
        </div>

        <Link
          href={`/driver/jobs/${job.id}`}
          className="block w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] hover:bg-[#16a77c]"
        >
          Manage Job
        </Link>
      </div>
    </div>
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
    <div className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#17382b] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference ||
                `RC-${String(
                  job.id
                ).padStart(6, "0")}`}
            </p>

            <h3 className="mt-2 text-xl font-black">
              {job.job_type ||
                "Waste Collection"}
            </h3>
          </div>

          <span className="rounded-full border border-[#285342] bg-[#10291f] px-3 py-1 text-xs font-black text-[#1BBB8C]">
            {job.status ===
            "bidding"
              ? "BIDDING"
              : "OPEN"}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <CustomerPhotoGallery
          photos={photos}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <JobLine
            label="Location"
            value={
              job.postcode ||
              "Postcode not provided"
            }
          />

          <JobLine
            label="Collection date"
            value={
              job.preferred_date
                ? formatDate(
                    job.preferred_date
                  )
                : "Date not provided"
            }
          />

          <JobLine
            label="Preferred time"
            value={formatPreferredTime(
              job.preferred_time
            )}
          />

          <JobLine
            label="Load size"
            value={
              job.load_size ||
              "Not specified"
            }
          />
        </div>

        <JobLine
          label="Access"
          value={
            job.access_notes ||
            "No access details provided"
          }
        />

        {job.floor && (
          <JobLine
            label="Floor"
            value={job.floor}
          />
        )}

        {job.stairs && (
          <div className="rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3">
            <p className="text-sm font-bold text-[#d5dfda]">
              Stairs involved
            </p>
          </div>
        )}

        {job.description && (
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">
              Description
            </p>

            <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#aebbb5]">
              {job.description}
            </p>
          </div>
        )}

        <Link
          href={`/driver/jobs/${job.id}`}
          className="block w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] hover:bg-[#16a77c]"
        >
          View Job & Bid
        </Link>
      </div>
    </div>
  );
}

function CustomerPhotoGallery({
  photos,
}: {
  photos: JobPhoto[];
}) {
  const [selectedPhoto, setSelectedPhoto] =
    useState<JobPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#29483a] bg-[#081710] p-5">
        <p className="text-sm font-bold text-[#9aaba4]">
          No customer photos
        </p>

        <p className="mt-1 text-xs text-[#657a70]">
          The customer hasn't uploaded any waste photos for this job.
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1BBB8C]">
              Waste photos
            </p>

            <p className="mt-1 text-xs text-[#657a70]">
              Review the waste before placing your bid.
            </p>
          </div>

          <span className="rounded-full bg-[#15392e] px-3 py-1 text-xs font-black text-[#1BBB8C]">
            {photos.length}{" "}
            {photos.length === 1
              ? "photo"
              : "photos"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() =>
                setSelectedPhoto(
                  photo
                )
              }
              className="group relative aspect-square overflow-hidden rounded-2xl border border-[#29483a] bg-[#081710] text-left"
            >
              <img
                src={photo.url}
                alt="Customer waste"
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
                <p className="text-xs font-bold text-white">
                  View photo
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5"
          onClick={() =>
            setSelectedPhoto(null)
          }
        >
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={selectedPhoto.url}
              alt="Customer waste"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            />

            <button
              type="button"
              onClick={() =>
                setSelectedPhoto(null)
              }
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-xl font-black text-white hover:bg-[#1BBB8C] hover:text-[#06100c]"
              aria-label="Close photo"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function PendingBidCard({
  bid,
}: {
  bid: Bid;
}) {
  const driverAmount =
    Number(bid.amount || 0);

  const rcsFee =
    driverAmount *
    (RCS_FEE_PERCENT / 100);

  const driverPayout =
    driverAmount - rcsFee;

  return (
    <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">
            Job
          </p>

          <p className="mt-1 text-lg font-black">
            RC-
            {String(
              bid.job_id
            ).padStart(6, "0")}
          </p>
        </div>

        <span className="rounded-full border border-[#29483a] bg-[#18271f] px-3 py-1 text-xs font-black text-[#b8c6c0]">
          BID PENDING
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MoneyBox
          label="Your bid"
          value={driverAmount}
        />

        <MoneyBox
          label={`RCS ${RCS_FEE_PERCENT}%`}
          value={rcsFee}
        />

        <MoneyBox
          label="You receive"
          value={driverPayout}
          highlight
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[#214333] bg-[#07130e] p-4">
        <p className="text-sm font-black text-white">
          If your bid is accepted
        </p>

        <p className="mt-1 text-sm leading-6 text-[#82958c]">
          RCS takes {RCS_FEE_PERCENT}% from
          the accepted bid. You receive the
          remaining 90%.
        </p>
      </div>

      {bid.message && (
        <p className="mt-4 rounded-2xl bg-[#07130e] p-4 text-sm leading-6 text-[#aab8b2]">
          {bid.message}
        </p>
      )}

      <Link
        href={`/driver/jobs/${bid.job_id}`}
        className="mt-5 block w-full rounded-xl border border-[#29483a] px-5 py-3 text-center font-black text-white hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
      >
        View Job
      </Link>
    </div>
  );
}

function AcceptedJobCard({
  job,
  driverPayout,
  rcsFee,
}: {
  job: Job;
  driverPayout: number;
  rcsFee: number;
}) {
  const isActive =
    job.status === "in_progress";

  return (
    <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#1BBB8C]">
            {job.reference ||
              `RC-${String(
                job.id
              ).padStart(6, "0")}`}
          </p>

          <h3 className="mt-2 text-xl font-black">
            {job.job_type ||
              "Waste Collection"}
          </h3>
        </div>

        <span className="rounded-full bg-[#15392e] px-3 py-1 text-xs font-black text-[#1BBB8C]">
          {isActive
            ? "IN PROGRESS"
            : "ACCEPTED"}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <MoneyBox
          label={`RCS ${RCS_FEE_PERCENT}% deducted`}
          value={rcsFee}
        />

        <MoneyBox
          label="Your payout"
          value={driverPayout}
          highlight
        />
      </div>

      <div className="mt-6 space-y-5">
        <JobLine
          label="Location"
          value={
            job.postcode ||
            "Not provided"
          }
        />

        <JobLine
          label="Collection date"
          value={
            job.preferred_date
              ? formatDate(
                  job.preferred_date
                )
              : "Not provided"
          }
        />

        <JobLine
          label="Time"
          value={formatPreferredTime(
            job.preferred_time
          )}
        />
      </div>

      <Link
        href={`/driver/jobs/${job.id}`}
        className="mt-6 block w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] hover:bg-[#16a77c]"
      >
        Manage Job
      </Link>
    </div>
  );
}

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

function JobLine({
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

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] px-6 py-12 text-center">
      <div className="mx-auto h-1.5 w-14 rounded-full bg-[#1BBB8C]" />

      <h3 className="mt-5 text-xl font-black">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#71857b]">
        {description}
      </p>
    </div>
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
      year: "numeric",
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
    return "Morning · 8:00 AM – 12:00 PM";
  }

  if (numericTime === 13) {
    return "Afternoon · 1:00 PM – 5:00 PM";
  }

  if (numericTime === 18) {
    return "Evening · 6:00 PM – 8:00 PM";
  }

  if (!time && time !== 0) {
    return "Not specified";
  }

  return "Time window not specified";
}