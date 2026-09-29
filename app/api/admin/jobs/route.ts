import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail =
  process.env.ADMIN_EMAIL;

const PHOTO_BUCKET = "customer-job-photos";

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

export async function GET(
  request: Request
) {
  try {
    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    if (!adminEmail) {
      return NextResponse.json(
        {
          error:
            "ADMIN_EMAIL is not configured.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (!authorization) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace(
        "Bearer ",
        ""
      );

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * VERIFY ADMIN SESSION
     */
    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid authentication.",
        },
        { status: 401 }
      );
    }

    if (
      user.email?.toLowerCase() !==
      adminEmail.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "Admin access required.",
        },
        { status: 403 }
      );
    }

    /*
     * LOAD MAIN ADMIN DATA
     */
    const [
      jobsResult,
      driversResult,
      bidsResult,
      payoutRequestsResult,
      customersResult,
    ] = await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("drivers")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("bids")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from(
          "driver_payout_requests"
        )
        .select("*")
        .order("requested_at", {
          ascending: false,
        }),

      supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "customer"),
    ]);

    /*
     * ERROR CHECKING
     */
    if (jobsResult.error) {
      console.error(
        "Admin jobs error:",
        jobsResult.error
      );

      return NextResponse.json(
        {
          error:
            `Jobs: ${jobsResult.error.message}`,
        },
        { status: 500 }
      );
    }

    if (driversResult.error) {
      console.error(
        "Admin drivers error:",
        driversResult.error
      );

      return NextResponse.json(
        {
          error:
            `Drivers: ${driversResult.error.message}`,
        },
        { status: 500 }
      );
    }

    if (bidsResult.error) {
      console.error(
        "Admin bids error:",
        bidsResult.error
      );

      return NextResponse.json(
        {
          error:
            `Bids: ${bidsResult.error.message}`,
        },
        { status: 500 }
      );
    }

    if (
      payoutRequestsResult.error
    ) {
      console.error(
        "Admin payout requests error:",
        payoutRequestsResult.error
      );

      return NextResponse.json(
        {
          error:
            `Payouts: ${payoutRequestsResult.error.message}`,
        },
        { status: 500 }
      );
    }

    if (
      customersResult.error
    ) {
      console.error(
        "Admin customers error:",
        customersResult.error
      );

      return NextResponse.json(
        {
          error:
            `Customers: ${customersResult.error.message}`,
        },
        { status: 500 }
      );
    }

    const jobs =
      jobsResult.data || [];

    /*
     * ============================================================
     * CUSTOMER PHOTOS
     * ============================================================
     *
     * Get every photo belonging to the jobs being displayed.
     *
     * The storage bucket is private, so we create signed URLs
     * using the server-side service role key.
     */
    const jobIds = jobs.map(
      (job) => job.id
    );

    let customerPhotos: CustomerPhoto[] =
      [];

    if (jobIds.length > 0) {
      const {
        data: photoRows,
        error: photoError,
      } = await supabase
        .from("job_photos")
        .select(
          "id, job_id, storage_path"
        )
        .in("job_id", jobIds)
        .order("id", {
          ascending: true,
        });

      if (photoError) {
        console.error(
          "Admin customer photos error:",
          photoError
        );

        /*
         * Don't break the whole admin jobs page if
         * the photo query fails. Jobs can still load.
         */
        customerPhotos = [];
      } else if (
        photoRows &&
        photoRows.length > 0
      ) {
        const signedPhotos =
          await Promise.all(
            (
              photoRows as JobPhoto[]
            ).map(async (photo) => {
              try {
                const {
                  data,
                  error,
                } =
                  await supabase.storage
                    .from(
                      PHOTO_BUCKET
                    )
                    .createSignedUrl(
                      photo.storage_path,
                      60 * 60
                    );

                if (
                  error ||
                  !data?.signedUrl
                ) {
                  console.error(
                    "Photo signed URL error:",
                    {
                      path:
                        photo.storage_path,
                      error,
                    }
                  );

                  return null;
                }

                return {
                  id: photo.id,
                  job_id:
                    photo.job_id,
                  storage_path:
                    photo.storage_path,
                  url: data.signedUrl,
                };
              } catch (error) {
                console.error(
                  "Customer photo processing error:",
                  error
                );

                return null;
              }
            })
          );

        customerPhotos =
          signedPhotos.filter(
            (
              photo
            ): photo is CustomerPhoto =>
              photo !== null
          );
      }
    }

    /*
     * ============================================================
     * GROUP PHOTOS BY JOB
     * ============================================================
     */
    const photosByJob: Record<
      number,
      CustomerPhoto[]
    > = {};

    for (const photo of customerPhotos) {
      if (!photosByJob[photo.job_id]) {
        photosByJob[photo.job_id] =
          [];
      }

      photosByJob[
        photo.job_id
      ].push(photo);
    }

    /*
     * ============================================================
     * RETURN JOBS WITH PHOTOS
     * ============================================================
     */
    const jobsWithPhotos =
      jobs.map((job) => ({
        ...job,

        customerPhotos:
          photosByJob[job.id] || [],
      }));

    return NextResponse.json(
      {
        jobs: jobsWithPhotos,

        drivers:
          driversResult.data || [],

        bids:
          bidsResult.data || [],

        payoutRequests:
          payoutRequestsResult.data ||
          [],

        customersCount:
          customersResult.count || 0,

        updatedAt:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Admin jobs API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admin data.",
      },
      { status: 500 }
    );
  }
}