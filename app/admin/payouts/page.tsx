"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type PayoutStatus =
  | "pending"
  | "processing"
  | "paid"
  | "rejected"
  | string;

type PayoutRequest = {
  id: number;
  driver_id: string;
  amount: number;
  status: PayoutStatus | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
};

type Driver = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  trading_name: string | null;
  approved: boolean;
  application_status: string | null;
};

type PaymentDetails = {
  driver_id: string;
  account_holder_name: string;
  bank_name: string | null;
  sort_code: string;
  account_number: string;
};

type PayoutRecord = PayoutRequest & {
  driver: Driver | null;
  paymentDetails: PaymentDetails | null;
};

type Filter =
  | "all"
  | "pending"
  | "processing"
  | "paid"
  | "rejected";

type SortOption =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value || 0));
}

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalise(
  value: string | null | undefined,
) {
  return value?.trim().toLowerCase() || "";
}

function formatStatus(
  value: string | null | undefined,
) {
  const safeValue =
    normalise(value) || "unknown";

  return safeValue
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getDriverName(
  driver: Driver | null,
) {
  if (!driver) {
    return "Unknown driver";
  }

  return (
    driver.trading_name ||
    driver.company_name ||
    driver.full_name ||
    "Unknown driver"
  );
}

function getDriverInitials(
  driver: Driver | null,
) {
  const name =
    driver?.full_name?.trim();

  if (!name) {
    return "R";
  }

  const parts =
    name.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getPendingAgeDays(
  value: string,
) {
  const timestamp =
    new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  const difference =
    Date.now() - timestamp;

  return Math.max(
    0,
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24),
    ),
  );
}

function getPayoutStatusClasses(
  status: string | null | undefined,
) {
  const value = normalise(status);

  if (value === "pending") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (value === "processing") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  if (value === "paid") {
    return "border-[#79c51c]/30 bg-[#79c51c]/10 text-[#79c51c]";
  }

  if (value === "rejected") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-white/[0.10] bg-white/5 text-gray-400";
}

