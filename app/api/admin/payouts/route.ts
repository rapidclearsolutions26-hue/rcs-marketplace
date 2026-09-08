import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PayoutStatus =
  | "pending"
  | "processing"
  | "paid"
  | "rejected";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail =
  process.env.ADMIN_EMAIL;

function getAdminClient() {
  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing."
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
    }
  );
}

async function verifyAdmin(
  request: Request
) {
  if (!adminEmail) {
    throw new Error(
      "ADMIN_EMAIL is missing."
    );
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (!authorization) {
    return {
      authorised: false,
      error:
        "Missing admin authorization.",
    };
  }

  const token =
    authorization.replace(
      /^Bearer\s+/i,
      ""
    );

  if (!token) {
    return {
      authorised: false,
      error:
        "Missing admin access token.",
    };
  }

  const supabase =
    getAdminClient();

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser(
      token
    );

  if (
    userError ||
    !userData.user
  ) {
    return {
      authorised: false,
      error:
        "Invalid or expired admin session.",
    };
  }

  const userEmail =
    userData.user.email
      ?.trim()
      .toLowerCase();

  const allowedEmail =
    adminEmail
      .trim()
      .toLowerCase();

  if (
    !userEmail ||
    userEmail !== allowedEmail
  ) {
    return {
      authorised: false,
      error:
        "You are not authorised to access admin payouts.",
    };
  }

  return {
    authorised: true,
    user: userData.user,
  };
}

/*
 * GET
 *
 * Returns payout requests together with:
 * - driver
 * - payment details
 *
 * Everything is loaded server-side using
 * the Supabase service role.
 */
export async function GET(
  request: Request
) {
  try {
    const admin =
      await verifyAdmin(
        request
      );

    if (!admin.authorised) {
      return NextResponse.json(
        {
          error:
            admin.error ||
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const supabase =
      getAdminClient();

    const {
      data: payoutData,
      error: payoutError,
    } =
      await supabase
        .from(
          "driver_payout_requests"
        )
        .select(
          "id,driver_id,amount,status,requested_at,processed_at,processed_by,notes"
        )
        .order(
          "requested_at",
          {
            ascending: false,
          }
        );

    if (payoutError) {
      console.error(
        "Admin payouts query error:",
        payoutError
      );

      return NextResponse.json(
        {
          error:
            payoutError.message,
        },
        {
          status: 500,
        }
      );
    }

    const payouts =
      payoutData || [];

    /*
     * No payout requests.
     */
    if (payouts.length === 0) {
      return NextResponse.json(
        {
          payouts: [],
        },
        {
          status: 200,
        }
      );
    }

    /*
     * Collect unique driver IDs.
     */
    const driverIds = [
      ...new Set(
        payouts
          .map(
            (payout) =>
              payout.driver_id
          )
          .filter(Boolean)
      ),
    ];

    /*
     * Load drivers.
     */
    const {
      data: driverData,
      error: driverError,
    } =
      await supabase
        .from("drivers")
        .select(
          "id,full_name,email,phone,company_name,trading_name,approved,application_status"
        )
        .in(
          "id",
          driverIds
        );

    if (driverError) {
      console.error(
        "Admin driver payout query error:",
        driverError
      );

      return NextResponse.json(
        {
          error:
            driverError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Load payment details.
     *
     * This data NEVER goes directly to the browser
     * through Supabase. It is loaded using the
     * service role on the server and returned only
     * to the verified admin.
     */
    const {
      data: paymentData,
      error: paymentError,
    } =
      await supabase
        .from(
          "driver_payment_details"
        )
        .select(
          "driver_id,account_holder_name,bank_name,sort_code,account_number"
        )
        .in(
          "driver_id",
          driverIds
        );

    if (paymentError) {
      console.error(
        "Admin payment details query error:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            paymentError.message,
        },
        {
          status: 500,
        }
      );
    }

    const driversById =
      new Map(
        (driverData || []).map(
          (driver) => [
            driver.id,
            driver,
          ]
        )
      );

    const paymentByDriverId =
      new Map(
        (paymentData || []).map(
          (details) => [
            details.driver_id,
            details,
          ]
        )
      );

    const result =
      payouts.map(
        (payout) => ({
          ...payout,

          driver:
            driversById.get(
              payout.driver_id
            ) || null,

          paymentDetails:
            paymentByDriverId.get(
              payout.driver_id
            ) || null,
        })
      );

    return NextResponse.json(
      {
        payouts: result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Admin payouts GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admin payouts.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * PATCH
 *
 * Admin can change a payout to:
 *
 * pending
 * processing
 * paid
 * rejected
 *
 * IMPORTANT:
 * Marking a payout as "paid" should ONLY happen
 * after the real bank transfer has been completed.
 *
 * The existing Supabase database trigger handles
 * creation of the negative wallet transaction when
 * the payout request changes to paid.
 */
export async function PATCH(
  request: Request
) {
  try {
    const admin =
      await verifyAdmin(
        request
      );

    if (!admin.authorised) {
      return NextResponse.json(
        {
          error:
            admin.error ||
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const payoutId =
      Number(body?.payoutId);

    const status =
      body?.status as PayoutStatus;

    const notes =
      typeof body?.notes ===
      "string"
        ? body.notes.trim()
        : null;

    /*
     * Validate payout ID.
     */
    if (
      !Number.isInteger(
        payoutId
      ) ||
      payoutId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payout ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Only these statuses can be changed
     * through this admin endpoint.
     */
    const allowedStatuses =
      [
        "processing",
        "paid",
        "rejected",
      ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payout status.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getAdminClient();

    /*
     * Get the existing payout first.
     */
    const {
      data: existingPayout,
      error: existingError,
    } =
      await supabase
        .from(
          "driver_payout_requests"
        )
        .select(
          "id,driver_id,amount,status,requested_at,processed_at,processed_by,notes"
        )
        .eq(
          "id",
          payoutId
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        "Existing payout lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!existingPayout) {
      return NextResponse.json(
        {
          error:
            "Payout request not found.",
        },
        {
          status: 404,
        }
      );
    }

    const currentStatus =
      normalise(
        existingPayout.status
      );

    /*
     * Never alter an already-paid payout.
     */
    if (
      currentStatus === "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "This payout has already been marked as paid and cannot be changed.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Never alter an already-rejected payout.
     */
    if (
      currentStatus ===
        "rejected" &&
      status !== "processing"
    ) {
      return NextResponse.json(
        {
          error:
            "This payout has already been rejected.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Prevent a payout from going directly
     * from rejected back to paid.
     */
    if (
      currentStatus ===
        "rejected" &&
      status === "paid"
    ) {
      return NextResponse.json(
        {
          error:
            "A rejected payout cannot be marked as paid.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * When marking paid, make absolutely sure
     * payment details exist.
     *
     * This prevents accidentally paying a driver
     * with no bank details saved.
     */
    if (status === "paid") {
      const {
        data: paymentDetails,
        error:
          paymentDetailsError,
      } =
        await supabase
          .from(
            "driver_payment_details"
          )
          .select(
            "driver_id,account_holder_name,bank_name,sort_code,account_number"
          )
          .eq(
            "driver_id",
            existingPayout.driver_id
          )
          .maybeSingle();

      if (
        paymentDetailsError
      ) {
        console.error(
          "Payment details verification error:",
          paymentDetailsError
        );

        return NextResponse.json(
          {
            error:
              paymentDetailsError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (!paymentDetails) {
        return NextResponse.json(
          {
            error:
              "This driver has no saved payment details. Payment cannot be marked as paid.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !paymentDetails.account_holder_name ||
        !paymentDetails.sort_code ||
        !paymentDetails.account_number
      ) {
        return NextResponse.json(
          {
            error:
              "The driver's payment details are incomplete.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Only record processed_by / processed_at
     * when the payout reaches a final state.
     */
    const isFinal =
      status === "paid" ||
      status === "rejected";

    const updateData: Record<
      string,
      unknown
    > = {
      status,
      notes:
        notes || null,
    };

    if (isFinal) {
      updateData.processed_at =
        new Date().toISOString();

      updateData.processed_by =
        admin.user?.id || null;
    } else {
      updateData.processed_at =
        null;

      updateData.processed_by =
        null;
    }

    /*
     * Update payout.
     */
    const {
      data: updatedPayout,
      error: updateError,
    } =
      await supabase
        .from(
          "driver_payout_requests"
        )
        .update(
          updateData
        )
        .eq(
          "id",
          payoutId
        )
        .select(
          "id,driver_id,amount,status,requested_at,processed_at,processed_by,notes"
        )
        .single();

    if (updateError) {
      console.error(
        "Payout update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Return the updated payout.
     */
    return NextResponse.json(
      {
        success: true,
        payout: updatedPayout,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Admin payouts PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update payout.",
      },
      {
        status: 500,
      }
    );
  }
}

function normalise(
  value:
    | string
    | null
    | undefined
) {
  return (
    value?.trim().toLowerCase() ||
    ""
  );
}