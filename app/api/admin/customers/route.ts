import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail =
  process.env.ADMIN_EMAIL;

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

type CustomerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
};

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin environment variables are missing.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

async function verifyAdmin(
  request: Request,
) {
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !adminEmail
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Admin environment is not configured.",
        },
        { status: 500 },
      ),
    };
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Missing authorization token.",
        },
        { status: 401 },
      ),
    };
  }

  const accessToken =
    authorization
      .replace("Bearer ", "")
      .trim();

  if (!accessToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Missing access token.",
        },
        { status: 401 },
      ),
    };
  }

  const supabase =
    getAdminClient();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser(
      accessToken,
    );

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Invalid authentication.",
        },
        { status: 401 },
      ),
    };
  }

  if (
    !user.email ||
    user.email.toLowerCase() !==
      adminEmail.toLowerCase()
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Admin access required.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
  };
}

export async function GET(
  request: Request,
) {
  try {
    const verification =
      await verifyAdmin(request);

    if (!verification.ok) {
      return verification.response;
    }

    const { supabase } =
      verification;

    // --------------------------------------------------
    // LOAD ONLY REAL CUSTOMER PROFILES
    // --------------------------------------------------

    /*
     * IMPORTANT:
     *
     * Do NOT load every Auth user here.
     *
     * Drivers and admins also exist in
     * Supabase Auth.
     *
     * The profiles.role column is the
     * source of truth for account type.
     */

    const {
      data: customerProfiles,
      error: customerProfilesError,
    } = await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        phone,
        email,
        created_at
      `,
      )
      .eq("role", "customer")
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (
      customerProfilesError
    ) {
      console.error(
        "Admin customer profiles error:",
        customerProfilesError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load customer accounts.",
          details:
            customerProfilesError.message,
        },
        { status: 500 },
      );
    }

    const customers =
      (customerProfiles ??
        []) as CustomerProfile[];

    // --------------------------------------------------
    // LOAD CUSTOMER JOBS
    // --------------------------------------------------

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
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (jobsError) {
      console.error(
        "Admin customers jobs error:",
        jobsError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load customer jobs.",
          details:
            jobsError.message,
        },
        { status: 500 },
      );
    }

    const customerJobs =
      (jobs ?? []) as CustomerJob[];

    // --------------------------------------------------
    // ONLY KEEP JOBS BELONGING TO REAL CUSTOMERS
    // --------------------------------------------------

    const customerIds =
      new Set(
        customers.map(
          (customer) =>
            customer.id,
        ),
      );

    const validCustomerJobs =
      customerJobs.filter(
        (job) =>
          job.customer_id &&
          customerIds.has(
            job.customer_id,
          ),
      );

    // --------------------------------------------------
    // GROUP JOBS BY CUSTOMER
    // --------------------------------------------------

    const jobsByCustomer =
      new Map<
        string,
        CustomerJob[]
      >();

    for (
      const job of validCustomerJobs
    ) {
      if (!job.customer_id) {
        continue;
      }

      const existing =
        jobsByCustomer.get(
          job.customer_id,
        ) ?? [];

      existing.push(job);

      jobsByCustomer.set(
        job.customer_id,
        existing,
      );
    }

    // --------------------------------------------------
    // LOAD ACCEPTED BID VALUES
    // --------------------------------------------------

    const acceptedBidIds = [
      ...new Set(
        validCustomerJobs
          .map(
            (job) =>
              job.accepted_bid_id,
          )
          .filter(
            (
              id,
            ): id is number =>
              typeof id ===
              "number",
          ),
      ),
    ];

    let bids: {
      id: number;
      amount:
        | number
        | null;
      job_id: number;
    }[] = [];

    if (
      acceptedBidIds.length > 0
    ) {
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
        .in(
          "id",
          acceptedBidIds,
        );

      if (error) {
        console.error(
          "Admin customers bids error:",
          error,
        );

        return NextResponse.json(
          {
            error:
              "Failed to load customer bid values.",
            details:
              error.message,
          },
          { status: 500 },
        );
      }

      bids = data ?? [];
    }

    const bidById =
      new Map(
        bids.map((bid) => [
          bid.id,
          bid,
        ]),
      );

    // --------------------------------------------------
    // BUILD CUSTOMER DATA
    // --------------------------------------------------

    const enrichedCustomers =
      customers.map(
        (customer) => {
          const jobsForCustomer =
            jobsByCustomer.get(
              customer.id,
            ) ?? [];

          let totalJobValue = 0;
          let paidJobValue = 0;

          for (
            const job of jobsForCustomer
          ) {
            if (
              job.accepted_bid_id
            ) {
              const bid =
                bidById.get(
                  job.accepted_bid_id,
                );

              const amount =
                Number(
                  bid?.amount ?? 0,
                );

              totalJobValue +=
                amount;

              if (
                String(
                  job.payment_status ??
                    "",
                ).toLowerCase() ===
                "paid"
              ) {
                paidJobValue +=
                  amount;
              }
            }
          }

          return {
            id: customer.id,

            email:
              customer.email ??
              null,

            full_name:
              customer.full_name ??
              null,

            phone:
              customer.phone ??
              null,

            created_at:
              customer.created_at ??
              null,

            job_count:
              jobsForCustomer.length,

            total_job_value:
              Number(
                totalJobValue.toFixed(
                  2,
                ),
              ),

            paid_job_value:
              Number(
                paidJobValue.toFixed(
                  2,
                ),
              ),

            jobs:
              jobsForCustomer,
          };
        },
      );

    // --------------------------------------------------
    // SORT NEWEST CUSTOMERS FIRST
    // --------------------------------------------------

    enrichedCustomers.sort(
      (a, b) => {
        const aTime =
          a.created_at
            ? new Date(
                a.created_at,
              ).getTime()
            : 0;

        const bTime =
          b.created_at
            ? new Date(
                b.created_at,
              ).getTime()
            : 0;

        return (
          bTime - aTime
        );
      },
    );

    // --------------------------------------------------
    // STATS
    // --------------------------------------------------

    const totalCustomers =
      enrichedCustomers.length;

    const customersWithJobs =
      enrichedCustomers.filter(
        (customer) =>
          customer.job_count >
          0,
      ).length;

    const totalJobs =
      validCustomerJobs.length;

    const totalJobValue =
      enrichedCustomers.reduce(
        (
          total,
          customer,
        ) =>
          total +
          Number(
            customer.total_job_value ??
              0,
          ),
        0,
      );

    const paidJobValue =
      enrichedCustomers.reduce(
        (
          total,
          customer,
        ) =>
          total +
          Number(
            customer.paid_job_value ??
              0,
          ),
        0,
      );

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json(
      {
        customers:
          enrichedCustomers,

        stats: {
          totalCustomers,

          customersWithJobs,

          totalJobs,

          totalJobValue:
            Number(
              totalJobValue.toFixed(
                2,
              ),
            ),

          paidJobValue:
            Number(
              paidJobValue.toFixed(
                2,
              ),
            ),
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Admin customers API error:",
      error,
    );

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