export default function AdminPayoutsPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [payouts, setPayouts] =
    useState<PayoutRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("pending");

  const [sort, setSort] =
    useState<SortOption>("newest");

  const [search, setSearch] =
    useState("");

  const [selectedPayout, setSelectedPayout] =
    useState<PayoutRecord | null>(null);

  const [processingId, setProcessingId] =
    useState<number | null>(null);

  const [actionError, setActionError] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [copiedValue, setCopiedValue] =
    useState("");

  const loadPayouts =
    useCallback(
      async (silent = false) => {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        try {
          const {
            data: { session },
            error: sessionError,
          } =
            await supabase.auth.getSession();

          if (sessionError) {
            throw new Error(
              sessionError.message,
            );
          }

          if (!session?.access_token) {
            throw new Error(
              "Your admin session has expired. Please log in again.",
            );
          }

          const response =
            await fetch(
              "/api/admin/payouts",
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  "Content-Type":
                    "application/json",
                },
                cache: "no-store",
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "Unable to load payout requests.",
            );
          }

          setPayouts(
            Array.isArray(
              data.payouts,
            )
              ? data.payouts
              : [],
          );
        } catch (error) {
          console.error(
            "Admin payouts error:",
            error,
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load payout requests.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [supabase],
    );

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        void loadPayouts(true);
      }, 15000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [loadPayouts]);

  const pendingPayouts =
    useMemo(
      () =>
        payouts.filter(
          (payout) =>
            normalise(
              payout.status,
            ) === "pending",
        ),
      [payouts],
    );

  const processingPayouts =
    useMemo(
      () =>
        payouts.filter(
          (payout) =>
            normalise(
              payout.status,
            ) === "processing",
        ),
      [payouts],
    );

  const paidPayouts =
    useMemo(
      () =>
        payouts.filter(
          (payout) =>
            normalise(
              payout.status,
            ) === "paid",
        ),
      [payouts],
    );

  const rejectedPayouts =
    useMemo(
      () =>
        payouts.filter(
          (payout) =>
            normalise(
              payout.status,
            ) === "rejected",
        ),
      [payouts],
    );

  const pendingValue =
    useMemo(
      () =>
        pendingPayouts.reduce(
          (total, payout) =>
            total +
            Number(
              payout.amount || 0,
            ),
          0,
        ),
      [pendingPayouts],
    );

  const processingValue =
    useMemo(
      () =>
        processingPayouts.reduce(
          (total, payout) =>
            total +
            Number(
              payout.amount || 0,
            ),
          0,
        ),
      [processingPayouts],
    );

  const paidValue =
    useMemo(
      () =>
        paidPayouts.reduce(
          (total, payout) =>
            total +
            Number(
              payout.amount || 0,
            ),
          0,
        ),
      [paidPayouts],
    );

  const filteredPayouts =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      const records =
        payouts.filter(
          (payout) => {
            if (
              filter !== "all" &&
              normalise(
                payout.status,
              ) !== filter
            ) {
              return false;
            }

            if (!searchValue) {
              return true;
            }

            const driverName =
              payout.driver?.full_name?.toLowerCase() ??
              "";

            const tradingName =
              payout.driver?.trading_name?.toLowerCase() ??
              "";

            const companyName =
              payout.driver?.company_name?.toLowerCase() ??
              "";

            const email =
              payout.driver?.email?.toLowerCase() ??
              "";

            const payoutId =
              String(payout.id);

            const driverId =
              String(
                payout.driver_id,
              );

            return (
              driverName.includes(
                searchValue,
              ) ||
              tradingName.includes(
                searchValue,
              ) ||
              companyName.includes(
                searchValue,
              ) ||
              email.includes(
                searchValue,
              ) ||
              payoutId.includes(
                searchValue,
              ) ||
              driverId.includes(
                searchValue,
              )
            );
          },
        );

      return [...records].sort(
        (a, b) => {
          if (
            sort === "highest"
          ) {
            return (
              Number(b.amount) -
              Number(a.amount)
            );
          }

          if (
            sort === "lowest"
          ) {
            return (
              Number(a.amount) -
              Number(b.amount)
            );
          }

          const aTime =
            new Date(
              a.requested_at,
            ).getTime();

          const bTime =
            new Date(
              b.requested_at,
            ).getTime();

          if (
            sort === "oldest"
          ) {
            return (
              aTime - bTime
            );
          }

          return (
            bTime - aTime
          );
        },
      );
    }, [
      payouts,
      filter,
      search,
      sort,
    ]);

  const oldestPending =
    useMemo(() => {
      if (!pendingPayouts.length) {
        return null;
      }

      return (
        [...pendingPayouts].sort(
          (a, b) =>
            new Date(
              a.requested_at,
            ).getTime() -
            new Date(
              b.requested_at,
            ).getTime(),
        )[0] || null
      );
    }, [pendingPayouts]);

  function openPayout(
    payout: PayoutRecord,
  ) {
    setSelectedPayout(payout);
    setNotes(payout.notes || "");
    setActionError("");
    setCopiedValue("");
  }

  function closePayout() {
    if (processingId !== null) {
      return;
    }

    setSelectedPayout(null);
    setNotes("");
    setActionError("");
    setCopiedValue("");
  }

  async function updatePayout(
    payoutId: number,
    status:
      | "processing"
      | "paid"
      | "rejected",
  ) {
    if (processingId !== null) {
      return;
    }

    const actionText =
      status === "paid"
        ? "mark this payout as PAID"
        : status === "rejected"
          ? "reject this payout"
          : "move this payout to processing";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionText}?`,
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      payoutId,
    );
    setActionError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message,
        );
      }

      if (!session?.access_token) {
        throw new Error(
          "Your admin session has expired. Please log in again.",
        );
      }

      const response =
        await fetch(
          "/api/admin/payouts",
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              payoutId,
              status,
              notes:
                notes.trim() ||
                null,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update payout.",
        );
      }

      if (
        Array.isArray(
          data.payouts,
        )
      ) {
        setPayouts(
          data.payouts,
        );
      } else {
        await loadPayouts(
          true,
        );
      }

      setSelectedPayout(
        null,
      );
      setNotes("");
    } catch (error) {
      console.error(
        "Payout update error:",
        error,
      );

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update payout.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function copyValue(
    value: string,
    label: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopiedValue(label);

      window.setTimeout(() => {
        setCopiedValue("");
      }, 1500);
    } catch {
      setCopiedValue("");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050705] text-white">
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050705]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:px-6 lg:px-8">
          <Link
            href="/admin/dashboard"
            className="shrink-0"
          >
            <Image
              src="/rapid-clear-logo.png"
              alt="Rapid Clear Solutions"
              width={220}
              height={90}
              className="h-9 w-auto object-contain sm:h-12"
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadPayouts(
                  false,
                )
              }
              disabled={
                loading ||
                refreshing
              }
              className="rounded-xl border border-white/[0.10] bg-[#0a0e0a] px-3.5 py-2.5 text-xs font-black transition hover:border-[#79c51c] hover:text-[#79c51c] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <Link
              href="/admin/dashboard"
              className="hidden rounded-xl border border-white/[0.10] bg-[#0a0e0a] px-4 py-2.5 text-sm font-black text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c] sm:block"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ================================================= */}
      {/* MOBILE NAV                                        */}
      {/* ================================================= */}

      <div className="border-b border-white/[0.07] bg-[#080b08] sm:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
          <MobileNavLink
            href="/admin/dashboard"
            label="Dashboard"
          />

          <MobileNavLink
            href="/admin/jobs"
            label="Jobs"
          />

          <MobileNavLink
            href="/admin/drivers"
            label="Drivers"
          />

          <MobileNavLink
            href="/admin/bids"
            label="Bids"
          />

          <MobileNavLink
            href="/admin/payouts"
            label="Payouts"
            active
          />
        </div>
      </div>

      {/* ================================================= */}
      {/* PAGE                                               */}
      {/* ================================================= */}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* INTRO */}

        <section className="mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex text-xs font-black uppercase tracking-wider text-[#79c51c] transition hover:text-[#91db32]"
          >
            ← Back to Admin Dashboard
          </Link>

          <div className="mt-6">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#79c51c]" />

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#79c51c] sm:text-xs">
                RCS Marketplace
              </p>
            </div>

            <h1 className="mt-3 text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">
              Driver
              <span className="block text-[#79c51c]">
                Payouts
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
              Review driver payout requests,
              verify payment information and
              record payments made to drivers.
            </p>
          </div>
        </section>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
            <p className="text-sm leading-6 text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* SUMMARY                                           */}
        {/* ================================================= */}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard
            label="Pending"
            value={
              pendingPayouts.length
            }
            detail={`${formatMoney(
              pendingValue,
            )} waiting`}
            highlighted
            accent="yellow"
          />

          <SummaryCard
            label="Processing"
            value={
              processingPayouts.length
            }
            detail={formatMoney(
              processingValue,
            )}
            accent="blue"
          />

          <SummaryCard
            label="Paid"
            value={
              paidPayouts.length
            }
            detail={`${formatMoney(
              paidValue,
            )} paid`}
            accent="green"
          />

          <SummaryCard
            label="Rejected"
            value={
              rejectedPayouts.length
            }
            detail="Rejected requests"
            accent="red"
          />

          <SummaryCard
            label="All Requests"
            value={
              payouts.length
            }
            detail="Total payout requests"
          />
        </section>

        {/* ================================================= */}
        {/* OLDEST PENDING WARNING                           */}
        {/* ================================================= */}

        {oldestPending && (
          <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
                  Oldest pending payout
                </p>

                <p className="mt-2 text-lg font-black">
                  {getDriverName(
                    oldestPending.driver,
                  )}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Requested{" "}
                  {formatDate(
                    oldestPending.requested_at,
                  )}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-2xl font-black text-yellow-300">
                  {formatMoney(
                    oldestPending.amount,
                  )}
                </p>

                <p className="mt-1 text-xs font-bold text-yellow-300/70">
                  {getPendingAgeDays(
                    oldestPending.requested_at,
                  )}{" "}
                  days old
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================================================= */}
        {/* CONTROLS                                          */}
        {/* ================================================= */}

        <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#080b08] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                Payout Queue
              </p>

              <h2 className="mt-2 text-2xl font-black uppercase">
                {filteredPayouts.length}{" "}
                request
                {filteredPayouts.length ===
                1
                  ? ""
                  : "s"}{" "}
                shown
              </h2>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search driver, company or payout ID..."
                className="w-full rounded-xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-[#79c51c]"
              />

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target
                      .value as SortOption,
                  )
                }
                className="rounded-xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm font-bold text-gray-300 outline-none focus:border-[#79c51c]"
              >
                <option value="newest">
                  Newest requests
                </option>

                <option value="oldest">
                  Oldest requests
                </option>

                <option value="highest">
                  Highest amount
                </option>

                <option value="lowest">
                  Lowest amount
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              label="Pending"
              active={
                filter === "pending"
              }
              count={
                pendingPayouts.length
              }
              onClick={() =>
                setFilter(
                  "pending",
                )
              }
            />

            <FilterButton
              label="Processing"
              active={
                filter ===
                "processing"
              }
              count={
                processingPayouts.length
              }
              onClick={() =>
                setFilter(
                  "processing",
                )
              }
            />

            <FilterButton
              label="Paid"
              active={
                filter === "paid"
              }
              count={
                paidPayouts.length
              }
              onClick={() =>
                setFilter("paid")
              }
            />

            <FilterButton
              label="Rejected"
              active={
                filter === "rejected"
              }
              count={
                rejectedPayouts.length
              }
              onClick={() =>
                setFilter(
                  "rejected",
                )
              }
            />

            <FilterButton
              label="All"
              active={
                filter === "all"
              }
              count={
                payouts.length
              }
              onClick={() =>
                setFilter("all")
              }
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* PAYOUT LIST                                       */}
        {/* ================================================= */}

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
              Driver Payments
            </p>

            <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
              Payout Requests
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Automatically refreshed every
              15 seconds.
            </p>
          </div>

          {loading ? (
            <LoadingCard />
          ) : filteredPayouts.length ===
            0 ? (
            <EmptyPayouts
              filter={filter}
            />
          ) : (
            <div className="space-y-3">
              {filteredPayouts.map(
                (payout) => (
                  <PayoutCard
                    key={payout.id}
                    payout={payout}
                    onOpen={() =>
                      openPayout(
                        payout,
                      )
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* PAYMENT PROCESS                                   */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-white/[0.08] bg-[#080b08] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-sm font-black text-[#79c51c]">
              RCS
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                Payment Process
              </p>

              <h2 className="mt-2 text-xl font-black uppercase">
                Manual bank transfer
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
                The current payout system records
                the payment after you make the
                bank transfer. Always verify the
                driver, amount and bank details
                before marking a request as paid.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ================================================= */}
      {/* PAYOUT MODAL                                      */}
      {/* ================================================= */}

      {selectedPayout && (
        <PayoutModal
          payout={selectedPayout}
          notes={notes}
          setNotes={setNotes}
          processing={
            processingId ===
            selectedPayout.id
          }
          actionError={actionError}
          copiedValue={copiedValue}
          onCopy={copyValue}
          onClose={closePayout}
          onProcessing={() =>
            void updatePayout(
              selectedPayout.id,
              "processing",
            )
          }
          onPaid={() =>
            void updatePayout(
              selectedPayout.id,
              "paid",
            )
          }
          onRejected={() =>
            void updatePayout(
              selectedPayout.id,
              "rejected",
            )
          }
        />
      )}
    </main>
  );
}

/* ===================================================== */
/* PAYOUT CARD                                            */
/* ===================================================== */

function PayoutCard({
  payout,
  onOpen,
}: {
  payout: PayoutRecord;
  onOpen: () => void;
}) {
  const driver =
    payout.driver;

  const age =
    normalise(
      payout.status,
    ) === "pending"
      ? getPendingAgeDays(
          payout.requested_at,
        )
      : 0;

  const hasPaymentDetails =
    Boolean(
      payout.paymentDetails,
    );

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-white/[0.08] bg-[#080b08] p-4 text-left transition hover:border-[#79c51c]/30 sm:p-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* DRIVER */}

        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-xs font-black text-[#79c51c] sm:h-14 sm:w-14">
            {getDriverInitials(
              driver,
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black sm:text-xl">
                {getDriverName(
                  driver,
                )}
              </h3>

              <StatusBadge
                status={
                  payout.status
                }
              />
            </div>

            <p className="mt-1 truncate text-sm text-gray-500">
              {driver?.email ||
                "No email available"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/[0.08] bg-[#050705] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-600">
                Request #
                {payout.id}
              </span>

              {hasPaymentDetails ? (
                <span className="rounded-full border border-[#79c51c]/20 bg-[#79c51c]/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#79c51c]">
                  Bank details saved
                </span>
              ) : (
                <span className="rounded-full border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-red-300">
                  No bank details
                </span>
              )}

              {driver?.approved && (
                <span className="rounded-full border border-white/[0.08] bg-[#050705] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-500">
                  Approved driver
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-600">
              Requested{" "}
              <span className="font-bold text-gray-400">
                {formatDate(
                  payout.requested_at,
                )}
              </span>

              {age > 0 && (
                <span className="ml-2 text-yellow-300/70">
                  • {age}{" "}
                  {age === 1
                    ? "day"
                    : "days"}{" "}
                  old
                </span>
              )}
            </p>
          </div>
        </div>

        {/* AMOUNT */}

        <div className="flex items-end justify-between gap-6 border-t border-white/[0.08] pt-4 lg:min-w-[300px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-600">
              Payout
            </p>

            <p className="mt-1 text-2xl font-black text-[#79c51c] sm:text-3xl">
              {formatMoney(
                payout.amount,
              )}
            </p>
          </div>

          <span className="rounded-xl border border-white/[0.10] bg-[#050705] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-gray-500 transition group-hover:border-[#79c51c] group-hover:text-[#79c51c]">
            Review →
          </span>
        </div>
      </div>
    </button>
  );
}

/* ===================================================== */
/* PAYOUT MODAL                                           */
/* ===================================================== */

function PayoutModal({
  payout,
  notes,
  setNotes,
  processing,
  actionError,
  copiedValue,
  onCopy,
  onClose,
  onProcessing,
  onPaid,
  onRejected,
}: {
  payout: PayoutRecord;
  notes: string;
  setNotes: (
    value: string,
  ) => void;
  processing: boolean;
  actionError: string;
  copiedValue: string;
  onCopy: (
    value: string,
    label: string,
  ) => Promise<void>;
  onClose: () => void;
  onProcessing: () => void;
  onPaid: () => void;
  onRejected: () => void;
}) {
  const driver =
    payout.driver;

  const details =
    payout.paymentDetails;

  const isPending =
    normalise(
      payout.status,
    ) === "pending";

  const isProcessing =
    normalise(
      payout.status,
    ) === "processing";

  const isPaid =
    normalise(
      payout.status,
    ) === "paid";

  const isRejected =
    normalise(
      payout.status,
    ) === "rejected";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/85 p-2 backdrop-blur-sm sm:p-4"
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
      <div className="my-2 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/[0.10] bg-[#080b08] shadow-2xl sm:my-8">
        {/* HEADER */}

        <div className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#050705]/95 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#79c51c]/20 bg-[#79c51c]/10 text-xs font-black text-[#79c51c]">
                {getDriverInitials(
                  driver,
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#79c51c]">
                  Payout Request
                </p>

                <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">
                  {getDriverName(
                    driver,
                  )}
                </h2>

                <p className="mt-1 text-xs text-gray-600">
                  Request #
                  {payout.id}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              aria-label="Close payout"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-xl text-gray-500 transition hover:border-[#79c51c] hover:text-white disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[86vh] overflow-y-auto p-4 sm:p-7">
          {/* AMOUNT */}

          <section className="rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">
                  Amount to pay
                </p>

                <p className="mt-1 text-4xl font-black text-[#79c51c]">
                  {formatMoney(
                    payout.amount,
                  )}
                </p>
              </div>

              <StatusBadge
                status={
                  payout.status
                }
              />
            </div>
          </section>

          {/* DRIVER */}

          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#050705] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
                  Driver
                </p>

                <h3 className="mt-2 text-xl font-black">
                  {getDriverName(
                    driver,
                  )}
                </h3>
              </div>

              <Link
                href="/admin/drivers"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-400 transition hover:border-[#79c51c] hover:text-[#79c51c]"
              >
                Driver Management →
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoItem
                label="Name"
                value={
                  driver?.full_name ||
                  "Not available"
                }
              />

              <InfoItem
                label="Email"
                value={
                  driver?.email ||
                  "Not available"
                }
              />

              <InfoItem
                label="Phone"
                value={
                  driver?.phone ||
                  "Not available"
                }
              />

              <InfoItem
                label="Company"
                value={
                  driver
                    ?.trading_name ||
                  driver
                    ?.company_name ||
                  "Not available"
                }
              />

              <InfoItem
                label="Driver status"
                value={
                  driver?.application_status
                    ? formatStatus(
                        driver.application_status,
                      )
                    : "Unknown"
                }
              />

              <InfoItem
                label="Approved"
                value={
                  driver?.approved
                    ? "Yes"
                    : "No"
                }
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {driver?.email ? (
                <a
                  href={`mailto:${driver.email}`}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-400 transition hover:border-[#79c51c] hover:text-[#79c51c]"
                >
                  Email Driver →
                </a>
              ) : (
                <div className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#080b08] text-xs font-black uppercase tracking-wider text-gray-700">
                  No Email
                </div>
              )}

              {driver?.phone ? (
                <a
                  href={`tel:${driver.phone}`}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-400 transition hover:border-[#79c51c] hover:text-[#79c51c]"
                >
                  Call Driver →
                </a>
              ) : (
                <div className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#080b08] text-xs font-black uppercase tracking-wider text-gray-700">
                  No Phone
                </div>
              )}
            </div>
          </section>

          {/* BANK DETAILS */}

          <section className="mt-6 rounded-2xl border border-yellow-500/20 bg-[#080b08] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]">
                  Bank Details
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Verify these details against the
                  driver information before making
                  the transfer.
                </p>
              </div>

              <span className="w-fit rounded-full border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-300">
                Sensitive
              </span>
            </div>

            {!details ? (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm font-semibold text-red-300">
                  No payment details have been
                  saved for this driver.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoItem
                  label="Account holder"
                  value={
                    details.account_holder_name
                  }
                />

                <InfoItem
                  label="Bank"
                  value={
                    details.bank_name ||
                    "Not provided"
                  }
                />

                <InfoItem
                  label="Sort code"
                  value={maskSortCode(
                    details.sort_code,
                  )}
                  sensitive
                />

                <InfoItem
                  label="Account number"
                  value={maskAccountNumber(
                    details.account_number,
                  )}
                  sensitive
                />
              </div>
            )}
          </section>

          {/* REQUEST INFORMATION */}

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoItem
              label="Requested"
              value={formatDate(
                payout.requested_at,
              )}
            />

            <InfoItem
              label="Processed"
              value={
                payout.processed_at
                  ? formatDate(
                      payout.processed_at,
                    )
                  : "Not processed"
              }
            />

            <InfoItem
              label="Driver ID"
              value={
                payout.driver_id
              }
            />

            <InfoItem
              label="Processed by"
              value={
                payout.processed_by ||
                "Not processed"
              }
            />
          </section>

          {/* COPY IDs */}

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <CopyButton
              label="Copy Payout ID"
              copied={
                copiedValue ===
                "payout"
              }
              onClick={() =>
                void onCopy(
                  String(
                    payout.id,
                  ),
                  "payout",
                )
              }
            />

            <CopyButton
              label="Copy Driver ID"
              copied={
                copiedValue ===
                "driver"
              }
              onClick={() =>
                void onCopy(
                  payout.driver_id,
                  "driver",
                )
              }
            />
          </section>

          {/* NOTES */}

          <section className="mt-6">
            <label
              htmlFor="admin-payout-notes"
              className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#79c51c]"
            >
              Admin Notes
            </label>

            <textarea
              id="admin-payout-notes"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              disabled={
                processing ||
                isPaid
              }
              rows={4}
              placeholder="Add a note about this payout..."
              className="w-full rounded-xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-700 focus:border-[#79c51c] disabled:opacity-60"
            />
          </section>

          {/* ACTION ERROR */}

          {actionError && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm leading-6 text-red-300">
                {actionError}
              </p>
            </div>
          )}

          {/* ACTIONS */}

          {!isPaid &&
            !isRejected && (
              <section className="mt-6 border-t border-white/[0.08] pt-6">
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <p className="text-xs font-bold leading-5 text-yellow-300">
                    Only mark this request as paid
                    after the bank transfer has
                    actually been completed.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {isPending && (
                    <button
                      type="button"
                      onClick={
                        onProcessing
                      }
                      disabled={
                        processing
                      }
                      className="min-h-[52px] rounded-xl border border-white/[0.10] bg-[#050705] px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-300 transition hover:border-[#79c51c] hover:text-[#79c51c] disabled:opacity-50"
                    >
                      {processing
                        ? "Updating..."
                        : "Mark Processing"}
                    </button>
                  )}

                  {isProcessing && (
                    <div className="flex min-h-[52px] items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs font-black uppercase tracking-wider text-blue-300">
                      Processing
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      onRejected
                    }
                    disabled={
                      processing
                    }
                    className="min-h-[52px] rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-black uppercase tracking-wider text-red-300 transition hover:border-red-500 disabled:opacity-50"
                  >
                    {processing
                      ? "Updating..."
                      : "Reject Payout"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      onPaid
                    }
                    disabled={
                      processing ||
                      !details
                    }
                    className="min-h-[52px] rounded-xl bg-[#79c51c] px-4 py-3 text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#91db32] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {processing
                      ? "Updating..."
                      : "Mark Paid"}
                  </button>
                </div>

                {!details && (
                  <p className="mt-3 text-xs font-semibold text-yellow-300">
                    Mark Paid is disabled because
                    this driver has no saved bank
                    details.
                  </p>
                )}
              </section>
            )}

          {/* COMPLETED */}

          {isPaid && (
            <section className="mt-6 rounded-2xl border border-[#79c51c]/20 bg-[#79c51c]/5 p-5">
              <p className="text-sm font-black text-[#79c51c]">
                This payout has been marked as
                paid.
              </p>

              {payout.processed_at && (
                <p className="mt-1 text-xs text-gray-600">
                  Processed{" "}
                  {formatDate(
                    payout.processed_at,
                  )}
                </p>
              )}
            </section>
          )}

          {/* REJECTED */}

          {isRejected && (
            <section className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="text-sm font-black text-red-300">
                This payout has been rejected.
              </p>

              {payout.notes && (
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {payout.notes}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* SUMMARY CARD                                           */
/* ===================================================== */

function SummaryCard({
  label,
  value,
  detail,
  highlighted = false,
  accent = "default",
}: {
  label: string;
  value: number;
  detail: string;
  highlighted?: boolean;
  accent?:
    | "default"
    | "green"
    | "yellow"
    | "blue"
    | "red";
}) {
  const labelClass =
    accent === "green"
      ? "text-[#79c51c]"
      : accent === "yellow"
        ? "text-yellow-300"
        : accent === "blue"
          ? "text-blue-300"
          : accent === "red"
            ? "text-red-300"
            : "text-gray-400";

  return (
    <div
      className={`rounded-2xl border p-4 sm:rounded-3xl sm:p-5 ${
        highlighted
          ? "border-yellow-500/20 bg-yellow-500/5"
          : "border-white/[0.08] bg-[#080b08]"
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-[0.18em] ${labelClass}`}
      >
        {label}
      </p>

      <p className="mt-2 text-2xl font-black sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-gray-600 sm:text-xs">
        {detail}
      </p>
    </div>
  );
}

/* ===================================================== */
/* FILTER BUTTON                                          */
/* ===================================================== */

function FilterButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black transition ${
        active
          ? "border-[#79c51c] bg-[#79c51c] text-black"
          : "border-white/[0.10] bg-[#050705] text-gray-500 hover:border-[#79c51c] hover:text-[#79c51c]"
      }`}
    >
      {label}{" "}
      <span
        className={
          active
            ? "text-black"
            : "text-[#79c51c]"
        }
      >
        {count}
      </span>
    </button>
  );
}

