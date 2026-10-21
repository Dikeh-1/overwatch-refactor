import "server-only";
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { authenticated, equal } from "./careers-auth";

export function gatePin() {
  return (
    process.env.GATE_PIN ||
    (process.env.NODE_ENV !== "production" ? "2026" : "")
  );
}
export function createGateToken() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expires}.${createHmac("sha256", gatePin()).update(`gate:${expires}`).digest("hex")}`;
}
export async function gateAuthorized(request: Request) {
  if (await authenticated()) return true;
  const pin = gatePin();
  if (!pin) return false;
  const token =
    (await cookies()).get("ow_gate_session")?.value ||
    request.headers.get("x-gate-token") ||
    "";
  const [expires, signature] = token.split(".");
  return (
    Boolean(signature) &&
    Number(expires) > Date.now() &&
    equal(
      signature,
      createHmac("sha256", pin).update(`gate:${expires}`).digest("hex"),
    )
  );
}
