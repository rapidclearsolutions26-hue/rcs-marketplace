"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
};

type PhotoPreview = {
  id: string;
  file: File;
  preview: string;
};

export default function PostJobPage() {
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [jobType, setJobType] = useState("House clearance");
  const [description, setDescription] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [loadSize, setLoadSize] = useState("");
  const [floor, setFloor] = useState("");
  const [stairs, setStairs] = useState(false);
  const [accessNotes, setAccessNotes] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState<number | "">("");

  const [photos, setPhotos] = useState<PhotoPreview[]>([]);

  const MAX_PHOTOS = 10;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  useEffect(() => {
    loadCustomer();
  }, []);

  async function loadCustomer() {
    try {
      setLoadingCustomer(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError);
        setError("Unable to load your account.");
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const metadata = user.user_metadata ?? {};

      setCustomer({
        id: user.id,
        full_name:
          metadata.full_name ||
          metadata.name ||
          metadata.fullName ||
          "",
        business_name:
          metadata.business_name ||
          metadata.businessName ||
          "",
        email: user.email || "",
        phone: metadata.phone || "",
      });
    } catch (err) {
      console.error("Customer loading error:", err);
      setError("Something went wrong loading your account.");
    } finally {
      setLoadingCustomer(false);
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");

    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    if (photos.length + selectedFiles.length > MAX_PHOTOS) {
      setError(`You can upload a maximum of ${MAX_PHOTOS} photos.`);
      event.target.value = "";
      return;
    }

    const validFiles: PhotoPreview[] = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files can be uploaded.");
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `${file.name} is too large. Each photo must be 10MB or smaller.`,
        );
        continue;
      }

      validFiles.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setPhotos((current) => [...current, ...validFiles]);

    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);

      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  async function uploadPhotos(jobId: number) {
    if (photos.length === 0) {
      return;
    }

    for (const photo of photos) {
      const extension =
        photo.file.name.split(".").pop()?.toLowerCase() || "jpg";

      const safeExtension = extension.replace(/[^a-z0-9]/g, "");

      const fileName = `${crypto.randomUUID()}.${safeExtension}`;

      const storagePath = `${jobId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-job-photos")
        .upload(storagePath, photo.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: photo.file.type,
        });

      if (uploadError) {
        console.error("Photo upload error:", {
          message: uploadError.message,
          name: uploadError.name,
          cause: uploadError.cause,
        });

        throw new Error(
          `We couldn't upload ${photo.file.name}. ${uploadError.message}`,
        );
      }

      const { error: photoRecordError } = await supabase
        .from("job_photos")
        .insert({
          job_id: jobId,
          storage_path: storagePath,
        });

      if (photoRecordError) {
        console.error("Photo record error:", {
          message: photoRecordError.message,
          details: photoRecordError.details,
          hint: photoRecordError.hint,
          code: photoRecordError.code,
        });

        await supabase.storage
          .from("customer-job-photos")
          .remove([storagePath]);

        throw new Error(
          `The photo uploaded but could not be attached to the job. ${photoRecordError.message}`,
        );
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!customer) {
      setError("We couldn't load your customer account.");
      return;
    }

    if (!postcode.trim()) {
      setError("Please enter the postcode.");
      return;
    }

    if (!address.trim()) {
      setError("Please enter the address.");
      return;
    }

    if (!description.trim()) {
      setError("Please describe what needs removing.");
      return;
    }

    if (!loadSize) {
      setError("Please select an estimated load size.");
      return;
    }

    if (preferredTime === "") {
      setError("Please select a preferred collection time.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const reference = `RC-${Math.floor(
        100000 + Math.random() * 900000,
      )}`;

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          reference,
          customer_id: user.id,
          job_type: jobType,
          postcode: postcode.trim(),
          address: address.trim(),
          load_size: loadSize,
          description: description.trim(),
          floor: floor.trim() || null,
          stairs,
          access_notes: accessNotes.trim() || null,
          preferred_date: preferredDate || null,
          preferred_time: preferredTime,
          status: "open",
        })
        .select("id, reference")
        .single();

      if (jobError) {
        console.error("Job creation error:", {
          message: jobError.message,
          details: jobError.details,
          hint: jobError.hint,
          code: jobError.code,
        });

        throw new Error(
          jobError.message || "We couldn't create your job.",
        );
      }

      if (!job) {
        throw new Error("The job was created without a job ID.");
      }

      if (photos.length > 0) {
        setSuccessMessage(
          `Job ${job.reference} created. Uploading ${
            photos.length
          } photo${photos.length === 1 ? "" : "s"}...`,
        );

        await uploadPhotos(job.id);
      }

      router.push(`/customer/jobs/${job.id}`);
    } catch (err) {
      console.error("Post job error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong posting your job.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCustomer) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] px-8 py-6 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#1BBB8C] border-t-transparent" />

            <p className="text-sm text-gray-300">
              Loading your account...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="border-b border-[#17382b] bg-[#081710]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1BBB8C]">
              Rapid Clear Solutions
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Post a Job
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/customer/dashboard")}
            className="rounded-xl border border-[#29483a] bg-[#0b1b14] px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-[#1BBB8C] hover:text-white"
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-[#1BBB8C]">
            Get quotes from local drivers
          </p>

          <h2 className="text-3xl font-bold tracking-tight">
            Tell us about your waste
          </h2>

          <p className="mt-2 max-w-2xl text-gray-400">
            Add as much detail as possible. Photos are especially useful
            because drivers can see exactly what needs collecting before
            submitting their quote.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-[#1BBB8C]/30 bg-[#1BBB8C]/10 px-4 py-3 text-sm text-[#8ff0d0]">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">
                Your details
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                We'll use these details for your job.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Name
                </label>

                <input
                  value={customer?.full_name || ""}
                  readOnly
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>

                <input
                  value={customer?.email || ""}
                  readOnly
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">
                Job details
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                Tell drivers what needs doing.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Job type
                </label>

                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none focus:border-[#1BBB8C]"
                >
                  <option>House clearance</option>
                  <option>Waste removal</option>
                  <option>Garden waste removal</option>
                  <option>Furniture removal</option>
                  <option>Builders waste</option>
                  <option>Shed / Garage clearance</option>
                  <option>Scrap collection</option>
                  <option>Small removals</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  What needs removing? *
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                  placeholder="Example: Old sofa, broken furniture, bags of rubbish and garden waste..."
                  className="w-full resize-none rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-[#1BBB8C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Estimated load size *
                </label>

                <select
                  value={loadSize}
                  onChange={(e) => setLoadSize(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none focus:border-[#1BBB8C]"
                >
                  <option value="">Select load size</option>
                  <option>Small</option>
                  <option>Quarter van</option>
                  <option>Half van</option>
                  <option>Three-quarter van</option>
                  <option>Full van</option>
                  <option>Multiple loads</option>
                  <option>Not sure</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#1BBB8C]/30 bg-[#0b1b14] p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Photos of the waste
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Drivers will be able to see these before they bid.
                </p>
              </div>

              <span className="rounded-full bg-[#1BBB8C]/10 px-3 py-1 text-xs font-semibold text-[#1BBB8C]">
                {photos.length}/{MAX_PHOTOS}
              </span>
            </div>

            <label
              htmlFor="job-photos"
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#29483a] bg-[#081710] px-6 py-10 text-center transition hover:border-[#1BBB8C] hover:bg-[#0a1e16]"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1BBB8C]/10 text-2xl text-[#1BBB8C]">
                +
              </div>

              <p className="font-semibold text-white">
                Add photos
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Click to choose photos from your device
              </p>

              <p className="mt-3 text-xs text-gray-500">
                JPG, PNG or other image files · Max 10MB each · Up to 10
                photos
              </p>

              <input
                id="job-photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                disabled={photos.length >= MAX_PHOTOS || submitting}
                className="hidden"
              />
            </label>

            {photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[#29483a] bg-[#081710]"
                  >
                    <img
                      src={photo.preview}
                      alt="Waste preview"
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      disabled={submitting}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
                      <p className="truncate text-xs text-white">
                        {photo.file.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <div className="mt-4 rounded-xl border border-[#17382b] bg-[#081710] px-4 py-3">
                <p className="text-sm text-gray-400">
                  <span className="font-medium text-white">
                    Tip:
                  </span>{" "}
                  Take photos from different angles so drivers can judge the
                  amount of waste and access.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">
                Collection address
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Postcode *
                </label>

                <input
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="B1 1AA"
                  required
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 uppercase text-white outline-none placeholder:text-gray-600 focus:border-[#1BBB8C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Full address *
                </label>

                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Example Street, Birmingham"
                  required
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-[#1BBB8C]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">
                Access & collection
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Floor
                </label>

                <input
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="Ground floor / 1st floor / 2nd floor"
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-[#1BBB8C]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={stairs}
                  onChange={(e) => setStairs(e.target.checked)}
                  className="h-5 w-5 rounded border-[#29483a] bg-[#081710] text-[#1BBB8C] focus:ring-[#1BBB8C]"
                />

                <span className="text-sm font-medium text-gray-300">
                  There are stairs involved
                </span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Access notes
                </label>

                <textarea
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  rows={4}
                  placeholder="Example: Driveway available, side gate, parking outside property..."
                  className="w-full resize-none rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-[#1BBB8C]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">
                Preferred collection
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                Choose the time window that works best for you.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Preferred date
                </label>

                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none focus:border-[#1BBB8C]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Preferred time *
                </label>

                <select
                  value={preferredTime}
                  onChange={(e) =>
                    setPreferredTime(
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value),
                    )
                  }
                  required
                  className="w-full rounded-xl border border-[#29483a] bg-[#081710] px-4 py-3 text-white outline-none focus:border-[#1BBB8C]"
                >
                  <option value="">
                    Select a time window
                  </option>

                  <option value="8">
                    Morning — 8:00 AM to 12:00 PM
                  </option>

                  <option value="13">
                    Afternoon — 1:00 PM to 5:00 PM
                  </option>

                  <option value="18">
                    Evening — 6:00 PM to 8:00 PM
                  </option>
                </select>
              </div>
            </div>
          </section>

          <div className="rounded-2xl border border-[#1BBB8C]/30 bg-[#0b1b14] p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">
                  Ready to get quotes?
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Drivers will be able to review your job and photos before
                  submitting their prices.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#1BBB8C] px-7 py-3 font-bold text-[#06100c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? photos.length > 0
                    ? "Uploading..."
                    : "Posting..."
                  : "Post Job"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}