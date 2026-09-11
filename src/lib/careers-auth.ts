import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const cookie = "overwatch_recruitment";
const DEFAULT_ADMIN_PASSWORD = "OverwatchRecruit2026!";
const ADMIN_PASSWORD =
  process.env.CAREERS_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

export function equal(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function sign(value: string) {
  return createHmac("sha256", ADMIN_PASSWORD)
    .update(value)
    .digest("hex");
}
export async function authenticated() {
  const token = (await cookies()).get(cookie)?.value || "";
  const [expiry, signature] = token.split(".");
  return (
    !!signature && Number(expiry) > Date.now() && equal(signature, sign(expiry))
  );
}
export async function login() {
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set(cookie, `${expiry}.${sign(expiry)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 28800,
  });
}
export async function logout() {
  (await cookies()).delete(cookie);
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
