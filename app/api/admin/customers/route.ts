import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin environment variables are missing.",
    );
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
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Admin environment is not configured.",
        },
        { status: 500 },
      ),
    };
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Missing authorization token.",
        },
        { status: 401 },
      ),
    };
  }

  const accessToken = authorization
    .replace("Bearer ", "")
    .trim();

  if (!accessToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Missing access token.",
        },
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
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Invalid authentication.",
        },
        { status: 401 },
      ),
    };
  }

  const configuredAdminEmail = adminEmail;

  if (
    !user.email ||
    user.email.toLowerCase() !==
      configuredAdminEmail.toLowerCase()
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Admin access required.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    adminEmail: configuredAdminEmail,
  };
}

type CustomerJob = {
  id: number;
  reference: string | null;
  customer_id: string | null;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  description: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string | null;
  journey_status: string | null;
  payment_status: string | null;
  accepted_bid_id: number | null;
  assigned_driver_id: string | null;
  created_at: string | null;
};

type CustomerRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  job_count: number;
  total_job_value: number;
  paid_job_value: number;
  jobs: CustomerJob[];
};

async function getAllAuthUsers(
  supabase: ReturnType<typeof getAdminClient>,
): Promise<User[]> {
  const users: User[] = [];

  let page = 1;
  const perPage = 1000;

  while (true) {
    const {
      data,
      error,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(
        `Failed to load Auth users: ${error.message}`,
      );
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function getFullName(user: User) {
  const metadata = user.user_metadata ?? {};

  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name.trim()
      : "";

  if (fullName) {
    return fullName;
  }

  const name =
    typeof metadata.name === "string"
      ? metadata.name.trim()
      : "";

  return name || null;
}

function getPhone(user: User) {
  if (user.phone) {
    return user.phone;
  }

  const metadata = user.user_metadata ?? {};

  const phone =
    typeof metadata.phone === "string"
      ? metadata.phone.trim()
      : "";

  return phone || null;
}

export async function GET(request: Request) {
  try {
    const verification = await verifyAdmin(request);

    if (!verification.ok) {
      return verification.response;
    }

    const supabase = getAdminClient();
    const configuredAdminEmail = verification.adminEmail;

    const authUsers = await getAllAuthUsers(supabase);

    const {
      data: jobs,
      error: jobsError,
    } = await supabase
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
        description,
        preferred_date,
        preferred_time,
        status,
        journey_status,
        payment_status,
        accepted_bid_id,
        assigned_driver_id,
        created_at
      `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (jobsError) {
      console.error(
        "Admin customers jobs error:",
        jobsError,
      );

      return NextResponse.json(
        {
          error: "Failed to load customer jobs.",
          details: jobsError.message,
        },
        { status: 500 },
      );
    }

    const customerJobs = (jobs ?? []) as CustomerJob[];

    const jobsByCustomer = new Map<string, CustomerJob[]>();

    for (const job of customerJobs) {
      if (!job.customer_id) {
        continue;
      }

      const existing =
        jobsByCustomer.get(job.customer_id) ?? [];

      existing.push(job);

      jobsByCustomer.set(job.customer_id, existing);
    }

    const customers: CustomerRecord[] = authUsers
      .map((user) => {
        const jobsForCustomer =
          jobsByCustomer.get(user.id) ?? [];

        return {
          id: user.id,
          email: user.email ?? null,
          full_name: getFullName(user),
          phone: getPhone(user),
          created_at: user.created_at ?? null,
          last_sign_in_at: user.last_sign_in_at ?? null,
          job_count: jobsForCustomer.length,
          total_job_value: 0,
          paid_job_value: 0,
          jobs: jobsForCustomer,
        };
      })
      .filter((customer) => {
        return (
          !customer.email ||
          customer.email.toLowerCase() !==
            configuredAdminEmail.toLowerCase()
        );
      });

    const acceptedBidIds = [
      ...new Set(
        customerJobs
          .map((job) => job.accepted_bid_id)
          .filter(
            (id): id is number =>
              typeof id === "number",
          ),
      ),
    ];

    let bids: Array<{
      id: number;
      amount: number | null;
      job_id: number;
    }> = [];

    if (acceptedBidIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from("bids")
        .select(
          `
          id,
          amount,
          job_id
        `,
        )
        .in("id", acceptedBidIds);

      if (error) {
        console.error(
          "Admin customers bids error:",
          error,
        );

        return NextResponse.json(
          {
            error:
              "Failed to load customer bid values.",
            details: error.message,
          },
          { status: 500 },
        );
      }

      bids = data ?? [];
    }

    const bidById = new Map(
      bids.map((bid) => [bid.id, bid]),
    );

    const enrichedCustomers = customers.map((customer) => {
      let totalJobValue = 0;
      let paidJobValue = 0;

      for (const job of customer.jobs) {
        if (job.accepted_bid_id) {
          const bid = bidById.get(job.accepted_bid_id);
          const amount = Number(bid?.amount ?? 0);

          totalJobValue += amount;

          if (
            String(job.payment_status ?? "").toLowerCase() ===
            "paid"
          ) {
            paidJobValue += amount;
          }
        }
      }

      return {
        ...customer,
        total_job_value: Number(totalJobValue.toFixed(2)),
        paid_job_value: Number(paidJobValue.toFixed(2)),
      };
    });

    enrichedCustomers.sort((a, b) => {
      const aTime = a.created_at
        ? new Date(a.created_at).getTime()
        : 0;

      const bTime = b.created_at
        ? new Date(b.created_at).getTime()
        : 0;

      return bTime - aTime;
    });

    const totalCustomers = enrichedCustomers.length;

    const customersWithJobs = enrichedCustomers.filter(
      (customer) => customer.job_count > 0,
    ).length;

    const totalJobs = customerJobs.filter(
      (job) => job.customer_id !== null,
    ).length;

    const totalJobValue = enrichedCustomers.reduce(
      (total, customer) =>
        total + Number(customer.total_job_value ?? 0),
      0,
    );

    const paidJobValue = enrichedCustomers.reduce(
      (total, customer) =>
        total + Number(customer.paid_job_value ?? 0),
      0,
    );

    return NextResponse.json(
      {
        customers: enrichedCustomers,
        stats: {
          totalCustomers,
          customersWithJobs,
          totalJobs,
          totalJobValue: Number(totalJobValue.toFixed(2)),
          paidJobValue: Number(paidJobValue.toFixed(2)),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Admin customers API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load customers.",
      },
      { status: 500 },
    );
  }
}