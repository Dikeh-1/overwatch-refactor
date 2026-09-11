import {
  authenticated,
  equal,
  login,
  logout,
  sameOrigin,
} from "@/lib/careers-auth";
const DEFAULT_ADMIN_PASSWORD = "OverwatchRecruit2026!";
const ADMIN_PASSWORD =
  process.env.CAREERS_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

const attempts = new Map<string, { count: number; until: number }>();
export async function GET() {
  return Response.json(
    { authenticated: await authenticated() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const previous = attempts.get(ip);
  const attempt =
    previous && previous.until > Date.now()
      ? previous
      : { count: 0, until: Date.now() + 900000 };
  if (attempt.count >= 8)
    return Response.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  const data = await request.json().catch(() => ({}));
  if (
    typeof data.password !== "string" ||
    !equal(data.password, ADMIN_PASSWORD)
  ) {
    attempt.count++;
    attempts.set(ip, attempt);
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }
  attempts.delete(ip);
  await login();
  return Response.json({ success: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  await logout();
  return Response.json({ success: true });
}
