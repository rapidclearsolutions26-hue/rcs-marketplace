"use client";

import { useEffect } from "react";
import {
  PushNotifications,
  Token,
  ActionPerformed,
  PushNotificationSchema,
} from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";

export default function PushNotificationSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let mounted = true;

    const setupPushNotifications = async () => {
      try {
        const permission = await PushNotifications.checkPermissions();

        if (!mounted) return;

        if (permission.receive === "prompt") {
          await PushNotifications.requestPermissions();
        }

        const finalPermission =
          await PushNotifications.checkPermissions();

        if (finalPermission.receive !== "granted") {
          console.log(
            "RCS push notifications permission was not granted."
          );
          return;
        }

        await PushNotifications.register();

        console.log("RCS push notification registration requested.");
      } catch (error) {
        console.error(
          "RCS push notification setup failed:",
          error
        );
      }
    };

    const registrationListener =
      PushNotifications.addListener(
        "registration",
        (token: Token) => {
          console.log(
            "RCS FCM device token:",
            token.value
          );

          // We will save this token to Supabase
          // in the next step.
        }
      );

    const registrationErrorListener =
      PushNotifications.addListener(
        "registrationError",
        (error) => {
          console.error(
            "RCS push registration error:",
            error
          );
        }
      );

    const receivedListener =
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log(
            "RCS push notification received:",
            notification
          );
        }
      );

    const actionListener =
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          console.log(
            "RCS push notification tapped:",
            action
          );

          // Notification tap routing will be added
          // after the basic push system is working.
        }
      );

    setupPushNotifications();

    return () => {
      mounted = false;

      registrationListener.then((listener) =>
        listener.remove()
      );

      registrationErrorListener.then((listener) =>
        listener.remove()
      );

      receivedListener.then((listener) =>
        listener.remove()
      );

      actionListener.then((listener) =>
        listener.remove()
      );
    };
  }, []);

  return null;
}