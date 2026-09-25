"use client";

import {
  ChangeEvent,
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
const PHOTO_BUCKET = "customer-job-photos";
const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TOTAL_STEPS = 5;

type SelectedPhoto = {
  file: File;
  id: string;
};

type UploadItem = {
  path: string;
  token: string;
};

type AddressSuggestion = {
  id: string;
  type?: string;
  summaryline: string;
  count?: number;
  usercategory?: string;
};

async function readResponse(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 413) {
      return {
        error:
          "The upload was too large. Please choose fewer or smaller photos and try again.",
      };
    }

    return {
      error: "RCS returned an unexpected response. Please try again.",
    };
  }
}

async function compressImage(file: File): Promise<File> {
  if (
    file.size <= 1.8 * 1024 * 1024 &&
    !file.type.includes("heic") &&
    !file.type.includes("heif")
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1920;

    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(
        maxDimension / width,
        maxDimension / height,
      );

      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );

    if (!blob) return file;

    const originalName = file.name.replace(/\.[^/.]+$/, "");

    return new File([blob], `${originalName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Image compression failed:", error);
    return file;
  }
}

export default function PostJobPage() {
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [jobPosted, setJobPosted] = useState(false);
  const [jobReference, setJobReference] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [confirmationRequired, setConfirmationRequired] =
    useState(false);

  const [wasteType, setWasteType] = useState("");
  const [loadSize, setLoadSize] = useState("");
  const [location, setLocation] = useState("");

  const [postcodeInput, setPostcodeInput] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");

  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);

  const [collectionDate, setCollectionDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [description, setDescription] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);

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

        if (!mounted) return;

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

  useEffect(() => {
    if (postcodeInput.trim().length < 3) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    if (addressSelected) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setAddressLoading(true);

        const response = await fetch(
          `/api/address?query=${encodeURIComponent(
            postcodeInput.trim(),
          )}`,
          {
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Unable to search for addresses.",
          );
        }

        if (Array.isArray(data)) {
          setAddressSuggestions(data.slice(0, 10));
        } else {
          setAddressSuggestions([]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Address lookup error:", error);
        setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setAddressLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [postcodeInput, addressSelected]);

  function clearError() {
    setErrorMessage("");
  }

  function goNext() {
    clearError();

    setStep((current) =>
      Math.min(TOTAL_STEPS, current + 1),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goBack() {
    clearError();

    setStep((current) =>
      Math.max(1, current - 1),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function selectWasteType(value: string) {
    setWasteType(value);
    clearError();

    setStep(2);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function selectAddress(suggestion: AddressSuggestion) {
    const selectedAddress = suggestion.summaryline.trim();

    const postcodeMatch = selectedAddress.match(
      /([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i,
    );

    const selectedPostcode = postcodeMatch
      ? postcodeMatch[1].toUpperCase()
      : "";

    setAddress(selectedAddress);
    setPostcode(selectedPostcode);
    setPostcodeInput(selectedPostcode);

    setAddressSelected(true);
    setAddressSuggestions([]);
    clearError();
  }

  function changeAddress() {
    setAddressSelected(false);
    setAddress("");
    setPostcode("");
    setPostcodeInput("");

    clearError();
  }

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    const invalidFile = selectedFiles.find(
      (file) =>
        !file.type.startsWith("image/") ||
        file.size > MAX_FILE_SIZE,
    );

    if (invalidFile) {
      setErrorMessage(
        "Only image files under 10MB can be uploaded.",
      );
    } else {
      clearError();
    }

    const validFiles = selectedFiles.filter(
      (file) =>
        file.type.startsWith("image/") &&
        file.size <= MAX_FILE_SIZE,
    );

    const availableSlots = Math.max(
      0,
      MAX_PHOTOS - photos.length,
    );

    const filesToAdd = validFiles.slice(
      0,
      availableSlots,
    );

    if (validFiles.length > availableSlots) {
      setErrorMessage(
        `You can upload a maximum of ${MAX_PHOTOS} photos.`,
      );
    }

    setPhotos((current) => [
      ...current,
      ...filesToAdd.map((file) => ({
        file,
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
      })),
    ]);

    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((current) =>
      current.filter((photo) => photo.id !== id),
    );
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1 && !wasteType) {
      return "Please choose what needs removing.";
    }

    if (currentStep === 2) {
      if (!postcode.trim()) {
        return "Please select your collection address.";
      }

      if (!address.trim() || !addressSelected) {
        return "Please select your exact collection address from the list.";
      }
    }

    if (currentStep === 3) {
      if (!collectionDate) {
        return "Please choose a collection date.";
      }

      if (collectionDate < today) {
        return "Please choose today or a future collection date.";
      }
    }

    if (currentStep === 4) {
      if (!loadSize) {
        return "Please tell us roughly how much waste there is.";
      }

      if (!location) {
        return "Please tell us where the waste is located.";
      }

      if (!description.trim()) {
        return "Please describe what needs removing.";
      }

      if (photos.length < 1) {
        return "Please add at least 1 photo so drivers can see what needs removing.";
      }
    }

    if (currentStep === 5 && !isLoggedIn) {
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

  function continueStep() {
    const validationError = validateStep(step);

    if (validationError) {
      setErrorMessage(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    goNext();
  }

  async function postJson(
    body: unknown,
    accessToken?: string,
  ) {
    const response = await fetch(
      "/api/customer/post-job",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
        body: JSON.stringify(body),
      },
    );

    const result = await readResponse(response);

    return {
      response,
      result,
    };
  }

  async function cancelPreparedJob(
    uploadSessionToken: string,
  ) {
    try {
      await postJson({
        action: "cancel",
        uploadSessionToken,
      });
    } catch (error) {
      console.error(
        "Unable to cancel prepared job:",
        error,
      );
    }
  }

  async function submitJob(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    clearError();
    setUploadStatus("");

    const validationError = validateStep(5);

    if (validationError) {
      setErrorMessage(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    let currentAccessToken = "";

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Session error:",
          sessionError,
        );
      }

      if (session?.user) {
        currentAccessToken = session.access_token;

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

    if (isLoggedIn && !currentAccessToken) {
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

    let uploadSessionToken = "";

    try {
      setUploadStatus(
        "Preparing your RCS job...",
      );

      const photoMetadata = photos.map(
        ({ file }) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        }),
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

      const prepareResult = await postJson(
        {
          action: "prepare",

          fullName: !isLoggedIn
            ? fullName.trim()
            : "",

          email: !isLoggedIn
            ? email.trim().toLowerCase()
            : "",

          phone: !isLoggedIn
            ? phone.trim()
            : "",

          password: !isLoggedIn
            ? password
            : "",

          jobType: wasteType,

          description:
            description.trim(),

          postcode:
            postcode.trim().toUpperCase(),

          address:
            address.trim(),

          loadSize,

          floor: "",

          stairs:
            location === "Upstairs",

          accessNotes:
            combinedAccessNotes,

          preferredDate:
            collectionDate,

          preferredTime:
            preferredTime || "Any time",

          photos:
            photoMetadata,
        },

        currentAccessToken,
      );

      const {
        response,
        result,
      } = prepareResult;

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
            "We couldn't prepare your job. Please try again.",
        );
      }

      uploadSessionToken =
        result.uploadSessionToken || "";

      if (!uploadSessionToken) {
        throw new Error(
          "RCS could not create the secure upload session.",
        );
      }

      const uploads: UploadItem[] =
        Array.isArray(result.uploads)
          ? result.uploads
          : [];

      const uploadedPaths: string[] = [];

      if (photos.length > 0) {
        if (
          uploads.length !== photos.length
        ) {
          throw new Error(
            "RCS could not prepare all of your photo uploads.",
          );
        }

        for (
          let index = 0;
          index < photos.length;
          index += 1
        ) {
          const originalFile =
            photos[index].file;

          setUploadStatus(
            `Preparing photo ${
              index + 1
            } of ${photos.length}...`,
          );

          const uploadFile =
            await compressImage(
              originalFile,
            );

          const upload =
            uploads[index];

          if (
            !upload?.path ||
            !upload?.token
          ) {
            throw new Error(
              `RCS could not prepare photo ${
                index + 1
              }.`,
            );
          }

          setUploadStatus(
            `Uploading photo ${
              index + 1
            } of ${photos.length}...`,
          );

          const {
            error: uploadError,
          } =
            await supabase.storage
              .from(PHOTO_BUCKET)
              .uploadToSignedUrl(
                upload.path,
                upload.token,
                uploadFile,
              );

          if (uploadError) {
            console.error(
              "Direct photo upload error:",
              uploadError,
            );

            throw new Error(
              `We couldn't upload photo ${
                index + 1
              }. Please try again.`,
            );
          }

          uploadedPaths.push(
            upload.path,
          );
        }
      }

      setUploadStatus(
        "Finishing your RCS job...",
      );

      const completeResult =
        await postJson({
          action: "complete",
          uploadSessionToken,
          uploadedPaths,
        });

      if (!completeResult.response.ok) {
        throw new Error(
          completeResult.result?.error ||
            "We couldn't finish posting your job.",
        );
      }

      const completeData =
        completeResult.result;

      setJobReference(
        completeData.reference ||
          result.reference ||
          "",
      );

      setJobId(
        completeData.jobId
          ? Number(
              completeData.jobId,
            )
          : result.jobId
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

      setUploadStatus("");
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

      if (uploadSessionToken) {
        await cancelPreparedJob(
          uploadSessionToken,
        );
      }

      setUploadStatus("");

      const message =
        error instanceof Error &&
        error.message
          ? error.message
          : "Something went wrong while posting your job. Please try again.";

      setErrorMessage(message);

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
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050705]/95 backdrop-blur-xl">
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
              Your waste removal job has been successfully sent to the RCS Marketplace.
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
                <h2 className="font-black text-[#bff58a]">
                  Please confirm your email
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  We&apos;ve sent a confirmation email to:
                </p>

                <p className="mt-2 break-all font-black text-white">
                  {email
                    .trim()
                    .toLowerCase()}
                </p>

                <p className="mt-3 text-sm leading-6 text-white/55">
                  Open the email and click the confirmation link, then log in to your RCS customer account.
                </p>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
                <h2 className="font-black text-[#bff58a]">
                  Your job is now live
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  Approved RCS drivers can now review your job and submit their quotes.
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

  const progress =
    (step / TOTAL_STEPS) * 100;

  return (
    <main className="min-h-screen bg-[#050705] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
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
              className="h-10 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-xl border border-[#79c51c]/30 bg-[#79c51c]/5 px-4 py-2.5 text-sm font-black text-[#9de450] transition hover:bg-[#79c51c]/10 sm:inline-flex"
            >
              Help
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
                : "Log in"}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        <div className="mb-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
                RCS Marketplace
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                Post your waste job
              </h1>
            </div>

            <p className="shrink-0 text-sm font-black text-white/45">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#79c51c] transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs font-bold text-white/35">
            <span>
              {Math.round(progress)}%
              complete
            </span>

            <span>
              {step === TOTAL_STEPS
                ? "Ready to post"
                : `${TOTAL_STEPS - step} ${
                    TOTAL_STEPS - step === 1
                      ? "step"
                      : "steps"
                  } left`}
            </span>
          </div>
        </div>

        {checkingSession && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-[#0a0e0a] p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#79c51c]" />

              <p className="text-sm font-bold text-white/55">
                Checking your RCS account...
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/5 p-4">
            <p className="text-sm font-bold leading-6 text-red-200">
              {errorMessage}
            </p>
          </div>
        )}

        <form onSubmit={submitJob}>
          <section className="rounded-[2rem] border border-white/10 bg-[#0a0e0a] p-5 shadow-2xl sm:p-8">
            {step === 1 && (
              <StepOne
                wasteType={wasteType}
                onSelect={selectWasteType}
              />
            )}

            {step === 2 && (
              <StepTwo
                postcodeInput={postcodeInput}
                address={address}
                addressSelected={addressSelected}
                addressSuggestions={addressSuggestions}
                addressLoading={addressLoading}
                setPostcodeInput={(value) => {
                  setPostcodeInput(value);
                  setAddressSelected(false);
                  setAddress("");
                  setPostcode("");
                  clearError();
                }}
                onSelectAddress={selectAddress}
                onChangeAddress={changeAddress}
              />
            )}

            {step === 3 && (
              <StepThree
                collectionDate={collectionDate}
                today={today}
                setCollectionDate={
                  setCollectionDate
                }
              />
            )}

            {step === 4 && (
              <StepFour
                loadSize={loadSize}
                location={location}
                description={description}
                accessNotes={accessNotes}
                photos={photos}
                setLoadSize={setLoadSize}
                setLocation={setLocation}
                setDescription={
                  setDescription
                }
                setAccessNotes={
                  setAccessNotes
                }
                onPhotos={handlePhotos}
                onRemovePhoto={
                  removePhoto
                }
              />
            )}

            {step === 5 && (
              <StepFive
                isLoggedIn={isLoggedIn}
                customerEmail={
                  customerEmail
                }
                fullName={fullName}
                email={email}
                phone={phone}
                password={password}
                confirmPassword={
                  confirmPassword
                }
                setFullName={
                  setFullName
                }
                setEmail={setEmail}
                setPhone={setPhone}
                setPassword={
                  setPassword
                }
                setConfirmPassword={
                  setConfirmPassword
                }
                wasteType={wasteType}
                postcode={postcode}
                address={address}
                collectionDate={
                  collectionDate
                }
                loadSize={loadSize}
                location={location}
              />
            )}

            {uploadStatus && (
              <div className="mt-6 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#79c51c]" />

                  <p className="text-sm font-bold text-white/70">
                    {uploadStatus}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-base font-black text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  ← Back
                </button>
              ) : (
                <Link
                  href="/"
                  className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-base font-black text-white transition hover:bg-white/[0.06] sm:w-auto"
                >
                  Cancel
                </Link>
              )}

              {step === 1 ? null : step <
                TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={continueStep}
                  disabled={
                    checkingSession ||
                    loading
                  }
                  className="w-full rounded-2xl bg-[#79c51c] px-6 py-4 text-base font-black text-[#050705] shadow-lg shadow-[#79c51c]/10 transition hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    checkingSession ||
                    loading
                  }
                  className="w-full rounded-2xl bg-[#79c51c] px-6 py-4 text-base font-black text-[#050705] shadow-lg shadow-[#79c51c]/10 transition hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {loading
                    ? "POSTING YOUR JOB..."
                    : "POST JOB & GET QUOTES →"}
                </button>
              )}
            </div>

            {step === 1 && (
              <p className="mt-4 text-center text-xs font-semibold text-white/30">
                Choose an option to continue automatically.
              </p>
            )}
          </section>
        </form>

        <div className="mt-5 text-center">
          <p className="text-xs leading-5 text-white/30">
            Need help?{" "}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="font-black text-[#79c51c]"
            >
              Message RCS on WhatsApp
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function StepOne({
  wasteType,
  onSelect,
}: {
  wasteType: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Step 1"
        title="What are you getting rid of?"
        text="Choose the option that best matches your waste."
      />

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {wasteTypes.map((item) => {
          const selected =
            wasteType === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() =>
                onSelect(item)
              }
              className={`min-h-[64px] rounded-2xl border px-5 py-4 text-left text-base font-black transition ${
                selected
                  ? "border-[#79c51c] bg-[#79c51c]/10 text-[#bff58a]"
                  : "border-white/10 bg-[#050705] text-white hover:border-[#79c51c]/40 hover:bg-[#79c51c]/5"
              }`}
            >
              <span>{item}</span>

              {selected && (
                <span className="float-right text-[#79c51c]">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTwo({
  postcodeInput,
  address,
  addressSelected,
  addressSuggestions,
  addressLoading,
  setPostcodeInput,
  onSelectAddress,
  onChangeAddress,
}: {
  postcodeInput: string;
  address: string;
  addressSelected: boolean;
  addressSuggestions: AddressSuggestion[];
  addressLoading: boolean;
  setPostcodeInput: (
    value: string,
  ) => void;
  onSelectAddress: (
    suggestion: AddressSuggestion,
  ) => void;
  onChangeAddress: () => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Step 2"
        title="Where is the waste?"
        text="Enter the postcode and select the exact property."
      />

      <div className="mt-7 space-y-5">
        <Field
          label="Postcode"
          required
        >
          <input
            value={postcodeInput}
            onChange={(event) =>
              setPostcodeInput(
                event.target.value,
              )
            }
            placeholder="e.g. DY4 9LJ"
            autoComplete="postal-code"
            disabled={addressSelected}
            className={`${inputClass} ${
              addressSelected
                ? "cursor-not-allowed opacity-60"
                : ""
            }`}
          />
        </Field>

        {addressLoading && (
          <div className="rounded-2xl border border-white/10 bg-[#050705] p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#79c51c]" />

              <p className="text-sm font-bold text-white/50">
                Finding properties...
              </p>
            </div>
          </div>
        )}

        {!addressSelected &&
          addressSuggestions.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-black text-white/70">
                Select your address
              </p>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050705]">
                {addressSuggestions.map(
                  (suggestion) => (
                    <button
                      key={
                        suggestion.id
                      }
                      type="button"
                      onClick={() =>
                        onSelectAddress(
                          suggestion,
                        )
                      }
                      className="flex w-full items-start justify-between gap-4 border-b border-white/10 px-4 py-4 text-left transition last:border-b-0 hover:bg-[#79c51c]/10"
                    >
                      <span className="text-sm font-bold leading-6 text-white/80">
                        {
                          suggestion.summaryline
                        }
                      </span>

                      <span className="shrink-0 text-lg text-[#79c51c]">
                        →
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

        {addressSelected && (
          <div className="rounded-2xl border border-[#79c51c]/30 bg-[#79c51c]/5 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
              Collection address
            </p>

            <p className="mt-2 text-base font-black leading-6 text-white">
              {address}
            </p>

            <button
              type="button"
              onClick={onChangeAddress}
              className="mt-4 text-sm font-black text-[#9de450] underline underline-offset-4"
            >
              Change address
            </button>
          </div>
        )}

        {!addressLoading &&
          !addressSelected &&
          postcodeInput.trim()
            .length >= 3 &&
          addressSuggestions.length ===
            0 && (
            <div className="rounded-2xl border border-white/10 bg-[#050705] p-4">
              <p className="text-sm font-bold text-white/45">
                No properties found. Check the postcode and try again.
              </p>
            </div>
          )}

        <div className="rounded-2xl border border-white/10 bg-[#050705] p-4">
          <p className="text-xs leading-5 text-white/35">
            Start typing the postcode and select the exact property from the results. You don't need to type the address manually.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepThree({
  collectionDate,
  today,
  setCollectionDate,
}: {
  collectionDate: string;
  today: string;
  setCollectionDate: (
    value: string,
  ) => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Step 3"
        title="When do you need it removed?"
        text="Choose the exact collection date you'd like."
      />

      <div className="mt-7 space-y-5">
        <Field
          label="Collection date"
          required
        >
          <input
            type="date"
            min={today}
            value={collectionDate}
            onChange={(event) =>
              setCollectionDate(
                event.target.value,
              )
            }
            className={inputClass}
          />
        </Field>

        {collectionDate && (
          <div className="rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
              Selected date
            </p>

            <p className="mt-2 text-xl font-black text-white">
              {formatDate(
                collectionDate,
              )}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#050705] p-4">
          <p className="text-sm font-bold leading-6 text-white/50">
            Drivers will see this date when reviewing your job.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepFour({
  loadSize,
  location,
  description,
  accessNotes,
  photos,
  setLoadSize,
  setLocation,
  setDescription,
  setAccessNotes,
  onPhotos,
  onRemovePhoto,
}: {
  loadSize: string;
  location: string;
  description: string;
  accessNotes: string;
  photos: SelectedPhoto[];
  setLoadSize: (value: string) => void;
  setLocation: (value: string) => void;
  setDescription: (
    value: string,
  ) => void;
  setAccessNotes: (
    value: string,
  ) => void;
  onPhotos: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onRemovePhoto: (
    id: string,
  ) => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Step 4"
        title="Show us the job"
        text="Photos help drivers understand the job and give you a more accurate quote."
      />

      <div className="mt-7 space-y-6">
        <Field
          label="Roughly how much waste is there?"
          required
        >
          <div className="grid gap-2 sm:grid-cols-5">
            {loadSizes.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setLoadSize(item)
                  }
                  className={`rounded-2xl border px-3 py-4 text-sm font-black transition ${
                    loadSize === item
                      ? "border-[#79c51c] bg-[#79c51c]/10 text-[#bff58a]"
                      : "border-white/10 bg-[#050705] text-white/70 hover:border-[#79c51c]/40"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </Field>

        <Field
          label="Where is the waste located?"
          required
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {locations.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setLocation(item)
                  }
                  className={`rounded-2xl border px-4 py-3.5 text-left text-sm font-black transition ${
                    location === item
                      ? "border-[#79c51c] bg-[#79c51c]/10 text-[#bff58a]"
                      : "border-white/10 bg-[#050705] text-white/70 hover:border-[#79c51c]/40"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </Field>

        <Field
          label="What needs removing?"
          required
        >
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="e.g. old sofa, garden waste and 3 bags of rubbish"
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Anything the driver should know?">
          <textarea
            value={accessNotes}
            onChange={(event) =>
              setAccessNotes(
                event.target.value,
              )
            }
            placeholder="e.g. parking is at the front of the property"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white/80">
                Add photos{" "}
                <span className="text-[#79c51c]">
                  *
                </span>
              </p>

              <p className="mt-1 text-xs leading-5 text-white/35">
                At least 1 photo is required so drivers can see the job.
              </p>
            </div>

            <span className="text-xs font-bold text-white/30">
              {photos.length}/
              {MAX_PHOTOS}
            </span>
          </div>

          <label className="mt-3 flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#050705] px-5 py-6 text-center transition hover:border-[#79c51c]/50 hover:bg-[#79c51c]/5">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotos}
              className="sr-only"
            />

            <span>
              <span className="block text-lg font-black text-[#9de450]">
                + Add photos
              </span>

              <span className="mt-1 block text-xs font-semibold text-white/35">
                1–10 photos · 10MB each
              </span>
            </span>
          </label>

          {photos.length === 0 && (
            <p className="mt-2 text-xs font-bold text-white/30">
              You need at least 1 photo before continuing.
            </p>
          )}

          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map(
                (photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black"
                  >
                    <PhotoPreview
                      file={
                        photo.file
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        onRemovePhoto(
                          photo.id,
                        )
                      }
                      className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-sm font-black text-white"
                      aria-label={`Remove ${photo.file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepFive({
  isLoggedIn,
  customerEmail,
  fullName,
  email,
  phone,
  password,
  confirmPassword,
  setFullName,
  setEmail,
  setPhone,
  setPassword,
  setConfirmPassword,
  wasteType,
  postcode,
  address,
  collectionDate,
  loadSize,
  location,
}: {
  isLoggedIn: boolean;
  customerEmail: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  setFullName: (
    value: string,
  ) => void;
  setEmail: (
    value: string,
  ) => void;
  setPhone: (
    value: string,
  ) => void;
  setPassword: (
    value: string,
  ) => void;
  setConfirmPassword: (
    value: string,
  ) => void;
  wasteType: string;
  postcode: string;
  address: string;
  collectionDate: string;
  loadSize: string;
  location: string;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Step 5"
        title={
          isLoggedIn
            ? "Check your job details"
            : "Create your free account"
        }
        text={
          isLoggedIn
            ? "Everything looks good. Post your job and start receiving driver quotes."
            : "Create an RCS account so you can track your job, compare quotes and manage your collection."
        }
      />

      {!isLoggedIn ? (
        <div className="mt-7 space-y-5">
          <Field
            label="Full name"
            required
          >
            <input
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value,
                )
              }
              placeholder="Your full name"
              autoComplete="name"
              className={inputClass}
            />
          </Field>

          <Field
            label="Email address"
            required
          >
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
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
              onChange={(event) =>
                setPhone(
                  event.target.value,
                )
              }
              placeholder="07..."
              autoComplete="tel"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Create password"
              required
            >
              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="At least 6 characters"
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
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-4">
            <p className="text-sm font-bold leading-6 text-white/65">
              Your free account lets you track your job, view driver quotes and choose who collects your waste.
            </p>
          </div>

          <p className="text-center text-sm font-semibold text-white/35">
            Already have an account?{" "}
            <Link
              href="/customer/login"
              className="font-black text-[#79c51c] hover:text-[#9de450]"
            >
              Log in here
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
            Signed in
          </p>

          <p className="mt-2 break-all text-base font-black text-white">
            {customerEmail}
          </p>

          <p className="mt-2 text-sm leading-6 text-white/50">
            This job will automatically be added to your existing RCS customer account.
          </p>
        </div>
      )}

      <div className="mt-7 border-t border-white/10 pt-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">
          Job summary
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SummaryItem
            label="Waste"
            value={wasteType}
          />

          <SummaryItem
            label="Postcode"
            value={postcode.toUpperCase()}
          />

          <SummaryItem
            label="Date"
            value={formatDate(
              collectionDate,
            )}
          />

          <SummaryItem
            label="Time"
            value="Any time"
          />

          <SummaryItem
            label="Amount"
            value={loadSize}
          />

          <SummaryItem
            label="Location"
            value={location}
          />

          <div className="sm:col-span-2">
            <SummaryItem
              label="Address"
              value={address}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoPreview({
  file,
}: {
  file: File;
}) {
  const [src, setSrc] =
    useState("");

  useEffect(() => {
    const objectUrl =
      URL.createObjectURL(file);

    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    };
  }, [file]);

  if (!src) {
    return (
      <div className="h-full w-full bg-white/5" />
    );
  }

  return (
    <img
      src={src}
      alt={file.name}
      className="h-full w-full object-cover"
    />
  );
}

function StepHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
        {title}
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 sm:text-base">
        {text}
      </p>
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

function formatDate(
  value: string,
) {
  if (!value) return "";

  const date =
    new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#050705] px-4 py-4 text-base font-semibold text-white outline-none placeholder:text-white/25 transition focus:border-[#79c51c]/70 focus:ring-2 focus:ring-[#79c51c]/10";