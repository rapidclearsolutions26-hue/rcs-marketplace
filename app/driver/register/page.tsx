"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GREEN = "#79c51c";
const GREEN_HOVER = "#91db32";
const BG = "#050705";
const SECTION = "#080b08";
const CARD = "#0a0e0a";

export default function DriverRegister() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] =
    useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  const [wasteCarrierNumber, setWasteCarrierNumber] =
    useState("");
  const [wasteCarrierType, setWasteCarrierType] =
    useState("");
  const [wasteCarrierExpiry, setWasteCarrierExpiry] =
    useState("");

  const [vehicleType, setVehicleType] =
    useState("");
  const [vehicleRegistration, setVehicleRegistration] =
    useState("");
  const [vehicleMake, setVehicleMake] =
    useState("");
  const [vehicleModel, setVehicleModel] =
    useState("");
  const [vehicleCapacity, setVehicleCapacity] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [wasteLicenceFile, setWasteLicenceFile] =
    useState<File | null>(null);

  const [vanPhoto, setVanPhoto] =
    useState<File | null>(null);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanName =
      fullName.trim();

    const cleanPhone =
      phone.trim();

    const cleanPostcode =
      postcode.trim().toUpperCase();

    const cleanRegistration =
      vehicleRegistration
        .trim()
        .toUpperCase();

    try {
      if (!wasteLicenceFile) {
        throw new Error(
          "Please upload your Waste Carrier Licence."
        );
      }

      if (!vanPhoto) {
        throw new Error(
          "Please upload a photo of your vehicle."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Your password must be at least 6 characters."
        );
      }

      const formData = new FormData();

      formData.append(
        "fullName",
        cleanName
      );

      formData.append(
        "email",
        cleanEmail
      );

      formData.append(
        "phone",
        cleanPhone
      );

      formData.append(
        "address",
        address.trim()
      );

      formData.append(
        "postcode",
        cleanPostcode
      );

      formData.append(
        "wasteCarrierNumber",
        wasteCarrierNumber.trim()
      );

      formData.append(
        "wasteCarrierType",
        wasteCarrierType
      );

      formData.append(
        "wasteCarrierExpiry",
        wasteCarrierExpiry
      );

      formData.append(
        "vehicleType",
        vehicleType
      );

      formData.append(
        "vehicleRegistration",
        cleanRegistration
      );

      formData.append(
        "vehicleMake",
        vehicleMake.trim()
      );

      formData.append(
        "vehicleModel",
        vehicleModel.trim()
      );

      formData.append(
        "vehicleCapacity",
        vehicleCapacity.trim()
      );

      formData.append(
        "password",
        password
      );

      formData.append(
        "wasteLicenceFile",
        wasteLicenceFile
      );

      formData.append(
        "vanPhoto",
        vanPhoto
      );

      const response = await fetch(
        "/api/driver/register",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Your driver application could not be submitted."
        );
      }

      if (
        result.emailConfirmationRequired
      ) {
        setNeedsConfirmation(true);
      } else {
        setSuccess(true);
      }
    } catch (error) {
      console.error(
        "Driver registration error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (
    success ||
    needsConfirmation
  ) {
    return (
      <main
        className="min-h-screen text-white"
        style={{ background: BG }}
      >
        <Header />

        <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center px-4 py-10 sm:px-6">
          <div
            className="w-full rounded-3xl border p-7 text-center shadow-2xl sm:p-10"
            style={{
              background: CARD,
              borderColor: "#283326",
            }}
          >
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-black"
              style={{ background: GREEN }}
            >
              {needsConfirmation
                ? "✉"
                : "✓"}
            </div>

            <p
              className="mt-7 text-sm font-bold uppercase tracking-[0.2em]"
              style={{ color: GREEN }}
            >
              RCS Driver Network
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              {needsConfirmation
                ? "Check your email"
                : "Application submitted"}
            </h1>

            <p className="mx-auto mt-4 max-w-lg leading-7 text-gray-400">
              {needsConfirmation
                ? `Your RCS driver account has been created. Please confirm your email address at ${email
                    .trim()
                    .toLowerCase()} before logging in.`
                : "Thanks for applying to join the RCS Driver Network. Your details and documents have been submitted for review."}
            </p>

            <div
              className="mt-7 rounded-2xl border p-6 text-left"
              style={{
                background: SECTION,
                borderColor: "#283326",
              }}
            >
              <h2 className="font-bold">
                What happens next?
              </h2>

              <div className="mt-4 space-y-4 text-sm leading-6 text-gray-400">
                <p>
                  <span
                    className="font-black"
                    style={{ color: GREEN }}
                  >
                    ✓
                  </span>{" "}
                  Confirm your email address.
                </p>

                <p>
                  <span
                    className="font-black"
                    style={{ color: GREEN }}
                  >
                    ✓
                  </span>{" "}
                  RCS reviews your driver details.
                </p>

                <p>
                  <span
                    className="font-black"
                    style={{ color: GREEN }}
                  >
                    ✓
                  </span>{" "}
                  Your Waste Carrier Licence is checked.
                </p>

                <p>
                  <span
                    className="font-black"
                    style={{ color: GREEN }}
                  >
                    ✓
                  </span>{" "}
                  Once approved, you can access marketplace jobs.
                </p>
              </div>

              <div
                className="mt-5 rounded-xl border p-4"
                style={{
                  background: "#101610",
                  borderColor: "#294126",
                }}
              >
                <p className="text-sm text-gray-500">
                  Application status
                </p>

                <p
                  className="mt-1 font-bold"
                  style={{ color: GREEN }}
                >
                  Pending Admin Approval
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/driver/login")
              }
              className="mt-7 w-full rounded-xl px-5 py-4 font-black text-black transition"
              style={{
                background: GREEN,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  GREEN_HOVER)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  GREEN)
              }
            >
              Go to Driver Login
            </button>

            <Link
              href="/"
              className="mt-5 block text-sm font-semibold text-gray-500 transition hover:text-white"
            >
              ← Back to RCS Marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen text-white"
      style={{ background: BG }}
    >
      <Header />

      {/* HERO */}

      <section
        className="border-b"
        style={{
          background: BG,
          borderColor: "#1d251b",
        }}
      >
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="max-w-3xl">
            <div
              className="inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em]"
              style={{
                color: GREEN,
                background: "#101a0d",
                borderColor: "#294126",
              }}
            >
              RCS Driver Network
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Get access to
              <span
                className="block"
                style={{ color: GREEN }}
              >
                RCS jobs.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
              Join the RCS Marketplace and find waste
              removal jobs in your area. Register in a few
              simple steps and start bidding once approved.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Feature
                number="01"
                title="Sign up"
                text="Create your free driver account."
              />

              <Feature
                number="02"
                title="Get verified"
                text="RCS checks your details and licence."
              />

              <Feature
                number="03"
                title="Get jobs"
                text="Access marketplace jobs and bid."
              />
            </div>
          </div>
        </div>
      </section>

      {/* FORM */}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <form
          onSubmit={handleRegister}
          className="space-y-5"
        >
          {/* PERSONAL */}

          <FormSection
            number="01"
            title="Your details"
            description="Just the basics so we know who you are."
          >
            <div className="grid gap-5 sm:grid-cols-2">
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
                type="tel"
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
                  label="Address"
                  value={address}
                  onChange={setAddress}
                  placeholder="Your home or business address"
                  required
                />
              </div>

              <Input
                label="Postcode"
                value={postcode}
                onChange={(value) =>
                  setPostcode(
                    value.toUpperCase()
                  )
                }
                placeholder="B1 1AA"
                required
              />
            </div>
          </FormSection>

          {/* WASTE LICENCE */}

          <FormSection
            number="02"
            title="Waste Carrier Licence"
            description="This is the main document RCS requires before you can be approved."
          >
            <div
              className="mb-6 rounded-2xl border p-4"
              style={{
                background: "#101610",
                borderColor: "#294126",
              }}
            >
              <p className="text-sm leading-6 text-gray-400">
                You must have a valid Waste Carrier Licence
                to carry waste for RCS marketplace jobs.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Licence number"
                value={wasteCarrierNumber}
                onChange={setWasteCarrierNumber}
                placeholder="Enter your licence number"
                required
              />

              <Select
                label="Licence type"
                value={wasteCarrierType}
                onChange={setWasteCarrierType}
                options={[
                  "Upper Tier",
                  "Lower Tier",
                ]}
                required
              />

              <DateInput
                label="Expiry date"
                value={wasteCarrierExpiry}
                onChange={setWasteCarrierExpiry}
                required
              />
            </div>

            <FileUpload
              label="Upload your Waste Carrier Licence"
              file={wasteLicenceFile}
              onChange={setWasteLicenceFile}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
          </FormSection>

          {/* VEHICLE */}

          <FormSection
            number="03"
            title="Your vehicle"
            description="Tell us about the vehicle you will use for RCS jobs."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Vehicle type"
                value={vehicleType}
                onChange={setVehicleType}
                options={[
                  "Small Van",
                  "Large Van",
                  "Luton",
                  "Tipper",
                  "Van and Trailer",
                  "Other",
                ]}
                required
              />

              <Input
                label="Registration"
                value={vehicleRegistration}
                onChange={(value) =>
                  setVehicleRegistration(
                    value.toUpperCase()
                  )
                }
                placeholder="AB12 CDE"
                required
              />

              <Input
                label="Make"
                value={vehicleMake}
                onChange={setVehicleMake}
                placeholder="Ford"
                required
              />

              <Input
                label="Model"
                value={vehicleModel}
                onChange={setVehicleModel}
                placeholder="Transit"
                required
              />

              <Input
                label="Capacity"
                value={vehicleCapacity}
                onChange={setVehicleCapacity}
                placeholder="e.g. 3.5 tonne"
                required
              />
            </div>

            <FileUpload
              label="Vehicle photo"
              file={vanPhoto}
              onChange={setVanPhoto}
              accept=".jpg,.jpeg,.png,.webp"
              required
              image
            />
          </FormSection>

          {/* ACCOUNT */}

          <FormSection
            number="04"
            title="Create your account"
            description="Choose a password for your RCS Driver Portal."
          >
            <Input
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              type="password"
              required
            />

            <p className="mt-3 text-sm text-gray-600">
              You will use this password to log into the
              RCS Driver Portal.
            </p>
          </FormSection>

          {/* ERROR */}

          {errorMessage && (
            <div className="rounded-2xl border border-red-900/70 bg-red-950/30 p-5">
              <p className="font-semibold leading-6 text-red-300">
                {errorMessage}
              </p>
            </div>
          )}

          {/* SUBMIT */}

          <section
            className="rounded-3xl border p-5 shadow-2xl sm:p-7"
            style={{
              background: CARD,
              borderColor: "#294126",
            }}
          >
            <div
              className="rounded-2xl border p-5"
              style={{
                background: SECTION,
                borderColor: "#283326",
              }}
            >
              <p className="font-bold">
                Ready to join RCS?
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Submit your application and RCS will review
                your details. Once approved, you can access
                available marketplace jobs.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl px-6 py-4 text-lg font-black text-black transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: GREEN,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background =
                    GREEN_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  GREEN;
              }}
            >
              {loading
                ? "Creating your account..."
                : "Join RCS Driver Network"}
            </button>

            <p className="mt-5 text-center text-sm text-gray-600">
              Already registered?{" "}
              <Link
                href="/driver/login"
                className="font-bold"
                style={{ color: GREEN }}
              >
                Driver Login
              </Link>
            </p>
          </section>
        </form>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header
      className="border-b"
      style={{
        background: BG,
        borderColor: "#1d251b",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/">
          <Image
            src="/rapid-clear-logo.png"
            alt="Rapid Clear Solutions"
            width={220}
            height={90}
            priority
            className="h-12 w-auto object-contain sm:h-14"
          />
        </Link>

        <Link
          href="/driver/login"
          className="rounded-xl border px-4 py-2.5 text-sm font-bold transition"
          style={{
            borderColor: "#394635",
          }}
        >
          Driver Login
        </Link>
      </div>
    </header>
  );
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-3xl border p-5 shadow-xl sm:p-7"
      style={{
        background: CARD,
        borderColor: "#283326",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-black"
          style={{ background: GREEN }}
        >
          {number}
        </div>

        <div>
          <h2 className="text-xl font-black">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-7">
        {children}
      </div>
    </section>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: CARD,
        borderColor: "#283326",
      }}
    >
      <p
        className="text-xs font-black"
        style={{ color: GREEN }}
      >
        {number}
      </p>

      <p className="mt-2 font-bold">
        {title}
      </p>

      <p className="mt-1 text-sm leading-5 text-gray-500">
        {text}
      </p>
    </div>
  );
}

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
      <label className="text-sm font-bold text-gray-200">
        {label}

        {required && (
          <span
            className="ml-1"
            style={{ color: GREEN }}
          >
            *
          </span>
        )}
      </label>

      <input
        required={required}
        type={type}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        minLength={
          type === "password"
            ? 6
            : undefined
        }
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border bg-[#080d09] px-4 py-3 text-white outline-none transition placeholder:text-gray-600"
        style={{
          borderColor: "#354433",
        }}
        onFocus={(e) =>
          (e.currentTarget.style.borderColor =
            GREEN)
        }
        onBlur={(e) =>
          (e.currentTarget.style.borderColor =
            "#354433")
        }
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-200">
        {label}

        {required && (
          <span
            className="ml-1"
            style={{ color: GREEN }}
          >
            *
          </span>
        )}
      </label>

      <select
        required={required}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="mt-2 w-full rounded-xl border bg-[#080d09] px-4 py-3 text-white outline-none transition"
        style={{
          borderColor: "#354433",
        }}
      >
        <option
          value=""
          disabled
          className="bg-[#080d09]"
        >
          Select an option
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-[#080d09]"
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-200">
        {label}

        {required && (
          <span
            className="ml-1"
            style={{ color: GREEN }}
          >
            *
          </span>
        )}
      </label>

      <input
        required={required}
        type="date"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="mt-2 w-full rounded-xl border bg-[#080d09] px-4 py-3 text-white outline-none transition"
        style={{
          borderColor: "#354433",
        }}
      />
    </div>
  );
}

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
      <label className="text-sm font-bold text-gray-200">
        {label}

        {required && (
          <span
            className="ml-1"
            style={{ color: GREEN }}
          >
            *
          </span>
        )}
      </label>

      <label
        className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition"
        style={{
          background: "#080d09",
          borderColor: "#354433",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor =
            GREEN)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor =
            "#354433")
        }
      >
        <span className="text-3xl">
          {image ? "🚐" : "📄"}
        </span>

        <span className="mt-3 break-all font-bold text-white">
          {file
            ? file.name
            : "Choose a file"}
        </span>

        <span className="mt-1 text-sm text-gray-600">
          {image
            ? "Upload a clear photo of your vehicle"
            : "PDF, JPG or PNG"}
        </span>

        <input
          type="file"
          required={
            required && !file
          }
          accept={accept}
          onChange={(e) =>
            onChange(
              e.target.files?.[0] ||
                null
            )
          }
          className="hidden"
        />
      </label>

      {file && (
        <p
          className="mt-2 text-sm font-medium"
          style={{ color: GREEN }}
        >
          ✓ File selected
        </p>
      )}
    </div>
  );
}