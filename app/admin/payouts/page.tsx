"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
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

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<
    PayoutRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("pending");

  const [selectedPayout, setSelectedPayout] =
    useState<PayoutRecord | null>(null);

  const [processingId, setProcessingId] =
    useState<number | null>(null);

  const [actionError, setActionError] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const loadPayouts = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        const supabase = createClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            sessionError.message
          );
        }

        if (!session?.access_token) {
          throw new Error(
            "Your admin session has expired. Please log in again."
          );
        }

        const response = await fetch(
          "/api/admin/payouts",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load payout requests."
          );
        }

        setPayouts(
          Array.isArray(data.payouts)
            ? data.payouts
            : []
        );
      } catch (error) {
        console.error(
          "Admin payouts error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load payout requests."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  /*
   * Keep the payout page reasonably fresh.
   */
  useEffect(() => {
    const interval =
      window.setInterval(() => {
        void loadPayouts(true);
      }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadPayouts]);

  /*
   * Filtered records.
   */
  const filteredPayouts = useMemo(() => {
    if (filter === "all") {
      return payouts;
    }

    return payouts.filter(
      (payout) =>
        normalise(payout.status) === filter
    );
  }, [payouts, filter]);

  /*
   * Summary figures.
   */
  const pendingPayouts =
    payouts.filter(
      (payout) =>
        normalise(payout.status) ===
        "pending"
    );

  const processingPayouts =
    payouts.filter(
      (payout) =>
        normalise(payout.status) ===
        "processing"
    );

  const paidPayouts =
    payouts.filter(
      (payout) =>
        normalise(payout.status) === "paid"
    );

  const rejectedPayouts =
    payouts.filter(
      (payout) =>
        normalise(payout.status) ===
        "rejected"
    );

  const pendingValue =
    pendingPayouts.reduce(
      (total, payout) =>
        total + Number(payout.amount || 0),
      0
    );

  const paidValue =
    paidPayouts.reduce(
      (total, payout) =>
        total + Number(payout.amount || 0),
      0
    );

  /*
   * Open payout modal.
   */
  function openPayout(
    payout: PayoutRecord
  ) {
    setSelectedPayout(payout);
    setNotes(payout.notes || "");
    setActionError("");
  }

  function closePayout() {
    if (processingId !== null) {
      return;
    }

    setSelectedPayout(null);
    setNotes("");
    setActionError("");
  }

  /*
   * Secure admin payout action.
   */
  async function updatePayout(
    payoutId: number,
    status:
      | "processing"
      | "paid"
      | "rejected"
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
        `Are you sure you want to ${actionText}?`
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(payoutId);
    setActionError("");

    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message
        );
      }

      if (!session?.access_token) {
        throw new Error(
          "Your admin session has expired. Please log in again."
        );
      }

      const response = await fetch(
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
            notes: notes.trim() || null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update payout."
        );
      }

      await loadPayouts(true);

      const updated =
        Array.isArray(data.payouts)
          ? data.payouts
          : null;

      if (updated) {
        setPayouts(updated);
      }

      setSelectedPayout(null);
      setNotes("");
    } catch (error) {
      console.error(
        "Payout update error:",
        error
      );

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update payout."
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-[#17382b] bg-[#081710]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/admin/dashboard"
            className="shrink-0"
          >
            <img
              src="/rcs-logo.jpg"
              alt="Rapid Clear Solutions"
              className="h-11 w-auto object-contain sm:h-14"
            />
          </Link>

          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C] sm:text-xs">
              RCS Admin
            </p>

            <p className="mt-1 hidden text-xs text-[#71857b] sm:block">
              Driver Payouts
            </p>
          </div>
        </div>
      </header>

      {/* MOBILE NAV */}

      <div className="border-b border-[#17382b] bg-[#07130e] sm:hidden">
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

      {/* PAGE */}

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-10">
        {/* TITLE */}

        <section className="mb-6 rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 shadow-xl sm:mb-8 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C] sm:text-xs">
                Driver Payments
              </p>

              <h1 className="mt-2 text-2xl font-black sm:text-4xl">
                Payout Control
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#82958c] sm:text-base">
                Review driver payout requests,
                verify payment information and
                record payments made to drivers.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadPayouts()
              }
              disabled={
                loading || refreshing
              }
              className="min-h-12 rounded-xl border border-[#29483a] bg-[#07130e] px-5 py-3 text-sm font-black text-[#d5dfda] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Updating..."
                : "Refresh"}
            </button>
          </div>
        </section>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-900/60 bg-[#230e0e] p-5">
            <p className="text-sm leading-6 text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {/* SUMMARY */}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Pending"
            value={pendingPayouts.length}
            detail={`£${formatMoney(
              pendingValue
            )} waiting`}
            highlighted
          />

          <SummaryCard
            label="Processing"
            value={processingPayouts.length}
            detail="Being processed"
          />

          <SummaryCard
            label="Paid"
            value={paidPayouts.length}
            detail={`£${formatMoney(
              paidValue
            )} paid`}
          />

          <SummaryCard
            label="Rejected"
            value={rejectedPayouts.length}
            detail="Rejected requests"
          />

          <SummaryCard
            label="All Requests"
            value={payouts.length}
            detail="Total payout requests"
          />
        </section>

        {/* FILTERS */}

        <section className="mt-7">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              label="Pending"
              value="pending"
              active={filter === "pending"}
              count={pendingPayouts.length}
              onClick={() =>
                setFilter("pending")
              }
            />

            <FilterButton
              label="Processing"
              value="processing"
              active={
                filter === "processing"
              }
              count={
                processingPayouts.length
              }
              onClick={() =>
                setFilter("processing")
              }
            />

            <FilterButton
              label="Paid"
              value="paid"
              active={filter === "paid"}
              count={paidPayouts.length}
              onClick={() =>
                setFilter("paid")
              }
            />

            <FilterButton
              label="Rejected"
              value="rejected"
              active={
                filter === "rejected"
              }
              count={
                rejectedPayouts.length
              }
              onClick={() =>
                setFilter("rejected")
              }
            />

            <FilterButton
              label="All"
              value="all"
              active={filter === "all"}
              count={payouts.length}
              onClick={() =>
                setFilter("all")
              }
            />
          </div>
        </section>

        {/* PAYOUTS */}

        <section className="mt-5">
          {loading ? (
            <LoadingCard />
          ) : filteredPayouts.length === 0 ? (
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
                      openPayout(payout)
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* SAFETY NOTE */}

        <section className="mt-8 rounded-3xl border border-[#17382b] bg-[#0b1b14] p-5 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
            Payment Process
          </p>

          <h2 className="mt-2 text-xl font-black">
            Manual bank transfer
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#71857b]">
            The current payout system records the
            payment after you make the bank transfer.
            Always verify the driver, amount and bank
            details before marking a request as paid.
          </p>
        </section>
      </div>

      {/* PAYOUT MODAL */}

      {selectedPayout && (
        <PayoutModal
          payout={selectedPayout}
          notes={notes}
          setNotes={setNotes}
          processing={
            processingId === selectedPayout.id
          }
          actionError={actionError}
          onClose={closePayout}
          onProcessing={() =>
            void updatePayout(
              selectedPayout.id,
              "processing"
            )
          }
          onPaid={() =>
            void updatePayout(
              selectedPayout.id,
              "paid"
            )
          }
          onRejected={() =>
            void updatePayout(
              selectedPayout.id,
              "rejected"
            )
          }
        />
      )}
    </main>
  );
}

