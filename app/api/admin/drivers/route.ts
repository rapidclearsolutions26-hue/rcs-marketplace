import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

const DRIVER_DOCUMENT_BUCKET =
  "driver-documents";

type DriverStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server environment variables are missing.",
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

/* ===================================================== */
/* ADMIN AUTH                                             */
/* ===================================================== */

async function verifyAdmin(request: Request) {
  if (!adminEmail) {
    throw new Error(
      "ADMIN_EMAIL is not configured.",
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: "Missing authorization token.",
    };
  }

  const accessToken =
    authorization.slice("Bearer ".length);

  if (!accessToken) {
    return {
      authorized: false,
      error: "Missing access token.",
    };
  }

  const supabase = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    console.error(
      "Admin authentication error:",
      error,
    );

    return {
      authorized: false,
      error:
        "Invalid or expired admin session.",
    };
  }

  if (
    !user.email ||
    user.email.toLowerCase() !==
      adminEmail.toLowerCase()
  ) {
    return {
      authorized: false,
      error:
        "You are not authorised to access this area.",
    };
  }

  return {
    authorized: true,
    user,
  };
}

/* ===================================================== */
/* STORAGE PATH                                           */
/* ===================================================== */

function getStoragePath(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  let path = value.trim();

  if (!path) {
    return null;
  }

  /*
   * Handle a full Supabase Storage URL.
   *
   * Examples:
   *
   * https://project.supabase.co/storage/v1/object/public/driver-documents/...
   *
   * https://project.supabase.co/storage/v1/object/sign/driver-documents/...
   *
   * https://project.supabase.co/storage/v1/object/authenticated/driver-documents/...
   */

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    try {
      const url = new URL(path);

      const pathname =
        decodeURIComponent(url.pathname);

      const marker =
        "/storage/v1/object/";

      const markerIndex =
        pathname.indexOf(marker);

      if (markerIndex === -1) {
        return null;
      }

      const objectPart =
        pathname.slice(
          markerIndex + marker.length,
        );

      const parts =
        objectPart.split("/");

      const bucketIndex =
        parts.findIndex(
          (part) =>
            part ===
            DRIVER_DOCUMENT_BUCKET,
        );

      if (bucketIndex === -1) {
        return null;
      }

      const objectPath =
        parts
          .slice(bucketIndex + 1)
          .join("/");

      return objectPath || null;
    } catch (error) {
      console.error(
        "Unable to parse storage URL:",
        error,
      );

      return null;
    }
  }

  /*
   * Remove accidental leading slash.
   */

  path = path.replace(/^\/+/, "");

  /*
   * If the stored value contains the bucket
   * name, remove it.
   */

  if (
    path.startsWith(
      `${DRIVER_DOCUMENT_BUCKET}/`,
    )
  ) {
    path = path.slice(
      `${DRIVER_DOCUMENT_BUCKET}/`.length,
    );
  }

  /*
   * Remove common storage prefixes if they
   * somehow exist in the database.
   */

  const prefixes = [
    "storage/v1/object/public/",
    "storage/v1/object/sign/",
    "storage/v1/object/authenticated/",
  ];

  for (const prefix of prefixes) {
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length);

      if (
        path.startsWith(
          `${DRIVER_DOCUMENT_BUCKET}/`,
        )
      ) {
        path = path.slice(
          `${DRIVER_DOCUMENT_BUCKET}/`.length,
        );
      }

      break;
    }
  }

  return path || null;
}

/* ===================================================== */
/* SIGNED URL                                              */
/* ===================================================== */

async function createDriverDocumentUrl(
  supabase: ReturnType<typeof getAdminClient>,
  value: string | null | undefined,
) {
  const path = getStoragePath(value);

  if (!path) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase.storage
    .from(DRIVER_DOCUMENT_BUCKET)
    .createSignedUrl(
      path,
      60 * 30,
    );

  if (error) {
    console.error(
      "Driver storage object not found or unavailable:",
      {
        originalValue: value,
        storagePath: path,
        error: error.message,
      },
    );

    return null;
  }

  return data?.signedUrl ?? null;
}

/* ===================================================== */
/* ADD ADMIN URLS                                        */
/* ===================================================== */

