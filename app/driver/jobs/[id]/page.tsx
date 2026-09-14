"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DriverBottomNav from "@/app/components/driver/DriverBottomNav";

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

const RCS_FEE_PERCENT = 10;
const PHOTO_BUCKET = "job-photos";

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

  const jobId = params?.id as string;

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

  const numericBid = Number(bidAmount) || 0;

  const customerPrice = Math.round(numericBid * 100) / 100;

  const platformFee =
    Math.round(
      customerPrice * (RCS_FEE_PERCENT / 100) * 100,
    ) / 100;

  const finalDriverPayout =
    Math.round(
      Math.max(0, customerPrice - platformFee) * 100,
    ) / 100;

  const assignedToThisDriver =
    job?.assigned_driver_id === driver?.id;

  const bidAccepted =
    existingBid?.status === "accepted" ||
    (job?.accepted_bid_id !== null &&
      job?.accepted_bid_id === existingBid?.id);

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

  const hasBeforePhotos =
    beforePhotos.length > 0;

  const hasAfterPhotos =
    afterPhotos.length > 0;

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  async function loadJob() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/driver/login");
        return;
      }

      const { data: driverData, error: driverError } =
        await supabase
          .from("drivers")
          .select(
            "id, full_name, approved, application_status",
          )
          .eq("id", user.id)
          .single();

      if (driverError) {
        throw new Error(
          "We couldn't load your driver account.",
        );
      }

      setDriver(driverData as Driver);

      const { data: jobData, error: jobError } =
        await supabase
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
            `,
          )
          .eq("id", Number(jobId))
          .single();

      if (jobError) {
        throw new Error(
          "We couldn't load this job.",
        );
      }

      setJob(jobData as Job);

      const { data: bidData } = await supabase
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
          `,
        )
        .eq("job_id", Number(jobId))
        .eq("driver_id", user.id)
        .maybeSingle();

      if (bidData) {
        const bid = bidData as Bid;

        setExistingBid(bid);
        setBidAmount(String(bid.amount));
        setMessage(bid.message || "");
      }
    } catch (error) {
      console.error("Load job error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong loading the job.",
      );
    } finally {
      setLoading(false);
    }
  }

  function validatePhotoFiles(files: File[]) {
    return files
      .filter(
        (file) =>
          file.type.startsWith("image/") &&
          file.size <= 10 * 1024 * 1024,
      )
      .slice(0, 8);
  }

  function handleBeforePhotos(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files || [],
    );

    if (!files.length) return;

    const valid = validatePhotoFiles(files);

    if (!valid.length) {
      setErrorMessage(
        "Please choose valid image files under 10MB each.",
      );
      return;
    }

    setBeforePhotos((current) =>
      [...current, ...valid].slice(0, 8),
    );

    event.target.value = "";
  }

  function handleAfterPhotos(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files || [],
    );

    if (!files.length) return;

    const valid = validatePhotoFiles(files);

    if (!valid.length) {
      setErrorMessage(
        "Please choose valid image files under 10MB each.",
      );
      return;
    }

    setAfterPhotos((current) =>
      [...current, ...valid].slice(0, 8),
    );

    event.target.value = "";
  }

  function removeBeforePhoto(index: number) {
    setBeforePhotos((current) =>
      current.filter((_, i) => i !== index),
    );
  }

  function removeAfterPhoto(index: number) {
    setAfterPhotos((current) =>
      current.filter((_, i) => i !== index),
    );
  }

  async function uploadJobPhotos(
    type: PhotoType,
    files: File[],
  ) {
    if (!job || !driver) {
      throw new Error(
        "Job or driver information is missing.",
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

      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function startJourney() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!job || !driver) {
      setErrorMessage(
        "Job or driver information is missing.",
      );
      return;
    }

    if (!assignedToThisDriver) {
      setErrorMessage(
        "This job is not assigned to you.",
      );
      return;
    }

    if (isCompleted) {
      setErrorMessage(
        "This job has already been completed.",
      );
      return;
    }

    if (isOnTheWay) {
      setSuccessMessage(
        "The customer has already been told you're on the way.",
      );
      return;
    }

    setJourneyLoading(true);

    try {
      const { data: currentJob, error: currentError } =
        await supabase
          .from("jobs")
          .select(
            "id, status, journey_status, assigned_driver_id",
          )
          .eq("id", job.id)
          .single();

      if (currentError) {
        throw currentError;
      }

      if (
        currentJob.assigned_driver_id !== driver.id
      ) {
        setErrorMessage(
          "This job is no longer assigned to you.",
        );

        await loadJob();
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .update({
          journey_status: "on_the_way",
        })
        .eq("id", job.id)
        .eq("assigned_driver_id", driver.id)
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
          `,
        )
        .single();

      if (error) {
        throw error;
      }

      setJob(data as Job);

      setSuccessMessage(
        "Customer notified — you're on the way.",
      );
    } catch (error) {
      console.error("Journey error:", error);

      setErrorMessage(
        "We couldn't update the job. Please try again.",
      );
    } finally {
      setJourneyLoading(false);
    }
  }

  async function completeJob() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!job || !driver) {
      setErrorMessage(
        "Job or driver information is missing.",
      );
      return;
    }

    if (!assignedToThisDriver) {
      setErrorMessage(
        "This job is not assigned to you.",
      );
      return;
    }

    if (!isOnTheWay) {
      setErrorMessage(
        "You must press 'I'm on the way' before completing this job.",
      );
      return;
    }

    if (!hasBeforePhotos) {
      setErrorMessage(
        "Before photos are required before the job can be completed.",
      );

      document
        .getElementById("before-photos")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return;
    }

    if (!hasAfterPhotos) {
      setErrorMessage(
        "After photos are required before the job can be completed.",
      );

      document
        .getElementById("after-photos")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return;
    }

    setPhotoUploading(true);

    try {
      await uploadJobPhotos(
        "before",
        beforePhotos,
      );

      await uploadJobPhotos(
        "after",
        afterPhotos,
      );

      const { data, error } = await supabase
        .from("jobs")
        .update({
          journey_status: "completed",
        })
        .eq("id", job.id)
        .eq("assigned_driver_id", driver.id)
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
          `,
        )
        .single();

      if (error) {
        throw new Error(
          "Photos uploaded, but we couldn't mark the job as completed. Please refresh and try again.",
        );
      }

      setJob(data as Job);
      setBeforePhotos([]);
      setAfterPhotos([]);

      setSuccessMessage(
        "Job completed successfully. Your completion photos have been uploaded.",
      );
    } catch (error) {
      console.error("Complete job error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't complete the job.",
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  async function submitBid(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!job) {
      setErrorMessage("Job not found.");
      return;
    }

    if (!canEditBid) {
      setErrorMessage(
        "Bidding is closed for this job.",
      );
      return;
    }

    const amount = Number(bidAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage(
        "Please enter a valid bid amount.",
      );
      return;
    }

    if (!driver) {
      setErrorMessage(
        "Driver account not found.",
      );
      return;
    }

    setSubmitting(true);

    try {
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
          `,
        )
        .eq("id", job.id)
        .single();

      if (currentJobError) {
        throw new Error(
          "We couldn't verify the current job status.",
        );
      }

      const jobStillOpen =
        currentJob.status === "open" ||
        currentJob.status === "bidding";

      if (!jobStillOpen) {
        setErrorMessage(
          "Bidding is now closed for this job.",
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
          "This job has already been assigned.",
        );

        await loadJob();
        return;
      }

      if (existingBid) {
        if (
          existingBid.status === "accepted" ||
          existingBid.status === "rejected"
        ) {
          setErrorMessage(
            "This bid can no longer be changed.",
          );
          return;
        }

        const { data, error } = await supabase
          .from("bids")
          .update({
            amount,
            message: message.trim() || null,
          })
          .eq("id", existingBid.id)
          .eq("job_id", job.id)
          .eq("driver_id", driver.id)
          .eq("status", "pending")
          .select()
          .single();

        if (error) {
          setErrorMessage(
            "Your bid could not be updated. The job may have just been assigned.",
          );

          await loadJob();
          return;
        }

        setExistingBid(data as Bid);
        setBidAmount(String(data.amount));

        setSuccessMessage(
          "Your bid has been updated.",
        );

        return;
      }

      const { data, error } = await supabase
        .from("bids")
        .insert({
          job_id: job.id,
          driver_id: driver.id,
          amount,
          message: message.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(
          "Your bid could not be submitted. The job may have just been assigned.",
        );

        await loadJob();
        return;
      }

      setExistingBid(data as Bid);
      setBidAmount(String(data.amount));

      setSuccessMessage(
        "Your bid has been submitted.",
      );
    } catch (error) {
      console.error("Bid submission error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't submit your bid.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/driver/login");
  }

  const pageStatus = useMemo(() => {
    if (isCompleted) return "Completed";
    if (assignedToThisDriver) return "Assigned";
    return job?.status || "Open";
  }, [
    isCompleted,
    assignedToThisDriver,
    job?.status,
  ]);

  if (loading) {
    return <Loading />;
  }

  return (
    <main
      className="min-h-screen pb-28 text-white"
      style={{ background: BG }}
    >
      {/* HEADER */}
      <header
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl"
        style={{
          background: "rgba(5,7,5,0.95)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <Link href="/driver/dashboard">
            <img
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              className="h-9 w-auto sm:h-11"
            />
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p
                className="text-[9px] font-black uppercase tracking-[0.18em]"
                style={{ color: GREEN }}
              >
                Driver
              </p>

              <p className="text-sm font-black">
                {driver?.full_name || "Driver"}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black transition hover:bg-white/10 sm:px-4 sm:text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-10">
        <Link
          href="/driver/jobs"
          className="inline-flex text-sm font-black"
          style={{ color: GREEN }}
        >
          ← Back to jobs
        </Link>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/5 p-4">
            <p className="text-sm font-bold text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div
            className="mt-5 rounded-2xl border p-4"
            style={{
              borderColor: `${GREEN}35`,
              background: `${GREEN}0c`,
            }}
          >
            <p
              className="text-sm font-bold"
              style={{ color: GREEN_HOVER }}
            >
              {successMessage}
            </p>
          </div>
        )}

        {job && (
          <>
            {/* JOB HERO */}
            <section
              className="mt-6 overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8"
              style={{
                background: `linear-gradient(135deg, ${CARD} 0%, ${SECTION} 100%)`,
              }}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider"
                      style={{
                        borderColor: `${GREEN}45`,
                        background: `${GREEN}10`,
                        color: GREEN,
                      }}
                    >
                      {pageStatus}
                    </span>

                    <span className="text-xs font-bold text-white/35">
                      {job.reference ||
                        `RC-${String(job.id).padStart(6, "0")}`}
                    </span>
                  </div>

                  <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                    {job.job_type || "Waste Collection"}
                  </h1>

                  <p className="mt-3 text-sm text-white/45">
                    Posted{" "}
                    {new Date(
                      job.created_at,
                    ).toLocaleDateString("en-GB")}
                  </p>
                </div>

                <div
                  className="rounded-2xl border p-4 lg:min-w-[240px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    background: BG,
                  }}
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
                    Your payout
                  </p>

                  <p
                    className="mt-1 text-3xl font-black"
                    style={{ color: GREEN }}
                  >
                    £{finalDriverPayout.toFixed(2)}
                  </p>

                  {numericBid > 0 && (
                    <p className="mt-1 text-xs text-white/35">
                      From £{customerPrice.toFixed(2)} customer price
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* JOURNEY */}
            {assignedToThisDriver && !isCompleted && (
              <section
                className="mt-6 rounded-3xl border p-5 sm:p-7"
                style={{
                  borderColor: `${GREEN}35`,
                  background: `${GREEN}09`,
                }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: GREEN }}
                >
                  Job journey
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {isOnTheWay
                    ? "You're on the way"
                    : "Ready to leave?"}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                  {isOnTheWay
                    ? "The customer has been told you're on the way. Take your before photos when you arrive."
                    : "Tell the customer you're on the way before starting the collection."}
                </p>

                {!isOnTheWay ? (
                  <button
                    type="button"
                    onClick={startJourney}
                    disabled={journeyLoading}
                    className="mt-6 w-full rounded-2xl px-6 py-5 text-base font-black transition disabled:opacity-50 sm:text-lg"
                    style={{
                      background: GREEN,
                      color: BG,
                    }}
                  >
                    {journeyLoading
                      ? "Updating customer..."
                      : "I'm on the way"}
                  </button>
                ) : (
                  <div
                    className="mt-6 rounded-2xl border p-4"
                    style={{
                      borderColor: `${GREEN}30`,
                      background: `${GREEN}0d`,
                    }}
                  >
                    <p
                      className="font-black"
                      style={{ color: GREEN_HOVER }}
                    >
                      Customer notified
                    </p>

                    <p className="mt-1 text-sm text-white/45">
                      You can now complete the photo requirements.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* MAIN */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
              {/* LEFT */}
              <div className="space-y-6">
                {/* DETAILS */}
                <section
                  className="rounded-3xl border border-white/10 p-5 sm:p-7"
                  style={{ background: CARD }}
                >
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{ color: GREEN }}
                  >
                    Collection details
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Job information
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

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                        job.stairs === null
                          ? "Not provided"
                          : job.stairs
                            ? "Yes"
                            : "No"
                      }
                    />

                    <InfoItem
                      label="Collection date"
                      value={
                        job.preferred_date
                          ? formatDate(job.preferred_date)
                          : "Not provided"
                      }
                    />

                    <InfoItem
                      label="Preferred time"
                      value={
                        job.preferred_time ||
                        "Not provided"
                      }
                    />

                    <InfoItem
                      label="Access"
                      value={
                        job.access_notes ||
                        "Not provided"
                      }
                    />
                  </div>
                </section>

                {/* PHOTOS */}
                {assignedToThisDriver && !isCompleted && (
                  <section
                    className="rounded-3xl border border-white/10 p-5 sm:p-7"
                    style={{ background: CARD }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.18em]"
                      style={{ color: GREEN }}
                    >
                      Completion evidence
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Before & after photos
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-white/45">
                      Both before and after photos are required before
                      the job can be completed.
                    </p>

                    <PhotoUpload
                      id="before-photos"
                      title="Before photos"
                      description="Photograph the waste before removal."
                      files={beforePhotos}
                      required
                      onChange={handleBeforePhotos}
                      onRemove={removeBeforePhoto}
                    />

                    <PhotoUpload
                      id="after-photos"
                      title="After photos"
                      description="Photograph the area after the waste has gone."
                      files={afterPhotos}
                      required
                      onChange={handleAfterPhotos}
                      onRemove={removeAfterPhoto}
                    />
                  </section>
                )}

                {/* COMPLETE */}
                {assignedToThisDriver && !isCompleted && (
                  <section
                    className="rounded-3xl border p-5 sm:p-7"
                    style={{
                      borderColor: `${GREEN}35`,
                      background: `${GREEN}08`,
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.18em]"
                      style={{ color: GREEN }}
                    >
                      Final step
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Complete collection
                    </h2>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Requirement
                        complete={isOnTheWay}
                        label="I'm on the way"
                      />

                      <Requirement
                        complete={hasBeforePhotos}
                        label="Before photos"
                      />

                      <Requirement
                        complete={hasAfterPhotos}
                        label="After photos"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={completeJob}
                      disabled={photoUploading}
                      className="mt-6 w-full rounded-2xl px-6 py-5 text-base font-black transition disabled:opacity-50 sm:text-lg"
                      style={{
                        background: GREEN,
                        color: BG,
                      }}
                    >
                      {photoUploading
                        ? "Uploading photos & completing..."
                        : "Complete job"}
                    </button>
                  </section>
                )}

                {/* COMPLETED */}
                {isCompleted && (
                  <section
                    className="rounded-3xl border p-6"
                    style={{
                      borderColor: `${GREEN}35`,
                      background: `${GREEN}09`,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black"
                        style={{
                          background: GREEN,
                          color: BG,
                        }}
                      >
                        ✓
                      </div>

                      <div>
                        <p
                          className="text-[10px] font-black uppercase tracking-[0.16em]"
                          style={{ color: GREEN }}
                        >
                          Completed
                        </p>

                        <h2 className="mt-1 text-xl font-black">
                          Job completed successfully
                        </h2>

                        <p className="mt-1 text-sm text-white/45">
                          The collection has been marked as completed.
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* RIGHT */}
              <aside>
                <div
                  className="rounded-3xl border border-white/10 p-5 sm:p-6 lg:sticky lg:top-24"
                  style={{ background: CARD }}
                >
                  {/* EXISTING BID */}
                  {existingBid && (
                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: bidAccepted
                          ? `${GREEN}35`
                          : existingBid.status === "rejected"
                            ? "rgba(248,113,113,0.2)"
                            : "rgba(255,255,255,0.08)",
                        background: bidAccepted
                          ? `${GREEN}0c`
                          : existingBid.status === "rejected"
                            ? "rgba(239,68,68,0.05)"
                            : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                        Your bid
                      </p>

                      <p className="mt-1 text-3xl font-black">
                        £{Number(existingBid.amount).toFixed(2)}
                      </p>

                      <p
                        className="mt-1 text-sm font-bold"
                        style={{
                          color: bidAccepted
                            ? GREEN_HOVER
                            : existingBid.status === "rejected"
                              ? "#fca5a5"
                              : "rgba(255,255,255,0.45)",
                        }}
                      >
                        {bidAccepted
                          ? "Accepted"
                          : existingBid.status === "rejected"
                            ? "Rejected"
                            : "Pending"}
                      </p>
                    </div>
                  )}

                  {/* BID BREAKDOWN */}
                  {canEditBid && (
                    <div
                      className="mt-5 rounded-2xl border p-4"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                        background: BG,
                      }}
                    >
                      <p
                        className="text-[9px] font-black uppercase tracking-[0.16em]"
                        style={{ color: GREEN }}
                      >
                        Bid breakdown
                      </p>

                      <MoneyRow
                        label="Customer pays"
                        value={customerPrice}
                      />

                      <MoneyRow
                        label={`RCS fee (${RCS_FEE_PERCENT}%)`}
                        value={-platformFee}
                        negative
                      />

                      <div className="my-4 border-t border-white/10" />

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wide text-white/35">
                            You receive
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            After RCS commission
                          </p>
                        </div>

                        <p
                          className="text-2xl font-black"
                          style={{ color: GREEN }}
                        >
                          £{finalDriverPayout.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* BID FORM */}
                  {canEditBid ? (
                    <div className="mt-6">
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.18em]"
                        style={{ color: GREEN }}
                      >
                        Marketplace
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        {existingBid
                          ? "Update your bid"
                          : "Place your bid"}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-white/45">
                        Enter the price you would charge to complete
                        this collection.
                      </p>

                      <form
                        onSubmit={submitBid}
                        className="mt-6"
                      >
                        <label className="text-sm font-black">
                          Your price
                          <span className="ml-2 text-white/30">
                            Customer pays
                          </span>
                        </label>

                        <div
                          className="mt-2 flex items-center overflow-hidden rounded-2xl border"
                          style={{
                            borderColor:
                              "rgba(255,255,255,0.1)",
                            background: BG,
                          }}
                        >
                          <span
                            className="pl-5 text-2xl font-black"
                            style={{ color: GREEN }}
                          >
                            £
                          </span>

                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={bidAmount}
                            onChange={(event) =>
                              setBidAmount(
                                event.target.value,
                              )
                            }
                            placeholder="0.00"
                            className="w-full bg-transparent px-3 py-4 text-2xl font-black text-white outline-none placeholder:text-white/15"
                          />
                        </div>

                        <label className="mt-6 block text-sm font-black">
                          Message to customer
                          <span className="ml-2 text-white/30">
                            optional
                          </span>
                        </label>

                        <textarea
                          value={message}
                          onChange={(event) =>
                            setMessage(
                              event.target.value,
                            )
                          }
                          rows={5}
                          placeholder="Tell the customer about your service or availability..."
                          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-transparent p-4 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-[#79c51c]"
                        />

                        <button
                          type="submit"
                          disabled={submitting}
                          className="mt-5 w-full rounded-2xl px-6 py-4 font-black transition disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            background: GREEN,
                            color: BG,
                          }}
                        >
                          {submitting
                            ? "Submitting..."
                            : existingBid
                              ? "Update bid"
                              : "Submit bid"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl"
                        style={{
                          background:
                            "rgba(255,255,255,0.06)",
                        }}
                      >
                        🔒
                      </div>

                      <h2 className="mt-5 text-2xl font-black">
                        Bidding closed
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-white/45">
                        This job has been assigned, so bids can no
                        longer be submitted or changed.
                      </p>

                      {bidAccepted &&
                        assignedToThisDriver && (
                          <div
                            className="mt-5 rounded-2xl border p-4"
                            style={{
                              borderColor: `${GREEN}30`,
                              background: `${GREEN}0c`,
                            }}
                          >
                            <p
                              className="font-black"
                              style={{ color: GREEN_HOVER }}
                            >
                              Your bid was accepted.
                            </p>

                            <p className="mt-1 text-sm text-white/45">
                              This job is now yours.
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* SUPPORT */}
                  <a
                    href="https://wa.me/447555980651?text=Hi%20RCS%20I%20need%20help%20with%20a%20job"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 block rounded-2xl border border-white/10 p-4 text-center transition hover:border-white/20"
                  >
                    <p
                      className="text-[9px] font-black uppercase tracking-[0.16em]"
                      style={{ color: GREEN }}
                    >
                      Need help?
                    </p>

                    <p className="mt-1 text-sm font-black">
                      Contact RCS Support
                    </p>
                  </a>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      <DriverBottomNav />
    </main>
  );
}

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
      <p className="text-sm font-bold text-white/55">
        {label}
      </p>

      <span
        className="shrink-0 text-lg font-black"
        style={{
          color: negative
            ? "#fca5a5"
            : "white",
        }}
      >
        {value < 0
          ? `-£${Math.abs(value).toFixed(2)}`
          : `£${value.toFixed(2)}`}
      </span>
    </div>
  );
}

function InfoBlock({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  return (
    <div
      className="mt-5 rounded-2xl border border-white/5 p-5"
      style={{ background: BG }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/80 sm:text-base">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div
      className="rounded-2xl border border-white/5 p-4"
      style={{ background: BG }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-white/80">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function Requirement({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: complete
          ? `${GREEN}35`
          : "rgba(255,255,255,0.08)",
        background: complete
          ? `${GREEN}0c`
          : BG,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black"
          style={{
            background: complete
              ? GREEN
              : "rgba(255,255,255,0.08)",
            color: complete
              ? BG
              : "rgba(255,255,255,0.3)",
          }}
        >
          {complete ? "✓" : "•"}
        </div>

        <p
          className="text-sm font-bold"
          style={{
            color: complete
              ? GREEN_HOVER
              : "rgba(255,255,255,0.45)",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function PhotoUpload({
  id,
  title,
  description,
  files,
  required,
  onChange,
  onRemove,
}: {
  id: string;
  title: string;
  description: string;
  files: File[];
  required?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}) {
  const ready = files.length > 0;

  return (
    <div id={id} className="mt-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-black">{title}</p>

          <p className="mt-1 text-sm text-white/40">
            {description}
          </p>
        </div>

        <span
          className="rounded-full px-3 py-1 text-[9px] font-black uppercase"
          style={{
            background: ready
              ? `${GREEN}12`
              : "rgba(255,255,255,0.05)",
            color: ready
              ? GREEN
              : "rgba(255,255,255,0.35)",
          }}
        >
          {ready
            ? `${files.length} ready`
            : required
              ? "Required"
              : "Optional"}
        </span>
      </div>

      <label
        className="mt-4 flex min-h-[145px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          background: BG,
        }}
      >
        <span className="text-base font-black">
          Add {title.toLowerCase()}
        </span>

        <span className="mt-2 text-xs text-white/35">
          Images up to 10MB each
        </span>

        <span
          className="mt-4 rounded-xl px-5 py-3 text-xs font-black"
          style={{
            background: GREEN,
            color: BG,
          }}
        >
          Choose photos
        </span>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onChange}
          className="hidden"
        />
      </label>

      {files.length > 0 && (
        <PhotoList
          photos={files}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}

function PhotoList({
  photos,
  onRemove,
}: {
  photos: File[];
  onRemove: (index: number) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((photo, index) => (
        <div
          key={`${photo.name}-${index}`}
          className="rounded-2xl border border-white/10 p-3"
          style={{ background: BG }}
        >
          <p className="truncate text-xs font-semibold text-white/60">
            {photo.name}
          </p>

          <p className="mt-1 text-[10px] text-white/30">
            {(photo.size / 1024 / 1024).toFixed(1)} MB
          </p>

          <button
            type="button"
            onClick={() => onRemove(index)}
            className="mt-3 rounded-lg border border-red-400/20 px-3 py-1.5 text-[10px] font-black text-red-300"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center text-white"
      style={{ background: BG }}
    >
      <div className="text-center">
        <div
          className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10"
          style={{
            borderTopColor: GREEN,
          }}
        />

        <p className="mt-5 font-black">
          Loading job...
        </p>

        <p className="mt-1 text-xs text-white/35">
          Getting the latest job information
        </p>
      </div>
    </main>
  );
}

function formatDate(date: string) {
  try {
    return new Date(
      `${date}T00:00:00`,
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