"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: number;
  reference: string | null;
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
  preferred_time: string | null;
  status: string | null;
  journey_status: string | null;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  created_at: string;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number;
  message: string | null;
  status: string;
};

type Driver = {
  id: string;
  full_name: string | null;
};

type EvidencePhoto = {
  name: string;
  url: string;
};

export default function CustomerJobPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [drivers, setDrivers] = useState<Record<string, Driver>>({});

  const [beforePhotos, setBeforePhotos] = useState<EvidencePhoto[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<EvidencePhoto[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [acceptingBid, setAcceptingBid] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  /*
   * =========================================================
   * LOAD JOB
   * =========================================================
   */

  async function loadJob() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/customer/login");
      return;
    }

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("customer_id", user.id)
      .single();

    if (jobError || !jobData) {
      console.error("JOB LOAD ERROR:", jobError);

      setErrorMessage(
        jobError?.message ||
          "We couldn't find this job or you don't have access to it."
      );

      setLoading(false);
      return;
    }

    setJob(jobData as Job);

    /*
     * =======================================================
     * LOAD BIDS
     * =======================================================
     */

    const { data: bidData, error: bidError } = await supabase
      .from("bids")
      .select("id, job_id, driver_id, amount, message, status")
      .eq("job_id", jobId)
      .order("amount", {
        ascending: true,
      });

    if (bidError) {
      console.error("BID LOAD ERROR:", bidError);
    }

    const loadedBids = (bidData || []) as Bid[];

    setBids(loadedBids);

    /*
     * =======================================================
     * LOAD DRIVER NAMES
     * =======================================================
     */

    if (loadedBids.length > 0) {
      const driverIds = [
        ...new Set(loadedBids.map((bid) => bid.driver_id)),
      ];

      const {
        data: driverData,
        error: driverError,
      } = await supabase
        .from("drivers")
        .select("id, full_name")
        .in("id", driverIds);

      if (driverError) {
        console.error("DRIVER LOAD ERROR:", driverError);
      }

      const driverMap: Record<string, Driver> = {};

      (driverData || []).forEach((driver) => {
        driverMap[driver.id] = driver as Driver;
      });

      setDrivers(driverMap);
    } else {
      setDrivers({});
    }

    await loadEvidencePhotos(jobData.id);

    setLoading(false);
  }

  /*
   * =========================================================
   * LOAD EVIDENCE PHOTOS
   * =========================================================
   */

  async function loadEvidencePhotos(id: number) {
    setLoadingPhotos(true);

    try {
      const before = await loadPhotosFromFolder(`${id}/before`);
      const after = await loadPhotosFromFolder(`${id}/after`);

      setBeforePhotos(before);
      setAfterPhotos(after);
    } catch (error) {
      console.error("CUSTOMER EVIDENCE PHOTO ERROR:", error);
    } finally {
      setLoadingPhotos(false);
    }
  }

  async function loadPhotosFromFolder(
    folder: string
  ): Promise<EvidencePhoto[]> {
    const { data: files, error } = await supabase.storage
      .from("job-photos")
      .list(folder, {
        limit: 50,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      console.error(`PHOTO LIST ERROR (${folder}):`, error);
      return [];
    }

    if (!files || files.length === 0) {
      return [];
    }

    const photoFiles = files.filter(
      (file) => file.name && !file.name.startsWith(".")
    );

    const results: EvidencePhoto[] = [];

    for (const file of photoFiles) {
      const path = `${folder}/${file.name}`;

      const {
        data: signedData,
        error: signedError,
      } = await supabase.storage
        .from("job-photos")
        .createSignedUrl(path, 60 * 60);

      if (signedError) {
        console.error(
          `SIGNED URL ERROR (${path}):`,
          signedError
        );

        continue;
      }

      if (signedData?.signedUrl) {
        results.push({
          name: file.name,
          url: signedData.signedUrl,
        });
      }
    }

    return results;
  }

  /*
   * =========================================================
   * ACCEPT BID / STRIPE
   * =========================================================
   */

  async function acceptBid(bid: Bid) {
    if (!job) {
      return;
    }

    if (acceptingBid !== null) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Continue to payment for ${
        drivers[bid.driver_id]?.full_name || "this driver's"
      } quote of £${Number(bid.amount).toFixed(2)}?`
    );

    if (!confirmed) {
      return;
    }

    setAcceptingBid(bid.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/customer/login");
        return;
      }

      const {
        data: currentJob,
        error: jobCheckError,
      } = await supabase
        .from("jobs")
        .select(
          `
            id,
            customer_id,
            status,
            accepted_bid_id,
            assigned_driver_id,
            assigned_bid_id,
            journey_status
          `
        )
        .eq("id", job.id)
        .eq("customer_id", user.id)
        .single();

      if (jobCheckError || !currentJob) {
        console.error(
          "JOB VERIFICATION FAILED:",
          jobCheckError
        );

        setErrorMessage(
          jobCheckError?.message ||
            "We couldn't verify this job. Please refresh and try again."
        );

        setAcceptingBid(null);
        return;
      }

      const alreadyAssigned =
        Boolean(currentJob.accepted_bid_id) ||
        Boolean(currentJob.assigned_driver_id) ||
        Boolean(currentJob.assigned_bid_id) ||
        [
          "assigned",
          "in_progress",
          "completed",
        ].includes(currentJob.status || "");

      if (alreadyAssigned) {
        setErrorMessage(
          "A driver has already been selected for this job."
        );

        await loadJob();
        return;
      }

      const {
        data: selectedBid,
        error: selectedBidError,
      } = await supabase
        .from("bids")
        .select(
          "id, job_id, driver_id, amount, message, status"
        )
        .eq("id", bid.id)
        .eq("job_id", job.id)
        .single();

      if (selectedBidError || !selectedBid) {
        console.error(
          "SELECTED BID ERROR:",
          selectedBidError
        );

        setErrorMessage(
          selectedBidError?.message ||
            "We couldn't find this driver's quote."
        );

        setAcceptingBid(null);
        return;
      }

      if (selectedBid.status === "rejected") {
        setErrorMessage(
          "This driver's quote is no longer available."
        );

        setAcceptingBid(null);
        return;
      }

      const response = await fetch(
        "/api/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId: job.id,
            bidId: selectedBid.id,
          }),
        }
      );

      let result: {
        url?: string;
        error?: string;
        message?: string;
      } = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        console.error(
          "STRIPE CHECKOUT ERROR:",
          result
        );

        throw new Error(
          result.error ||
            result.message ||
            "We couldn't start the payment."
        );
      }

      if (!result.url) {
        throw new Error(
          "Stripe did not return a checkout URL."
        );
      }

      window.location.href = result.url;
    } catch (error) {
      console.error(
        "PAYMENT START ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't start payment. Please try again."
      );

      setAcceptingBid(null);
    }
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0f0a]">
        <div className="px-6 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#25301f] border-t-[#529027]" />

          <p className="mt-4 font-bold text-[#aeb7aa]">
            Loading your job...
          </p>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * NOT FOUND
   * =========================================================
   */

  if (!job) {
    return (
      <main className="min-h-screen bg-[#0b0f0a]">
        <Header />

        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="rounded-3xl border border-[#283326] bg-[#121812] p-6">
            <p className="font-bold text-red-400">
              {errorMessage || "Job not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * STATUS
   * =========================================================
   */

  const jobStatus = job.status || "open";
  const journeyStatus = job.journey_status || "";

  const driverSelected =
    Boolean(job.accepted_bid_id) ||
    Boolean(job.assigned_driver_id) ||
    Boolean(job.assigned_bid_id) ||
    [
      "assigned",
      "in_progress",
      "completed",
    ].includes(jobStatus);

  const waitingForDriverBids =
    !driverSelected &&
    ["open", "bidding"].includes(jobStatus);

  const driverOnTheWay =
    driverSelected &&
    [
      "on_the_way",
      "on_way",
      "arrived",
      "in_progress",
      "completed",
    ].includes(journeyStatus);

  const beforePhotosUploaded =
    beforePhotos.length > 0;

  const collectionInProgress =
    driverSelected &&
    (
      [
        "in_progress",
        "completed",
      ].includes(journeyStatus) ||
      [
        "in_progress",
        "completed",
      ].includes(jobStatus) ||
      beforePhotosUploaded ||
      afterPhotos.length > 0
    );

  const afterPhotosUploaded =
    afterPhotos.length > 0;

  const jobCompleted =
    jobStatus === "completed" ||
    journeyStatus === "completed";

  const canChooseDriver =
    !driverSelected &&
    ["open", "bidding"].includes(jobStatus);

  const selectableBids = bids.filter(
    (bid) =>
      bid.status !== "rejected" &&
      [
        "pending",
        "submitted",
        "open",
      ].includes(bid.status)
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0b0f0a] pb-24 text-white lg:pb-0">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">

        {/* =================================================== */}
        {/* BACK */}
        {/* =================================================== */}

        <Link
          href="/customer/dashboard"
          className="inline-flex min-h-[40px] items-center text-sm font-bold text-[#72bd42] transition hover:text-[#91dc60]"
        >
          ← Customer Dashboard
        </Link>

        {/* =================================================== */}
        {/* ALERTS */}
        {/* =================================================== */}

        {successMessage && (
          <div className="mt-4 rounded-2xl border border-[#385c29] bg-[#14200f] p-4 sm:mt-6 sm:p-5">
            <p className="font-bold text-[#82d451]">
              {successMessage}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 p-4 sm:mt-6 sm:p-5">
            <p className="font-semibold leading-6 text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        {/* =================================================== */}
        {/* MOBILE-FIRST JOB SUMMARY */}
        {/* =================================================== */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-[#283326] bg-[#121812] shadow-2xl sm:mt-8">
          <div className="p-5 sm:p-7">

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={jobStatus} />

              <span className="text-xs font-bold text-[#788274]">
                {job.reference ||
                  `RC-${String(job.id).padStart(6, "0")}`}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-4xl">
              {job.job_type || "Removal Job"}
            </h1>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <QuickInfo
                label="Postcode"
                value={
                  job.postcode || "Not provided"
                }
              />

              <QuickInfo
                label="Collection"
                value={
                  job.preferred_date
                    ? new Date(
                        job.preferred_date
                      ).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "Not set"
                }
              />

              <QuickInfo
                label="Time"
                value={
                  job.preferred_time ||
                  "Not set"
                }
              />

              <QuickInfo
                label="Load"
                value={
                  job.load_size ||
                  "Not provided"
                }
              />
            </div>
          </div>
        </section>

        {/* =================================================== */}
        {/* DRIVER ON WAY */}
        {/* =================================================== */}

        {driverOnTheWay && !jobCompleted && (
          <div className="mt-4 overflow-hidden rounded-3xl border border-[#416c2c] bg-[#14200f] sm:mt-6">
            <div className="p-5 sm:p-7">
              <div className="flex items-start gap-3 sm:gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#529027] text-lg font-black text-white sm:h-12 sm:w-12 sm:text-xl">
                  ✓
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#72bd42] sm:text-xs">
                    Live update
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                    Your driver is on the way
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#9aa593]">
                    The driver has started their journey
                    to your collection.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* =================================================== */}
        {/* COMPLETED */}
        {/* =================================================== */}

        {jobCompleted && (
          <div className="mt-4 overflow-hidden rounded-3xl border border-[#416c2c] bg-[#14200f] sm:mt-6">
            <div className="p-5 sm:p-7">
              <div className="flex items-start gap-3 sm:gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#529027] text-lg font-black text-white sm:h-12 sm:w-12 sm:text-xl">
                  ✓
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#72bd42] sm:text-xs">
                    Collection complete
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                    Your collection has been completed
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#9aa593]">
                    Your driver's completion photos are
                    shown below.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* =================================================== */}
        {/* MOBILE QUOTES — MOVED UP */}
        {/* =================================================== */}

        <section
          id="driver-quotes"
          className="mt-4 rounded-3xl border border-[#283326] bg-[#121812] p-5 shadow-2xl sm:mt-7 sm:p-8 lg:hidden"
        >
          <div className="flex items-start justify-between gap-3">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#529027] sm:text-xs">
                Driver quotes
              </p>

              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                {bids.length === 0
                  ? "Waiting for quotes"
                  : `${bids.length} ${
                      bids.length === 1
                        ? "quote"
                        : "quotes"
                    } received`}
              </h2>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#33412e] bg-[#192217]">
              <span className="text-lg font-black text-[#72bd42]">
                {bids.length}
              </span>
            </div>

          </div>

          {bids.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#283326] bg-[#0d120d] p-5">
              <p className="font-bold text-white">
                No quotes yet
              </p>

              <p className="mt-2 text-sm leading-6 text-[#818c7e]">
                Drivers can now see your job and submit
                their prices. We'll show them here as
                they arrive.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {bids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  driver={drivers[bid.driver_id]}
                  canChooseDriver={canChooseDriver}
                  acceptingBid={acceptingBid}
                  onAccept={acceptBid}
                />
              ))}
            </div>
          )}
        </section>

        {/* =================================================== */}
        {/* DESKTOP MAIN GRID */}
        {/* =================================================== */}

        <div className="mt-7 hidden gap-7 lg:grid lg:grid-cols-[1.2fr_0.8fr]">

          {/* LEFT — JOB DETAILS */}

          <section className="rounded-3xl border border-[#283326] bg-[#121812] p-8 shadow-2xl">

            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#529027]">
              Collection
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              Job details
            </h2>

            <div className="mt-7 space-y-4">

              <Detail
                label="Collection address"
                value={job.address}
              />

              <Detail
                label="Postcode"
                value={job.postcode}
              />

              <Detail
                label="Job type"
                value={job.job_type}
              />

              <Detail
                label="Load size"
                value={job.load_size}
              />

              <Detail
                label="Description"
                value={job.description}
              />

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <Detail
                label="Access"
                value={job.access_notes}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Detail
                  label="Collection date"
                  value={
                    job.preferred_date
                      ? new Date(
                          job.preferred_date
                        ).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )
                      : null
                  }
                />

                <Detail
                  label="Preferred time"
                  value={job.preferred_time}
                />
              </div>

            </div>
          </section>

          {/* RIGHT */}

          <section className="space-y-7">

            <DesktopQuotes
              bids={bids}
              drivers={drivers}
              canChooseDriver={canChooseDriver}
              acceptingBid={acceptingBid}
              onAccept={acceptBid}
            />

            {canChooseDriver && bids.length > 0 && (
              <PaymentInformation />
            )}

            <LiveStatus
              driverOnTheWay={driverOnTheWay}
              jobCompleted={jobCompleted}
              waitingForDriverBids={waitingForDriverBids}
              driverSelected={driverSelected}
              bids={bids}
              beforePhotosUploaded={beforePhotosUploaded}
              collectionInProgress={collectionInProgress}
              afterPhotosUploaded={afterPhotosUploaded}
            />

          </section>
        </div>

        {/* =================================================== */}
        {/* MOBILE JOB DETAILS */}
        {/* =================================================== */}

        <div className="mt-4 space-y-3 lg:hidden">

          <details className="group overflow-hidden rounded-3xl border border-[#283326] bg-[#121812]">
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#529027]">
                  Collection
                </p>

                <h2 className="mt-1 text-lg font-black text-white">
                  Job details
                </h2>
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#303a2f] text-lg text-[#72bd42] transition group-open:rotate-45">
                +
              </span>
            </summary>

            <div className="border-t border-[#283326] p-4 sm:p-6">
              <div className="space-y-3">

                <Detail
                  label="Collection address"
                  value={job.address}
                />

                <Detail
                  label="Postcode"
                  value={job.postcode}
                />

                <Detail
                  label="Job type"
                  value={job.job_type}
                />

                <Detail
                  label="Load size"
                  value={job.load_size}
                />

                <Detail
                  label="Description"
                  value={job.description}
                />

                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <Detail
                  label="Access"
                  value={job.access_notes}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Detail
                    label="Collection date"
                    value={
                      job.preferred_date
                        ? new Date(
                            job.preferred_date
                          ).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : null
                    }
                  />

                  <Detail
                    label="Preferred time"
                    value={job.preferred_time}
                  />
                </div>

              </div>
            </div>
          </details>

          {/* ================================================= */}
          {/* MOBILE LIVE STATUS */}
          {/* ================================================= */}

          <details className="group overflow-hidden rounded-3xl border border-[#283326] bg-[#121812]">
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#529027]">
                    Live status
                  </p>

                  {driverOnTheWay &&
                    !jobCompleted && (
                      <span className="rounded-full border border-[#416c2c] bg-[#172511] px-2 py-0.5 text-[9px] font-black uppercase text-[#82d451]">
                        Live
                      </span>
                    )}
                </div>

                <h2 className="mt-1 text-lg font-black text-white">
                  Job progress
                </h2>
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#303a2f] text-lg text-[#72bd42] transition group-open:rotate-45">
                +
              </span>

            </summary>

            <div className="border-t border-[#283326] p-5">
              <LiveStatusContent
                waitingForDriverBids={
                  waitingForDriverBids
                }
                driverSelected={driverSelected}
                bids={bids}
                driverOnTheWay={
                  driverOnTheWay
                }
                beforePhotosUploaded={
                  beforePhotosUploaded
                }
                collectionInProgress={
                  collectionInProgress
                }
                afterPhotosUploaded={
                  afterPhotosUploaded
                }
                jobCompleted={jobCompleted}
              />
            </div>
          </details>

          {/* ================================================= */}
          {/* MOBILE EVIDENCE */}
          {/* ================================================= */}

          <details className="group overflow-hidden rounded-3xl border border-[#283326] bg-[#121812]">
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#529027]">
                  Job evidence
                </p>

                <h2 className="mt-1 text-lg font-black text-white">
                  Collection photos
                </h2>
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#303a2f] text-lg text-[#72bd42] transition group-open:rotate-45">
                +
              </span>

            </summary>

            <div className="border-t border-[#283326] p-4 sm:p-6">

              <p className="text-sm leading-6 text-[#7f8b7b]">
                Photos showing the condition before
                and after collection.
              </p>

              {loadingPhotos ? (
                <div className="mt-5 rounded-2xl border border-[#283326] bg-[#0d120d] p-5">
                  <p className="font-semibold text-[#899487]">
                    Loading collection photos...
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  <EvidenceSection
                    title="Before photos"
                    description="Photos taken before the driver started loading."
                    photos={beforePhotos}
                  />

                  <EvidenceSection
                    title="After photos"
                    description="Photos taken after the collection was completed."
                    photos={afterPhotos}
                  />
                </div>
              )}

            </div>
          </details>

        </div>

        {/* =================================================== */}
        {/* DESKTOP EVIDENCE */}
        {/* =================================================== */}

        <section className="mt-7 hidden rounded-3xl border border-[#283326] bg-[#121812] p-8 shadow-2xl lg:block">

          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#529027]">
            Job evidence
          </p>

          <h2 className="mt-1 text-2xl font-black text-white">
            Collection photos
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#7f8b7b]">
            These photos show the condition of the job
            before and after the collection.
          </p>

          {loadingPhotos ? (
            <div className="mt-6 rounded-2xl border border-[#283326] bg-[#0d120d] p-6">
              <p className="font-semibold text-[#899487]">
                Loading collection photos...
              </p>
            </div>
          ) : (
            <div className="mt-7 grid gap-7 md:grid-cols-2">
              <EvidenceSection
                title="Before photos"
                description="Photos taken before the driver started loading."
                photos={beforePhotos}
              />

              <EvidenceSection
                title="After photos"
                description="Photos taken after the collection was completed."
                photos={afterPhotos}
              />
            </div>
          )}

        </section>

        {/* =================================================== */}
        {/* FOOTER REFERENCE */}
        {/* =================================================== */}

        <div className="mt-4 rounded-2xl border border-[#283326] bg-[#0f140f] p-4 sm:mt-8 sm:p-5">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-[#667161]">
                Job reference
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {job.reference ||
                  `RC-${String(job.id).padStart(6, "0")}`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#667161]">
                Posted
              </p>

              <p className="mt-1 text-sm font-semibold text-[#9ca697]">
                {new Date(
                  job.created_at
                ).toLocaleDateString("en-GB")}
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* ===================================================== */}
      {/* MOBILE STICKY QUOTE ACTION                           */}
      {/* ===================================================== */}

      {canChooseDriver &&
        selectableBids.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#283326] bg-[#080c08]/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:hidden">

            <div className="mx-auto flex max-w-xl items-center gap-3">

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#697468]">
                  {selectableBids.length} quote
                  {selectableBids.length === 1
                    ? ""
                    : "s"}
                  available
                </p>

                <p className="truncate text-sm font-bold text-white">
                  Choose a driver above
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById(
                      "driver-quotes"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                }}
                className="shrink-0 rounded-xl bg-[#529027] px-5 py-3.5 text-xs font-black text-white shadow-lg transition active:scale-[0.98]"
              >
                VIEW QUOTES →
              </button>

            </div>
          </div>
        )}
    </main>
  );
}

/* ========================================================= */
/* HEADER                                                     */
/* ========================================================= */

function Header() {
  return (
    <header className="border-b border-[#283326] bg-[#0e130e]">

      <div className="mx-auto flex min-h-[62px] max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-5 lg:px-8">

        <Link
          href="/customer/dashboard"
          className="font-black tracking-tight text-white"
        >
          <span className="text-[#529027]">
            RCS
          </span>{" "}
          MARKETPLACE
        </Link>

        <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#687363] sm:block">
          Customer Portal
        </span>

      </div>

    </header>
  );
}

/* ========================================================= */
/* QUICK INFO                                                 */
/* ========================================================= */

function QuickInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#283326] bg-[#0d120d] px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#667161]">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-[#e7ebe4] sm:text-sm">
        {value}
      </p>
    </div>
  );
}

/* ========================================================= */
/* DESKTOP QUOTES                                             */
/* ========================================================= */

function DesktopQuotes({
  bids,
  drivers,
  canChooseDriver,
  acceptingBid,
  onAccept,
}: {
  bids: Bid[];
  drivers: Record<string, Driver>;
  canChooseDriver: boolean;
  acceptingBid: number | null;
  onAccept: (bid: Bid) => void;
}) {
  return (
    <div className="rounded-3xl border border-[#283326] bg-[#121812] p-8 shadow-2xl">

      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#529027]">
            Driver quotes
          </p>

          <h2 className="mt-1 text-2xl font-black text-white">
            {bids.length === 0
              ? "Waiting for quotes"
              : `${bids.length} ${
                  bids.length === 1
                    ? "quote"
                    : "quotes"
                } received`}
          </h2>
        </div>

        <div className="rounded-xl border border-[#33412e] bg-[#192217] px-4 py-3 text-center">
          <p className="text-2xl font-black text-[#72bd42]">
            {bids.length}
          </p>

          <p className="text-[10px] font-bold uppercase tracking-wide text-[#7d8978]">
            Quotes
          </p>
        </div>

      </div>

      {bids.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[#283326] bg-[#0d120d] p-6">
          <p className="font-bold text-white">
            No quotes yet
          </p>

          <p className="mt-2 text-sm leading-6 text-[#818c7e]">
            Drivers can now see your job and submit
            their prices.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {bids.map((bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              driver={drivers[bid.driver_id]}
              canChooseDriver={canChooseDriver}
              acceptingBid={acceptingBid}
              onAccept={onAccept}
            />
          ))}
        </div>
      )}

    </div>
  );
}

/* ========================================================= */
/* BID CARD                                                   */
/* ========================================================= */

function BidCard({
  bid,
  driver,
  canChooseDriver,
  acceptingBid,
  onAccept,
}: {
  bid: Bid;
  driver?: Driver;
  canChooseDriver: boolean;
  acceptingBid: number | null;
  onAccept: (bid: Bid) => void;
}) {
  const isAccepted = bid.status === "accepted";
  const isRejected = bid.status === "rejected";

  const isPending =
    bid.status === "pending" ||
    bid.status === "submitted" ||
    bid.status === "open";

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        isAccepted
          ? "border-[#4b792f] bg-[#15200f]"
          : "border-[#283326] bg-[#0d120d]"
      }`}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#687363]">
            Driver
          </p>

          <p className="mt-1 truncate text-base font-black text-white sm:text-lg">
            {driver?.full_name ||
              "RCS Driver"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-2xl font-black text-white sm:text-3xl">
            £{Number(bid.amount).toFixed(2)}
          </p>

          <BidStatus status={bid.status} />
        </div>

      </div>

      {bid.message && (
        <div className="mt-4 rounded-xl border border-[#283326] bg-[#121812] p-3.5 sm:p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#667161]">
            Driver message
          </p>

          <p className="mt-2 text-sm leading-6 text-[#b1baae]">
            {bid.message}
          </p>
        </div>
      )}

      {canChooseDriver &&
        !isRejected &&
        isPending && (
          <button
            type="button"
            onClick={() => onAccept(bid)}
            disabled={acceptingBid !== null}
            className="mt-4 min-h-[52px] w-full rounded-xl bg-[#529027] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#65a936] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {acceptingBid === bid.id ? (
              <span className="flex items-center justify-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Taking you to payment...
              </span>
            ) : (
              `Select driver & pay £${Number(
                bid.amount
              ).toFixed(2)}`
            )}
          </button>
        )}

      {isAccepted && (
        <div className="mt-4 rounded-xl border border-[#385c29] bg-[#192615] p-4">
          <p className="font-bold text-[#82d451]">
            Driver selected
          </p>

          <p className="mt-1 text-sm leading-6 text-[#8e9a88]">
            Payment has been completed and this
            driver has been assigned to your
            collection.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="mt-4 rounded-xl border border-[#44302d] bg-[#211513] p-4">
          <p className="font-bold text-[#c98278]">
            Quote not selected
          </p>
        </div>
      )}

    </div>
  );
}

