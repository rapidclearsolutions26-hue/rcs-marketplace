"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/*
|--------------------------------------------------------------------------
| RCS MARKETPLACE
|--------------------------------------------------------------------------
|
| Driver enters:
| £100
|
| Customer pays:
| £100
|
| RCS commission 10%:
| £10
|
| Driver receives:
| £90
|
| The calculation updates LIVE while the driver types.
|
*/

const RCS_FEE_PERCENT = 10;

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
  preferred_time: string | null;
  status: string | null;
  journey_status: string | null;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  created_at: string;
};

type Driver = {
  id: string;
  full_name: string | null;
  approved: boolean | null;
  application_status: string | null;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
};

type PhotoType = "before" | "after";

export default function DriverJobPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const rawJobId = params?.id;

  const jobId =
    typeof rawJobId === "string"
      ? rawJobId
      : Array.isArray(rawJobId)
        ? rawJobId[0]
        : "";

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [driver, setDriver] = useState<Driver | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);

  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState("");

  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
  |--------------------------------------------------------------------------
  | VALID JOB ID
  |--------------------------------------------------------------------------
  */

  const hasValidJobId =
    !!jobId &&
    jobId !== "undefined" &&
    /^\d+$/.test(jobId);

  /*
  |--------------------------------------------------------------------------
  | TODAY
  |--------------------------------------------------------------------------
  */

  const today = useMemo(() => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LIVE BID CALCULATION
  |--------------------------------------------------------------------------
  |
  | THIS IS THE IMPORTANT PART.
  |
  | Every time bidAmount changes, these values change immediately.
  |
  */

  const numericBid = Number(bidAmount) || 0;

  const customerPrice =
    Math.round(numericBid * 100) / 100;

  const platformFee =
    Math.round(
      customerPrice *
        (RCS_FEE_PERCENT / 100) *
        100
    ) / 100;

  const finalDriverPayout =
    Math.round(
      Math.max(
        0,
        customerPrice - platformFee
      ) * 100
    ) / 100;

  /*
  |--------------------------------------------------------------------------
  | LOAD JOB
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!hasValidJobId) {
      setLoading(false);
      setErrorMessage(
        "No valid job was found in the URL."
      );
      return;
    }

    loadJob();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function loadJob() {
    if (!hasValidJobId) {
      setLoading(false);
      setErrorMessage(
        "No valid job ID was found."
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setErrorMessage(
        "This is taking longer than expected. Please refresh the page."
      );
    }, 15000);

    try {
      /*
      |--------------------------------------------------------------------------
      | AUTH
      |--------------------------------------------------------------------------
      */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(authError);

        setErrorMessage(
          "We couldn't verify your account."
        );

        return;
      }

      if (!user) {
        router.push("/driver/login");
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | DRIVER
      |--------------------------------------------------------------------------
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
        .single();

      if (driverError) {
        console.error(driverError);

        setErrorMessage(
          "We couldn't load your driver account."
        );

        return;
      }

      if (
        !driverData.approved ||
        driverData.application_status !== "approved"
      ) {
        setErrorMessage(
          "Your driver account has not been approved yet."
        );

        return;
      }

      setDriver(driverData as Driver);

      /*
      |--------------------------------------------------------------------------
      | JOB
      |--------------------------------------------------------------------------
      */

      const {
        data: jobData,
        error: jobError,
      } = await supabase
        .from("jobs")
        .select(
          `
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
          journey_status,
          accepted_bid_id,
          assigned_driver_id,
          assigned_bid_id,
          created_at
          `
        )
        .eq("id", Number(jobId))
        .single();

      if (jobError) {
        console.error(jobError);

        setErrorMessage(
          "We couldn't find this job."
        );

        return;
      }

      setJob(jobData as Job);

      /*
      |--------------------------------------------------------------------------
      | DRIVER'S EXISTING BID
      |--------------------------------------------------------------------------
      */

      const {
        data: bidData,
        error: bidError,
      } = await supabase
        .from("bids")
        .select(
          `
          id,
          job_id,
          driver_id,
          amount,
          message,
          status,
          created_at,
          accepted_at
          `
        )
        .eq("job_id", Number(jobId))
        .eq("driver_id", user.id)
        .maybeSingle();

      if (bidError) {
        console.error(
          "Bid loading error:",
          bidError
        );
      }

      if (bidData) {
        const bid = bidData as Bid;

        setExistingBid(bid);
        setBidAmount(String(bid.amount));
        setMessage(bid.message || "");
      }
    } catch (error) {
      console.error(
        "loadJob failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong loading this job."
      );
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  const assignedToThisDriver =
    job?.assigned_driver_id === driver?.id;

  const bidAccepted =
    existingBid?.status === "accepted" ||
    (
      job?.accepted_bid_id !== null &&
      job?.accepted_bid_id === existingBid?.id
    );

  const canEditBid =
    job?.status === "open" ||
    job?.status === "bidding";

  const journeyStatus =
    job?.journey_status || "assigned";

  const isOnTheWay =
    journeyStatus === "on_the_way" ||
    journeyStatus === "at_location" ||
    journeyStatus === "completed";

  const isCompleted =
    journeyStatus === "completed";

  /*
  |--------------------------------------------------------------------------
  | PHOTO VALIDATION
  |--------------------------------------------------------------------------
  */

  function validatePhotoFiles(
    files: File[]
  ) {
    return files
      .filter(
        (file) =>
          file.type.startsWith("image/") &&
          file.size <= 10 * 1024 * 1024
      )
      .slice(0, 8);
  }

  function handleBeforePhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    const validFiles =
      validatePhotoFiles(files);

    if (!validFiles.length) {
      setErrorMessage(
        "Please choose valid image files under 10MB each."
      );
      return;
    }

    setBeforePhotos((current) =>
      [...current, ...validFiles].slice(0, 8)
    );

    event.target.value = "";
  }

  function handleAfterPhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    const validFiles =
      validatePhotoFiles(files);

    if (!validFiles.length) {
      setErrorMessage(
        "Please choose valid image files under 10MB each."
      );
      return;
    }

    setAfterPhotos((current) =>
      [...current, ...validFiles].slice(0, 8)
    );

    event.target.value = "";
  }

  function removeBeforePhoto(
    index: number
  ) {
    setBeforePhotos((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  function removeAfterPhoto(
    index: number
  ) {
    setAfterPhotos((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UPLOAD PHOTOS
  |--------------------------------------------------------------------------
  */

  async function uploadJobPhotos(
    type: PhotoType,
    files: File[]
  ) {
    if (!job || !driver) {
      throw new Error(
        "Job or driver information is missing."
      );
    }

    if (!files.length) {
      return [];
    }

    const uploadedPaths: string[] = [];

    for (const file of files) {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const uniqueName =
        `${crypto.randomUUID()}.${extension}`;

      const path =
        `${job.id}/${type}/${uniqueName}`;

      const {
        error,
      } = await supabase.storage
        .from("job-photos")
        .upload(
          path,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          }
        );

      if (error) {
        console.error(
          `${type} photo upload error:`,
          error
        );

        throw error;
      }

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  /*
  |--------------------------------------------------------------------------
  | START JOURNEY
  |--------------------------------------------------------------------------
  */

  async function startJourney() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!job || !driver) {
      setErrorMessage(
        "Job or driver information is missing."
      );
      return;
    }

    if (!assignedToThisDriver) {
      setErrorMessage(
        "This job is not assigned to you."
      );
      return;
    }

    if (isCompleted) {
      setErrorMessage(
        "This job has already been completed."
      );
      return;
    }

    if (isOnTheWay) {
      setSuccessMessage(
        "The customer has already been told you're on the way."
      );
      return;
    }

    setJourneyLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("jobs")
        .update({
          journey_status: "on_the_way",
        })
        .eq("id", job.id)
        .eq(
          "assigned_driver_id",
          driver.id
        )
        .select(
          `
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
          journey_status,
          accepted_bid_id,
          assigned_driver_id,
          assigned_bid_id,
          created_at
          `
        )
        .single();

      if (error) {
        console.error(error);

        setErrorMessage(
          "We couldn't update the journey status."
        );

        return;
      }

      setJob(data as Job);

      setSuccessMessage(
        "You're on the way. The job has been updated."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Something went wrong starting the journey."
      );
    } finally {
      setJourneyLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | COMPLETE JOB
  |--------------------------------------------------------------------------
  */

  async function completeJob() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!job || !driver) {
      setErrorMessage(
        "Job or driver information is missing."
      );
      return;
    }

    if (!assignedToThisDriver) {
      setErrorMessage(
        "This job is not assigned to you."
      );
      return;
    }

    if (!beforePhotos.length) {
      setErrorMessage(
        "Please upload at least one before photo."
      );
      return;
    }

    if (!afterPhotos.length) {
      setErrorMessage(
        "Please upload at least one after photo."
      );
      return;
    }

    setPhotoUploading(true);

    try {
      await uploadJobPhotos(
        "before",
        beforePhotos
      );

      await uploadJobPhotos(
        "after",
        afterPhotos
      );

      const {
        data,
        error,
      } = await supabase
        .from("jobs")
        .update({
          journey_status: "completed",
          status: "completed",
        })
        .eq("id", job.id)
        .eq(
          "assigned_driver_id",
          driver.id
        )
        .select(
          `
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
          journey_status,
          accepted_bid_id,
          assigned_driver_id,
          assigned_bid_id,
          created_at
          `
        )
        .single();

      if (error) {
        console.error(error);

        throw new Error(
          "Photos uploaded, but we couldn't mark the job as completed."
        );
      }

      setJob(data as Job);

      setSuccessMessage(
        "Job completed successfully. Your photos have been uploaded."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't complete the job."
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SUBMIT / UPDATE BID
  |--------------------------------------------------------------------------
  */

  async function submitBid(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!job) {
      setErrorMessage(
        "Job not found."
      );
      return;
    }

    if (!canEditBid) {
      setErrorMessage(
        "Bidding is closed for this job."
      );
      return;
    }

    const amount =
      Number(bidAmount);

    if (!amount || amount <= 0) {
      setErrorMessage(
        "Please enter a valid bid amount."
      );
      return;
    }

    if (!driver) {
      setErrorMessage(
        "Driver account not found."
      );
      return;
    }

    setSubmitting(true);

    try {
      /*
      |--------------------------------------------------------------------------
      | VERIFY JOB
      |--------------------------------------------------------------------------
      */

      const {
        data: currentJob,
        error: currentJobError,
      } = await supabase
        .from("jobs")
        .select(
          `
          id,
          status,
          accepted_bid_id,
          assigned_driver_id,
          assigned_bid_id
          `
        )
        .eq("id", job.id)
        .single();

      if (currentJobError) {
        console.error(
          currentJobError
        );

        setErrorMessage(
          "We couldn't verify the current job status."
        );

        return;
      }

      const jobStillOpen =
        currentJob.status === "open" ||
        currentJob.status === "bidding";

      if (!jobStillOpen) {
        setErrorMessage(
          "Bidding is now closed for this job."
        );

        await loadJob();

        return;
      }

      if (
        currentJob.accepted_bid_id !== null ||
        currentJob.assigned_driver_id !== null ||
        currentJob.assigned_bid_id !== null
      ) {
        setErrorMessage(
          "This job has already been assigned."
        );

        await loadJob();

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE EXISTING BID
      |--------------------------------------------------------------------------
      */

      if (existingBid) {
        if (
          existingBid.status === "accepted" ||
          existingBid.status === "rejected"
        ) {
          setErrorMessage(
            "This bid can no longer be changed."
          );

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("bids")
          .update({
            amount,
            message:
              message.trim() ||
              null,
          })
          .eq(
            "id",
            existingBid.id
          )
          .eq(
            "job_id",
            job.id
          )
          .eq(
            "driver_id",
            driver.id
          )
          .eq(
            "status",
            "pending"
          )
          .select()
          .single();

        if (error) {
          console.error(error);

          setErrorMessage(
            "Your bid could not be updated. The job may have just been assigned."
          );

          await loadJob();

          return;
        }

        setExistingBid(
          data as Bid
        );

        setBidAmount(
          String(amount)
        );

        setSuccessMessage(
          `Bid updated. You will receive £${(
            amount * 0.9
          ).toFixed(2)} after RCS commission.`
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE BID
      |--------------------------------------------------------------------------
      */

      const {
        data,
        error,
      } = await supabase
        .from("bids")
        .insert({
          job_id: job.id,
          driver_id: driver.id,
          amount,
          message:
            message.trim() ||
            null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error(error);

        setErrorMessage(
          "Your bid could not be submitted. The job may have just been assigned."
        );

        return;
      }

      setExistingBid(
        data as Bid
      );

      setSuccessMessage(
        `Bid submitted. You will receive £${(
          amount * 0.9
        ).toFixed(2)} after RCS commission.`
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong submitting your bid."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07100a] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#1bbb8c]" />

          <p className="mt-5 font-bold">
            Loading job...
          </p>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR / NO JOB
  |--------------------------------------------------------------------------
  */

  if (!job) {
    return (
      <main className="min-h-screen bg-[#07100a] px-5 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/driver/dashboard"
            className="font-bold text-[#1bbb8c]"
          >
            ← Driver Dashboard
          </Link>

          <div className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-2xl font-black">
              Unable to load job
            </h1>

            <p className="mt-3 text-white/60">
              {errorMessage ||
                "We couldn't find this job."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-[#07100a] text-white">
      {/* HEADER */}

      <header className="border-b border-white/5 bg-[#07100a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link
            href="/driver/dashboard"
            className="font-black text-[#1bbb8c] hover:text-white"
          >
            ← Driver Dashboard
          </Link>

          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1bbb8c]">
              Driver
            </p>

            <p className="text-sm font-bold">
              {driver?.full_name ||
                "Driver"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10">
        {/* TOP */}

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#1bbb8c]/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#1bbb8c]">
              {job.status ||
                "Open"}
            </span>

            <span className="text-sm font-bold text-white/40">
              {job.reference ||
                `RC-${job.id}`}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
            {job.job_type ||
              "Waste removal"}
          </h1>

          <p className="mt-3 text-white/50">
            Posted{" "}
            {new Date(
              job.created_at
            ).toLocaleDateString(
              "en-GB"
            )}
          </p>
        </div>

        {/* MESSAGES */}

        {errorMessage && (
          <div className="mt-7 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm font-bold text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="mt-7 rounded-2xl border border-[#1bbb8c]/20 bg-[#1bbb8c]/10 p-4">
            <p className="text-sm font-bold text-[#5ee0b3]">
              {successMessage}
            </p>
          </div>
        )}

        {/* CONTENT */}

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          {/* LEFT */}

          <section className="rounded-3xl border border-white/10 bg-[#0b1a12] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1bbb8c]">
              Job details
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Collection information
            </h2>

            <InfoBlock
              title="Collection location"
              value={job.address}
            />

            <InfoBlock
              title="Postcode"
              value={job.postcode}
            />

            <InfoBlock
              title="Description"
              value={job.description}
            />

            <h3 className="mt-8 text-xl font-black">
              Job information
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoItem
                label="Load size"
                value={job.load_size}
              />

              <InfoItem
                label="Floor"
                value={job.floor}
              />

              <InfoItem
                label="Stairs"
                value={
                  job.stairs
                    ? "Yes"
                    : "No"
                }
              />

              <InfoItem
                label="Preferred date"
                value={
                  job.preferred_date
                    ? new Date(
                        job.preferred_date
                      ).toLocaleDateString(
                        "en-GB"
                      )
                    : "Not provided"
                }
              />

              <InfoItem
                label="Preferred time"
                value={job.preferred_time}
              />

              <InfoItem
                label="Access"
                value={job.access_notes}
              />
            </div>
          </section>

          {/* RIGHT */}

          <aside className="h-fit rounded-3xl border border-white/10 bg-[#0b1a12] p-6">
            {/* EXISTING BID */}

            {existingBid && (
              <div className="rounded-2xl border border-white/10 bg-[#102019] p-5">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">
                  Your bid
                </p>

                <p className="mt-2 text-3xl font-black">
                  £
                  {existingBid.amount.toFixed(
                    2
                  )}
                </p>

                <p
                  className={`mt-1 text-sm font-bold ${
                    bidAccepted
                      ? "text-[#5ee0b3]"
                      : existingBid.status ===
                          "rejected"
                        ? "text-red-300"
                        : "text-white/40"
                  }`}
                >
                  {bidAccepted
                    ? "Accepted"
                    : existingBid.status ===
                        "rejected"
                      ? "Rejected"
                      : "Pending"}
                </p>
              </div>
            )}

            {/* CLOSED */}

            {!canEditBid ? (
              <div className="mt-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  🔒
                </div>

                <h2 className="mt-5 text-2xl font-black">
                  Bidding closed
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  This job has been assigned, so bids can no longer be submitted or changed.
                </p>

                {bidAccepted &&
                  assignedToThisDriver && (
                    <div className="mt-6 rounded-2xl border border-[#1bbb8c]/20 bg-[#1bbb8c]/10 p-4">
                      <p className="font-black text-[#5ee0b3]">
                        ✓ Your bid was accepted.
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        The job is now yours.
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              <>
                {/* MARKETPLACE */}

                <div className="mt-7">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1bbb8c]">
                    Marketplace
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {existingBid
                      ? "Update your bid"
                      : "Place your bid"}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    Enter the price the customer will pay.
                  </p>

                  <form
                    onSubmit={
                      submitBid
                    }
                    className="mt-6"
                  >
                    {/* PRICE */}

                    <label className="text-sm font-bold">
                      Your price
                      <span className="ml-1 text-white/30">
                        (customer pays)
                      </span>
                    </label>

                    <div className="mt-2 flex items-center overflow-hidden rounded-2xl border border-white/10 bg-[#07110d] focus-within:border-[#1bbb8c] focus-within:ring-1 focus-within:ring-[#1bbb8c]/30">
                      <span className="pl-5 text-2xl font-black text-[#1bbb8c]">
                        £
                      </span>

                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={
                          bidAmount
                        }
                        onChange={(
                          e
                        ) =>
                          setBidAmount(
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-full bg-transparent px-3 py-4 text-2xl font-black text-white outline-none placeholder:text-white/20"
                      />
                    </div>

                    {/* ==================================================
                        LIVE DRIVER EARNINGS
                    ================================================== */}

                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#1bbb8c]/30 bg-[#10231a]">
                      <div className="border-b border-[#1bbb8c]/10 px-5 py-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1bbb8c]">
                          Your earnings
                        </p>

                        <p className="mt-1 text-sm text-white/50">
                          Updates instantly as you change your bid
                        </p>
                      </div>

                      <div className="p-5">
                        {/* CUSTOMER PAYS */}

                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-white/60">
                              Customer pays
                            </p>

                            <p className="mt-1 text-xs text-white/30">
                              Your bid
                            </p>
                          </div>

                          <p className="text-lg font-black text-white">
                            £
                            {customerPrice.toFixed(
                              2
                            )}
                          </p>
                        </div>

                        {/* RCS FEE */}

                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-white/60">
                              RCS commission
                            </p>

                            <p className="mt-1 text-xs text-white/30">
                              {RCS_FEE_PERCENT}% deducted
                            </p>
                          </div>

                          <p className="text-lg font-black text-red-300">
                            -£
                            {platformFee.toFixed(
                              2
                            )}
                          </p>
                        </div>

                        <div className="my-5 border-t border-white/10" />

                        {/* DRIVER RECEIVES */}

                        <div className="rounded-2xl border border-[#1bbb8c]/30 bg-[#1bbb8c]/10 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-[#1bbb8c]">
                                You receive
                              </p>

                              <p className="mt-1 text-sm font-bold text-white/50">
                                After RCS commission
                              </p>
                            </div>

                            <p className="text-3xl font-black text-[#5ee0b3]">
                              £
                              {finalDriverPayout.toFixed(
                                2
                              )}
                            </p>
                          </div>
                        </div>

                        {/* EXPLANATION */}

                        <div className="mt-4 flex gap-3 rounded-xl bg-white/5 p-3">
                          <span className="text-[#1bbb8c]">
                            ✓
                          </span>

                          <p className="text-xs leading-5 text-white/50">
                            RCS takes{" "}
                            <strong className="text-white">
                              {RCS_FEE_PERCENT}%
                            </strong>{" "}
                            from your bid. The amount above is what you receive.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* MESSAGE */}

                    <label className="mt-6 block text-sm font-bold">
                      Message to customer
                      <span className="ml-1 text-white/30">
                        (optional)
                      </span>
                    </label>

                    <textarea
                      value={message}
                      onChange={(e) =>
                        setMessage(
                          e.target.value
                        )
                      }
                      rows={5}
                      placeholder="Tell the customer about your service or availability..."
                      className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#07110d] p-4 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-[#1bbb8c]"
                    />

                    {/* SUBMIT */}

                    <button
                      type="submit"
                      disabled={
                        submitting
                      }
                      className="mt-5 w-full rounded-2xl bg-[#1bbb8c] px-6 py-4 font-black text-[#07110d] transition hover:bg-[#5ee0b3] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting
                        ? "Submitting..."
                        : existingBid
                          ? "Update Bid"
                          : "Submit Bid"}
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* JOURNEY */}

            {assignedToThisDriver && (
              <div className="mt-8 border-t border-white/10 pt-7">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1bbb8c]">
                  Job progress
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {isCompleted
                    ? "Job completed"
                    : "Manage job"}
                </h2>

                {!isCompleted && (
                  <button
                    type="button"
                    onClick={
                      startJourney
                    }
                    disabled={
                      journeyLoading ||
                      isOnTheWay
                    }
                    className="mt-5 w-full rounded-2xl border border-[#1bbb8c]/30 bg-[#1bbb8c]/10 px-5 py-4 font-black text-[#5ee0b3] transition hover:bg-[#1bbb8c]/20 disabled:opacity-50"
                  >
                    {journeyLoading
                      ? "Updating..."
                      : isOnTheWay
                        ? "✓ You're on the way"
                        : "I'm on the way"}
                  </button>
                )}

                {/* BEFORE PHOTOS */}

                {!isCompleted && (
                  <>
                    <div className="mt-7">
                      <label className="text-sm font-bold">
                        Before photos
                      </label>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={
                          handleBeforePhotos
                        }
                        className="mt-2 block w-full text-sm text-white/50"
                      />

                      {beforePhotos.length >
                        0 && (
                        <PhotoList
                          files={
                            beforePhotos
                          }
                          onRemove={
                            removeBeforePhoto
                          }
                        />
                      )}
                    </div>

                    {/* AFTER */}

                    <div className="mt-6">
                      <label className="text-sm font-bold">
                        After photos
                      </label>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={
                          handleAfterPhotos
                        }
                        className="mt-2 block w-full text-sm text-white/50"
                      />

                      {afterPhotos.length >
                        0 && (
                        <PhotoList
                          files={
                            afterPhotos
                          }
                          onRemove={
                            removeAfterPhoto
                          }
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={
                        completeJob
                      }
                      disabled={
                        photoUploading
                      }
                      className="mt-6 w-full rounded-2xl bg-[#1bbb8c] px-5 py-4 font-black text-[#07110d] transition hover:bg-[#5ee0b3] disabled:opacity-50"
                    >
                      {photoUploading
                        ? "Completing job..."
                        : "Complete job"}
                    </button>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| MONEY ROW
|--------------------------------------------------------------------------
*/

function MoneyRow({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm font-bold text-white/60">
        {label}
      </p>

      <p
        className={`text-lg font-black ${
          negative
            ? "text-red-300"
            : "text-white"
        }`}
      >
        {negative
          ? `-£${Math.abs(value).toFixed(2)}`
          : `£${value.toFixed(2)}`}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO BLOCK
|--------------------------------------------------------------------------
*/

function InfoBlock({
  title,
  value,
}: {
  title: string;
  value:
    | string
    | null
    | undefined;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/5 bg-[#07110d] p-5">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-white/35">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-white sm:text-base">
        {value ||
          "Not provided"}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| INFO ITEM
|--------------------------------------------------------------------------
*/

function InfoItem({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | null
    | undefined;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#07110d] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white">
        {value ||
          "Not provided"}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PHOTO LIST
|--------------------------------------------------------------------------
*/

function PhotoList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (
    index: number
  ) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      {files.map(
        (file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#07110d] p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-white/30">
                {(
                  file.size /
                  1024 /
                  1024
                ).toFixed(1)}{" "}
                MB
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onRemove(index)
              }
              className="shrink-0 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
            >
              Remove
            </button>
          </div>
        )
      )}
    </div>
  );
}