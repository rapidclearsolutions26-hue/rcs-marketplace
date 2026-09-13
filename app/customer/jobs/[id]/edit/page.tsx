"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PAGE_GREEN = "#79c51c";
const PAGE_GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

const WHATSAPP_NUMBER = "447555980651";

const WHATSAPP_MESSAGE =
  "Hi Rapid Clear Solutions, I need help with my customer account.";

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

const JOB_TYPES = [
  "House Clearance",
  "Garden Waste Removal",
  "General Rubbish Removal",
  "Furniture Disposal",
  "Shed Clearance",
  "Garage Clearance",
  "Builders Waste",
  "Scrap Collection",
  "Small Removals",
  "Other",
];

const LOAD_SIZES = [
  "Small",
  "Medium",
  "Large",
  "Extra Large",
];

const WASTE_LOCATIONS = [
  "Inside the property",
  "Outside the property",
  "Garden",
  "Garage",
  "Shed",
  "Driveway",
  "Front of property",
  "Rear of property",
  "Other",
];

type Job = {
  id: string;
  reference?: string | null;
  job_type?: string | null;
  postcode?: string | null;
  address?: string | null;
  load_size?: string | null;
  description?: string | null;
  floor?: string | null;
  stairs?: boolean | null;
  access_notes?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  status?: string | null;
  journey_status?: string | null;
  accepted_bid_id?: number | null;
  assigned_driver_id?: string | null;
  assigned_bid_id?: number | null;
};

function normaliseStatus(
  value?: string | null,
) {
  return (value || "")
    .trim()
    .toLowerCase();
}

function isLocked(job: Job) {
  const status =
    normaliseStatus(job.status);

  const journeyStatus =
    normaliseStatus(
      job.journey_status,
    );

  if (
    job.accepted_bid_id !==
      null &&
    job.accepted_bid_id !==
      undefined
  ) {
    return true;
  }

  if (job.assigned_driver_id) {
    return true;
  }

  if (
    job.assigned_bid_id !==
      null &&
    job.assigned_bid_id !==
      undefined
  ) {
    return true;
  }

  const lockedStatuses = [
    "accepted",
    "assigned",
    "driver_assigned",
    "driver assigned",
    "in progress",
    "in_progress",
    "on the way",
    "on_way",
    "arriving",
    "started",
    "completed",
    "complete",
    "collected",
    "closed",
    "cancelled",
    "canceled",
  ];

  return (
    lockedStatuses.includes(
      status,
    ) ||
    lockedStatuses.includes(
      journeyStatus,
    )
  );
}

function extractLocation(
  accessNotes?: string | null,
) {
  if (!accessNotes) {
    return "";
  }

  const match =
    accessNotes.match(
      /Waste location:\s*(.*?)(?:\n|$)/i,
    );

  return match?.[1]?.trim() || "";
}

function extractAccessNotes(
  accessNotes?: string | null,
) {
  if (!accessNotes) {
    return "";
  }

  return accessNotes
    .replace(
      /Waste location:\s*.*?(?:\n|$)/i,
      "",
    )
    .replace(
      /^Access notes:\s*/i,
      "",
    )
    .trim();
}

function buildAccessNotes(
  location: string,
  notes: string,
) {
  const parts: string[] = [];

  if (location.trim()) {
    parts.push(
      `Waste location: ${location.trim()}`,
    );
  }

  if (notes.trim()) {
    parts.push(
      `Access notes: ${notes.trim()}`,
    );
  }

  return parts.join("\n");
}

function safeDateValue(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return value;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

async function readResponse(
  response: Response,
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error:
        response.status >= 500
          ? "Something went wrong on the server. Please try again."
          : text,
    };
  }
}

