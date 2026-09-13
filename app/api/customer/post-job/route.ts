import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://rapidclearsolutions.co.uk";

const PHOTO_BUCKET = "customer-job-photos";

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOAD_SESSION_TTL_SECONDS = 60 * 60 * 2;

type UploadMetadata = {
  name?: string;
  type?: string;
  size?: number;
};

type UploadSessionPayload = {
  type: "customer-job-upload";
  jobId: number;
  customerUserId: string;
  createdUserId: string | null;
  reference: string;
  paths: string[];
  exp: number;
};

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

function cleanText(value: unknown) {
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

function base64UrlEncode(
  value: string,
) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(
  value: string,
) {
  return Buffer.from(
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

function signUploadSession(
  payload: UploadSessionPayload,
) {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Supabase service role key is missing.",
    );
  }

  const encodedPayload =
    base64UrlEncode(
      JSON.stringify(payload),
    );

  const signature =
    createHmac(
      "sha256",
      supabaseServiceRoleKey,
    )
      .update(encodedPayload)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

  return `${encodedPayload}.${signature}`;
}

function verifyUploadSession(
  token: string,
): UploadSessionPayload {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Supabase service role key is missing.",
    );
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    throw new Error(
      "Invalid upload session.",
    );
  }

  const [
    encodedPayload,
    suppliedSignature,
  ] = parts;

  const expectedSignature =
    createHmac(
      "sha256",
      supabaseServiceRoleKey,
    )
      .update(encodedPayload)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

  const suppliedBuffer =
    Buffer.from(
      suppliedSignature,
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
    );

  if (
    suppliedBuffer.length !==
    expectedBuffer.length
  ) {
    throw new Error(
      "Invalid upload session.",
    );
  }

  if (
    !timingSafeEqual(
      suppliedBuffer,
      expectedBuffer,
    )
  ) {
    throw new Error(
      "Invalid upload session.",
    );
  }

  let payload: UploadSessionPayload;

  try {
    payload =
      JSON.parse(
        base64UrlDecode(
          encodedPayload,
        ),
      );
  } catch {
    throw new Error(
      "Invalid upload session.",
    );
  }

  if (
    payload.type !==
    "customer-job-upload"
  ) {
    throw new Error(
      "Invalid upload session.",
    );
  }

  if (
    !payload.jobId ||
    !payload.customerUserId ||
    !Array.isArray(payload.paths)
  ) {
    throw new Error(
      "Invalid upload session.",
    );
  }

  if (
    Date.now() >
    payload.exp * 1000
  ) {
    throw new Error(
      "This upload session has expired. Please start again.",
    );
  }

  return payload;
}

async function cleanupJob(
  admin: ReturnType<typeof getAdminClient>,
  jobId: number,
  deleteUserId?: string | null,
  extraStoragePaths: string[] = [],
) {
  try {
    const {
      data: photoRows,
    } = await admin
      .from("job_photos")
      .select("storage_path")
      .eq("job_id", jobId);

    const databasePaths =
      (photoRows || [])
        .map(
          (row) =>
            row.storage_path,
        )
        .filter(
          Boolean,
        );

    const allPaths = Array.from(
      new Set([
        ...databasePaths,
        ...extraStoragePaths,
      ]),
    );

    if (allPaths.length > 0) {
      await admin.storage
        .from(PHOTO_BUCKET)
        .remove(allPaths);
    }

    await admin
      .from("job_photos")
      .delete()
      .eq("job_id", jobId);

    await admin
      .from("jobs")
      .delete()
      .eq("id", jobId);
  } catch (error) {
    console.error(
      "Job cleanup error:",
      error,
    );
  }

  if (deleteUserId) {
    try {
      await admin.auth.admin.deleteUser(
        deleteUserId,
      );
    } catch (error) {
      console.error(
        "Customer cleanup error:",
        error,
      );
    }
  }
}

function validatePhotoMetadata(
  photos: UploadMetadata[],
) {
  if (photos.length > MAX_PHOTOS) {
    return `You can upload a maximum of ${MAX_PHOTOS} photos.`;
  }

  for (const photo of photos) {
    const name =
      cleanText(photo.name) ||
      "Photo";

    const type =
      cleanText(photo.type);

    const size =
      typeof photo.size === "number"
        ? photo.size
        : 0;

    if (
      !type.startsWith(
        "image/",
      )
    ) {
      return `${name} is not a valid image file.`;
    }

    if (
      size <= 0
    ) {
      return `${name} is empty or invalid.`;
    }

    if (
      size > MAX_FILE_SIZE
    ) {
      return `${name} is too large. Each photo must be 10MB or smaller.`;
    }
  }

  return null;
}

