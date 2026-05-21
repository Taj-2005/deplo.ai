import { NextResponse } from "next/server";
import { getServerOrigin } from "@/lib/api-origin";

export async function GET(): Promise<NextResponse> {
  const origin = getServerOrigin();

  try {
    const res = await fetch(`${origin}/api/v1/auth/github`, {
      redirect: "manual",
      cache: "no-store",
    });

    const location = res.headers.get("location");
    if (location) {
      return NextResponse.redirect(location);
    }

    if (res.status >= 500) {
      return NextResponse.json(
        {
          error: "API server unavailable",
          hint: `Start the server: cd server && npm run dev (${origin})`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Unexpected auth response from API", status: res.status },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Cannot reach API server",
        hint: `cd server && npm run dev — expected at ${origin}`,
      },
      { status: 502 },
    );
  }
}
