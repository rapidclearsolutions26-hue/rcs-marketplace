"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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

type AssignedDriver = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  vehicle_type: string | null;
  vehicle_registration: string | null;
  trading_name: string | null;
  company_name: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  text: string;
  href: string;
  type: "quote" | "collection" | "cancelled" | "completed";
};

type CollectionStage = "booked" | "on_way" | "collecting" | "completed";

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

const DEFAULT_CANCELLATION_REASON =
  "We're sorry, we couldn't find a driver for your collection. Unfortunately, we're unable to fulfil your waste collection at this time. We apologise for the inconvenience. You can contact RCS if you'd like us to help arrange an alternative collection.";

export default function CustomerDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignedDrivers, setAssignedDrivers] = useState<
    Record<string, AssignedDriver>
  >({});
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >([]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function checkInstalled() {
      const standalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

      const iosStandalone =
        "standalone" in window.navigator &&
        Boolean(
          (
            window.navigator as Navigator & {
              standalone?: boolean;
            }
          ).standalone,
        );

      setIsInstalled(standalone || iosStandalone);
    }

    try {
      const raw = window.localStorage.getItem(
        "rcs-dashboard-dismissed-notifications",
      );

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setDismissedNotifications(
            parsed.filter(
              (item): item is string => typeof item === "string",
            ),
          );
        }
      }
    } catch {
      // Ignore local storage errors.
    }

    checkInstalled();

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    window.addEventListener("appinstalled", checkInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      window.removeEventListener("appinstalled", checkInstalled);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "rcs-dashboard-dismissed-notifications",
        JSON.stringify(dismissedNotifications),
      );
    } catch {
      // Ignore local storage errors.
    }
  }, [dismissedNotifications]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date()),
      30000,
    );

    return () => window.clearInterval(timer);
  }, []);

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
          setErrorMessage(
            "We couldn't verify your customer account.",
          );
          return;
        }

        if (!user) {
          router.replace("/customer/login");
          return;
        }

        setAccountEmail(user.email || "");

        setAccountName(
          String(
            user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "",
          ).trim(),
        );

        const { data, error } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          setErrorMessage(
            error.message || "We couldn't load your jobs.",
          );
          return;
        }

        const nextJobs = (data || []) as Job[];

        setJobs(nextJobs);

        const assignedIds = Array.from(
          new Set(
            nextJobs
              .map((job) => job.assigned_driver_id)
              .filter(
                (id): id is string => Boolean(id),
              ),
          ),
        );

        if (assignedIds.length > 0) {
          const { data: drivers, error: driverError } =
            await supabase
              .from("drivers")
              .select(
                "id, full_name, phone, email, vehicle_type, vehicle_registration, trading_name, company_name",
              )
              .in("id", assignedIds);

          if (!driverError) {
            const driverMap: Record<
              string,
              AssignedDriver
            > = {};

            ((drivers || []) as AssignedDriver[]).forEach(
              (driver) => {
                driverMap[driver.id] = driver;
              },
            );

            setAssignedDrivers(driverMap);
          } else {
            setAssignedDrivers({});
          }
        } else {
          setAssignedDrivers({});
        }

        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error(
          "Customer dashboard error:",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong loading your dashboard.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(
      () => void loadDashboard(true),
      15000,
    );

    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const pendingJobs = useMemo(
    () =>
      jobs.filter((job) =>
        ["pending", "new", "open"].includes(
          normaliseStatus(job.status),
        ),
      ),
    [jobs],
  );

  const biddingJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          normaliseStatus(job.status) === "bidding",
      ),
    [jobs],
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = normaliseStatus(job.status);
        const journey = normaliseStatus(
          job.journey_status,
        );

        return (
          [
            "assigned",
            "accepted",
            "booked",
            "in_progress",
            "in progress",
            "on_the_way",
            "on the way",
            "driver_on_way",
            "driver on way",
          ].includes(status) ||
          [
            "on_the_way",
            "on the way",
            "driver_on_way",
            "driver on way",
            "in_progress",
            "in progress",
            "collecting",
            "arrived",
          ].includes(journey)
        );
      }),
    [jobs],
  );

  const completedJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = normaliseStatus(job.status);
        const journey = normaliseStatus(
          job.journey_status,
        );

        return (
          ["completed", "complete"].includes(status) ||
          journey === "completed"
        );
      }),
    [jobs],
  );

  const cancelledJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = normaliseStatus(job.status);
        const journey = normaliseStatus(
          job.journey_status,
        );

        return (
          ["cancelled", "canceled"].includes(status) ||
          ["cancelled", "canceled"].includes(journey)
        );
      }),
    [jobs],
  );

  const recentJobs = jobs.slice(0, 4);

  const notifications = useMemo<NotificationItem[]>(
    () => {
      const items: NotificationItem[] = [];

      if (biddingJobs.length > 0) {
        items.push({
          id: `quotes-${biddingJobs
            .map((job) => job.id)
            .join("-")}`,
          type: "quote",
          title:
            biddingJobs.length === 1
              ? "Driver quote waiting"
              : `${biddingJobs.length} driver quotes waiting`,
          text:
            "Review the quotes from approved RCS drivers.",
          href: "/customer/quotes",
        });
      }

      activeJobs.slice(0, 3).forEach((job) => {
        const stage = getCollectionStage(job);

        items.push({
          id: `active-${job.id}-${job.status}-${job.journey_status}`,
          type: "collection",
          title:
            stage === "on_way"
              ? "Driver on the way"
              : "Collection active",
          text: `${
            job.reference || `Job #${job.id}`
          } is active in your customer portal.`,
          href: `/customer/jobs/${job.id}`,
        });
      });

      cancelledJobs.slice(0, 2).forEach((job) => {
        items.push({
          id: `cancelled-${job.id}-${
            job.cancelled_at || job.status
          }`,
          type: "cancelled",
          title: "Collection cancelled",
          text:
            "Open the job for the cancellation details and support options.",
          href: `/customer/jobs/${job.id}`,
        });
      });

      completedJobs.slice(0, 2).forEach((job) => {
        items.push({
          id: `completed-${job.id}-${job.status}`,
          type: "completed",
          title: "Collection completed",
          text: `${
            job.reference || `Job #${job.id}`
          } has been completed.`,
          href: `/customer/jobs/${job.id}`,
        });
      });

      return items;
    },
    [
      activeJobs,
      biddingJobs,
      cancelledJobs,
      completedJobs,
    ],
  );

  const visibleNotifications = notifications.filter(
    (notification) =>
      !dismissedNotifications.includes(notification.id),
  );

  function dismissNotification(id: string) {
    setDismissedNotifications((current) =>
      Array.from(new Set([...current, id])),
    );
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/customer/login");
      router.refresh();
    }
  }

  async function handleInstallApp() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();

        const choice =
          await installPrompt.userChoice;

        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
        }
      } catch (error) {
        console.error(
          "PWA install error:",
          error,
        );
      }

      return;
    }

    window.alert(
      "On iPhone: open this website in Safari, tap Share, then choose Add to Home Screen.",
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />

            <p className="mt-5 text-base font-black">
              Loading your dashboard
            </p>

            <p className="mt-2 text-sm text-[#687d73]">
              Checking your jobs and quotes
            </p>
          </div>
        </div>
      </main>
    );
  }

  const first = firstName(accountName);

  const primaryJob =
    activeJobs[0] ||
    biddingJobs[0] ||
    pendingJobs[0] ||
    null;

  return (
    <main className="min-h-screen bg-[#050705] pb-24 text-white">
      {/* HEADER */}
      <header className="pwa-header sticky top-0 z-50 border-b border-white/[0.07] bg-[#080b08]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={180}
              height={56}
              priority
              className="h-9 w-auto object-contain sm:h-10"
            />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setShowNotifications(true)
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.09] bg-[#0a0e0a] text-lg transition active:scale-95"
              aria-label="Notifications"
            >
              <span className="text-[#aabbb4]">
                ●
              </span>

              {visibleNotifications.length >
                0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#79c51c] px-1 text-[9px] font-black text-[#050705]">
                  {visibleNotifications.length >
                  9
                    ? "9+"
                    : visibleNotifications.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="hidden h-10 rounded-xl border border-white/[0.09] px-4 text-xs font-black text-[#aabbb4] transition hover:border-[#79c51c] hover:text-[#79c51c] sm:block"
            >
              LOG OUT
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* WELCOME */}
        <section className="pt-7 sm:pt-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
            RCS CUSTOMER PORTAL
          </p>

          <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.04em] sm:text-4xl">
            Good{" "}
            {getTimeGreeting(now)}
            {first ? `, ${first}` : ""}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#71857b] sm:text-base">
            Manage your waste collections, quotes and
            support from one place.
          </p>
        </section>

        {/* PRIMARY CTA */}
        <section className="mt-6">
          <Link
            href="/customer/post-job"
            className="group relative block overflow-hidden rounded-[26px] border border-[#79c51c]/30 bg-[#0d170b] p-5 shadow-[0_15px_50px_rgba(0,0,0,0.35)] transition active:scale-[0.99] sm:p-7"
          >
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#79c51c]/10 blur-2xl" />

            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
                  Need a collection?
                </p>

                <h2 className="mt-1.5 text-2xl font-black sm:text-3xl">
                  Get a Quote
                </h2>

                <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#83968d] sm:text-sm">
                  Post your waste job and receive quotes
                  from approved RCS drivers.
                </p>
              </div>

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c] text-xl font-black text-[#050705] shadow-lg sm:h-14 sm:w-14">
                →
              </span>
            </div>
          </Link>
        </section>

        {/* ACTION REQUIRED */}
        {biddingJobs.length > 0 && (
          <section className="mt-5">
            <Link
              href="/customer/quotes"
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#79c51c]/40 bg-[#0b1309] p-4 transition active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#79c51c] text-sm font-black text-[#050705]">
                  {biddingJobs.length}
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-black">
                    Driver quotes waiting
                  </p>

                  <p className="mt-0.5 truncate text-xs text-[#71857b]">
                    Tap to compare your quotes
                  </p>
                </div>
              </div>

              <span className="text-xl font-black text-[#79c51c]">
                →
              </span>
            </Link>
          </section>
        )}

        {/* ACTIVE JOB */}
        {activeJobs.length > 0 && (
          <section className="mt-7">
            <SectionHeading
              eyebrow="COLLECTION"
              title="Your active job"
            />

            <CustomerActiveJobCard
              job={activeJobs[0]}
              driver={
                activeJobs[0]
                  .assigned_driver_id
                  ? assignedDrivers[
                      activeJobs[0]
                        .assigned_driver_id
                    ] || null
                  : null
              }
              now={now}
            />

            {activeJobs.length > 1 && (
              <Link
                href="/customer/jobs"
                className="mt-3 block text-center text-xs font-black text-[#79c51c]"
              >
                View all active jobs →
              </Link>
            )}
          </section>
        )}

        {/* QUICK ACCESS */}
        <section className="mt-7">
          <SectionHeading
            eyebrow="QUICK ACCESS"
            title="Your account"
          />

          <div className="grid grid-cols-2 gap-3">
            <QuickCard
              href="/customer/jobs"
              title="My Jobs"
              value={jobs.length}
              description="View jobs"
            />

            <QuickCard
              href="/customer/quotes"
              title="My Quotes"
              value={biddingJobs.length}
              description="View quotes"
              highlight={
                biddingJobs.length > 0
              }
            />

            <QuickCard
              href="/customer/support"
              title="RCS Support"
              description="Chat with us"
              icon="CHAT"
            />

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              className="rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-4 text-left transition active:scale-[0.98] hover:border-[#79c51c]/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#79c51c]/10 text-[9px] font-black text-[#79c51c]">
                ↻
              </span>

              <p className="mt-3 text-sm font-black">
                Refresh
              </p>

              <p className="mt-1 text-[11px] text-[#687d73]">
                {refreshing
                  ? "Updating..."
                  : "Check for updates"}
              </p>
            </button>
          </div>
        </section>

        {/* RECENT JOBS */}
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              eyebrow="RECENT ACTIVITY"
              title="Recent jobs"
            />

            {jobs.length > 0 && (
              <Link
                href="/customer/jobs"
                className="pb-5 text-xs font-black text-[#79c51c]"
              >
                View all
              </Link>
            )}
          </div>

          {recentJobs.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              description="Post your first waste collection and receive quotes from approved RCS drivers."
              href="/customer/post-job"
              action="Post your first job"
            />
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <CompactJobCard
                  key={job.id}
                  job={job}
                />
              ))}
            </div>
          )}
        </section>

        {/* ACCOUNT */}
        <section className="mt-8">
          <div className="rounded-2xl border border-white/[0.08] bg-[#080b08] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#79c51c] text-sm font-black text-[#050705]">
                {getInitials(accountName)}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black">
                  {accountName || "Customer"}
                </p>

                <p className="truncate text-xs text-[#687d73]">
                  {accountEmail ||
                    "Email unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat
                label="Waiting"
                value={pendingJobs.length}
              />

              <MiniStat
                label="Completed"
                value={completedJobs.length}
              />

              <MiniStat
                label="Cancelled"
                value={cancelledJobs.length}
              />

              <MiniStat
                label="Total jobs"
                value={jobs.length}
              />
            </div>
          </div>
        </section>

        {/* INSTALL APP */}
        {!isInstalled && (
          <section className="mt-5">
            <button
              type="button"
              onClick={() =>
                void handleInstallApp()
              }
              className="w-full rounded-2xl border border-white/[0.08] bg-[#080b08] p-4 text-left transition active:scale-[0.99] hover:border-[#79c51c]/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
                  APP
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">
                    Add RCS to your home screen
                  </p>

                  <p className="mt-0.5 text-xs text-[#687d73]">
                    Use your customer portal like an app.
                  </p>
                </div>

                <span className="text-[#79c51c]">
                  →
                </span>
              </div>
            </button>
          </section>
        )}

        {/* SUPPORT */}
        <section className="mt-5">
          <Link
            href="/customer/support"
            className="block rounded-2xl border border-[#79c51c]/20 bg-[#0a0e0a] p-5 transition active:scale-[0.99] hover:border-[#79c51c]/50"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
              RCS SUPPORT
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">
                  Need help?
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#71857b]">
                  Message the RCS team directly from your account.
                </p>
              </div>

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#79c51c] text-sm font-black text-[#050705]">
                →
              </span>
            </div>
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-white/[0.07] py-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#4f5e57]">
            Rapid Clear Solutions
          </p>

          <p className="mt-1 text-[10px] text-[#3f4944]">
            {lastUpdatedAt
              ? `Updated ${formatRelativeTime(
                  lastUpdatedAt,
                  now,
                )}`
              : "Live customer dashboard"}
          </p>
        </footer>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#080b08]/96 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          <BottomNavItem
            href="/customer/dashboard"
            label="Home"
            icon="⌂"
            active
          />

          <BottomNavItem
            href="/customer/jobs"
            label="Jobs"
            icon="▣"
          />

          <BottomNavItem
            href="/customer/quotes"
            label="Quotes"
            icon="£"
            badge={
              biddingJobs.length > 0
                ? biddingJobs.length
                : undefined
            }
          />

          <BottomNavItem
            href="/customer/post-job"
            label="Get a Quote"
            icon="+"
            accent
          />
        </div>
      </nav>

      {/* NOTIFICATIONS */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() =>
            setShowNotifications(false)
          }
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-white/[0.12] bg-[#0a0e0a] shadow-2xl sm:rounded-3xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
                  RCS UPDATES
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Notifications
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNotifications(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.12] text-xl text-[#6b7280] hover:border-[#79c51c] hover:text-white"
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {visibleNotifications.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#080b08] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
                    RCS
                  </div>

                  <p className="mt-4 text-sm font-black">
                    You are all caught up
                  </p>

                  <p className="mt-1 text-xs text-[#6b7280]">
                    No current dashboard updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleNotifications.map(
                    (notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onDismiss={() =>
                          dismissNotification(
                            notification.id,
                          )
                        }
                        onOpen={() =>
                          setShowNotifications(
                            false,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {errorMessage && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-md">
          <div className="rounded-2xl border border-red-900/60 bg-[#230e0e] p-4 shadow-2xl">
            <p className="text-sm font-bold text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              className="mt-2 text-xs font-black text-red-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

function QuickCard({
  href,
  title,
  value,
  description,
  highlight = false,
  icon,
}: {
  href: string;
  title: string;
  value?: number;
  description: string;
  highlight?: boolean;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 transition active:scale-[0.98] ${
        highlight
          ? "border-[#79c51c]/50 bg-[#0d170b]"
          : "border-white/[0.08] bg-[#0a0e0a]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black ${
            highlight
              ? "bg-[#79c51c] text-[#050705]"
              : "bg-[#79c51c]/10 text-[#79c51c]"
          }`}
        >
          {icon || value || 0}
        </span>

        <span className="text-sm text-[#4f6258]">
          →
        </span>
      </div>

      <p className="mt-3 text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-[11px] text-[#687d73]">
        {description}
      </p>
    </Link>
  );
}

function CompactJobCard({
  job,
}: {
  job: Job;
}) {
  const status = normaliseStatus(job.status);

  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="block rounded-2xl border border-white/[0.08] bg-[#0a0e0a] p-4 transition active:scale-[0.99] hover:border-[#79c51c]/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-[10px] font-black text-[#79c51c]">
          RCS
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-black">
              {job.job_type ||
                "Waste Collection"}
            </p>

            <StatusBadge
              status={
                job.status || "pending"
              }
            />
          </div>

          <p className="mt-1 truncate text-[11px] text-[#687d73]">
            {job.reference ||
              `RC-${String(job.id).padStart(
                6,
                "0",
              )}`}
            {job.postcode
              ? ` • ${job.postcode}`
              : ""}
          </p>
        </div>

        <span className="text-sm font-black text-[#4f6258]">
          →
        </span>
      </div>
    </Link>
  );
}

function CustomerActiveJobCard({
  job,
  driver,
  now,
}: {
  job: Job;
  driver: AssignedDriver | null;
  now: Date;
}) {
  const stage = getCollectionStage(job);

  const countdown =
    getCollectionCountdown(
      job.preferred_date,
      job.preferred_time,
      now,
    );

  return (
    <div className="overflow-hidden rounded-[26px] border border-[#79c51c]/40 bg-[#0a0e0a] shadow-[0_15px_50px_rgba(0,0,0,0.3)]">
      <div className="bg-[#0c1209] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
              {job.reference ||
                `RC-${String(job.id).padStart(
                  6,
                  "0",
                )}`}
            </p>

            <h3 className="mt-1.5 truncate text-lg font-black sm:text-xl">
              {job.job_type ||
                "Waste Collection"}
            </h3>
          </div>

          <StatusBadge
            status={job.status || "assigned"}
          />
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-2">
          <InfoBox
            label="DATE"
            value={
              job.preferred_date
                ? formatDate(
                    job.preferred_date,
                  )
                : "Not provided"
            }
          />

          <InfoBox
            label="TIME"
            value={
              job.preferred_time ||
              "Any time"
            }
          />
        </div>

        {countdown && (
          <div className="rounded-2xl border border-[#79c51c]/30 bg-[#79c51c]/[0.06] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#687d73]">
              COLLECTION COUNTDOWN
            </p>

            <p className="mt-1 text-lg font-black text-[#79c51c]">
              {countdown}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-[#07130e] p-4">
          <p className="text-xs font-black">
            Collection progress
          </p>

          <CollectionTracker
            stage={stage}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoBox
            label="LOCATION"
            value={
              job.postcode ||
              "Not provided"
            }
          />

          <InfoBox
            label="LOAD"
            value={
              job.load_size ||
              "Not specified"
            }
          />
        </div>

        {driver && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#07130e] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#79c51c]">
              YOUR DRIVER
            </p>

            <p className="mt-1 text-base font-black">
              {driver.trading_name ||
                driver.company_name ||
                driver.full_name ||
                "RCS Driver"}
            </p>

            <p className="mt-1 text-xs text-[#687d73]">
              {driver.vehicle_type ||
                "RCS vehicle"}

              {driver.vehicle_registration
                ? ` • ${driver.vehicle_registration}`
                : ""}
            </p>

            <div className="mt-3 flex gap-2">
              {driver.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="flex-1 rounded-xl border border-white/[0.1] px-3 py-3 text-center text-xs font-black"
                >
                  Call Driver
                </a>
              )}

              <Link
                href={`/customer/jobs/${job.id}`}
                className="flex-1 rounded-xl bg-[#79c51c] px-3 py-3 text-center text-xs font-black text-[#050705]"
              >
                Manage Job
              </Link>
            </div>
          </div>
        )}

        {!driver && (
          <Link
            href={`/customer/jobs/${job.id}`}
            className="block w-full rounded-xl bg-[#79c51c] px-5 py-3.5 text-center text-sm font-black text-[#050705]"
          >
            View Job
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-[#08150f] p-3">
      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#5d7067]">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-[#e4e4e7]">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0e0a] p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-[#58675f]">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}

function BottomNavItem({
  href,
  label,
  icon,
  active = false,
  accent = false,
  badge,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  accent?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative flex min-h-[54px] flex-col items-center justify-center rounded-xl"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black ${
          accent
            ? "bg-[#79c51c] text-[#050705]"
            : active
              ? "bg-[#79c51c]/10 text-[#79c51c]"
              : "text-[#62746b]"
        }`}
      >
        {icon}
      </span>

      <span
        className={`mt-0.5 text-[9px] font-black ${
          active || accent
            ? "text-[#79c51c]"
            : "text-[#62746b]"
        }`}
      >
        {label}
      </span>

      {badge !== undefined && (
        <span className="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#79c51c] px-1 text-[8px] font-black text-[#050705]">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#080b08] px-5 py-9 text-center">
      <div className="mx-auto h-1.5 w-12 rounded-full bg-[#79c51c]" />

      <h3 className="mt-4 text-lg font-black">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#71857b]">
        {description}
      </p>

      <Link
        href={href}
        className="mt-5 inline-flex rounded-xl bg-[#79c51c] px-5 py-3 text-xs font-black text-[#050705]"
      >
        {action}
      </Link>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalised =
    normaliseStatus(status);

  let label = formatStatus(status);

  let className =
    "border-white/[0.12] bg-[#18271f] text-[#d4d4d8]";

  if (
    ["pending", "new", "open"].includes(
      normalised,
    )
  ) {
    label =
      normalised === "new"
        ? "NEW"
        : "WAITING";

    className =
      "border-amber-700/40 bg-amber-900/20 text-amber-300";
  }

  if (normalised === "bidding") {
    label = "BIDDING";

    className =
      "border-blue-700/40 bg-blue-900/20 text-blue-300";
  }

  if (
    ["assigned", "accepted", "booked"].includes(
      normalised,
    )
  ) {
    label = "BOOKED";

    className =
      "border-[#79c51c] bg-[#0c1209] text-[#79c51c]";
  }

  if (
    [
      "on_the_way",
      "on the way",
      "driver_on_way",
      "driver on way",
    ].includes(normalised)
  ) {
    label = "ON THE WAY";

    className =
      "border-blue-700/40 bg-blue-900/20 text-blue-300";
  }

  if (
    [
      "in_progress",
      "in progress",
      "collecting",
      "arrived",
    ].includes(normalised)
  ) {
    label = "IN PROGRESS";

    className =
      "border-blue-700/40 bg-blue-900/20 text-blue-300";
  }

  if (
    ["completed", "complete"].includes(
      normalised,
    )
  ) {
    label = "COMPLETED";

    className =
      "border-[#79c51c] bg-[#0c1209] text-[#79c51c]";
  }

  if (
    [
      "cancelled",
      "canceled",
      "rejected",
    ].includes(normalised)
  ) {
    label =
      normalised === "rejected"
        ? "REJECTED"
        : "CANCELLED";

    className =
      "border-red-900/60 bg-red-900/20 text-red-300";
  }

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${className}`}
    >
      {label}
    </span>
  );
}

function CollectionTracker({
  stage,
}: {
  stage: CollectionStage;
}) {
  const stages: {
    key: CollectionStage;
    label: string;
  }[] = [
    {
      key: "booked",
      label: "Booked",
    },
    {
      key: "on_way",
      label: "On way",
    },
    {
      key: "collecting",
      label: "Collecting",
    },
    {
      key: "completed",
      label: "Done",
    },
  ];

  const currentIndex =
    stages.findIndex(
      (item) => item.key === stage,
    );

  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5">
      {stages.map((item, index) => {
        const active =
          currentIndex >= index;

        return (
          <div key={item.key}>
            <div
              className={`h-1.5 rounded-full ${
                active
                  ? "bg-[#79c51c]"
                  : "bg-white/[0.08]"
              }`}
            />

            <p
              className={`mt-1.5 truncate text-[8px] font-black uppercase tracking-wider ${
                active
                  ? "text-[#79c51c]"
                  : "text-[#58675f]"
              }`}
            >
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
  onOpen,
}: {
  notification: NotificationItem;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#080b08] p-4">
      <p className="text-sm font-black">
        {notification.title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#6b7280]">
        {notification.text}
      </p>

      <div className="mt-3 flex gap-2">
        <Link
          href={notification.href}
          onClick={onOpen}
          className="rounded-xl bg-[#79c51c] px-4 py-2.5 text-xs font-black text-[#050705]"
        >
          View
        </Link>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-white/[0.12] px-4 py-2.5 text-xs font-black text-[#6b7280]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function getCollectionStage(
  job: Job,
): CollectionStage {
  const status =
    normaliseStatus(job.status);

  const journey =
    normaliseStatus(
      job.journey_status,
    );

  if (
    ["completed", "complete"].includes(
      status,
    ) ||
    journey === "completed"
  ) {
    return "completed";
  }

  if (
    [
      "in_progress",
      "in progress",
      "collecting",
      "arrived",
    ].includes(status) ||
    [
      "in_progress",
      "in progress",
      "collecting",
      "arrived",
    ].includes(journey)
  ) {
    return "collecting";
  }

  if (
    [
      "on_the_way",
      "on the way",
      "driver_on_way",
      "driver on way",
    ].includes(status) ||
    [
      "on_the_way",
      "on the way",
      "driver_on_way",
      "driver on way",
    ].includes(journey)
  ) {
    return "on_way";
  }

  return "booked";
}

function getCollectionCountdown(
  date: string | null,
  time: string | null,
  now: Date,
) {
  if (!date) return null;

  const target = parseCollectionDate(
    date,
    time,
  );

  if (!target) {
    return formatDate(date);
  }

  const difference =
    target.getTime() - now.getTime();

  if (difference <= 0) {
    return difference >
      -(1000 * 60 * 60 * 24)
      ? "Collection due now"
      : null;
  }

  const totalMinutes = Math.max(
    1,
    Math.round(
      difference / (1000 * 60),
    ),
  );

  const days = Math.floor(
    totalMinutes / (60 * 24),
  );

  const hours = Math.floor(
    (totalMinutes % (60 * 24)) / 60,
  );

  if (days > 0) {
    return `${days}d ${hours}h until collection`;
  }

  if (hours > 0) {
    return `${hours}h until collection`;
  }

  return `${totalMinutes}m until collection`;
}

function parseCollectionDate(
  date: string,
  time: string | null,
) {
  const trimmed =
    String(time || "").trim();

  if (
    !trimmed ||
    normaliseStatus(trimmed) ===
      "any time"
  ) {
    return new Date(
      `${date}T12:00:00`,
    );
  }

  const match = trimmed.match(
    /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i,
  );

  if (!match) {
    return new Date(
      `${date}T12:00:00`,
    );
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);

  const meridiem =
    match[3]?.toUpperCase();

  if (
    meridiem === "PM" &&
    hours < 12
  ) {
    hours += 12;
  }

  if (
    meridiem === "AM" &&
    hours === 12
  ) {
    hours = 0;
  }

  return new Date(
    `${date}T${String(hours).padStart(
      2,
      "0",
    )}:${String(minutes).padStart(
      2,
      "0",
    )}:00`,
  );
}

function normaliseStatus(
  status: string | null,
) {
  return (
    status?.trim().toLowerCase() ||
    ""
  );
}

function formatStatus(
  status: string,
) {
  return status
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatDate(date: string) {
  const parsed = new Date(
    `${date}T00:00:00`,
  );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-GB",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatRelativeTime(
  value: Date,
  now: Date,
) {
  const difference = Math.max(
    0,
    Math.floor(
      (now.getTime() -
        value.getTime()) /
        1000,
    ),
  );

  if (difference < 5) {
    return "just now";
  }

  if (difference < 60) {
    return `${difference}s ago`;
  }

  const minutes = Math.floor(
    difference / 60,
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  return `${Math.floor(
    minutes / 60,
  )}h ago`;
}

function firstName(value: string) {
  return (
    value.trim().split(/\s+/)[0] ||
    value
  );
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "RCS";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getTimeGreeting(
  date: Date,
) {
  const hour = date.getHours();

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}