import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { gifFileSlug, isSocialCrawler } from "@/lib/social-crawler";

export const proxy = (request: NextRequest) => {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (!isSocialCrawler(userAgent)) {
    return NextResponse.next();
  }

  const slug = gifFileSlug(request.nextUrl.pathname);

  if (!slug) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${slug}`;

  return NextResponse.rewrite(url);
};

export const config = {
  matcher: ["/gifs/:path*"],
};
