import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail =
  process.env.ADMIN_EMAIL;

const PHOTO_BUCKET =
  "customer-job-photos";

type Job = {
  id: number;
  reference: string;
  customer_id: string;
  job_type: string | null;
  postcode: string | null;
  address: string | null;
  load_size: string | null;
  description: string | null;
  floor: string | null;
  stairs: boolean | null;
  access_notes: string | null;
  preferred_date: string | null;
  preferred_time: number | string | null;
  status: string | null;
  accepted_bid_id: number | null;
  created_at: string;
  assigned_driver_id: string | null;
  assigned_bid_id: number | null;
  journey_status: string | null;
  payment_status: string | null;
  stripe_checkout_session_id:
    | string
    | null;
  stripe_payment_intent_id:
    | string
    | null;
};

type Bid = {
  id: number;
  job_id: number;
  driver_id: string;
  amount: number | null;
  message: string | null;
  status: string | null;
  created_at: string;
  accepted_at: string | null;
  platform_fee_percent:
    | number
    | null;
  platform_fee:
    | number
    | null;
  driver_payout:
    | number
    | null;
};

type Driver = {
  id: string;
  full_name: string | null;
  trading_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  vehicle_type: string | null;
  approved: boolean | null;
  application_status: string | null;
};

type JobPhoto = {
  id: number;
  job_id: number;
  storage_path: string;
};

type CustomerPhoto = {
  id: number;
  job_id: number;
  storage_path: string;
  url: string;
};