async function enrichDriver(
  supabase: ReturnType<typeof getAdminClient>,
  driver: Record<string, unknown>,
) {
  const [
    wasteLicenceUrl,
    insuranceCertificateUrl,
    vanPhotoUrl,
  ] = await Promise.all([
    createDriverDocumentUrl(
      supabase,
      driver.waste_licence_url as
        | string
        | null
        | undefined,
    ),

    createDriverDocumentUrl(
      supabase,
      driver.insurance_certificate_url as
        | string
        | null
        | undefined,
    ),

    createDriverDocumentUrl(
      supabase,
      driver.van_photo_url as
        | string
        | null
        | undefined,
    ),
  ]);

  return {
    ...driver,

    admin_document_urls: {
      waste_licence:
        wasteLicenceUrl,

      insurance_certificate:
        insuranceCertificateUrl,

      van_photo:
        vanPhotoUrl,
    },
  };
}

/* ===================================================== */
/* GET                                                    */
/* ===================================================== */

export async function GET(request: Request) {
  try {
    const admin =
      await verifyAdmin(request);

    if (!admin.authorized) {
      return NextResponse.json(
        {
          error: admin.error,
        },
        {
          status: 401,
        },
      );
    }

    const supabase =
      getAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Admin drivers query error:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to load driver applications.",
          details: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rawDrivers =
      (data ?? []) as Record<
        string,
        unknown
      >[];

    const drivers =
      await Promise.all(
        rawDrivers.map((driver) =>
          enrichDriver(
            supabase,
            driver,
          ),
        ),
      );

    const stats = {
      total: drivers.length,

      pending: drivers.filter(
        (driver) =>
          String(
            driver.application_status ??
              "",
          ).toLowerCase() ===
          "pending",
      ).length,

      approved: drivers.filter(
        (driver) =>
          String(
            driver.application_status ??
              "",
          ).toLowerCase() ===
          "approved",
      ).length,

      rejected: drivers.filter(
        (driver) =>
          String(
            driver.application_status ??
              "",
          ).toLowerCase() ===
          "rejected",
      ).length,

      suspended: drivers.filter(
        (driver) =>
          String(
            driver.application_status ??
              "",
          ).toLowerCase() ===
          "suspended",
      ).length,
    };

    return NextResponse.json(
      {
        drivers,
        stats,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Admin drivers GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load drivers.",
      },
      {
        status: 500,
      },
    );
  }
}

/* ===================================================== */
/* PATCH                                                  */
/* ===================================================== */

export async function PATCH(request: Request) {
  try {
    const admin =
      await verifyAdmin(request);

    if (!admin.authorized) {
      return NextResponse.json(
        {
          error: admin.error,
        },
        {
          status: 401,
        },
      );
    }

    let body: {
      driverId?: string;
      status?: DriverStatus;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const driverId =
      body.driverId;

    const status =
      body.status;

    if (!driverId) {
      return NextResponse.json(
        {
          error:
            "Driver ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const allowedStatuses:
      DriverStatus[] = [
        "pending",
        "approved",
        "rejected",
        "suspended",
      ];

    if (
      !status ||
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid driver status.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      getAdminClient();

    const {
      data: existingDriver,
      error:
        existingDriverError,
    } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverId)
      .maybeSingle();

    if (existingDriverError) {
      console.error(
        "Existing driver lookup error:",
        existingDriverError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to find the driver.",
          details:
            existingDriverError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!existingDriver) {
      return NextResponse.json(
        {
          error:
            "Driver not found.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: updatedDriver,
      error: updateError,
    } = await supabase
      .from("drivers")
      .update({
        application_status: status,
        approved:
          status === "approved",
      })
      .eq("id", driverId)
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "Driver status update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            "Unable to update driver status.",
          details:
            updateError.message,
        },
        {
          status: 500,
        },
      );
    }

    const enrichedDriver =
      await enrichDriver(
        supabase,
        updatedDriver as Record<
          string,
          unknown
        >,
      );

    return NextResponse.json(
      {
        success: true,
        driver: enrichedDriver,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Admin drivers PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update driver.",
      },
      {
        status: 500,
      },
    );
  }
}