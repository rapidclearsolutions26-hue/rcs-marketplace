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

type DashboardNotification = {
  id: string;
  type: "quotes" | "collection" | "cancelled" | "completed" | "general";
  title: string;
  text: string;
  href: string;
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

const WHATSAPP_NUMBER = "447555980651";

const DEFAULT_CANCELLATION_REASON =
  "We're sorry, we couldn't find a driver for your collection. Unfortunately, we're unable to fulfil your waste collection at this time. We apologise for the inconvenience. You can contact RCS if you'd like us to help arrange an alternative collection.";

export default function CustomerDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignedDrivers, setAssignedDrivers] = useState<Record<string, AssignedDriver>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountName, setAccountName] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function checkInstalled() {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone =
        "standalone" in window.navigator &&
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      setIsInstalled(standalone || iosStandalone);
    }

    function loadDismissedNotifications() {
      try {
        const raw = window.localStorage.getItem("rcs-dashboard-dismissed-notifications");
        if (!raw) return;
        const value: unknown = JSON.parse(raw);
        if (Array.isArray(value)) {
          setDismissedNotifications(value.filter((item): item is string => typeof item === "string"));
        }
      } catch {
        // Ignore local storage errors.
      }
    }

    checkInstalled();
    loadDismissedNotifications();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", checkInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", checkInstalled);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "rcs-dashboard-dismissed-notifications",
        JSON.stringify(dismissedNotifications),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [dismissedNotifications]);

  async function handleInstallApp() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
          setShowInstallModal(false);
        }
      } catch (error) {
        console.error("PWA install error:", error);
      }
      return;
    }

    setShowInstallModal(true);
  }

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          setErrorMessage("We couldn't verify your customer account.");
          return;
        }

        if (!user) {
          router.replace("/customer/login");
          return;
        }

        setAccountEmail(user.email || "");
        setAccountName(
          String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim(),
        );

        const { data, error } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          setErrorMessage(error.message || "We couldn't load your jobs.");
          return;
        }

        const nextJobs = (data || []) as Job[];
        setJobs(nextJobs);

        const assignedIds = Array.from(
          new Set(
            nextJobs
              .map((job) => job.assigned_driver_id)
              .filter((id): id is string => Boolean(id)),
          ),
        );

        if (assignedIds.length > 0) {
          const { data: drivers, error: driverError } = await supabase
            .from("drivers")
            .select(
              "id, full_name, phone, email, vehicle_type, vehicle_registration, trading_name, company_name",
            )
            .in("id", assignedIds);

          if (!driverError) {
            const map: Record<string, AssignedDriver> = {};
            ((drivers || []) as AssignedDriver[]).forEach((driver) => {
              map[driver.id] = driver;
            });
            setAssignedDrivers(map);
          } else {
            console.warn("Assigned driver lookup unavailable:", driverError);
          }
        } else {
          setAssignedDrivers({});
        }

        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error("Customer dashboard error:", error);
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
    const interval = window.setInterval(() => {
      void loadDashboard(true);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.replace("/customer/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setErrorMessage("Unable to log out. Please try again.");
    }
  }

  const pendingJobs = useMemo(
    () =>
      jobs.filter((job) => ["pending", "new", "open"].includes(normaliseStatus(job.status))),
    [jobs],
  );

  const biddingJobs = useMemo(
    () => jobs.filter((job) => normaliseStatus(job.status) === "bidding"),
    [jobs],
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = normaliseStatus(job.status);
        const journey = normaliseStatus(job.journey_status);
        return [
          "assigned",
          "accepted",
          "booked",
          "in_progress",
          "in progress",
          "on_the_way",
          "on the way",
          "driver_on_way",
        ].includes(status) || [
          "on_the_way",
          "on the way",
          "driver_on_way",
          "in_progress",
          "in progress",
          "collecting",
          "arrived",
        ].includes(journey);
      }),
    [jobs],
  );

  const completedJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = normaliseStatus(job.status);
        const journey = normaliseStatus(job.journey_status);
        return ["completed", "complete"].includes(status) || journey === "completed";
      }),
    [jobs],
  );

  const cancelledJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = normaliseStatus(job.status);
        const journey = normaliseStatus(job.journey_status);
        return (
          ["cancelled", "canceled"].includes(status) ||
          ["cancelled", "canceled"].includes(journey)
        );
      }),
    [jobs],
  );

  const featuredActiveJob = activeJobs[0] || null;
  const actionRequiredCount = biddingJobs.length;

  const smartAction = useMemo(() => {
    if (biddingJobs.length > 0) {
      return {
        type: "quotes" as const,
        eyebrow: "Action required",
        title: biddingJobs.length === 1 ? "You have a quote waiting" : `${biddingJobs.length} quotes are waiting`,
        text: "Review the available driver quotes and choose what works for you.",
        button: "REVIEW QUOTES",
        href: "/customer/quotes",
      };
    }

    if (featuredActiveJob) {
      const stage = getCollectionStage(featuredActiveJob);
      return {
        type: stage === "completed" ? ("completed" as const) : ("collection" as const),
        eyebrow: stage === "on_way" ? "Driver update" : "Next up",
        title:
          stage === "on_way"
            ? "Your driver is on the way"
            : stage === "collecting"
              ? "Your collection is in progress"
              : "Your collection is booked",
        text: "View your collection details and the latest job status.",
        button: "TRACK COLLECTION",
        href: `/customer/jobs/${featuredActiveJob.id}`,
      };
    }

    if (cancelledJobs.length > 0) {
      return {
        type: "cancelled" as const,
        eyebrow: "RCS update",
        title: "A previous collection was cancelled",
        text: "Need us to arrange another collection? Start a new waste job.",
        button: "POST A NEW JOB",
        href: "/customer/post-job",
      };
    }

    return {
      type: "general" as const,
      eyebrow: jobs.length === 0 ? "Get started" : "RCS Marketplace",
      title: jobs.length === 0 ? "Ready to clear some waste?" : "Need another collection?",
      text:
        jobs.length === 0
          ? "Post your waste-removal job in minutes and get it onto the RCS Marketplace."
          : "Post another waste-removal job whenever you are ready.",
      button: jobs.length === 0 ? "POST YOUR WASTE JOB" : "POST A NEW JOB",
      href: "/customer/post-job",
    };
  }, [biddingJobs, cancelledJobs.length, featuredActiveJob, jobs.length]);

  const notifications = useMemo<DashboardNotification[]>(() => {
    const list: DashboardNotification[] = [];

    if (biddingJobs.length > 0) {
      list.push({
        id: `quotes-${biddingJobs.map((job) => job.id).join("-")}`,
        type: "quotes",
        title: biddingJobs.length === 1 ? "New quote available" : `${biddingJobs.length} quotes available`,
        text: "Driver quotes are waiting for your review.",
        href: "/customer/quotes",
      });
    }

    activeJobs.slice(0, 3).forEach((job) => {
      const stage = getCollectionStage(job);
      list.push({
        id: `${stage}-${job.id}-${job.journey_status}-${job.status}`,
        type: "collection",
        title: stage === "on_way" ? "Driver on the way" : "Collection booked",
        text:
          stage === "on_way"
            ? `${job.reference || `Job #${job.id}`} is on the way to collection.`
            : `${job.reference || `Job #${job.id}`} is booked and active.`,
        href: `/customer/jobs/${job.id}`,
      });
    });

    cancelledJobs.slice(0, 2).forEach((job) => {
      list.push({
        id: `cancelled-${job.id}-${job.cancelled_at || job.status}`,
        type: "cancelled",
        title: "Collection cancelled",
        text: job.cancellation_reason || DEFAULT_CANCELLATION_REASON,
        href: `/customer/jobs/${job.id}`,
      });
    });

    completedJobs.slice(0, 2).forEach((job) => {
      list.push({
        id: `completed-${job.id}-${job.status}`,
        type: "completed",
        title: "Collection completed",
        text: `${job.reference || `Job #${job.id}`} has been marked completed.`,
        href: `/customer/jobs/${job.id}`,
      });
    });

    return list;
  }, [activeJobs, biddingJobs, cancelledJobs, completedJobs]);

  const visibleNotifications = notifications.filter(
    (notification) => !dismissedNotifications.includes(notification.id),
  );

  function dismissNotification(id: string) {
    setDismissedNotifications((current) =>
      Array.from(new Set([...current, id])),
    );
  }

  function clearNotifications() {
    setDismissedNotifications(notifications.map((notification) => notification.id));
  }

  const displayName = accountName || accountEmail || "Customer";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />
            <p className="mt-5 text-lg font-black">Loading your account...</p>
            <p className="mt-2 text-sm text-gray-600">Getting your latest jobs</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] pb-28 text-white">
      <header className="pwa-header sticky top-0 z-40 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center">
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
                className="hidden rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 py-2.5 text-xs font-black text-gray-300 transition hover:border-[#79c51c]/50 hover:text-[#79c51c] sm:block"
              >
                INSTALL APP
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.03] text-lg font-black text-gray-300 transition hover:border-[#79c51c]/50 hover:text-[#79c51c]"
              aria-label="Open notifications"
            >
              ◔
              {visibleNotifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#79c51c] px-1 text-[9px] font-black text-black">
                  {visibleNotifications.length > 9 ? "9+" : visibleNotifications.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className="hidden items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3 py-2 text-left transition hover:border-[#79c51c]/50 sm:flex"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#79c51c]/10 text-[10px] font-black text-[#79c51c]">
                {getInitials(displayName)}
              </span>
              <span className="max-w-[130px] truncate text-xs font-black text-gray-300">
                {displayName}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/[0.10] bg-white/[0.03] px-3.5 py-2.5 text-xs font-black text-gray-300 transition hover:border-[#79c51c]/50 hover:text-[#79c51c]"
            >
              LOG OUT
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
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
                  Welcome{accountName ? `, ${firstName(accountName)}` : ""}.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
                  Manage your collections, compare driver quotes and keep track of your RCS jobs.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-2 w-2 rounded-full bg-[#79c51c]" />
                {lastUpdatedAt ? `Updated ${formatRelativeTime(lastUpdatedAt, now)}` : "Updating"}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <SmartActionCard {...smartAction} />
        </section>

        <Link
          href="/customer/post-job"
          className="group mt-5 flex min-h-[76px] w-full items-center justify-between overflow-hidden rounded-2xl border border-[#79c51c]/30 bg-[#79c51c] px-5 text-[#050705] shadow-[0_12px_40px_rgba(121,197,28,0.08)] transition hover:bg-[#91db32] active:scale-[0.99] sm:px-7"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#050705]/10 text-2xl font-black">+</span>
            <div>
              <p className="text-base font-black sm:text-lg">POST A NEW JOB</p>
              <p className="mt-0.5 text-xs font-bold text-[#17220f]/70">Tell us what needs clearing</p>
            </div>
          </div>
          <span className="text-2xl font-black transition group-hover:translate-x-1">→</span>
        </Link>

        {actionRequiredCount > 0 && (
          <section className="mt-5">
            <Link
              href="/customer/quotes"
              className="group block overflow-hidden rounded-2xl border border-[#79c51c]/40 bg-[#0c1209] transition hover:border-[#79c51c] active:scale-[0.995]"
            >
              <div className="flex items-center gap-4 p-5 sm:p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c] text-xl font-black text-[#050705]">£</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">Action required</p>
                  <h2 className="mt-1 text-base font-black sm:text-lg">
                    {actionRequiredCount === 1 ? "1 driver quote is waiting" : `${actionRequiredCount} driver quotes are waiting`}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Review and compare your available quotes.</p>
                </div>
                <span className="text-2xl font-black text-[#79c51c] transition group-hover:translate-x-1">→</span>
              </div>
            </Link>
          </section>
        )}

        {featuredActiveJob && (
          <section className="mt-9">
            <SectionTitle eyebrow="Next up" title="Your collection" />
            <ActiveJobCard
              job={featuredActiveJob}
              driver={featuredActiveJob.assigned_driver_id ? assignedDrivers[featuredActiveJob.assigned_driver_id] || null : null}
              now={now}
            />
          </section>
        )}

        <section className="mt-9">
          <SectionTitle eyebrow="Quick access" title="What do you need?" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              href="/customer/quotes"
              icon="£"
              title="My Quotes"
              subtitle={actionRequiredCount > 0 ? `${actionRequiredCount} waiting` : "View quotes"}
              primary={actionRequiredCount > 0}
            />
            <QuickAction href="/customer/jobs" icon="▣" title="My Jobs" subtitle={`${jobs.length} total`} />
            <QuickAction href="/customer/post-job" icon="+" title="New Job" subtitle="Request collection" primary />
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={refreshing}
              className="flex min-h-[118px] flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#080b08] p-4 text-left transition hover:border-white/[0.14] active:scale-[0.98] disabled:opacity-60"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-xl font-black text-[#79c51c]">↻</span>
              <span>
                <span className="block text-sm font-black">{refreshing ? "Refreshing..." : "Refresh"}</span>
                <span className="mt-1 block text-xs text-gray-600">Check for updates</span>
              </span>
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#080b08] sm:grid-cols-4">
            <SummaryItem value={pendingJobs.length} label="Waiting" />
            <SummaryItem value={activeJobs.length} label="Active" border />
            <SummaryItem value={completedJobs.length} label="Completed" border />
            <SummaryItem value={cancelledJobs.length} label="Cancelled" border />
          </div>
        </section>

        {visibleNotifications.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <SectionTitle eyebrow="Live updates" title="Notifications" />
              <button
                type="button"
                onClick={clearNotifications}
                className="mb-5 text-xs font-black text-gray-600 transition hover:text-[#79c51c]"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {visibleNotifications.slice(0, 5).map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onDismiss={() => dismissNotification(notification.id)}
                />
              ))}
            </div>
          </section>
        )}

        {cancelledJobs.length > 0 && (
          <section className="mt-9">
            <SectionTitle eyebrow="Update" title="Cancelled collections" />
            <div className="space-y-3">
              {cancelledJobs.slice(0, 3).map((job) => (
                <CancelledJobCard key={job.id} job={job} />
              ))}
            </div>
            {cancelledJobs.length > 3 && (
              <Link href="/customer/jobs" className="mt-4 block text-center text-xs font-black text-[#79c51c] transition hover:text-[#91db32]">
                View all cancelled jobs →
              </Link>
            )}
          </section>
        )}

        <section className="mt-8">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi RCS, I need some help with my customer account.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-[#79c51c]/20 bg-[#080b08] p-5 transition hover:border-[#79c51c]/50 hover:bg-[#0a0f09] active:scale-[0.995] sm:p-6"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c] text-[#050705]">
              <span className="text-lg font-black">W</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">Need help?</p>
              <h2 className="mt-1 text-base font-black">Message RCS on WhatsApp</h2>
              <p className="mt-1 text-sm leading-5 text-gray-600">Speak to the Rapid Clear Solutions team about your account or collection.</p>
            </div>
            <span className="shrink-0 text-xl font-black text-[#79c51c] transition group-hover:translate-x-1">→</span>
          </a>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-sm font-semibold leading-6 text-red-300">{errorMessage}</p>
            <button type="button" onClick={() => void loadDashboard()} className="mt-3 text-sm font-black text-red-200 underline">Try again</button>
          </div>
        )}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle eyebrow="Activity" title="Recent jobs" />
            {jobs.length > 0 && (
              <Link href="/customer/jobs" className="mb-5 text-xs font-black text-[#79c51c] transition hover:text-[#91db32]">View all →</Link>
            )}
          </div>
          {jobs.length === 0 ? (
            <EmptyJobs />
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <CustomerJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 border-t border-white/[0.06] pt-7 text-center">
          <p className="text-xs text-gray-700">Rapid Clear Solutions</p>
          <p className="mt-1 text-[11px] text-gray-800">Waste removal made simple.</p>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#050705]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-5">
          <BottomNavItem href="/customer/dashboard" icon="⌂" label="Home" active />
          <BottomNavItem href="/customer/jobs" icon="▣" label="Jobs" />
          <BottomNavItem href="/customer/quotes" icon="£" label="Quotes" badge={actionRequiredCount > 0 ? actionRequiredCount : undefined} />
          <BottomNavItem href="/customer/post-job" icon="+" label="New Job" />
          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            className="relative flex min-h-[66px] flex-col items-center justify-center gap-1 text-[11px] font-bold text-gray-600 transition hover:text-gray-300"
          >
            <span className="text-xl leading-none">●</span>
            <span>Account</span>
          </button>
        </div>
      </nav>

      {showNotifications && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowNotifications(false)}>
          <div className="max-h-[88vh] w-full max-w-lg overflow-hidden rounded-t-[28px] border border-white/[0.10] bg-[#080b08] shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#050705] p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">RCS Updates</p>
                <h2 className="mt-1 text-xl font-black">Notifications</h2>
              </div>
              <button type="button" onClick={() => setShowNotifications(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] text-xl text-gray-500 hover:border-[#79c51c] hover:text-white" aria-label="Close notifications">×</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
              {visibleNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.10] bg-[#050705] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">RCS</div>
                  <p className="mt-4 text-sm font-black">You are all caught up</p>
                  <p className="mt-1 text-xs text-gray-700">No current dashboard updates.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} onDismiss={() => dismissNotification(notification.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowAccountModal(false)}>
          <div className="w-full max-w-md rounded-t-[28px] border border-white/[0.10] bg-[#080b08] p-5 shadow-2xl sm:rounded-[28px] sm:p-7" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">{getInitials(displayName)}</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">Your Account</p>
                  <h2 className="mt-1 text-xl font-black">{displayName}</h2>
                </div>
              </div>
              <button type="button" onClick={() => setShowAccountModal(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-lg font-black text-gray-500 hover:border-[#79c51c] hover:text-white" aria-label="Close account">×</button>
            </div>

            <div className="mt-6 space-y-3">
              <InfoTile label="Email" value={accountEmail || "Not available"} />
              <InfoTile label="Jobs" value={`${jobs.length}`} />
              <InfoTile label="Quotes waiting" value={`${actionRequiredCount}`} />
              <InfoTile label="Active collections" value={`${activeJobs.length}`} />
            </div>

            {!isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false);
                  void handleInstallApp();
                }}
                className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#79c51c]/30 bg-[#79c51c]/10 text-sm font-black text-[#79c51c] hover:bg-[#79c51c]/15"
              >
                INSTALL RCS APP
              </button>
            )}

            <button type="button" onClick={handleLogout} className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#79c51c] text-sm font-black text-black hover:bg-[#91db32]">LOG OUT</button>
          </div>
        </div>
      )}

      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] backdrop-blur-sm" onClick={() => setShowInstallModal(false)}>
          <div className="w-full max-w-md rounded-[28px] border border-white/[0.10] bg-[#080b08] p-6 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">Rapid Clear Solutions</p>
                <h2 className="mt-2 text-2xl font-black">Install the app</h2>
              </div>
              <button type="button" onClick={() => setShowInstallModal(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-lg font-black text-gray-500 hover:border-[#79c51c]/50 hover:text-[#79c51c]" aria-label="Close">×</button>
            </div>

            {installPrompt ? (
              <>
                <p className="mt-5 text-sm leading-6 text-gray-500">Add Rapid Clear Solutions to your home screen for quick access to your customer portal.</p>
                <button type="button" onClick={() => void handleInstallApp()} className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#79c51c] px-5 text-sm font-black text-[#050705] transition hover:bg-[#91db32]">INSTALL APP</button>
              </>
            ) : (
              <>
                <p className="mt-5 text-sm leading-6 text-gray-500">You can add Rapid Clear Solutions to your phone's home screen for faster access.</p>
                <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#050705] p-4">
                  <p className="text-sm font-black">On iPhone</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">Open this website in Safari, tap the Share button, then choose <span className="font-bold text-gray-300">Add to Home Screen</span>.</p>
                </div>
                <div className="mt-3 rounded-2xl border border-white/[0.07] bg-[#050705] p-4">
                  <p className="text-sm font-black">On Android</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">Open the browser menu and choose <span className="font-bold text-gray-300">Install app</span> or <span className="font-bold text-gray-300">Add to Home screen</span>.</p>
                </div>
              </>
            )}

            <button type="button" onClick={() => setShowInstallModal(false)} className="mt-4 w-full rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-bold text-gray-400 transition hover:border-[#79c51c]/50 hover:text-[#79c51c]">Maybe later</button>
          </div>
        </div>
      )}
    </main>
  );
}

function SmartActionCard({
  type,
  eyebrow,
  title,
  text,
  button,
  href,
}: {
  type: "quotes" | "collection" | "cancelled" | "completed" | "general";
  eyebrow: string;
  title: string;
  text: string;
  button: string;
  href: string;
}) {
  const cancelled = type === "cancelled";
  return (
    <section className={`overflow-hidden rounded-3xl border ${cancelled ? "border-red-500/20 bg-red-500/5" : type === "quotes" ? "border-[#79c51c]/40 bg-[#79c51c]/5" : "border-white/[0.08] bg-[#080b08]"}`}>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${cancelled ? "bg-red-500/10 text-red-300" : "bg-[#79c51c] text-[#050705]"}`}>
            {type === "quotes" ? "£" : type === "collection" ? "→" : type === "cancelled" ? "!" : "✓"}
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${cancelled ? "text-red-300" : "text-[#79c51c]"}`}>{eyebrow}</p>
            <h2 className="mt-1 text-lg font-black sm:text-xl">{title}</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">{text}</p>
          </div>
        </div>
        <Link href={href} className={`inline-flex min-h-[50px] shrink-0 items-center justify-center rounded-xl px-5 text-xs font-black uppercase tracking-wider ${cancelled ? "border border-red-500/30 text-red-300 hover:bg-red-500/5" : "bg-[#79c51c] text-[#050705] hover:bg-[#91db32]"}`}>
          {button} →
        </Link>
      </div>
    </section>
  );
}

function ActiveJobCard({
  job,
  driver,
  now,
}: {
  job: Job;
  driver: AssignedDriver | null;
  now: Date;
}) {
  const stage = getCollectionStage(job);
  const countdown = getCollectionCountdown(job.preferred_date, job.preferred_time, now);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#79c51c]/30 bg-[#080b08]">
      <Link href={`/customer/jobs/${job.id}`} className="group block p-5 transition hover:bg-[#0a0f09] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">RCS</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-wide text-[#79c51c]">{job.reference || `RC-${String(job.id).padStart(6, "0")}`}</p>
                <h3 className="mt-1 truncate text-lg font-black">{job.job_type || "Waste Collection"}</h3>
              </div>
              <StatusBadge status={job.status || "assigned"} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniDetail label="Collection date" value={job.preferred_date ? formatDate(job.preferred_date) : "Not set"} />
              <MiniDetail label="Time" value={job.preferred_time || "Any time"} />
            </div>

            {countdown && (
              <div className="mt-4 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#79c51c]">Collection countdown</p>
                <p className="mt-1 text-xl font-black">{countdown}</p>
              </div>
            )}

            <div className="mt-5"><CollectionTracker stage={stage} /></div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <span className="text-xs font-bold text-gray-600">{job.postcode || "Location not provided"}</span>
              <span className="text-sm font-black text-[#79c51c] transition group-hover:translate-x-1">View collection →</span>
            </div>
          </div>
        </div>
      </Link>

      {driver && (
        <div className="border-t border-white/[0.07] bg-[#050705] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">Your driver</p>
              <p className="mt-1 text-base font-black">{driver.trading_name || driver.company_name || driver.full_name || "RCS Driver"}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                {driver.vehicle_type && <span>{driver.vehicle_type}</span>}
                {driver.vehicle_registration && <span>{driver.vehicle_registration}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {driver.phone && (
                <a href={`tel:${driver.phone}`} className="rounded-xl border border-white/[0.10] bg-[#080b08] px-4 py-2.5 text-center text-xs font-black text-gray-300 hover:border-[#79c51c] hover:text-[#79c51c]">CALL DRIVER</a>
              )}
              <Link href={`/customer/jobs/${job.id}`} className="rounded-xl bg-[#79c51c] px-4 py-2.5 text-center text-xs font-black text-black hover:bg-[#91db32]">TRACK JOB</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function NotificationCard({
  notification,
  onDismiss,
}: {
  notification: DashboardNotification;
  onDismiss: () => void;
}) {
  const cancelled = notification.type === "cancelled";
  const quotes = notification.type === "quotes";
  return (
    <div className={`rounded-2xl border ${cancelled ? "border-red-500/20 bg-red-500/5" : quotes ? "border-[#79c51c]/20 bg-[#79c51c]/5" : "border-white/[0.08] bg-[#080b08]"}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">{cancelled ? "!" : quotes ? "£" : "✓"}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{notification.title}</p>
          <p className="mt-1 text-xs leading-5 text-gray-600">{notification.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={notification.href} className="rounded-lg bg-[#79c51c] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black">View →</Link>
            <button type="button" onClick={onDismiss} className="rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-600 hover:border-[#79c51c]/50 hover:text-[#79c51c]">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CancelledJobCard({ job }: { job: Job }) {
  const reason = job.cancellation_reason || DEFAULT_CANCELLATION_REASON;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi RCS, I need help with my cancelled collection ${job.reference || `RC-${String(job.id).padStart(6, "0")}`}.`)}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-red-500/20 bg-[#0b0808]">
      <Link href={`/customer/jobs/${job.id}`} className="group block p-5 transition hover:bg-[#100909]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-xs font-black text-red-300">RCS</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-wide text-red-300">{job.reference || `RC-${String(job.id).padStart(6, "0")}`}</p>
                <h3 className="mt-1 truncate font-black text-white">{job.job_type || "Waste Collection"}</h3>
              </div>
              <StatusBadge status="cancelled" />
            </div>
            <p className="mt-4 text-sm leading-6 text-red-100/60">{reason}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {job.preferred_date && <span className="text-xs font-bold text-red-100/30">Collection date: {formatDate(job.preferred_date)}</span>}
              {job.postcode && <span className="text-xs font-bold text-red-100/30">{job.postcode}</span>}
            </div>
          </div>
        </div>
      </Link>
      <div className="border-t border-red-500/10 bg-[#100909] p-4">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-black text-gray-300">Need help?</p><p className="mt-1 text-xs text-gray-600">Contact RCS if you need assistance.</p></div>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl border border-[#79c51c]/40 px-4 py-2.5 text-xs font-black text-[#79c51c] transition hover:border-[#79c51c] hover:bg-[#79c51c]/10">CONTACT RCS</a>
        </div>
      </div>
    </article>
  );
}

function CustomerJobCard({ job }: { job: Job }) {
  const status = normaliseStatus(job.status);
  const isCompleted = status === "completed" || status === "complete";
  const isCancelled = status === "cancelled" || status === "canceled";
  return (
    <Link href={`/customer/jobs/${job.id}`} className={`group block rounded-2xl border bg-[#080b08] p-4 transition active:scale-[0.99] ${isCancelled ? "border-red-500/20 hover:border-red-500/40" : "border-white/[0.07] hover:border-white/[0.14]"}`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${isCancelled ? "bg-red-500/10 text-red-300" : isCompleted ? "bg-white/[0.03] text-gray-700" : "bg-[#79c51c]/10 text-[#79c51c]"}`}>RCS</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{job.job_type || "Waste Collection"}</p>
          <p className="mt-1 truncate text-xs text-gray-600">{job.postcode || "Postcode not provided"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status || "pending"} />
            {job.preferred_date && <span className="truncate text-xs text-gray-700">{formatDate(job.preferred_date)}</span>}
          </div>
        </div>
        <div className={`shrink-0 text-xl font-black transition ${isCancelled ? "text-red-900 group-hover:text-red-400" : "text-gray-800 group-hover:text-[#79c51c]"}`}>→</div>
      </div>
    </Link>
  );
}

function QuickAction({ href, icon, title, subtitle, primary = false }: { href: string; icon: string; title: string; subtitle: string; primary?: boolean }) {
  return (
    <Link href={href} className={`group flex min-h-[118px] flex-col justify-between rounded-2xl border p-4 transition active:scale-[0.98] ${primary ? "border-[#79c51c]/30 bg-[#0c1209] hover:border-[#79c51c]/60" : "border-white/[0.07] bg-[#080b08] hover:border-white/[0.14]"}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${primary ? "bg-[#79c51c] text-[#050705]" : "bg-[#79c51c]/10 text-[#79c51c]"}`}>{icon}</span>
      <span><span className="block text-sm font-black">{title}</span><span className="mt-1 block text-xs text-gray-600">{subtitle}</span></span>
    </Link>
  );
}

function BottomNavItem({ href, icon, label, active = false, badge }: { href: string; icon: string; label: string; active?: boolean; badge?: number }) {
  return (
    <Link href={href} className={`relative flex min-h-[66px] flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${active ? "text-[#79c51c]" : "text-gray-700 hover:text-gray-300"}`}>
      <span className="relative text-xl leading-none">{icon}{badge !== undefined && <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#79c51c] px-1 text-[9px] font-black text-black">{badge > 9 ? "9+" : badge}</span>}</span>
      <span>{label}</span>
    </Link>
  );
}

function SummaryItem({ value, label, border = false }: { value: number; label: string; border?: boolean }) {
  return <div className={`px-3 py-5 text-center ${border ? "border-l border-white/[0.07]" : ""}`}><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[11px] font-bold text-gray-700">{label}</p></div>;
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-wide text-gray-700">{label}</p><p className="mt-1 truncate text-xs font-bold text-gray-300">{value}</p></div>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/[0.08] bg-[#050705] p-4"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-700">{label}</p><p className="mt-1 break-words text-sm font-bold text-gray-300">{value}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const normalised = normaliseStatus(status);
  let className = "border-white/10 bg-white/[0.04] text-gray-400";
  let text = formatStatus(status);
  if (["pending", "new", "open"].includes(normalised)) { className = "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"; text = normalised === "new" ? "New" : "Waiting"; }
  if (normalised === "bidding") { className = "border-blue-500/30 bg-blue-500/10 text-blue-300"; text = "Quotes"; }
  if (["assigned", "accepted", "booked"].includes(normalised)) { className = "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]"; text = "Booked"; }
  if (["on_the_way", "on the way", "driver_on_way", "driver on way"].includes(normalised)) { className = "border-blue-500/30 bg-blue-500/10 text-blue-300"; text = "On The Way"; }
  if (["in_progress", "in progress"].includes(normalised)) { className = "border-blue-500/30 bg-blue-500/10 text-blue-300"; text = "In Progress"; }
  if (["completed", "complete"].includes(normalised)) { className = "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]"; text = "Completed"; }
  if (["cancelled", "canceled", "rejected"].includes(normalised)) { className = "border-red-500/20 bg-red-500/5 text-red-300"; text = normalised === "rejected" ? "Rejected" : "Cancelled"; }
  return <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${className}`}>{text}</span>;
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">{eyebrow}</p><h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2></div>;
}

function EmptyJobs() {
  return <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#080b08] px-5 py-12 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">RCS</div><h3 className="mt-5 text-xl font-black">No jobs yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-600">Post a job and approved RCS drivers can send you quotes.</p><Link href="/customer/post-job" className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[#79c51c] px-6 font-black text-[#050705] transition hover:bg-[#91db32]">POST YOUR FIRST JOB</Link></div>;
}

function CollectionTracker({ stage }: { stage: CollectionStage }) {
  const stages: { key: CollectionStage; label: string }[] = [
    { key: "booked", label: "Booked" },
    { key: "on_way", label: "On way" },
    { key: "collecting", label: "Collecting" },
    { key: "completed", label: "Completed" },
  ];
  const currentIndex = stages.findIndex((item) => item.key === stage);
  return (
    <div className="grid grid-cols-4 gap-2">
      {stages.map((item, index) => {
        const active = currentIndex >= index;
        return (
          <div key={item.key}>
            <div className={`h-1.5 rounded-full ${active ? "bg-[#79c51c]" : "bg-white/[0.08]"}`} />
            <p className={`mt-2 truncate text-[9px] font-black uppercase tracking-wider ${active ? "text-[#79c51c]" : "text-gray-700"}`}>{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function getCollectionStage(job: Job): CollectionStage {
  const status = normaliseStatus(job.status);
  const journey = normaliseStatus(job.journey_status);
  if (["completed", "complete"].includes(status) || journey === "completed") return "completed";
  if (["in_progress", "in progress", "collecting", "arrived"].includes(status) || ["in_progress", "in progress", "collecting", "arrived"].includes(journey)) return "collecting";
  if (["on_the_way", "on the way", "driver_on_way", "driver on way"].includes(status) || ["on_the_way", "on the way", "driver_on_way", "driver on way"].includes(journey)) return "on_way";
  return "booked";
}

function getCollectionCountdown(date: string | null, time: string | null, now: Date) {
  if (!date) return null;
  const target = parseCollectionDate(date, time);
  if (!target) return formatDate(date);
  const difference = target.getTime() - now.getTime();
  if (difference <= 0) return difference > -(1000 * 60 * 60 * 24) ? "Collection due now" : null;
  const totalMinutes = Math.max(1, Math.round(difference / (1000 * 60)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  if (days > 0) return `${days}d ${hours}h until collection`;
  if (hours > 0) return `${hours}h until collection`;
  return `${totalMinutes}m until collection`;
}

function parseCollectionDate(date: string, time: string | null) {
  const trimmed = String(time || "").trim();
  if (!trimmed || normaliseStatus(trimmed) === "any time") return new Date(`${date}T12:00:00`);
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return new Date(`${date}T12:00:00`);
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
}

function normaliseStatus(status: string | null) {
  return status?.trim().toLowerCase() || "";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatRelativeTime(value: Date, now: Date) {
  const difference = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 1000));
  if (difference < 5) return "just now";
  if (difference < 60) return `${difference}s ago`;
  const minutes = Math.floor(difference / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function getInitials(value: string) {
  const clean = value.trim();
  if (!clean) return "R";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}
