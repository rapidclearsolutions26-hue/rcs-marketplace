"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SupportMessage = {
  id: number;
  user_id: string;
  sender_role: "customer" | "admin";
  message: string;
  job_id: number | null;
  created_at: string;
  read_by_admin: boolean;
};

type Conversation = {
  user: { id: string; full_name: string; email: string; phone: string };
  messages: SupportMessage[];
  lastMessage: SupportMessage | null;
  unreadCount: number;
};

const supabase = createClient();

export default function AdminSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.user.id === selectedUserId) || conversations[0] || null,
    [conversations, selectedUserId],
  );

  const loadSupport = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setErrorMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your admin session has expired. Please log in again.");
      }

      const response = await fetch("/api/admin/support", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load support chats.");

      const next = Array.isArray(data.conversations) ? (data.conversations as Conversation[]) : [];
      setConversations(next);
      if (!selectedUserId && next[0]) setSelectedUserId(next[0].user.id);
      if (selectedUserId && !next.some((item) => item.user.id === selectedUserId) && next[0]) {
        setSelectedUserId(next[0].user.id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load support chats.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    void loadSupport();
    const interval = window.setInterval(() => void loadSupport(true), 10000);
    return () => window.clearInterval(interval);
  }, [loadSupport]);

  async function sendReply() {
    if (!selected || !message.trim() || sending) return;
    setSending(true);
    setErrorMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired. Please log in again.");

      const response = await fetch("/api/admin/support", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: selected.user.id, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to send reply.");
      setMessage("");
      await loadSupport(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send reply.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050705] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050705] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">RCS Admin</p>
            <h1 className="mt-1 text-xl font-black">Customer Support</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void loadSupport()} disabled={refreshing} className="rounded-xl border border-white/[0.12] px-4 py-2.5 text-xs font-black text-gray-300 hover:border-[#79c51c] hover:text-[#79c51c]">{refreshing ? "Refreshing..." : "Refresh"}</button>
            <Link href="/admin/dashboard" className="rounded-xl bg-[#79c51c] px-4 py-2.5 text-xs font-black text-[#050705]">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[320px_1fr] lg:px-6">
        {errorMessage && <div className="lg:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-bold text-red-300">{errorMessage}</div>}

        <aside className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0e0a]">
          <div className="border-b border-white/[0.07] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#79c51c]">Inbox</p>
            <p className="mt-1 text-sm font-black">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No customer support chats yet.</div>
            ) : conversations.map((conversation) => {
              const active = conversation.user.id === selected?.user.id;
              return (
                <button key={conversation.user.id} type="button" onClick={() => setSelectedUserId(conversation.user.id)} className={`mb-1 w-full rounded-2xl p-4 text-left transition ${active ? "bg-[#79c51c]/10 ring-1 ring-[#79c51c]/30" : "hover:bg-white/[0.03]"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">{initials(conversation.user.full_name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black">{conversation.user.full_name}</p>
                        {conversation.unreadCount > 0 && <span className="rounded-full bg-[#79c51c] px-2 py-0.5 text-[9px] font-black text-[#050705]">{conversation.unreadCount}</span>}
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-600">{conversation.lastMessage?.message || "No messages"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0e0a]">
          {selected ? (
            <>
              <div className="border-b border-white/[0.07] bg-[#080b08] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#79c51c]">Customer</p>
                <h2 className="mt-1 text-xl font-black">{selected.user.full_name}</h2>
                <p className="mt-1 text-xs text-gray-600">{selected.user.email || "No email"}{selected.user.phone ? ` · ${selected.user.phone}` : ""}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#050705] p-5">
                {selected.messages.map((item) => (
                  <div key={item.id} className={`flex ${item.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${item.sender_role === "admin" ? "bg-[#79c51c] text-[#050705]" : "border border-white/[0.08] bg-[#080b08] text-white"}`}>
                      <p className={`text-[9px] font-black uppercase tracking-[0.13em] ${item.sender_role === "admin" ? "text-[#17220f]/65" : "text-[#79c51c]"}`}>{item.sender_role === "admin" ? "RCS" : "Customer"}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                      <p className={`mt-2 text-[9px] ${item.sender_role === "admin" ? "text-[#17220f]/55" : "text-gray-700"}`}>{formatDateTime(item.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.07] bg-[#080b08] p-4">
                <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 4000))} rows={3} placeholder="Write a reply to the customer..." className="w-full resize-none rounded-2xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm outline-none placeholder:text-gray-700 focus:border-[#79c51c]/60" />
                <div className="mt-3 flex justify-end">
                  <button onClick={() => void sendReply()} disabled={!message.trim() || sending} className="rounded-xl bg-[#79c51c] px-5 py-3 text-xs font-black text-[#050705] hover:bg-[#91db32] disabled:opacity-50">{sending ? "SENDING..." : "SEND REPLY"}</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-600">Select a customer conversation.</div>
          )}
        </section>
      </div>
    </main>
  );
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}