/* ========================================================= */
/* PAYMENT INFORMATION                                        */
/* ========================================================= */

function PaymentInformation() {
  return (
    <div className="rounded-3xl border border-[#385c29] bg-[#14200f] p-8 shadow-2xl">

      <div className="flex gap-4">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#529027] font-black">
          £
        </div>

        <div>
          <h3 className="font-black text-white">
            Secure payment
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#96a18f]">
            Select your preferred driver and
            continue to secure payment. Your driver
            will only be assigned after payment has
            been successfully completed.
          </p>
        </div>

      </div>

    </div>
  );
}

/* ========================================================= */
/* LIVE STATUS                                                 */
/* ========================================================= */

function LiveStatus({
  driverOnTheWay,
  jobCompleted,
  waitingForDriverBids,
  driverSelected,
  bids,
  beforePhotosUploaded,
  collectionInProgress,
  afterPhotosUploaded,
}: {
  driverOnTheWay: boolean;
  jobCompleted: boolean;
  waitingForDriverBids: boolean;
  driverSelected: boolean;
  bids: Bid[];
  beforePhotosUploaded: boolean;
  collectionInProgress: boolean;
  afterPhotosUploaded: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#283326] bg-[#121812] p-8 shadow-2xl">

      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#529027]">
            Live status
          </p>

          <h2 className="mt-1 text-2xl font-black text-white">
            Job progress
          </h2>
        </div>

        {driverOnTheWay &&
          !jobCompleted && (
            <span className="rounded-full border border-[#416c2c] bg-[#172511] px-3 py-1.5 text-xs font-black text-[#82d451]">
              Live
            </span>
          )}

      </div>

      <div className="mt-8">
        <LiveStatusContent
          waitingForDriverBids={
            waitingForDriverBids
          }
          driverSelected={driverSelected}
          bids={bids}
          driverOnTheWay={driverOnTheWay}
          beforePhotosUploaded={
            beforePhotosUploaded
          }
          collectionInProgress={
            collectionInProgress
          }
          afterPhotosUploaded={
            afterPhotosUploaded
          }
          jobCompleted={jobCompleted}
        />
      </div>

    </div>
  );
}

