import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const cookie = "overwatch_recruitment";
const DEFAULT_ADMIN_PASSWORD = "OverwatchRecruit2026!";
const ADMIN_PASSWORD =
  process.env.CAREERS_ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : DEFAULT_ADMIN_PASSWORD);

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
  if (!ADMIN_PASSWORD) return false;
  const token = (await cookies()).get(cookie)?.value || "";
  const [expiry, signature] = token.split(".");
  return (
    !!signature && Number(expiry) > Date.now() && equal(signature, sign(expiry))
  );
}
export const checkAdminSession = authenticated;
export async function adminSessionExpiry(): Promise<number | null> {
  if (!(await authenticated())) return null;
  return Number((await cookies()).get(cookie)?.value.split(".")[0]);
}
export async function login() {
  if (!ADMIN_PASSWORD) throw new Error("Configure CAREERS_ADMIN_PASSWORD before signing in");
  const expiry = String(Date.now() + 1 * 60 * 60 * 1000);
  (await cookies()).set(cookie, `${expiry}.${sign(expiry)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 3600,
  });
}
export async function logout() {
  (await cookies()).delete(cookie);
}
export async function extendAdminSession(): Promise<number | null> {
  if (!ADMIN_PASSWORD) return null;
  const token = (await cookies()).get(cookie)?.value || "";
  const [expiry, signature] = token.split(".");
  if (!signature || !equal(signature, sign(expiry)) || Number(expiry) + 15 * 60 * 1000 < Date.now()) {
    return null;
  }
  await login();
  return Date.now() + 1 * 60 * 60 * 1000;
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function verifyAdminAuthorization(request: Request): Promise<boolean> {
  if (!ADMIN_PASSWORD) return false;
  if (await authenticated()) {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method) || sameOrigin(request)) return true;
  }
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey && equal(adminKey, ADMIN_PASSWORD)) return true;
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (equal(bearer, ADMIN_PASSWORD)) return true;
  }
  return false;
}
