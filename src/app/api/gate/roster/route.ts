import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApplications } from "@/lib/careers-store";
import { getSlotDayNumber, getMaputoToday } from "@/lib/careers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("ow_gate_session")?.value;
    const adminSession = cookieStore.get("admin_session")?.value || cookieStore.get("qa-session")?.value;
    const headerToken =
      request.headers.get("x-gate-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const isAuthorized =
      cookieToken === "authorized_gate_officer" ||
      headerToken === "authorized_gate_officer" ||
      headerToken === "1948" ||
      headerToken === "1498" ||
      Boolean(adminSession);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Não autorizado." },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
          },
        }
      );
    }

    const today = getMaputoToday();
    const all = await getApplications();

    // Filter active booked candidates for today (matching numeric day in Maputo)
    const todayCandidates = all
      .filter((a) => {
        if (!a.testSlot) return false;
        if (a.status === "rejected" || a.status === "archived") return false;
        if (a.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" || a.email?.toLowerCase() === "inociowilson7@gmail.com") return false;
        const slotDay = getSlotDayNumber(a.testSlot);
        return slotDay !== null && slotDay === today.day;
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        whatsapp: c.whatsapp,
        testSlot: c.testSlot,
        attendedAt: c.attendedAt || null,
        attendanceStatus: c.attendanceStatus || (c.attendedAt ? "present" : "awaiting"),
      }));

    const presentCount = todayCandidates.filter((c) => Boolean(c.attendedAt)).length;

    return NextResponse.json(
      {
        success: true,
        todayDay: today.day,
        todayMonth: today.month,
        todayYear: today.year,
        todayDate: today.dateStr,
        totalToday: todayCandidates.length,
        presentCount,
        remainingCount: Math.max(0, todayCandidates.length - presentCount),
        candidates: todayCandidates,
        totalInDb: all.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Gate roster error:", error);
    return NextResponse.json(
      { error: "Erro ao obter escala de hoje." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}