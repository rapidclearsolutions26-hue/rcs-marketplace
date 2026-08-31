"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Driver = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postcode: string | null;

  company_name: string | null;
  trading_name: string | null;
  company_number: string | null;
  years_trading: number | null;

  waste_carrier_number: string | null;
  waste_carrier_type: string | null;
  waste_carrier_expiry: string | null;
  waste_licence_url: string | null;

  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  insurance_certificate_url: string | null;

  vehicle_type: string | null;
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_capacity: string | null;
  van_photo_url: string | null;

  approved: boolean;
  application_status: string;
  created_at: string;
};

export default function AdminDriversPage() {
  const supabase = createClient();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] =
    useState<Driver | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    console.log("DRIVERS FROM SUPABASE:", data);
    console.log("DRIVER ERROR:", error);

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
    } else {
      setDrivers((data || []) as Driver[]);
    }

    setLoading(false);
  }

  async function updateDriverStatus(
    driverId: string,
    status: "approved" | "rejected" | "suspended"
  ) {
    setUpdating(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("drivers")
      .update({
        application_status: status,
        approved: status === "approved",
      })
      .eq("id", driverId);

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setUpdating(false);
      return;
    }

    /*
     * Find the driver from the current state BEFORE
     * refreshing the list.
     */
    const currentDriver = drivers.find(
      (driver) => driver.id === driverId
    );

    await loadDrivers();

    if (currentDriver) {
      setSelectedDriver({
        ...currentDriver,
        application_status: status,
        approved: status === "approved",
      });
    }

    setUpdating(false);
  }

  const pendingDrivers = drivers.filter(
    (driver) =>
      driver.application_status === "pending"
  );

  const approvedDrivers = drivers.filter(
    (driver) =>
      driver.application_status === "approved"
  );

  const rejectedDrivers = drivers.filter(
    (driver) =>
      driver.application_status === "rejected"
  );

  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      {/* HEADER */}

      <header className="border-b border-[#dde5d8] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin">
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-14 w-auto object-contain"
            />
          </Link>

          <div className="text-right">
            <p className="text-sm font-bold text-[#529027]">
              RCS ADMIN
            </p>

            <p className="text-xs text-[#777777]">
              Driver Management
            </p>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-bold text-[#529027]"
          >
            ← Back to Admin
          </Link>

          <h1 className="mt-4 text-4xl font-black text-[#111111]">
            Driver Applications
          </h1>

          <p className="mt-2 text-[#666666]">
            Review, approve and manage RCS Marketplace drivers.
          </p>
        </div>

        {/* STATS */}

        <div className="grid gap-5 sm:grid-cols-3">
          <StatCard
            title="Pending"
            number={pendingDrivers.length}
            description="Need reviewing"
          />

          <StatCard
            title="Approved"
            number={approvedDrivers.length}
            description="Active drivers"
          />

          <StatCard
            title="Rejected"
            number={rejectedDrivers.length}
            description="Rejected applications"
          />
        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              {errorMessage}
            </p>
          </div>
        )}

        {/* DRIVER LIST */}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#111111]">
              Applications
            </h2>

            <button
              type="button"
              onClick={loadDrivers}
              className="rounded-xl border border-[#cbd5c5] bg-white px-4 py-2 text-sm font-bold text-[#315c18] hover:bg-[#f5f7f4]"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-[#666666]">
                Loading drivers...
              </p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-4xl">🚚</p>

              <h3 className="mt-4 text-xl font-black text-[#111111]">
                No driver applications
              </h3>

              <p className="mt-2 text-[#666666]">
                New driver applications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {drivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  onView={() =>
                    setSelectedDriver(driver)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* DRIVER MODAL */}

      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#dde5d8] p-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
                  Driver Application
                </p>

                <h2 className="mt-1 text-2xl font-black text-[#111111]">
                  {selectedDriver.full_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDriver(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f7f4] text-xl font-bold text-[#555555] hover:bg-[#e7f1df]"
              >
                ×
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6">
              {/* STATUS */}

              <div className="rounded-2xl bg-[#f5f7f4] p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#666666]">
                      Application status
                    </p>

                    <StatusBadge
                      status={
                        selectedDriver.application_status
                      }
                    />
                  </div>

                  <div>
                    <p className="text-sm text-[#666666]">
                      Application submitted
                    </p>

                    <p className="font-bold text-[#111111]">
                      {new Date(
                        selectedDriver.created_at
                      ).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
              </div>

              {/* PERSONAL */}

              <DetailSection title="Personal Details">
                <Detail
                  label="Full name"
                  value={selectedDriver.full_name}
                />

                <Detail
                  label="Email"
                  value={selectedDriver.email}
                />

                <Detail
                  label="Phone"
                  value={selectedDriver.phone}
                />

                <Detail
                  label="Address"
                  value={selectedDriver.address}
                />

                <Detail
                  label="Postcode"
                  value={selectedDriver.postcode}
                />
              </DetailSection>

              {/* BUSINESS */}

              <DetailSection title="Business Details">
                <Detail
                  label="Business name"
                  value={
                    selectedDriver.company_name
                  }
                />

                <Detail
                  label="Trading name"
                  value={
                    selectedDriver.trading_name
                  }
                />

                <Detail
                  label="Company number"
                  value={
                    selectedDriver.company_number
                  }
                />

                <Detail
                  label="Years trading"
                  value={
                    selectedDriver.years_trading
                      ? `${selectedDriver.years_trading} years`
                      : null
                  }
                />
              </DetailSection>

              {/* WASTE */}

              <DetailSection title="Waste Carrier Licence">
                <Detail
                  label="Licence number"
                  value={
                    selectedDriver.waste_carrier_number
                  }
                />

                <Detail
                  label="Licence type"
                  value={
                    selectedDriver.waste_carrier_type
                  }
                />

                <Detail
                  label="Expiry"
                  value={
                    selectedDriver.waste_carrier_expiry
                      ? formatDate(
                          selectedDriver.waste_carrier_expiry
                        )
                      : null
                  }
                />

                <DocumentLink
                  path={
                    selectedDriver.waste_licence_url
                  }
                  label="View Waste Licence"
                />
              </DetailSection>

              {/* INSURANCE */}

              <DetailSection title="Insurance">
                <Detail
                  label="Provider"
                  value={
                    selectedDriver.insurance_provider
                  }
                />

                <Detail
                  label="Policy number"
                  value={
                    selectedDriver.insurance_policy_number
                  }
                />

                <Detail
                  label="Expiry"
                  value={
                    selectedDriver.insurance_expiry
                      ? formatDate(
                          selectedDriver.insurance_expiry
                        )
                      : null
                  }
                />

                <DocumentLink
                  path={
                    selectedDriver.insurance_certificate_url
                  }
                  label="View Insurance Certificate"
                />
              </DetailSection>

              {/* VEHICLE */}

              <DetailSection title="Vehicle">
                <Detail
                  label="Vehicle type"
                  value={
                    selectedDriver.vehicle_type
                  }
                />

                <Detail
                  label="Registration"
                  value={
                    selectedDriver.vehicle_registration
                  }
                />

                <Detail
                  label="Make"
                  value={
                    selectedDriver.vehicle_make
                  }
                />

                <Detail
                  label="Model"
                  value={
                    selectedDriver.vehicle_model
                  }
                />

                <Detail
                  label="Capacity"
                  value={
                    selectedDriver.vehicle_capacity
                  }
                />
              </DetailSection>

              {/* VAN PHOTO */}

              <div className="mt-8">
                <h3 className="text-lg font-black text-[#111111]">
                  Vehicle Photo
                </h3>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[#dde5d8] bg-[#f5f7f4]">
                  {selectedDriver.van_photo_url ? (
                    <DriverImage
                      path={
                        selectedDriver.van_photo_url
                      }
                      alt="Driver vehicle"
                    />
                  ) : (
                    <div className="p-10 text-center text-[#777777]">
                      No vehicle photo uploaded.
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIONS */}

              <div className="mt-8 border-t border-[#dde5d8] pt-6">
                <h3 className="text-lg font-black text-[#111111]">
                  Admin Decision
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      updateDriverStatus(
                        selectedDriver.id,
                        "approved"
                      )
                    }
                    className="rounded-xl bg-[#529027] px-5 py-4 font-black text-white hover:bg-[#315c18] disabled:opacity-50"
                  >
                    ✓ Approve Driver
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      updateDriverStatus(
                        selectedDriver.id,
                        "rejected"
                      )
                    }
                    className="rounded-xl bg-red-600 px-5 py-4 font-black text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() =>
                      updateDriverStatus(
                        selectedDriver.id,
                        "suspended"
                      )
                    }
                    className="rounded-xl border border-[#cbd5c5] bg-white px-5 py-4 font-black text-[#555555] hover:bg-[#f5f7f4] disabled:opacity-50"
                  >
                    Suspend
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ========================================================= */
/* DRIVER CARD                                               */
/* ========================================================= */

function DriverCard({
  driver,
  onView,
}: {
  driver: Driver;
  onView: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#e7f1df]">
            <span className="text-2xl">🚚</span>
          </div>

          <div>
            <h3 className="text-xl font-black text-[#111111]">
              {driver.full_name}
            </h3>

            <p className="mt-1 text-sm text-[#666666]">
              {driver.email}
            </p>

            <p className="mt-1 text-sm font-semibold text-[#555555]">
              {driver.vehicle_type ||
                "Vehicle not specified"}

              {driver.vehicle_registration
                ? ` • ${driver.vehicle_registration}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <StatusBadge
            status={
              driver.application_status
            }
          />

          <button
            type="button"
            onClick={onView}
            className="rounded-xl bg-[#529027] px-5 py-3 font-bold text-white hover:bg-[#315c18]"
          >
            View Application
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* STATUS                                                    */
/* ========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const statusText =
    status.charAt(0).toUpperCase() +
    status.slice(1);

  let className =
    "bg-[#f5f7f4] text-[#555555]";

  if (status === "pending") {
    className =
      "bg-amber-100 text-amber-800";
  }

  if (status === "approved") {
    className =
      "bg-[#e7f1df] text-[#315c18]";
  }

  if (status === "rejected") {
    className =
      "bg-red-100 text-red-700";
  }

  if (status === "suspended") {
    className =
      "bg-gray-200 text-gray-700";
  }

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {statusText}
    </span>
  );
}

/* ========================================================= */
/* STAT CARD                                                 */
/* ========================================================= */

function StatCard({
  title,
  number,
  description,
}: {
  title: string;
  number: number;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[#dde5d8] bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-[#529027]">
        {title}
      </p>

      <p className="mt-2 text-4xl font-black text-[#111111]">
        {number}
      </p>

      <p className="mt-1 text-sm text-[#777777]">
        {description}
      </p>
    </div>
  );
}

/* ========================================================= */
/* DETAIL SECTION                                            */
/* ========================================================= */

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h3 className="text-lg font-black text-[#111111]">
        {title}
      </h3>

      <div className="mt-4 grid gap-4 rounded-2xl border border-[#dde5d8] bg-white p-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

/* ========================================================= */
/* DETAIL                                                    */
/* ========================================================= */

function Detail({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold text-[#111111]">
        {value || "Not provided"}
      </p>
    </div>
  );
}

/* ========================================================= */
/* DOCUMENT LINK                                             */
/* ========================================================= */

function DocumentLink({
  path,
  label,
}: {
  path: string | null;
  label: string;
}) {
  const [url, setUrl] =
    useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    /*
     * Create a non-null local copy.
     *
     * This fixes the Vercel TypeScript error:
     *
     * string | null is not assignable to string
     */
    const filePath = path;

    async function createUrl() {
      const supabase = createClient();

      const {
        data,
        error,
      } = await supabase.storage
        .from("driver-documents")
        .createSignedUrl(
          filePath,
          60 * 10
        );

      if (!error && data?.signedUrl) {
        setUrl(data.signedUrl);
      }
    }

    createUrl();
  }, [path]);

  if (!path) {
    return (
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
          Document
        </p>

        <p className="mt-1 font-semibold text-red-600">
          Not uploaded
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#888888]">
        Document
      </p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-bold text-[#529027] hover:underline"
        >
          {label} →
        </a>
      ) : (
        <p className="mt-1 text-sm text-[#777777]">
          Loading document...
        </p>
      )}
    </div>
  );
}

/* ========================================================= */
/* DRIVER IMAGE                                              */
/* ========================================================= */

function DriverImage({
  path,
  alt,
}: {
  path: string;
  alt: string;
}) {
  const [url, setUrl] =
    useState<string | null>(null);

  useEffect(() => {
    /*
     * path is already guaranteed to be a string
     * by the component type.
     */
    const filePath = path;

    async function createUrl() {
      const supabase = createClient();

      const {
        data,
        error,
      } = await supabase.storage
        .from("driver-documents")
        .createSignedUrl(
          filePath,
          60 * 10
        );

      if (!error && data?.signedUrl) {
        setUrl(data.signedUrl);
      }
    }

    createUrl();
  }, [path]);

  if (!url) {
    return (
      <div className="flex min-h-[250px] items-center justify-center text-[#777777]">
        Loading vehicle photo...
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="max-h-[500px] w-full object-contain"
    />
  );
}

/* ========================================================= */
/* DATE                                                      */
/* ========================================================= */

function formatDate(date: string) {
  return new Date(
    date
  ).toLocaleDateString("en-GB");
}