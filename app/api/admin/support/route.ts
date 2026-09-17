import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { authorized: false as const, error: "Missing authorization token." };
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    return { authorized: false as const, error: "Missing access token." };
  }

  if (!adminEmail) {
    return { authorized: false as const, error: "ADMIN_EMAIL is not configured." };
  }

  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user?.email || user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    return { authorized: false as const, error: "You are not authorised to access support." };
  }

  return { authorized: true as const, admin };
}

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });

    const { data: messages, error: messagesError } = await auth.admin
      .from("customer_support_messages")
      .select("id, user_id, sender_role, message, job_id, created_at, read_by_admin")
      .order("created_at", { ascending: true });

    if (messagesError) throw new Error(messagesError.message);

    const rows = (messages || []) as Array<{
      id: number;
      user_id: string;
      sender_role: "customer" | "admin";
      message: string;
      job_id: number | null;
      created_at: string;
      read_by_admin: boolean;
    }>;

    const userIds = Array.from(new Set(rows.map((item) => item.user_id)));
    const { data: profiles, error: profilesError } = userIds.length
      ? await auth.admin.from("profiles").select("id, full_name, email, phone").in("id", userIds)
      : { data: [], error: null };

    if (profilesError) throw new Error(profilesError.message);

    const profileMap = new Map(
      ((profiles || []) as Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }>).map((profile) => [profile.id, profile]),
    );

    const conversations = userIds.map((userId) => {
      const userMessages = rows.filter((item) => item.user_id === userId);
      const profile = profileMap.get(userId) || null;
      const lastMessage = userMessages[userMessages.length - 1] || null;
      const unreadCount = userMessages.filter((item) => item.sender_role === "customer" && !item.read_by_admin).length;

      return {
        user: {
          id: userId,
          full_name: profile?.full_name || "Customer",
          email: profile?.email || "",
          phone: profile?.phone || "",
        },
        messages: userMessages,
        lastMessage,
        unreadCount,
      };
    }).sort((a, b) => {
      const left = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const right = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return right - left;
    });

    return NextResponse.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin support GET error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load support chat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const jobId = typeof body?.jobId === "number" ? body.jobId : null;

    if (!userId || !message) {
      return NextResponse.json({ error: "Customer and message are required." }, { status: 400 });
    }

    if (message.length > 4000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const { error } = await auth.admin.from("customer_support_messages").insert({
      user_id: userId,
      sender_role: "admin",
      message,
      job_id: jobId,
      read_by_admin: true,
      read_by_customer: false,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin support POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send support reply." }, { status: 500 });
  }
}
