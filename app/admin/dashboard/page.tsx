"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: number;
  reference: string;
  customer_id: string;
  job_type: string | null;
  postcode: string | null;
  status: string | null;
  journey_status: string | null;
  payment_status: string | null;
  created_at: string;
};

type Driver = {
  id: string;
  full_name: string;
  email: string;
  application_status: string | null;
  approved: boolean;
  created_at: string;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number | null;
  status: string | null;
  platform_fee_percent: number | null;
  platform_fee: number | null;
  driver_payout: number | null;
  created_at: string;
};

type PayoutRequest = {
  id: number;
  driver_id: string;
  amount: number;
  status: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
};

type RealtimeState = "connecting" | "live" | "reconnecting" | "offline";

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";
const BORDER = "rgba(121,197,28,0.16)";
const SOFT_BORDER = "rgba(255,255,255,0.07)";

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("connecting");
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw new Error(sessionError.message);
      if (!session?.access_token) {
        throw new Error("Your admin session has expired. Please log in again.");
      }

      const response = await fetch("/api/admin/dashboard", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load admin dashboard.");

      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setDrivers(Array.isArray(data.drivers) ? data.drivers : []);
      setBids(Array.isArray(data.bids) ? data.bids : []);
      setPayoutRequests(Array.isArray(data.payoutRequests) ? data.payoutRequests : []);
    } catch (error) {
      console.error("Admin dashboard error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => void loadDashboard(true), 300);
    };

    const channel = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_payout_requests" }, scheduleRefresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeState("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeState("reconnecting");
        else if (status === "CLOSED") setRealtimeState("offline");
      });

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => void loadDashboard(true), 15000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const openJobs = jobs.filter((j) => ["open", "bidding"].includes(normalise(j.status)));
  const assignedJobs = jobs.filter((j) => normalise(j.status) === "assigned");
  const onTheWayJobs = jobs.filter((j) => normalise(j.journey_status) === "on_the_way");
  const inProgressJobs = jobs.filter((j) => normalise(j.journey_status) === "in_progress");
  const completedJobs = jobs.filter((j) => normalise(j.status) === "completed" || normalise(j.journey_status) === "completed");

  const pendingDrivers = drivers.filter((d) => normalise(d.application_status) === "pending");
  const approvedDrivers = drivers.filter((d) => normalise(d.application_status) === "approved" || d.approved === true);
  const suspendedDrivers = drivers.filter((d) => normalise(d.application_status) === "suspended");

  const acceptedBids = bids.filter((b) => normalise(b.status) === "accepted");
  const pendingBids = bids.filter((b) => !b.status || normalise(b.status) === "pending");
  const paidJobs = jobs.filter((j) => normalise(j.payment_status) === "paid");

  const totalAcceptedValue = acceptedBids.reduce((t, b) => t + Number(b.amount || 0), 0);
  const totalRcsFees = acceptedBids.reduce((t, b) => t + Number(b.platform_fee || 0), 0);
  const totalDriverPayouts = acceptedBids.reduce((t, b) => t + Number(b.driver_payout || 0), 0);

  const pendingPayoutRequests = payoutRequests.filter((r) => normalise(r.status) === "pending");
  const totalPendingPayouts = pendingPayoutRequests.reduce((t, r) => t + Number(r.amount || 0), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#182017] border-t-[#79c51c]" />
            <p className="mt-5 text-lg font-black">Loading admin dashboard...</p>
            <p className="mt-2 text-sm text-zinc-500">Getting the latest marketplace data</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] pb-10 text-white">
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #050705; }
        .admin-scroll::-webkit-scrollbar { height: 5px; }
        .admin-scroll::-webkit-scrollbar-track { background: transparent; }
        .admin-scroll::-webkit-scrollbar-thumb { background: rgba(121,197,28,.25); border-radius: 999px; }
        .admin-card { transition: transform .18s ease, border-color .18s ease, background .18s ease; }
        .admin-card:hover { transform: translateY(-2px); border-color: rgba(121,197,28,.38) !important; background: #0c110c !important; }
        .admin-link:hover { color: #91db32 !important; }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-[rgba(121,197,28,0.16)] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin/dashboard" className="shrink-0">
            <Image src="/rapid-clear-logo.png" alt="Rapid Clear Solutions" width={180} height={55} priority className="h-10 w-auto object-contain sm:h-12" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <RealtimeIndicator state={realtimeState} />
            <div className="hidden text-right md:block">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">RCS Admin</p>
              <p className="mt-1 text-xs text-zinc-500">Marketplace Control Centre</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await createClient().auth.signOut();
                window.location.href = "/admin/login";
              }}
              className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 text-xs font-black text-zinc-300 transition hover:border-[#79c51c]/50 hover:text-[#91db32] sm:px-4"
            >
              LOG OUT
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-[rgba(121,197,28,0.16)] bg-[#080b08]">
        <div className="admin-scroll mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
          <AdminNavLink href="/admin/dashboard" label="Dashboard" active />
          <AdminNavLink href="/admin/jobs" label="Jobs" />
          <AdminNavLink href="/admin/drivers" label="Drivers" />
          <AdminNavLink href="/admin/customers" label="Customers" />
          <AdminNavLink href="/admin/bids" label="Bids" />
          <AdminNavLink href="/admin/payouts" label="Payouts" />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="mb-7 overflow-hidden rounded-3xl border border-[rgba(121,197,28,0.16)] bg-[#080b08] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c] sm:text-xs">Rapid Clear Solutions</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">Admin Control Centre</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Manage marketplace jobs, drivers, customers, bids, payments and payouts from one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={refreshing}
              className="min-h-12 rounded-xl border border-white/[0.07] bg-white/[0.025] px-5 py-3 text-sm font-black text-zinc-200 transition hover:border-[#79c51c]/50 hover:text-[#91db32] disabled:opacity-50"
            >
              {refreshing ? "Updating..." : "Refresh Dashboard"}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-4">
            <RealtimeIndicator state={realtimeState} detailed />
            <span className="text-xs text-zinc-600">Live marketplace updates are enabled.</span>
          </div>
        </section>

        {errorMessage && (
          <section className="mb-7 rounded-2xl border border-red-400/20 bg-red-950/20 p-5">
            <p className="text-sm font-semibold leading-6 text-red-300">{errorMessage}</p>
            <button type="button" onClick={() => void loadDashboard()} className="mt-3 text-sm font-black text-red-200 underline">Try again</button>
          </section>
        )}

        <SectionHeading eyebrow="Overview" title="Marketplace at a glance" />
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard title="Total Jobs" number={jobs.length} description="All marketplace jobs" icon="JOB" href="/admin/jobs" />
          <StatCard title="Approved Drivers" number={approvedDrivers.length} description="Active drivers" icon="DRV" href="/admin/drivers" />
          <StatCard title="Customers" number={uniqueCustomers(jobs)} description="Customers with jobs" icon="CUS" href="/admin/customers" />
          <StatCard title="Accepted Value" number={`£${formatMoney(totalAcceptedValue)}`} description="Accepted driver bids" icon="£" href="/admin/jobs" />
        </section>

        <div className="mt-8">
          <SectionHeading eyebrow="Action Centre" title="Needs your attention" />
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard href="/admin/drivers" label="Driver Applications" value={pendingDrivers.length} description="Applications waiting for review" highlighted={pendingDrivers.length > 0} />
            <ActionCard href="/admin/jobs" label="Open Jobs" value={openJobs.length} description="Jobs waiting for drivers" highlighted={openJobs.length > 0} />
            <ActionCard href="/admin/bids" label="Pending Bids" value={pendingBids.length} description="Driver quotes awaiting decisions" highlighted={pendingBids.length > 0} />
            <ActionCard href="/admin/payouts" label="Driver Payouts" value={pendingPayoutRequests.length} description={pendingPayoutRequests.length ? `£${formatMoney(totalPendingPayouts)} waiting to process` : "No payout requests waiting"} highlighted={pendingPayoutRequests.length > 0} />
          </section>
        </div>

        <div className="mt-8">
          <SectionHeading eyebrow="Operations" title="Job Overview" description="Track every stage of the customer journey." />
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <OverviewCard title="Open / Bidding" number={openJobs.length} description="Waiting for drivers" link="/admin/jobs" />
            <OverviewCard title="Assigned" number={assignedJobs.length} description="Driver assigned" link="/admin/jobs" />
            <OverviewCard title="On The Way" number={onTheWayJobs.length} description="Driver travelling" link="/admin/jobs" />
            <OverviewCard title="In Progress" number={inProgressJobs.length} description="Collection underway" link="/admin/jobs" />
            <OverviewCard title="Completed" number={completedJobs.length} description="Finished jobs" link="/admin/jobs" />
          </section>
        </div>

        <div className="mt-8">
          <SectionHeading eyebrow="Workforce" title="Driver Overview" />
          <section className="grid gap-3 sm:grid-cols-3">
            <OverviewCard title="Pending Applications" number={pendingDrivers.length} description="Need reviewing" link="/admin/drivers" />
            <OverviewCard title="Approved Drivers" number={approvedDrivers.length} description="Currently active" link="/admin/drivers" />
            <OverviewCard title="Suspended" number={suspendedDrivers.length} description="Currently suspended" link="/admin/drivers" />
          </section>
        </div>

        <div className="mt-8">
          <SectionHeading eyebrow="Finance" title="Financial Overview" description="Marketplace payment and commission figures." />
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FinanceCard title="Accepted Value" value={`£${formatMoney(totalAcceptedValue)}`} description="Accepted bids" />
            <FinanceCard title="RCS Fees" value={`£${formatMoney(totalRcsFees)}`} description="Platform fees" />
            <FinanceCard title="Driver Payouts" value={`£${formatMoney(totalDriverPayouts)}`} description="Stored payouts" />
            <FinanceCard title="Paid Jobs" value={String(paidJobs.length)} description="Payment received" />
          </section>
        </div>

        <div className="mt-8">
          <SectionHeading eyebrow="Management" title="Marketplace Management" />
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ManagementCard href="/admin/jobs" title="Jobs" description="View and manage all marketplace jobs." number={jobs.length} />
            <ManagementCard href="/admin/drivers" title="Drivers" description="Review applications and manage drivers." number={drivers.length} />
            <ManagementCard href="/admin/customers" title="Customers" description="View customers and their jobs." number={uniqueCustomers(jobs)} />
            <ManagementCard href="/admin/bids" title="Bids" description="Review driver quotes and pricing." number={bids.length} />
            <ManagementCard href="/admin/payouts" title="Payouts" description="Review and process driver payments." number={pendingPayoutRequests.length} highlighted={pendingPayoutRequests.length > 0} />
          </section>
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <RecentJobs jobs={jobs.slice(0, 5)} />
          <RecentDrivers drivers={drivers.slice(0, 5)} />
        </section>

        <section className="mt-8">
          <Link href="/admin/payouts" className="admin-card block rounded-3xl border border-[rgba(121,197,28,0.16)] bg-[#080b08] p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">Driver Payments</p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">Driver Payout Control</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Review payout requests, check driver payment information and process weekly driver payments.
                </p>
              </div>
              <div className="flex min-h-12 items-center justify-center rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-[#050705]">Open Payouts</div>
            </div>
          </Link>
        </section>

        <section className="mt-8 rounded-3xl border border-[rgba(121,197,28,0.16)] bg-[#0a0e0a] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">RCS Marketplace</p>
              <h2 className="mt-2 text-xl font-black">Operations Control Centre</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Monitor customer jobs, driver activity, marketplace payments and driver payouts.
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(121,197,28,0.16)] bg-[rgba(121,197,28,0.06)] px-6 py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">RCS Platform Fee</p>
              <p className="mt-1 text-3xl font-black text-[#79c51c]">10%</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c] sm:text-xs">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>}
    </div>
  );
}

