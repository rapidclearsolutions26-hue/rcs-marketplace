"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PushNotificationSetup() {
  const supabase = createClient();

  useEffect(() => {
    setupPushNotifications();
  }, []);

  async function setupPushNotifications() {
    try {
      if (
        typeof window === "undefined"
      ) {
        return;
      }

      if (
        !("serviceWorker" in navigator)
      ) {
        console.log(
          "Service workers are not supported."
        );
        return;
      }

      if (
        !("PushManager" in window)
      ) {
        console.log(
          "Push notifications are not supported."
        );
        return;
      }

      if (
        !("Notification" in window)
      ) {
        console.log(
          "Browser notifications are not supported."
        );
        return;
      }

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      /*
       * Register service worker
       */

      const registration =
        await navigator.serviceWorker.register(
          "/sw.js"
        );

      console.log(
        "RCS service worker registered:",
        registration
      );

      /*
       * Check permission
       */

      let permission =
        Notification.permission;

      /*
       * Don't force the permission popup.
       *
       * The NotificationBell already lets
       * the customer enable notifications.
       */

      if (
        permission !== "granted"
      ) {
        console.log(
          "Push permission not granted yet."
        );
        return;
      }

      /*
       * Get existing subscription
       */

      let subscription =
        await registration.pushManager.getSubscription();

      /*
       * Create subscription if needed
       */

      if (!subscription) {
        const publicKey =
          process.env
            .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!publicKey) {
          console.error(
            "Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY"
          );
          return;
        }

        subscription =
          await registration.pushManager.subscribe(
            {
              userVisibleOnly: true,

              applicationServerKey:
                urlBase64ToUint8Array(
                  publicKey
                ),
            }
          );
      }

      /*
       * Save subscription to Supabase
       */

      const response =
        await fetch(
          "/api/push/subscribe",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              subscription:
                subscription.toJSON(),
            }),
          }
        );

      if (!response.ok) {
        const error =
          await response
            .json()
            .catch(() => null);

        console.error(
          "Could not save push subscription:",
          error
        );

        return;
      }

      console.log(
        "RCS push notifications enabled."
      );
    } catch (error) {
      console.error(
        "Push notification setup error:",
        error
      );
    }
  }

  return null;
}

/*
 * Convert VAPID public key
 * into Uint8Array.
 */

function urlBase64ToUint8Array(
  base64String: string
) {
  const padding =
    "=".repeat(
      (4 -
        (base64String.length %
          4)) %
        4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      (character) =>
        character.charCodeAt(0)
    )
  );
}