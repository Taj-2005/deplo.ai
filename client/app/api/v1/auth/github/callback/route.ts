import { NextRequest, NextResponse } from "next/server";
import { getServerOrigin } from "@/lib/api-origin";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = getServerOrigin();
  const search = request.nextUrl.search;

  try {
    const res = await fetch(`${origin}/api/v1/auth/github/callback${search}`, {
      redirect: "manual",
      cache: "no-store",
    });

    const location = res.headers.get("location");
    if (location) {
      return NextResponse.redirect(location);
    }

    if (res.status >= 500) {
      return NextResponse.redirect(
        new URL("/?auth=failed&reason=server", request.url),
      );
    }

    return NextResponse.redirect(
      new URL("/?auth=failed&reason=callback", request.url),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/?auth=failed&reason=unreachable", request.url),
    );
  }
}
