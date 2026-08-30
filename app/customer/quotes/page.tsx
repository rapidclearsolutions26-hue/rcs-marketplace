"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const supabase = createClient();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Record<number, Quote[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/customer/login");
      return;
    }

    /*
     * GET THIS CUSTOMER'S JOBS
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
      console.error(jobsError);
      setErrorMessage(jobsError.message);
      setLoading(false);
      return;
    }

    const customerJobs = jobsData || [];

    setJobs(customerJobs);

    /*
     * GET BIDS FOR THESE JOBS
     */

    if (customerJobs.length === 0) {
      setQuotes({});
      setLoading(false);
      return;
    }

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
      console.error(bidsError);
      setErrorMessage(bidsError.message);
      setLoading(false);
      return;
    }

    const bids = bidsData || [];

    /*
     * GET DRIVER DETAILS
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
      const { data: driversData, error: driversError } =
        await supabase
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
        console.error(driversError);
      } else {
        drivers = driversData || [];
      }
    }

    /*
     * ORGANISE QUOTES BY JOB ID
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
    setLoading(false);
  }

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

    const confirmed = window.confirm(
      `Select ${quote.driver.full_name} for ${formatMoney(
        getBidAmount(quote.bid)
      )}?`
    );

    if (!confirmed) {
      return;
    }

    setSelecting(quote.bid.id);
    setErrorMessage("");

    /*
     * UPDATE THE JOB USING THE REAL SUPABASE IDS
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
      console.error(error);
      setErrorMessage(error.message);
      setSelecting(null);
      return;
    }

    /*
     * UPDATE THE BID
     */

    const { error: bidError } =
      await supabase
        .from("bids")
        .update({
          status: "accepted",
        })
        .eq("id", quote.bid.id);

    if (bidError) {
      console.error(bidError);
    }

    /*
     * SEND CUSTOMER TO THEIR ACTUAL JOB
     *
     * This uses the real Supabase job ID.
     */

    router.push(`/customer/jobs/${job.id}`);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/customer/login");
  }

  return (
    <main className="min-h-screen bg-[#070907] text-white">

      {/* HEADER */}

      <header className="border-b border-[#1d251b] bg-[#070907]">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">

          <Link href="/customer/dashboard">
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={190}
              height={70}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>

          <button
            onClick={logout}
            className="rounded-lg border border-[#394635] px-4 py-2 text-sm font-bold text-gray-300 hover:border-[#79c51c] hover:text-white"
          >
            Log out
          </button>

        </div>

      </header>


      {/* CONTENT */}

      <div className="mx-auto max-w-5xl px-5 py-8 sm:py-12">

        <Link
          href="/customer/dashboard"
          className="text-sm font-bold text-[#79c51c]"
        >
          ← Dashboard
        </Link>

        <div className="mt-6">

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#79c51c]">
            Customer Portal
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            My Quotes
          </h1>

          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Compare driver bids and choose who you want to complete your job.
          </p>

        </div>


        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4">
            <p className="text-sm font-semibold text-red-400">
              {errorMessage}
            </p>
          </div>
        )}


        {/* LOADING */}

        {loading && (
          <div className="mt-8 rounded-2xl border border-[#283326] bg-[#0d130c] p-8 text-center">
            <p className="text-sm font-semibold text-gray-500">
              Loading your quotes...
            </p>
          </div>
        )}


        {/* NO JOBS */}

        {!loading && jobs.length === 0 && (
          <div className="mt-8 rounded-2xl border border-[#283326] bg-[#0d130c] p-8">

            <h2 className="text-xl font-black">
              No jobs yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Post a job and driver quotes will appear here.
            </p>

            <Link
              href="/customer/post-job"
              className="mt-6 inline-block rounded-xl bg-[#79c51c] px-6 py-3 font-black text-black hover:bg-[#91db32]"
            >
              POST A JOB
            </Link>

          </div>
        )}


        {/* JOBS + QUOTES */}

        {!loading && jobs.length > 0 && (

          <div className="mt-8 space-y-8">

            {jobs.map((job) => {

              const jobQuotes =
                quotes[job.id] || [];

              const isAssigned =
                job.status === "assigned" ||
                job.status === "in_progress" ||
                job.status === "completed";

              return (
                <section
                  key={job.id}
                  className="overflow-hidden rounded-2xl border border-[#283326] bg-[#0d130c]"
                >

                  {/* JOB HEADER */}

                  <div className="border-b border-[#283326] p-5 sm:p-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <span className="text-xs font-bold uppercase tracking-wide text-[#79c51c]">
                            {job.status || "open"}
                          </span>

                          <span className="text-xs text-gray-600">
                            {job.reference ||
                              `RC-${String(job.id).padStart(6, "0")}`}
                          </span>

                        </div>

                        <h2 className="mt-2 text-xl font-black">
                          {job.job_type ||
                            "Waste Removal Job"}
                        </h2>

                        {job.postcode && (
                          <p className="mt-1 text-sm text-gray-500">
                            {job.postcode}
                          </p>
                        )}

                      </div>

                      <Link
                        href={`/customer/jobs/${job.id}`}
                        className="text-sm font-bold text-[#79c51c]"
                      >
                        View Job →
                      </Link>

                    </div>

                  </div>


                  {/* ALREADY ASSIGNED */}

                  {isAssigned && (
                    <div className="border-b border-[#283326] bg-[#101710] p-5">

                      <p className="text-sm font-bold text-[#79c51c]">
                        Driver selected
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        This job has already been assigned to a driver.
                      </p>

                    </div>
                  )}


                  {/* NO QUOTES */}

                  {!isAssigned &&
                    jobQuotes.length === 0 && (

                      <div className="p-6">

                        <p className="font-bold text-gray-400">
                          No driver quotes yet.
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          Approved drivers will be able to bid on this job.
                        </p>

                      </div>

                    )}


                  {/* QUOTES */}

                  {!isAssigned &&
                    jobQuotes.length > 0 && (

                      <div className="divide-y divide-[#283326]">

                        {jobQuotes.map((quote) => (

                          <div
                            key={quote.bid.id}
                            className="p-5 sm:p-6"
                          >

                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                              <div className="min-w-0">

                                <p className="text-lg font-black">
                                  {quote.driver?.full_name ||
                                    "RCS Driver"}
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  {quote.driver?.vehicle_type ||
                                    "Waste removal vehicle"}

                                  {quote.driver?.vehicle_registration
                                    ? ` • ${quote.driver.vehicle_registration}`
                                    : ""}
                                </p>

                                {quote.bid.notes && (
                                  <p className="mt-3 text-sm leading-6 text-gray-400">
                                    {quote.bid.notes}
                                  </p>
                                )}

                              </div>


                              <div className="flex items-center justify-between gap-5 sm:min-w-[220px] sm:justify-end">

                                <div className="text-left sm:text-right">

                                  <p className="text-2xl font-black text-[#79c51c]">
                                    {formatMoney(
                                      getBidAmount(
                                        quote.bid
                                      )
                                    )}
                                  </p>

                                  <p className="text-xs text-gray-600">
                                    Driver bid
                                  </p>

                                </div>


                                <button
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
                                  className="rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-black transition hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-50"
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

    </main>
  );
}


/* ============================= */
/* BID AMOUNT                    */
/* ============================= */

function getBidAmount(bid: Bid) {
  if (typeof bid.amount === "number") {
    return bid.amount;
  }

  if (typeof bid.price === "number") {
    return bid.price;
  }

  return 0;
}


/* ============================= */
/* MONEY                         */
/* ============================= */

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}