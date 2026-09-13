"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: number;
  reference: string | null;
  job_type: string | null;
  postcode: string | null;
  status: string | null;
  created_at: string;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number | null;
  price?: number | null;
  notes: string | null;
  status: string | null;
  created_at: string;
};

type Driver = {
  id: string;
  full_name: string;
  vehicle_type: string | null;
  vehicle_registration: string | null;
};

type Quote = {
  bid: Bid;
  driver: Driver | null;
};

const WHATSAPP_NUMBER = "447555980651";

const WHATSAPP_MESSAGE =
  "Hi Rapid Clear Solutions, I need help with my customer account";

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

export default function CustomerQuotesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Record<number, Quote[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadQuotes();

    const interval = window.setInterval(() => {
      loadQuotes();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  async function loadQuotes() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Customer auth error:", authError);

        setErrorMessage(
          "We couldn't verify your customer account."
        );

        setLoading(false);
        return;
      }

      if (!user) {
        router.replace("/customer/login");
        return;
      }

      const { data: jobsData, error: jobsError } =
        await supabase
          .from("jobs")
          .select(
            `
              id,
              reference,
              job_type,
              postcode,
              status,
              created_at
            `
          )
          .eq("customer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (jobsError) {
        console.error("Customer jobs error:", jobsError);

        setErrorMessage(jobsError.message);
        setLoading(false);
        return;
      }

      const customerJobs = (jobsData || []) as Job[];

      setJobs(customerJobs);

      if (customerJobs.length === 0) {
        setQuotes({});
        setLoading(false);
        return;
      }

      const jobIds = customerJobs.map((job) => job.id);

      const { data: bidsData, error: bidsError } =
        await supabase
          .from("bids")
          .select("*")
          .in("job_id", jobIds)
          .order("created_at", {
            ascending: false,
          });

      if (bidsError) {
        console.error("Customer bids error:", bidsError);

        setErrorMessage(bidsError.message);
        setLoading(false);
        return;
      }

      const bids = (bidsData || []) as Bid[];

      const driverIds = [
        ...new Set(
          bids
            .map((bid) => bid.driver_id)
            .filter(Boolean)
        ),
      ];

      let drivers: Driver[] = [];

      if (driverIds.length > 0) {
        const {
          data: driversData,
          error: driversError,
        } = await supabase
          .from("drivers")
          .select(
            `
              id,
              full_name,
              vehicle_type,
              vehicle_registration
            `
          )
          .in("id", driverIds);

        if (driversError) {
          console.error(
            "Driver details error:",
            driversError
          );
        } else {
          drivers = (driversData || []) as Driver[];
        }
      }

      const quoteMap: Record<number, Quote[]> = {};

      for (const job of customerJobs) {
        quoteMap[job.id] = [];
      }

      for (const bid of bids) {
        const driver =
          drivers.find(
            (item) => item.id === bid.driver_id
          ) || null;

        if (!quoteMap[bid.job_id]) {
          quoteMap[bid.job_id] = [];
        }

        quoteMap[bid.job_id].push({
          bid,
          driver,
        });
      }

      setQuotes(quoteMap);
    } catch (error) {
      console.error(
        "Customer quotes error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong loading your quotes."
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectDriver(
    job: Job,
    quote: Quote
  ) {
    if (!quote.driver) {
      setErrorMessage(
        "We couldn't find the driver for this quote."
      );
      return;
    }

    const amount = getBidAmount(quote.bid);

    const confirmed = window.confirm(
      `Select ${quote.driver.full_name} for ${formatMoney(
        amount
      )}?`
    );

    if (!confirmed) {
      return;
    }

    setSelecting(quote.bid.id);
    setErrorMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({
        accepted_bid_id: quote.bid.id,
        assigned_bid_id: quote.bid.id,
        assigned_driver_id: quote.driver.id,
        status: "assigned",
      })
      .eq("id", job.id);

    if (error) {
      console.error(
        "Job assignment error:",
        error
      );

      setErrorMessage(error.message);
      setSelecting(null);
      return;
    }

    const { error: bidError } =
      await supabase
        .from("bids")
        .update({
          status: "accepted",
        })
        .eq("id", quote.bid.id);

    if (bidError) {
      console.error(
        "Bid update error:",
        bidError
      );
    }

    router.push(
      `/customer/jobs/${job.id}`
    );
  }

  async function logout() {
    try {
      await supabase.auth.signOut();

      router.replace("/customer/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setErrorMessage(
        "Unable to log out. Please try again."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <header className="pwa-header sticky top-0 z-40 border-b border-white/10 bg-[#050705]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center"
            >
              <img
                src="/rapid-clear-logo.png"
                alt="Rapid Clear Solutions"
                className="h-10 w-auto object-contain"
              />
            </Link>

            <Link
              href="/customer/login"
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white/70 transition hover:border-[#79c51c] hover:text-[#79c51c]"
            >
              Customer Login
            </Link>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#79c51c]" />

            <p className="mt-5 text-lg font-black">
              Loading your quotes...
            </p>

            <p className="mt-2 text-sm text-white/45">
              Getting your latest driver bids
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050705] pb-28 text-white">
      {/* HEADER */}

      <header className="pwa-header sticky top-0 z-40 border-b border-white/10 bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center"
          >
            <img
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              className="h-10 w-auto object-contain sm:h-11"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white/65 transition hover:border-[#79c51c] hover:text-[#79c51c] sm:inline-flex"
            >
              WhatsApp Support
            </a>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white/70 transition hover:border-[#79c51c] hover:text-[#79c51c]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* BACK */}

        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-sm font-black text-[#79c51c] transition hover:text-[#91db32]"
        >
          ← Dashboard
        </Link>

        {/* TITLE */}

        <section className="mt-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#79c51c]">
                Customer Portal
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                My Quotes
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 sm:text-base">
                Compare quotes from approved RCS drivers
                and choose the driver you want to complete
                your job.
              </p>
            </div>

            <Link
              href="/customer/post-job"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#79c51c] px-5 text-sm font-black text-[#050705] transition hover:bg-[#91db32]"
            >
              + POST NEW JOB
            </Link>
          </div>
        </section>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-7 rounded-2xl border border-red-500/20 bg-red-950/20 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold leading-6 text-red-300">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => loadQuotes()}
                className="w-fit text-sm font-black text-red-200 underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* NO JOBS */}

        {jobs.length === 0 && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e0a]">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                Quotes
              </p>
            </div>

            <div className="px-5 py-12 text-center sm:px-10 sm:py-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
                RCS
              </div>

              <h2 className="mt-6 text-2xl font-black">
                No jobs yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
                Post your first waste collection job and
                approved RCS drivers can send you quotes.
              </p>

              <Link
                href="/customer/post-job"
                className="mt-7 inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[#79c51c] px-7 font-black text-[#050705] transition hover:bg-[#91db32]"
              >
                POST YOUR FIRST JOB
              </Link>
            </div>
          </div>
        )}

        {/* JOBS */}

        {jobs.length > 0 && (
          <div className="mt-8 space-y-6">
            {jobs.map((job) => {
              const jobQuotes =
                quotes[job.id] || [];

              const normalisedStatus =
                normaliseStatus(job.status);

              const isAssigned =
                normalisedStatus === "assigned" ||
                normalisedStatus === "accepted" ||
                normalisedStatus === "booked" ||
                normalisedStatus === "in_progress" ||
                normalisedStatus === "in progress" ||
                normalisedStatus === "completed" ||
                normalisedStatus === "complete";

              return (
                <section
                  key={job.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e0a] shadow-2xl shadow-black/20"
                >
                  {/* JOB HEADER */}

                  <div className="border-b border-white/10 p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={
                              job.status ||
                              "open"
                            }
                          />

                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-white/35">
                            {job.reference ||
                              `RC-${String(
                                job.id
                              ).padStart(
                                6,
                                "0"
                              )}`}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
                          {job.job_type ||
                            "Waste Collection"}
                        </h2>

                        {job.postcode && (
                          <p className="mt-1 text-sm font-medium text-white/40">
                            {job.postcode}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/customer/jobs/${job.id}`}
                        className="inline-flex w-fit items-center gap-1 text-sm font-black text-[#79c51c] transition hover:text-[#91db32]"
                      >
                        View Job →
                      </Link>
                    </div>
                  </div>

                  {/* ASSIGNED */}

                  {isAssigned && (
                    <div className="border-b border-[#79c51c]/10 bg-[#79c51c]/[0.04] p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-[10px] font-black text-[#79c51c]">
                          RCS
                        </div>

                        <div>
                          <p className="text-sm font-black text-[#79c51c]">
                            Driver selected
                          </p>

                          <p className="mt-1 text-sm leading-6 text-white/45">
                            This job has already been
                            assigned to a driver.
                          </p>

                          <Link
                            href={`/customer/jobs/${job.id}`}
                            className="mt-3 inline-flex text-xs font-black text-[#79c51c] transition hover:text-[#91db32]"
                          >
                            View collection →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NO QUOTES */}

                  {!isAssigned &&
                    jobQuotes.length === 0 && (
                      <div className="p-6 sm:p-7">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xs font-black text-white/30">
                            ...
                          </div>

                          <div>
                            <p className="font-black text-white/80">
                              No driver quotes yet.
                            </p>

                            <p className="mt-1 text-sm leading-6 text-white/40">
                              Approved drivers will be able
                              to bid on this job.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* QUOTES */}

                  {!isAssigned &&
                    jobQuotes.length > 0 && (
                      <div className="divide-y divide-white/10">
                        {jobQuotes.map((quote) => (
                          <div
                            key={quote.bid.id}
                            className="p-5 transition hover:bg-white/[0.02] sm:p-6"
                          >
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                              {/* DRIVER */}

                              <div className="flex min-w-0 items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-[10px] font-black text-[#79c51c]">
                                  RCS
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-lg font-black">
                                      {quote.driver
                                        ?.full_name ||
                                        "RCS Driver"}
                                    </p>

                                    {quote.bid.status ===
                                      "accepted" && (
                                      <span className="rounded-full bg-[#79c51c]/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#79c51c]">
                                        Accepted
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-1 text-sm text-white/40">
                                    {quote.driver
                                      ?.vehicle_type ||
                                      "Waste removal vehicle"}

                                    {quote.driver
                                      ?.vehicle_registration
                                      ? ` • ${quote.driver.vehicle_registration}`
                                      : ""}
                                  </p>

                                  {quote.bid.notes && (
                                    <div className="mt-3 max-w-2xl rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                                      <p className="text-sm leading-6 text-white/50">
                                        {quote.bid.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* PRICE */}

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:min-w-[320px] lg:justify-end">
                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
                                  <p className="text-2xl font-black tracking-tight text-[#79c51c]">
                                    {formatMoney(
                                      getBidAmount(
                                        quote.bid
                                      )
                                    )}
                                  </p>

                                  <p className="text-xs text-white/30 sm:mt-1">
                                    Driver bid
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    selecting ===
                                    quote.bid.id
                                  }
                                  onClick={() =>
                                    selectDriver(
                                      job,
                                      quote
                                    )
                                  }
                                  className="min-h-[48px] rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-[#050705] shadow-lg shadow-[#79c51c]/10 transition active:scale-[0.98] hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {selecting ===
                                  quote.bid.id
                                    ? "Selecting..."
                                    : "Select Driver"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* MOBILE WHATSAPP SUPPORT */}

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[82px] right-4 z-40 flex h-12 items-center gap-2 rounded-full border border-[#79c51c]/20 bg-[#0a0e0a]/95 px-4 text-xs font-black text-[#79c51c] shadow-xl shadow-black/30 backdrop-blur-xl sm:hidden"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#79c51c]/10">
          WA
        </span>

        Support
      </a>

      {/* CUSTOMER BOTTOM NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#050705]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-4">
          <BottomNavItem
            href="/customer/dashboard"
            icon="⌂"
            label="Home"
          />

          <BottomNavItem
            href="/customer/jobs"
            icon="▣"
            label="Jobs"
          />

          <BottomNavItem
            href="/customer/quotes"
            icon="£"
            label="Quotes"
            active
            badge={
              jobs.filter(
                (job) =>
                  ![
                    "assigned",
                    "accepted",
                    "booked",
                    "in_progress",
                    "in progress",
                    "completed",
                    "complete",
                  ].includes(
                    normaliseStatus(
                      job.status
                    )
                  ) &&
                  (quotes[job.id] || []).length > 0
              ).length || undefined
            }
          />

          <BottomNavItem
            href="/customer/post-job"
            icon="+"
            label="New Job"
          />
        </div>
      </nav>
    </main>
  );
}

/* ========================================================= */
/* STATUS BADGE                                               */
/* ========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalised =
    normaliseStatus(status);

  let className =
    "border-white/10 bg-white/[0.04] text-white/55";

  let text = formatStatus(status);

  if (
    normalised === "pending" ||
    normalised === "new" ||
    normalised === "open"
  ) {
    className =
      "border-amber-500/20 bg-amber-500/10 text-amber-300";

    text =
      normalised === "new"
        ? "New"
        : "Waiting";
  }

  if (normalised === "bidding") {
    className =
      "border-blue-500/20 bg-blue-500/10 text-blue-300";

    text = "Quotes";
  }

  if (
    normalised === "assigned" ||
    normalised === "accepted" ||
    normalised === "booked"
  ) {
    className =
      "border-[#79c51c]/25 bg-[#79c51c]/10 text-[#79c51c]";

    text = "Booked";
  }

  if (
    normalised === "in_progress" ||
    normalised === "in progress"
  ) {
    className =
      "border-blue-500/20 bg-blue-500/10 text-blue-300";

    text = "In Progress";
  }

  if (
    normalised === "completed" ||
    normalised === "complete"
  ) {
    className =
      "border-green-500/20 bg-green-500/10 text-green-300";

    text = "Completed";
  }

  if (
    normalised === "cancelled" ||
    normalised === "canceled" ||
    normalised === "rejected"
  ) {
    className =
      "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${className}`}
    >
      {text}
    </span>
  );
}

/* ========================================================= */
/* BOTTOM NAV ITEM                                            */
/* ========================================================= */

function BottomNavItem({
  href,
  icon,
  label,
  active = false,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${
        active
          ? "text-[#79c51c]"
          : "text-white/35 hover:text-white/70"
      }`}
    >
      <span className="relative text-xl leading-none">
        {icon}

        {badge !== undefined && (
          <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#79c51c] px-1 text-[9px] font-black text-[#050705]">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>

      <span>{label}</span>
    </Link>
  );
}

/* ========================================================= */
/* BID AMOUNT                                                  */
/* ========================================================= */

function getBidAmount(bid: Bid) {
  if (typeof bid.amount === "number") {
    return bid.amount;
  }

  if (typeof bid.price === "number") {
    return bid.price;
  }

  return 0;
}

/* ========================================================= */
/* MONEY                                                       */
/* ========================================================= */

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

/* ========================================================= */
/* STATUS NORMALISATION                                       */
/* ========================================================= */

function normaliseStatus(
  status: string | null
) {
  return (status || "")
    .trim()
    .toLowerCase();
}

/* ========================================================= */
/* STATUS FORMAT                                               */
/* ========================================================= */

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}