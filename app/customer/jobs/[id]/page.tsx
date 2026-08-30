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
      .select(
        "id, job_id, driver_id, amount, message, status"
      )
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
        ...new Set(
          loadedBids.map((bid) => bid.driver_id)
        ),
      ];

      const {
        data: driverData,
        error: driverError,
      } = await supabase
        .from("drivers")
        .select("id, full_name")
        .in("id", driverIds);

      if (driverError) {
        console.error(
          "DRIVER LOAD ERROR:",
          driverError
        );
      }

      const driverMap: Record<string, Driver> = {};

      (driverData || []).forEach((driver) => {
        driverMap[driver.id] = driver as Driver;
      });

      setDrivers(driverMap);
    } else {
      setDrivers({});
    }

    /*
     * =======================================================
     * LOAD PHOTOS
     * =======================================================
     */

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
      const before = await loadPhotosFromFolder(
        `${id}/before`
      );

      const after = await loadPhotosFromFolder(
        `${id}/after`
      );

      setBeforePhotos(before);
      setAfterPhotos(after);
    } catch (error) {
      console.error(
        "CUSTOMER EVIDENCE PHOTO ERROR:",
        error
      );
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
      console.error(
        `PHOTO LIST ERROR (${folder}):`,
        error
      );

      return [];
    }

    if (!files || files.length === 0) {
      return [];
    }

    const photoFiles = files.filter(
      (file) =>
        file.name &&
        !file.name.startsWith(".")
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
   * SELECT DRIVER + START STRIPE PAYMENT
   *
   * IMPORTANT:
   *
   * THIS DOES NOT:
   *
   * - update jobs
   * - update bids
   * - assign driver
   * - reject other bids
   *
   * Stripe webhook will do that AFTER successful payment.
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
      `Continue to payment for ${drivers[bid.driver_id]?.full_name || "this driver"}'s quote of £${Number(
        bid.amount
      ).toFixed(2)}?`
    );

    if (!confirmed) {
      return;
    }

    setAcceptingBid(bid.id);

    try {
      /*
       * =====================================================
       * VERIFY CUSTOMER SESSION
       * =====================================================
       */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/customer/login");
        return;
      }

      /*
       * =====================================================
       * VERIFY JOB
       * =====================================================
       */

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

        return;
      }

      /*
       * =====================================================
       * MAKE SURE A DRIVER HAS NOT ALREADY BEEN ASSIGNED
       * =====================================================
       */

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

      /*
       * =====================================================
       * VERIFY BID
       * =====================================================
       */

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

        return;
      }

      /*
       * =====================================================
       * DO NOT ACCEPT THE BID HERE
       *
       * Payment must happen first.
       * =====================================================
       */

      if (selectedBid.status === "rejected") {
        setErrorMessage(
          "This driver's quote is no longer available."
        );

        return;
      }

      /*
       * =====================================================
       * CREATE STRIPE CHECKOUT SESSION
       * =====================================================
       */

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
        console.error(
          "STRIPE RESPONSE DID NOT INCLUDE URL:",
          result
        );

        throw new Error(
          "Stripe did not return a checkout URL."
        );
      }

      /*
       * =====================================================
       * SEND CUSTOMER TO STRIPE
       * =====================================================
       */

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
        <div className="text-center">
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
   * JOB NOT FOUND
   * =========================================================
   */

  if (!job) {
    return (
      <main className="min-h-screen bg-[#0b0f0a]">
        <Header />

        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="rounded-3xl border border-[#283326] bg-[#121812] p-8">
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
   * JOB STATUS
   * =========================================================
   */

  const jobStatus = job.status || "open";

  const journeyStatus =
    job.journey_status || "";

  /*
   * =========================================================
   * DRIVER SELECTED
   * =========================================================
   */

  const driverSelected =
    Boolean(job.accepted_bid_id) ||
    Boolean(job.assigned_driver_id) ||
    Boolean(job.assigned_bid_id) ||
    [
      "assigned",
      "in_progress",
      "completed",
    ].includes(jobStatus);

  /*
   * =========================================================
   * WAITING FOR BIDS
   * =========================================================
   */

  const waitingForDriverBids =
    !driverSelected &&
    [
      "open",
      "bidding",
    ].includes(jobStatus);

  /*
   * =========================================================
   * DRIVER ON WAY
   * =========================================================
   */

  const driverOnTheWay =
    driverSelected &&
    [
      "on_the_way",
      "on_way",
      "arrived",
      "in_progress",
      "completed",
    ].includes(journeyStatus);

  /*
   * =========================================================
   * BEFORE PHOTOS
   * =========================================================
   */

  const beforePhotosUploaded =
    beforePhotos.length > 0;

  /*
   * =========================================================
   * COLLECTION IN PROGRESS
   * =========================================================
   */

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

  /*
   * =========================================================
   * AFTER PHOTOS
   * =========================================================
   */

  const afterPhotosUploaded =
    afterPhotos.length > 0;

  /*
   * =========================================================
   * COMPLETED
   * =========================================================
   */

  const jobCompleted =
    jobStatus === "completed" ||
    journeyStatus === "completed";

  /*
   * =========================================================
   * CAN CHOOSE DRIVER
   * =========================================================
   */

  const canChooseDriver =
    !driverSelected &&
    [
      "open",
      "bidding",
    ].includes(jobStatus);

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#0b0f0a] text-white">
      <Header />

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">

        {/* BACK */}

        <Link
          href="/customer/dashboard"
          className="inline-flex items-center text-sm font-bold text-[#72bd42] transition hover:text-[#91dc60]"
        >
          ← Customer Dashboard
        </Link>

        {/* SUCCESS */}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-[#385c29] bg-[#14200f] p-5">
            <p className="font-bold text-[#82d451]">
              {successMessage}
            </p>
          </div>
        )}

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
            <p className="font-semibold text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        {/* JOB HEADER */}

        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={jobStatus} />

            <span className="text-sm font-bold text-[#788274]">
              {job.reference ||
                `RC-${String(job.id).padStart(6, "0")}`}
            </span>
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
            {job.job_type || "Removal Job"}
          </h1>

          <p className="mt-3 text-lg text-[#899487]">
            {job.postcode ||
              "Postcode not provided"}
          </p>
        </div>

        {/* DRIVER ON THE WAY */}

        {driverOnTheWay &&
          !jobCompleted && (
            <div className="mt-8 overflow-hidden rounded-3xl border border-[#416c2c] bg-[#14200f]">
              <div className="p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#529027] text-xl font-black text-white">
                    ✓
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#72bd42]">
                      Live update
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-white">
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

        {/* COMPLETED */}

        {jobCompleted && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-[#416c2c] bg-[#14200f]">
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#529027] text-xl font-black text-white">
                  ✓
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#72bd42]">
                    Collection complete
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-white">
                    Your collection has been completed
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#9aa593]">
                    Your driver's completion photos
                    are shown below.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN GRID */}

        <div className="mt-10 grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">

          {/* LEFT */}

          <section className="rounded-3xl border border-[#283326] bg-[#121812] p-6 shadow-2xl sm:p-8">

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

            {/* DRIVER QUOTES */}

            <div className="rounded-3xl border border-[#283326] bg-[#121812] p-6 shadow-2xl sm:p-8">

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
                    Drivers can now see your job and
                    submit their prices.
                  </p>
                </div>

              ) : (

                <div className="mt-6 space-y-4">

                  {bids.map((bid) => {

                    const driver =
                      drivers[bid.driver_id];

                    const isAccepted =
                      bid.status === "accepted";

                    const isRejected =
                      bid.status === "rejected";

                    const isPending =
                      bid.status === "pending" ||
                      bid.status === "submitted" ||
                      bid.status === "open";

                    return (
                      <div
                        key={bid.id}
                        className={`rounded-2xl border p-5 ${
                          isAccepted
                            ? "border-[#4b792f] bg-[#15200f]"
                            : "border-[#283326] bg-[#0d120d]"
                        }`}
                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div>
                            <p className="text-sm font-bold text-[#899487]">
                              Driver
                            </p>

                            <p className="mt-1 text-lg font-black text-white">
                              {driver?.full_name ||
                                "RCS Driver"}
                            </p>
                          </div>

                          <div className="sm:text-right">

                            <p className="text-3xl font-black text-white">
                              £
                              {Number(
                                bid.amount
                              ).toFixed(2)}
                            </p>

                            <BidStatus
                              status={bid.status}
                            />

                          </div>
                        </div>

                        {bid.message && (
                          <div className="mt-4 rounded-xl border border-[#283326] bg-[#121812] p-4">

                            <p className="text-xs font-black uppercase tracking-wide text-[#667161]">
                              Driver message
                            </p>

                            <p className="mt-2 text-sm leading-6 text-[#b1baae]">
                              {bid.message}
                            </p>

                          </div>
                        )}

                        {/* PAYMENT BUTTON */}

                        {canChooseDriver &&
                          !isRejected &&
                          isPending && (

                          <button
                            onClick={() =>
                              acceptBid(bid)
                            }
                            disabled={
                              acceptingBid !== null
                            }
                            className="mt-5 w-full rounded-xl bg-[#529027] px-5 py-4 font-black text-white transition hover:bg-[#65a936] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {acceptingBid ===
                            bid.id ? (
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
                          <div className="mt-5 rounded-xl border border-[#385c29] bg-[#192615] p-4">

                            <p className="font-bold text-[#82d451]">
                              Driver selected
                            </p>

                            <p className="mt-1 text-sm text-[#8e9a88]">
                              Payment has been completed
                              and this driver has been
                              assigned to your collection.
                            </p>

                          </div>
                        )}

                        {isRejected && (
                          <div className="mt-5 rounded-xl border border-[#44302d] bg-[#211513] p-4">

                            <p className="font-bold text-[#c98278]">
                              Quote not selected
                            </p>

                          </div>
                        )}

                      </div>
                    );
                  })}

                </div>
              )}

            </div>

            {/* PAYMENT INFORMATION */}

            {canChooseDriver && bids.length > 0 && (
              <div className="rounded-3xl border border-[#385c29] bg-[#14200f] p-6 shadow-2xl sm:p-8">

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
                      continue to secure payment. Your
                      driver will only be assigned after
                      payment has been successfully
                      completed.
                    </p>
                  </div>

                </div>

              </div>
            )}

            {/* LIVE STATUS */}

            <div className="rounded-3xl border border-[#283326] bg-[#121812] p-6 shadow-2xl sm:p-8">

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
                      ? `${beforePhotos.length} ${
                          beforePhotos.length === 1
                            ? "before photo"
                            : "before photos"
                        } uploaded.`
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
                      ? `${afterPhotos.length} ${
                          afterPhotos.length === 1
                            ? "after photo"
                            : "after photos"
                        } uploaded.`
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
            </div>

          </section>
        </div>

        {/* JOB EVIDENCE */}

        <section className="mt-8 rounded-3xl border border-[#283326] bg-[#121812] p-6 shadow-2xl sm:p-8">

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

        {/* FOOTER */}

        <div className="mt-8 rounded-2xl border border-[#283326] bg-[#0f140f] p-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#667161]">
                Job reference
              </p>

              <p className="mt-1 font-black text-white">
                {job.reference ||
                  `RC-${String(job.id).padStart(6, "0")}`}
              </p>
            </div>

            <div className="text-left sm:text-right">

              <p className="text-xs font-black uppercase tracking-wide text-[#667161]">
                Posted
              </p>

              <p className="mt-1 font-semibold text-[#9ca697]">
                {new Date(
                  job.created_at
                ).toLocaleDateString("en-GB")}
              </p>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}

/* ========================================================= */
/* HEADER                                                     */
/* ========================================================= */

function Header() {
  return (
    <header className="border-b border-[#283326] bg-[#0e130e]">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">

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
      className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide ${
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
      className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${styles}`}
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
    <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-4">

      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#667161]">
        {label}
      </p>

      <p className="mt-2 break-words font-semibold leading-6 text-[#e7ebe4]">
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
    <div className="relative flex gap-4">

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

      <div className="pb-7">

        <p
          className={`font-black ${
            active
              ? "text-white"
              : "text-[#687363]"
          }`}
        >
          {title}
        </p>

        <p
          className={`mt-1 text-sm leading-5 ${
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
    <div className="rounded-2xl border border-[#283326] bg-[#0d120d] p-5">

      <div className="flex items-start justify-between gap-3">

        <div>

          <h3 className="text-lg font-black text-white">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-5 text-[#778274]">
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

        <div className="mt-5 rounded-xl border border-[#283326] bg-[#121812] p-5">

          <p className="text-sm font-semibold text-[#7c8879]">
            {title === "Before photos"
              ? "Before photos have not been uploaded yet."
              : "After photos have not been uploaded yet."}
          </p>

        </div>

      ) : (

        <div className="mt-5 grid grid-cols-2 gap-3">

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