import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyAdmin(request: Request) {
  if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin environment is not configured." },
        { status: 500 },
      ),
    };
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing authorization token." },
        { status: 401 },
      ),
    };
  }

  const accessToken = authorization.replace("Bearer ", "").trim();

  if (!accessToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing access token." },
        { status: 401 },
      ),
    };
  }

  const supabase = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid authentication." },
        { status: 401 },
      ),
    };
  }

  if (!user.email || user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    supabase,
  };
}

export async function GET(request: Request) {
  const verification = await verifyAdmin(request);

  if (!verification.ok) {
    return verification.response;
  }

  const supabase = verification.supabase;

  const { data: bids, error: bidsError } = await supabase
    .from("bids")
    .select("*")
    .order("created_at", { ascending: false });

  if (bidsError) {
    console.error("Admin bids query error:", bidsError);

    return NextResponse.json(
      {
        error: "Failed to load bids.",
        details: bidsError.message,
      },
      { status: 500 },
    );
  }

  const safeBids = bids ?? [];

  const jobIds = [
    ...new Set(
      safeBids
        .map((bid) => bid.job_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];

  const driverIds = [
    ...new Set(
      safeBids
        .map((bid) => bid.driver_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  let jobs: any[] = [];
  let drivers: any[] = [];

  if (jobIds.length > 0) {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        reference,
        customer_id,
        job_type,
        postcode,
        address,
        load_size,
        status,
        journey_status,
        payment_status,
        assigned_driver_id,
        assigned_bid_id,
        accepted_bid_id,
        created_at
      `,
      )
      .in("id", jobIds);

    if (error) {
      console.error("Admin bid jobs query error:", error);

      return NextResponse.json(
        {
          error: "Failed to load bid jobs.",
          details: error.message,
        },
        { status: 500 },
      );
    }

    jobs = data ?? [];
  }

  if (driverIds.length > 0) {
    const { data, error } = await supabase
      .from("drivers")
      .select(
        `
        id,
        full_name,
        trading_name,
        company_name,
        phone,
        email,
        vehicle_type,
        approved,
        application_status
      `,
      )
      .in("id", driverIds);

    if (error) {
      console.error("Admin bid drivers query error:", error);

      return NextResponse.json(
        {
          error: "Failed to load bid drivers.",
          details: error.message,
        },
        { status: 500 },
      );
    }

    drivers = data ?? [];
  }

  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const driverMap = new Map(drivers.map((driver) => [driver.id, driver]));

  const enrichedBids = safeBids.map((bid) => {
    const job = jobMap.get(bid.job_id) ?? null;
    const driver = driverMap.get(bid.driver_id) ?? null;

    const amount = Number(bid.amount ?? 0);
    const platformFeePercent = Number(bid.platform_fee_percent ?? 10);

    const storedDriverPayout = Number(bid.driver_payout ?? 0);

    const calculatedDriverPayout =
      storedDriverPayout > 0
        ? storedDriverPayout
        : Number(
            (amount * (1 - platformFeePercent / 100)).toFixed(2),
          );

    const calculatedPlatformFee = Number(
      (amount - calculatedDriverPayout).toFixed(2),
    );

    return {
      ...bid,

      job,
      driver,

      financials: {
        amount,
        platformFeePercent,
        platformFee: calculatedPlatformFee,
        driverPayout: calculatedDriverPayout,
      },
    };
  });

  const stats = {
    total: enrichedBids.length,

    pending: enrichedBids.filter(
      (bid) => String(bid.status).toLowerCase() === "pending",
    ).length,

    accepted: enrichedBids.filter(
      (bid) => String(bid.status).toLowerCase() === "accepted",
    ).length,

    rejected: enrichedBids.filter(
      (bid) => String(bid.status).toLowerCase() === "rejected",
    ).length,

    totalValue: Number(
      enrichedBids
        .reduce((total, bid) => total + bid.financials.amount, 0)
        .toFixed(2),
    ),

    totalPotentialFees: Number(
      enrichedBids
        .reduce(
          (total, bid) => total + bid.financials.platformFee,
          0,
        )
        .toFixed(2),
    ),
  };

  return NextResponse.json(
    {
      bids: enrichedBids,
      stats,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}