function AdminNavLink({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-xl border px-3.5 py-2.5 text-xs font-black transition sm:px-4 sm:text-sm"
      style={{
        background: active ? GREEN : "rgba(255,255,255,0.025)",
        color: active ? BG : "#a1a1aa",
        borderColor: active ? GREEN : SOFT_BORDER,
      }}
    >
      {label}
    </Link>
  );
}

function RealtimeIndicator({ state, detailed = false }: { state: RealtimeState; detailed?: boolean }) {
  let label = "Connecting";
  let dot = "#f0b429";
  let text = "#f6d68a";

  if (state === "live") {
    label = "Live";
    dot = GREEN;
    text = "#b8ef7a";
  } else if (state === "reconnecting") {
    label = "Reconnecting";
  } else if (state === "offline") {
    label = "Offline";
    dot = "#f87171";
    text = "#fca5a5";
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${detailed ? "px-3 py-1.5" : "px-2.5 py-1"}`}
      style={{ background: "rgba(255,255,255,0.025)", borderColor: SOFT_BORDER }}
    >
      <span className={`h-2 w-2 rounded-full ${state === "live" ? "animate-pulse" : ""}`} style={{ background: dot }} />
      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: text }}>{label}</span>
    </div>
  );
}

function StatCard({ title, number, description, icon, href }: { title: string; number: number | string; description: string; icon: string; href: string }) {
  return (
    <Link href={href} className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-6" style={{ background: CARD, borderColor: SOFT_BORDER }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wide text-[#79c51c] sm:text-xs">{title}</p>
          <p className="mt-2 truncate text-2xl font-black sm:text-4xl">{number}</p>
          <p className="mt-1 truncate text-[10px] text-zinc-600 sm:text-sm">{description}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-[rgba(121,197,28,0.08)] text-[9px] font-black text-[#79c51c] sm:h-12 sm:w-12" style={{ borderColor: BORDER }}>{icon}</div>
      </div>
      <p className="mt-3 text-[10px] font-black text-[#79c51c] sm:text-xs">Open →</p>
    </Link>
  );
}

function ActionCard({ href, label, value, description, highlighted = false }: { href: string; label: string; value: number | string; description: string; highlighted?: boolean }) {
  return (
    <Link href={href} className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-5" style={{ background: highlighted ? "rgba(121,197,28,0.08)" : CARD, borderColor: highlighted ? "rgba(121,197,28,0.34)" : SOFT_BORDER }}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-black sm:text-sm">{label}</p>
        <span className="text-xl font-black text-[#79c51c] sm:text-2xl">{value}</span>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-zinc-600 sm:text-xs">{description}</p>
    </Link>
  );
}

function OverviewCard({ title, number, description, link }: { title: string; number: number; description: string; link?: string }) {
  const content = (
    <div className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-5" style={{ background: CARD, borderColor: SOFT_BORDER }}>
      <p className="text-xs font-black leading-5 sm:text-sm">{title}</p>
      <p className="mt-2 text-2xl font-black text-[#79c51c] sm:text-3xl">{number}</p>
      <p className="mt-1 text-[10px] leading-4 text-zinc-600 sm:text-xs">{description}</p>
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}

function FinanceCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border p-4 sm:rounded-3xl sm:p-6" style={{ background: CARD, borderColor: SOFT_BORDER }}>
      <p className="text-[10px] font-black uppercase tracking-wide text-[#79c51c] sm:text-xs">{title}</p>
      <p className="mt-2 truncate text-xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-[10px] text-zinc-600 sm:text-sm">{description}</p>
    </div>
  );
}

function ManagementCard({ href, title, description, number, highlighted = false }: { href: string; title: string; description: string; number: number; highlighted?: boolean }) {
  return (
    <Link href={href} className="admin-card rounded-2xl border p-4 sm:rounded-3xl sm:p-6" style={{ background: highlighted ? "rgba(121,197,28,0.08)" : CARD, borderColor: highlighted ? "rgba(121,197,28,0.34)" : SOFT_BORDER }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black sm:text-xl">{title}</h3>
        <span className="rounded-full border bg-[rgba(121,197,28,0.06)] px-2.5 py-1 text-[10px] font-black text-[#79c51c] sm:px-3 sm:text-xs" style={{ borderColor: BORDER }}>{number}</span>
      </div>
      <p className="mt-2 text-[10px] leading-5 text-zinc-600 sm:text-sm sm:leading-6">{description}</p>
      <p className="mt-3 text-[10px] font-black text-[#79c51c] sm:text-xs">Open {title} →</p>
    </Link>
  );
}

function RecentJobs({ jobs }: { jobs: Job[] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">Latest Activity</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">Recent Jobs</h2>
        </div>
        <Link href="/admin/jobs" className="admin-link text-xs font-black text-[#79c51c] sm:text-sm">View all</Link>
      </div>
      <div className="space-y-3">
        {jobs.length === 0 ? <EmptyCard text="No jobs yet." /> : jobs.map((job) => (
          <Link key={job.id} href="/admin/jobs" className="admin-card block rounded-2xl border p-4 sm:p-5" style={{ background: CARD, borderColor: SOFT_BORDER }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black sm:text-base">{job.reference}</p>
                <p className="mt-1 truncate text-xs font-semibold text-zinc-400 sm:text-sm">{job.job_type || "Job type not specified"}</p>
                <p className="mt-1 text-[11px] text-zinc-600">{job.postcode || "No postcode"}</p>
              </div>
              <StatusBadge status={job.status} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentDrivers({ drivers }: { drivers: Driver[] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">Latest Activity</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">Recent Drivers</h2>
        </div>
        <Link href="/admin/drivers" className="admin-link text-xs font-black text-[#79c51c] sm:text-sm">View all</Link>
      </div>
      <div className="space-y-3">
        {drivers.length === 0 ? <EmptyCard text="No drivers yet." /> : drivers.map((driver) => (
          <Link key={driver.id} href="/admin/drivers" className="admin-card block rounded-2xl border p-4 sm:p-5" style={{ background: CARD, borderColor: SOFT_BORDER }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black sm:text-base">{driver.full_name}</p>
                <p className="mt-1 truncate text-xs text-zinc-600 sm:text-sm">{driver.email}</p>
              </div>
              <StatusBadge status={driver.application_status} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const safe = normalise(status) || "unknown";
  let background = "rgba(255,255,255,0.025)";
  let border = SOFT_BORDER;
  let text = "#a1a1aa";

  if (["open", "bidding", "pending"].includes(safe)) {
    background = "rgba(240,180,41,0.10)";
    border = "rgba(240,180,41,0.28)";
    text = "#f6d68a";
  } else if (["assigned", "approved", "completed", "paid"].includes(safe)) {
    background = "rgba(121,197,28,0.10)";
    border = "rgba(121,197,28,0.28)";
    text = "#b8ef7a";
  } else if (["rejected", "cancelled"].includes(safe)) {
    background = "rgba(127,29,29,0.14)";
    border = "rgba(248,113,113,0.24)";
    text = "#fca5a5";
  }

  return (
    <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-[8px] font-black uppercase sm:px-2.5 sm:text-[10px]" style={{ background, borderColor: border, color: text }}>
      {formatStatus(safe)}
    </span>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed p-6 text-center text-sm font-semibold" style={{ background: CARD, borderColor: SOFT_BORDER, color: "#52525b" }}>{text}</div>;
}

function normalise(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function formatStatus(value: string | null | undefined) {
  return (normalise(value) || "unknown").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: number) {
  return Number(value || 0).toFixed(2);
}

function uniqueCustomers(jobs: Job[]) {
  return new Set(jobs.map((job) => job.customer_id).filter(Boolean)).size;
}