async function authenticateRequest(
  request: Request,
) {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const accessToken =
    authorization
      .substring(7)
      .trim();

  if (!accessToken) {
    return null;
  }

  const publicClient =
    getPublicClient();

  const {
    data,
    error,
  } =
    await publicClient.auth.getUser(
      accessToken,
    );

  if (
    error ||
    !data.user
  ) {
    return null;
  }

  return data.user;
}

export async function POST(
  request: Request,
) {
  let admin:
    | ReturnType<typeof getAdminClient>
    | null = null;

  let createdUserId:
    | string
    | null = null;

  let createdJobId:
    | number
    | null = null;

  try {
    if (
      !supabaseUrl ||
      !supabasePublishableKey ||
      !supabaseServiceRoleKey
    ) {
      return NextResponse.json(
        {
          error:
            "RCS is not configured correctly. Please contact support.",
        },
        { status: 500 },
      );
    }

    admin =
      getAdminClient();

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request. Please try again.",
        },
        { status: 400 },
      );
    }

    const action =
      cleanText(
        body?.action,
      );

    if (
      !action
    ) {
      return NextResponse.json(
        {
          error:
            "No request action was provided.",
        },
        { status: 400 },
      );
    }

    /*
     * =======================================================
     * PREPARE
     * =======================================================
     */

    if (
      action === "prepare"
    ) {
      const authenticatedUser =
        await authenticateRequest(
          request,
        );

      const authenticatedUserId =
        authenticatedUser?.id ||
        null;

      const fullName =
        cleanText(
          body?.fullName,
        );

      const email =
        cleanText(
          body?.email,
        ).toLowerCase();

      const phone =
        cleanText(
          body?.phone,
        );

      const password =
        body?.password;

      const jobType =
        cleanText(
          body?.jobType,
        );

      const description =
        cleanText(
          body?.description,
        );

      const postcode =
        cleanText(
          body?.postcode,
        ).toUpperCase();

      const address =
        cleanText(
          body?.address,
        );

      const loadSize =
        cleanText(
          body?.loadSize,
        );

      const floor =
        cleanText(
          body?.floor,
        );

      const stairsValue =
        cleanText(
          body?.stairs,
        );

      const accessNotes =
        cleanText(
          body?.accessNotes,
        );

      const preferredDate =
        cleanText(
          body?.preferredDate,
        );

      const preferredTime =
        cleanText(
          body?.preferredTime,
        );

      const photos =
        Array.isArray(
          body?.photos,
        )
          ? body.photos
          : [];

      const photoValidationError =
        validatePhotoMetadata(
          photos,
        );

      if (
        photoValidationError
      ) {
        return NextResponse.json(
          {
            error:
              photoValidationError,
          },
          { status: 400 },
        );
      }

      /*
       * -------------------------------------------------------
       * JOB VALIDATION
       * -------------------------------------------------------
       */

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

      if (!preferredDate) {
        return NextResponse.json(
          {
            error:
              "Please select a collection date.",
          },
          { status: 400 },
        );
      }

      /*
       * -------------------------------------------------------
       * CUSTOMER
       * -------------------------------------------------------
       */

      let customerUserId:
        | string
        | null = null;

      let emailConfirmationRequired =
        false;

      if (
        authenticatedUserId
      ) {
        /*
         * EXISTING LOGGED-IN CUSTOMER
         */

        customerUserId =
          authenticatedUserId;

        console.log(
          "Creating job for existing customer:",
          customerUserId,
        );
      } else {
        /*
         * NEW CUSTOMER
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
          typeof password !==
            "string" ||
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

        const existingUser =
          await findExistingUser(
            admin,
            email,
          );

        if (
          existingUser
        ) {
          return NextResponse.json(
            {
              error:
                "An RCS customer account already exists with this email address. Please log in to your existing account and post the job from there.",
              code:
                "ACCOUNT_EXISTS",
            },
            { status: 409 },
          );
        }

        const publicClient =
          getPublicClient();

        const emailRedirectTo =
          `${SITE_URL}/auth/confirm?next=/customer/login`;

        const {
          data: signupData,
          error: signupError,
        } =
          await publicClient.auth.signUp(
            {
              email,
              password,
              options: {
                data: {
                  full_name:
                    fullName,
                  phone,
                  account_type:
                    "customer",
                },
                emailRedirectTo,
              },
            },
          );

        if (
          signupError
        ) {
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

        /*
         * Supabase can return a user with no identity when
         * email confirmation / duplicate signup behaviour
         * prevents creation.
         */

        if (
          !newUser.identities ||
          newUser.identities.length ===
            0
        ) {
          return NextResponse.json(
            {
              error:
                "An RCS customer account already exists with this email address. Please log in to your existing account.",
              code:
                "ACCOUNT_EXISTS",
            },
            { status: 409 },
          );
        }

        createdUserId =
          newUser.id;

        customerUserId =
          newUser.id;

        emailConfirmationRequired =
          !signupData.session;

        const {
          error:
            profileError,
        } = await admin
          .from("profiles")
          .update({
            full_name:
              fullName,
            phone,
            email,
          })
          .eq(
            "id",
            newUser.id,
          );

        if (
          profileError
        ) {
          console.error(
            "Profile update warning:",
            profileError,
          );
        }
      }

      if (!customerUserId) {
        throw new Error(
          "Unable to determine the customer account.",
        );
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
      } =
        await admin
          .from("jobs")
          .insert({
            reference,
            customer_id:
              customerUserId,
            job_type:
              jobType ||
              "Waste removal",
            postcode,
            address,
            load_size:
              loadSize,
            description,
            floor:
              floor || null,
            stairs,
            access_notes:
              accessNotes ||
              null,
            preferred_date:
              preferredDate ||
              null,
            preferred_time:
              preferredTime ||
              "Any time",
            status:
              "open",
          })
          .select(
            "id, reference",
          )
          .single();

      if (
        jobError
      ) {
        console.error(
          "Job creation error:",
          jobError,
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
       * CREATE SIGNED PHOTO UPLOAD URLS
       * -------------------------------------------------------
       */

      const uploads: {
        path: string;
        token: string;
      }[] = [];

      const createdStoragePaths:
        string[] = [];

      try {
        for (
          const photo of photos
        ) {
          const originalExtension =
            cleanText(
              photo?.name,
            )
              .split(".")
              .pop()
              ?.toLowerCase() ||
            "jpg";

          const safeExtension =
            originalExtension.replace(
              /[^a-z0-9]/g,
              "",
            ) || "jpg";

          const storagePath =
            `${job.id}/${crypto.randomUUID()}.${safeExtension}`;

          const {
            data:
              signedUpload,
            error:
              signedUploadError,
          } =
            await admin.storage
              .from(
                PHOTO_BUCKET,
              )
              .createSignedUploadUrl(
                storagePath,
              );

          if (
            signedUploadError ||
            !signedUpload
          ) {
            throw new Error(
              signedUploadError?.message ||
                "We couldn't prepare the photo upload.",
            );
          }

          uploads.push({
            path:
              storagePath,
            token:
              signedUpload.token,
          });

          createdStoragePaths.push(
            storagePath,
          );
        }
      } catch (
        uploadPreparationError
      ) {
        await cleanupJob(
          admin,
          createdJobId,
          createdUserId,
          createdStoragePaths,
        );

        createdJobId =
          null;
        createdUserId =
          null;

        throw uploadPreparationError;
      }

      /*
       * -------------------------------------------------------
       * CREATE SECURE COMPLETION TOKEN
       * -------------------------------------------------------
       */

      const uploadSessionToken =
        signUploadSession({
          type:
            "customer-job-upload",
          jobId:
            Number(job.id),
          customerUserId,
          createdUserId,
          reference:
            job.reference,
          paths:
            uploads.map(
              (upload) =>
                upload.path,
            ),
          exp:
            Math.floor(
              Date.now() / 1000,
            ) +
            UPLOAD_SESSION_TTL_SECONDS,
        });

      return NextResponse.json(
        {
          success: true,
          action:
            "prepare",
          jobId:
            job.id,
          reference:
            job.reference,
          userId:
            customerUserId,
          emailConfirmationRequired,
          existingCustomer:
            Boolean(
              authenticatedUserId,
            ),
          uploadSessionToken,
          uploads,
        },
        { status: 200 },
      );
    }

    /*
     * =======================================================
     * COMPLETE
     * =======================================================
     */

    if (
      action === "complete"
    ) {
      const uploadSessionToken =
        cleanText(
          body?.uploadSessionToken,
        );

      if (
        !uploadSessionToken
      ) {
        return NextResponse.json(
          {
            error:
              "Upload session is missing.",
          },
          { status: 400 },
        );
      }

      const session =
        verifyUploadSession(
          uploadSessionToken,
        );

      const uploadedPaths =
        Array.isArray(
          body?.uploadedPaths,
        )
          ? body.uploadedPaths
              .filter(
                (
                  value: unknown,
                ): value is string =>
                  typeof value ===
                  "string",
              )
          : [];

      const expectedPaths =
        session.paths;

      const sameLength =
        uploadedPaths.length ===
        expectedPaths.length;

      const samePaths =
        sameLength &&
        expectedPaths.every(
          (path) =>
            uploadedPaths.includes(
              path,
            ),
        );

      if (
        !samePaths
      ) {
        return NextResponse.json(
          {
            error:
              "The uploaded photos could not be verified.",
          },
          { status: 400 },
        );
      }

      /*
       * Verify that the job still exists and belongs to
       * the customer represented by the signed session.
       */

      const {
        data: job,
        error: jobError,
      } =
        await admin
          .from("jobs")
          .select(
            "id, reference, customer_id",
          )
          .eq(
            "id",
            session.jobId,
          )
          .single();

      if (
        jobError ||
        !job
      ) {
        return NextResponse.json(
          {
            error:
              "The job could not be found.",
          },
          { status: 404 },
        );
      }

      if (
        job.customer_id !==
        session.customerUserId
      ) {
        return NextResponse.json(
          {
            error:
              "You are not authorised to complete this upload.",
          },
          { status: 403 },
        );
      }

      /*
       * Verify that the uploaded files actually exist.
       */

      if (
        expectedPaths.length >
        0
      ) {
        const {
          data:
            storedFiles,
          error:
            storageListError,
        } =
          await admin.storage
            .from(
              PHOTO_BUCKET,
            )
            .list(
              String(
                session.jobId,
              ),
              {
                limit: 100,
              },
            );

        if (
          storageListError
        ) {
          console.error(
            "Storage verification error:",
            storageListError,
          );

          return NextResponse.json(
            {
              error:
                "We couldn't verify the uploaded photos. Please try again.",
            },
            { status: 500 },
          );
        }

        const storedNames =
          new Set(
            (storedFiles || [])
              .map(
                (
                  file,
                ) =>
                  file.name,
              ),
          );

        const missingPaths =
          expectedPaths.filter(
            (path) => {
              const fileName =
                path.substring(
                  path.lastIndexOf(
                    "/",
                  ) + 1,
                );

              return !storedNames.has(
                fileName,
              );
            },
          );

        if (
          missingPaths.length >
          0
        ) {
          return NextResponse.json(
            {
              error:
                "One or more photos have not finished uploading. Please try again.",
            },
            { status: 400 },
          );
        }
      }

      /*
       * Insert photo records.
       */

      if (
        expectedPaths.length >
        0
      ) {
        const {
          data:
            existingRows,
        } =
          await admin
            .from(
              "job_photos",
            )
            .select(
              "storage_path",
            )
            .eq(
              "job_id",
              session.jobId,
            );

        const existingPaths =
          new Set(
            (existingRows ||
              [])
              .map(
                (
                  row,
                ) =>
                  row.storage_path,
              ),
          );

        const newRows =
          expectedPaths
            .filter(
              (path) =>
                !existingPaths.has(
                  path,
                ),
            )
            .map(
              (path) => ({
                job_id:
                  session.jobId,
                storage_path:
                  path,
              }),
            );

        if (
          newRows.length >
          0
        ) {
          const {
            error:
              photoInsertError,
          } = await admin
            .from(
              "job_photos",
            )
            .insert(
              newRows,
            );

          if (
            photoInsertError
          ) {
            console.error(
              "Photo database error:",
              photoInsertError,
            );

            return NextResponse.json(
              {
                error:
                  `The photos uploaded but could not be attached to the job. ${photoInsertError.message}`,
              },
              { status: 500 },
            );
          }
        }
      }

      return NextResponse.json(
        {
          success: true,
          action:
            "complete",
          jobId:
            job.id,
          reference:
            job.reference,
          userId:
            session.customerUserId,
        },
        { status: 200 },
      );
    }

    /*
     * =======================================================
     * CANCEL
     * =======================================================
     */

    if (
      action === "cancel"
    ) {
      const uploadSessionToken =
        cleanText(
          body?.uploadSessionToken,
        );

      if (
        !uploadSessionToken
      ) {
        return NextResponse.json(
          {
            error:
              "Upload session is missing.",
          },
          { status: 400 },
        );
      }

      const session =
        verifyUploadSession(
          uploadSessionToken,
        );

      await cleanupJob(
        admin,
        session.jobId,
        session.createdUserId,
        session.paths,
      );

      return NextResponse.json(
        {
          success: true,
          action:
            "cancel",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Unknown request action.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "RCS post-job API error:",
      error,
    );

    /*
     * If an error happens during PREPARE after the job/account
     * was created, clean it up.
     *
     * We deliberately do not perform this cleanup for COMPLETE
     * because the job should remain if a photo attachment
     * operation fails after the job already exists.
     */

    if (
      admin &&
      createdJobId
    ) {
      await cleanupJob(
        admin,
        createdJobId,
        createdUserId,
      );
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