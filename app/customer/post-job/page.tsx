"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /*
   * JOB DETAILS
   */

  const [wasteType, setWasteType] =
    useState("");

  const [loadSize, setLoadSize] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [postcode, setPostcode] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [collectionDate, setCollectionDate] =
    useState("");

  const [preferredTime, setPreferredTime] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [accessNotes, setAccessNotes] =
    useState("");

  const [photos, setPhotos] =
    useState<File[]>([]);

  /*
   * CUSTOMER DETAILS
   */

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  /*
   * TODAY
   */

  const today = useMemo(() => {
    const date = new Date();

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  /*
   * PHOTO SELECTION
   */

  function handlePhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    if (!selectedFiles.length) {
      return;
    }

    const invalidFile =
      selectedFiles.find(
        (file) =>
          !file.type.startsWith("image/") ||
          file.size > 10 * 1024 * 1024
      );

    if (invalidFile) {
      setErrorMessage(
        "Only image files under 10MB can be uploaded."
      );
    } else {
      setErrorMessage("");
    }

    const validFiles =
      selectedFiles.filter(
        (file) =>
          file.type.startsWith("image/") &&
          file.size <=
            10 * 1024 * 1024
      );

    setPhotos((current) =>
      [...current, ...validFiles].slice(
        0,
        10
      )
    );

    event.target.value = "";
  }

  function removePhoto(
    index: number
  ) {
    setPhotos((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  /*
   * VALIDATION
   */

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

    /*
     * CUSTOMER DETAILS
     */

    if (!fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!email.trim()) {
      return "Please enter your email address.";
    }

    if (!phone.trim()) {
      return "Please enter your phone number.";
    }

    if (!password) {
      return "Please create a password.";
    }

    if (password.length < 6) {
      return "Your password must be at least 6 characters.";
    }

    if (!confirmPassword) {
      return "Please confirm your password.";
    }

    if (password !== confirmPassword) {
      return "Your passwords do not match.";
    }

    return "";
  }

  /*
   * SUBMIT JOB
   */

  async function submitJob(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(
        validationError
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setLoading(true);

    try {
      /*
       * ==============================================
       * BUILD FORM DATA
       * ==============================================
       */

      const formData = new FormData();

      formData.append(
        "fullName",
        fullName.trim()
      );

      formData.append(
        "email",
        email.trim().toLowerCase()
      );

      formData.append(
        "phone",
        phone.trim()
      );

      formData.append(
        "password",
        password
      );

      formData.append(
        "jobType",
        wasteType
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "postcode",
        postcode.trim().toUpperCase()
      );

      formData.append(
        "address",
        address.trim()
      );

      formData.append(
        "loadSize",
        loadSize
      );

      /*
       * Location is included inside the
       * access notes so the driver can see it.
       */

      formData.append(
        "floor",
        ""
      );

      formData.append(
        "stairs",
        location === "Upstairs"
          ? "true"
          : "false"
      );

      const combinedAccessNotes = [
        location
          ? `Waste location: ${location}`
          : "",
        accessNotes.trim()
          ? `Access notes: ${accessNotes.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      formData.append(
        "accessNotes",
        combinedAccessNotes
      );

      formData.append(
        "preferredDate",
        collectionDate
      );

      formData.append(
        "preferredTime",
        preferredTime
      );

      /*
       * PHOTOS
       */

      photos.forEach((photo) => {
        formData.append(
          "photos",
          photo
        );
      });

      /*
       * ==============================================
       * SEND TO SERVER
       * ==============================================
       */

      const response =
        await fetch(
          "/api/customer/post-job",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await response.json();

      /*
       * ==============================================
       * EXISTING ACCOUNT
       * ==============================================
       */

      if (
        response.status === 409 &&
        result.code ===
          "ACCOUNT_EXISTS"
      ) {
        setErrorMessage(
          "An RCS customer account already exists with this email address. Please log in to your existing account before posting a new job."
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      /*
       * ==============================================
       * SERVER ERROR
       * ==============================================
       */

      if (!response.ok) {
        throw new Error(
          result.error ||
            "We couldn't post your job. Please try again."
        );
      }

      /*
       * ==============================================
       * SUCCESS
       * ==============================================
       */

      const reference =
        result.reference ||
        "";

      const emailConfirmationRequired =
        result.emailConfirmationRequired;

      if (
        emailConfirmationRequired
      ) {
        setSuccessMessage(
          reference
            ? `Your job ${reference} has been posted successfully. We've sent a confirmation email to ${email.trim()}. Please confirm your email address, then log in to view your job and driver quotes.`
            : `Your job has been posted successfully. We've sent a confirmation email to ${email.trim()}. Please confirm your email address, then log in to view your job and driver quotes.`
        );
      } else {
        setSuccessMessage(
          reference
            ? `Your job ${reference} has been posted successfully.`
            : "Your job has been posted successfully."
        );
      }

      /*
       * ==============================================
       * SEND CUSTOMER TO LOGIN
       *
       * We do NOT send the password or session
       * through the browser.
       * ==============================================
       */

      setTimeout(() => {
        const params =
          new URLSearchParams();

        params.set(
          "posted",
          "success"
        );

        if (reference) {
          params.set(
            "reference",
            reference
          );
        }

        router.push(
          `/customer/login?${params.toString()}`
        );
      }, 1800);
    } catch (error) {
      console.error(
        "POST JOB ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while posting your job. Please try again."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07100b] text-white">

      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <header className="border-b border-white/10 bg-[#07100b]">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">

          <Link href="/">
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={170}
              height={65}
              className="h-12 w-auto object-contain"
            />
          </Link>

          <Link
            href="/customer/login"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/5"
          >
            Customer Login
          </Link>

        </div>

      </header>

      {/* ================================================= */}
      {/* CONTENT                                           */}
      {/* ================================================= */}

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">

        {/* INTRO */}

        <div className="max-w-3xl">

          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#71b33d]">
            RCS Marketplace
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Get a quote for your waste removal.
          </h1>

          <p className="mt-4 text-base leading-7 text-[#aeb9af] sm:text-lg">
            Tell us what needs removing and
            approved RCS drivers can review
            your job and submit their price.
          </p>

        </div>

        {/* ================================================= */}
        {/* ERROR                                             */}
        {/* ================================================= */}

        {errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">

            <p className="font-bold text-red-300">
              {errorMessage}
            </p>

            {errorMessage.includes(
              "already exists"
            ) && (
              <Link
                href="/customer/login"
                className="mt-4 inline-flex rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c]"
              >
                LOG IN TO YOUR ACCOUNT →
              </Link>
            )}

          </div>
        )}

        {/* ================================================= */}
        {/* SUCCESS                                           */}
        {/* ================================================= */}

        {successMessage && (
          <div className="mt-8 rounded-2xl border border-[#529027]/40 bg-[#529027]/10 p-5">

            <p className="font-bold text-[#9bd76c]">
              ✓ {successMessage}
            </p>

            <p className="mt-2 text-sm text-[#aeb9af]">
              Taking you to customer login...
            </p>

          </div>
        )}

        {/* ================================================= */}
        {/* FORM                                              */}
        {/* ================================================= */}

        <form
          onSubmit={submitJob}
          className="mt-8 space-y-6"
        >

          {/* ================================================= */}
          {/* STEP 01                                           */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">

              <StepNumber number="01" />

              <div>

                <h2 className="text-xl font-black sm:text-2xl">
                  What needs removing?
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Choose the option that best
                  describes your job.
                </p>

              </div>

            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

              {wasteTypes.map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setWasteType(
                        type
                      )
                    }
                    className={`min-h-[58px] rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                      wasteType ===
                      type
                        ? "border-[#529027] bg-[#529027] text-white"
                        : "border-white/10 bg-[#07100b] text-[#d7ded8] hover:border-[#529027]/60"
                    }`}
                  >
                    {type}
                  </button>
                )
              )}

            </div>

          </section>

          {/* ================================================= */}
          {/* STEP 02                                           */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">

              <StepNumber number="02" />

              <div>

                <h2 className="text-xl font-black sm:text-2xl">
                  Where are we collecting from?
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Give the driver everything
                  they need to find you.
                </p>

              </div>

            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Field
                label="Postcode"
                required
              >
                <input
                  value={postcode}
                  onChange={(e) =>
                    setPostcode(
                      e.target.value
                    )
                  }
                  placeholder="e.g. B1 1AA"
                  className={inputClass}
                  autoComplete="postal-code"
                />
              </Field>

              <Field
                label="Collection address"
                required
              >
                <input
                  value={address}
                  onChange={(e) =>
                    setAddress(
                      e.target.value
                    )
                  }
                  placeholder="House number and street"
                  className={inputClass}
                  autoComplete="street-address"
                />
              </Field>

            </div>

          </section>

          {/* ================================================= */}
          {/* STEP 03                                           */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-[#529027]/40 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">

              <StepNumber number="03" />

              <div>

                <h2 className="text-xl font-black sm:text-2xl">
                  When should we collect it?
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Choose the day you want the
                  driver to attend.
                </p>

              </div>

            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Field
                label="Collection date"
                required
              >
                <input
                  type="date"
                  min={today}
                  value={
                    collectionDate
                  }
                  onChange={(e) =>
                    setCollectionDate(
                      e.target.value
                    )
                  }
                  className={`${inputClass} [color-scheme:dark]`}
                  required
                />
              </Field>

              <Field label="Preferred time">

                <select
                  value={
                    preferredTime
                  }
                  onChange={(e) =>
                    setPreferredTime(
                      e.target.value
                    )
                  }
                  className={inputClass}
                >

                  <option value="">
                    Any time
                  </option>

                  <option value="Morning">
                    Morning
                  </option>

                  <option value="Afternoon">
                    Afternoon
                  </option>

                  <option value="Evening">
                    Evening
                  </option>

                </select>

              </Field>

            </div>

            <div className="mt-5 rounded-2xl border border-[#529027]/30 bg-[#529027]/10 p-4">

              <p className="text-sm font-bold text-[#9bd76c]">
                Collection date required
              </p>

              <p className="mt-1 text-sm text-[#9aa79c]">
                Drivers will see this date
                when deciding whether to bid.
              </p>

            </div>

          </section>

          {/* ================================================= */}
          {/* STEP 04                                           */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">

              <StepNumber number="04" />

              <div>

                <h2 className="text-xl font-black sm:text-2xl">
                  Help the driver understand
                  the job
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

                  {loadSizes.map(
                    (size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setLoadSize(
                            size
                          )
                        }
                        className={`rounded-2xl border px-3 py-4 text-sm font-bold transition ${
                          loadSize ===
                          size
                            ? "border-[#529027] bg-[#529027] text-white"
                            : "border-white/10 bg-[#07100b] text-[#d7ded8] hover:border-[#529027]/60"
                        }`}
                      >
                        {size}
                      </button>
                    )
                  )}

                </div>

              </Field>

              <div className="mt-6">

                <Field
                  label="Where is the waste?"
                  required
                >

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    {locations.map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setLocation(
                              item
                            )
                          }
                          className={`rounded-2xl border px-3 py-4 text-sm font-bold transition ${
                            location ===
                            item
                              ? "border-[#529027] bg-[#529027] text-white"
                              : "border-white/10 bg-[#07100b] text-[#d7ded8] hover:border-[#529027]/60"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  </div>

                </Field>

              </div>

            </div>

          </section>

          {/* ================================================= */}
          {/* STEP 05                                           */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">

              <StepNumber number="05" />

              <div>

                <h2 className="text-xl font-black sm:text-2xl">
                  Show us what needs taking
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Photos help drivers price
                  your job accurately.
                </p>

              </div>

            </div>

            <label className="mt-6 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-[#07100b] p-6 text-center transition hover:border-[#529027]">

              <span className="text-lg font-black">
                Add photos
              </span>

              <span className="mt-2 text-sm text-[#89968b]">
                Take photos on your phone or
                choose them from your device.
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

            <p className="mt-3 text-center text-xs text-[#758177]">
              You can upload up to 10 photos.
              Each photo must be under 10MB.
            </p>

            {photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                {photos.map(
                  (photo, index) => (
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
                          removePhoto(
                            index
                          )
                        }
                        className="absolute right-2 top-2 rounded-lg bg-black/80 px-2 py-1 text-xs font-bold text-white"
                      >
                        Remove
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* ================================================= */}
          {/* STEP 06                                           */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">

              <StepNumber number="06" />

              <div>

                <h2 className="text-xl font-black sm:text-2xl">
                  Tell us more about the job
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Anything else the driver
                  should know?
                </p>

              </div>

            </div>

            <div className="mt-6 space-y-5">

              <Field
                label="Describe what needs removing"
                required
              >

                <textarea
                  value={
                    description
                  }
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="For example: old sofa, wardrobe and several bags of household rubbish..."
                  className={`${inputClass} resize-none`}
                />

              </Field>

              <Field label="Access notes">

                <textarea
                  value={
                    accessNotes
                  }
                  onChange={(e) =>
                    setAccessNotes(
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="Parking information, narrow access, gates, stairs, keys, or anything else the driver should know."
                  className={`${inputClass} resize-none`}
                />

              </Field>

            </div>

          </section>

          {/* ================================================= */}
          {/* STEP 07 - ACCOUNT                                 */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-[#1BBB8C]/40 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <div className="flex items-center gap-4">

              <StepNumber number="07" />

              <div>

                <h2 className="text-xl font-black sm:text-2xl">
                  Create your RCS customer account
                </h2>

                <p className="mt-1 text-sm text-[#8f9d91]">
                  Your account lets you track your
                  job, view driver quotes and manage
                  your collection.
                </p>

              </div>

            </div>

            <div className="mt-6 rounded-2xl border border-[#1BBB8C]/20 bg-[#1BBB8C]/5 p-4">

              <p className="text-sm font-bold text-[#b8f1dc]">
                No account needed to start your quote
              </p>

              <p className="mt-1 text-sm leading-6 text-[#8f9d91]">
                We only ask for these details at the
                end so we can create your account and
                keep your job and driver quotes
                together.
              </p>

            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <Field
                label="Full name"
                required
              >

                <input
                  type="text"
                  value={
                    fullName
                  }
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  placeholder="Your full name"
                  autoComplete="name"
                  className={inputClass}
                />

              </Field>

              <Field
                label="Phone number"
                required
              >

                <input
                  type="tel"
                  value={
                    phone
                  }
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 07123 456789"
                  autoComplete="tel"
                  className={inputClass}
                />

              </Field>

            </div>

            <div className="mt-5">

              <Field
                label="Email address"
                required
              >

                <input
                  type="email"
                  value={
                    email
                  }
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClass}
                />

              </Field>

            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <Field
                label="Create a password"
                required
              >

                <input
                  type="password"
                  value={
                    password
                  }
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className={inputClass}
                />

              </Field>

              <Field
                label="Confirm password"
                required
              >

                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  className={inputClass}
                />

              </Field>

            </div>

            <p className="mt-4 text-xs leading-5 text-[#758177]">
              After your job is posted, we'll
              send a confirmation email to your
              email address. You'll then be able to
              log in and view your job and driver
              quotes.
            </p>

          </section>

          {/* ================================================= */}
          {/* SUBMIT                                             */}
          {/* ================================================= */}

          <section className="rounded-3xl border border-[#529027]/40 bg-[#0d1810] p-5 shadow-2xl sm:p-8">

            <h2 className="text-2xl font-black">
              Ready to get quotes?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#9aa79c]">
              Your job will be sent to approved
              RCS drivers. They can review the
              details and submit their price.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <SummaryItem
                label="Collection"
                value={
                  collectionDate
                    ? new Date(
                        `${collectionDate}T12:00:00`
                      ).toLocaleDateString(
                        "en-GB"
                      )
                    : "Not selected"
                }
              />

              <SummaryItem
                label="Location"
                value={
                  postcode ||
                  "Not entered"
                }
              />

              <SummaryItem
                label="Waste"
                value={
                  wasteType ||
                  "Not selected"
                }
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-2xl bg-[#529027] px-6 py-5 text-lg font-black text-white shadow-lg transition hover:bg-[#6aad3a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "POSTING YOUR JOB..."
                : "POST JOB & GET DRIVER QUOTES"}
            </button>

            <p className="mt-4 text-center text-xs text-[#758177]">
              By posting your job, you agree
              that approved RCS drivers can review
              the information you've provided to
              submit a quote.
            </p>

          </section>

        </form>

      </div>

    </main>
  );
}

/* ========================================================= */
/* STEP NUMBER                                               */
/* ========================================================= */

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

/* ========================================================= */
/* FIELD                                                     */
/* ========================================================= */

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

/* ========================================================= */
/* SUMMARY ITEM                                              */
/* ========================================================= */

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

/* ========================================================= */
/* INPUT STYLE                                                */
/* ========================================================= */

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#07100b] px-4 py-4 text-base font-semibold text-white outline-none placeholder:text-[#657066] focus:border-[#529027] focus:ring-2 focus:ring-[#529027]/20";