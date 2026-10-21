import { gateAuthorized, gatePin, createGateToken } from "@/lib/gate-auth";
import { equal, sameOrigin } from "@/lib/careers-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authed = await gateAuthorized(request);

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
  if (!sameOrigin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const { pin } = await request.json();
    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN obrigatório." }, { status: 400 });
    }

    const cleanPin = pin.trim();
    const isValid = Boolean(gatePin()) && equal(gatePin(), cleanPin);

    if (!isValid) {
      return NextResponse.json({ error: "PIN de segurança incorrecto." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("ow_gate_session", createGateToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 7 days
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