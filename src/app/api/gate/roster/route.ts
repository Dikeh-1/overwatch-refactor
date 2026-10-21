import { gateAuthorized } from "@/lib/gate-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApplications } from "@/lib/careers-store";
import { getSlotDayNumber, getMaputoToday, isSlotToday } from "@/lib/careers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const isAuthorized = await gateAuthorized(request);

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
        if (["rejected", "archived", "not_advancing", "withdrawn", "disqualified"].includes(a.status)) return false;
        const slotDay = getSlotDayNumber(a.testSlot);
        return isSlotToday(a.testSlot);
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