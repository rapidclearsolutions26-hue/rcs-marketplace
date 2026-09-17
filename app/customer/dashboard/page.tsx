"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
};

type Job = {
  id: number;
  reference: string | null;
  customer_id: string | null;
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
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  journey_status: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
};

const JOB_SELECT = `
  id,
  reference,
  customer_id,
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
  accepted_bid_id,
  assigned_driver_id,
  assigned_bid_id,
  journey_status,
  cancellation_reason,
  cancelled_at,
  created_at
`;

const WHATSAPP_NUMBER = "447555980651";

const DEFAULT_CANCELLATION_REASON =
  "We're sorry, we couldn't find a driver for your collection. Unfortunately, we're unable to fulfil your waste collection at this time. We apologise for the inconvenience. You can contact RCS if you'd like us to help arrange an alternative collection.";

export default function CustomerDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [showInstallModal, setShowInstallModal] =
    useState(false);

  const [isInstalled, setIsInstalled] =
    useState(false);

  /*
   * =========================================================
   * PWA INSTALL
   * =========================================================
   */

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();

      setInstallPrompt(
        event as BeforeInstallPromptEvent
      );
    }

    function checkInstalled() {
      const standalone =
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches;

      const iosStandalone =
        "standalone" in window.navigator &&
        Boolean(
          (
            window.navigator as Navigator & {
              standalone?: boolean;
            }
          ).standalone
        );

      setIsInstalled(
        standalone || iosStandalone
      );
    }

    checkInstalled();

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      checkInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        checkInstalled
      );
    };
  }, []);

  async function handleInstallApp() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();

        const choice =
          await installPrompt.userChoice;

        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
          setShowInstallModal(false);
        }
      } catch (error) {
        console.error(
          "PWA install error:",
          error
        );
      }

      return;
    }

    setShowInstallModal(true);
  }

  /*
   * =========================================================
   * LOAD DASHBOARD
   * =========================================================
   */

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "Customer auth error:",
            authError
          );

          setErrorMessage(
            "We couldn't verify your customer account."
          );

          return;
        }

        if (!user) {
          router.replace("/customer/login");
          return;
        }

        const { data, error } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq("customer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          console.error(
            "Customer jobs error:",
            error
          );

          setErrorMessage(
            error.message ||
              "We couldn't load your jobs."
          );

          return;
        }

        setJobs((data || []) as Job[]);
      } catch (error) {
        console.error(
          "Customer dashboard error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong loading your dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase]
  );

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
   * =========================================================
   * AUTO REFRESH
   * =========================================================
   */

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadDashboard(true);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  async function handleLogout() {
    try {
      await supabase.auth.signOut();

      router.replace("/customer/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);

      setErrorMessage(
        "Unable to log out. Please try again."
      );
    }
  }

  /*
   * =========================================================
   * JOB GROUPS
   * =========================================================
   */

  const pendingJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);

      return (
        status === "pending" ||
        status === "new" ||
        status === "open"
      );
    });
  }, [jobs]);

  const biddingJobs = useMemo(() => {
    return jobs.filter((job) => {
      return (
        normaliseStatus(job.status) ===
        "bidding"
      );
    });
  }, [jobs]);

  const activeJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);

      return (
        status === "assigned" ||
        status === "accepted" ||
        status === "booked" ||
        status === "in_progress" ||
        status === "in progress"
      );
    });
  }, [jobs]);

  const completedJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);

      return (
        status === "completed" ||
        status === "complete"
      );
    });
  }, [jobs]);

  const cancelledJobs = useMemo(() => {
    return jobs.filter((job) => {
      const status = normaliseStatus(job.status);
      const journeyStatus = normaliseStatus(
        job.journey_status
      );

      return (
        status === "cancelled" ||
        status === "canceled" ||
        journeyStatus === "cancelled" ||
        journeyStatus === "canceled"
      );
    });
  }, [jobs]);

  const actionRequiredCount =
    biddingJobs.length;

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#162015] border-t-[#79c51c]" />

            <p className="mt-5 text-lg font-black">
              Loading your account...
            </p>

            <p className="mt-2 text-sm text-[#718067]">
              Getting your latest jobs
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * MAIN
   * =========================================================
   */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] pb-28 text-white">

      {/* HEADER */}

      <header className="pwa-header sticky top-0 z-40 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">

          <Link
            href="/"
            className="flex items-center"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={180}
              height={55}
              priority
              className="h-10 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="flex items-center gap-2">

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallApp}
                className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black text-[#c6d0c2] transition hover:border-[#79c51c]/50 hover:text-[#79c51c] sm:block"
              >
                INSTALL APP
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs font-black text-[#c6d0c2] transition hover:border-[#79c51c]/50 hover:text-[#79c51c]"
            >
              LOG OUT
            </button>

          </div>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">

        {/* WELCOME */}

        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#080b08] p-6 sm:p-8">

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#79c51c]/[0.07] blur-3xl" />

          <div className="relative">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#79c51c] shadow-[0_0_15px_rgba(121,197,28,0.7)]" />

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
                    Customer Portal
                  </p>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                  Your dashboard.
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-[#87917f] sm:text-base">
                  Manage your collections, compare driver
                  quotes and keep track of your RCS jobs.
                </p>

              </div>

              <Link
                href="/customer/post-job"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#79c51c] px-6 text-sm font-black text-[#050705] transition hover:bg-[#91db32] active:scale-[0.98]"
              >
                GET A QUOTE
                <span className="ml-3 text-lg">
                  →
                </span>
              </Link>

            </div>

          </div>
        </section>

        {/* POST JOB */}

        <Link
          href="/customer/post-job"
          className="group mt-5 flex min-h-[76px] w-full items-center justify-between overflow-hidden rounded-2xl border border-[#79c51c]/30 bg-[#79c51c] px-5 text-[#050705] shadow-[0_12px_40px_rgba(121,197,28,0.08)] transition hover:bg-[#91db32] active:scale-[0.99] sm:px-7"
        >

          <div className="flex items-center gap-4">

            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#050705]/10 text-2xl font-black">
              +
            </span>

            <div>
              <p className="text-base font-black sm:text-lg">
                POST A NEW JOB
              </p>

              <p className="mt-0.5 text-xs font-bold text-[#17220f]/70">
                Tell us what needs clearing
              </p>
            </div>

          </div>

          <span className="text-2xl font-black transition group-hover:translate-x-1">
            →
          </span>

        </Link>

        {/* ACTION REQUIRED */}

        {actionRequiredCount > 0 && (
          <section className="mt-5">

            <Link
              href="/customer/quotes"
              className="group block overflow-hidden rounded-2xl border border-[#79c51c]/40 bg-[#0c1209] transition hover:border-[#79c51c] active:scale-[0.995]"
            >

              <div className="flex items-center gap-4 p-5 sm:p-6">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c] text-xl font-black text-[#050705]">
                  £
                </div>

                <div className="min-w-0 flex-1">

                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
                    Action required
                  </p>

                  <h2 className="mt-1 text-base font-black sm:text-lg">
                    Driver quotes are waiting
                  </h2>

                  <p className="mt-1 text-sm text-[#7f8b78]">
                    Review and compare your available quotes.
                  </p>

                </div>

                <span className="text-2xl font-black text-[#79c51c] transition group-hover:translate-x-1">
                  →
                </span>

              </div>

              {actionRequiredCount > 1 && (
                <div className="border-t border-white/[0.06] px-5 py-3 text-xs font-bold text-[#82907d] sm:px-6">
                  {actionRequiredCount} jobs have quotes available
                </div>
              )}

            </Link>

          </section>
        )}

        {/* ACTIVE COLLECTION */}

        {activeJobs.length > 0 && (
          <section className="mt-9">

            <SectionTitle
              eyebrow="Next up"
              title="Your collection"
            />

            <div className="space-y-3">

              {activeJobs
                .slice(0, 1)
                .map((job) => (
                  <ActiveJobCard
                    key={job.id}
                    job={job}
                  />
                ))}

            </div>

          </section>
        )}

        {/* CANCELLED COLLECTIONS */}

        {cancelledJobs.length > 0 && (
          <section className="mt-9">

            <SectionTitle
              eyebrow="Update"
              title="Cancelled collections"
            />

            <div className="space-y-3">

              {cancelledJobs
                .slice(0, 3)
                .map((job) => (
                  <CancelledJobCard
                    key={job.id}
                    job={job}
                  />
                ))}

            </div>

            {cancelledJobs.length > 3 && (
              <Link
                href="/customer/jobs"
                className="mt-4 block text-center text-xs font-black text-[#79c51c] transition hover:text-[#91db32]"
              >
                View all cancelled jobs →
              </Link>
            )}

          </section>
        )}

        {/* QUICK ACCESS */}

        <section className="mt-9">

          <SectionTitle
            eyebrow="Quick access"
            title="What do you need?"
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            <QuickAction
              href="/customer/quotes"
              icon="£"
              title="My Quotes"
              subtitle={
                actionRequiredCount > 0
                  ? `${actionRequiredCount} waiting`
                  : "View quotes"
              }
              primary={
                actionRequiredCount > 0
              }
            />

            <QuickAction
              href="/customer/jobs"
              icon="▣"
              title="My Jobs"
              subtitle={`${jobs.length} total`}
            />

            <QuickAction
              href="/customer/post-job"
              icon="+"
              title="New Job"
              subtitle="Request collection"
              primary
            />

            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={refreshing}
              className="flex min-h-[118px] flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#080b08] p-4 text-left transition hover:border-white/[0.14] active:scale-[0.98] disabled:opacity-60"
            >

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-xl font-black text-[#79c51c]">
                ↻
              </span>

              <span>
                <span className="block text-sm font-black">
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </span>

                <span className="mt-1 block text-xs text-[#718067]">
                  Check for updates
                </span>
              </span>

            </button>

          </div>

        </section>

        {/* SUMMARY */}

        <section className="mt-8">

          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080b08] sm:grid-cols-4">

            <SummaryItem
              value={pendingJobs.length}
              label="Waiting"
            />

            <SummaryItem
              value={activeJobs.length}
              label="Active"
              border
            />

            <SummaryItem
              value={completedJobs.length}
              label="Completed"
              border
            />

            <SummaryItem
              value={cancelledJobs.length}
              label="Cancelled"
              border
            />

          </div>

        </section>

        {/* WHATSAPP SUPPORT */}

        <section className="mt-8">

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              "Hi RCS, I need some help with my customer account."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-[#79c51c]/20 bg-[#080b08] p-5 transition hover:border-[#79c51c]/50 hover:bg-[#0a0f09] active:scale-[0.995] sm:p-6"
          >

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c] text-[#050705]">

              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.52 3.48A11.78 11.78 0 0 0 12.08 0C5.57 0 .27 5.3.27 11.81c0 2.08.54 4.11 1.57 5.9L.17 24l6.44-1.69a11.8 11.8 0 0 0 5.47 1.39h.01c6.51 0 11.81-5.3 11.81-11.81 0-3.15-1.23-6.11-3.38-8.41ZM12.09 21.68h-.01a9.82 9.82 0 0 1-5.01-1.37l-.36-.21-3.82 1 1.02-3.72-.23-.38a9.82 9.82 0 0 1-1.51-5.2C2.17 6.37 6.61 1.93 12.08 1.93a9.82 9.82 0 0 1 7 2.9 9.82 9.82 0 0 1 2.9 7c0 5.47-4.44 9.85-9.89 9.85Zm5.39-7.37c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
              </svg>

            </div>

            <div className="min-w-0 flex-1">

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
                Need help?
              </p>

              <h2 className="mt-1 text-base font-black">
                Message RCS on WhatsApp
              </h2>

              <p className="mt-1 text-sm leading-5 text-[#718067]">
                Speak to the Rapid Clear Solutions team
                about your account or collection.
              </p>

            </div>

            <span className="shrink-0 text-xl font-black text-[#79c51c] transition group-hover:translate-x-1">
              →
            </span>

          </a>

        </section>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-900/60 bg-[#180909] p-5">

            <p className="text-sm font-semibold leading-6 text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => loadDashboard()}
              className="mt-3 text-sm font-black text-red-200 underline"
            >
              Try again
            </button>

          </div>
        )}

        {/* RECENT JOBS */}

        <section className="mt-10">

          <div className="flex items-end justify-between gap-4">

            <SectionTitle
              eyebrow="Activity"
              title="Recent jobs"
            />

            {jobs.length > 0 && (
              <Link
                href="/customer/jobs"
                className="mb-5 text-xs font-black text-[#79c51c] transition hover:text-[#91db32]"
              >
                View all →
              </Link>
            )}

          </div>

          {jobs.length === 0 ? (
            <EmptyJobs />
          ) : (
            <div className="space-y-3">

              {jobs
                .slice(0, 5)
                .map((job) => (
                  <CustomerJobCard
                    key={job.id}
                    job={job}
                  />
                ))}

            </div>
          )}

        </section>

        {/* FOOTER */}

        <div className="mt-12 border-t border-white/[0.06] pt-7 text-center">

          <p className="text-xs text-[#596358]">
            Rapid Clear Solutions
          </p>

          <p className="mt-1 text-[11px] text-[#414a40]">
            Waste removal made simple.
          </p>

        </div>

      </div>

      {/* CUSTOMER APP NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#050705]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">

        <div className="mx-auto grid max-w-6xl grid-cols-4">

          <BottomNavItem
            href="/customer/dashboard"
            icon="⌂"
            label="Home"
            active
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
            badge={
              actionRequiredCount > 0
                ? actionRequiredCount
                : undefined
            }
          />

          <BottomNavItem
            href="/customer/post-job"
            icon="+"
            label="New Job"
          />

        </div>

      </nav>

      {/* INSTALL APP MODAL */}

      {showInstallModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-sm"
          onClick={() =>
            setShowInstallModal(false)
          }
        >

          <div
            className="w-full max-w-md rounded-[28px] border border-white/[0.1] bg-[#080b08] p-6 shadow-2xl sm:p-7"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
                  Rapid Clear Solutions
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Install the app
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowInstallModal(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-lg font-black text-[#718067] transition hover:border-[#79c51c]/50 hover:text-[#79c51c]"
                aria-label="Close"
              >
                ×
              </button>

            </div>

            {installPrompt ? (
              <>
                <p className="mt-5 text-sm leading-6 text-[#87917f]">
                  Add Rapid Clear Solutions to your
                  home screen for quick access to your
                  customer portal.
                </p>

                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#79c51c] px-5 text-sm font-black text-[#050705] transition hover:bg-[#91db32]"
                >
                  INSTALL APP
                </button>
              </>
            ) : (
              <>
                <p className="mt-5 text-sm leading-6 text-[#87917f]">
                  You can add Rapid Clear Solutions
                  to your phone's home screen for
                  faster access.
                </p>

                <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#050705] p-4">

                  <p className="text-sm font-black">
                    On iPhone
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#718067]">
                    Open this website in Safari,
                    tap the Share button, then choose
                    <span className="font-bold text-[#c6d0c2]">
                      {" Add to Home Screen"}
                    </span>.
                  </p>

                </div>

                <div className="mt-3 rounded-2xl border border-white/[0.07] bg-[#050705] p-4">

                  <p className="text-sm font-black">
                    On Android
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#718067]">
                    Open the browser menu and choose
                    <span className="font-bold text-[#c6d0c2]">
                      {" Install app"}
                    </span>
                    {" or "}
                    <span className="font-bold text-[#c6d0c2]">
                      {"Add to Home screen"}
                    </span>.
                  </p>

                </div>
              </>
            )}

            <button
              type="button"
              onClick={() =>
                setShowInstallModal(false)
              }
              className="mt-4 w-full rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-bold text-[#b4beb0] transition hover:border-[#79c51c]/50 hover:text-[#79c51c]"
            >
              Maybe later
            </button>

          </div>

        </div>
      )}

    </main>
  );
}

/*
 * =========================================================
 * ACTIVE JOB CARD
 * =========================================================
 */

function ActiveJobCard({
  job,
}: {
  job: Job;
}) {
  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="group block rounded-2xl border border-[#79c51c]/30 bg-[#080b08] p-5 transition hover:border-[#79c51c]/70 active:scale-[0.99]"
    >

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
          RCS
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="truncate text-xs font-black uppercase tracking-wide text-[#79c51c]">
                {job.reference ||
                  `RC-${String(job.id).padStart(6, "0")}`}
              </p>

              <h3 className="mt-1 truncate font-black">
                {job.job_type ||
                  "Waste Collection"}
              </h3>

            </div>

            <StatusBadge
              status={job.status || "assigned"}
            />

          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <MiniDetail
              label="Date"
              value={
                job.preferred_date
                  ? formatDate(job.preferred_date)
                  : "Not set"
              }
            />

            <MiniDetail
              label="Time"
              value={
                job.preferred_time ||
                "Not set"
              }
            />

          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">

            <span className="text-xs font-bold text-[#667160]">
              {job.postcode ||
                "Location not provided"}
            </span>

            <span className="text-sm font-black text-[#79c51c] transition group-hover:translate-x-1">
              View →
            </span>

          </div>

        </div>

      </div>

    </Link>
  );
}

/*
 * =========================================================
 * CANCELLED JOB CARD
 * =========================================================
 */

function CancelledJobCard({
  job,
}: {
  job: Job;
}) {
  const reason =
    job.cancellation_reason ||
    DEFAULT_CANCELLATION_REASON;

  const whatsappUrl =
    `https://wa.me/${WHATSAPP_NUMBER}?text=` +
    encodeURIComponent(
      `Hi RCS, I need help with my cancelled collection ${
        job.reference ||
        `RC-${String(job.id).padStart(6, "0")}`
      }.`
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-red-900/50 bg-[#0d0909]">

      <Link
        href={`/customer/jobs/${job.id}`}
        className="group block p-5 transition hover:bg-[#120909]"
      >

        <div className="flex items-start gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-950/40 text-xs font-black text-red-300">
            RCS
          </div>

          <div className="min-w-0 flex-1">

            <div className="flex items-start justify-between gap-3">

              <div className="min-w-0">

                <p className="truncate text-xs font-black uppercase tracking-wide text-red-300">
                  {job.reference ||
                    `RC-${String(job.id).padStart(6, "0")}`}
                </p>

                <h3 className="mt-1 truncate font-black text-white">
                  {job.job_type ||
                    "Waste Collection"}
                </h3>

              </div>

              <StatusBadge status="cancelled" />

            </div>

            <p className="mt-4 text-sm leading-6 text-[#a99a9a]">
              {reason}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">

              {job.preferred_date && (
                <span className="text-xs font-bold text-[#716363]">
                  Collection date:{" "}
                  {formatDate(job.preferred_date)}
                </span>
              )}

              {job.postcode && (
                <span className="text-xs font-bold text-[#716363]">
                  {job.postcode}
                </span>
              )}

            </div>

          </div>

        </div>

      </Link>

      <div className="border-t border-red-900/30 bg-[#120909] p-4">

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#79c51c] px-5 text-sm font-black text-[#050705] transition hover:bg-[#91db32]"
        >
          Contact RCS on WhatsApp
        </a>

      </div>

    </article>
  );
}

/*
 * =========================================================
 * CUSTOMER JOB CARD
 * =========================================================
 */

function CustomerJobCard({
  job,
}: {
  job: Job;
}) {
  const status = normaliseStatus(job.status);

  const isCompleted =
    status === "completed" ||
    status === "complete";

  const isCancelled =
    status === "cancelled" ||
    status === "canceled";

  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className={`group block rounded-2xl border bg-[#080b08] p-4 transition active:scale-[0.99] ${
        isCancelled
          ? "border-red-900/40 hover:border-red-800/70"
          : "border-white/[0.07] hover:border-white/[0.14]"
      }`}
    >

      <div className="flex items-center gap-4">

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
            isCancelled
              ? "bg-red-950/40 text-red-300"
              : isCompleted
                ? "bg-white/[0.03] text-[#536050]"
                : "bg-[#79c51c]/10 text-[#79c51c]"
          }`}
        >
          RCS
        </div>

        <div className="min-w-0 flex-1">

          <p className="truncate text-sm font-black">
            {job.job_type ||
              "Waste Collection"}
          </p>

          <p className="mt-1 truncate text-xs text-[#667160]">
            {job.postcode ||
              "Postcode not provided"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">

            <StatusBadge
              status={job.status || "pending"}
            />

            {job.preferred_date && (
              <span className="truncate text-xs text-[#536050]">
                {formatDate(job.preferred_date)}
              </span>
            )}

          </div>

        </div>

        <div
          className={`shrink-0 text-xl font-black transition ${
            isCancelled
              ? "text-red-900 group-hover:text-red-400"
              : "text-[#4b5548] group-hover:text-[#79c51c]"
          }`}
        >
          →
        </div>

      </div>

    </Link>
  );
}

/*
 * =========================================================
 * QUICK ACTION
 * =========================================================
 */

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  primary = false,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[118px] flex-col justify-between rounded-2xl border p-4 transition active:scale-[0.98] ${
        primary
          ? "border-[#79c51c]/30 bg-[#0c1209] hover:border-[#79c51c]/60"
          : "border-white/[0.07] bg-[#080b08] hover:border-white/[0.14]"
      }`}
    >

      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${
          primary
            ? "bg-[#79c51c] text-[#050705]"
            : "bg-[#79c51c]/10 text-[#79c51c]"
        }`}
      >
        {icon}
      </span>

      <span>

        <span className="block text-sm font-black">
          {title}
        </span>

        <span className="mt-1 block text-xs text-[#718067]">
          {subtitle}
        </span>

      </span>

    </Link>
  );
}

/*
 * =========================================================
 * BOTTOM NAV
 * =========================================================
 */

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
      className={`relative flex min-h-[66px] flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${
        active
          ? "text-[#79c51c]"
          : "text-[#65705f] hover:text-[#b8c3b3]"
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

      <span>
        {label}
      </span>

    </Link>
  );
}

