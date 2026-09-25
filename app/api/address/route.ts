import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'Enter at least 3 characters' },
        { status: 400 }
      );
    }

    const apiKey = process.env.POSTCODER_API_KEY;

    if (!apiKey) {
      console.error('POSTCODER_API_KEY is missing');

      return NextResponse.json(
        { error: 'Address service is not configured' },
        { status: 500 }
      );
    }

    const postcoderUrl =
      `https://ws.postcoder.com/pcw/${apiKey}/autocomplete/address` +
      `?query=${encodeURIComponent(query.trim())}` +
      `&country=GBR`;

    const response = await fetch(postcoderUrl, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error('Postcoder error:', response.status, errorText);

      return NextResponse.json(
        { error: 'Address lookup failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Address API error:', error);

    return NextResponse.json(
      { error: 'Unable to look up address' },
      { status: 500 }
    );
  }
}