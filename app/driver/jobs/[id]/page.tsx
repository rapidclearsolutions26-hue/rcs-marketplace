"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const hasValidJobId =
    !!jobId &&
    jobId !== "undefined" &&
    /^\d+$/.test(jobId);

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
  | LIVE MONEY
  |--------------------------------------------------------------------------
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

  const driverPayout =
    Math.round(
      Math.max(
        0,
        customerPrice - platformFee
      ) * 100
    ) / 100;

  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!hasValidJobId) {
      setLoading(false);
      setErrorMessage("No valid job was found.");
      return;
    }

    loadJob();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function loadJob() {
    if (!hasValidJobId) return;

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
      | AUTH
      */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (authError) {
          console.error(authError);
        }

        router.push("/driver/login");
        return;
      }

      /*
      | DRIVER
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
      | JOB
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
      | BID
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
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
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
  | DATE
  |--------------------------------------------------------------------------
  */

  const formattedDate = useMemo(() => {
    if (!job?.preferred_date) {
      return "Flexible";
    }

    return new Date(
      job.preferred_date
    ).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [job?.preferred_date]);

  /*
  |--------------------------------------------------------------------------
  | PHOTOS
  |--------------------------------------------------------------------------
  */

  function validatePhotoFiles(files: File[]) {
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

    const validFiles =
      validatePhotoFiles(files);

    if (!validFiles.length) {
      setErrorMessage(
        "Please choose image files under 10MB."
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

    const validFiles =
      validatePhotoFiles(files);

    if (!validFiles.length) {
      setErrorMessage(
        "Please choose image files under 10MB."
      );
      return;
    }

    setAfterPhotos((current) =>
      [...current, ...validFiles].slice(0, 8)
    );

    event.target.value = "";
  }

  function removeBeforePhoto(index: number) {
    setBeforePhotos((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  function removeAfterPhoto(index: number) {
    setAfterPhotos((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UPLOAD
  |--------------------------------------------------------------------------
  */

  async function uploadJobPhotos(
    type: PhotoType,
    files: File[]
  ) {
    if (!job || !driver) {
      throw new Error(
        "Job information is missing."
      );
    }

    const uploadedPaths: string[] = [];

    for (const file of files) {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const path =
        `${job.id}/${type}/${crypto.randomUUID()}.${extension}`;

      const { error } =
        await supabase.storage
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

    if (!job || !driver) return;

    if (!assignedToThisDriver) {
      setErrorMessage(
        "This job is not assigned to you."
      );
      return;
    }

    if (isCompleted) return;

    if (isOnTheWay) return;

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
        throw error;
      }

      setJob(data as Job);

      setSuccessMessage(
        "You're on the way. The customer has been updated."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "We couldn't update the journey status."
      );
    } finally {
      setJourneyLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | COMPLETE
  |--------------------------------------------------------------------------
  */

  async function completeJob() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!job || !driver) return;

    if (!assignedToThisDriver) {
      setErrorMessage(
        "This job is not assigned to you."
      );
      return;
    }

    if (!beforePhotos.length) {
      setErrorMessage(
        "Add at least one before photo."
      );
      return;
    }

    if (!afterPhotos.length) {
      setErrorMessage(
        "Add at least one after photo."
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
        throw new Error(
          "Photos uploaded, but the job could not be completed."
        );
      }

      setJob(data as Job);
      setSuccessMessage(
        "Job completed successfully."
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
  | BID
  |--------------------------------------------------------------------------
  */

  async function submitBid(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!job || !driver) return;

    if (!canEditBid) {
      setErrorMessage(
        "Bidding is closed for this job."
      );
      return;
    }

    const amount = Number(bidAmount);

    if (!amount || amount <= 0) {
      setErrorMessage(
        "Enter a valid price."
      );
      return;
    }

    setSubmitting(true);

    try {
      /*
      | VERIFY JOB
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
        throw currentJobError;
      }

      const jobStillOpen =
        currentJob.status === "open" ||
        currentJob.status === "bidding";

      if (!jobStillOpen) {
        setErrorMessage(
          "Bidding has closed for this job."
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
      | UPDATE
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
              message.trim() || null,
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
          throw error;
        }

        setExistingBid(data as Bid);

        setSuccessMessage(
          `Bid updated. You'll receive £${(
            amount * 0.9
          ).toFixed(2)}.`
        );

        return;
      }

      /*
      | CREATE
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
            message.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setExistingBid(data as Bid);

      setSuccessMessage(
        `Bid submitted. You'll receive £${(
          amount * 0.9
        ).toFixed(2)}.`
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "We couldn't submit your bid. The job may have just been assigned."
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
      <main className="flex min-h-screen items-center justify-center bg-[#07100a] px-5 text-white">
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
  | NO JOB
  |--------------------------------------------------------------------------
  */

  if (!job) {
    return (
      <main className="min-h-screen bg-[#07100a] px-5 py-10 text-white">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/driver/dashboard"
            className="font-bold text-[#1bbb8c]"
          >
            ← Dashboard
          </Link>

          <div className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-2xl font-black">
              Job unavailable
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

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#07100a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/driver/dashboard"
            className="text-sm font-black text-[#1bbb8c]"
          >
            ← Dashboard
          </Link>

          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
              Driver
            </p>

            <p className="text-sm font-bold">
              {driver?.full_name ||
                "Driver"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* JOB HEADER */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1a12]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#1bbb8c]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#1bbb8c]">
                {job.status === "bidding"
                  ? "Open for bids"
                  : job.status || "Open"}
              </span>

              <span className="text-xs font-bold text-white/30">
                {job.reference ||
                  `RC-${job.id}`}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {job.job_type ||
                "Waste removal"}
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Job posted{" "}
              {new Date(
                job.created_at
              ).toLocaleDateString(
                "en-GB"
              )}
            </p>
          </div>

          {/* QUICK INFO */}

          <div className="grid border-t border-white/5 sm:grid-cols-3">
            <QuickInfo
              icon="📍"
              label="Location"
              value={
                job.postcode ||
                "Not provided"
              }
            />

            <QuickInfo
              icon="📅"
              label="Date"
              value={formattedDate}
            />

            <QuickInfo
              icon="🕐"
              label="Time"
              value={
                job.preferred_time ||
                "Flexible"
              }
            />
          </div>
        </section>

        {/* MESSAGES */}

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
            <p className="text-sm font-bold text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-[#1bbb8c]/20 bg-[#1bbb8c]/10 px-5 py-4">
            <p className="text-sm font-bold text-[#5ee0b3]">
              ✓ {successMessage}
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ==========================================================
              LEFT
          ========================================================== */}

          <div className="space-y-6">
            {/* LOCATION */}

            <section className="rounded-3xl border border-white/10 bg-[#0b1a12] p-6 sm:p-7">
              <SectionHeading
                eyebrow="Where"
                title="Collection location"
              />

              <div className="mt-5 rounded-2xl bg-[#07110d] p-5">
                <p className="text-base font-black sm:text-lg">
                  {job.address ||
                    "Address not provided"}
                </p>

                {job.postcode && (
                  <p className="mt-1 text-sm font-bold text-[#1bbb8c]">
                    {job.postcode}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (job.address) {
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${job.address} ${job.postcode || ""}`
                        )}`,
                        "_blank"
                      );
                    }
                  }}
                  className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Open in Maps →
                </button>
              </div>
            </section>

            {/* JOB DETAILS */}

            <section className="rounded-3xl border border-white/10 bg-[#0b1a12] p-6 sm:p-7">
              <SectionHeading
                eyebrow="Details"
                title="What needs collecting"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Load size"
                  value={job.load_size}
                />

                <DetailCard
                  label="Floor"
                  value={job.floor}
                />

                <DetailCard
                  label="Stairs"
                  value={
                    job.stairs
                      ? "Yes"
                      : "No"
                  }
                />

                <DetailCard
                  label="Access"
                  value={
                    job.access_notes
                  }
                />
              </div>

              {job.description && (
                <div className="mt-4 rounded-2xl bg-[#07110d] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">
                    Description
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">
                    {job.description}
                  </p>
                </div>
              )}
            </section>

            {/* JOB PROGRESS */}

            {assignedToThisDriver && (
              <section className="rounded-3xl border border-white/10 bg-[#0b1a12] p-6 sm:p-7">
                <SectionHeading
                  eyebrow="Your job"
                  title={
                    isCompleted
                      ? "Completed"
                      : "Job progress"
                  }
                />

                {/* PROGRESS */}

                <div className="mt-6 flex items-center">
                  <ProgressStep
                    number="1"
                    label="Assigned"
                    active
                    complete
                  />

                  <ProgressLine
                    active={
                      isOnTheWay
                    }
                  />

                  <ProgressStep
                    number="2"
                    label="On the way"
                    active={
                      isOnTheWay
                    }
                    complete={
                      isOnTheWay
                    }
                  />

                  <ProgressLine
                    active={
                      isCompleted
                    }
                  />

                  <ProgressStep
                    number="3"
                    label="Complete"
                    active={
                      isCompleted
                    }
                    complete={
                      isCompleted
                    }
                  />
                </div>

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
                    className="mt-7 w-full rounded-2xl bg-[#1bbb8c] px-5 py-4 font-black text-[#07110d] transition hover:bg-[#5ee0b3] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {journeyLoading
                      ? "Updating..."
                      : isOnTheWay
                        ? "✓ You're on the way"
                        : "I'm on the way"}
                  </button>
                )}

                {/* PHOTOS */}

                {!isCompleted && (
                  <div className="mt-8 border-t border-white/5 pt-7">
                    <p className="text-sm font-black">
                      Completion photos
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/40">
                      Add photos before and after the collection.
                    </p>

                    <PhotoUpload
                      title="Before photos"
                      description="Show the waste before starting."
                      files={beforePhotos}
                      onChange={
                        handleBeforePhotos
                      }
                      onRemove={
                        removeBeforePhoto
                      }
                    />

                    <PhotoUpload
                      title="After photos"
                      description="Show the cleared area."
                      files={afterPhotos}
                      onChange={
                        handleAfterPhotos
                      }
                      onRemove={
                        removeAfterPhoto
                      }
                    />

                    <button
                      type="button"
                      onClick={
                        completeJob
                      }
                      disabled={
                        photoUploading
                      }
                      className="mt-5 w-full rounded-2xl bg-[#1bbb8c] px-5 py-4 font-black text-[#07110d] transition hover:bg-[#5ee0b3] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {photoUploading
                        ? "Completing..."
                        : "Complete job"}
                    </button>
                  </div>
                )}

                {isCompleted && (
                  <div className="mt-7 rounded-2xl border border-[#1bbb8c]/20 bg-[#1bbb8c]/10 p-5">
                    <p className="font-black text-[#5ee0b3]">
                      ✓ Collection completed
                    </p>

                    <p className="mt-1 text-sm text-white/40">
                      This job has been marked as complete.
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* ==========================================================
              RIGHT
          ========================================================== */}

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            {/* ACCEPTED */}

            {bidAccepted &&
              assignedToThisDriver && (
                <div className="rounded-3xl border border-[#1bbb8c]/30 bg-[#10251b] p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1bbb8c]/15 text-xl">
                    ✓
                  </div>

                  <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-[#1bbb8c]">
                    Job accepted
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    This job is yours
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/50">
                    The customer accepted your bid.
                    You can now manage the collection below.
                  </p>

                  <div className="mt-6 rounded-2xl bg-[#07110d] p-5">
                    <p className="text-xs font-bold text-white/40">
                      Your payout
                    </p>

                    <p className="mt-1 text-3xl font-black text-[#5ee0b3]">
                      £
                      {(
                        existingBid?.amount
                          ? existingBid.amount *
                            0.9
                          : 0
                      ).toFixed(2)}
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      After {RCS_FEE_PERCENT}% RCS commission
                    </p>
                  </div>
                </div>
              )}

            {/* BID */}

            {canEditBid && (
              <section className="rounded-3xl border border-white/10 bg-[#0b1a12] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1bbb8c]">
                  Marketplace
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {existingBid
                    ? "Your bid"
                    : "Place a bid"}
                </h2>

                <p className="mt-2 text-sm leading-5 text-white/40">
                  Enter the total price the customer will pay.
                </p>

                <form
                  onSubmit={
                    submitBid
                  }
                  className="mt-6"
                >
                  <label className="text-sm font-black">
                    Customer price
                  </label>

                  <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-[#07110d] focus-within:border-[#1bbb8c]">
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
                      className="w-full bg-transparent px-3 py-4 text-2xl font-black outline-none placeholder:text-white/20"
                    />
                  </div>

                  {/* PAYOUT */}

                  <div className="mt-4 rounded-2xl bg-[#07110d] p-5">
                    <div className="flex justify-between">
                      <span className="text-sm text-white/40">
                        Customer pays
                      </span>

                      <span className="font-black">
                        £
                        {customerPrice.toFixed(
                          2
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between">
                      <span className="text-sm text-white/40">
                        RCS fee ({RCS_FEE_PERCENT}%)
                      </span>

                      <span className="font-black text-red-300">
                        -£
                        {platformFee.toFixed(
                          2
                        )}
                      </span>
                    </div>

                    <div className="my-4 border-t border-white/10" />

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#1bbb8c]">
                          You receive
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          After RCS fee
                        </p>
                      </div>

                      <p className="text-3xl font-black text-[#5ee0b3]">
                        £
                        {driverPayout.toFixed(
                          2
                        )}
                      </p>
                    </div>
                  </div>

                  {/* MESSAGE */}

                  <label className="mt-6 block text-sm font-black">
                    Message
                    <span className="ml-1 font-normal text-white/30">
                      optional
                    </span>
                  </label>

                  <textarea
                    value={message}
                    onChange={(e) =>
                      setMessage(
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder="Tell the customer anything useful..."
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#07110d] p-4 text-sm leading-6 outline-none placeholder:text-white/20 focus:border-[#1bbb8c]"
                  />

                  <button
                    type="submit"
                    disabled={
                      submitting
                    }
                    className="mt-4 w-full rounded-2xl bg-[#1bbb8c] px-5 py-4 font-black text-[#07110d] transition hover:bg-[#5ee0b3] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Submitting..."
                      : existingBid
                        ? "Update bid"
                        : "Submit bid"}
                  </button>
                </form>
              </section>
            )}

            {/* BID STATUS */}

            {existingBid &&
              !bidAccepted &&
              !canEditBid && (
                <section className="rounded-3xl border border-white/10 bg-[#0b1a12] p-6">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
                    Your bid
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    £
                    {existingBid.amount.toFixed(
                      2
                    )}
                  </p>

                  <p className="mt-1 text-sm font-bold text-white/40">
                    {existingBid.status ===
                    "rejected"
                      ? "Rejected"
                      : "Pending"}
                  </p>
                </section>
              )}

            {/* CLOSED */}

            {!canEditBid &&
              !assignedToThisDriver &&
              !existingBid && (
                <section className="rounded-3xl border border-white/10 bg-[#0b1a12] p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5">
                    🔒
                  </div>

                  <h2 className="mt-5 text-xl font-black">
                    Bidding closed
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    This job is no longer accepting bids.
                  </p>
                </section>
              )}
          </aside>
        </div>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| COMPONENTS
|--------------------------------------------------------------------------
*/

function QuickInfo({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-white/5 p-5 sm:border-r last:border-r-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-white/30">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-bold text-white">
          {value || "Not provided"}
        </p>
      </div>
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
    <>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1bbb8c]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-black">
        {title}
      </h2>
    </>
  );
}

function DetailCard({
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
    <div className="rounded-2xl bg-[#07110d] p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-white/30">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function ProgressStep({
  number,
  label,
  active,
  complete,
}: {
  number: string;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
          complete
            ? "bg-[#1bbb8c] text-[#07110d]"
            : active
              ? "border border-[#1bbb8c] text-[#1bbb8c]"
              : "bg-white/5 text-white/30"
        }`}
      >
        {complete
          ? "✓"
          : number}
      </div>

      <p
        className={`mt-2 text-[9px] font-black uppercase tracking-wider ${
          active
            ? "text-white"
            : "text-white/25"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function ProgressLine({
  active,
}: {
  active: boolean;
}) {
  return (
    <div
      className={`mx-2 mb-5 h-px flex-1 ${
        active
          ? "bg-[#1bbb8c]"
          : "bg-white/10"
      }`}
    />
  );
}

function PhotoUpload({
  title,
  description,
  files,
  onChange,
  onRemove,
}: {
  title: string;
  description: string;
  files: File[];
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onRemove: (
    index: number
  ) => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-white/5 bg-[#07110d] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black">
            {title}
          </p>

          <p className="mt-1 text-xs text-white/30">
            {description}
          </p>
        </div>

        <span className="rounded-lg bg-white/5 px-2 py-1 text-[9px] font-black text-white/30">
          {files.length}/8
        </span>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm font-bold text-white/50 transition hover:border-[#1bbb8c]/40 hover:text-[#1bbb8c]">
        + Add photos

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onChange}
          className="hidden"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map(
            (file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3"
              >
                <p className="min-w-0 truncate text-xs font-bold text-white/70">
                  {file.name}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    onRemove(index)
                  }
                  className="shrink-0 text-xs font-bold text-red-300"
                >
                  Remove
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}