/*
 * =========================================================
 * SUMMARY ITEM
 * =========================================================
 */

function SummaryItem({
  value,
  label,
  border = false,
}: {
  value: number;
  label: string;
  border?: boolean;
}) {
  return (
    <div
      className={`px-3 py-5 text-center ${
        border
          ? "border-l border-white/[0.07]"
          : ""
      }`}
    >

      <p className="text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-bold text-[#667160]">
        {label}
      </p>

    </div>
  );
}

/*
 * =========================================================
 * MINI DETAIL
 * =========================================================
 */

function MiniDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[10px] font-black uppercase tracking-wide text-[#536050]">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-[#c7d0c3]">
        {value}
      </p>

    </div>
  );
}

/*
 * =========================================================
 * STATUS BADGE
 * =========================================================
 */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalised =
    normaliseStatus(status);

  let className =
    "border-white/10 bg-white/[0.04] text-[#b8c3b3]";

  let text = formatStatus(status);

  if (
    normalised === "pending" ||
    normalised === "new" ||
    normalised === "open"
  ) {
    className =
      "border-amber-900/60 bg-amber-950/30 text-amber-300";

    text =
      normalised === "new"
        ? "New"
        : "Waiting";
  }

  if (normalised === "bidding") {
    className =
      "border-blue-900/60 bg-blue-950/30 text-blue-300";

    text = "Quotes";
  }

  if (
    normalised === "assigned" ||
    normalised === "accepted" ||
    normalised === "booked"
  ) {
    className =
      "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";

    text = "Booked";
  }

  if (
    normalised === "in_progress" ||
    normalised === "in progress"
  ) {
    className =
      "border-blue-900/60 bg-blue-950/30 text-blue-300";

    text = "In Progress";
  }

  if (
    normalised === "completed" ||
    normalised === "complete"
  ) {
    className =
      "border-green-900/60 bg-green-950/30 text-green-300";

    text = "Completed";
  }

  if (
    normalised === "cancelled" ||
    normalised === "canceled"
  ) {
    className =
      "border-red-900/60 bg-red-950/30 text-red-300";

    text = "Cancelled";
  }

  if (normalised === "rejected") {
    className =
      "border-red-900/60 bg-red-950/30 text-red-300";

    text = "Rejected";
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${className}`}
    >
      {text}
    </span>
  );
}

/*
 * =========================================================
 * SECTION TITLE
 * =========================================================
 */

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4">

      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black sm:text-2xl">
        {title}
      </h2>

    </div>
  );
}

/*
 * =========================================================
 * EMPTY STATE
 * =========================================================
 */

function EmptyJobs() {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#080b08] px-5 py-12 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">
        RCS
      </div>

      <h3 className="mt-5 text-xl font-black">
        No jobs yet
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#718067]">
        Post a job and approved RCS drivers
        can send you quotes.
      </p>

      <Link
        href="/customer/post-job"
        className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[#79c51c] px-6 font-black text-[#050705] transition hover:bg-[#91db32]"
      >
        POST YOUR FIRST JOB
      </Link>

    </div>
  );
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normaliseStatus(
  status: string | null
) {
  return (status || "")
    .trim()
    .toLowerCase();
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(date: string) {
  const parsed = new Date(
    `${date}T00:00:00`
  );

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}