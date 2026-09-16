import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_PINS = [
  "1948",
  "1498",
  process.env.GATE_PIN,
].filter(Boolean) as string[];

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ow_gate_session")?.value;
  const adminSession = cookieStore.get("admin_session")?.value || cookieStore.get("qa-session")?.value;
  const headerToken =
    request.headers.get("x-gate-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const authed =
    token === "authorized_gate_officer" ||
    headerToken === "authorized_gate_officer" ||
    headerToken === "1948" ||
    headerToken === "1498" ||
    Boolean(adminSession);

  return NextResponse.json(
    { authenticated: authed },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN obrigatório." }, { status: 400 });
    }

    const cleanPin = pin.trim();
    const isValid = VALID_PINS.some((p) => p && p.trim() === cleanPin);

    if (!isValid) {
      return NextResponse.json({ error: "PIN de segurança incorrecto." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("ow_gate_session", "authorized_gate_officer", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true, authorized: true });
  } catch (error) {
    console.error("Gate session error:", error);
    return NextResponse.json({ error: "Erro ao autenticar portaria." }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("ow_gate_session");
  return NextResponse.json({ success: true, loggedOut: true });
}