function getAdminClient() {
  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
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
      response:
        NextResponse.json(
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
      response:
        NextResponse.json(
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
      response:
        NextResponse.json(
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
      response:
        NextResponse.json(
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
      response:
        NextResponse.json(
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

    /*
     * -------------------------------------------------------
     * LOAD JOBS
     * -------------------------------------------------------
     */

    const {
      data: jobsData,
      error: jobsError,
    } =
      await supabase
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
          floor,
          stairs,
          access_notes,
          preferred_date,
          preferred_time,
          status,
          accepted_bid_id,
          created_at,
          assigned_driver_id,
          assigned_bid_id,
          journey_status,
          payment_status,
          stripe_checkout_session_id,
          stripe_payment_intent_id
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
        "Admin jobs query error:",
        jobsError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load jobs.",
          details:
            jobsError.message,
        },
        { status: 500 },
      );
    }

    const jobs =
      (jobsData ?? []) as Job[];

    /*
     * -------------------------------------------------------
     * NO JOBS
     * -------------------------------------------------------
     */

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          jobs: [],
          stats: {
            total: 0,
            open: 0,
            assigned: 0,
            completed: 0,
            paid: 0,
            totalValue: 0,
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
    }

    const jobIds = [
      ...new Set(
        jobs.map(
          (job) => job.id,
        ),
      ),
    ];

    /*
     * -------------------------------------------------------
     * ASSIGNED DRIVER IDS
     * -------------------------------------------------------
     */

    const driverIds = [
      ...new Set(
        jobs
          .map(
            (job) =>
              job.assigned_driver_id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    ];

    /*
     * -------------------------------------------------------
     * LOAD BIDS + DRIVERS + PHOTOS
     * -------------------------------------------------------
     */

    const bidsPromise =
      supabase
        .from("bids")
        .select(
          `
          id,
          job_id,
          driver_id,
          amount,
          message,
          status,
          created_at,
          accepted_at,
          platform_fee_percent,
          platform_fee,
          driver_payout
        `,
        )
        .in(
          "job_id",
          jobIds,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    const driversPromise =
      driverIds.length > 0
        ? supabase
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
            .in(
              "id",
              driverIds,
            )
        : Promise.resolve({
            data: [],
            error: null,
          });

    const photosPromise =
      supabase
        .from("job_photos")
        .select(
          "id, job_id, storage_path",
        )
        .in(
          "job_id",
          jobIds,
        )
        .order("id", {
          ascending: true,
        });

    const [
      bidsResult,
      driversResult,
      photosResult,
    ] = await Promise.all([
      bidsPromise,
      driversPromise,
      photosPromise,
    ]);

    /*
     * -------------------------------------------------------
     * BIDS ERROR
     * -------------------------------------------------------
     */

    if (bidsResult.error) {
      console.error(
        "Admin jobs bids query error:",
        bidsResult.error,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load job bids.",
          details:
            bidsResult.error.message,
        },
        { status: 500 },
      );
    }

    /*
     * -------------------------------------------------------
     * DRIVERS ERROR
     * -------------------------------------------------------
     */

    if (driversResult.error) {
      console.error(
        "Admin jobs drivers query error:",
        driversResult.error,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load assigned drivers.",
          details:
            driversResult.error.message,
        },
        { status: 500 },
      );
    }

    /*
     * -------------------------------------------------------
     * PHOTOS ERROR
     * -------------------------------------------------------
     */

    if (photosResult.error) {
      console.error(
        "Admin jobs photos query error:",
        photosResult.error,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load customer photos.",
          details:
            photosResult.error.message,
        },
        { status: 500 },
      );
    }

    const bids =
      (bidsResult.data ??
        []) as Bid[];

    const drivers =
      (driversResult.data ??
        []) as Driver[];

    const photoRows =
      (photosResult.data ??
        []) as JobPhoto[];

    /*
     * -------------------------------------------------------
     * DRIVER MAP
     * -------------------------------------------------------
     */

    const driverMap =
      new Map<
        string,
        Driver
      >(
        drivers.map(
          (driver) => [
            driver.id,
            driver,
          ],
        ),
      );

    /*
     * -------------------------------------------------------
     * BID MAP
     * -------------------------------------------------------
     */

    const bidMap =
      new Map<
        number,
        Bid
      >(
        bids.map((bid) => [
          bid.id,
          bid,
        ]),
      );

    /*
     * -------------------------------------------------------
     * BIDS BY JOB
     * -------------------------------------------------------
     */

    const bidsByJob =
      new Map<
        number,
        Bid[]
      >();

    for (const bid of bids) {
      const existing =
        bidsByJob.get(
          bid.job_id,
        ) ?? [];

      existing.push(bid);

      bidsByJob.set(
        bid.job_id,
        existing,
      );
    }

    /*
     * -------------------------------------------------------
     * CREATE SIGNED PHOTO URLS
     * -------------------------------------------------------
     *
     * The customer-job-photos bucket remains PRIVATE.
     *
     * The server creates temporary signed URLs so the
     * admin can view the images without making the bucket
     * public.
     */

    const signedPhotos =
      await Promise.all(
        photoRows.map(
          async (photo) => {
            try {
              const {
                data,
                error,
              } =
                await supabase.storage
                  .from(
                    PHOTO_BUCKET,
                  )
                  .createSignedUrl(
                    photo.storage_path,
                    60 * 60,
                  );

              if (
                error ||
                !data?.signedUrl
              ) {
                console.error(
                  "Admin photo signed URL error:",
                  {
                    photoId:
                      photo.id,
                    path:
                      photo.storage_path,
                    error,
                  },
                );

                return null;
              }

              return {
                id: photo.id,
                job_id:
                  photo.job_id,
                storage_path:
                  photo.storage_path,
                url:
                  data.signedUrl,
              } satisfies CustomerPhoto;
            } catch (error) {
              console.error(
                "Admin photo processing error:",
                error,
              );

              return null;
            }
          },
        ),
      );

    /*
     * -------------------------------------------------------
     * PHOTOS BY JOB
     * -------------------------------------------------------
     */

    const photosByJob =
      new Map<
        number,
        CustomerPhoto[]
      >();

    for (const photo of signedPhotos) {
      if (!photo) {
        continue;
      }

      const existing =
        photosByJob.get(
          photo.job_id,
        ) ?? [];

      existing.push(photo);

      photosByJob.set(
        photo.job_id,
        existing,
      );
    }

    /*
     * -------------------------------------------------------
     * ENRICH JOBS
     * -------------------------------------------------------
     */

    const enrichedJobs =
      jobs.map((job) => {
        const jobBids =
          bidsByJob.get(
            job.id,
          ) ?? [];

        const winningBidId =
          job.accepted_bid_id ??
          job.assigned_bid_id ??
          null;

        const winningBid =
          winningBidId !== null
            ? bidMap.get(
                winningBidId,
              ) ?? null
            : null;

        const assignedDriver =
          job.assigned_driver_id
            ? driverMap.get(
                job.assigned_driver_id,
              ) ?? null
            : null;

        return {
          ...job,

          customerPhotos:
            photosByJob.get(
              job.id,
            ) ?? [],

          winningBid:
            winningBid
              ? {
                  ...winningBid,
                  driver:
                    driverMap.get(
                      winningBid.driver_id,
                    ) ?? null,
                }
              : null,

          assignedDriver,

          bidCount:
            jobBids.length,
        };
      });

    /*
     * -------------------------------------------------------
     * STATS
     * -------------------------------------------------------
     */

    const openJobs =
      jobs.filter((job) =>
        [
          "open",
          "bidding",
        ].includes(
          String(
            job.status ?? "",
          ).toLowerCase(),
        ),
      );

    const assignedJobs =
      jobs.filter(
        (job) =>
          String(
            job.status ?? "",
          ).toLowerCase() ===
            "assigned" ||
          String(
            job.journey_status ??
              "",
          ).toLowerCase() ===
            "assigned",
      );

    const completedJobs =
      jobs.filter(
        (job) =>
          String(
            job.status ?? "",
          ).toLowerCase() ===
            "completed" ||
          String(
            job.journey_status ??
              "",
          ).toLowerCase() ===
            "completed",
      );

    const paidJobs =
      jobs.filter(
        (job) =>
          String(
            job.payment_status ??
              "",
          ).toLowerCase() ===
          "paid",
      );

    const totalValue =
      enrichedJobs.reduce(
        (total, job) => {
          const amount =
            Number(
              job.winningBid
                ?.amount ?? 0,
            );

          return (
            total + amount
          );
        },
        0,
      );

    /*
     * -------------------------------------------------------
     * RESPONSE
     * -------------------------------------------------------
     */

    return NextResponse.json(
      {
        jobs:
          enrichedJobs,

        stats: {
          total:
            jobs.length,

          open:
            openJobs.length,

          assigned:
            assignedJobs.length,

          completed:
            completedJobs.length,

          paid:
            paidJobs.length,

          totalValue:
            Number(
              totalValue.toFixed(
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
      "Admin jobs API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load jobs.",
      },
      { status: 500 },
    );
  }
}