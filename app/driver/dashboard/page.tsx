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
         * CUSTOMER PHOTOS
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
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

            <p className="mt-5 text-lg font-black">
              Loading dashboard...
            </p>

            <p className="mt-2 text-sm text-[#71867c]">
              Checking your jobs
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
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-5 sm:py-5">
            <Link
              href="/"
              className="text-base font-black sm:text-xl"
            >
              RAPID CLEAR{" "}
              <span className="text-[#1BBB8C]">
                SOLUTIONS
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#29483a] px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-16">
          <div className="rounded-3xl border border-red-900/50 bg-[#0b1b14] p-6 text-center sm:p-8">
            <h1 className="text-2xl font-black sm:text-3xl">
              Driver account problem
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#8fa39a] sm:text-base">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDashboard()
              }
              className="mt-7 min-h-12 rounded-xl bg-[#1BBB8C] px-6 py-3 font-black text-[#06100c]"
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
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-5 sm:py-5">
            <Link
              href="/"
              className="text-base font-black sm:text-xl"
            >
              RAPID CLEAR{" "}
              <span className="text-[#1BBB8C]">
                SOLUTIONS
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-[#29483a] px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-16">
          <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123529] text-2xl font-black text-[#1BBB8C] sm:h-16 sm:w-16">
              !
            </div>

            <h1 className="mt-6 text-2xl font-black sm:text-3xl">
              Application under review
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#8fa39a] sm:text-base sm:leading-7">
              Your driver account needs to be approved
              before you can view and bid on available work.
            </p>

            <button
              type="button"
              onClick={logout}
              className="mt-7 min-h-12 rounded-xl bg-[#1BBB8C] px-6 py-3 font-black text-[#06100c]"
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
      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <Link
            href="/"
            className="shrink-0 text-base font-black sm:text-xl"
          >
            <span className="hidden sm:inline">
              RAPID CLEAR{" "}
            </span>
            <span className="sm:hidden">
              RCS{" "}
            </span>
            <span className="text-[#1BBB8C]">
              MARKETPLACE
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#687d73]">
                Driver
              </p>

              <p className="max-w-[180px] truncate text-sm font-bold">
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
              className="flex min-h-10 items-center justify-center rounded-xl border border-[#29483a] px-3 text-xs font-black text-[#aabbb4] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:opacity-50 sm:px-4 sm:text-sm"
              aria-label="Refresh dashboard"
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

            <button
              type="button"
              onClick={logout}
              className="min-h-10 rounded-xl border border-[#29483a] px-3 text-xs font-black text-[#c5d1cb] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] sm:px-4 sm:text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-8">
        {/* MOBILE / DESKTOP HERO */}

        <section className="mb-6 rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:mb-8 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#1BBB8C]" />

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C] sm:text-xs">
                  RCS Marketplace
                </p>
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                Hi,{" "}
                {driver?.full_name
                  ?.split(" ")[0] ||
                  "Driver"}
                👋
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#82958c] sm:text-base">
                Find work, place bids and manage your
                collections.
              </p>
            </div>

            <div className="rounded-2xl border border-[#29483a] bg-[#07130e] px-4 py-3 sm:min-w-[190px]">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#657a70]">
                Auto refresh
              </p>

              <p className="mt-1 text-sm font-bold text-[#d5dfda]">
                Every 15 seconds
              </p>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4 sm:mb-7 sm:p-5">
            <p className="text-sm font-semibold text-red-300">
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

        {/* STATS */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <CompactStatCard
            title="Available"
            value={availableJobs.length}
            description="Jobs to bid"
            icon="◉"
          />

          <CompactStatCard
            title="Pending bids"
            value={pendingBids.length}
            description="Awaiting decision"
            icon="£"
          />

          <CompactStatCard
            title="Active"
            value={activeJobs.length}
            description="In progress"
            icon="→"
            active={activeJobs.length > 0}
          />

          <CompactStatCard
            title="Assigned"
            value={acceptedJobs.length}
            description="Paid work"
            icon="✓"
            active={acceptedJobs.length > 0}
          />
        </div>

        {/* ASSIGNED */}

        <section className="mt-8 sm:mt-10">
          <SectionHeading
            eyebrow="Paid & Assigned"
            title="Your Jobs"
            count={acceptedJobs.length}
          />

          {acceptedJobs.length === 0 ? (
            <EmptyState
              title="No assigned jobs"
              description="When a customer pays for one of your bids, the job will appear here."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
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

        {/* ACTIVE */}

        <section className="mt-8 sm:mt-10">
          <SectionHeading
            eyebrow="In Progress"
            title="Active Jobs"
            count={activeJobs.length}
          />

          {activeJobs.length === 0 ? (
            <EmptyState
              title="No active jobs"
              description="Jobs you start will appear here until they are completed."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
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

        {/* AVAILABLE */}

        <section className="mt-8 sm:mt-10">
          <SectionHeading
            eyebrow="Marketplace"
            title="Available Jobs"
            count={availableJobs.length}
          />

          {availableJobs.length === 0 ? (
            <EmptyState
              title="No jobs available"
              description="New customer jobs will appear here when they are available to bid on."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
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

        {/* PENDING BIDS */}

        <section className="mt-8 pb-10 sm:mt-10 sm:pb-12">
          <SectionHeading
            eyebrow="Your Activity"
            title="Pending Bids"
            count={pendingBids.length}
          />

          {pendingBids.length === 0 ? (
            <EmptyState
              title="No pending bids"
              description="Jobs you bid on will appear here while the customer is deciding."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
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

function CompactStatCard({
  title,
  value,
  description,
  icon,
  active = false,
}: {
  title: string;
  value: number;
  description: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-lg sm:rounded-3xl sm:p-6 ${
        active
          ? "border-[#3f8d24] bg-[#10230f]"
          : "border-[#17382b] bg-[#0b1b14]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#8b9d95] sm:text-sm">
          {title}
        </p>

        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm ${
            active
              ? "bg-[#1BBB8C] text-[#06100c]"
              : "bg-[#123529] text-[#1BBB8C]"
          }`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-black sm:mt-4 sm:text-4xl">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-[#64786e] sm:text-sm">
        {description}
      </p>
    </div>
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
      className={`rounded-2xl border p-3.5 sm:p-4 ${
        highlight
          ? "border-[#3f8d24] bg-[#162b13]"
          : "border-[#214333] bg-[#08150f]"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-[#71867c] sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black sm:text-2xl ${
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
      <div className="border-b border-[#214333] bg-[#10230f] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#1BBB8C] sm:text-xs">
              {job.reference ||
                `RC-${String(
                  job.id
                ).padStart(6, "0")}`}
            </p>

            <h3 className="mt-1.5 text-lg font-black sm:mt-2 sm:text-xl">
              {job.job_type ||
                "Waste Collection"}
            </h3>
          </div>

          <span className="shrink-0 rounded-full border border-[#3f8d24] bg-[#183017] px-2.5 py-1 text-[9px] font-black text-[#1BBB8C] sm:px-3 sm:text-xs">
            {job.status ===
            "in_progress"
              ? "IN PROGRESS"
              : "ASSIGNED"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:space-y-5 sm:p-6">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <MoneyBox
            label="Customer"
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

        <div className="rounded-2xl border border-[#3f8d24] bg-[#07130e] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1BBB8C] text-sm font-black text-[#06100c]">
              ✓
            </span>

            <div>
              <p className="text-sm font-black">
                Payment confirmed
              </p>

              <p className="mt-1 text-xs leading-5 text-[#82958c] sm:text-sm">
                Customer payment received. This job is assigned to you.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <JobLine
            label="Location"
            value={
              job.postcode ||
              "Not provided"
            }
          />

          <JobLine
            label="Load"
            value={
              job.load_size ||
              "Not specified"
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
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c] sm:text-base"
        >
          Manage Job →
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
      <div className="border-b border-[#17382b] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#1BBB8C] sm:text-xs">
              {job.reference ||
                `RC-${String(
                  job.id
                ).padStart(6, "0")}`}
            </p>

            <h3 className="mt-1.5 text-lg font-black sm:mt-2 sm:text-xl">
              {job.job_type ||
                "Waste Collection"}
            </h3>
          </div>

          <span className="shrink-0 rounded-full border border-[#285342] bg-[#10291f] px-2.5 py-1 text-[9px] font-black text-[#1BBB8C] sm:px-3 sm:text-xs">
            {job.status ===
            "bidding"
              ? "BIDDING"
              : "OPEN"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:space-y-5 sm:p-6">
        <CustomerPhotoGallery
          photos={photos}
        />

        <div className="grid grid-cols-2 gap-4">
          <JobLine
            label="Location"
            value={
              job.postcode ||
              "Postcode not provided"
            }
          />

          <JobLine
            label="Load"
            value={
              job.load_size ||
              "Not specified"
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
              <span className="rounded-xl border border-[#29483a] bg-[#081710] px-3 py-2 text-xs font-bold text-[#d5dfda]">
                Floor: {job.floor}
              </span>
            )}

            {job.stairs && (
              <span className="rounded-xl border border-[#29483a] bg-[#081710] px-3 py-2 text-xs font-bold text-[#d5dfda]">
                Stairs involved
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
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c] sm:text-base"
        >
          View Job & Bid →
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
      <div className="rounded-2xl border border-dashed border-[#29483a] bg-[#081710] p-4 sm:p-5">
        <p className="text-sm font-bold text-[#9aaba4]">
          No customer photos
        </p>

        <p className="mt-1 text-xs leading-5 text-[#657a70]">
          No waste photos have been uploaded for this job.
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1BBB8C]">
              Waste photos
            </p>

            <p className="mt-1 hidden text-xs text-[#657a70] sm:block">
              Review before placing your bid.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[#15392e] px-3 py-1 text-[10px] font-black text-[#1BBB8C]">
            {photos.length}{" "}
            {photos.length === 1
              ? "photo"
              : "photos"}
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() =>
                setSelectedPhoto(
                  photo
                )
              }
              className="group relative aspect-square w-[150px] shrink-0 overflow-hidden rounded-2xl border border-[#29483a] bg-[#081710] text-left sm:w-auto"
            >
              <img
                src={photo.url}
                alt="Customer waste"
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
                <p className="text-[10px] font-bold text-white sm:text-xs">
                  Tap to view
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 sm:p-5"
          onClick={() =>
            setSelectedPhoto(null)
          }
        >
          <div
            className="relative flex max-h-[92vh] max-w-5xl items-center justify-center"
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
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-2xl font-black text-white transition hover:bg-[#1BBB8C] hover:text-[#06100c]"
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
    <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-[#657a70]">
            Job
          </p>

          <p className="mt-1 text-base font-black sm:text-lg">
            RC-
            {String(
              bid.job_id
            ).padStart(6, "0")}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-[#29483a] bg-[#18271f] px-2.5 py-1 text-[9px] font-black text-[#b8c6c0] sm:px-3 sm:text-xs">
          BID PENDING
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5 sm:mt-6 sm:gap-3">
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
          Awaiting customer
        </p>

        <p className="mt-1 text-xs leading-5 text-[#82958c] sm:text-sm">
          If accepted, RCS takes {RCS_FEE_PERCENT}%
          and you receive the remaining 90%.
        </p>
      </div>

      {bid.message && (
        <p className="mt-4 rounded-2xl bg-[#07130e] p-4 text-sm leading-6 text-[#aab8b2]">
          {bid.message}
        </p>
      )}

      <Link
        href={`/driver/jobs/${bid.job_id}`}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-[#29483a] px-5 py-3 text-sm font-black text-white transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
      >
        View Job →
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
    <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#1BBB8C] sm:text-xs">
            {job.reference ||
              `RC-${String(
                job.id
              ).padStart(6, "0")}`}
          </p>

          <h3 className="mt-1.5 text-lg font-black sm:text-xl">
            {job.job_type ||
              "Waste Collection"}
          </h3>
        </div>

        <span className="shrink-0 rounded-full bg-[#15392e] px-2.5 py-1 text-[9px] font-black text-[#1BBB8C] sm:px-3 sm:text-xs">
          {isActive
            ? "IN PROGRESS"
            : "ACCEPTED"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
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

      <div className="mt-5 grid grid-cols-2 gap-4">
        <JobLine
          label="Location"
          value={
            job.postcode ||
            "Not provided"
          }
        />

        <JobLine
          label="Time"
          value={formatPreferredTime(
            job.preferred_time
          )}
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
      </div>

      <Link
        href={`/driver/jobs/${job.id}`}
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c] sm:text-base"
      >
        Manage Job →
      </Link>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C] sm:text-xs">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-black sm:text-2xl">
          {title}
        </h2>
      </div>

      {typeof count === "number" && (
        <span className="rounded-full border border-[#29483a] bg-[#0b1b14] px-3 py-1 text-xs font-black text-[#8fa39a]">
          {count}
        </span>
      )}
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
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-wide text-[#657a70] sm:text-xs">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-semibold leading-5 text-[#d5dfda] sm:text-sm">
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
    <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] px-5 py-9 text-center sm:px-6 sm:py-12">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-[#1BBB8C]" />

      <h3 className="mt-4 text-lg font-black sm:mt-5 sm:text-xl">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[#71857b] sm:text-sm sm:leading-6">
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