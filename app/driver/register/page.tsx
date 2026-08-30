"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DriverRegister() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [yearsTrading, setYearsTrading] = useState("");

  const [wasteCarrierNumber, setWasteCarrierNumber] = useState("");
  const [wasteCarrierType, setWasteCarrierType] = useState("");
  const [wasteCarrierExpiry, setWasteCarrierExpiry] = useState("");

  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] =
    useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");

  const [vehicleType, setVehicleType] = useState("");
  const [vehicleRegistration, setVehicleRegistration] =
    useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");

  const [password, setPassword] = useState("");

  const [wasteLicenceFile, setWasteLicenceFile] =
    useState<File | null>(null);

  const [insuranceFile, setInsuranceFile] =
    useState<File | null>(null);

  const [vanPhoto, setVanPhoto] = useState<File | null>(null);

  async function uploadFile(
    file: File,
    userId: string,
    folder: string
  ) {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "file";

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath = `${userId}/${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from("driver-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(
        `Could not upload ${folder.replace("-", " ")}: ${error.message}`
      );
    }

    return filePath;
  }

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      if (!wasteLicenceFile) {
        throw new Error(
          "Please upload your Waste Carrier Licence."
        );
      }

      if (!insuranceFile) {
        throw new Error(
          "Please upload your insurance certificate."
        );
      }

      if (!vanPhoto) {
        throw new Error(
          "Please upload a photo of your vehicle."
        );
      }

      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!user) {
        throw new Error(
          "Your account could not be created."
        );
      }

      const wasteLicencePath = await uploadFile(
        wasteLicenceFile,
        user.id,
        "waste-licence"
      );

      const insurancePath = await uploadFile(
        insuranceFile,
        user.id,
        "insurance"
      );

      const vanPhotoPath = await uploadFile(
        vanPhoto,
        user.id,
        "van-photo"
      );

      const { error: driverError } = await supabase
        .from("drivers")
        .insert({
          id: user.id,

          full_name: fullName,
          email,
          phone,
          address,
          postcode,

          company_name: companyName || null,
          trading_name: tradingName || null,
          company_number: companyNumber || null,
          years_trading: yearsTrading
            ? Number(yearsTrading)
            : null,

          waste_carrier_number: wasteCarrierNumber,
          waste_carrier_type: wasteCarrierType,
          waste_carrier_expiry: wasteCarrierExpiry,
          waste_licence_url: wasteLicencePath,

          insurance_provider: insuranceProvider,
          insurance_policy_number:
            insurancePolicyNumber,
          insurance_expiry: insuranceExpiry,
          insurance_certificate_url: insurancePath,

          vehicle_type: vehicleType,
          vehicle_registration:
            vehicleRegistration.toUpperCase(),
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          vehicle_capacity: vehicleCapacity,
          van_photo_url: vanPhotoPath,

          approved: false,
          application_status: "pending",
        });

      if (driverError) {
        console.error(driverError);
        throw new Error(driverError.message);
      }

      setSuccess(true);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#f5f7f4]">
        <header className="border-b border-[#dde5d8] bg-white">
          <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
            <Link href="/">
              <Image
                src="/rcs-logo.jpg"
                alt="Rapid Clear Solutions"
                width={180}
                height={70}
                className="h-14 w-auto object-contain"
              />
            </Link>
          </div>
        </header>

        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center px-6 py-12">
          <div className="w-full rounded-3xl bg-white p-10 text-center shadow-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f1df] text-4xl font-black text-[#529027]">
              ✓
            </div>

            <div className="mt-7 inline-flex rounded-full bg-[#e7f1df] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#315c18]">
              RCS Driver Network
            </div>

            <h1 className="mt-4 text-3xl font-black text-[#111111]">
              Application submitted
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-[#555555]">
              Thanks for applying to join the RCS Driver Network.
              Your details and documents have been submitted for
              review.
            </p>

            <div className="mt-7 rounded-2xl border border-[#dde5d8] bg-[#f5f7f4] p-6 text-left">
              <h2 className="font-bold text-[#111111]">
                What happens next?
              </h2>

              <div className="mt-4 space-y-3 text-sm text-[#555555]">
                <p>✓ Your driver details have been saved.</p>
                <p>✓ Your licence and insurance have been uploaded.</p>
                <p>✓ Your vehicle has been added.</p>
                <p>✓ RCS can now review your application.</p>
              </div>

              <div className="mt-5 rounded-xl bg-white p-4">
                <p className="text-sm text-[#666666]">
                  Application status
                </p>

                <p className="mt-1 font-bold text-[#529027]">
                  Pending Admin Approval
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/driver/login")}
              className="mt-7 w-full rounded-xl bg-[#529027] px-5 py-4 font-black text-white transition hover:bg-[#315c18]"
            >
              Go to Driver Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      <header className="border-b border-[#dde5d8] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-14 w-auto object-contain"
            />
          </Link>

          <Link
            href="/driver/login"
            className="font-semibold text-[#315c18] hover:text-[#529027]"
          >
            Driver Login
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex rounded-full bg-[#e7f1df] px-4 py-2 text-sm font-bold text-[#315c18]">
            RCS DRIVER NETWORK
          </div>

          <h1 className="mt-4 text-4xl font-black text-[#111111]">
            Driver application
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-[#555555]">
            Apply to join the RCS Marketplace. Your details and
            documents will be reviewed before you can accept or
            bid on jobs.
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="space-y-6"
        >
          {/* PERSONAL DETAILS */}

          <section className="rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-[#111111]">
              1. Personal details
            </h2>

            <p className="mt-1 text-sm text-[#666666]">
              Tell us who will be carrying out the work.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Input
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Your full name"
                required
              />

              <Input
                label="Phone number"
                value={phone}
                onChange={setPhone}
                placeholder="07xxx xxxxxx"
                required
              />

              <div className="sm:col-span-2">
                <Input
                  label="Email address"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  type="email"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Home / business address"
                  value={address}
                  onChange={setAddress}
                  placeholder="Full address"
                  required
                />
              </div>

              <Input
                label="Postcode"
                value={postcode}
                onChange={setPostcode}
                placeholder="e.g. B1 1AA"
                required
              />
            </div>
          </section>

          {/* BUSINESS DETAILS */}

          <section className="rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-[#111111]">
              2. Business details
            </h2>

            <p className="mt-1 text-sm text-[#666666]">
              Business information, if applicable.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Input
                label="Business name"
                value={companyName}
                onChange={setCompanyName}
                placeholder="Your business name"
              />

              <Input
                label="Trading name"
                value={tradingName}
                onChange={setTradingName}
                placeholder="Optional"
              />

              <Input
                label="Company number"
                value={companyNumber}
                onChange={setCompanyNumber}
                placeholder="Optional"
              />

              <div>
                <label className="text-sm font-bold text-[#222222]">
                  Years trading
                </label>

                <input
                  type="number"
                  min="0"
                  value={yearsTrading}
                  onChange={(e) =>
                    setYearsTrading(e.target.value)
                  }
                  placeholder="e.g. 5"
                  className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] placeholder:text-[#888888] outline-none focus:border-[#529027] focus:ring-2 focus:ring-[#e7f1df]"
                />
              </div>
            </div>
          </section>

          {/* WASTE LICENCE */}

          <section className="rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-[#111111]">
              3. Waste Carrier Licence
            </h2>

            <p className="mt-1 text-sm text-[#666666]">
              Your waste carrier information must be supplied
              before your application can be approved.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Input
                label="Waste Carrier Licence number"
                value={wasteCarrierNumber}
                onChange={setWasteCarrierNumber}
                placeholder="Enter licence number"
                required
              />

              <div>
                <label className="text-sm font-bold text-[#222222]">
                  Licence type
                </label>

                <select
                  required
                  value={wasteCarrierType}
                  onChange={(e) =>
                    setWasteCarrierType(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] outline-none focus:border-[#529027]"
                >
                  <option value="" disabled>
                    Select licence type
                  </option>

                  <option value="Upper Tier">
                    Upper Tier
                  </option>

                  <option value="Lower Tier">
                    Lower Tier
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-[#222222]">
                  Licence expiry date
                </label>

                <input
                  required
                  type="date"
                  value={wasteCarrierExpiry}
                  onChange={(e) =>
                    setWasteCarrierExpiry(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] outline-none focus:border-[#529027]"
                />
              </div>
            </div>

            <FileUpload
              label="Upload Waste Carrier Licence"
              file={wasteLicenceFile}
              onChange={setWasteLicenceFile}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
          </section>

          {/* INSURANCE */}

          <section className="rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-[#111111]">
              4. Insurance
            </h2>

            <p className="mt-1 text-sm text-[#666666]">
              Provide your current insurance details.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Input
                label="Insurance provider"
                value={insuranceProvider}
                onChange={setInsuranceProvider}
                placeholder="e.g. Aviva"
                required
              />

              <Input
                label="Policy number"
                value={insurancePolicyNumber}
                onChange={setInsurancePolicyNumber}
                placeholder="Policy number"
                required
              />

              <div>
                <label className="text-sm font-bold text-[#222222]">
                  Insurance expiry date
                </label>

                <input
                  required
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) =>
                    setInsuranceExpiry(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] outline-none focus:border-[#529027]"
                />
              </div>
            </div>

            <FileUpload
              label="Upload Insurance Certificate"
              file={insuranceFile}
              onChange={setInsuranceFile}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
          </section>

          {/* VEHICLE */}

          <section className="rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-[#111111]">
              5. Vehicle details
            </h2>

            <p className="mt-1 text-sm text-[#666666]">
              Tell us about the vehicle you will use for RCS jobs.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-[#222222]">
                  Vehicle type
                </label>

                <select
                  required
                  value={vehicleType}
                  onChange={(e) =>
                    setVehicleType(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] outline-none focus:border-[#529027]"
                >
                  <option value="" disabled>
                    Select vehicle
                  </option>

                  <option value="Small Van">
                    Small Van
                  </option>

                  <option value="Large Van">
                    Large Van
                  </option>

                  <option value="Luton">
                    Luton
                  </option>

                  <option value="Tipper">
                    Tipper
                  </option>

                  <option value="Van and Trailer">
                    Van & Trailer
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <Input
                label="Registration number"
                value={vehicleRegistration}
                onChange={(value) =>
                  setVehicleRegistration(
                    value.toUpperCase()
                  )
                }
                placeholder="e.g. AB12 CDE"
                required
              />

              <Input
                label="Vehicle make"
                value={vehicleMake}
                onChange={setVehicleMake}
                placeholder="e.g. Ford"
                required
              />

              <Input
                label="Vehicle model"
                value={vehicleModel}
                onChange={setVehicleModel}
                placeholder="e.g. Transit"
                required
              />

              <Input
                label="Vehicle capacity"
                value={vehicleCapacity}
                onChange={setVehicleCapacity}
                placeholder="e.g. 3.5 tonne"
                required
              />
            </div>

            <FileUpload
              label="Upload a photo of your van"
              file={vanPhoto}
              onChange={setVanPhoto}
              accept=".jpg,.jpeg,.png,.webp"
              required
              image
            />
          </section>

          {/* ACCOUNT */}

          <section className="rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-[#111111]">
              6. Create your account
            </h2>

            <div className="mt-6">
              <label className="text-sm font-bold text-[#222222]">
                Password
              </label>

              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="At least 6 characters"
                className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] placeholder:text-[#888888] outline-none focus:border-[#529027] focus:ring-2 focus:ring-[#e7f1df]"
              />
            </div>
          </section>

          {/* ERROR */}

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-semibold text-red-700">
                {errorMessage}
              </p>
            </div>
          )}

          {/* SUBMIT */}

          <section className="rounded-3xl border border-[#dde5d8] bg-white p-7 shadow-sm">
            <div className="rounded-2xl bg-[#f5f7f4] p-5">
              <p className="font-bold text-[#111111]">
                Before you submit
              </p>

              <p className="mt-2 text-sm leading-6 text-[#555555]">
                Your application will be reviewed by RCS. You will
                not be able to bid on marketplace jobs until your
                driver account has been approved.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#529027] px-6 py-4 text-lg font-black text-white transition hover:bg-[#315c18] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Submitting application..."
                : "Submit Driver Application"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}

/* ----------------------------- */
/* INPUT COMPONENT                */
/* ----------------------------- */

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-[#222222]">
        {label}
        {required && (
          <span className="ml-1 text-[#529027]">*</span>
        )}
      </label>

      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[#cbd5c5] bg-white px-4 py-3 text-[#111111] placeholder:text-[#888888] outline-none focus:border-[#529027] focus:ring-2 focus:ring-[#e7f1df]"
      />
    </div>
  );
}

/* ----------------------------- */
/* FILE UPLOAD COMPONENT          */
/* ----------------------------- */

function FileUpload({
  label,
  file,
  onChange,
  accept,
  required = false,
  image = false,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accept: string;
  required?: boolean;
  image?: boolean;
}) {
  return (
    <div className="mt-6">
      <label className="text-sm font-bold text-[#222222]">
        {label}
        {required && (
          <span className="ml-1 text-[#529027]">*</span>
        )}
      </label>

      <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd5c5] bg-[#f5f7f4] px-6 py-8 text-center transition hover:border-[#529027]">
        <span className="text-3xl">
          {image ? "🚐" : "📄"}
        </span>

        <span className="mt-3 font-bold text-[#111111]">
          {file ? file.name : "Choose a file"}
        </span>

        <span className="mt-1 text-sm text-[#666666]">
          {image
            ? "Upload a clear photo of the vehicle"
            : "PDF, JPG or PNG"}
        </span>

        <input
          type="file"
          required={required && !file}
          accept={accept}
          onChange={(e) =>
            onChange(e.target.files?.[0] || null)
          }
          className="hidden"
        />
      </label>

      {file && (
        <p className="mt-2 text-sm font-medium text-[#529027]">
          ✓ File selected
        </p>
      )}
    </div>
  );
}