/* ========================================================= */
/* LIVE STATUS CONTENT                                        */
/* ========================================================= */

function LiveStatusContent({
  waitingForDriverBids,
  driverSelected,
  bids,
  driverOnTheWay,
  beforePhotosUploaded,
  collectionInProgress,
  afterPhotosUploaded,
  jobCompleted,
}: {
  waitingForDriverBids: boolean;
  driverSelected: boolean;
  bids: Bid[];
  driverOnTheWay: boolean;
  beforePhotosUploaded: boolean;
  collectionInProgress: boolean;
  afterPhotosUploaded: boolean;
  jobCompleted: boolean;
}) {
  return (
    <div>

      <ProgressStep
        title="Job posted"
        description="Your job has been posted to the RCS marketplace."
        active={true}
      />

      <ProgressStep
        title="Waiting for driver bids"
        description={
          driverSelected
            ? "Driver bidding has finished and a driver has been selected."
            : bids.length > 0
              ? `${bids.length} ${
                  bids.length === 1
                    ? "quote has"
                    : "quotes have"
                } been received. Choose a driver above.`
              : "Drivers can now see your job and submit their quotes."
        }
        active={waitingForDriverBids}
      />

      <ProgressStep
        title="Driver selected"
        description={
          driverSelected
            ? "You have selected a driver for your collection."
            : "Choose a driver from the quotes above and complete payment."
        }
        active={driverSelected}
      />

      <ProgressStep
        title="Driver on the way"
        description={
          driverOnTheWay
            ? "Your driver has started travelling to your collection."
            : "Your driver will update you when they start travelling to you."
        }
        active={driverOnTheWay}
      />

      <ProgressStep
        title="Before photos"
        description={
          beforePhotosUploaded
            ? `${beforePhotosUploaded ? "Before photos uploaded." : ""}`
            : "The driver will take photos before starting the collection."
        }
        active={beforePhotosUploaded}
      />

      <ProgressStep
        title="Collection in progress"
        description={
          collectionInProgress
            ? "The driver has started the collection."
            : "The collection will move here once work starts."
        }
        active={collectionInProgress}
      />

      <ProgressStep
        title="After photos"
        description={
          afterPhotosUploaded
            ? "Completion photos have been uploaded."
            : "The driver will upload photos after the collection has been completed."
        }
        active={afterPhotosUploaded}
      />

      <ProgressStep
        title="Completed"
        description={
          jobCompleted
            ? "Your collection has been completed."
            : "The collection will be completed after the job is finished."
        }
        active={jobCompleted}
        last
      />

    </div>
  );
}

