import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Gate shortcuts: redirect /en/gate and /pt/gate directly to /gate with appropriate lang
  if (
    pathname === "/en/gate" ||
    pathname === "/en/gate-" ||
    pathname.startsWith("/en/gate/")
  ) {
    const url = new URL("/gate" + search, request.url);
    url.searchParams.set("lang", "en");
    return NextResponse.redirect(url);
  }

  if (
    pathname === "/pt/gate" ||
    pathname === "/pt/gate-" ||
    pathname.startsWith("/pt/gate/")
  ) {
    const url = new URL("/gate" + search, request.url);
    url.searchParams.set("lang", "pt");
    return NextResponse.redirect(url);
  }

  const response = intlMiddleware(request);

  response.cookies.set({
    name: "overwatch_cookie_notice",
    value: "accepted",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  return response;
}

export { middleware as proxy };

export const config = {
  matcher: ["/((?!api|admin|gate|_next|_vercel|.*\\..*).*)"],
};