/* ===================================================== */
/* PAYOUT CARD                                             */
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

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-[#17382b] bg-[#0b1b14] p-4 text-left shadow-lg transition hover:border-[#1BBB8C] sm:rounded-3xl sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-black sm:text-lg">
              {driver?.full_name ||
                "Unknown driver"}
            </p>

            <StatusBadge
              status={payout.status}
            />
          </div>

          <p className="mt-1 truncate text-xs text-[#71857b] sm:text-sm">
            {driver?.email ||
              "No email available"}
          </p>

          <p className="mt-2 text-[11px] text-[#82958c]">
            Requested{" "}
            {formatDate(
              payout.requested_at
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#71857b]">
              Payout
            </p>

            <p className="mt-1 text-2xl font-black text-[#1BBB8C] sm:text-3xl">
              £{formatMoney(
                payout.amount
              )}
            </p>
          </div>

          <span className="rounded-xl border border-[#29483a] bg-[#07130e] px-3 py-2 text-[10px] font-black text-[#9cafa6]">
            Review
          </span>
        </div>
      </div>
    </button>
  );
}

/* ===================================================== */
/* PAYOUT MODAL                                            */
/* ===================================================== */

function PayoutModal({
  payout,
  notes,
  setNotes,
  processing,
  actionError,
  onClose,
  onProcessing,
  onPaid,
  onRejected,
}: {
  payout: PayoutRecord;
  notes: string;
  setNotes: (value: string) => void;
  processing: boolean;
  actionError: string;
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
    normalise(payout.status) ===
    "pending";

  const isProcessing =
    normalise(payout.status) ===
    "processing";

  const isPaid =
    normalise(payout.status) ===
    "paid";

  const isRejected =
    normalise(payout.status) ===
    "rejected";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#29483a] bg-[#0b1b14] shadow-2xl sm:rounded-3xl">
        {/* MODAL HEADER */}

        <div className="sticky top-0 z-10 border-b border-[#17382b] bg-[#0b1b14] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1BBB8C]">
                Payout Request
              </p>

              <h2 className="mt-2 text-xl font-black sm:text-2xl">
                {driver?.full_name ||
                  "Unknown driver"}
              </h2>

              <p className="mt-1 text-xs text-[#71857b]">
                Request #{payout.id}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-xl border border-[#29483a] bg-[#07130e] px-3 py-2 text-sm font-black text-[#9cafa6] hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {/* AMOUNT */}

          <div className="rounded-2xl border border-[#285c48] bg-[#0e251b] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71857b]">
              Amount to pay
            </p>

            <p className="mt-1 text-4xl font-black text-[#1BBB8C]">
              £{formatMoney(
                payout.amount
              )}
            </p>

            <div className="mt-3">
              <StatusBadge
                status={payout.status}
              />
            </div>
          </div>

          {/* DRIVER */}

          <div className="rounded-2xl border border-[#17382b] bg-[#07130e] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
              Driver
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                  driver?.trading_name ||
                  driver?.company_name ||
                  "Not available"
                }
              />
            </div>
          </div>

          {/* BANK DETAILS */}

          <div className="rounded-2xl border border-[#285c48] bg-[#07130e] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
                  Bank Details
                </p>

                <p className="mt-1 text-xs text-[#71857b]">
                  Verify these details before
                  transferring money.
                </p>
              </div>

              <span className="rounded-full border border-amber-900/60 bg-amber-950/50 px-2.5 py-1 text-[9px] font-black uppercase text-amber-300">
                Sensitive
              </span>
            </div>

            {!details ? (
              <div className="mt-4 rounded-xl border border-red-900/60 bg-[#230e0e] p-4">
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
                    details.sort_code
                  )}
                  sensitive
                />

                <InfoItem
                  label="Account number"
                  value={maskAccountNumber(
                    details.account_number
                  )}
                  sensitive
                />
              </div>
            )}
          </div>

          {/* REQUEST INFORMATION */}

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem
              label="Requested"
              value={formatDate(
                payout.requested_at
              )}
            />

            <InfoItem
              label="Processed"
              value={
                payout.processed_at
                  ? formatDate(
                      payout.processed_at
                    )
                  : "Not processed"
              }
            />
          </div>

          {/* NOTES */}

          <div>
            <label
              htmlFor="admin-payout-notes"
              className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#1BBB8C]"
            >
              Admin Notes
            </label>

            <textarea
              id="admin-payout-notes"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              disabled={processing || isPaid}
              rows={4}
              placeholder="Add a note about this payout..."
              className="w-full rounded-xl border border-[#29483a] bg-[#07130e] px-4 py-3 text-sm text-white outline-none placeholder:text-[#52655c] focus:border-[#1BBB8C] disabled:opacity-60"
            />
          </div>

          {/* ACTION ERROR */}

          {actionError && (
            <div className="rounded-xl border border-red-900/60 bg-[#230e0e] p-4">
              <p className="text-sm leading-6 text-red-300">
                {actionError}
              </p>
            </div>
          )}

          {/* ACTIONS */}

          {!isPaid && !isRejected && (
            <div className="space-y-3 border-t border-[#17382b] pt-5">
              <p className="text-xs leading-5 text-[#71857b]">
                Only mark this request as paid after
                the bank transfer has actually been
                completed.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {isPending && (
                  <button
                    type="button"
                    onClick={onProcessing}
                    disabled={processing}
                    className="min-h-12 rounded-xl border border-[#29483a] bg-[#07130e] px-4 py-3 text-xs font-black text-[#d5dfda] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C] disabled:opacity-50"
                  >
                    {processing
                      ? "Updating..."
                      : "Mark Processing"}
                  </button>
                )}

                {isProcessing && (
                  <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-center text-xs font-black text-amber-300 sm:col-span-1">
                    Processing
                  </div>
                )}

                <button
                  type="button"
                  onClick={onRejected}
                  disabled={processing}
                  className="min-h-12 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs font-black text-red-300 transition hover:border-red-500 disabled:opacity-50"
                >
                  {processing
                    ? "Updating..."
                    : "Reject Payout"}
                </button>

                <button
                  type="button"
                  onClick={onPaid}
                  disabled={
                    processing ||
                    !details
                  }
                  className="min-h-12 rounded-xl bg-[#1BBB8C] px-4 py-3 text-xs font-black text-[#06100c] transition hover:bg-[#16a77c] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {processing
                    ? "Updating..."
                    : "Mark Paid"}
                </button>
              </div>

              {!details && (
                <p className="text-xs font-semibold text-amber-300">
                  Mark Paid is disabled because the
                  driver has no saved bank details.
                </p>
              )}
            </div>
          )}

          {/* COMPLETED MESSAGE */}

          {isPaid && (
            <div className="rounded-2xl border border-green-900/60 bg-green-950/30 p-5">
              <p className="text-sm font-black text-green-300">
                This payout has been marked as paid.
              </p>

              {payout.processed_at && (
                <p className="mt-1 text-xs text-green-400/80">
                  Processed{" "}
                  {formatDate(
                    payout.processed_at
                  )}
                </p>
              )}
            </div>
          )}

          {isRejected && (
            <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
              <p className="text-sm font-black text-red-300">
                This payout has been rejected.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* SUMMARY CARD                                            */
/* ===================================================== */

function SummaryCard({
  label,
  value,
  detail,
  highlighted = false,
}: {
  label: string;
  value: number;
  detail: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-lg sm:rounded-3xl sm:p-5 ${
        highlighted
          ? "border-[#1BBB8C] bg-[#0e251b]"
          : "border-[#17382b] bg-[#0b1b14]"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-[#1BBB8C]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-[#71857b] sm:text-xs">
        {detail}
      </p>
    </div>
  );
}

/* ===================================================== */
/* FILTER BUTTON                                           */
/* ===================================================== */

function FilterButton({
  label,
  value,
  active,
  count,
  onClick,
}: {
  label: string;
  value: Filter;
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
          ? "border-[#1BBB8C] bg-[#1BBB8C] text-[#06100c]"
          : "border-[#29483a] bg-[#0b1b14] text-[#9cafa6] hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
      }`}
    >
      {label}{" "}
      <span className={active ? "" : "text-[#1BBB8C]"}>
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
    <div className="rounded-xl border border-[#17382b] bg-[#0b1b14] p-3">
      <p className="text-[9px] font-black uppercase tracking-wide text-[#64786e]">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-xs font-bold ${
          sensitive
            ? "font-mono text-[#d5dfda]"
            : "text-[#c0cdc6]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* STATUS BADGE                                            */
/* ===================================================== */

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus =
    normalise(status) || "unknown";

  let className =
    "border-[#29483a] bg-[#07130e] text-[#9cafa6]";

  if (
    safeStatus === "pending"
  ) {
    className =
      "border-amber-900/60 bg-amber-950/50 text-amber-300";
  }

  if (
    safeStatus === "processing"
  ) {
    className =
      "border-blue-900/60 bg-blue-950/40 text-blue-300";
  }

  if (
    safeStatus === "paid"
  ) {
    className =
      "border-green-900/60 bg-green-950/40 text-green-300";
  }

  if (
    safeStatus === "rejected"
  ) {
    className =
      "border-red-900/60 bg-red-950/40 text-red-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${className}`}
    >
      {formatStatus(safeStatus)}
    </span>
  );
}

/* ===================================================== */
/* MOBILE NAV                                              */
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
          ? "bg-[#1BBB8C] text-[#06100c]"
          : "border border-[#17382b] bg-[#0b1b14] text-[#9cafa6]"
      }`}
    >
      {label}
    </Link>
  );
}

/* ===================================================== */
/* LOADING                                                 */
/* ===================================================== */

function LoadingCard() {
  return (
    <div className="rounded-3xl border border-[#17382b] bg-[#0b1b14] p-8 text-center">
      <p className="text-sm font-bold text-[#71857b]">
        Loading payout requests...
      </p>
    </div>
  );
}

/* ===================================================== */
/* EMPTY                                                    */
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
    <div className="rounded-3xl border border-dashed border-[#29483a] bg-[#081710] p-10 text-center">
      <p className="text-base font-black">
        No payout requests
      </p>

      <p className="mt-2 text-sm text-[#71857b]">
        {message}
      </p>
    </div>
  );
}

/* ===================================================== */
/* HELPERS                                                  */
/* ===================================================== */

function normalise(
  value: string | null | undefined
) {
  return value?.trim().toLowerCase() || "";
}

function formatStatus(
  value: string | null | undefined
) {
  const safeValue =
    normalise(value) || "Unknown";

  return safeValue
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatMoney(
  value: number
) {
  return Number(value || 0).toFixed(2);
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function maskSortCode(
  value: string
) {
  const digits =
    value.replace(/\D/g, "");

  if (digits.length !== 6) {
    return "******";
  }

  return `**-**-${digits.slice(4)}`;
}

function maskAccountNumber(
  value: string
) {
  const digits =
    value.replace(/\D/g, "");

  if (digits.length < 4) {
    return "********";
  }

  return `${"*".repeat(
    Math.max(0, digits.length - 4)
  )}${digits.slice(-4)}`;
}