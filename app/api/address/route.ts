import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim();

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: "Please enter at least 3 characters." },
        { status: 400 },
      );
    }

    const apiKey = process.env.POSTCODER_API_KEY;

    if (!apiKey) {
      console.error("POSTCODER_API_KEY is missing");

      return NextResponse.json(
        { error: "Address service is not configured." },
        { status: 500 },
      );
    }

    const url =
      `https://ws.postcoder.com/pcw/autocomplete/find` +
      `?query=${encodeURIComponent(query)}` +
      `&country=uk` +
      `&apikey=${encodeURIComponent(apiKey)}` +
      `&enablefacets=false` +
      `&usercategory=R` +
      `&maximumresults=10` +
      `&singlesummary=true` +
      `&format=json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "Postcoder error:",
        response.status,
        responseText,
      );

      return NextResponse.json(
        {
          error: "Postcoder rejected the address request.",
          status: response.status,
        },
        { status: response.status },
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Invalid Postcoder response:", responseText);

      return NextResponse.json(
        { error: "Postcoder returned an invalid response." },
        { status: 502 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Address lookup error:", error);

    return NextResponse.json(
      { error: "Unable to look up addresses." },
      { status: 500 },
    );
  }
}