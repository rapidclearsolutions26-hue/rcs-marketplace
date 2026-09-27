import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep API routes available for the mobile app and Stripe.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Keep Next.js internal files available.
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta
    name="robots"
    content="noindex,nofollow"
  />

  <title>Rapid Clear Solutions | Back Soon</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {
      min-height: 100vh;
      background:
        radial-gradient(
          circle at 50% 10%,
          rgba(27, 187, 140, 0.18),
          transparent 38%
        ),
        linear-gradient(
          180deg,
          #07100d 0%,
          #050705 55%,
          #020302 100%
        );

      color: #ffffff;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 24px;

      overflow-x: hidden;
    }

    .page {
      width: 100%;
      max-width: 720px;
      text-align: center;
      position: relative;
    }

    .glow {
      position: absolute;

      width: 340px;
      height: 340px;

      left: 50%;
      top: 50%;

      transform: translate(-50%, -50%);

      background: #1BBB8C;

      opacity: 0.07;

      filter: blur(90px);

      border-radius: 50%;

      pointer-events: none;
    }

    /* LOGO */

    .logo {
      position: relative;

      display: inline-flex;

      align-items: center;
      justify-content: center;

      margin-bottom: 42px;
    }

    .logo-mark {
      width: 58px;
      height: 58px;

      border-radius: 16px;

      background: #1BBB8C;

      display: flex;

      align-items: center;
      justify-content: center;

      margin-right: 14px;

      box-shadow:
        0 0 30px rgba(27, 187, 140, 0.28),
        0 10px 30px rgba(0, 0, 0, 0.45);
    }

    .logo-mark span {
      color: #050705;

      font-size: 22px;

      font-weight: 900;

      letter-spacing: -1.5px;
    }

    .brand {
      text-align: left;

      line-height: 1;
    }

    .brand-name {
      font-size: 27px;

      font-weight: 900;

      letter-spacing: -1px;
    }

    .brand-name span {
      color: #1BBB8C;
    }

    .brand-sub {
      margin-top: 8px;

      color: #8c9894;

      font-size: 10px;

      font-weight: 700;

      letter-spacing: 2px;

      text-transform: uppercase;
    }

    /* MAIN CARD */

    .card {
      position: relative;

      background: rgba(9, 16, 13, 0.9);

      border: 1px solid rgba(27, 187, 140, 0.24);

      border-radius: 28px;

      padding: 56px 34px;

      box-shadow:
        0 30px 80px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.035);

      backdrop-filter: blur(14px);
    }

    /* STATUS */

    .status {
      display: inline-flex;

      align-items: center;

      gap: 9px;

      padding: 9px 16px;

      border-radius: 999px;

      background: rgba(27, 187, 140, 0.09);

      border: 1px solid rgba(27, 187, 140, 0.22);

      color: #1BBB8C;

      font-size: 11px;

      font-weight: 800;

      letter-spacing: 1.5px;

      text-transform: uppercase;

      margin-bottom: 27px;
    }

    .dot {
      width: 8px;
      height: 8px;

      border-radius: 50%;

      background: #1BBB8C;

      box-shadow:
        0 0 8px rgba(27, 187, 140, 0.8),
        0 0 16px rgba(27, 187, 140, 0.4);
    }

    /* HEADING */

    h1 {
      margin: 0;

      font-size: clamp(38px, 7vw, 62px);

      line-height: 1.02;

      letter-spacing: -2.8px;

      font-weight: 900;
    }

    h1 span {
      color: #1BBB8C;

      text-shadow:
        0 0 30px rgba(27, 187, 140, 0.18);
    }

    /* DIVIDER */

    .divider {
      width: 70px;
      height: 3px;

      background: #1BBB8C;

      border-radius: 999px;

      margin: 32px auto;

      box-shadow:
        0 0 15px rgba(27, 187, 140, 0.35);
    }

    /* MESSAGE */

    .message {
      max-width: 560px;

      margin: 0 auto;

      color: #aab5b1;

      font-size: 17px;

      line-height: 1.7;
    }

    .message strong {
      color: #ffffff;

      font-weight: 800;
    }

    /* TIME BOX */

    .time-box {
      display: inline-block;

      margin-top: 30px;

      padding: 14px 22px;

      border-radius: 14px;

      background: rgba(27, 187, 140, 0.07);

      border: 1px solid rgba(27, 187, 140, 0.18);
    }

    .time {
      color: #1BBB8C;

      font-size: 18px;

      font-weight: 900;

      letter-spacing: 0.5px;
    }

    /* FOOTER */

    .footer {
      margin-top: 28px;

      color: #65716d;

      font-size: 12px;
    }

    /* MOBILE */

    @media (max-width: 600px) {
      body {
        padding: 18px;
      }

      .logo {
        margin-bottom: 30px;
      }

      .logo-mark {
        width: 48px;
        height: 48px;

        border-radius: 13px;

        margin-right: 11px;
      }

      .logo-mark span {
        font-size: 18px;
      }

      .brand-name {
        font-size: 21px;
      }

      .brand-sub {
        font-size: 8px;

        letter-spacing: 1.4px;
      }

      .card {
        padding: 43px 21px;

        border-radius: 23px;
      }

      h1 {
        font-size: 40px;

        letter-spacing: -2px;
      }

      .message {
        font-size: 15px;

        line-height: 1.65;
      }

      .time-box {
        margin-top: 26px;

        padding: 13px 19px;
      }

      .time {
        font-size: 16px;
      }
    }
  </style>
</head>

<body>

  <main class="page">

    <div class="glow"></div>

    <!-- RCS BRAND -->

    <div class="logo">

      <div class="logo-mark">
        <span>RCS</span>
      </div>

      <div class="brand">

        <div class="brand-name">
          Rapid Clear <span>Solutions</span>
        </div>

        <div class="brand-sub">
          Waste Removal &amp; Clearance
        </div>

      </div>

    </div>

    <!-- MAINTENANCE CARD -->

    <section class="card">

      <div class="status">

        <span class="dot"></span>

        Website Update

      </div>

      <h1>

        We'll be back at<br />

        <span>7:00 PM UK time.</span>

      </h1>

      <div class="divider"></div>

      <p class="message">

        Rapid Clear Solutions is currently undergoing
        some updates while we improve our platform.

        <br /><br />

        Our website will be back online at
        <strong>7:00 PM UK time.</strong>

      </p>

      <div class="time-box">

        <div class="time">
          Back online at 7:00 PM UK
        </div>

      </div>

    </section>

    <div class="footer">

      © Rapid Clear Solutions

    </div>

  </main>

</body>
</html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};