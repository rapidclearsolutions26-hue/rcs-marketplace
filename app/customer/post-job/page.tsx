"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CustomerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

const wasteTypes = [
  "House clearance",
  "Garden waste",
  "General rubbish",
  "Furniture",
  "Builders waste",
  "Scrap",
  "Shed / garage clearance",
  "Other",
];

const loadSizes = [
  "Small",
  "Medium",
  "Large",
  "Full van",
  "Not sure",
];

const locations = [
  "Inside the property",
  "Outside",
  "Garage",
  "Shed",
  "Garden",
  "Upstairs",
  "Multiple areas",
];

export default function PostJobPage() {
  const supabase = createClient();
  const router = useRouter();

  const [customer, setCustomer] =
    useState<CustomerProfile | null>(null);

  const [userLoading, setUserLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [wasteType, setWasteType] = useState("");
  const [loadSize, setLoadSize] = useState("");
  const [location, setLocation] = useState("");

  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");

  const [collectionDate, setCollectionDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const [description, setDescription] = useState("");
  const [accessNotes, setAccessNotes] = useState("");

  const [photos, setPhotos] = useState<File[]>([]);

  const today = useMemo(() => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    loadCustomer();
  }, []);

  async function loadCustomer() {
    setUserLoading(true);
    setErrorMessage("");

    try {
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
        router.replace("/customer/login");
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn(
          "Profile lookup warning:",
          profileError
        );
      }

      setCustomer({
        id: user.id,
        full_name:
          profileData?.full_name ??
          user.user_metadata?.full_name ??
          null,
        email:
          profileData?.email ??
          user.email ??
          null,
        phone:
          profileData?.phone ??
          user.user_metadata?.phone ??
          null,
      });
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Something went wrong while loading your account."
      );
    } finally {
      setUserLoading(false);
    }
  }

  function handlePhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    if (!selectedFiles.length) return;

    const validFiles = selectedFiles.filter((file) => {
      return (
        file.type.startsWith("image/") &&
        file.size <= 10 * 1024 * 1024
      );
    });

    if (validFiles.length !== selectedFiles.length) {
      setErrorMessage(
        "Only image files under 10MB can be uploaded."
      );
    }

    setPhotos((current) =>
      [...current, ...validFiles].slice(0, 8)
    );

    event.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function validateForm() {
    if (!wasteType) {
      return "Please choose what needs removing.";
    }

    if (!postcode.trim()) {
      return "Please enter the collection postcode.";
    }

    if (!address.trim()) {
      return "Please enter the collection address.";
    }

    if (!collectionDate) {
      return "Please choose a collection date.";
    }

    if (collectionDate < today) {
      return "Please choose today or a future collection date.";
    }

    if (!loadSize) {
      return "Please tell us roughly how much waste there is.";
    }

    if (!location) {
      return "Please tell us where the waste is located.";
    }

    if (!description.trim()) {
      return "Please describe what needs removing.";
    }

    return "";
  }

  function generateReference() {
    const randomPart = Math.floor(
      100000 + Math.random() * 900000
    );

    return `RC-${randomPart}`;
  }

  async function uploadPhotos(
    jobId: number,
    customerId: string
  ) {
    if (!photos.length) {
      return [];
    }

    const uploadedPaths: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath =
        `${customerId}/${jobId}/${Date.now()}-${i}.${extension}`;

      const { error } = await supabase.storage
        .from("enquiry-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error(
          "Photo upload error:",
          error
        );

        continue;
      }

      uploadedPaths.push(filePath);
    }

    return uploadedPaths;
  }

  async function submitJob(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/customer/login");
        return;
      }

      const customerId =
        customer?.id || user.id;

      const accessInformation = [
        location
          ? `Waste location: ${location}`
          : null,

        accessNotes.trim()
          ? `Access notes: ${accessNotes.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const reference = generateReference();

      /*
       * IMPORTANT
       *
       * A newly posted job is ALWAYS:
       *
       * status = open
       * accepted_bid_id = null
       * assigned_driver_id = null
       * assigned_bid_id = null
       * journey_status = null
       *
       * Nothing here assigns a driver.
       */

      const { data: jobData, error: jobError } =
        await supabase
          .from("jobs")
          .insert({
            reference,

            customer_id: customerId,

            job_type: wasteType,

            postcode: postcode
              .trim()
              .toUpperCase(),

            address: address.trim(),

            load_size: loadSize,

            description: description.trim(),

            floor: null,

            stairs: false,

            access_notes:
              accessInformation || null,

            preferred_date: collectionDate,

            preferred_time:
              preferredTime || null,

            status: "open",

            accepted_bid_id: null,

            assigned_driver_id: null,

            assigned_bid_id: null,

            /*
             * CRITICAL:
             * Do NOT use "assigned" here.
             *
             * A driver has not been selected.
             */
            journey_status: null,
          })
          .select(
            `
            id,
            reference,
            customer_id,
            status,
            journey_status,
            accepted_bid_id,
            assigned_driver_id,
            assigned_bid_id
          `
          )
          .single();

      if (jobError) {
        console.error(
          "JOB INSERT ERROR:",
          jobError
        );

        throw new Error(
          jobError.message ||
            "We couldn't post your job."
        );
      }

      console.log(
        "JOB CREATED:",
        jobData
      );

      if (jobData && photos.length > 0) {
        await uploadPhotos(
          jobData.id,
          customerId
        );
      }

      setSuccessMessage(
        `Job ${jobData.reference} has been posted successfully.`
      );

      setTimeout(() => {
        router.push(
          `/customer/jobs/${jobData.id}`
        );
      }, 1000);
    } catch (error) {
      console.error(
        "POST JOB ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while posting your job."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setLoading(false);
    }
  }

  if (userLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07100b] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#29483a] border-t-[#529027]" />

          <p className="mt-4 font-semibold text-[#aeb9af]">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07100b] text-white">

      <header className="border-b border-white/10 bg-[#07100b]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">

          <Link href="/customer/dashboard">
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={170}
              height={65}
              className="h-12 w-auto object-contain"
            />
          </Link>

          <Link
            href="/customer/dashboard"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/5"
          >
            ← Dashboard
          </Link>

        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">

        <div className="max-w-3xl">

          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#71b33d]">
            RCS Marketplace
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Tell us what needs removing.
          </h1>

          <p className="mt-4 text-base leading-7 text-[#aeb9af] sm:text-lg">
            Post your job and let approved RCS
            drivers compete to complete your
            collection.
          </p>

        </div>

        {errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
            <p className="font-bold text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="mt-8 rounded-2xl border border-[#529027]/40 bg-[#529027]/10 p-5">
            <p className="font-bold text-[#9bd76c]">
              ✓ {successMessage}
            </p>

            <p className="mt-1 text-sm text-[#aeb9af]">
              Your job is now waiting for driver bids.
            </p>
          </div>
        )}

        <form
          onSubmit={submitJob}
          className="mt-8 space-y-6"
        >

          {/* STEP 01 */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">
              <StepNumber number="01" />

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  What needs removing?
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Choose the option that best describes your job.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

              {wasteTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWasteType(type)}
                  className={`min-h-[58px] rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                    wasteType === type
                      ? "border-[#529027] bg-[#529027] text-white"
                      : "border-white/10 bg-[#07100b] text-[#d7ded8] hover:border-[#529027]/60"
                  }`}
                >
                  {type}
                </button>
              ))}

            </div>
          </section>

          {/* STEP 02 */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">
              <StepNumber number="02" />

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  Where are we collecting from?
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Give the driver everything they need to find you.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Field label="Postcode" required>
                <input
                  value={postcode}
                  onChange={(e) =>
                    setPostcode(e.target.value)
                  }
                  placeholder="e.g. B1 1AA"
                  className={inputClass}
                  autoComplete="postal-code"
                />
              </Field>

              <Field label="Collection address" required>
                <input
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  placeholder="House number and street"
                  className={inputClass}
                  autoComplete="street-address"
                />
              </Field>

            </div>
          </section>

          {/* STEP 03 */}

          <section className="rounded-3xl border border-[#529027]/40 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">
              <StepNumber number="03" />

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  When should we collect it?
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Choose the day you want the driver to attend.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Field label="Collection date" required>
                <input
                  type="date"
                  min={today}
                  value={collectionDate}
                  onChange={(e) =>
                    setCollectionDate(e.target.value)
                  }
                  className={`${inputClass} [color-scheme:dark]`}
                  required
                />
              </Field>

              <Field label="Preferred time">
                <select
                  value={preferredTime}
                  onChange={(e) =>
                    setPreferredTime(e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Any time</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </Field>

            </div>

            <div className="mt-5 rounded-2xl border border-[#529027]/30 bg-[#529027]/10 p-4">

              <p className="text-sm font-bold text-[#9bd76c]">
                Waiting for driver bids
              </p>

              <p className="mt-1 text-sm text-[#9aa79c]">
                Once you post your job, approved RCS drivers
                can review it and submit their prices.
              </p>

            </div>

          </section>

          {/* STEP 04 */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">
              <StepNumber number="04" />

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  Help the driver understand the job
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Give us your best estimate.
                </p>
              </div>
            </div>

            <div className="mt-6">

              <Field
                label="Roughly how much waste is there?"
                required
              >

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">

                  {loadSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setLoadSize(size)
                      }
                      className={`rounded-2xl border px-3 py-4 text-sm font-bold transition ${
                        loadSize === size
                          ? "border-[#529027] bg-[#529027] text-white"
                          : "border-white/10 bg-[#07100b] text-[#d7ded8] hover:border-[#529027]/60"
                      }`}
                    >
                      {size}
                    </button>
                  ))}

                </div>

              </Field>

              <div className="mt-6">

                <Field label="Where is the waste?" required>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    {locations.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setLocation(item)
                        }
                        className={`rounded-2xl border px-3 py-4 text-sm font-bold transition ${
                          location === item
                            ? "border-[#529027] bg-[#529027] text-white"
                            : "border-white/10 bg-[#07100b] text-[#d7ded8] hover:border-[#529027]/60"
                        }`}
                      >
                        {item}
                      </button>
                    ))}

                  </div>

                </Field>

              </div>

            </div>
          </section>

          {/* STEP 05 */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">
              <StepNumber number="05" />

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  Show us what needs taking
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Photos help drivers price your job accurately.
                </p>
              </div>
            </div>

            <label className="mt-6 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-[#07100b] p-6 text-center transition hover:border-[#529027]">

              <span className="text-lg font-black">
                Add photos
              </span>

              <span className="mt-2 text-sm text-[#89968b]">
                Take photos on your phone or choose them from your device.
              </span>

              <span className="mt-4 rounded-xl bg-[#529027] px-5 py-3 text-sm font-black text-white">
                Choose photos
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                className="hidden"
              />

            </label>

            {photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                {photos.map((photo, index) => (
                  <div
                    key={`${photo.name}-${index}`}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07100b] p-2"
                  >

                    <div className="truncate px-1 py-2 text-xs text-[#aeb9af]">
                      {photo.name}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removePhoto(index)
                      }
                      className="absolute right-2 top-2 rounded-lg bg-black/80 px-2 py-1 text-xs font-bold text-white"
                    >
                      Remove
                    </button>

                  </div>
                ))}

              </div>
            )}

          </section>

          {/* STEP 06 */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">
              <StepNumber number="06" />

              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  Final details
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Anything else the driver should know?
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">

              <Field
                label="Describe what needs removing"
                required
              >
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={5}
                  placeholder="For example: old sofa, wardrobe and several bags of household rubbish..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="Access notes">
                <textarea
                  value={accessNotes}
                  onChange={(e) =>
                    setAccessNotes(e.target.value)
                  }
                  rows={4}
                  placeholder="Parking information, narrow access, gates, stairs, keys, or anything else the driver should know."
                  className={`${inputClass} resize-none`}
                />
              </Field>

            </div>
          </section>

          {/* SUBMIT */}

          <section className="rounded-3xl border border-[#529027]/40 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <h2 className="text-2xl font-black">
              Ready to post?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#9aa79c]">
              Your job will be sent to approved RCS drivers.
              They can review the details and submit their price.
              You choose which driver you want to use.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <SummaryItem
                label="Collection"
                value={
                  collectionDate
                    ? new Date(
                        `${collectionDate}T12:00:00`
                      ).toLocaleDateString("en-GB")
                    : "Not selected"
                }
              />

              <SummaryItem
                label="Location"
                value={
                  postcode || "Not entered"
                }
              />

              <SummaryItem
                label="Waste"
                value={
                  wasteType || "Not selected"
                }
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-2xl bg-[#529027] px-6 py-5 text-lg font-black text-white shadow-lg transition hover:bg-[#6aad3a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Posting your job..."
                : "Post Job & Get Driver Bids"}
            </button>

            <p className="mt-4 text-center text-xs text-[#758177]">
              You will choose the driver after they submit their quotes.
            </p>

          </section>

        </form>

      </div>
    </main>
  );
}

function StepNumber({
  number,
}: {
  number: string;
}) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#529027] text-sm font-black text-white">
      {number}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-[#dfe7e0]">
        {label}

        {required && (
          <span className="ml-1 text-[#71b33d]">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07100b] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#758177]">
        {label}
      </p>

      <p className="mt-1 truncate font-black text-white">
        {value}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#07100b] px-4 py-4 text-base font-semibold text-white outline-none placeholder:text-[#657066] focus:border-[#529027] focus:ring-2 focus:ring-[#529027]/20";