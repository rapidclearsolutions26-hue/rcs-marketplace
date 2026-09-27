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

  // Temporary maintenance page for the public website.
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rapid Clear Solutions</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #050705;
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 24px;
    }

    .container {
      max-width: 600px;
    }

    .logo {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 24px;
    }

    .logo span {
      color: #1bbb8c;
    }

    h1 {
      font-size: 32px;
      margin-bottom: 16px;
    }

    p {
      color: #b5b5b5;
      font-size: 17px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Rapid Clear <span>Solutions</span></div>
    <h1>We'll be back shortly</h1>
    <p>
      We're currently carrying out some updates to Rapid Clear Solutions.
      Please check back shortly.
    </p>
  </div>
</body>
</html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};