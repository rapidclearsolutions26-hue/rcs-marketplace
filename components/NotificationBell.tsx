"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  job_id: number | null;
  read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    NotificationRow[]
  >([]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  const [soundEnabled, setSoundEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /*
   * =========================================================
   * GET USER
   * =========================================================
   */

  useEffect(() => {
    let mounted = true;

    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    }

    getUser();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * =========================================================
   * BROWSER NOTIFICATION PERMISSION
   * =========================================================
   */

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  /*
   * =========================================================
   * UNLOCK SOUND
   *
   * Browsers block audio autoplay until the user interacts.
   * Clicking the bell unlocks the audio.
   * =========================================================
   */

  async function enableSound() {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      audio.volume = 0;

      await audio.play();

      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;

      setSoundEnabled(true);

      console.log("Notification sound enabled");
    } catch (error) {
      console.error(
        "Could not unlock notification sound:",
        error
      );

      setSoundEnabled(false);
    }
  }

  /*
   * =========================================================
   * PLAY SOUND
   * =========================================================
   */

  async function playNotificationSound() {
    const audio = audioRef.current;

    if (!audio) {
      console.error(
        "Notification audio element not found"
      );

      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;

      await audio.play();

      console.log("Notification sound played");
    } catch (error) {
      console.error(
        "Notification sound could not play:",
        error
      );
    }
  }

  /*
   * =========================================================
   * LOAD NOTIFICATIONS
   * =========================================================
   */

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    async function loadNotifications() {
      setLoading(true);

      const { data, error } = await supabase
        .from("customer_notifications")
        .select(
          `
            id,
            user_id,
            title,
            message,
            type,
            job_id,
            read,
            created_at
          `
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(30);

      if (error) {
        console.error(
          "Notification loading error:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );
      }

      if (mounted) {
        setNotifications(
          (data || []) as NotificationRow[]
        );

        setLoading(false);
      }
    }

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [userId]);

  /*
   * =========================================================
   * REALTIME
   * =========================================================
   */

  useEffect(() => {
    if (!userId) return;

    const channelName =
      `customer-notifications-${userId}`;

    const channel = supabase
      .channel(channelName)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log(
            "🔔 NEW CUSTOMER NOTIFICATION:",
            payload
          );

          const newNotification =
            payload.new as NotificationRow;

          setNotifications((current) => {
            const exists = current.some(
              (notification) =>
                notification.id ===
                newNotification.id
            );

            if (exists) {
              return current;
            }

            return [
              newNotification,
              ...current,
            ].slice(0, 30);
          });

          /*
           * Browser notification
           */

          showBrowserNotification(
            newNotification
          );

          /*
           * Sound
           */

          await playNotificationSound();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "customer_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated =
            payload.new as NotificationRow;

          setNotifications((current) =>
            current.map((notification) =>
              notification.id === updated.id
                ? updated
                : notification
            )
          );
        }
      )

      .subscribe((status) => {
        console.log(
          "🔔 Notification realtime status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /*
   * =========================================================
   * BROWSER NOTIFICATIONS
   * =========================================================
   */

  async function requestPermission() {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    try {
      const result =
        await Notification.requestPermission();

      setPermission(result);

      if (result === "granted") {
        new Notification("RCS Waste", {
          body:
            "Notifications are now enabled.",
          icon: "/rcs-logo.jpg",
        });
      }
    } catch (error) {
      console.error(
        "Notification permission error:",
        error
      );
    }
  }

  /*
   * =========================================================
   * SHOW BROWSER NOTIFICATION
   * =========================================================
   */

  function showBrowserNotification(
    notification: NotificationRow
  ) {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    try {
      const browserNotification =
        new Notification(
          notification.title || "RCS Waste",
          {
            body: notification.message,
            icon: "/rcs-logo.jpg",
            tag: `rcs-${notification.id}`,
          }
        );

      browserNotification.onclick = () => {
        window.focus();

        if (notification.job_id) {
          router.push(
            `/customer/jobs/${notification.job_id}`
          );
        }

        browserNotification.close();
      };
    } catch (error) {
      console.error(
        "Browser notification error:",
        error
      );
    }
  }

  /*
   * =========================================================
   * MARK ONE READ
   * =========================================================
   */

  async function markAsRead(
    notification: NotificationRow
  ) {
    if (
      notification.read ||
      !userId
    ) {
      return;
    }

    const { error } = await supabase
      .from("customer_notifications")
      .update({
        read: true,
      })
      .eq("id", notification.id)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              read: true,
            }
          : item
      )
    );
  }

  /*
   * =========================================================
   * MARK ALL READ
   * =========================================================
   */

  async function markAllAsRead() {
    if (!userId) return;

    const { error } = await supabase
      .from("customer_notifications")
      .update({
        read: true,
      })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );

      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  }

  /*
   * =========================================================
   * OPEN NOTIFICATION
   * =========================================================
   */

  async function openNotification(
    notification: NotificationRow
  ) {
    await markAsRead(notification);

    setOpen(false);

    if (notification.job_id) {
      router.push(
        `/customer/jobs/${notification.job_id}`
      );
    }
  }

  /*
   * =========================================================
   * BELL CLICK
   * =========================================================
   */

  async function handleBellClick() {
    setOpen((value) => !value);

    /*
     * First user interaction unlocks sound.
     */

    if (!soundEnabled) {
      await enableSound();
    }
  }

  /*
   * =========================================================
   * HELPERS
   * =========================================================
   */

  const unreadCount =
    notifications.filter(
      (notification) => !notification.read
    ).length;

  function formatTime(
    dateString: string
  ) {
    return new Date(
      dateString
    ).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function notificationIcon(
    type: string | null
  ) {
    switch (type) {
      case "new_bid":
        return "£";

      case "job_assigned":
        return "✓";

      case "driver_on_way":
        return "🚚";

      case "job_completed":
        return "✓";

      default:
        return "!";
    }
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="relative">

      {/* ================================================= */}
      {/* NOTIFICATION SOUND                                */}
      {/* ================================================= */}

      <audio
        ref={audioRef}
        preload="auto"
        src="/notification.mp3"
      />

      {/* ================================================= */}
      {/* BELL                                               */}
      {/* ================================================= */}

      <button
        type="button"
        onClick={handleBellClick}
        aria-label="Notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-lg">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* ================================================= */}
      {/* DROPDOWN                                          */}
      {/* ================================================= */}

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-2rem)] max-w-[390px] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a11] shadow-2xl sm:w-[390px]">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">

              <div>
                <h3 className="font-black text-white">
                  Notifications
                </h3>

                <p className="mt-0.5 text-xs text-white/40">
                  {unreadCount === 0
                    ? "You're all caught up"
                    : `${unreadCount} unread`}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-[#6aa63b] hover:text-[#8bc45b]"
                >
                  Mark all read
                </button>
              )}

            </div>

            {/* BROWSER NOTIFICATIONS */}

            {permission !== "granted" && (
              <div className="border-b border-white/10 bg-[#102218] p-4">

                <p className="text-sm font-bold text-white">
                  Turn on notifications
                </p>

                <p className="mt-1 text-xs leading-5 text-white/50">
                  Get notified when a driver
                  submits a quote for your job.
                </p>

                <button
                  type="button"
                  onClick={requestPermission}
                  className="mt-3 rounded-lg bg-[#529027] px-4 py-2 text-xs font-black text-white hover:bg-[#6aa63b]"
                >
                  Enable notifications
                </button>

              </div>
            )}

            {/* SOUND */}

            {!soundEnabled && (
              <div className="border-b border-white/10 bg-[#102218] p-4">

                <p className="text-sm font-bold text-white">
                  🔊 Enable notification sound
                </p>

                <p className="mt-1 text-xs leading-5 text-white/50">
                  Click below to allow RCS to play a
                  sound when a new quote arrives.
                </p>

                <button
                  type="button"
                  onClick={enableSound}
                  className="mt-3 rounded-lg border border-[#529027]/40 bg-[#529027]/10 px-4 py-2 text-xs font-black text-[#8bc45b] hover:bg-[#529027]/20"
                >
                  Enable sound
                </button>

              </div>
            )}

            {/* NOTIFICATIONS */}

            <div className="max-h-[420px] overflow-y-auto">

              {loading ? (

                <div className="p-8 text-center">

                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-3 border-white/10 border-t-[#529027]" />

                  <p className="mt-3 text-xs font-semibold text-white/40">
                    Loading notifications...
                  </p>

                </div>

              ) : notifications.length === 0 ? (

                <div className="p-8 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#529027]/10 text-xl">
                    🔔
                  </div>

                  <p className="mt-4 font-bold text-white">
                    No notifications
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/40">
                    New driver quotes and job
                    updates will appear here.
                  </p>

                </div>

              ) : (

                <div>

                  {notifications.map(
                    (notification) => (

                      <button
                        type="button"
                        key={notification.id}
                        onClick={() =>
                          openNotification(
                            notification
                          )
                        }
                        className={`flex w-full gap-3 border-b border-white/5 p-4 text-left transition hover:bg-white/5 ${
                          notification.read
                            ? "bg-transparent"
                            : "bg-[#529027]/5"
                        }`}
                      >

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                            notification.read
                              ? "bg-white/5 text-white/40"
                              : "bg-[#529027] text-white"
                          }`}
                        >
                          {notificationIcon(
                            notification.type
                          )}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-2">

                            <p
                              className={`text-sm ${
                                notification.read
                                  ? "font-semibold text-white/70"
                                  : "font-black text-white"
                              }`}
                            >
                              {notification.title}
                            </p>

                            {!notification.read && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#529027]" />
                            )}

                          </div>

                          <p className="mt-1 text-xs leading-5 text-white/50">
                            {notification.message}
                          </p>

                          <p className="mt-2 text-[10px] font-bold text-white/30">
                            {formatTime(
                              notification.created_at
                            )}
                          </p>

                        </div>

                      </button>

                    )
                  )}

                </div>

              )}

            </div>

          </div>
        </>
      )}

    </div>
  );
}