/* ========================================================= */
/* STATUS BADGE                                               */
/* ========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<string, string> = {
    open: "Open",
    bidding: "Quotes open",
    assigned: "Driver selected",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    payment_pending: "Payment pending",
  };

  const isCompleted =
    status === "completed";

  const isActive =
    status === "assigned" ||
    status === "in_progress";

  const isPayment =
    status === "payment_pending";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide sm:px-4 sm:py-2 sm:text-xs ${
        isCompleted
          ? "border-[#416c2c] bg-[#172511] text-[#82d451]"
          : isActive
            ? "border-[#416c2c] bg-[#172511] text-[#82d451]"
            : isPayment
              ? "border-yellow-900/60 bg-yellow-950/30 text-yellow-400"
              : status === "cancelled"
                ? "border-red-900/60 bg-red-950/30 text-red-400"
                : "border-[#38502f] bg-[#172114] text-[#72bd42]"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

/* ========================================================= */
/* BID STATUS                                                 */
/* ========================================================= */

function BidStatus({
  status,
}: {
  status: string;
}) {
  const label =
    status === "accepted"
      ? "Accepted"
      : status === "rejected"
        ? "Not selected"
        : "Pending";

  const styles =
    status === "accepted"
      ? "border-[#416c2c] bg-[#172511] text-[#82d451]"
      : status === "rejected"
        ? "border-[#44302d] bg-[#211513] text-[#c98278]"
        : "border-[#39442f] bg-[#182016] text-[#9aaa90]";

  return (
    <span
      className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black sm:text-xs ${styles}`}
    >
      {label}
    </span>
  );
}

/* ========================================================= */
/* DETAIL                                                     */
/* ========================================================= */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-3.5 sm:p-4">

      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#667161]">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-[#e7ebe4] sm:mt-2">
        {value || "Not provided"}
      </p>

    </div>
  );
}

/* ========================================================= */
/* PROGRESS STEP                                              */
/* ========================================================= */

function ProgressStep({
  title,
  description,
  active,
  last = false,
}: {
  title: string;
  description: string;
  active: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-3 sm:gap-4">

      {!last && (
        <div
          className={`absolute left-[15px] top-8 h-[calc(100%+8px)] w-px ${
            active
              ? "bg-[#529027]"
              : "bg-[#293128]"
          }`}
        />
      )}

      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black transition-all ${
          active
            ? "border-[#529027] bg-[#529027] text-white shadow-[0_0_0_4px_rgba(82,144,39,0.12)]"
            : "border-[#303a2f] bg-[#171d17] text-[#697468]"
        }`}
      >
        {active ? "✓" : ""}
      </div>

      <div className="pb-6 sm:pb-7">

        <p
          className={`text-sm font-black ${
            active
              ? "text-white"
              : "text-[#687363]"
          }`}
        >
          {title}
        </p>

        <p
          className={`mt-1 text-xs leading-5 sm:text-sm ${
            active
              ? "text-[#899487]"
              : "text-[#687363]"
          }`}
        >
          {description}
        </p>

      </div>
    </div>
  );
}

/* ========================================================= */
/* EVIDENCE SECTION                                           */
/* ========================================================= */

function EvidenceSection({
  title,
  description,
  photos,
}: {
  title: string;
  description: string;
  photos: EvidencePhoto[];
}) {
  return (
    <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-4 sm:p-5">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <h3 className="text-base font-black text-white sm:text-lg">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#778274] sm:text-sm">
            {description}
          </p>

        </div>

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            photos.length > 0
              ? "bg-[#529027] text-white"
              : "border border-[#303a2f] bg-[#171d17] text-[#697468]"
          }`}
        >
          {photos.length > 0
            ? "✓"
            : "—"}
        </div>

      </div>

      {photos.length === 0 ? (
        <div className="mt-4 rounded-xl border border-[#283326] bg-[#121812] p-4">
          <p className="text-xs font-semibold leading-5 text-[#7c8879] sm:text-sm">
            {title === "Before photos"
              ? "Before photos have not been uploaded yet."
              : "After photos have not been uploaded yet."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">

          {photos.map((photo) => (
            <a
              key={photo.url}
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-xl border border-[#283326] bg-[#121812]"
            >
              <img
                src={photo.url}
                alt={title}
                className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </a>
          ))}

        </div>
      )}

    </div>
  );
}