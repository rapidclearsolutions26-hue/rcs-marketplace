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

const WHATSAPP_NUMBER = "447555980651";

const DEFAULT_CANCELLATION_REASON =
  "We're sorry, we couldn't find a driver for your collection. Unfortunately, we're unable to fulfil your waste collection at this time. We apologise for the inconvenience. You can contact RCS if you'd like us to help arrange an alternative collection.";

export default function CustomerDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignedDrivers, setAssignedDrivers] = useState<Record<string, AssignedDriver>>({});
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
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
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDismissedNotifications(
            parsed.filter((item): item is string => typeof item === "string"),
          );
        }
      }
    } catch {
      // Ignore local storage errors.
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
      // Ignore local storage errors.
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
            const driverMap: Record<string, AssignedDriver> = {};
            ((drivers || []) as AssignedDriver[]).forEach((driver) => {
              driverMap[driver.id] = driver;
            });
            setAssignedDrivers(driverMap);
          } else {
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

  const recentJobs = jobs.slice(0, 4);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    if (biddingJobs.length > 0) {
      items.push({
        id: `quotes-${biddingJobs.map((job) => job.id).join("-")}`,
        type: "quote",
        title: biddingJobs.length === 1 ? "Driver quote waiting" : `${biddingJobs.length} driver quotes waiting`,
        text: "Review the quotes from approved RCS drivers.",
        href: "/customer/quotes",
      });
    }

    activeJobs.slice(0, 3).forEach((job) => {
      const stage = getCollectionStage(job);
      items.push({
        id: `active-${job.id}-${job.status}-${job.journey_status}`,
        type: "collection",
        title: stage === "on_way" ? "Driver on the way" : "Collection active",
        text: `${job.reference || `Job #${job.id}`} is active in your customer portal.`,
        href: `/customer/jobs/${job.id}`,
      });
    });

    cancelledJobs.slice(0, 2).forEach((job) => {
      items.push({
        id: `cancelled-${job.id}-${job.cancelled_at || job.status}`,
        type: "cancelled",
        title: "Collection cancelled",
        text: "Open the job for the cancellation details and support options.",
        href: `/customer/jobs/${job.id}`,
      });
    });

    completedJobs.slice(0, 2).forEach((job) => {
      items.push({
        id: `completed-${job.id}-${job.status}`,
        type: "completed",
        title: "Collection completed",
        text: `${job.reference || `Job #${job.id}`} has been completed.`,
        href: `/customer/jobs/${job.id}`,
      });
    });

    return items;
  }, [activeJobs, biddingJobs, cancelledJobs, completedJobs]);

  const visibleNotifications = notifications.filter(
    (notification) => !dismissedNotifications.includes(notification.id),
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
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
        }
      } catch (error) {
        console.error("PWA install error:", error);
      }
      return;
    }

    setShowNotifications(false);
    window.alert("On iPhone: open this website in Safari, tap Share, then choose Add to Home Screen.");
  }

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

            {visibleNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => setShowNotifications(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#29483a] text-lg text-[#aabbb4] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
                aria-label="Open notifications"
              >
                ●
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1BBB8C] px-1 text-[9px] font-black text-[#06100c]">
                  {visibleNotifications.length > 9 ? "9+" : visibleNotifications.length}
                </span>
              </button>
            )}

            <div className="hidden text-right sm:block">
              <p className="text-xs text-[#687d73]">Customer</p>
              <p className="text-sm font-bold">{accountName || "Customer"}</p>
            </div>

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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
              RCS Marketplace
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Customer Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-[#82958c]">
              Welcome{accountName ? `, ${firstName(accountName)}` : ""}. Manage your waste removal jobs, compare driver quotes and track your collections.
            </p>
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="My Jobs" value={jobs.length} description="Total jobs posted" />
          <StatCard title="My Quotes" value={biddingJobs.length} description="Driver quotes waiting" highlight={biddingJobs.length > 0} />
          <StatCard title="Active Jobs" value={activeJobs.length} description="Collections booked or in progress" />
          <StatCard title="Completed" value={completedJobs.length} description="Jobs completed" />
        </section>

        <section className="mt-10">
          <SectionHeading eyebrow="Action Required" title="Driver Quotes" />

          {biddingJobs.length === 0 ? (
            <EmptyState
              title="No quotes waiting"
              description="When approved RCS drivers submit quotes for your jobs, they will appear here."
              href="/customer/post-job"
              action="Post a new job"
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {biddingJobs.slice(0, 4).map((job) => (
                <QuoteJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHeading eyebrow="Booked & In Progress" title="Your Active Jobs" />

          {activeJobs.length === 0 ? (
            <EmptyState
              title="No active jobs"
              description="Booked and in-progress waste collections will appear here."
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
              description="Post a job and approved RCS drivers can send you quotes."
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

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          <Link
            href="/customer/post-job"
            className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-xl transition hover:border-[#1BBB8C]/60"
          >
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1BBB8C]">Marketplace</p>
            <h2 className="mt-2 text-xl font-black">Post a New Job</h2>
            <p className="mt-2 text-sm leading-6 text-[#71867c]">Tell us what needs removing and let approved RCS drivers submit quotes.</p>
            <span className="mt-5 inline-block rounded-xl bg-[#1BBB8C] px-5 py-3 font-black text-[#06100c]">Post Job →</span>
          </Link>

          <Link
            href="/customer/quotes"
            className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-xl transition hover:border-[#1BBB8C]/60"
          >
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1BBB8C]">Quotes</p>
            <h2 className="mt-2 text-xl font-black">Compare Driver Quotes</h2>
            <p className="mt-2 text-sm leading-6 text-[#71867c]">Open your quote list and review prices from drivers.</p>
            <span className="mt-5 inline-block rounded-xl border border-[#29483a] px-5 py-3 font-black text-white hover:border-[#1BBB8C] hover:text-[#1BBB8C]">View Quotes →</span>
          </Link>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi RCS, I need some help with my customer account.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-6 shadow-xl transition hover:border-[#1BBB8C]/60"
          >
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1BBB8C]">Support</p>
            <h2 className="mt-2 text-xl font-black">Contact RCS</h2>
            <p className="mt-2 text-sm leading-6 text-[#71867c]">Need help with a booking, quote or account? Message RCS on WhatsApp.</p>
            <span className="mt-5 inline-block rounded-xl border border-[#1BBB8C]/30 px-5 py-3 font-black text-[#1BBB8C]">Message RCS →</span>
          </a>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Account" value={accountName || "Customer"} />
          <InfoCard label="Email" value={accountEmail || "Not available"} />
          <InfoCard label="Waiting Jobs" value={String(pendingJobs.length)} />
          <InfoCard label="Cancelled Jobs" value={String(cancelledJobs.length)} />
        </section>

        <div className="mt-10 flex items-center justify-between border-t border-[#17382b] pt-5 text-xs text-[#53675e]">
          <span>Rapid Clear Solutions</span>
          <span>{lastUpdatedAt ? `Updated ${formatRelativeTime(lastUpdatedAt, now)}` : "Live dashboard"}</span>
        </div>
      </div>

      {showNotifications && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-[#29483a] bg-[#0b1b14] shadow-2xl sm:rounded-3xl"
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
                  <p className="mt-4 text-sm font-black">You are all caught up</p>
                  <p className="mt-1 text-xs text-[#657a70]">No current dashboard updates.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onDismiss={() => dismissNotification(notification.id)}
                      onOpen={() => setShowNotifications(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
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
          ? "border-[#3f8d24] bg-[#10230f]"
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

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
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
      <div className="mx-auto h-1.5 w-14 rounded-full bg-[#1BBB8C]" />
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#71857b]">{description}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-xl bg-[#1BBB8C] px-6 py-3.5 font-black text-[#06100c] hover:bg-[#16a77c]"
      >
        {action}
      </Link>
    </div>
  );
}

function QuoteJobCard({ job }: { job: Job }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#17382b] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference || `RC-${String(job.id).padStart(6, "0")}`}
            </p>
            <h3 className="mt-2 text-xl font-black">{job.job_type || "Waste Collection"}</h3>
          </div>
          <span className="rounded-full border border-[#285342] bg-[#10291f] px-3 py-1 text-xs font-black text-[#1BBB8C]">
            QUOTES
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <JobLine label="Location" value={job.postcode || "Postcode not provided"} />
        <JobLine label="Collection date" value={job.preferred_date ? formatDate(job.preferred_date) : "Date not provided"} />
        <JobLine label="Load size" value={job.load_size || "Not specified"} />
        {job.description && <JobLine label="Description" value={job.description} />}
        <Link
          href="/customer/quotes"
          className="block w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] hover:bg-[#16a77c]"
        >
          Review Quotes
        </Link>
      </div>
    </div>
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
    <div className="overflow-hidden rounded-3xl border border-[#3f8d24] bg-[#0b1b14] shadow-xl">
      <div className="border-b border-[#214333] bg-[#10230f] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
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
          <InfoBox label="Collection date" value={job.preferred_date ? formatDate(job.preferred_date) : "Not provided"} />
          <InfoBox label="Time" value={job.preferred_time || "Any time"} />
        </div>

        {countdown && (
          <div className="rounded-2xl border border-[#3f8d24]/50 bg-[#162b13] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#71867c]">Collection countdown</p>
            <p className="mt-1 text-2xl font-black text-[#1BBB8C]">{countdown}</p>
          </div>
        )}

        <div className="rounded-2xl border border-[#214333] bg-[#07130e] p-4">
          <p className="text-sm font-black text-white">Collection progress</p>
          <div className="mt-4">
            <CollectionTracker stage={stage} />
          </div>
        </div>

        <div className="space-y-4">
          <JobLine label="Location" value={job.postcode || "Not provided"} />
          <JobLine label="Load size" value={job.load_size || "Not specified"} />
        </div>

        {driver && (
          <div className="rounded-2xl border border-[#214333] bg-[#07130e] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#1BBB8C]">Your driver</p>
            <p className="mt-1 text-lg font-black">
              {driver.trading_name || driver.company_name || driver.full_name || "RCS Driver"}
            </p>
            <p className="mt-1 text-sm text-[#82958c]">
              {driver.vehicle_type || "RCS vehicle"}
              {driver.vehicle_registration ? ` • ${driver.vehicle_registration}` : ""}
            </p>
            <div className="mt-4 flex gap-2">
              {driver.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="flex-1 rounded-xl border border-[#29483a] px-4 py-3 text-center text-sm font-black hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
                >
                  Call Driver
                </a>
              )}
              <Link
                href={`/customer/jobs/${job.id}`}
                className="flex-1 rounded-xl bg-[#1BBB8C] px-4 py-3 text-center text-sm font-black text-[#06100c] hover:bg-[#16a77c]"
              >
                Manage Job
              </Link>
            </div>
          </div>
        )}

        {!driver && (
          <Link
            href={`/customer/jobs/${job.id}`}
            className="block w-full rounded-xl bg-[#1BBB8C] px-5 py-3.5 text-center font-black text-[#06100c] hover:bg-[#16a77c]"
          >
            View Job
          </Link>
        )}
      </div>
    </div>
  );
}

function CustomerJobCard({ job }: { job: Job }) {
  const status = normaliseStatus(job.status);
  const cancelled = status === "cancelled" || status === "canceled";

  return (
    <div className="overflow-hidden rounded-3xl border border-[#17382b] bg-[#0b1b14] shadow-xl">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-[#1BBB8C]">
              {job.reference || `RC-${String(job.id).padStart(6, "0")}`}
            </p>
            <h3 className="mt-2 truncate text-xl font-black">{job.job_type || "Waste Collection"}</h3>
          </div>
          <StatusBadge status={job.status || "pending"} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <JobLine label="Location" value={job.postcode || "Not provided"} />
          <JobLine label="Collection date" value={job.preferred_date ? formatDate(job.preferred_date) : "Not provided"} />
          <JobLine label="Load size" value={job.load_size || "Not specified"} />
          <JobLine label="Time" value={job.preferred_time || "Any time"} />
        </div>

        {cancelled && (
          <div className="mt-5 rounded-2xl border border-red-900/60 bg-[#230e0e] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-300">Collection cancelled</p>
            <p className="mt-2 text-sm leading-6 text-red-200/70">
              {job.cancellation_reason || DEFAULT_CANCELLATION_REASON}
            </p>
          </div>
        )}

        <Link
          href={`/customer/jobs/${job.id}`}
          className="mt-6 block w-full rounded-xl border border-[#29483a] px-5 py-3.5 text-center font-black text-white hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
        >
          View Job
        </Link>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#657a70]">{label}</p>
      <p className="mt-2 break-words text-base font-black text-white">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#214333] bg-[#08150f] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#d5dfda]">{value}</p>
    </div>
  );
}

function JobLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-[#657a70]">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#d5dfda]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalised = normaliseStatus(status);
  let label = formatStatus(status);
  let className = "border-[#29483a] bg-[#18271f] text-[#b8c6c0]";

  if (["pending", "new", "open"].includes(normalised)) {
    label = normalised === "new" ? "NEW" : "WAITING";
    className = "border-amber-700/40 bg-amber-900/20 text-amber-300";
  }

  if (normalised === "bidding") {
    label = "BIDDING";
    className = "border-blue-700/40 bg-blue-900/20 text-blue-300";
  }

  if (["assigned", "accepted", "booked"].includes(normalised)) {
    label = "BOOKED";
    className = "border-[#3f8d24] bg-[#183017] text-[#1BBB8C]";
  }

  if (["on_the_way", "on the way", "driver_on_way", "driver on way"].includes(normalised)) {
    label = "ON THE WAY";
    className = "border-blue-700/40 bg-blue-900/20 text-blue-300";
  }

  if (["in_progress", "in progress", "collecting", "arrived"].includes(normalised)) {
    label = "IN PROGRESS";
    className = "border-blue-700/40 bg-blue-900/20 text-blue-300";
  }

  if (["completed", "complete"].includes(normalised)) {
    label = "COMPLETED";
    className = "border-[#3f8d24] bg-[#183017] text-[#1BBB8C]";
  }

  if (["cancelled", "canceled", "rejected"].includes(normalised)) {
    label = normalised === "rejected" ? "REJECTED" : "CANCELLED";
    className = "border-red-900/60 bg-red-900/20 text-red-300";
  }

  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {label}
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
            <p className={`mt-2 truncate text-[10px] font-black uppercase tracking-wider ${active ? "text-[#1BBB8C]" : "text-[#657a70]"}`}>
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
    <div className="rounded-2xl border border-[#17382b] bg-[#081710] p-4">
      <p className="text-sm font-black">{notification.title}</p>
      <p className="mt-1 text-sm leading-6 text-[#71867c]">{notification.text}</p>
      <div className="mt-4 flex gap-2">
        <Link
          href={notification.href}
          onClick={onOpen}
          className="rounded-xl bg-[#1BBB8C] px-4 py-2.5 text-xs font-black text-[#06100c]"
        >
          View
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-[#29483a] px-4 py-2.5 text-xs font-black text-[#71867c] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
        >
          Dismiss
        </button>
      </div>
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
  if (!target) return formatDate(date);

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

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
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

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}