export default function EditCustomerJobPage() {
  const params = useParams();
  const router = useRouter();

  const supabase =
    createClient();

  const jobId = String(
    params.id || "",
  );

  const [job, setJob] =
    useState<Job | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [jobType, setJobType] =
    useState("");

  const [postcode, setPostcode] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [loadSize, setLoadSize] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [floor, setFloor] =
    useState("");

  const [stairs, setStairs] =
    useState(false);

  const [accessNotes, setAccessNotes] =
    useState("");

  const [preferredDate, setPreferredDate] =
    useState("");

  const [preferredTime, setPreferredTime] =
    useState("");

  async function loadJob() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace(
          "/customer/login",
        );
        return;
      }

      const {
        data,
        error: jobError,
      } =
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
              assigned_bid_id
            `,
          )
          .eq(
            "id",
            jobId,
          )
          .eq(
            "customer_id",
            user.id,
          )
          .single();

      if (jobError) {
        throw jobError;
      }

      if (!data) {
        throw new Error(
          "Job not found.",
        );
      }

      const loadedJob =
        data as Job;

      if (
        isLocked(
          loadedJob,
        )
      ) {
        setJob(
          loadedJob,
        );

        setError(
          "This job can no longer be edited because it has been assigned or the collection has started.",
        );

        return;
      }

      setJob(
        loadedJob,
      );

      setJobType(
        loadedJob.job_type ||
          "",
      );

      setPostcode(
        loadedJob.postcode ||
          "",
      );

      setAddress(
        loadedJob.address ||
          "",
      );

      setLoadSize(
        loadedJob.load_size ||
          "",
      );

      setLocation(
        extractLocation(
          loadedJob.access_notes,
        ),
      );

      setAccessNotes(
        extractAccessNotes(
          loadedJob.access_notes,
        ),
      );

      setDescription(
        loadedJob.description ||
          "",
      );

      setFloor(
        loadedJob.floor || "",
      );

      setStairs(
        Boolean(
          loadedJob.stairs,
        ),
      );

      setPreferredDate(
        safeDateValue(
          loadedJob.preferred_date,
        ),
      );

      setPreferredTime(
        loadedJob.preferred_time ===
          "Any time"
          ? ""
          : loadedJob.preferred_time ||
              "",
      );
    } catch (err) {
      console.error(
        "Load edit job error:",
        err,
      );

      setError(
        "We couldn't load this job. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  function validateForm() {
    if (!jobType.trim()) {
      return "Please select the type of waste.";
    }

    if (!postcode.trim()) {
      return "Please enter the postcode.";
    }

    if (!address.trim()) {
      return "Please enter the collection address.";
    }

    if (!loadSize.trim()) {
      return "Please select the estimated load size.";
    }

    if (!location.trim()) {
      return "Please tell us where the waste is located.";
    }

    if (!description.trim()) {
      return "Please describe what needs removing.";
    }

    return "";
  }

  async function saveChanges(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        router.replace(
          "/customer/login",
        );
        return;
      }

      const response =
        await fetch(
          "/api/customer/manage-job",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: "update",
              jobId: Number(
                jobId,
              ),
              jobType:
                jobType.trim(),
              postcode:
                postcode.trim(),
              address:
                address.trim(),
              loadSize:
                loadSize.trim(),
              description:
                description.trim(),
              floor:
                floor.trim(),
              stairs,
              accessNotes:
                buildAccessNotes(
                  location,
                  accessNotes,
                ),
              preferredDate:
                preferredDate ||
                null,
              preferredTime:
                preferredTime.trim() ||
                "Any time",
            }),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "We couldn't save your changes.",
        );
      }

      setSuccess(
        "Your job has been updated successfully.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      setTimeout(() => {
        router.push(
          `/customer/jobs/${jobId}`,
        );

        router.refresh();
      }, 900);
    } catch (err) {
      console.error(
        "Save job error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen text-white"
        style={{
          background: BG,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div
            className="h-10 w-56 animate-pulse rounded-xl"
            style={{
              background: CARD,
            }}
          />

          <div
            className="mt-5 h-5 w-80 animate-pulse rounded-xl"
            style={{
              background: CARD,
            }}
          />

          <div
            className="mt-8 h-[600px] animate-pulse rounded-3xl border"
            style={{
              background: CARD,
              borderColor:
                "rgba(255,255,255,0.06)",
            }}
          />
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main
        className="min-h-screen text-white"
        style={{
          background: BG,
        }}
      >
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-2xl font-black">
            Job not found
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            We couldn't find this job in your customer account.
          </p>

          <Link
            href="/customer/jobs"
            className="mt-7 inline-flex rounded-xl px-5 py-3 text-sm font-black text-black"
            style={{
              background:
                PAGE_GREEN,
            }}
          >
            Back to My Jobs
          </Link>
        </div>
      </main>
    );
  }

  if (isLocked(job)) {
    return (
      <main
        className="min-h-screen text-white"
        style={{
          background: BG,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <header
          className="pwa-header sticky top-0 z-50 border-b"
          style={{
            background:
              "rgba(5,7,5,0.94)",
            borderColor:
              "rgba(121,197,28,0.14)",
            backdropFilter:
              "blur(18px)",
          }}
        >
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/customer/dashboard"
              className="flex items-center gap-3"
            >
              <img
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                className="h-11 w-auto object-contain"
              />

              <div className="hidden sm:block">
                <p className="text-sm font-black">
                  RCS
                </p>

                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Customer Portal
                </p>
              </div>
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
            style={{
              background:
                "rgba(121,197,28,0.1)",
              color:
                PAGE_GREEN,
            }}
          >
            ✓
          </div>

          <p
            className="mt-6 text-xs font-black uppercase tracking-[0.2em]"
            style={{
              color:
                PAGE_GREEN,
            }}
          >
            Job locked
          </p>

          <h1 className="mt-2 text-3xl font-black">
            This job can't be edited
          </h1>

          <p className="mt-4 text-sm leading-6 text-zinc-500">
            This job has already been assigned or the collection has started.
            Changes are locked to protect the booking.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/customer/jobs/${job.id}`}
              className="rounded-xl px-5 py-3 text-sm font-black text-black"
              style={{
                background:
                  PAGE_GREEN,
              }}
            >
              View Job
            </Link>

            <Link
              href="/customer/jobs"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-zinc-300"
            >
              My Jobs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: BG,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: ${BG};
        }

        input,
        textarea,
        select {
          outline: none;
        }

        input:focus,
        textarea:focus,
        select:focus {
          border-color: rgba(
            121,
            197,
            28,
            0.65
          ) !important;
          box-shadow: 0 0 0 3px
            rgba(
              121,
              197,
              28,
              0.08
            );
        }

        .rcs-button:hover {
          background: ${PAGE_GREEN_HOVER} !important;
        }
      `}</style>

      {/* HEADER */}

      <header
        className="pwa-header sticky top-0 z-50 border-b"
        style={{
          background:
            "rgba(5,7,5,0.94)",
          borderColor:
            "rgba(121,197,28,0.14)",
          backdropFilter:
            "blur(18px)",
        }}
      >
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/customer/jobs"
            className="flex items-center gap-3"
          >
            <img
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              className="h-11 w-auto object-contain"
            />

            <div className="hidden sm:block">
              <p className="text-sm font-black">
                RCS
              </p>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Customer Portal
              </p>
            </div>
          </Link>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-[#79c51c]/40 hover:text-[#79c51c]"
            style={{
              borderColor:
                "rgba(121,197,28,0.22)",
              background:
                "rgba(121,197,28,0.05)",
            }}
          >
            WhatsApp Support
          </a>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-6 lg:pt-10">
        <div className="mb-7">
          <Link
            href={`/customer/jobs/${job.id}`}
            className="text-sm font-bold text-zinc-500 transition hover:text-[#79c51c]"
          >
            ← Back to Job
          </Link>

          <p
            className="mt-7 text-xs font-black uppercase tracking-[0.2em]"
            style={{
              color:
                PAGE_GREEN,
            }}
          >
            {job.reference ||
              "RCS Job"}
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Edit Job
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Update the details of your rubbish removal job before drivers send
            their quotes.
          </p>
        </div>

        {/* SUCCESS */}

        {success && (
          <div
            className="mb-6 rounded-2xl border p-4"
            style={{
              background:
                "rgba(121,197,28,0.08)",
              borderColor:
                "rgba(121,197,28,0.28)",
            }}
          >
            <p className="text-sm font-bold text-[#b8ef7a]">
              {success}
            </p>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            className="mb-6 rounded-2xl border p-4"
            style={{
              background:
                "rgba(127,29,29,0.12)",
              borderColor:
                "rgba(248,113,113,0.25)",
            }}
          >
            <p className="text-sm font-semibold leading-6 text-red-200">
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={saveChanges}
          className="space-y-5"
        >
          {/* JOB TYPE */}

          <section
            className="rounded-3xl border p-5 sm:p-7"
            style={{
              background:
                SECTION,
              borderColor:
                "rgba(121,197,28,0.12)",
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  PAGE_GREEN,
              }}
            >
              Step 1
            </p>

            <h2 className="mt-2 text-xl font-black">
              What needs removing?
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {JOB_TYPES.map(
                (type) => {
                  const selected =
                    jobType ===
                    type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setJobType(
                          type,
                        )
                      }
                      className="rounded-2xl border px-3 py-3.5 text-left text-sm font-bold transition"
                      style={{
                        background:
                          selected
                            ? "rgba(121,197,28,0.12)"
                            : "rgba(255,255,255,0.025)",
                        borderColor:
                          selected
                            ? "rgba(121,197,28,0.5)"
                            : "rgba(255,255,255,0.07)",
                        color:
                          selected
                            ? "#b8ef7a"
                            : "#a1a1aa",
                      }}
                    >
                      {type}
                    </button>
                  );
                },
              )}
            </div>
          </section>

          {/* LOCATION */}

          <section
            className="rounded-3xl border p-5 sm:p-7"
            style={{
              background:
                SECTION,
              borderColor:
                "rgba(121,197,28,0.12)",
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  PAGE_GREEN,
              }}
            >
              Step 2
            </p>

            <h2 className="mt-2 text-xl font-black">
              Collection address
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Postcode"
                value={postcode}
                onChange={
                  setPostcode
                }
                placeholder="e.g. B1 1AA"
              />

              <Field
                label="Address"
                value={address}
                onChange={
                  setAddress
                }
                placeholder="Full collection address"
              />
            </div>
          </section>

          {/* LOAD SIZE */}

          <section
            className="rounded-3xl border p-5 sm:p-7"
            style={{
              background:
                SECTION,
              borderColor:
                "rgba(121,197,28,0.12)",
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  PAGE_GREEN,
              }}
            >
              Step 3
            </p>

            <h2 className="mt-2 text-xl font-black">
              How much waste is there?
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {LOAD_SIZES.map(
                (size) => {
                  const selected =
                    loadSize ===
                    size;

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setLoadSize(
                          size,
                        )
                      }
                      className="rounded-2xl border p-4 text-center transition"
                      style={{
                        background:
                          selected
                            ? "rgba(121,197,28,0.12)"
                            : "rgba(255,255,255,0.025)",
                        borderColor:
                          selected
                            ? "rgba(121,197,28,0.5)"
                            : "rgba(255,255,255,0.07)",
                        color:
                          selected
                            ? "#b8ef7a"
                            : "#a1a1aa",
                      }}
                    >
                      <span className="text-sm font-black">
                        {size}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </section>

          {/* WASTE LOCATION */}

          <section
            className="rounded-3xl border p-5 sm:p-7"
            style={{
              background:
                SECTION,
              borderColor:
                "rgba(121,197,28,0.12)",
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  PAGE_GREEN,
              }}
            >
              Step 4
            </p>

            <h2 className="mt-2 text-xl font-black">
              Where is the waste?
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WASTE_LOCATIONS.map(
                (item) => {
                  const selected =
                    location ===
                    item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setLocation(
                          item,
                        )
                      }
                      className="rounded-2xl border px-3 py-3.5 text-sm font-bold transition"
                      style={{
                        background:
                          selected
                            ? "rgba(121,197,28,0.12)"
                            : "rgba(255,255,255,0.025)",
                        borderColor:
                          selected
                            ? "rgba(121,197,28,0.5)"
                            : "rgba(255,255,255,0.07)",
                        color:
                          selected
                            ? "#b8ef7a"
                            : "#a1a1aa",
                      }}
                    >
                      {item}
                    </button>
                  );
                },
              )}
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Floor"
                value={floor}
                onChange={
                  setFloor
                }
                placeholder="e.g. Ground floor / First floor"
              />

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                  Stairs
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setStairs(
                      !stairs,
                    )
                  }
                  className="flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition"
                  style={{
                    background:
                      stairs
                        ? "rgba(121,197,28,0.1)"
                        : "rgba(255,255,255,0.025)",
                    borderColor:
                      stairs
                        ? "rgba(121,197,28,0.45)"
                        : "rgba(255,255,255,0.07)",
                  }}
                >
                  <span className="text-sm font-bold text-zinc-200">
                    Stairs involved
                  </span>

                  <span
                    className="flex h-6 w-11 items-center rounded-full p-1 transition"
                    style={{
                      background:
                        stairs
                          ? PAGE_GREEN
                          : "#272d27",
                    }}
                  >
                    <span
                      className="h-4 w-4 rounded-full bg-white transition"
                      style={{
                        transform:
                          stairs
                            ? "translateX(20px)"
                            : "translateX(0)",
                      }}
                    />
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                Access notes
              </label>

              <textarea
                value={
                  accessNotes
                }
                onChange={(event) =>
                  setAccessNotes(
                    event.target
                      .value,
                  )
                }
                rows={4}
                placeholder="Tell drivers about gates, parking, narrow access, keys, lifting requirements or anything else they need to know."
                className="w-full resize-none rounded-2xl border px-4 py-3.5 text-sm leading-6 text-white placeholder:text-zinc-700"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  borderColor:
                    "rgba(255,255,255,0.08)",
                }}
              />
            </div>
          </section>

          {/* DESCRIPTION */}

          <section
            className="rounded-3xl border p-5 sm:p-7"
            style={{
              background:
                SECTION,
              borderColor:
                "rgba(121,197,28,0.12)",
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  PAGE_GREEN,
              }}
            >
              Step 5
            </p>

            <h2 className="mt-2 text-xl font-black">
              Job description
            </h2>

            <textarea
              value={
                description
              }
              onChange={(event) =>
                setDescription(
                  event.target
                    .value,
                )
              }
              rows={6}
              placeholder="Describe exactly what needs removing..."
              className="mt-5 w-full resize-none rounded-2xl border px-4 py-4 text-sm leading-6 text-white placeholder:text-zinc-700"
              style={{
                background:
                  "rgba(255,255,255,0.025)",
                borderColor:
                  "rgba(255,255,255,0.08)",
              }}
            />
          </section>

          {/* DATE */}

          <section
            className="rounded-3xl border p-5 sm:p-7"
            style={{
              background:
                SECTION,
              borderColor:
                "rgba(121,197,28,0.12)",
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color:
                  PAGE_GREEN,
              }}
            >
              Step 6
            </p>

            <h2 className="mt-2 text-xl font-black">
              Collection timing
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                  Preferred date
                </label>

                <input
                  type="date"
                  value={
                    preferredDate
                  }
                  onChange={(event) =>
                    setPreferredDate(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-2xl border px-4 py-3.5 text-sm text-white"
                  style={{
                    background:
                      "rgba(255,255,255,0.025)",
                    borderColor:
                      "rgba(255,255,255,0.08)",
                    colorScheme:
                      "dark",
                  }}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
                  Preferred time
                </label>

                <select
                  value={
                    preferredTime
                  }
                  onChange={(event) =>
                    setPreferredTime(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-2xl border px-4 py-3.5 text-sm text-white"
                  style={{
                    background:
                      "#0a0e0a",
                    borderColor:
                      "rgba(255,255,255,0.08)",
                  }}
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
              </div>
            </div>
          </section>

          {/* SAVE */}

          <section
            className="rounded-3xl border p-5 sm:p-7"
            style={{
              background:
                "radial-gradient(circle at 100% 0%, rgba(121,197,28,0.1), transparent 45%), #080b08",
              borderColor:
                "rgba(121,197,28,0.18)",
            }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-black">
                  Ready to update your job?
                </p>

                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Your changes will be saved to your RCS job.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/customer/jobs/${job.id}`}
                  className="rounded-xl border px-5 py-3.5 text-center text-sm font-black text-zinc-300 transition hover:border-[#79c51c]/40 hover:text-[#79c51c]"
                  style={{
                    borderColor:
                      "rgba(255,255,255,0.09)",
                  }}
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rcs-button rounded-xl px-6 py-3.5 text-sm font-black text-black transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background:
                      PAGE_GREEN,
                  }}
                >
                  {saving
                    ? "Saving Changes..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </section>
        </form>

        {/* SUPPORT */}

        <section
          className="mt-7 rounded-3xl border p-5 sm:p-6"
          style={{
            background:
              SECTION,
            borderColor:
              "rgba(121,197,28,0.12)",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-black">
                Need help?
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Contact Rapid Clear Solutions through WhatsApp.
              </p>
            </div>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border px-4 py-3 text-center text-sm font-black text-zinc-200 transition hover:border-[#79c51c] hover:text-[#79c51c]"
              style={{
                borderColor:
                  "rgba(121,197,28,0.22)",
                background:
                  "rgba(121,197,28,0.06)",
              }}
            >
              WhatsApp RCS
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          placeholder
        }
        className="w-full rounded-2xl border px-4 py-3.5 text-sm text-white placeholder:text-zinc-700"
        style={{
          background:
            "rgba(255,255,255,0.025)",
          borderColor:
            "rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}