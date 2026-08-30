"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  preferred_time: string | null;
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

/*
 * =========================================================
 * RCS MARKETPLACE SETTINGS
 * =========================================================
 *
 * RCS takes 10% from the driver's bid.
 *
 * Example:
 *
 * Driver bids £100
 * RCS commission = £10
 * Driver receives = £90
 */

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
  const supabase = createClient();

  const [driver, setDriver] = useState<Driver | null>(null);

  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [pendingBids, setPendingBids] = useState<Bid[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [acceptedBids, setAcceptedBids] = useState<Bid[]>([]);

  const [newAssignment, setNewAssignment] =
    useState<Job | null>(null);

  const previousAssignedJobIds =
    useRef<number[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /*
   * =========================================================
   * MONEY CALCULATIONS
   * =========================================================
   */

  function getBidForJob(jobId: number) {
    return acceptedBids.find(
      (bid) =>
        Number(bid.job_id) === Number(jobId) &&
        bid.status === "accepted"
    );
  }

  function getCustomerPrice(jobId: number) {
    const bid = getBidForJob(jobId);

    return Number(bid?.amount || 0);
  }

  function getRcsFee(jobId: number) {
    const customerPrice =
      getCustomerPrice(jobId);

    return (
      customerPrice *
      (RCS_FEE_PERCENT / 100)
    );
  }

  function getDriverPayout(jobId: number) {
    const customerPrice =
      getCustomerPrice(jobId);

    const commission =
      customerPrice *
      (RCS_FEE_PERCENT / 100);

    return customerPrice - commission;
  }

  /*
   * =========================================================
   * LOAD DASHBOARD
   * =========================================================
   */

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        /*
         * -----------------------------------------------------
         * GET LOGGED IN USER
         * -----------------------------------------------------
         */

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

        /*
         * -----------------------------------------------------
         * GET DRIVER
         * -----------------------------------------------------
         */

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

        /*
         * -----------------------------------------------------
         * DRIVER NOT APPROVED
         * -----------------------------------------------------
         */

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

          return;
        }

        /*
         * -----------------------------------------------------
         * LOAD DRIVER BIDS
         * -----------------------------------------------------
         */

        const {
          data: bidsData,
          error: bidsError,
        } = await supabase
          .from("bids")
          .select(
            `
              id,
              job_id,
              driver_id,
              amount,
              message,
              status
            `
          )
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
          driverBids =
            (bidsData || []) as Bid[];

          setPendingBids(
            driverBids.filter(
              (bid) =>
                !bid.status ||
                bid.status === "pending"
            )
          );

          setAcceptedBids(
            driverBids.filter(
              (bid) =>
                bid.status === "accepted"
            )
          );
        }

        /*
         * -----------------------------------------------------
         * LOAD AVAILABLE JOBS
         * -----------------------------------------------------
         */

        const {
          data: availableData,
          error: availableError,
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

          setAvailableJobs(
            jobs.filter(
              (job) =>
                !job.assigned_driver_id &&
                job.status !== "completed" &&
                job.status !== "cancelled"
            )
          );
        }

        /*
         * -----------------------------------------------------
         * LOAD ASSIGNED JOBS
         * -----------------------------------------------------
         */

        const {
          data: assignedData,
          error: assignedError,
        } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq(
            "assigned_driver_id",
            user.id
          )
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

        /*
         * -----------------------------------------------------
         * NEW ASSIGNMENT
         * -----------------------------------------------------
         */

        const currentAssignedIds =
          assignedJobs.map(
            (job) => job.id
          );

        const previousIds =
          previousAssignedJobIds.current;

        if (previousIds === null) {
          previousAssignedJobIds.current =
            currentAssignedIds;
        } else {
          const newlyAssigned =
            assignedJobs.find(
              (job) =>
                !previousIds.includes(
                  job.id
                ) &&
                job.status === "assigned"
            );

          if (newlyAssigned) {
            setNewAssignment(
              newlyAssigned
            );

            if (
              typeof window !==
                "undefined" &&
              "Notification" in window &&
              Notification.permission ===
                "granted"
            ) {
              new Notification(
                "RCS — New Job Assigned",
                {
                  body: `${
                    newlyAssigned.reference ||
                    `Job #${newlyAssigned.id}`
                  } has been paid for and assigned to you.`,
                }
              );
            }
          }

          previousAssignedJobIds.current =
            currentAssignedIds;
        }

        /*
         * -----------------------------------------------------
         * ACCEPTED JOBS
         * -----------------------------------------------------
         */

        setAcceptedJobs(
          assignedJobs.filter(
            (job) =>
              job.status === "assigned" ||
              job.status === "accepted"
          )
        );

        /*
         * -----------------------------------------------------
         * ACTIVE JOBS
         * -----------------------------------------------------
         */

        setActiveJobs(
          assignedJobs.filter(
            (job) =>
              job.status ===
              "in_progress"
          )
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
    [router, supabase]
  );

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
   * =========================================================
   * AUTO REFRESH
   * =========================================================
   */

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        loadDashboard(true);
      }, 15000);

    return () =>
      window.clearInterval(interval);
  }, [loadDashboard]);

  /*
   * =========================================================
   * NOTIFICATIONS
   * =========================================================
   */

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    if (
      Notification.permission ===
      "default"
    ) {
      Notification.requestPermission().catch(
        () => {}
      );
    }
  }, []);

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/driver/login");
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

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

  /*
   * =========================================================
   * DRIVER NOT FOUND
   * =========================================================
   */

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

  /*
   * =========================================================
   * DRIVER NOT APPROVED
   * =========================================================
   */

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
              Your driver account needs to be
              approved before you can view and
              bid on available work.
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

  /*
   * =========================================================
   * MAIN DASHBOARD
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#06100c] text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-[#17382b] bg-[#081710]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="text-lg font-black sm:text-xl"
          >
            RAPID CLEAR{" "}
            <span className="text-[#1BBB8C]">
              SOLUTIONS
            </span>
          </Link>

          <div className="flex items-center gap-3">
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
              onClick={logout}
              className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#c5d1cb] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-10">

        {/* ================================================= */}
        {/* NEW ASSIGNMENT */}
        {/* ================================================= */}

        {newAssignment && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-[#3f8d24] bg-[#10230f] shadow-2xl">
            <div className="p-6 sm:p-7">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
                    NEW PAID JOB
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    You've been assigned a job
                  </h2>

                  <p className="mt-2 text-sm text-[#91a99e]">
                    Payment has been completed
                    and this job is now yours.
                  </p>
                </div>

                <Link
                  href={`/driver/jobs/${newAssignment.id}`}
                  onClick={() =>
                    setNewAssignment(null)
                  }
                  className="rounded-xl bg-[#1BBB8C] px-6 py-3 text-center font-black text-[#06100c]"
                >
                  View Job
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MoneyBox
                  label="Customer paid"
                  value={getCustomerPrice(
                    newAssignment.id
                  )}
                />

                <MoneyBox
                  label={`RCS ${RCS_FEE_PERCENT}%`}
                  value={getRcsFee(
                    newAssignment.id
                  )}
                />

                <MoneyBox
                  label="Your payout"
                  value={getDriverPayout(
                    newAssignment.id
                  )}
                  highlight
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* TITLE */}
        {/* ================================================= */}

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
              RCS Marketplace
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Driver Dashboard
            </h1>

            <p className="mt-2 text-[#82958c]">
              Find work, submit bids and
              manage your accepted jobs.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadDashboard()
            }
            disabled={refreshing}
            className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#aabbb4] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* ERROR */}

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

        {/* ================================================= */}
        {/* STATS */}
        {/* ================================================= */}

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

        {/* ================================================= */}
        {/* ASSIGNED JOBS */}
        {/* ================================================= */}

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

        {/* ================================================= */}
        {/* ACTIVE JOBS */}
        {/* ================================================= */}

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
                  />
                )
              )}

            </div>
          )}

        </section>

        {/* ================================================= */}
        {/* AVAILABLE JOBS */}
        {/* ================================================= */}

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
                  />
                )
              )}

            </div>
          )}

        </section>

        {/* ================================================= */}
        {/* PENDING BIDS */}
        {/* ================================================= */}

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

/* ========================================================= */
/* MONEY BOX                                                 */
/* ========================================================= */

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
        £{Number(value || 0).toFixed(2)}
      </p>

    </div>
  );
}

/* ========================================================= */
/* ASSIGNED JOB CARD                                         */
/* ========================================================= */

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
            The customer has paid and the
            job has been assigned to you.
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
            value={
              job.preferred_time ||
              "Not specified"
            }
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

/* ========================================================= */
/* AVAILABLE JOB CARD                                        */
/* ========================================================= */

function AvailableJobCard({
  job,
}: {
  job: Job;
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
          label="Load size"
          value={
            job.load_size ||
            "Not specified"
          }
        />

        <JobLine
          label="Access"
          value={
            job.access_notes ||
            "No access details provided"
          }
        />

        {job.description && (
          <div>

            <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">
              Description
            </p>

            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#aebbb5]">
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

/* ========================================================= */
/* PENDING BID                                               */
/* ========================================================= */

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

/* ========================================================= */
/* ACCEPTED / ACTIVE JOB                                     */
/* ========================================================= */

function AcceptedJobCard({
  job,
  driverPayout,
}: {
  job: Job;
  driverPayout: number;
}) {
  const isActive =
    job.status ===
    "in_progress";

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

      {driverPayout > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">

          <MoneyBox
            label={`RCS ${RCS_FEE_PERCENT}% already deducted`}
            value={0}
          />

          <MoneyBox
            label="Your payout"
            value={driverPayout}
            highlight
          />

        </div>
      )}

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
          value={
            job.preferred_time ||
            "Not specified"
          }
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

/* ========================================================= */
/* SECTION HEADING                                           */
/* ========================================================= */

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

/* ========================================================= */
/* STAT CARD                                                 */
/* ========================================================= */

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

/* ========================================================= */
/* JOB LINE                                                  */
/* ========================================================= */

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

/* ========================================================= */
/* EMPTY STATE                                               */
/* ========================================================= */

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

/* ========================================================= */
/* DATE                                                      */
/* ========================================================= */

function formatDate(date: string) {
  try {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-GB",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return date;
  }
}