/* ===================================================== */
/* INFO ITEM                                               */
/* ===================================================== */

function InfoItem({
  label,
  value,
  sensitive = false,
}: {
  label: string;
  value: string;
  sensitive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#080b08] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-xs font-bold ${
          sensitive
            ? "font-mono text-gray-300"
            : "text-gray-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* STATUS BADGE                                           */
/* ===================================================== */

function StatusBadge({
  status,
}: {
  status:
    | string
    | null
    | undefined;
}) {
  const safeStatus =
    normalise(status) ||
    "unknown";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${getPayoutStatusClasses(
        safeStatus,
      )}`}
    >
      {formatStatus(
        safeStatus,
      )}
    </span>
  );
}

/* ===================================================== */
/* COPY BUTTON                                             */
/* ===================================================== */

function CopyButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.10] bg-[#080b08] px-4 text-xs font-black uppercase tracking-wider text-gray-400 transition hover:border-[#79c51c] hover:text-[#79c51c]"
    >
      {copied
        ? "Copied"
        : label}
    </button>
  );
}

/* ===================================================== */
/* MOBILE NAV                                             */
/* ===================================================== */

function MobileNavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-black transition ${
        active
          ? "bg-[#79c51c] text-black"
          : "border border-white/[0.08] bg-[#0a0e0a] text-gray-500"
      }`}
    >
      {label}
    </Link>
  );
}

