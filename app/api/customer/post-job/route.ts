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
  "https://rcs-marketplace.vercel.app";

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getPublicClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase public environment variables are missing.",
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
    },
  );
}

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase admin environment variables are missing.",
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
    },
  );
}

function cleanText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function generateReference() {
  return `RC-${Math.floor(
    100000 + Math.random() * 900000,
  )}`;
}

async function findExistingUser(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
) {
  let page = 1;

  while (true) {
    const {
      data,
      error,
    } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(
        `Unable to check customer account: ${error.message}`,
      );
    }

    const existingUser = data.users.find(
      (user) =>
        user.email?.toLowerCase() ===
        email.toLowerCase(),
    );

    if (existingUser) {
      return existingUser;
    }

    if (
      !data.users ||
      data.users.length < 1000
    ) {
      return null;
    }

    page += 1;
  }
}

export async function POST(request: Request) {
  let admin:
    | ReturnType<typeof getAdminClient>
    | null = null;

  let createdUserId: string | null = null;
  let createdJobId: number | null = null;

  try {
    if (
      !supabaseUrl ||
      !supabasePublishableKey ||
      !supabaseServiceRoleKey
    ) {
      console.error(
        "Missing Supabase environment variables.",
      );

      return NextResponse.json(
        {
          error:
            "RCS is not configured correctly. Please contact support.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();

    /*
     * -------------------------------------------------------
     * CUSTOMER DETAILS
     * -------------------------------------------------------
     */

    const fullName = cleanText(
      formData.get("fullName"),
    );

    const email = cleanText(
      formData.get("email"),
    ).toLowerCase();

    const phone = cleanText(
      formData.get("phone"),
    );

    const password = formData.get("password");

    /*
     * -------------------------------------------------------
     * JOB DETAILS
     * -------------------------------------------------------
     */

    const jobType = cleanText(
      formData.get("jobType"),
    );

    const description = cleanText(
      formData.get("description"),
    );

    const postcode = cleanText(
      formData.get("postcode"),
    ).toUpperCase();

    const address = cleanText(
      formData.get("address"),
    );

    const loadSize = cleanText(
      formData.get("loadSize"),
    );

    const floor = cleanText(
      formData.get("floor"),
    );

    const stairsValue = cleanText(
      formData.get("stairs"),
    );

    const accessNotes = cleanText(
      formData.get("accessNotes"),
    );

    const preferredDate = cleanText(
      formData.get("preferredDate"),
    );

    const preferredTime = cleanText(
      formData.get("preferredTime"),
    );

    /*
     * -------------------------------------------------------
     * VALIDATION
     * -------------------------------------------------------
     */

    if (!fullName) {
      return NextResponse.json(
        {
          error:
            "Please enter your full name.",
        },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Please enter your email address.",
        },
        { status: 400 },
      );
    }

    const emailIsValid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      );

    if (!emailIsValid) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email address.",
        },
        { status: 400 },
      );
    }

    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "Your password must be at least 6 characters.",
        },
        { status: 400 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          error:
            "Please enter your phone number.",
        },
        { status: 400 },
      );
    }

    if (!postcode) {
      return NextResponse.json(
        {
          error:
            "Please enter the postcode.",
        },
        { status: 400 },
      );
    }

    if (!address) {
      return NextResponse.json(
        {
          error:
            "Please enter the collection address.",
        },
        { status: 400 },
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          error:
            "Please describe what needs removing.",
        },
        { status: 400 },
      );
    }

    if (!loadSize) {
      return NextResponse.json(
        {
          error:
            "Please select an estimated load size.",
        },
        { status: 400 },
      );
    }

    if (!preferredTime) {
      return NextResponse.json(
        {
          error:
            "Please select a preferred collection time.",
        },
        { status: 400 },
      );
    }

    /*
     * -------------------------------------------------------
     * PHOTOS
     * -------------------------------------------------------
     */

    const photoEntries =
      formData.getAll("photos");

    const photos = photoEntries.filter(
      (entry): entry is File =>
        entry instanceof File &&
        entry.size > 0,
    );

    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json(
        {
          error:
            `You can upload a maximum of ${MAX_PHOTOS} photos.`,
        },
        { status: 400 },
      );
    }

    for (const photo of photos) {
      if (
        !photo.type.startsWith("image/")
      ) {
        return NextResponse.json(
          {
            error:
              `${photo.name} is not a valid image file.`,
          },
          { status: 400 },
        );
      }

      if (photo.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error:
              `${photo.name} is too large. Each photo must be 10MB or smaller.`,
          },
          { status: 400 },
        );
      }
    }

    /*
     * -------------------------------------------------------
     * ADMIN CLIENT
     * -------------------------------------------------------
     */

    admin = getAdminClient();

    /*
     * -------------------------------------------------------
     * CHECK FOR EXISTING ACCOUNT
     * -------------------------------------------------------
     *
     * We don't want to create duplicate RCS accounts.
     *
     * If this email already exists, the customer is sent
     * back to login instead of creating another account.
     */

    const existingUser =
      await findExistingUser(
        admin,
        email,
      );

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An RCS customer account already exists with this email address. Please log in to your existing account and post the job from there.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    /*
     * -------------------------------------------------------
     * CREATE CUSTOMER ACCOUNT
     * -------------------------------------------------------
     *
     * We use normal Supabase signUp here so Supabase can
     * send the customer's email confirmation.
     *
     * The admin client is used separately for creating the
     * job because email confirmation may mean there is no
     * browser session yet.
     */

    const publicClient =
      getPublicClient();

    const emailRedirectTo =
      `${SITE_URL}/auth/confirm?next=/customer/login`;

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
          },
          emailRedirectTo,
        },
      });

    if (signupError) {
      console.error(
        "Customer signup error:",
        signupError,
      );

      return NextResponse.json(
        {
          error:
            signupError.message ||
            "We couldn't create your customer account.",
        },
        { status: 400 },
      );
    }

    const newUser =
      signupData.user;

    if (!newUser) {
      return NextResponse.json(
        {
          error:
            "We couldn't create your customer account. Please try again.",
        },
        { status: 500 },
      );
    }

    createdUserId = newUser.id;

    /*
     * -------------------------------------------------------
     * UPDATE PROFILE
     * -------------------------------------------------------
     *
     * Your existing database has a trigger which creates
     * the profile when auth.users is created.
     *
     * We update the profile here where the fields exist.
     */

    const { error: profileError } =
      await admin
        .from("profiles")
        .update({
          full_name: fullName,
        })
        .eq("id", newUser.id);

    if (profileError) {
      console.error(
        "Profile update warning:",
        profileError,
      );

      /*
       * Don't fail the whole job if the existing profile
       * trigger already created the record but a profile
       * column differs from this deployment.
       */
    }

    /*
     * -------------------------------------------------------
     * CREATE JOB
     * -------------------------------------------------------
     */

    const reference =
      generateReference();

    const stairs =
      stairsValue === "true";

    const {
      data: job,
      error: jobError,
    } = await admin
      .from("jobs")
      .insert({
        reference,
        customer_id: newUser.id,
        job_type:
          jobType || "Waste removal",
        postcode,
        address,
        load_size: loadSize,
        description,
        floor: floor || null,
        stairs,
        access_notes:
          accessNotes || null,
        preferred_date:
          preferredDate || null,
        preferred_time:
          preferredTime || null,
        status: "open",
      })
      .select("id, reference")
      .single();

    if (jobError) {
      console.error(
        "Job creation error:",
        {
          message: jobError.message,
          details: jobError.details,
          hint: jobError.hint,
          code: jobError.code,
        },
      );

      throw new Error(
        jobError.message ||
          "We couldn't create your job.",
      );
    }

    if (!job) {
      throw new Error(
        "The job was created without a job ID.",
      );
    }

    createdJobId =
      Number(job.id);

    /*
     * -------------------------------------------------------
     * UPLOAD CUSTOMER PHOTOS
     * -------------------------------------------------------
     */

    for (const photo of photos) {
      const originalExtension =
        photo.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const safeExtension =
        originalExtension.replace(
          /[^a-z0-9]/g,
          "",
        ) || "jpg";

      const fileName =
        `${crypto.randomUUID()}.${safeExtension}`;

      /*
       * Keep the same storage structure your existing
       * customer/driver pages already expect:
       *
       * customer-job-photos/
       *     JOB_ID/
       *         FILE
       */

      const storagePath =
        `${job.id}/${fileName}`;

      const {
        error: uploadError,
      } =
        await admin.storage
          .from("customer-job-photos")
          .upload(
            storagePath,
            photo,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                photo.type ||
                "image/jpeg",
            },
          );

      if (uploadError) {
        console.error(
          "Photo upload error:",
          uploadError,
        );

        throw new Error(
          `We couldn't upload ${photo.name}. ${uploadError.message}`,
        );
      }

      const {
        error:
          photoRecordError,
      } = await admin
        .from("job_photos")
        .insert({
          job_id: job.id,
          storage_path:
            storagePath,
        });

      if (photoRecordError) {
        console.error(
          "Photo database error:",
          photoRecordError,
        );

        await admin.storage
          .from(
            "customer-job-photos",
          )
          .remove([
            storagePath,
          ]);

        throw new Error(
          `The photo uploaded but could not be attached to the job. ${photoRecordError.message}`,
        );
      }
    }

    /*
     * -------------------------------------------------------
     * SUCCESS
     * -------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        reference:
          job.reference,
        userId: newUser.id,
        emailConfirmationRequired:
          !signupData.session,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "RCS post-job API error:",
      error,
    );

    /*
     * -------------------------------------------------------
     * CLEANUP
     * -------------------------------------------------------
     *
     * If something fails after creating the account,
     * remove the unfinished job and customer photos.
     */

    if (
      admin &&
      createdJobId
    ) {
      try {
        const {
          data: photoRows,
        } = await admin
          .from("job_photos")
          .select(
            "storage_path",
          )
          .eq(
            "job_id",
            createdJobId,
          );

        const storagePaths =
          (photoRows || [])
            .map(
              (row) =>
                row.storage_path,
            )
            .filter(
              Boolean,
            );

        if (
          storagePaths.length >
          0
        ) {
          await admin.storage
            .from(
              "customer-job-photos",
            )
            .remove(
              storagePaths,
            );
        }

        await admin
          .from("job_photos")
          .delete()
          .eq(
            "job_id",
            createdJobId,
          );

        await admin
          .from("jobs")
          .delete()
          .eq(
            "id",
            createdJobId,
          );
      } catch (cleanupError) {
        console.error(
          "Job cleanup error:",
          cleanupError,
        );
      }
    }

    /*
     * Only delete the newly-created user if we created one
     * and the job process failed.
     */

    if (
      admin &&
      createdUserId &&
      !createdJobId
    ) {
      try {
        await admin.auth.admin.deleteUser(
          createdUserId,
        );
      } catch (cleanupError) {
        console.error(
          "Customer cleanup error:",
          cleanupError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong posting your job.",
      },
      { status: 500 },
    );
  }
}