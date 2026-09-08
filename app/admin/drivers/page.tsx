"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

  admin_document_urls?: {
    waste_licence: string | null;
    insurance_certificate: string | null;
    van_photo: string | null;
  };
};

type DriverStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

type FilterStatus =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export default function AdminDriversPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [drivers, setDrivers] =
    useState<Driver[]>([]);

  const [selectedDriver, setSelectedDriver] =
    useState<Driver | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [updating, setUpdating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<FilterStatus>("all");

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your admin session has expired. Please log in again.",
      );
    }

    return session.access_token;
  }

  async function loadDrivers() {
    setLoading(true);
    setErrorMessage("");

    try {
      const accessToken =
        await getAccessToken();

      const response = await fetch(
        "/api/admin/drivers",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load drivers.",
        );
      }

      setDrivers(
        (data?.drivers as Driver[]) || [],
      );
    } catch (error) {
      console.error(
        "Admin drivers loading error:",
        error,
      );

      setDrivers([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load drivers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDrivers();
  }, []);

  async function updateDriverStatus(
    driverId: string,
    status: Exclude<
      DriverStatus,
      "pending"
    >,
  ) {
    setUpdating(true);
    setErrorMessage("");

    try {
      const accessToken =
        await getAccessToken();

      const response = await fetch(
        "/api/admin/drivers",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            driverId,
            status,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update driver.",
        );
      }

      const updatedDriver =
        data?.driver as Driver;

      setDrivers((currentDrivers) =>
        currentDrivers.map((driver) =>
          driver.id === driverId
            ? updatedDriver
            : driver,
        ),
      );

      setSelectedDriver(
        updatedDriver,
      );
    } catch (error) {
      console.error(
        "Admin driver update error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update driver.",
      );
    } finally {
      setUpdating(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: drivers.length,

      pending: drivers.filter(
        (driver) =>
          normalise(
            driver.application_status,
          ) === "pending",
      ).length,

      approved: drivers.filter(
        (driver) =>
          normalise(
            driver.application_status,
          ) === "approved",
      ).length,

      rejected: drivers.filter(
        (driver) =>
          normalise(
            driver.application_status,
          ) === "rejected",
      ).length,

      suspended: drivers.filter(
        (driver) =>
          normalise(
            driver.application_status,
          ) === "suspended",
      ).length,
    };
  }, [drivers]);

  const filteredDrivers =
    useMemo(() => {
      const searchValue = search
        .trim()
        .toLowerCase();

      return drivers.filter(
        (driver) => {
          const status = normalise(
            driver.application_status,
          );

          if (
            filter !== "all" &&
            status !== filter
          ) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          const searchableValues = [
            driver.full_name,
            driver.email,
            driver.phone,
            driver.postcode,
            driver.company_name,
            driver.trading_name,
            driver.company_number,
            driver.waste_carrier_number,
            driver.vehicle_registration,
            driver.vehicle_make,
            driver.vehicle_model,
            driver.vehicle_type,
          ];

          return searchableValues.some(
            (value) =>
              String(value ?? "")
                .toLowerCase()
                .includes(searchValue),
          );
        },
      );
    }, [
      drivers,
      filter,
      search,
    ]);

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <header className="border-b border-[#17382b] bg-[#081710]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/admin/dashboard"
            className="flex items-center"
          >
            <Image
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              width={180}
              height={70}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadDrivers()
              }
              disabled={loading}
              className="rounded-xl border border-[#29483a] bg-[#0b1b14] px-4 py-2 text-sm font-bold transition hover:border-[#79c51c] disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <Link
              href="/admin/dashboard"
              className="hidden rounded-xl border border-[#29483a] bg-[#0b1b14] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-[#79c51c] hover:text-white sm:block"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="text-sm font-bold text-[#79c51c] hover:text-[#91df31]"
          >
            ← Back to Admin Dashboard
          </Link>

          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#79c51c]">
              RCS Marketplace
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Driver Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Review driver applications,
              verify documents and manage
              marketplace access.
            </p>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending"
            number={stats.pending}
            description="Applications to review"
            highlight="yellow"
          />

          <StatCard
            title="Approved"
            number={stats.approved}
            description="Active drivers"
            highlight="green"
          />

          <StatCard
            title="Rejected"
            number={stats.rejected}
            description="Rejected applications"
            highlight="red"
          />

          <StatCard
            title="Suspended"
            number={stats.suspended}
            description="Currently suspended"
            highlight="gray"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
                Driver Applications
              </p>

              <h2 className="mt-1 text-xl font-black">
                {filteredDrivers.length}{" "}
                driver
                {filteredDrivers.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </h2>
            </div>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search name, email, company, reg..."
              className="w-full rounded-xl border border-[#29483a] bg-[#06100c] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#79c51c] lg:max-w-md"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <FilterButton
              active={filter === "all"}
              onClick={() =>
                setFilter("all")
              }
            >
              All ({stats.total})
            </FilterButton>

            <FilterButton
              active={filter === "pending"}
              onClick={() =>
                setFilter("pending")
              }
            >
              Pending ({stats.pending})
            </FilterButton>

            <FilterButton
              active={filter === "approved"}
              onClick={() =>
                setFilter("approved")
              }
            >
              Approved ({stats.approved})
            </FilterButton>

            <FilterButton
              active={filter === "rejected"}
              onClick={() =>
                setFilter("rejected")
              }
            >
              Rejected ({stats.rejected})
            </FilterButton>

            <FilterButton
              active={filter === "suspended"}
              onClick={() =>
                setFilter("suspended")
              }
            >
              Suspended ({stats.suspended})
            </FilterButton>
          </div>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="text-sm font-bold text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black">
              Drivers
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {drivers.length} registered
              driver
              {drivers.length === 1
                ? ""
                : "s"}{" "}
              in the marketplace.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#17382b] border-t-[#79c51c]" />

              <p className="mt-4 text-sm font-semibold text-gray-400">
                Loading drivers...
              </p>
            </div>
          ) : filteredDrivers.length ===
            0 ? (
            <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#29483a] bg-[#06100c]">
                <span className="font-black text-[#79c51c]">
                  RCS
                </span>
              </div>

              <h3 className="mt-5 text-xl font-black">
                No drivers found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {drivers.length === 0
                  ? "No drivers were returned by the admin system."
                  : "Try changing your search or filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDrivers.map(
                (driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    onView={() =>
                      setSelectedDriver(
                        driver,
                      )
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>

      {selectedDriver && (
        <DriverModal
          driver={selectedDriver}
          updating={updating}
          onClose={() =>
            setSelectedDriver(null)
          }
          onUpdateStatus={
            updateDriverStatus
          }
        />
      )}
    </main>
  );
}

/* ===================================================== */
/* DRIVER CARD                                            */
/* ===================================================== */

function DriverCard({
  driver,
  onView,
}: {
  driver: Driver;
  onView: () => void;
}) {
  const businessName =
    driver.trading_name ||
    driver.company_name ||
    null;

  const vehicleName = [
    driver.vehicle_make,
    driver.vehicle_model,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5 transition hover:border-[#29483a]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#29483a] bg-[#06100c]">
            <span className="text-sm font-black text-[#79c51c]">
              RCS
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xl font-black">
                {driver.full_name}
              </h3>

              <StatusBadge
                status={
                  driver.application_status
                }
              />
            </div>

            <p className="mt-1 truncate text-sm text-gray-400">
              {driver.email}
            </p>

            {businessName && (
              <p className="mt-1 text-sm font-bold text-gray-300">
                {businessName}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>
                {driver.vehicle_type ||
                  "Vehicle not specified"}
              </span>

              {driver.vehicle_registration && (
                <span>
                  {driver.vehicle_registration}
                </span>
              )}

              {vehicleName && (
                <span>
                  {vehicleName}
                </span>
              )}

              {driver.postcode && (
                <span>
                  {driver.postcode}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:min-w-[190px] lg:items-end">
          <p className="text-sm text-gray-500">
            Applied{" "}
            <span className="font-bold text-gray-300">
              {formatDate(
                driver.created_at,
              )}
            </span>
          </p>

          <button
            type="button"
            onClick={onView}
            className="rounded-xl bg-[#79c51c] px-5 py-3 text-sm font-black text-[#06100c] transition hover:bg-[#91df31]"
          >
            View Application
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* DRIVER MODAL                                           */
/* ===================================================== */

function DriverModal({
  driver,
  updating,
  onClose,
  onUpdateStatus,
}: {
  driver: Driver;
  updating: boolean;
  onClose: () => void;
  onUpdateStatus: (
    driverId: string,
    status: Exclude<
      DriverStatus,
      "pending"
    >,
  ) => Promise<void>;
}) {
  const documents =
    driver.admin_document_urls;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="my-8 w-full max-w-5xl overflow-hidden rounded-3xl border border-[#29483a] bg-[#0b1b14] shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[#17382b] bg-[#081710] p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#79c51c]">
              Driver Application
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="truncate text-2xl font-black">
                {driver.full_name}
              </h2>

              <StatusBadge
                status={
                  driver.application_status
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#29483a] text-xl text-gray-400 transition hover:border-[#79c51c] hover:text-white"
          >
            ×
          </button>
        </div>

        {/* BODY */}

        <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-7">
          {/* OVERVIEW */}

          <section className="rounded-2xl border border-[#17382b] bg-[#06100c] p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                label="Status"
                value={
                  <StatusBadge
                    status={
                      driver.application_status
                    }
                  />
                }
              />

              <Info
                label="Approved"
                value={
                  driver.approved
                    ? "Yes"
                    : "No"
                }
              />

              <Info
                label="Application date"
                value={formatDate(
                  driver.created_at,
                )}
              />

              <Info
                label="Driver ID"
                value={driver.id}
              />
            </div>
          </section>

          <DetailSection title="Personal Details">
            <Detail
              label="Full name"
              value={driver.full_name}
            />

            <Detail
              label="Email"
              value={driver.email}
            />

            <Detail
              label="Phone"
              value={driver.phone}
            />

            <Detail
              label="Address"
              value={driver.address}
            />

            <Detail
              label="Postcode"
              value={driver.postcode}
            />
          </DetailSection>

          <DetailSection title="Business Details">
            <Detail
              label="Business name"
              value={driver.company_name}
            />

            <Detail
              label="Trading name"
              value={driver.trading_name}
            />

            <Detail
              label="Company number"
              value={driver.company_number}
            />

            <Detail
              label="Years trading"
              value={
                driver.years_trading !==
                null
                  ? `${driver.years_trading} years`
                  : null
              }
            />
          </DetailSection>

          <DetailSection title="Waste Carrier Licence">
            <Detail
              label="Licence number"
              value={
                driver.waste_carrier_number
              }
            />

            <Detail
              label="Licence type"
              value={
                driver.waste_carrier_type
              }
            />

            <Detail
              label="Expiry date"
              value={
                driver.waste_carrier_expiry
                  ? formatDate(
                      driver.waste_carrier_expiry,
                    )
                  : null
              }
            />

            <AdminDocumentLink
              url={
                documents?.waste_licence
              }
              label="View Waste Licence"
              originalPath={
                driver.waste_licence_url
              }
            />
          </DetailSection>

          <DetailSection title="Insurance">
            <Detail
              label="Provider"
              value={
                driver.insurance_provider
              }
            />

            <Detail
              label="Policy number"
              value={
                driver.insurance_policy_number
              }
            />

            <Detail
              label="Expiry date"
              value={
                driver.insurance_expiry
                  ? formatDate(
                      driver.insurance_expiry,
                    )
                  : null
              }
            />

            <AdminDocumentLink
              url={
                documents?.insurance_certificate
              }
              label="View Insurance Certificate"
              originalPath={
                driver.insurance_certificate_url
              }
            />
          </DetailSection>

          <DetailSection title="Vehicle">
            <Detail
              label="Vehicle type"
              value={
                driver.vehicle_type
              }
            />

            <Detail
              label="Registration"
              value={
                driver.vehicle_registration
              }
            />

            <Detail
              label="Make"
              value={
                driver.vehicle_make
              }
            />

            <Detail
              label="Model"
              value={
                driver.vehicle_model
              }
            />

            <Detail
              label="Capacity"
              value={
                driver.vehicle_capacity
              }
            />
          </DetailSection>

          {/* VEHICLE PHOTO */}

          <section className="mt-8">
            <h3 className="text-lg font-black">
              Vehicle Photo
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Uploaded vehicle evidence.
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#17382b] bg-[#06100c]">
              {documents?.van_photo ? (
                <img
                  src={
                    documents.van_photo
                  }
                  alt="Driver vehicle"
                  className="max-h-[500px] w-full object-contain"
                />
              ) : (
                <div className="flex min-h-[220px] items-center justify-center p-8 text-center">
                  <div>
                    <p className="font-bold text-gray-400">
                      Vehicle photo unavailable
                    </p>

                    <p className="mt-1 text-xs text-gray-600">
                      The stored file could not
                      be found in driver-documents.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* VERIFICATION */}

          <section className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
              Verification
            </p>

            <h3 className="mt-1 text-xl font-black">
              Application Checklist
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <VerificationItem
                label="Waste licence"
                complete={Boolean(
                  documents?.waste_licence,
                )}
              />

              <VerificationItem
                label="Insurance certificate"
                complete={Boolean(
                  documents?.insurance_certificate,
                )}
              />

              <VerificationItem
                label="Vehicle information"
                complete={Boolean(
                  driver.vehicle_registration ||
                    driver.vehicle_make ||
                    driver.vehicle_model,
                )}
              />

              <VerificationItem
                label="Vehicle photo"
                complete={Boolean(
                  documents?.van_photo,
                )}
              />
            </div>
          </section>

          {/* ACTIONS */}

          <section className="mt-8 border-t border-[#17382b] pt-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#79c51c]">
              Admin Controls
            </p>

            <h3 className="mt-1 text-xl font-black">
              Manage Driver
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Changing the status controls this
              driver's marketplace access.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void onUpdateStatus(
                    driver.id,
                    "approved",
                  )
                }
                className="rounded-xl bg-[#79c51c] px-5 py-4 text-sm font-black text-[#06100c] transition hover:bg-[#91df31] disabled:opacity-50"
              >
                {updating
                  ? "Updating..."
                  : "Approve Driver"}
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void onUpdateStatus(
                    driver.id,
                    "rejected",
                  )
                }
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                Reject Driver
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void onUpdateStatus(
                    driver.id,
                    "suspended",
                  )
                }
                className="rounded-xl border border-[#29483a] bg-[#06100c] px-5 py-4 text-sm font-black text-gray-300 transition hover:border-yellow-500/50 hover:text-yellow-300 disabled:opacity-50"
              >
                Suspend Driver
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* STAT CARD                                              */
/* ===================================================== */

function StatCard({
  title,
  number,
  description,
  highlight,
}: {
  title: string;
  number: number;
  description: string;
  highlight:
    | "green"
    | "yellow"
    | "red"
    | "gray";
}) {
  const accent =
    highlight === "green"
      ? "text-[#79c51c]"
      : highlight === "yellow"
        ? "text-yellow-300"
        : highlight === "red"
          ? "text-red-300"
          : "text-gray-300";

  return (
    <div className="rounded-2xl border border-[#17382b] bg-[#0b1b14] p-5">
      <p
        className={`text-xs font-black uppercase tracking-[0.18em] ${accent}`}
      >
        {title}
      </p>

      <p className="mt-3 text-3xl font-black">
        {number}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* ===================================================== */
/* FILTER BUTTON                                          */
/* ===================================================== */

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
        active
          ? "border-[#79c51c] bg-[#79c51c]/10 text-[#79c51c]"
          : "border-[#29483a] bg-[#06100c] text-gray-400 hover:border-[#79c51c]/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/* ===================================================== */
/* STATUS BADGE                                           */
/* ===================================================== */

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus =
    normalise(status) || "unknown";

  let className =
    "border-white/10 bg-white/5 text-gray-300";

  if (safeStatus === "pending") {
    className =
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (safeStatus === "approved") {
    className =
      "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";
  }

  if (safeStatus === "rejected") {
    className =
      "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (safeStatus === "suspended") {
    className =
      "border-gray-500/30 bg-gray-500/10 text-gray-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${className}`}
    >
      {formatStatus(safeStatus)}
    </span>
  );
}

/* ===================================================== */
/* INFO                                                   */
/* ===================================================== */

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-600">
        {label}
      </p>

      <div className="mt-2">
        {value}
      </div>
    </div>
  );
}

/* ===================================================== */
/* DETAIL SECTION                                         */
/* ===================================================== */

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h3 className="text-lg font-black">
        {title}
      </h3>

      <div className="mt-4 grid gap-5 rounded-2xl border border-[#17382b] bg-[#06100c] p-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

/* ===================================================== */
/* DETAIL                                                 */
/* ===================================================== */

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
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-gray-200">
        {value === null ||
        value === undefined ||
        value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}

/* ===================================================== */
/* ADMIN DOCUMENT LINK                                    */
/* ===================================================== */

function AdminDocumentLink({
  url,
  label,
  originalPath,
}: {
  url: string | null | undefined;
  label: string;
  originalPath: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">
        Document
      </p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm font-black text-[#79c51c] transition hover:text-[#91df31] hover:underline"
        >
          {label} →
        </a>
      ) : originalPath ? (
        <div>
          <p className="mt-1 text-sm font-bold text-red-300">
            File unavailable
          </p>

          <p className="mt-1 break-all text-xs text-gray-600">
            Stored path exists, but the file could
            not be found in driver-documents.
          </p>
        </div>
      ) : (
        <p className="mt-1 text-sm font-bold text-red-300">
          Not uploaded
        </p>
      )}
    </div>
  );
}

/* ===================================================== */
/* VERIFICATION ITEM                                      */
/* ===================================================== */

function VerificationItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#17382b] bg-[#0b1b14] p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            complete
              ? "bg-[#79c51c]/15 text-[#79c51c]"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {complete ? "✓" : "!"}
        </div>

        <div>
          <p className="text-sm font-bold">
            {label}
          </p>

          <p
            className={`mt-0.5 text-xs font-semibold ${
              complete
                ? "text-[#79c51c]"
                : "text-red-300"
            }`}
          >
            {complete
              ? "Available"
              : "Missing"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* HELPERS                                                */
/* ===================================================== */

function normalise(
  value: string | null | undefined,
) {
  return (
    value?.trim().toLowerCase() || ""
  );
}

function formatStatus(
  value: string | null | undefined,
) {
  const safe =
    normalise(value) || "unknown";

  return safe
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}