"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export default function InstallPWA() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] =
    useState(false);
  const [showIOSHelp, setShowIOSHelp] =
    useState(false);
  const [installing, setInstalling] =
    useState(false);

  useEffect(() => {
    /*
     * Detect iPhone / iPad
     */

    const ios =
      /iphone|ipad|ipod/i.test(
        window.navigator.userAgent
      ) ||
      (navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1);

    setIsIOS(ios);

    /*
     * Detect if already installed
     */

    const standalone =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

    const iosStandalone =
      navigator.standalone === true;

    if (standalone || iosStandalone) {
      setIsInstalled(true);
    }

    /*
     * Android / Chrome install prompt
     */

    function handleBeforeInstallPrompt(
      event: BeforeInstallPromptEvent
    ) {
      event.preventDefault();

      setInstallPrompt(event);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    /*
     * Detect successful installation
     */

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  /*
   * =========================================================
   * ANDROID / CHROME INSTALL
   * =========================================================
   */

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    setInstalling(true);

    try {
      await installPrompt.prompt();

      const choice =
        await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error(
        "PWA installation error:",
        error
      );
    } finally {
      setInstalling(false);
      setInstallPrompt(null);
    }
  }

  /*
   * =========================================================
   * DON'T SHOW WHEN INSTALLED
   * =========================================================
   */

  if (isInstalled) {
    return null;
  }

  /*
   * =========================================================
   * IPHONE / SAFARI
   * =========================================================
   */

  if (isIOS) {
    return (
      <>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#17382b] bg-[#0b1b14]">

          <div className="p-5">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#123529] text-lg font-black text-[#1BBB8C]">
                +
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1BBB8C]">
                  RCS App
                </p>

                <h2 className="mt-1 text-base font-black">
                  Add RCS to your home screen
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#71867c]">
                  Get quick access to your RCS Marketplace account.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowIOSHelp(true)
              }
              className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 text-sm font-black text-[#06100c] transition active:scale-[0.98] hover:bg-[#16a77c]"
            >
              ADD TO HOME SCREEN
            </button>

          </div>

        </section>


        {/* ================================================= */}
        {/* IOS INSTRUCTIONS */}
        {/* ================================================= */}

        {showIOSHelp && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">

            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#29483a] bg-[#081710] shadow-2xl">

              <div className="border-b border-[#17382b] p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1BBB8C]">
                      Install RCS
                    </p>

                    <h2 className="mt-1 text-xl font-black">
                      Add to Home Screen
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowIOSHelp(false)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#29483a] text-lg text-[#71867c] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
                  >
                    ×
                  </button>

                </div>

              </div>


              <div className="space-y-5 p-5">

                <div className="flex gap-4">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#123529] text-sm font-black text-[#1BBB8C]">
                    1
                  </div>

                  <div>

                    <p className="font-black">
                      Tap the Share button
                    </p>

                    <p className="mt-1 text-sm leading-5 text-[#71867c]">
                      Tap the Share icon in Safari.
                    </p>

                  </div>

                </div>


                <div className="flex gap-4">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#123529] text-sm font-black text-[#1BBB8C]">
                    2
                  </div>

                  <div>

                    <p className="font-black">
                      Choose Add to Home Screen
                    </p>

                    <p className="mt-1 text-sm leading-5 text-[#71867c]">
                      Scroll down in the Share menu and tap{" "}
                      <span className="font-bold text-white">
                        Add to Home Screen
                      </span>
                      .
                    </p>

                  </div>

                </div>


                <div className="flex gap-4">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#123529] text-sm font-black text-[#1BBB8C]">
                    3
                  </div>

                  <div>

                    <p className="font-black">
                      Tap Add
                    </p>

                    <p className="mt-1 text-sm leading-5 text-[#71867c]">
                      Confirm and RCS will appear on your home screen.
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setShowIOSHelp(false)
                  }
                  className="mt-2 min-h-[48px] w-full rounded-xl border border-[#29483a] bg-[#0b1b14] px-5 text-sm font-black text-[#b8c6c0] transition hover:border-[#1BBB8C] hover:text-[#1BBB8C]"
                >
                  GOT IT
                </button>

              </div>

            </div>

          </div>
        )}
      </>
    );
  }

  /*
   * =========================================================
   * ANDROID / OTHER BROWSERS
   * =========================================================
   */

  if (!installPrompt) {
    return null;
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#17382b] bg-[#0b1b14]">

      <div className="p-5">

        <div className="flex items-start gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#123529] text-lg font-black text-[#1BBB8C]">
            +
          </div>

          <div className="min-w-0 flex-1">

            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1BBB8C]">
              RCS App
            </p>

            <h2 className="mt-1 text-base font-black">
              Install RCS Marketplace
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#71867c]">
              Add RCS to your home screen for faster access.
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={installApp}
          disabled={installing}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#1BBB8C] px-5 text-sm font-black text-[#06100c] shadow-lg shadow-[#1BBB8C]/10 transition active:scale-[0.98] hover:bg-[#16a77c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {installing
            ? "INSTALLING..."
            : "INSTALL RCS APP"}
        </button>

      </div>

    </section>
  );
}