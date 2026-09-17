"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SupportMessage = {
  id: number;
  user_id: string;
  sender_role: "customer" | "admin";
  message: string;
  job_id: number | null;
  created_at: string;
};

type Job = {
  id: number;
  reference: string | null;
  job_type: string | null;
};

const supabase = createClient();
const MAX_MESSAGE_LENGTH = 4000;

function CustomerSupportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedJobId = Number(searchParams.get("jobId") || 0) || null;
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState<number | null>(requestedJobId);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadChat = useCallback(async () => {
    setErrorMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/customer/login");
      return;
    }

    setUserId(user.id);

    const [{ data: messagesData, error: messagesError }, { data: jobsData, error: jobsError }] =
      await Promise.all([
        supabase
          .from("customer_support_messages")
          .select("id, user_id, sender_role, message, job_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("jobs")
          .select("id, reference, job_type")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (messagesError) {
      setErrorMessage(messagesError.message || "Unable to load your support chat.");
    } else {
      setMessages((messagesData || []) as SupportMessage[]);
    }

    if (!jobsError) {
      const nextJobs = (jobsData || []) as Job[];
      setJobs(nextJobs);
      if (requestedJobId && nextJobs.some((job) => job.id === requestedJobId)) {
        setJobId(requestedJobId);
      }
    }

    setLoading(false);
  }, [requestedJobId, router]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`customer-support-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_support_messages",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadChat();
        },
      )
      .subscribe();

    const interval = window.setInterval(() => void loadChat(), 10000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadChat, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const latestMessage = messages[messages.length - 1] || null;
  const supportStatus = useMemo(() => {
    if (!latestMessage) return "Start a conversation with RCS support";
    return latestMessage.sender_role === "admin"
      ? "RCS has replied to your chat"
      : "Your message has been sent to RCS";
  }, [latestMessage]);

  async function sendMessage() {
    const clean = message.trim();
    if (!clean || sending) return;

    if (clean.length > MAX_MESSAGE_LENGTH) {
      setErrorMessage(`Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setSending(true);
    setErrorMessage("");

    const { error } = await supabase.from("customer_support_messages").insert({
      user_id: userId,
      sender_role: "customer",
      message: clean,
      job_id: jobId,
      read_by_admin: false,
      read_by_customer: true,
    });

    if (error) {
      setErrorMessage(error.message || "Unable to send your message.");
    } else {
      setMessage("");
      await loadChat();
    }

    setSending(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />
            <p className="mt-5 text-lg font-black">Loading RCS support...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050705] pb-6 text-white">
      <header className="pwa-header sticky top-0 z-40 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/customer/dashboard" className="flex items-center">
            <Image src="/rapid-clear-logo.png" alt="Rapid Clear Solutions" width={180} height={55} priority className="h-10 w-auto" />
          </Link>
          <Link href="/customer/dashboard" className="rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-xs font-black text-gray-300 hover:border-[#79c51c]/50 hover:text-[#79c51c]">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0e0a] shadow-2xl">
          <div className="border-b border-white/[0.07] bg-[#080b08] p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#79c51c] text-sm font-black text-[#050705]">RCS</div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">RCS Support</p>
                <h1 className="mt-1 text-xl font-black sm:text-2xl">Chat with the RCS team</h1>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">{supportStatus}. Keep everything about your collection inside your account.</p>
              </div>
              <span className="hidden rounded-full border border-[#79c51c]/20 bg-[#79c51c]/5 px-3 py-1 text-[10px] font-black text-[#79c51c] sm:inline-flex">IN-HOUSE CHAT</span>
            </div>
          </div>

          <div className="border-b border-white/[0.07] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="font-black text-gray-300">Need help with:</span>
              <select
                value={jobId ?? ""}
                onChange={(event) => setJobId(event.target.value ? Number(event.target.value) : null)}
                className="rounded-xl border border-white/[0.10] bg-[#050705] px-3 py-2 text-xs font-bold text-gray-300 outline-none focus:border-[#79c51c]"
              >
                <option value="">General account support</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.reference || `RC-${String(job.id).padStart(6, "0")} – ${job.job_type || "Waste collection"}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-[420px] max-h-[58vh] space-y-3 overflow-y-auto bg-[#050705] p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#79c51c]/10 text-lg font-black text-[#79c51c]">RCS</div>
                  <h2 className="mt-5 text-xl font-black">How can we help?</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">Ask about a quote, collection, driver, payment, account or anything else connected to RCS.</p>
                </div>
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} className={`flex ${item.sender_role === "customer" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${item.sender_role === "customer" ? "bg-[#79c51c] text-[#050705]" : "border border-white/[0.08] bg-[#0a0e0a] text-white"}`}>
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-[9px] font-black uppercase tracking-[0.14em] ${item.sender_role === "customer" ? "text-[#17220f]/70" : "text-[#79c51c]"}`}>
                        {item.sender_role === "customer" ? "You" : "RCS Support"}
                      </p>
                      <time className={`text-[9px] font-bold ${item.sender_role === "customer" ? "text-[#17220f]/55" : "text-gray-600"}`}>
                        {formatDateTime(item.created_at)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {errorMessage && (
            <div className="mx-4 mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-bold text-red-300 sm:mx-6">{errorMessage}</div>
          )}

          <div className="border-t border-white/[0.07] bg-[#080b08] p-4 sm:p-6">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              rows={3}
              placeholder="Type your message to RCS..."
              className="w-full resize-none rounded-2xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-[#79c51c]/60"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[10px] text-gray-700">Press Enter to send · Shift + Enter for a new line</p>
              <button type="button" onClick={() => void sendMessage()} disabled={!message.trim() || sending} className="rounded-xl bg-[#79c51c] px-5 py-3 text-xs font-black text-[#050705] hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-50">
                {sending ? "SENDING..." : "SEND MESSAGE"}
              </button>
            </div>
          </div>
        </section>

        <p className="mt-4 text-center text-xs text-gray-700">RCS Support Chat keeps your customer support conversations inside your RCS account.</p>
      </div>
    </main>
  );
}

export default function CustomerSupportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050705] text-white">
          <div className="flex min-h-screen items-center justify-center px-5">
            <div className="text-center">
              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />
              <p className="mt-5 text-lg font-black">Loading RCS support...</p>
            </div>
          </div>
        </main>
      }
    >
      <CustomerSupportPageContent />
    </Suspense>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
