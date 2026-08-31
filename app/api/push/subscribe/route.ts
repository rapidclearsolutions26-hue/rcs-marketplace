import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not authenticated",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const subscription =
      body.subscription;

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid push subscription",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } = await supabase
      .from(
        "push_subscriptions"
      )
      .upsert(
        {
          user_id: user.id,
          endpoint:
            subscription.endpoint,
          p256dh:
            subscription.keys
              .p256dh,
          auth:
            subscription.keys.auth,
        },
        {
          onConflict:
            "user_id,endpoint",
        }
      );

    if (error) {
      console.error(
        "Push subscription database error:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Push subscription error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save push subscription",
      },
      {
        status: 500,
      }
    );
  }
}