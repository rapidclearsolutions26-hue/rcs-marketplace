"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

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

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [jobPosted, setJobPosted] =
    useState(false);

  const [jobReference, setJobReference] =
    useState("");

  const [jobId, setJobId] =
    useState<number | null>(null);

  const [confirmationRequired, setConfirmationRequired] =
    useState(false);

  /*
   * =========================================================
   * JOB DETAILS
   * =========================================================
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
   * =========================================================
   * NEW CUSTOMER DETAILS
   * =========================================================
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
   * =========================================================
   * TODAY
   * =========================================================
   */

  const today = useMemo(() => {
    const date = new Date();

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  /*
   * =========================================================
   * CHECK LOGGED-IN CUSTOMER
   * =========================================================
   *
   * IMPORTANT:
   * This uses the exact same Supabase client used by the
   * customer dashboard.
   */

  useEffect(() => {
    let mounted = true;

    async function checkCustomerSession() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "Customer session error:",
            error,
          );

          setIsLoggedIn(false);
          setCustomerEmail("");

          return;
        }

        if (user) {
          console.log(
            "Logged-in customer detected:",
            user.id,
          );

          setIsLoggedIn(true);

          setCustomerEmail(
            user.email || "",
          );

          /*
           * Pre-fill the new customer fields internally.
           * They are not shown to an existing customer.
           *
           * This also means the API can safely fall back
           * to these values if needed.
           */

          setEmail(
            user.email || "",
          );

          const metadata =
            user.user_metadata || {};

          if (
            typeof metadata.full_name ===
            "string"
          ) {
            setFullName(
              metadata.full_name,
            );
          }

          if (
            typeof metadata.phone ===
            "string"
          ) {
            setPhone(
              metadata.phone,
            );
          }
        } else {
          console.log(
            "No logged-in customer detected.",
          );

          setIsLoggedIn(false);
          setCustomerEmail("");
        }
      } catch (error) {
        console.error(
          "Customer session check failed:",
          error,
        );

        if (mounted) {
          setIsLoggedIn(false);
          setCustomerEmail("");
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkCustomerSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  /*
   * =========================================================
   * PHOTO SELECTION
   * =========================================================
   */

  function handlePhotos(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles =
      Array.from(
        event.target.files || [],
      );

    if (!selectedFiles.length) {
      return;
    }

    const invalidFile =
      selectedFiles.find(
        (file) =>
          !file.type.startsWith(
            "image/",
          ) ||
          file.size >
            10 *
              1024 *
              1024,
      );

    if (invalidFile) {
      setErrorMessage(
        "Only image files under 10MB can be uploaded.",
      );
    } else {
      setErrorMessage("");
    }

    const validFiles =
      selectedFiles.filter(
        (file) =>
          file.type.startsWith(
            "image/",
          ) &&
          file.size <=
            10 *
              1024 *
              1024,
      );

    setPhotos((current) =>
      [
        ...current,
        ...validFiles,
      ].slice(0, 10),
    );

    event.target.value = "";
  }

  function removePhoto(
    index: number,
  ) {
    setPhotos((current) =>
      current.filter(
        (_, i) =>
          i !== index,
      ),
    );
  }

  /*
   * =========================================================
   * VALIDATION
   * =========================================================
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
     * Existing customers do NOT need account validation.
     */

    if (!isLoggedIn) {
      if (!fullName.trim()) {
        return "Please enter your full name.";
      }

      if (!email.trim()) {
        return "Please enter your email address.";
      }

      const emailIsValid =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim(),
        );

      if (!emailIsValid) {
        return "Please enter a valid email address.";
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

      if (
        password !==
        confirmPassword
      ) {
        return "Your passwords do not match.";
      }
    }

    return "";
  }

  /*
   * =========================================================
   * SUBMIT JOB
   * =========================================================
   */

  async function submitJob(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    /*
     * -------------------------------------------------------
     * GET THE CURRENT SESSION AGAIN
     * -------------------------------------------------------
     *
     * This is important because we don't want to rely only
     * on the state from when the page first loaded.
     */

    let currentUserId: string | null =
      null;

    let currentAccessToken = "";

    try {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Session error:",
          sessionError,
        );
      }

      if (session?.user) {
        currentUserId =
          session.user.id;

        currentAccessToken =
          session.access_token;

        /*
         * Make absolutely sure the page state matches
         * the actual Supabase session.
         */

        setIsLoggedIn(true);

        setCustomerEmail(
          session.user.email || "",
        );
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error(
        "Unable to read customer session:",
        error,
      );
    }

    /*
     * -------------------------------------------------------
     * VALIDATION
     * -------------------------------------------------------
     */

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(
        validationError,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    /*
     * -------------------------------------------------------
     * EXISTING CUSTOMER SAFETY CHECK
     * -------------------------------------------------------
     *
     * If the customer was logged in when they opened the
     * page, but their session has disappeared, don't create
     * a brand-new account by accident.
     */

    if (
      isLoggedIn &&
      !currentUserId
    ) {
      setErrorMessage(
        "Your customer session has expired. Please log in again before posting a new job.",
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
       * -----------------------------------------------------
       * BUILD FORM DATA
       * -----------------------------------------------------
       */

      const formData =
        new FormData();

      /*
       * Existing customers don't need to submit their
       * account details.
       */

      if (!isLoggedIn) {
        formData.append(
          "fullName",
          fullName.trim(),
        );

        formData.append(
          "email",
          email
            .trim()
            .toLowerCase(),
        );

        formData.append(
          "phone",
          phone.trim(),
        );

        formData.append(
          "password",
          password,
        );
      }

      /*
       * -----------------------------------------------------
       * JOB DETAILS
       * -----------------------------------------------------
       */

      formData.append(
        "jobType",
        wasteType,
      );

      formData.append(
        "description",
        description.trim(),
      );

      formData.append(
        "postcode",
        postcode
          .trim()
          .toUpperCase(),
      );

      formData.append(
        "address",
        address.trim(),
      );

      formData.append(
        "loadSize",
        loadSize,
      );

      formData.append(
        "floor",
        "",
      );

      formData.append(
        "stairs",
        location ===
          "Upstairs"
          ? "true"
          : "false",
      );

      const combinedAccessNotes =
        [
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
        combinedAccessNotes,
      );

      formData.append(
        "preferredDate",
        collectionDate,
      );

      formData.append(
        "preferredTime",
        preferredTime,
      );

      /*
       * -----------------------------------------------------
       * PHOTOS
       * -----------------------------------------------------
       */

      photos.forEach(
        (photo) => {
          formData.append(
            "photos",
            photo,
          );
        },
      );

      /*
       * -----------------------------------------------------
       * SEND TO API
       * -----------------------------------------------------
       */

      const response =
        await fetch(
          "/api/customer/post-job",
          {
            method: "POST",

            headers:
              currentAccessToken
                ? {
                    Authorization: `Bearer ${currentAccessToken}`,
                  }
                : undefined,

            body: formData,
          },
        );

      const result =
        await response.json();

      /*
       * -----------------------------------------------------
       * EXISTING ACCOUNT ERROR
       * -----------------------------------------------------
       */

      if (
        response.status ===
          409 &&
        result.code ===
          "ACCOUNT_EXISTS"
      ) {
        setErrorMessage(
          "An RCS customer account already exists with this email address. Please log in to your existing account before posting a new job.",
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      /*
       * -----------------------------------------------------
       * SESSION ERROR
       * -----------------------------------------------------
       */

      if (
        response.status ===
          401
      ) {
        setErrorMessage(
          "Your customer session has expired. Please log in again.",
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      /*
       * -----------------------------------------------------
       * SERVER ERROR
       * -----------------------------------------------------
       */

      if (!response.ok) {
        throw new Error(
          result.error ||
            "We couldn't post your job. Please try again.",
        );
      }

      /*
       * -----------------------------------------------------
       * SUCCESS
       * -----------------------------------------------------
       */

      const reference =
        result.reference ||
        "";

      setJobReference(
        reference,
      );

      setJobId(
        result.jobId
          ? Number(
              result.jobId,
            )
          : null,
      );

      setConfirmationRequired(
        Boolean(
          result.emailConfirmationRequired,
        ),
      );

      setSuccessMessage(
        "Your job has been posted successfully.",
      );

      setJobPosted(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "POST JOB ERROR:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while posting your job. Please try again.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * SUCCESS SCREEN
   * =========================================================
   */

  if (jobPosted) {
    return (
      <main className="min-h-screen bg-[#07100b] text-white">

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

          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-81px)] max-w-3xl items-center px-4 py-12 sm:px-6">

          <section className="w-full rounded-3xl border border-[#529027]/40 bg-[#0d1810] p-6 text-center shadow-2xl sm:p-10">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#529027]/15">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#529027] text-3xl font-black text-white">
                ✓
              </div>

            </div>

            <p className="mt-7 text-sm font-black uppercase tracking-[0.2em] text-[#71b33d]">
              RCS Marketplace
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Your job has been posted.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#aeb9af] sm:text-lg">
              Your waste removal job has been
              successfully sent to the RCS
              Marketplace.
            </p>

            {jobReference && (
              <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-white/10 bg-[#07100b] p-5">

                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#758177]">
                  Job reference
                </p>

                <p className="mt-2 text-2xl font-black text-white">
                  {jobReference}
                </p>

              </div>
            )}

            {confirmationRequired ? (
              <div className="mt-7 rounded-2xl border border-[#1BBB8C]/30 bg-[#1BBB8C]/5 p-5 text-left">

                <div className="flex items-start gap-4">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1BBB8C]/15 text-lg">
                    ✉
                  </div>

                  <div>

                    <h2 className="font-black text-[#b8f1dc]">
                      Please confirm your email
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#aeb9af]">
                      We've sent a confirmation
                      email to:
                    </p>

                    <p className="mt-2 break-all font-black text-white">
                      {email
                        .trim()
                        .toLowerCase()}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[#aeb9af]">
                      Open the email and click the
                      confirmation link. Once your
                      email has been confirmed, come
                      back and log in to your RCS
                      customer account.
                    </p>

                  </div>

                </div>

              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-[#529027]/30 bg-[#529027]/5 p-5 text-left">

                <h2 className="font-black text-[#9bd76c]">
                  Your job is now live
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#aeb9af]">
                  Approved RCS drivers can now
                  review your job and submit
                  their quotes.
                </p>

              </div>
            )}

            <div className="mt-7 rounded-2xl border border-white/10 bg-[#07100b] p-5 text-left">

              <h2 className="font-black text-white">
                What happens next?
              </h2>

              <div className="mt-4 space-y-4">

                <NextStep
                  number="01"
                  title={
                    confirmationRequired
                      ? "Confirm your email"
                      : "Your job is now live"
                  }
                  text={
                    confirmationRequired
                      ? "Check your inbox and click the confirmation link we sent you."
                      : "Approved RCS drivers can now review your job."
                  }
                />

                <NextStep
                  number="02"
                  title="Drivers review your job"
                  text="RCS drivers can see the job details and submit their price."
                />

                <NextStep
                  number="03"
                  title="Compare driver quotes"
                  text="Review the quotes from your customer dashboard."
                />

                <NextStep
                  number="04"
                  title="Choose your driver"
                  text="Select the driver and quote that works best for you."
                />

              </div>

            </div>

            <Link
              href={
                isLoggedIn &&
                jobId
                  ? `/customer/jobs/${jobId}`
                  : "/customer/login"
              }
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-[#529027] px-6 py-5 text-lg font-black text-white shadow-lg transition hover:bg-[#6aad3a]"
            >
              {isLoggedIn
                ? "VIEW YOUR JOB →"
                : "GO TO CUSTOMER LOGIN →"}
            </Link>

            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-bold text-[#8f9d91] transition hover:text-white"
            >
              Return to RCS Marketplace
            </Link>

          </section>

        </div>

      </main>
    );
  }

  /*
   * =========================================================
   * MAIN FORM
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#07100b] text-white">

      {/* ================================================= */}
      {/* HEADER */}
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

          {isLoggedIn ? (
            <Link
              href="/customer/dashboard"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/5"
            >
              Customer Dashboard
            </Link>
          ) : (
            <Link
              href="/customer/login"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/5"
            >
              Customer Login
            </Link>
          )}

        </div>

      </header>

      {/* ================================================= */}
      {/* CONTENT */}
      {/* ================================================= */}

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">

        {/* ================================================= */}
        {/* INTRO */}
        {/* ================================================= */}

        <div className="max-w-3xl">

          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#71b33d]">
            RCS Marketplace
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            {isLoggedIn
              ? "Post a new waste removal job."
              : "Get a quote for your waste removal."}
          </h1>

          <p className="mt-4 text-base leading-7 text-[#aeb9af] sm:text-lg">
            Tell us what needs removing and
            approved RCS drivers can review
            your job and submit their price.
          </p>

        </div>

        {/* ================================================= */}
        {/* SESSION CHECK */}
        {/* ================================================= */}

        {checkingSession && (
          <div className="mt-6 rounded-2xl border border-[#17382b] bg-[#0d1810] p-4">

            <div className="flex items-center gap-3">

              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#214333] border-t-[#1BBB8C]" />

              <p className="text-sm font-bold text-[#aeb9af]">
                Checking your RCS customer account...
              </p>

            </div>

          </div>
        )}

        {/* ================================================= */}
        {/* LOGGED-IN CUSTOMER NOTICE */}
        {/* ================================================= */}

        {!checkingSession &&
          isLoggedIn && (
            <div className="mt-6 rounded-2xl border border-[#1BBB8C]/30 bg-[#1BBB8C]/5 p-5">

              <div className="flex items-start gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1BBB8C]/15 text-lg">
                  ✓
                </div>

                <div className="min-w-0">

                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
                    You're signed in
                  </p>

                  <p className="mt-1 break-all text-base font-black text-white">
                    {customerEmail}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#8f9d91]">
                    This new job will automatically
                    be added to your existing RCS
                    customer account. You don't need
                    to enter your account details again.
                  </p>

                </div>

              </div>

            </div>
          )}

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">

            <p className="font-bold text-red-300">
              {errorMessage}
            </p>

            {errorMessage.includes(
              "already exists",
            ) && (
              <Link
                href="/customer/login"
                className="mt-4 inline-flex rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c]"
              >
                LOG IN TO YOUR ACCOUNT →
              </Link>
            )}

            {errorMessage.includes(
              "session has expired",
            ) && (
              <Link
                href="/customer/login"
                className="mt-4 inline-flex rounded-xl bg-[#1BBB8C] px-5 py-3 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c]"
              >
                LOG IN AGAIN →
              </Link>
            )}

          </div>
        )}

        {/* ================================================= */}
        {/* FORM */}
        {/* ================================================= */}

        <form
          onSubmit={submitJob}
          className="mt-8 space-y-6"
        >

          {/* ================================================= */}
          {/* STEP 01 */}
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
                        type,
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
                ),
              )}

            </div>

          </section>

          {/* ================================================= */}
          {/* STEP 02 */}
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
                      e.target.value,
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
                      e.target.value,
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
          {/* STEP 03 */}
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
                      e.target.value,
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
                      e.target.value,
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

"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

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

const WHATSAPP_NUMBER = "447555980651";

export default function PostJobPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [customerEmail, setCustomerEmail] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [jobPosted, setJobPosted] = useState(false);
  const [jobReference, setJobReference] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [confirmationRequired, setConfirmationRequired] =
    useState(false);

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

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const today = useMemo(() => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const whatsappHref = useMemo(() => {
    const message =
      "Hi RCS, I need some help with posting a waste removal job.";

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message,
    )}`;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkCustomerSession() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error("Customer session error:", error);

          setIsLoggedIn(false);
          setCustomerEmail("");

          return;
        }

        if (user) {
          setIsLoggedIn(true);

          setCustomerEmail(user.email || "");

          setEmail(user.email || "");

          const metadata = user.user_metadata || {};

          if (typeof metadata.full_name === "string") {
            setFullName(metadata.full_name);
          }

          if (typeof metadata.phone === "string") {
            setPhone(metadata.phone);
          }
        } else {
          setIsLoggedIn(false);
          setCustomerEmail("");
        }
      } catch (error) {
        console.error("Customer session check failed:", error);

        if (mounted) {
          setIsLoggedIn(false);
          setCustomerEmail("");
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkCustomerSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  function handlePhotos(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(
      event.target.files || [],
    );

    if (!selectedFiles.length) {
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) =>
        !file.type.startsWith("image/") ||
        file.size > 10 * 1024 * 1024,
    );

    if (invalidFile) {
      setErrorMessage(
        "Only image files under 10MB can be uploaded.",
      );
    } else {
      setErrorMessage("");
    }

    const validFiles = selectedFiles.filter(
      (file) =>
        file.type.startsWith("image/") &&
        file.size <= 10 * 1024 * 1024,
    );

    setPhotos((current) =>
      [...current, ...validFiles].slice(0, 10),
    );

    event.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((current) =>
      current.filter((_, i) => i !== index),
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

    if (!isLoggedIn) {
      if (!fullName.trim()) {
        return "Please enter your full name.";
      }

      if (!email.trim()) {
        return "Please enter your email address.";
      }

      const emailIsValid =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim(),
        );

      if (!emailIsValid) {
        return "Please enter a valid email address.";
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
    }

    return "";
  }

  async function submitJob(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    let currentUserId: string | null = null;
    let currentAccessToken = "";

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
      }

      if (session?.user) {
        currentUserId = session.user.id;
        currentAccessToken = session.access_token;

        setIsLoggedIn(true);
        setCustomerEmail(session.user.email || "");
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error(
        "Unable to read customer session:",
        error,
      );
    }

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (isLoggedIn && !currentUserId) {
      setErrorMessage(
        "Your customer session has expired. Please log in again before posting a new job.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      if (!isLoggedIn) {
        formData.append("fullName", fullName.trim());

        formData.append(
          "email",
          email.trim().toLowerCase(),
        );

        formData.append("phone", phone.trim());

        formData.append("password", password);
      }

      formData.append("jobType", wasteType);

      formData.append(
        "description",
        description.trim(),
      );

      formData.append(
        "postcode",
        postcode.trim().toUpperCase(),
      );

      formData.append(
        "address",
        address.trim(),
      );

      formData.append("loadSize", loadSize);

      formData.append("floor", "");

      formData.append(
        "stairs",
        location === "Upstairs" ? "true" : "false",
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
        combinedAccessNotes,
      );

      formData.append(
        "preferredDate",
        collectionDate,
      );

      formData.append(
        "preferredTime",
        preferredTime,
      );

      photos.forEach((photo) => {
        formData.append("photos", photo);
      });

      const response = await fetch(
        "/api/customer/post-job",
        {
          method: "POST",
          headers: currentAccessToken
            ? {
                Authorization: `Bearer ${currentAccessToken}`,
              }
            : undefined,
          body: formData,
        },
      );

      const result = await response.json();

      if (
        response.status === 409 &&
        result.code === "ACCOUNT_EXISTS"
      ) {
        setErrorMessage(
          "An RCS customer account already exists with this email address. Please log in to your existing account before posting a new job.",
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      if (response.status === 401) {
        setErrorMessage(
          "Your customer session has expired. Please log in again.",
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "We couldn't post your job. Please try again.",
        );
      }

      const reference = result.reference || "";

      setJobReference(reference);

      setJobId(
        result.jobId
          ? Number(result.jobId)
          : null,
      );

      setConfirmationRequired(
        Boolean(
          result.emailConfirmationRequired,
        ),
      );

      setSuccessMessage(
        "Your job has been posted successfully.",
      );

      setJobPosted(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("POST JOB ERROR:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while posting your job. Please try again.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setLoading(false);
    }
  }

  if (jobPosted) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <header className="pwa-header sticky top-0 z-50 border-b border-white/10 bg-[#050705]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link
              href="/"
              className="shrink-0"
            >
              <Image
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                width={180}
                height={60}
                priority
                className="h-11 w-auto object-contain sm:h-12"
              />
            </Link>

            <Link
              href={
                isLoggedIn
                  ? "/customer/dashboard"
                  : "/customer/login"
              }
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-black text-white transition hover:border-[#79c51c]/40 hover:bg-[#79c51c]/10"
            >
              {isLoggedIn
                ? "Dashboard"
                : "Customer Login"}
            </Link>
          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl items-center px-4 py-10 sm:px-6 sm:py-16">
          <section className="w-full rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-6 shadow-2xl sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#79c51c]/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#79c51c] text-3xl font-black text-[#050705]">
                ✓
              </div>
            </div>

            <p className="mt-7 text-center text-sm font-black uppercase tracking-[0.22em] text-[#79c51c]">
              RCS Marketplace
            </p>

            <h1 className="mt-3 text-center text-3xl font-black tracking-tight sm:text-5xl">
              Your job has been posted.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-7 text-white/60 sm:text-lg">
              Your waste removal job has been
              successfully sent to the RCS
              Marketplace.
            </p>

            {jobReference && (
              <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-white/10 bg-[#050705] p-5 text-center">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-white/40">
                  Job reference
                </p>

                <p className="mt-2 text-2xl font-black text-[#79c51c]">
                  {jobReference}
                </p>
              </div>
            )}

            {confirmationRequired ? (
              <div className="mt-7 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-lg">
                    ✉
                  </div>

                  <div>
                    <h2 className="font-black text-[#bff58a]">
                      Please confirm your email
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-white/55">
                      We&apos;ve sent a confirmation
                      email to:
                    </p>

                    <p className="mt-2 break-all font-black text-white">
                      {email.trim().toLowerCase()}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-white/55">
                      Open the email and click the
                      confirmation link. Once your
                      email has been confirmed, come
                      back and log in to your RCS
                      customer account.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
                <h2 className="font-black text-[#bff58a]">
                  Your job is now live
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  Approved RCS drivers can now
                  review your job and submit
                  their quotes.
                </p>
              </div>
            )}

            <div className="mt-7 rounded-2xl border border-white/10 bg-[#050705] p-5">
              <h2 className="font-black text-white">
                What happens next?
              </h2>

              <div className="mt-5 space-y-5">
                <NextStep
                  number="01"
                  title={
                    confirmationRequired
                      ? "Confirm your email"
                      : "Your job is now live"
                  }
                  text={
                    confirmationRequired
                      ? "Check your inbox and click the confirmation link we sent you."
                      : "Approved RCS drivers can now review your job."
                  }
                />

                <NextStep
                  number="02"
                  title="Drivers review your job"
                  text="RCS drivers can see the job details and submit their price."
                />

                <NextStep
                  number="03"
                  title="Compare driver quotes"
                  text="Review the quotes from your customer dashboard."
                />

                <NextStep
                  number="04"
                  title="Choose your driver"
                  text="Select the driver and quote that works best for you."
                />
              </div>
            </div>

            <Link
              href={
                isLoggedIn && jobId
                  ? `/customer/jobs/${jobId}`
                  : "/customer/login"
              }
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-[#79c51c] px-6 py-5 text-lg font-black text-[#050705] shadow-lg shadow-[#79c51c]/10 transition hover:bg-[#91db32]"
            >
              {isLoggedIn
                ? "VIEW YOUR JOB →"
                : "GO TO CUSTOMER LOGIN →"}
            </Link>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center rounded-2xl border border-[#79c51c]/30 bg-[#79c51c]/5 px-6 py-4 text-sm font-black text-[#9de450] transition hover:bg-[#79c51c]/10"
            >
              NEED HELP? MESSAGE RCS ON WHATSAPP
            </a>

            <Link
              href="/"
              className="mt-5 flex justify-center text-sm font-bold text-white/40 transition hover:text-white"
            >
              Return to RCS Marketplace
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050705] text-white">
      <header className="pwa-header sticky top-0 z-50 border-b border-white/10 bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="shrink-0"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={180}
              height={60}
              priority
              className="h-11 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-xl border border-[#79c51c]/30 bg-[#79c51c]/5 px-4 py-2.5 text-sm font-black text-[#9de450] transition hover:bg-[#79c51c]/10 sm:inline-flex"
            >
              WhatsApp Support
            </a>

            <Link
              href={
                isLoggedIn
                  ? "/customer/dashboard"
                  : "/customer/login"
              }
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-black text-white transition hover:border-[#79c51c]/40 hover:bg-[#79c51c]/10"
            >
              {isLoggedIn
                ? "Dashboard"
                : "Customer Login"}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#79c51c]">
            RCS Marketplace
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            {isLoggedIn
              ? "Post a new waste removal job."
              : "Get a quote for your waste removal."}
          </h1>

          <p className="mt-4 text-base leading-7 text-white/60 sm:text-lg">
            Tell us what needs removing and
            approved RCS drivers can review
            your job and submit their price.
          </p>
        </div>

        {checkingSession && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0e0a] p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#79c51c]" />

              <p className="text-sm font-bold text-white/55">
                Checking your RCS customer account...
              </p>
            </div>
          </div>
        )}

        {!checkingSession && isLoggedIn && (
          <div className="mt-6 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-lg text-[#79c51c]">
                ✓
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
                  You&apos;re signed in
                </p>

                <p className="mt-1 break-all text-base font-black text-white">
                  {customerEmail}
                </p>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  This new job will automatically
                  be added to your existing RCS
                  customer account. You don&apos;t
                  need to enter your account
                  details again.
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
            <p className="font-bold leading-6 text-red-300">
              {errorMessage}
            </p>

            {errorMessage.includes(
              "already exists",
            ) && (
              <Link
                href="/customer/login"
                className="mt-4 inline-flex rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-[#050705] transition hover:bg-[#91db32]"
              >
                LOG IN TO YOUR ACCOUNT →
              </Link>
            )}

            {errorMessage.includes(
              "session has expired",
            ) && (
              <Link
                href="/customer/login"
                className="mt-4 inline-flex rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-[#050705] transition hover:bg-[#91db32]"
              >
                LOG IN AGAIN →
              </Link>
            )}
          </div>
        )}

        <form
          onSubmit={submitJob}
          className="mt-8 space-y-6"
        >
          <section className="rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            <SectionHeading
              number="01"
              title="What needs removing?"
              description="Choose the option that best describes your job."
            />

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {wasteTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setWasteType(type)
                  }
                  className={`min-h-[62px] rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                    wasteType === type
                      ? "border-[#79c51c] bg-[#79c51c] text-[#050705] shadow-lg shadow-[#79c51c]/10"
                      : "border-white/10 bg-[#050705] text-white/75 hover:border-[#79c51c]/50 hover:bg-[#79c51c]/5 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            <SectionHeading
              number="02"
              title="Where are we collecting from?"
              description="Give the driver everything they need to find you."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Postcode"
                required
              >
                <input
                  value={postcode}
                  onChange={(e) =>
                    setPostcode(
                      e.target.value,
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
                      e.target.value,
                    )
                  }
                  placeholder="House number and street"
                  className={inputClass}
                  autoComplete="street-address"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            <SectionHeading
              number="03"
              title="When should we collect it?"
              description="Choose the day you want the driver to attend."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                label="Collection date"
                required
              >
                <input
                  type="date"
                  min={today}
                  value={collectionDate}
                  onChange={(e) =>
                    setCollectionDate(
                      e.target.value,
                    )
                  }
                  className={`${inputClass} [color-scheme:dark]`}
                  required
                />
              </Field>

              <Field label="Preferred time">
                <select
                  value={preferredTime}
                  onChange={(e) =>
                    setPreferredTime(
                      e.target.value,
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

            <div className="mt-5 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-4">
              <p className="text-sm font-black text-[#a9eb68]">
                Collection date required
              </p>

              <p className="mt-1 text-sm leading-6 text-white/50">
                Drivers will see this date when
                deciding whether to bid.
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            <SectionHeading
              number="04"
              title="Help the driver understand the job"
              description="Give us your best estimate."
            />

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
                          ? "border-[#79c51c] bg-[#79c51c] text-[#050705]"
                          : "border-white/10 bg-[#050705] text-white/75 hover:border-[#79c51c]/50 hover:bg-[#79c51c]/5 hover:text-white"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="mt-6">
                <Field
                  label="Where is the waste?"
                  required
                >
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
                            ? "border-[#79c51c] bg-[#79c51c] text-[#050705]"
                            : "border-white/10 bg-[#050705] text-white/75 hover:border-[#79c51c]/50 hover:bg-[#79c51c]/5 hover:text-white"
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

          <section className="rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            <SectionHeading
              number="05"
              title="Show us what needs taking"
              description="Photos help drivers price your job accurately."
            />

            <label className="mt-6 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-[#050705] p-6 text-center transition hover:border-[#79c51c]/60 hover:bg-[#79c51c]/5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-2xl">
                📷
              </span>

              <span className="mt-4 text-lg font-black">
                Add photos
              </span>

              <span className="mt-2 max-w-md text-sm leading-6 text-white/45">
                Take photos on your phone or
                choose them from your device.
              </span>

              <span className="mt-4 rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-[#050705]">
                CHOOSE PHOTOS
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                className="hidden"
              />
            </label>

            <p className="mt-3 text-center text-xs text-white/35">
              You can upload up to 10 photos.
              Each photo must be under 10MB.
            </p>

            {photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map(
                  (photo, index) => (
                    <div
                      key={`${photo.name}-${index}`}
                      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050705] p-2"
                    >
                      <div className="truncate px-1 py-2 text-xs text-white/55">
                        {photo.name}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removePhoto(index)
                        }
                        className="absolute right-2 top-2 rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs font-bold text-white transition hover:border-red-400/40 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            <SectionHeading
              number="06"
              title="Tell us more about the job"
              description="Anything else the driver should know?"
            />

            <div className="mt-6 space-y-5">
              <Field
                label="Describe what needs removing"
                required
              >
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value,
                    )
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
                    setAccessNotes(
                      e.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Parking information, narrow access, gates, stairs, keys, or anything else the driver should know."
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </section>

          {!checkingSession && !isLoggedIn && (
            <section className="rounded-[2rem] border border-[#79c51c]/20 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
              <SectionHeading
                number="07"
                title="Create your RCS customer account"
                description="Your account lets you track your job, view driver quotes and manage your collection."
              />

              <div className="mt-6 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-4">
                <p className="text-sm font-black text-[#bff58a]">
                  No account needed to start your quote
                </p>

                <p className="mt-1 text-sm leading-6 text-white/50">
                  We only ask for these details at
                  the end so we can create your
                  account and keep your job and
                  driver quotes together.
                </p>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Full name"
                  required
                >
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(
                        e.target.value,
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
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value,
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
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value,
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
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value,
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
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value,
                      )
                    }
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </Field>
              </div>

              <p className="mt-4 text-xs leading-5 text-white/35">
                After your job is posted, we&apos;ll
                send a confirmation email to your
                email address.
              </p>
            </section>
          )}

          {!checkingSession && isLoggedIn && (
            <section className="rounded-[2rem] border border-[#79c51c]/20 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
              <SectionHeading
                number="07"
                title="Your RCS customer account"
                description="This job will be added to your existing account."
              />

              <div className="mt-6 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-lg font-black text-[#79c51c]">
                    ✓
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
                      Signed in
                    </p>

                    <p className="mt-2 break-all text-lg font-black text-white">
                      {customerEmail}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-white/50">
                      Your existing RCS account will
                      be used automatically. You do
                      not need to enter your name,
                      phone number, email address or
                      password again.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[2rem] border border-[#79c51c]/20 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-xl">
                🚛
              </div>

              <div>
                <h2 className="text-2xl font-black">
                  Ready to get quotes?
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  Your job will be sent to approved
                  RCS drivers. They can review the
                  details and submit their price.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <SummaryItem
                label="Collection"
                value={
                  collectionDate
                    ? new Date(
                        `${collectionDate}T12:00:00`,
                      ).toLocaleDateString(
                        "en-GB",
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
              disabled={
                loading ||
                checkingSession
              }
              className="mt-7 w-full rounded-2xl bg-[#79c51c] px-6 py-5 text-lg font-black text-[#050705] shadow-xl shadow-[#79c51c]/10 transition hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "POSTING YOUR JOB..."
                : "POST JOB & GET DRIVER QUOTES"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-white/30">
              By posting your job, you agree
              that approved RCS drivers can review
              the information you&apos;ve provided to
              submit a quote.
            </p>
          </section>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 px-5 py-4 text-sm font-black text-[#a9eb68] transition hover:bg-[#79c51c]/10"
          >
            <span className="text-lg">
              WhatsApp
            </span>
            <span>
              NEED HELP? MESSAGE RCS SUPPORT
            </span>
          </a>

          <div className="pb-6 text-center">
            <Link
              href="/"
              className="text-sm font-bold text-white/35 transition hover:text-white"
            >
              ← Back to Rapid Clear Solutions
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#79c51c] text-sm font-black text-[#050705] shadow-lg shadow-[#79c51c]/10">
        {number}
      </div>

      <div>
        <h2 className="text-xl font-black sm:text-2xl">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-white/45">
          {description}
        </p>
      </div>
    </div>
  );
}

function NextStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#79c51c] text-xs font-black text-[#050705]">
        {number}
      </div>

      <div>
        <p className="font-black text-white">
          {title}
        </p>

        <p className="mt-1 text-sm leading-6 text-white/45">
          {text}
        </p>
      </div>
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
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white/80">
        {label}

        {required && (
          <span className="ml-1 text-[#79c51c]">
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
    <div className="rounded-2xl border border-white/10 bg-[#050705] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-white/35">
        {label}
      </p>

      <p className="mt-1 truncate font-black text-white">
        {value}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#050705] px-4 py-4 text-base font-semibold text-white outline-none placeholder:text-white/25 transition focus:border-[#79c51c]/70 focus:ring-2 focus:ring-[#79c51c]/10";