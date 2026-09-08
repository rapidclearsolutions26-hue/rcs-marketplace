"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: number;
  reference: string | null;
  job_type: string | null;
  postcode: string | null;
  status: string | null;
  created_at: string;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number;
  price?: number;
  notes: string | null;
  status: string | null;
  created_at: string;
};

type Driver = {
  id: string;
  full_name: string;
  vehicle_type: string | null;
  vehicle_registration: string | null;
};

type Quote = {
  bid: Bid;
  driver: Driver | null;
};

export default function CustomerQuotesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Record<number, Quote[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  /*
   * =========================================================
   * LOAD QUOTES
   * =========================================================
   */

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Customer auth error:", authError);

        setErrorMessage(
          "We couldn't verify your customer account."
        );

        setLoading(false);
        return;
      }

      if (!user) {
        router.replace("/customer/login");
        return;
      }

      /*
       * =====================================================
       * GET THIS CUSTOMER'S JOBS
       * =====================================================
       */

      const { data: jobsData, error: jobsError } =
        await supabase
          .from("jobs")
          .select(
            `
            id,
            reference,
            job_type,
            postcode,
            status,
            created_at
          `
          )
          .eq("customer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (jobsError) {
        console.error("Customer jobs error:", jobsError);

        setErrorMessage(jobsError.message);
        setLoading(false);
        return;
      }

      const customerJobs = jobsData || [];

      setJobs(customerJobs);

      /*
       * =====================================================
       * NO JOBS
       * =====================================================
       */

      if (customerJobs.length === 0) {
        setQuotes({});
        setLoading(false);
        return;
      }

      /*
       * =====================================================
       * GET BIDS FOR THESE JOBS
       * =====================================================
       */

      const jobIds = customerJobs.map((job) => job.id);

      const { data: bidsData, error: bidsError } =
        await supabase
          .from("bids")
          .select("*")
          .in("job_id", jobIds)
          .order("created_at", {
            ascending: false,
          });

      if (bidsError) {
        console.error("Customer bids error:", bidsError);

        setErrorMessage(bidsError.message);
        setLoading(false);
        return;
      }

      const bids = bidsData || [];

      /*
       * =====================================================
       * GET DRIVER DETAILS
       * =====================================================
       */

      const driverIds = [
        ...new Set(
          bids
            .map((bid) => bid.driver_id)
            .filter(Boolean)
        ),
      ];

      let drivers: Driver[] = [];

      if (driverIds.length > 0) {
        const {
          data: driversData,
          error: driversError,
        } = await supabase
          .from("drivers")
          .select(
            `
            id,
            full_name,
            vehicle_type,
            vehicle_registration
          `
          )
          .in("id", driverIds);

        if (driversError) {
          console.error(
            "Driver details error:",
            driversError
          );
        } else {
          drivers = driversData || [];
        }
      }

      /*
       * =====================================================
       * ORGANISE QUOTES BY JOB
       * =====================================================
       */

      const quoteMap: Record<number, Quote[]> = {};

      for (const job of customerJobs) {
        quoteMap[job.id] = [];
      }

      for (const bid of bids) {
        const driver =
          drivers.find(
            (item) => item.id === bid.driver_id
          ) || null;

        if (!quoteMap[bid.job_id]) {
          quoteMap[bid.job_id] = [];
        }

        quoteMap[bid.job_id].push({
          bid,
          driver,
        });
      }

      setQuotes(quoteMap);
    } catch (error) {
      console.error(
        "Customer quotes error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong loading your quotes."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * SELECT DRIVER
   * =========================================================
   */

  async function selectDriver(
    job: Job,
    quote: Quote
  ) {
    if (!quote.driver) {
      setErrorMessage(
        "We couldn't find the driver for this quote."
      );
      return;
    }

    const amount = getBidAmount(quote.bid);

    const confirmed = window.confirm(
      `Select ${quote.driver.full_name} for ${formatMoney(
        amount
      )}?`
    );

    if (!confirmed) {
      return;
    }

    setSelecting(quote.bid.id);
    setErrorMessage("");

    /*
     * =====================================================
     * UPDATE JOB
     * =====================================================
     */

    const { error } = await supabase
      .from("jobs")
      .update({
        accepted_bid_id: quote.bid.id,
        assigned_bid_id: quote.bid.id,
        assigned_driver_id: quote.driver.id,
        status: "assigned",
      })
      .eq("id", job.id);

    if (error) {
      console.error(
        "Job assignment error:",
        error
      );

      setErrorMessage(error.message);
      setSelecting(null);
      return;
    }

    /*
     * =====================================================
     * UPDATE BID
     * =====================================================
     */

    const { error: bidError } =
      await supabase
        .from("bids")
        .update({
          status: "accepted",
        })
        .eq("id", quote.bid.id);

    if (bidError) {
      console.error(
        "Bid update error:",
        bidError
      );
    }

    /*
     * =====================================================
     * SEND CUSTOMER TO JOB
     * =====================================================
     */

    router.push(
      `/customer/jobs/${job.id}`
    );
  }

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  async function logout() {
    try {
      await supabase.auth.signOut();

      router.replace("/customer/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setErrorMessage(
        "Unable to log out. Please try again."
      );
    }
  }

  /*
   * =========================================================
   * LOADING SCREEN
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">

        <div className="flex min-h-screen items-center justify-center px-6">

          <div className="text-center">

            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />

            <p className="mt-5 text-lg font-black">
              Loading your quotes...
            </p>

            <p className="mt-2 text-sm text-[#71867c]">
              Getting your latest driver bids
            </p>

          </div>

        </div>

      </main>
    );
  }

  /*
   * =========================================================
   * MAIN
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#06100c] pb-28 text-white">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">

          <Link
            href="/"
            className="flex items-center gap-2"
          >

            <span className="text-base font-black tracking-tight sm:text-lg">
              RAPID CLEAR{" "}
              <span className="text-[#1BBB8C]">
                SOLUTIONS
              </span>
            </span>

          </Link>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-[#29483a] px-3.5 py-2 text-xs font-bold text-[#b8c6c0] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
          >
            Log out
          </button>

        </div>

      </header>


      {/* ================================================= */}
      {/* CONTENT */}
      {/* ================================================= */}

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">

        {/* ================================================= */}
        {/* BACK TO DASHBOARD */}
        {/* ================================================= */}

        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#1BBB8C]"
        >
          ← Dashboard
        </Link>


        {/* ================================================= */}
        {/* PAGE TITLE */}
        {/* ================================================= */}

        <section className="mt-6">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
            Customer Portal
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            My Quotes
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#82958c] sm:text-base">
            Compare driver bids and choose who you want
            to complete your job.
          </p>

        </section>


        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#230e0e] p-5">

            <p className="text-sm font-semibold leading-6 text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => loadQuotes()}
              className="mt-3 text-sm font-black text-red-200 underline"
            >
              Try again
            </button>

          </div>
        )}


        {/* ================================================= */}
        {/* NO JOBS */}
        {/* ================================================= */}

        {!loading && jobs.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-[#29483a] bg-[#081710] px-5 py-10 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123529] text-sm font-black text-[#1BBB8C]">
              RCS
            </div>

            <h2 className="mt-5 text-xl font-black">
              No jobs yet
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#71867c]">
              Post a job and approved RCS drivers
              can send you quotes.
            </p>

            <Link
              href="/customer/post-job"
              className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[#1BBB8C] px-6 font-black text-[#06100c] transition hover:bg-[#16a77c]"
            >
              POST YOUR FIRST JOB
            </Link>

          </div>
        )}


        {/* ================================================= */}
        {/* JOBS */}
        {/* ================================================= */}

        {!loading && jobs.length > 0 && (

          <div className="mt-8 space-y-6">

            {jobs.map((job) => {

              const jobQuotes =
                quotes[job.id] || [];

              const normalisedStatus =
                normaliseStatus(job.status);

              const isAssigned =
                normalisedStatus === "assigned" ||
                normalisedStatus === "accepted" ||
                normalisedStatus === "booked" ||
                normalisedStatus === "in_progress" ||
                normalisedStatus === "in progress" ||
                normalisedStatus === "completed" ||
                normalisedStatus === "complete";

              return (
                <section
                  key={job.id}
                  className="overflow-hidden rounded-2xl border border-[#17382b] bg-[#0b1b14]"
                >

                  {/* ================================================= */}
                  {/* JOB HEADER */}
                  {/* ================================================= */}

                  <div className="border-b border-[#17382b] p-5 sm:p-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <StatusBadge
                            status={
                              job.status ||
                              "open"
                            }
                          />

                          <span className="text-xs text-[#657a70]">
                            {job.reference ||
                              `RC-${String(
                                job.id
                              ).padStart(
                                6,
                                "0"
                              )}`}
                          </span>

                        </div>

                        <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
                          {job.job_type ||
                            "Waste Collection"}
                        </h2>

                        {job.postcode && (
                          <p className="mt-1 text-sm text-[#71867c]">
                            {job.postcode}
                          </p>
                        )}

                      </div>

                      <Link
                        href={`/customer/jobs/${job.id}`}
                        className="w-fit text-sm font-black text-[#1BBB8C] transition hover:text-[#42dcae]"
                      >
                        View Job →
                      </Link>

                    </div>

                  </div>


                  {/* ================================================= */}
                  {/* DRIVER ALREADY SELECTED */}
                  {/* ================================================= */}

                  {isAssigned && (
                    <div className="border-b border-[#214333] bg-[#0d2118] p-5 sm:p-6">

                      <div className="flex items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#123529] text-xs font-black text-[#1BBB8C]">
                          RCS
                        </div>

                        <div>

                          <p className="text-sm font-black text-[#1BBB8C]">
                            Driver selected
                          </p>

                          <p className="mt-1 text-sm leading-6 text-[#71867c]">
                            This job has already been assigned
                            to a driver.
                          </p>

                          <Link
                            href={`/customer/jobs/${job.id}`}
                            className="mt-3 inline-block text-xs font-black text-[#1BBB8C]"
                          >
                            View collection →
                          </Link>

                        </div>

                      </div>

                    </div>
                  )}


                  {/* ================================================= */}
                  {/* NO QUOTES */}
                  {/* ================================================= */}

                  {!isAssigned &&
                    jobQuotes.length === 0 && (

                      <div className="p-6 sm:p-7">

                        <div className="flex items-start gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#123529] text-xs font-black text-[#1BBB8C]">
                            ...
                          </div>

                          <div>

                            <p className="font-black text-[#b8c6c0]">
                              No driver quotes yet.
                            </p>

                            <p className="mt-1 text-sm leading-6 text-[#71867c]">
                              Approved drivers will be able
                              to bid on this job.
                            </p>

                          </div>

                        </div>

                      </div>

                    )}


                  {/* ================================================= */}
                  {/* QUOTES */}
                  {/* ================================================= */}

                  {!isAssigned &&
                    jobQuotes.length > 0 && (

                      <div className="divide-y divide-[#17382b]">

                        {jobQuotes.map((quote) => (

                          <div
                            key={quote.bid.id}
                            className="p-5 transition hover:bg-[#0d2118] sm:p-6"
                          >

                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                              {/* ===================================== */}
                              {/* DRIVER INFO */}
                              {/* ===================================== */}

                              <div className="flex min-w-0 items-center gap-4">

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#123529] text-[10px] font-black text-[#1BBB8C]">
                                  RCS
                                </div>

                                <div className="min-w-0">

                                  <p className="text-lg font-black">
                                    {quote.driver?.full_name ||
                                      "RCS Driver"}
                                  </p>

                                  <p className="mt-1 text-sm text-[#71867c]">

                                    {quote.driver?.vehicle_type ||
                                      "Waste removal vehicle"}

                                    {quote.driver?.vehicle_registration
                                      ? ` • ${quote.driver.vehicle_registration}`
                                      : ""}

                                  </p>

                                  {quote.bid.notes && (
                                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#82958c]">
                                      {quote.bid.notes}
                                    </p>
                                  )}

                                </div>

                              </div>


                              {/* ===================================== */}
                              {/* PRICE + SELECT */}
                              {/* ===================================== */}

                              <div className="flex items-center justify-between gap-5 sm:min-w-[270px] sm:justify-end">

                                <div className="text-left sm:text-right">

                                  <p className="text-2xl font-black tracking-tight text-[#1BBB8C]">
                                    {formatMoney(
                                      getBidAmount(
                                        quote.bid
                                      )
                                    )}
                                  </p>

                                  <p className="mt-0.5 text-xs text-[#657a70]">
                                    Driver bid
                                  </p>

                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    selecting ===
                                    quote.bid.id
                                  }
                                  onClick={() =>
                                    selectDriver(
                                      job,
                                      quote
                                    )
                                  }
                                  className="rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-black text-[#06100c] shadow-lg shadow-[#1BBB8C]/10 transition active:scale-[0.98] hover:bg-[#16a77c] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {selecting ===
                                  quote.bid.id
                                    ? "Selecting..."
                                    : "Select Driver"}
                                </button>

                              </div>

                            </div>

                          </div>

                        ))}

                      </div>

                    )}

                </section>
              );
            })}

          </div>

        )}

      </div>


      {/* ================================================= */}
      {/* CUSTOMER BOTTOM NAV */}
      {/* ================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#17382b] bg-[#081710]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">

        <div className="mx-auto grid max-w-5xl grid-cols-4">

          {/* HOME */}

          <BottomNavItem
            href="/customer/dashboard"
            icon="⌂"
            label="Home"
          />


          {/* JOBS */}

          <BottomNavItem
            href="/customer/jobs"
            icon="▣"
            label="Jobs"
          />


          {/* QUOTES */}

          <BottomNavItem
            href="/customer/quotes"
            icon="£"
            label="Quotes"
            active
            badge={
              jobs.filter(
                (job) =>
                  ![
                    "assigned",
                    "accepted",
                    "booked",
                    "in_progress",
                    "in progress",
                    "completed",
                    "complete",
                  ].includes(
                    normaliseStatus(
                      job.status
                    )
                  ) &&
                  (quotes[job.id] || []).length > 0
              ).length || undefined
            }
          />


          {/* NEW JOB */}

          <BottomNavItem
            href="/customer/post-job"
            icon="+"
            label="New Job"
          />

        </div>

      </nav>

    </main>
  );
}


