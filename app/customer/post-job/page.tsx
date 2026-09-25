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

const PHOTO_BUCKET = "customer-job-photos";

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type SelectedPhoto = {
  file: File;
  id: string;
};

type UploadItem = {
  path: string;
  token: string;
};

async function readResponse(
  response: Response,
): Promise<any> {
  const text = await response.text();

  if (!text) {
    return {};
  }

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
      error:
        "RCS returned an unexpected response. Please try again.",
    };
  }
}

async function compressImage(
  file: File,
): Promise<File> {
  if (
    file.size <= 1.8 * 1024 * 1024 &&
    !file.type.includes("heic") &&
    !file.type.includes("heif")
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(
      file,
    );

    const maxDimension = 1920;

    let width = bitmap.width;
    let height = bitmap.height;

    if (
      width > maxDimension ||
      height > maxDimension
    ) {
      const scale = Math.min(
        maxDimension / width,
        maxDimension / height,
      );

      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(
      bitmap,
      0,
      0,
      width,
      height,
    );

    bitmap.close();

    const blob = await new Promise<Blob | null>(
      (resolve) =>
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.82,
        ),
    );

    if (!blob) {
      return file;
    }

    const originalName = file.name.replace(
      /\.[^/.]+$/,
      "",
    );

    return new File(
      [blob],
      `${originalName}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      },
    );
  } catch (error) {
    console.warn(
      "Image compression failed:",
      error,
    );

    return file;
  }
}

export default function PostJobPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [loading, setLoading] =
    useState(false);

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

  const [uploadStatus, setUploadStatus] =
    useState("");

  const [jobPosted, setJobPosted] =
    useState(false);

  const [jobReference, setJobReference] =
    useState("");

  const [jobId, setJobId] =
    useState<number | null>(null);

  const [
    confirmationRequired,
    setConfirmationRequired,
  ] = useState(false);

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
    useState<SelectedPhoto[]>([]);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const today = useMemo(() => {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    );
  });

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1,
    );

    // Monday = 0, Sunday = 6
    const mondayOffset =
      (firstDay.getDay() + 6) % 7;

    const startDate = new Date(firstDay);
    startDate.setDate(
      startDate.getDate() - mondayOffset,
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(
        startDate.getDate() + index,
      );
      return date;
    });
  }, [calendarMonth]);

  const calendarMonthLabel = useMemo(() => {
    return calendarMonth.toLocaleDateString(
      "en-GB",
      {
        month: "long",
        year: "numeric",
      },
    );
  }, [calendarMonth]);

  const selectedDateLabel = useMemo(() => {
    if (!collectionDate) {
      return "No date selected";
    }

    return new Date(
      `${collectionDate}T12:00:00`,
    ).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [collectionDate]);

  function dateToKey(date: Date) {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function selectCalendarDate(date: Date) {
    const key = dateToKey(date);

    if (key < today) {
      return;
    }

    setCollectionDate(key);
    setCalendarMonth(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
    );
  }

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
          console.error(
            "Customer session error:",
            error,
          );

          setIsLoggedIn(false);
          setCustomerEmail("");

          return;
        }

        if (user) {
          setIsLoggedIn(true);

          setCustomerEmail(
            user.email || "",
          );

          setEmail(user.email || "");

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

  function handlePhotos(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(
      event.target.files || [],
    );

    if (!selectedFiles.length) {
      return;
    }

    const invalidFile =
      selectedFiles.find(
        (file) =>
          !file.type.startsWith("image/") ||
          file.size >
            MAX_FILE_SIZE,
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
          file.type.startsWith("image/") &&
          file.size <= MAX_FILE_SIZE,
      );

    const availableSlots =
      Math.max(
        0,
        MAX_PHOTOS - photos.length,
      );

    const filesToAdd =
      validFiles.slice(
        0,
        availableSlots,
      );

    if (
      validFiles.length >
      availableSlots
    ) {
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
      current.filter(
        (photo) => photo.id !== id,
      ),
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

    if (!preferredTime) {
      return "Please choose when you would like us to collect it.";
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

      if (
        password !==
        confirmPassword
      ) {
        return "Your passwords do not match.";
      }
    }

    return "";
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
          "Content-Type":
            "application/json",

          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
        body: JSON.stringify(body),
      },
    );

    const result =
      await readResponse(response);

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

    setErrorMessage("");
    setSuccessMessage("");
    setUploadStatus("");

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
        currentAccessToken =
          session.access_token;

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

    if (
      isLoggedIn &&
      !currentAccessToken
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

    let uploadSessionToken = "";

    try {
      setUploadStatus(
        "Preparing your RCS job...",
      );

      const photoMetadata =
        photos.map(({ file }) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        }));

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

      const prepareResult =
        await postJson(
          {
            action: "prepare",

            fullName:
              !isLoggedIn
                ? fullName.trim()
                : "",

            email:
              !isLoggedIn
                ? email
                    .trim()
                    .toLowerCase()
                : "",

            phone:
              !isLoggedIn
                ? phone.trim()
                : "",

            password:
              !isLoggedIn
                ? password
                : "",

            jobType: wasteType,

            description:
              description.trim(),

            postcode:
              postcode
                .trim()
                .toUpperCase(),

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
              preferredTime ||
              "Any time",

            photos: photoMetadata,
          },
          currentAccessToken,
        );

      const response =
        prepareResult.response;

      const result =
        prepareResult.result;

      if (
        response.status === 409 &&
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
        result.uploadSessionToken ||
        "";

      if (!uploadSessionToken) {
        throw new Error(
          "RCS could not create the secure upload session.",
        );
      }

      const uploads: UploadItem[] =
        Array.isArray(result.uploads)
          ? result.uploads
          : [];

      const uploadedPaths: string[] =
        [];

      if (photos.length > 0) {
        if (
          uploads.length !==
          photos.length
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

      if (
        !completeResult.response.ok
      ) {
        throw new Error(
          completeResult.result
            ?.error ||
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

      setSuccessMessage(
        "Your job has been posted successfully.",
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
                      {email
                        .trim()
                        .toLowerCase()}
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

        {!checkingSession &&
          isLoggedIn && (
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
                    customer account.
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
                  onChange={(event) =>
                    setPostcode(
                      event.target.value,
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
                  onChange={(event) =>
                    setAddress(
                      event.target.value,
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
              description="Choose a date, then tell us what time of day works best."
            />

            <div className="mt-7">
              <Field label="Choose your collection date" required>
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#050705]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => {
                        const previousMonth = new Date(
                          calendarMonth.getFullYear(),
                          calendarMonth.getMonth() - 1,
                          1,
                        );

                        const currentMonth = new Date();
                        const currentMonthStart = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth(),
                          1,
                        );

                        if (previousMonth >= currentMonthStart) {
                          setCalendarMonth(previousMonth);
                        }
                      }}
                      disabled={
                        calendarMonth.getTime() <=
                        new Date(
                          new Date().getFullYear(),
                          new Date().getMonth(),
                          1,
                        ).getTime()
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-25"
                      aria-label="Previous month"
                    >
                      ‹
                    </button>

                    <p className="text-base font-black text-white sm:text-lg">
                      {calendarMonthLabel}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg font-black text-white transition hover:bg-white/[0.08]"
                      aria-label="Next month"
                    >
                      ›
                    </button>
                  </div>

                  <div className="px-3 pb-4 pt-3 sm:px-5">
                    <div className="mb-2 grid grid-cols-7 gap-1">
                      {[
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                        "Sun",
                      ].map((day) => (
                        <div
                          key={day}
                          className="py-2 text-center text-[10px] font-black uppercase tracking-wide text-white/30 sm:text-xs"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date) => {
                        const key = dateToKey(date);
                        const isCurrentMonth =
                          date.getMonth() ===
                          calendarMonth.getMonth();
                        const isToday = key === today;
                        const isSelected =
                          key === collectionDate;
                        const isPast = key < today;

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={isPast || !isCurrentMonth}
                            onClick={() =>
                              selectCalendarDate(date)
                            }
                            className={`relative flex min-h-11 items-center justify-center rounded-xl text-sm font-black transition sm:min-h-12 ${
                              isSelected
                                ? "bg-[#79c51c] text-[#050705] shadow-lg shadow-[#79c51c]/20"
                                : isCurrentMonth && !isPast
                                  ? "text-white hover:bg-[#79c51c]/10 hover:text-[#bff58a]"
                                  : "cursor-not-allowed text-white/10"
                            }`}
                          >
                            {date.getDate()}

                            {isToday && !isSelected && (
                              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#79c51c]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Field>

              <div className="mt-4 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#79c51c]">
                  Selected date
                </p>
                <p className="mt-1 text-base font-black text-white">
                  {selectedDateLabel}
                </p>
              </div>

              <Field
                label="What time of day works best?"
                required
              >
                <div className="grid gap-2 sm:grid-cols-4">
                  {[
                    "Morning",
                    "Afternoon",
                    "Evening",
                    "Any time",
                  ].map((time) => {
                    const selected =
                      preferredTime === time;

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() =>
                          setPreferredTime(time)
                        }
                        className={`rounded-2xl border px-4 py-4 text-left text-sm font-black transition ${
                          selected
                            ? "border-[#79c51c] bg-[#79c51c]/10 text-[#bff58a]"
                            : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <span>{time}</span>
                        <span className="mt-1 block text-xs font-semibold text-white/30">
                          {time === "Morning"
                            ? "8am – 12pm"
                            : time === "Afternoon"
                              ? "12pm – 5pm"
                              : time === "Evening"
                                ? "5pm – 9pm"
                                : "We're flexible"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>
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
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050705] p-2"
                  >
                    <div className="truncate px-1 py-2 text-xs text-white/55">
                      {photo.file.name}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removePhoto(
                          photo.id,
                        )
                      }
                      className="absolute right-2 top-2 rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-xs font-bold text-white transition hover:border-red-400/40 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
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
                  onChange={(event) =>
                    setAccessNotes(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Parking information, narrow access, gates, stairs, keys, or anything else the driver should know."
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </section>

          {!checkingSession &&
            !isLoggedIn && (
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
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Create a password"
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
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value,
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

          {!checkingSession &&
            isLoggedIn && (
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
                        not need to enter your account
                        details again.
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

            {loading && (
              <div className="mt-6 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#79c51c]/20 border-t-[#79c51c]" />

                  <p className="text-sm font-black text-[#bff58a]">
                    {uploadStatus ||
                      "Posting your job..."}
                  </p>
                </div>
              </div>
            )}

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