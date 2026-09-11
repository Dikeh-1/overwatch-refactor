import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default function middleware(request: NextRequest) {
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
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};

