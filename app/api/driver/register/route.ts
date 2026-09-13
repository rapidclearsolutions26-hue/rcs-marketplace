import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://rapidclearsolutions.co.uk";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase admin environment variables are missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getPublicClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase public environment variables are missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function cleanText(
  value: FormDataEntryValue | null
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function validateFile(
  file: File | null,
  label: string
) {
  if (!file || file.size === 0) {
    throw new Error(
      `Please upload your ${label}.`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `${label} is too large. Maximum file size is 10MB.`
    );
  }

  return file;
}

async function uploadFile(
  admin: ReturnType<typeof getAdminClient>,
  file: File,
  userId: string,
  folder: string
) {
  const extension =
    file.name.split(".").pop()?.toLowerCase() || "file";

  const safeExtension =
    extension.replace(/[^a-z0-9]/g, "") || "file";

  const fileName =
    `${crypto.randomUUID()}.${safeExtension}`;

  const filePath =
    `${userId}/${folder}/${fileName}`;

  const { error } = await admin.storage
    .from("driver-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType:
        file.type || "application/octet-stream",
    });

  if (error) {
    throw new Error(
      `Could not upload ${folder.replace(/-/g, " ")}: ${error.message}`
    );
  }

  return filePath;
}

export async function POST(request: Request) {
  let admin:
    | ReturnType<typeof getAdminClient>
    | null = null;

  let createdUserId: string | null = null;

  const uploadedPaths: string[] = [];

  try {
    if (
      !supabaseUrl ||
      !supabasePublishableKey ||
      !supabaseServiceRoleKey
    ) {
      console.error(
        "Missing Supabase environment variables."
      );

      return NextResponse.json(
        {
          error:
            "RCS is not configured correctly. Please contact support.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    /*
     * PERSONAL DETAILS
     */

    const fullName = cleanText(
      formData.get("fullName")
    );

    const email = cleanText(
      formData.get("email")
    ).toLowerCase();

    const phone = cleanText(
      formData.get("phone")
    );

    const address = cleanText(
      formData.get("address")
    );

    const postcode = cleanText(
      formData.get("postcode")
    ).toUpperCase();

    /*
     * BUSINESS DETAILS
     */

    const companyName = cleanText(
      formData.get("companyName")
    );

    const tradingName = cleanText(
      formData.get("tradingName")
    );

    const companyNumber = cleanText(
      formData.get("companyNumber")
    );

    const yearsTradingValue = cleanText(
      formData.get("yearsTrading")
    );

    const yearsTrading = yearsTradingValue
      ? Number(yearsTradingValue)
      : null;

    /*
     * WASTE LICENCE
     */

    const wasteCarrierNumber = cleanText(
      formData.get("wasteCarrierNumber")
    );

    const wasteCarrierType = cleanText(
      formData.get("wasteCarrierType")
    );

    const wasteCarrierExpiry = cleanText(
      formData.get("wasteCarrierExpiry")
    );

    /*
     * INSURANCE
     */

    const insuranceProvider = cleanText(
      formData.get("insuranceProvider")
    );

    const insurancePolicyNumber = cleanText(
      formData.get("insurancePolicyNumber")
    );

    const insuranceExpiry = cleanText(
      formData.get("insuranceExpiry")
    );

    /*
     * VEHICLE
     */

    const vehicleType = cleanText(
      formData.get("vehicleType")
    );

    const vehicleRegistration = cleanText(
      formData.get("vehicleRegistration")
    ).toUpperCase();

    const vehicleMake = cleanText(
      formData.get("vehicleMake")
    );

    const vehicleModel = cleanText(
      formData.get("vehicleModel")
    );

    const vehicleCapacity = cleanText(
      formData.get("vehicleCapacity")
    );

    /*
     * PASSWORD
     */

    const password = formData.get("password");

    /*
     * FILES
     */

    const wasteLicenceFile =
      formData.get("wasteLicenceFile") instanceof File
        ? (formData.get(
            "wasteLicenceFile"
          ) as File)
        : null;

    const insuranceFile =
      formData.get("insuranceFile") instanceof File
        ? (formData.get(
            "insuranceFile"
          ) as File)
        : null;

    const vanPhoto =
      formData.get("vanPhoto") instanceof File
        ? (formData.get("vanPhoto") as File)
        : null;

    /*
     * VALIDATION
     */

    if (!fullName) {
      throw new Error(
        "Please enter your full name."
      );
    }

    if (!email) {
      throw new Error(
        "Please enter your email address."
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new Error(
        "Please enter a valid email address."
      );
    }

    if (!phone) {
      throw new Error(
        "Please enter your phone number."
      );
    }

    if (!address) {
      throw new Error(
        "Please enter your address."
      );
    }

    if (!postcode) {
      throw new Error(
        "Please enter your postcode."
      );
    }

    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      throw new Error(
        "Your password must be at least 6 characters."
      );
    }

    if (!wasteCarrierNumber) {
      throw new Error(
        "Please enter your Waste Carrier Licence number."
      );
    }

    if (!wasteCarrierType) {
      throw new Error(
        "Please select your Waste Carrier Licence type."
      );
    }

    if (!wasteCarrierExpiry) {
      throw new Error(
        "Please enter your Waste Carrier Licence expiry date."
      );
    }

    if (!insuranceProvider) {
      throw new Error(
        "Please enter your insurance provider."
      );
    }

    if (!insurancePolicyNumber) {
      throw new Error(
        "Please enter your insurance policy number."
      );
    }

    if (!insuranceExpiry) {
      throw new Error(
        "Please enter your insurance expiry date."
      );
    }

    if (!vehicleType) {
      throw new Error(
        "Please select your vehicle type."
      );
    }

    if (!vehicleRegistration) {
      throw new Error(
        "Please enter your vehicle registration."
      );
    }

    if (!vehicleMake) {
      throw new Error(
        "Please enter your vehicle make."
      );
    }

    if (!vehicleModel) {
      throw new Error(
        "Please enter your vehicle model."
      );
    }

    if (!vehicleCapacity) {
      throw new Error(
        "Please enter your vehicle capacity."
      );
    }

    validateFile(
      wasteLicenceFile,
      "Waste Carrier Licence"
    );

    validateFile(
      insuranceFile,
      "insurance certificate"
    );

    validateFile(
      vanPhoto,
      "vehicle photo"
    );

    if (
      yearsTrading !== null &&
      (Number.isNaN(yearsTrading) ||
        yearsTrading < 0)
    ) {
      throw new Error(
        "Please enter a valid number of years trading."
      );
    }

    /*
     * CREATE CLIENTS
     */

    admin = getAdminClient();

    const publicClient = getPublicClient();

    /*
     * CHECK EXISTING ACCOUNT
     */

    let page = 1;
    let existingUser = null;

    while (true) {
      const {
        data,
        error,
      } =
        await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (error) {
        throw new Error(
          `Unable to check your account: ${error.message}`
        );
      }

      existingUser =
        data.users.find(
          (user) =>
            user.email?.toLowerCase() ===
            email
        ) || null;

      if (existingUser) {
        break;
      }

      if (
        !data.users ||
        data.users.length < 1000
      ) {
        break;
      }

      page += 1;
    }

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "A driver account already exists with this email address. Please use Driver Login.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 }
      );
    }

    /*
     * CREATE ACCOUNT
     *
     * We use the normal Supabase signup here so that
     * Supabase sends the normal confirmation email using
     * your configured SMTP/Resend setup.
     */

    const emailRedirectTo =
      `${SITE_URL}/auth/confirm?next=/driver/login`;

    const {
      data: signupData,
      error: signupError,
    } =
      await publicClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            account_type: "driver",
          },
          emailRedirectTo,
        },
      });

    if (signupError) {
      console.error(
        "Driver signup error:",
        signupError
      );

      throw new Error(
        signupError.message ||
          "We couldn't create your driver account."
      );
    }

    const user = signupData.user;

    if (!user) {
      throw new Error(
        "Your driver account could not be created."
      );
    }

    createdUserId = user.id;

    /*
     * UPLOAD DOCUMENTS
     *
     * These uploads happen using the service-role
     * client, so Storage RLS does not block them.
     */

    const wasteLicencePath =
      await uploadFile(
        admin,
        wasteLicenceFile!,
        user.id,
        "waste-licence"
      );

    uploadedPaths.push(
      wasteLicencePath
    );

    const insurancePath =
      await uploadFile(
        admin,
        insuranceFile!,
        user.id,
        "insurance"
      );

    uploadedPaths.push(
      insurancePath
    );

    const vanPhotoPath =
      await uploadFile(
        admin,
        vanPhoto!,
        user.id,
        "van-photo"
      );

    uploadedPaths.push(
      vanPhotoPath
    );

    /*
     * CREATE DRIVER RECORD
     */

    const {
      error: driverError,
    } = await admin
      .from("drivers")
      .insert({
        id: user.id,

        full_name: fullName,
        email,
        phone,
        address,
        postcode,

        company_name:
          companyName || null,

        trading_name:
          tradingName || null,

        company_number:
          companyNumber || null,

        years_trading:
          yearsTrading,

        waste_carrier_number:
          wasteCarrierNumber,

        waste_carrier_type:
          wasteCarrierType,

        waste_carrier_expiry:
          wasteCarrierExpiry,

        waste_licence_url:
          wasteLicencePath,

        insurance_provider:
          insuranceProvider,

        insurance_policy_number:
          insurancePolicyNumber,

        insurance_expiry:
          insuranceExpiry,

        insurance_certificate_url:
          insurancePath,

        vehicle_type:
          vehicleType,

        vehicle_registration:
          vehicleRegistration,

        vehicle_make:
          vehicleMake,

        vehicle_model:
          vehicleModel,

        vehicle_capacity:
          vehicleCapacity,

        van_photo_url:
          vanPhotoPath,

        approved: false,

        application_status:
          "pending",
      });

    if (driverError) {
      console.error(
        "Driver record error:",
        driverError
      );

      throw new Error(
        `Your account was created, but your driver application could not be saved: ${driverError.message}`
      );
    }

    /*
     * SUCCESS
     *
     * When email confirmation is enabled, Supabase normally
     * returns no session. That is expected.
     */

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        email,
        emailConfirmationRequired:
          !signupData.session,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Driver registration API error:",
      error
    );

    /*
     * CLEANUP UPLOADED FILES
     */

    if (
      admin &&
      uploadedPaths.length > 0
    ) {
      try {
        await admin.storage
          .from("driver-documents")
          .remove(uploadedPaths);
      } catch (cleanupError) {
        console.error(
          "Driver file cleanup error:",
          cleanupError
        );
      }
    }

    /*
     * CLEANUP CREATED USER
     */

    if (
      admin &&
      createdUserId
    ) {
      try {
        await admin.auth.admin.deleteUser(
          createdUserId
        );
      } catch (cleanupError) {
        console.error(
          "Driver account cleanup error:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong submitting your driver application.",
      },
      { status: 500 }
    );
  }
}