/* ========================================================= */
/* STATUS BADGE                                              */
/* ========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalised =
    normaliseStatus(status);

  let className =
    "border-[#29483a] bg-[#18271f] text-[#b8c6c0]";

  let text = formatStatus(status);

  if (
    normalised === "pending" ||
    normalised === "new" ||
    normalised === "open"
  ) {
    className =
      "border-amber-900/60 bg-amber-950/40 text-amber-300";

    text =
      normalised === "new"
        ? "New"
        : "Waiting";
  }

  if (normalised === "bidding") {
    className =
      "border-blue-900/60 bg-blue-950/40 text-blue-300";

    text = "Quotes";
  }

  if (
    normalised === "assigned" ||
    normalised === "accepted" ||
    normalised === "booked"
  ) {
    className =
      "border-[#3f8d24] bg-[#183017] text-[#1BBB8C]";

    text = "Booked";
  }

  if (
    normalised === "in_progress" ||
    normalised === "in progress"
  ) {
    className =
      "border-blue-900/60 bg-blue-950/40 text-blue-300";

    text = "In Progress";
  }

  if (
    normalised === "completed" ||
    normalised === "complete"
  ) {
    className =
      "border-green-900/60 bg-green-950/40 text-green-300";

    text = "Completed";
  }

  if (
    normalised === "cancelled" ||
    normalised === "canceled" ||
    normalised === "rejected"
  ) {
    className =
      "border-red-900/60 bg-red-950/40 text-red-300";
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${className}`}
    >
      {text}
    </span>
  );
}


/* ========================================================= */
/* BOTTOM NAV ITEM                                           */
/* ========================================================= */

function BottomNavItem({
  href,
  icon,
  label,
  active = false,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${
        active
          ? "text-[#1BBB8C]"
          : "text-[#687d73] hover:text-[#b8c6c0]"
      }`}
    >

      <span className="relative text-xl leading-none">

        {icon}

        {badge !== undefined && (
          <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1BBB8C] px-1 text-[9px] font-black text-[#06100c]">
            {badge > 9 ? "9+" : badge}
          </span>
        )}

      </span>

      <span>
        {label}
      </span>

    </Link>
  );
}


/* ========================================================= */
/* BID AMOUNT                                                 */
/* ========================================================= */

function getBidAmount(bid: Bid) {
  if (typeof bid.amount === "number") {
    return bid.amount;
  }

  if (typeof bid.price === "number") {
    return bid.price;
  }

  return 0;
}


/* ========================================================= */
/* MONEY                                                      */
/* ========================================================= */

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}


/* ========================================================= */
/* STATUS NORMALISATION                                      */
/* ========================================================= */

function normaliseStatus(
  status: string | null
) {
  return (status || "")
    .trim()
    .toLowerCase();
}


/* ========================================================= */
/* STATUS FORMAT                                              */
/* ========================================================= */

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}