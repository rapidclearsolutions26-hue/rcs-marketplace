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
  const [now, setNow] = useState(() => new Date());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

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

    try {
      const raw = window.localStorage.getItem("rcs-dashboard-dismissed-notifications");
      if (raw) {
        const value: unknown = JSON.parse(raw);
        if (Array.isArray(value)) {
          setDismissedNotifications(
            value.filter((item): item is string => typeof item === "string"),
          );
        }
      }
    } catch {
      // Ignore storage errors.
    }

    checkInstalled();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", checkInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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
      // Ignore storage errors.
    }
  }, [dismissedNotifications]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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
            setAssignedDrivers({});
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
    const interval = window.setInterval(() => void loadDashboard(true), 15000);
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

  const pendingJobs = useMemo(
    () =>
      jobs.filter((job) =>
        ["pending", "new", "open"].includes(normaliseStatus(job.status)),
      ),
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
          ].includes(status) ||
          [
            "on_the_way",
            "on the way",
            "driver_on_way",
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
  const recentJobs = jobs.slice(0, 4);

  const notifications = useMemo<DashboardNotification[]>(() => {
    const list: DashboardNotification[] = [];

    if (biddingJobs.length > 0) {
      list.push({
        id: `quotes-${biddingJobs.map((job) => job.id).join("-")}`,
        type: "quote",
        title: biddingJobs.length === 1 ? "Driver quote waiting" : `${biddingJobs.length} driver quotes waiting`,
        text: "Review the quotes on your customer portal.",
        href: "/customer/quotes",
      });
    }

    activeJobs.slice(0, 3).forEach((job) => {
      const stage = getCollectionStage(job);
      list.push({
        id: `active-${job.id}-${job.status}-${job.journey_status}`,
        type: "collection",
        title: stage === "on_way" ? "Driver on the way" : "Collection active",
        text: `${job.reference || `Job #${job.id}`} needs your attention in the dashboard.`,
        href: `/customer/jobs/${job.id}`,
      });
    });

    cancelledJobs.slice(0, 2).forEach((job) => {
      list.push({
        id: `cancelled-${job.id}-${job.cancelled_at || job.status}`,
        type: "cancelled",
        title: "Collection cancelled",
        text: "Open the job for the cancellation details and support options.",
        href: `/customer/jobs/${job.id}`,
      });
    });

    completedJobs.slice(0, 2).forEach((job) => {
      list.push({
        id: `completed-${job.id}-${job.status}`,
        type: "completed",
        title: "Collection completed",
        text: `${job.reference || `Job #${job.id}`} has been completed.`,
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

  const displayName = accountName || accountEmail || "Customer";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06100c] text-white">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#17382b] border-t-[#1BBB8C]" />
            <p className="mt-5 text-lg font-black">Loading customer dashboard...</p>
            <p className="mt-2 text-sm text-[#71867c]">Checking your jobs and quotes</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="pwa-header sticky top-0 z-40 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={190}
              height={60}
              priority
              className="h-10 w-auto object-contain sm:h-11"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isInstalled && (
              <button
                type="button"
                onClick={() => void handleInstallApp()}
                className="hidden rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#aabbb4] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] sm:block"
              >
                INSTALL APP
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#29483a] text-lg text-[#aabbb4] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
              aria-label="Open notifications"
            >
              ◔
              {visibleNotifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1BBB8C] px-1 text-[9px] font-black text-[#06100c]">
                  {visibleNotifications.length > 9 ? "9+" : visibleNotifications.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              className="hidden items-center gap-2 rounded-xl border border-[#29483a] px-3 py-2 text-left transition hover:border-[#1BBB8C] sm:flex"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123529] text-[10px] font-black text-[#1BBB8C]">
                {getInitials(displayName)}
              </span>
              <span className="max-w-[140px] truncate text-xs font-black text-[#c5d1cb]">
                {displayName}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={refreshing}
              className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#aabbb4] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-[#29483a] px-4 py-2 text-sm font-bold text-[#c5d1cb] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">RCS Marketplace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Customer Dashboard</h1>
            <p className="mt-2 text-[#82958c]">
              Welcome{accountName ? `, ${firstName(accountName)}` : ""}. Post jobs, compare quotes and manage your collections.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/customer/post-job"
              className="rounded-xl bg-[#1BBB8C] px-5 py-2.5 text-sm font-black text-[#06100c] transition hover:bg-[#16a77c]"
            >
              POST A NEW JOB
            </Link>
            <Link
              href="/customer/quotes"
              className="rounded-xl border border-[#29483a] px-5 py-2.5 text-sm font-black text-[#c5d1cb] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
            >
              MY QUOTES{biddingJobs.length > 0 ? ` (${biddingJobs.length})` : ""}
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-7 rounded-2xl border border-red-900/60 bg-[#230e0e] p-5">
            <p className="font-semibold text-red-300">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-3 text-sm font-bold text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="My Jobs" value={jobs.length} description="Total jobs posted" />
          <StatCard title="Quotes Waiting" value={biddingJobs.length} description="Driver quotes to review" highlight={biddingJobs.length > 0} />
          <StatCard title="Active Collections" value={activeJobs.length} description="Collections booked or in progress" />
          <StatCard title="Completed" value={completedJobs.length} description="Jobs completed" />
        </div>

        {biddingJobs.length > 0 && (
          <section className="mt-10">
            <SectionHeading eyebrow="Action Required" title="Driver Quotes Waiting" />
            <div className="grid gap-5 lg:grid-cols-2">
              {biddingJobs.slice(0, 4).map((job) => (
                <QuoteJobCard key={job.id} job={job} />
              ))}
            </div>
            {biddingJobs.length > 4 && (
              <Link
                href="/customer/quotes"
                className="mt-5 inline-flex rounded-xl border border-[#29483a] px-5 py-3 text-sm font-black text-[#c5d1cb] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
              >
                View all {biddingJobs.length} quotes
              </Link>
            )}
          </section>
        )}

        <section className="mt-10">
          <SectionHeading eyebrow="Booked & In Progress" title="Your Active Collections" />
          {activeJobs.length === 0 ? (
            <EmptyState
              title="No active collections"
              description="Your booked and in-progress waste collections will appear here."
              href="/customer/post-job"
              action="Post a new job"
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {activeJobs.slice(0, 4).map((job) => (
                <CustomerActiveJobCard
                  key={job.id}
                  job={job}
                  driver={job.assigned_driver_id ? assignedDrivers[job.assigned_driver_id] || null : null}
                  now={now}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHeading eyebrow="Customer Portal" title="My Jobs" />
          {recentJobs.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              description="Post your first waste removal job and approved RCS drivers can send you quotes."
              href="/customer/post-job"
              action="Post your first job"
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {recentJobs.map((job) => (
                <CustomerJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Link
            href="/customer/jobs"
            className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5 transition hover:border-[#1BBB8C]/50"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1BBB8C]">Jobs</p>
            <p className="mt-2 text-lg font-black">Manage My Jobs</p>
            <p className="mt-1 text-sm text-[#71867c]">View, edit and open your full job history.</p>
          </Link>
          <Link
            href="/customer/quotes"
            className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5 transition hover:border-[#1BBB8C]/50"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1BBB8C]">Quotes</p>
            <p className="mt-2 text-lg font-black">Compare Driver Quotes</p>
            <p className="mt-1 text-sm text-[#71867c]">Review driver prices and choose a collection.</p>
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi RCS, I need some help with my customer account.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-[#1BBB8C]/20 bg-[#08150f] p-5 transition hover:border-[#1BBB8C]/60"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1BBB8C]">Support</p>
            <p className="mt-2 text-lg font-black">Message RCS</p>
            <p className="mt-1 text-sm text-[#71867c]">Contact the RCS team on WhatsApp.</p>
          </a>
        </section>

        <section className="mt-10 pb-12">
          <SectionHeading eyebrow="Account" title="Customer Information" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Account" value={displayName} />
            <InfoCard label="Email" value={accountEmail || "Not available"} />
            <InfoCard label="Waiting jobs" value={String(pendingJobs.length)} />
            <InfoCard label="Cancelled jobs" value={String(cancelledJobs.length)} />
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-[#17382b] pt-5 text-xs text-[#53675e]">
          <span>Rapid Clear Solutions</span>
          <span>{lastUpdatedAt ? `Updated ${formatRelativeTime(lastUpdatedAt, now)}` : "Live dashboard"}</span>
        </div>
      </div>

      {showNotifications && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#29483a] bg-[#0b1b14] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#17382b] p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1BBB8C]">RCS Updates</p>
                <h2 className="mt-1 text-xl font-black">Notifications</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#29483a] text-xl text-[#71867c] hover:border-[#1BBB8C] hover:text-white"
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {visibleNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#29483a] bg-[#081710] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123529] text-sm font-black text-[#1BBB8C]">RCS</div>
                  <p className="mt-4 text-sm font-black">You're all caught up</p>
                  <p className="mt-1 text-xs text-[#657a70]">No current dashboard updates.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-2xl border border-[#17382b] bg-[#081710] p-4"
                    >
                      <p className="text-sm font-black">{notification.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#71867c]">{notification.text}</p>
                      <div className="mt-4 flex gap-2">
                        <Link
                          href={notification.href}
                          onClick={() => setShowNotifications(false)}
                          className="rounded-xl bg-[#1BBB8C] px-4 py-2.5 text-xs font-black text-[#06100c]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => dismissNotification(notification.id)}
                          className="rounded-xl border border-[#29483a] px-4 py-2.5 text-xs font-black text-[#9aaca4] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onClick={() => setShowAccountModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#29483a] bg-[#0b1b14] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123529] text-sm font-black text-[#1BBB8C]">
                  {getInitials(displayName)}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1BBB8C]">Your Account</p>
                  <h2 className="mt-1 text-xl font-black">{displayName}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#29483a] text-lg text-[#71867c] hover:border-[#1BBB8C] hover:text-white"
                aria-label="Close account"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoCard label="Email" value={accountEmail || "Not available"} />
              <InfoCard label="Jobs" value={String(jobs.length)} />
              <InfoCard label="Quotes waiting" value={String(biddingJobs.length)} />
              <InfoCard label="Active collections" value={String(activeJobs.length)} />
            </div>

            {!isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false);
                  void handleInstallApp();
                }}
                className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#1BBB8C]/40 bg-[#123529] text-sm font-black text-[#1BBB8C] hover:bg-[#153f31]"
              >
                INSTALL RCS APP
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#1BBB8C] text-sm font-black text-[#06100c] hover:bg-[#16a77c]"
            >
              LOG OUT
            </button>
          </div>
        </div>
      )}

      {showInstallModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#29483a] bg-[#0b1b14] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1BBB8C]">Rapid Clear Solutions</p>
                <h2 className="mt-2 text-2xl font-black">Install the RCS app</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#29483a] text-lg font-black text-[#71867c] hover:border-[#1BBB8C] hover:text-white"
                aria-label="Close install dialog"
              >
                ×
              </button>
            </div>

            {installPrompt ? (
              <>
                <p className="mt-5 text-sm leading-6 text-[#71867c]">
                  Add Rapid Clear Solutions to your home screen for quick access to your customer dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => void handleInstallApp()}
                  className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 text-sm font-black text-[#06100c] hover:bg-[#16a77c]"
                >
                  INSTALL APP
                </button>
              </>
            ) : (
              <>
                <p className="mt-5 text-sm leading-6 text-[#71867c]">
                  On iPhone, open the site in Safari, tap Share, then choose <span className="font-bold text-white">Add to Home Screen</span>.
                </p>
                <div className="mt-5 rounded-2xl border border-[#29483a] bg-[#081710] p-4">
                  <p className="text-sm font-black">Android</p>
                  <p className="mt-2 text-sm leading-6 text-[#71867c]">
                    Open the browser menu and choose <span className="font-bold text-white">Install app</span> or <span className="font-bold text-white">Add to Home screen</span>.
                  </p>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="mt-4 w-full rounded-xl border border-[#29483a] px-5 py-3 text-sm font-bold text-[#71867c] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </main>
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
  const countdown = getCollectionCountdown(job.preferred_date, job.preferred_time, now);

  return (
    <article className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#17382b] bg-[#10230f] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference || `RC-${String(job.id).padStart(6, "0")}`}
            </p>
            <h3 className="mt-2 text-xl font-black">{job.job_type || "Waste Collection"}</h3>
          </div>
          <StatusBadge status={job.status || "assigned"} />
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <JobLine label="Location" value={job.postcode || "Not provided"} />
          <JobLine label="Collection date" value={job.preferred_date ? formatDateLong(job.preferred_date) : "Not provided"} />
          <JobLine label="Time" value={job.preferred_time || "Any time"} />
          <JobLine label="Load size" value={job.load_size || "Not specified"} />
        </div>

        {countdown && (
          <div className="rounded-2xl border border-[#1BBB8C]/20 bg-[#081710] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1BBB8C]">Collection countdown</p>
            <p className="mt-1 text-xl font-black">{countdown}</p>
          </div>
        )}

        <CollectionTracker stage={stage} />

        {driver && (
          <div className="rounded-2xl border border-[#17382b] bg-[#081710] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1BBB8C]">Your driver</p>
                <p className="mt-1 text-base font-black">
                  {driver.trading_name || driver.company_name || driver.full_name || "RCS Driver"}
                </p>
                <p className="mt-1 text-xs text-[#71867c]">
                  {[driver.vehicle_type, driver.vehicle_registration].filter(Boolean).join(" • ") || "Driver details available in the job"}
                </p>
              </div>
              <div className="flex gap-2">
                {driver.phone && (
                  <a
                    href={`tel:${driver.phone}`}
                    className="rounded-xl border border-[#29483a] px-4 py-2.5 text-xs font-black text-[#c5d1cb] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
                  >
                    CALL DRIVER
                  </a>
                )}
                <Link
                  href={`/customer/jobs/${job.id}`}
                  className="rounded-xl bg-[#1BBB8C] px-4 py-2.5 text-xs font-black text-[#06100c] hover:bg-[#16a77c]"
                >
                  TRACK JOB
                </Link>
              </div>
            </div>
          </div>
        )}

        <Link
          href={`/customer/jobs/${job.id}`}
          className="block w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] hover:bg-[#16a77c]"
        >
          Manage Collection
        </Link>
      </div>
    </article>
  );
}

function QuoteJobCard({ job }: { job: Job }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#17382b] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference || `RC-${String(job.id).padStart(6, "0")}`}
            </p>
            <h3 className="mt-2 text-xl font-black">{job.job_type || "Waste Collection"}</h3>
          </div>
          <span className="rounded-full border border-[#29483a] bg-[#10291f] px-3 py-1 text-xs font-black text-[#1BBB8C]">
            QUOTES WAITING
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <JobLine label="Location" value={job.postcode || "Not provided"} />
          <JobLine label="Collection date" value={job.preferred_date ? formatDateLong(job.preferred_date) : "Not provided"} />
          <JobLine label="Load size" value={job.load_size || "Not specified"} />
        </div>

        <div className="rounded-2xl border border-[#1BBB8C]/20 bg-[#081710] p-4">
          <p className="text-sm font-black">Driver quotes are available</p>
          <p className="mt-1 text-sm leading-6 text-[#71867c]">
            Open the quotes page to compare the submitted prices and choose your collection.
          </p>
        </div>

        <Link
          href={`/customer/jobs/${job.id}`}
          className="block w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] hover:bg-[#16a77c]"
        >
          View Quotes
        </Link>
      </div>
    </div>
  );
}

function CustomerJobCard({ job }: { job: Job }) {
  const status = normaliseStatus(job.status);
  const cancelled = ["cancelled", "canceled"].includes(status);
  const completed = ["completed", "complete"].includes(status);

  return (
    <Link
      href={`/customer/jobs/${job.id}`}
      className="block overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl transition hover:border-[#1BBB8C]/50"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference || `RC-${String(job.id).padStart(6, "0")}`}
            </p>
            <h3 className="mt-2 text-xl font-black">{job.job_type || "Waste Collection"}</h3>
          </div>
          <StatusBadge status={job.status || "pending"} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <JobLine label="Location" value={job.postcode || "Not provided"} />
          <JobLine label="Date" value={job.preferred_date ? formatDateShort(job.preferred_date) : "Not set"} />
          <JobLine label="Time" value={job.preferred_time || "Any time"} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#17382b] pt-4">
          <div>
            <p className="text-xs text-[#657a70]">
              {cancelled ? "This collection was cancelled." : completed ? "Collection completed." : "Open for full details."}
            </p>
          </div>
          <span className="font-black text-[#1BBB8C]">Open job →</span>
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  title,
  value,
  description,
  highlight = false,
}: {
  title: string;
  value: number;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-6 shadow-xl ${
        highlight
          ? "border-[#1BBB8C]/50 bg-[#10230f]"
          : "border-[#17382b] bg-[#0b1b14]"
      }`}
    >
      <p className="text-sm font-bold text-[#8b9d95]">{title}</p>
      <p className={`mt-3 text-4xl font-black ${highlight ? "text-[#1BBB8C]" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-[#64786e]">{description}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1BBB8C]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
    </div>
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
    <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123529] text-sm font-black text-[#1BBB8C]">
        RCS
      </div>
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#71857b]">{description}</p>
      <Link
        href={href}
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#1BBB8C] px-6 font-black text-[#06100c] hover:bg-[#16a77c]"
      >
        {action}
      </Link>
    </div>
  );
}

function JobLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#d5dfda]">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#657a70]">{label}</p>
      <p className="mt-2 break-words text-base font-black text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalised = normaliseStatus(status);
  let className = "border-[#29483a] bg-[#102019] text-[#b8c6c0]";
  let text = formatStatus(status);

  if (["pending", "new", "open"].includes(normalised)) {
    className = "border-yellow-600/30 bg-yellow-500/10 text-yellow-300";
    text = normalised === "new" ? "NEW" : "WAITING";
  }

  if (normalised === "bidding") {
    className = "border-blue-600/30 bg-blue-500/10 text-blue-300";
    text = "BIDDING";
  }

  if (["assigned", "accepted", "booked"].includes(normalised)) {
    className = "border-[#3f8d24] bg-[#183017] text-[#1BBB8C]";
    text = "BOOKED";
  }

  if (["on_the_way", "on the way", "driver_on_way", "driver on way"].includes(normalised)) {
    className = "border-blue-600/30 bg-blue-500/10 text-blue-300";
    text = "ON THE WAY";
  }

  if (["in_progress", "in progress"].includes(normalised)) {
    className = "border-blue-600/30 bg-blue-500/10 text-blue-300";
    text = "IN PROGRESS";
  }

  if (["completed", "complete"].includes(normalised)) {
    className = "border-[#3f8d24] bg-[#183017] text-[#1BBB8C]";
    text = "COMPLETED";
  }

  if (["cancelled", "canceled", "rejected"].includes(normalised)) {
    className = "border-red-600/30 bg-red-500/10 text-red-300";
    text = normalised === "rejected" ? "REJECTED" : "CANCELLED";
  }

  return (
    <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {text}
    </span>
  );
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
            <div className={`h-1.5 rounded-full ${active ? "bg-[#1BBB8C]" : "bg-[#17382b]"}`} />
            <p className={`mt-2 truncate text-[9px] font-black uppercase tracking-wider ${active ? "text-[#1BBB8C]" : "text-[#53675e]"}`}>
              {item.label}
            </p>
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
  if (
    ["in_progress", "in progress", "collecting", "arrived"].includes(status) ||
    ["in_progress", "in progress", "collecting", "arrived"].includes(journey)
  ) {
    return "collecting";
  }
  if (
    ["on_the_way", "on the way", "driver_on_way", "driver on way"].includes(status) ||
    ["on_the_way", "on the way", "driver_on_way", "driver on way"].includes(journey)
  ) {
    return "on_way";
  }
  return "booked";
}

function getCollectionCountdown(date: string | null, time: string | null, now: Date) {
  if (!date) return null;
  const target = parseCollectionDate(date, time);
  if (!target) return formatDateLong(date);
  const difference = target.getTime() - now.getTime();
  if (difference <= 0) {
    return difference > -(1000 * 60 * 60 * 24) ? "Collection due now" : null;
  }
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

function formatDateLong(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
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