/* ===================================================== */
/* LOADING                                                */
/* ===================================================== */

function LoadingCard() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#080b08] p-12 text-center">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#79c51c]" />

      <p className="mt-5 text-sm font-semibold text-gray-500">
        Loading payout requests...
      </p>
    </div>
  );
}

/* ===================================================== */
/* EMPTY                                                  */
/* ===================================================== */

function EmptyPayouts({
  filter,
}: {
  filter: Filter;
}) {
  let message =
    "There are no payout requests.";

  if (filter === "pending") {
    message =
      "There are no pending payout requests.";
  }

  if (filter === "processing") {
    message =
      "There are no payouts currently being processed.";
  }

  if (filter === "paid") {
    message =
      "There are no paid payout requests yet.";
  }

  if (filter === "rejected") {
    message =
      "There are no rejected payout requests.";
  }

  return (
    <div className="rounded-3xl border border-dashed border-white/[0.12] bg-[#080b08] p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.10] bg-[#050705]">
        <span className="font-black text-[#79c51c]">
          RCS
        </span>
      </div>

      <p className="mt-5 text-xl font-black uppercase">
        No payout requests
      </p>

      <p className="mt-2 text-sm text-gray-600">
        {message}
      </p>
    </div>
  );
}

/* ===================================================== */
/* BANK MASKING                                           */
/* ===================================================== */

function maskSortCode(
  value: string,
) {
  const digits =
    value.replace(
      /\D/g,
      "",
    );

  if (digits.length !== 6) {
    return "******";
  }

  return `**-**-${digits.slice(
    4,
  )}`;
}

function maskAccountNumber(
  value: string,
) {
  const digits =
    value.replace(
      /\D/g,
      "",
    );

  if (digits.length < 4) {
    return "********";
  }

  return `${"*".repeat(
    Math.max(
      0,
      digits.length - 4,
    ),
  )}${digits.slice(-4)}`;
}