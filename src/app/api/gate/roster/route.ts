import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApplications } from "@/lib/careers-store";

export const dynamic = "force-dynamic";

function getSlotDayNumber(slot?: string | null): number | null {
  if (!slot) return null;
  const match = slot.match(/(?:^|[^\d])(\d{1,2})(?:\s*de\s*|\s+)?/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 31) return num;
  }
  return null;
}

function getMaputoToday() {
  const maputoStr = new Date().toLocaleString("en-US", { timeZone: "Africa/Maputo" });
  const maputoDate = new Date(maputoStr);
  return {
    day: maputoDate.getDate(),
    dateStr: maputoStr,
  };
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ow_gate_session")?.value;
    if (token !== "authorized_gate_officer") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const today = getMaputoToday();
    const all = await getApplications();

    // Filter active booked candidates for today
    const todayCandidates = all
      .filter((a) => {
        if (!a.testSlot) return false;
        if (a.status === "rejected" || a.status === "archived") return false;
        return getSlotDayNumber(a.testSlot) === today.day;
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

    return NextResponse.json({
      success: true,
      todayDay: today.day,
      todayDate: today.dateStr,
      totalToday: todayCandidates.length,
      presentCount,
      remainingCount: Math.max(0, todayCandidates.length - presentCount),
      candidates: todayCandidates,
    });
  } catch (error) {
    console.error("Gate roster error:", error);
    return NextResponse.json({ error: "Erro ao obter escala de hoje." }, { status: 500 });
  }
}