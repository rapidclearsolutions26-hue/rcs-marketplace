"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "rcs-update-popup-v1";

export default function RcsUpdatePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);

    if (!seen) {
      setOpen(true);
    }
  }, []);

  function closePopup() {
    localStorage.setItem(STORAGE_KEY, "seen");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d0b] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#79c51c]/10">
            <div className="h-3 w-3 rounded-full bg-[#79c51c]" />
          </div>

          <button
            onClick={closePopup}
            aria-label="Close"
            className="text-2xl leading-none text-gray-500 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <h2 className="text-2xl font-black tracking-tight">
          RCS has updated
        </h2>

        <p className="mt-3 text-base leading-7 text-gray-400">
          We’ve updated the{" "}
          <span className="font-semibold text-white">
            customer and driver experience
          </span>{" "}
          to make RCS easier and smoother to use.
        </p>

        <button
          onClick={closePopup}
          className="mt-7 w-full rounded-xl bg-[#79c51c] px-5 py-3.5 text-sm font-black text-black transition hover:bg-[#91db32]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}