import { authenticated, sameOrigin } from "@/lib/careers-auth";

interface AdminSession {
  id: string;
  lastSeen: number;
  name?: string;
  ip: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __adminPresenceMap: Map<string, AdminSession> | undefined;
}

if (!globalThis.__adminPresenceMap) {
  globalThis.__adminPresenceMap = new Map<string, AdminSession>();
}

function pruneStale(now = Date.now()): Map<string, AdminSession> {
  const cutoff = now - 90 * 1000; // 90-second activity window
  const map = globalThis.__adminPresenceMap!;
  for (const [id, session] of map.entries()) {
    if (session.lastSeen < cutoff) {
      map.delete(id);
    }
  }
  return map;
}

export async function GET() {
  if (!(await authenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const map = pruneStale();
  const onlineCount = Math.max(1, map.size);

  return Response.json(
    { onlineCount, timestamp: Date.now() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  if (!(await authenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const map = pruneStale();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId : `sid_${ip}`;
  const name = typeof body.name === "string" ? body.name : "Admin";

  map.set(sessionId, {
    id: sessionId,
    lastSeen: Date.now(),
    name,
    ip,
  });

  const onlineCount = Math.max(1, map.size);

  return Response.json(
    { onlineCount, timestamp: Date.now() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request) || !(await authenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const map = globalThis.__adminPresenceMap!;
  const body = await request.json().catch(() => ({}));
  if (typeof body.sessionId === "string" && body.sessionId) {
    map.delete(body.sessionId);
  }

  const onlineCount = Math.max(0, map.size);
  return Response.json({ onlineCount });
}
