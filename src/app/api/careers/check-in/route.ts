import { getApplication, getApplications, updateApplication } from "@/lib/careers-store";
import { siteContact } from "@/lib/site-config";
import { getSlotDayNumber, getMaputoToday } from "@/lib/careers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const query = searchParams.get("query")?.trim();

    let candidate = null;

    if (id && /^[\da-f-]{36}$/i.test(id)) {
      candidate = await getApplication(id);
    } else if (query) {
      const qStr = String(query).trim();
      const cleanPhone = qStr.replace(/\D/g, "");
      const qLower = qStr.toLowerCase();
      const all = await getApplications();
      candidate = all.find((a) => {
        const appPhone = (a.whatsapp || "").replace(/\D/g, "");
        if (cleanPhone && cleanPhone.length >= 4 && (appPhone.endsWith(cleanPhone) || cleanPhone.endsWith(appPhone))) {
          return true;
        }
        if (a.email && a.email.toLowerCase() === qLower) {
          return true;
        }
        if (a.name && a.name.toLowerCase().includes(qLower)) {
          return true;
        }
        if (a.id && a.id.toLowerCase().startsWith(qLower)) {
          return true;
        }
        return false;
      });
    }

    if (!candidate) {
      return Response.json(
        { error: "Candidatura não encontrada no sistema de selecção.", found: false },
        { status: 404 }
      );
    }

    const today = getMaputoToday();
    const bookedDay = getSlotDayNumber(candidate.testSlot);
    const isBooked = Boolean(candidate.testSlot);
    const isToday = isBooked && bookedDay === today.day;
    const isDeactivated =
      candidate.status === "rejected" ||
      candidate.status === "archived" ||
      candidate.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
      candidate.email.toLowerCase() === "inociowilson7@gmail.com";
    const isAlreadyAttended = Boolean(candidate.attendedAt);

    return Response.json({
      found: true,
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      whatsapp: candidate.whatsapp,
      email: candidate.email,
      sex: candidate.sex,
      status: candidate.status,
      testSlot: candidate.testSlot || null,
      testBookedAt: candidate.testBookedAt || null,
      attendedAt: candidate.attendedAt || null,
      attendanceStatus: candidate.attendanceStatus || (isAlreadyAttended ? "present" : "pending"),
      isBooked,
      isToday,
      isAlreadyAttended,
      isDeactivated,
      isBeforeNineAm: today.isBeforeNineAm,
      maputoTime: today.timeString,
      countdownString: today.countdownString,
      todayDay: today.day,
      bookedDay,
      address: siteContact.address.pt,
    });
  } catch (error) {
    console.error("Check-in GET error:", error);
    return Response.json({ error: "Erro ao verificar agendamento." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, query, action = "check_in", force = false } = body;

    let candidate = null;

    if (id && /^[\da-f-]{36}$/i.test(id)) {
      candidate = await getApplication(id);
    } else if (query) {
      const qStr = String(query).trim();
      const cleanPhone = qStr.replace(/\D/g, "");
      const qLower = qStr.toLowerCase();
      const all = await getApplications();
      candidate = all.find((a) => {
        const appPhone = (a.whatsapp || "").replace(/\D/g, "");
        if (cleanPhone && cleanPhone.length >= 4 && (appPhone.endsWith(cleanPhone) || cleanPhone.endsWith(appPhone))) {
          return true;
        }
        if (a.email && a.email.toLowerCase() === qLower) {
          return true;
        }
        if (a.name && a.name.toLowerCase().includes(qLower)) {
          return true;
        }
        if (a.id && a.id.toLowerCase().startsWith(qLower)) {
          return true;
        }
        return false;
      });
    }

    if (!candidate) {
      return Response.json(
        { error: "Candidato não encontrado. Verifique o número de WhatsApp ou e-mail.", found: false },
        { status: 404 }
      );
    }

    // Safeguard 1: Disqualified / Archived or blocked
    if (
      candidate.status === "rejected" ||
      candidate.status === "archived" ||
      candidate.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
      candidate.email.toLowerCase() === "inociowilson7@gmail.com"
    ) {
      return Response.json(
        {
          error: "Candidatura não autorizada para teste presencial (estado: desqualificado/arquivado).",
          candidateName: candidate.name,
          disqualified: true,
        },
        { status: 403 }
      );
    }

    // Safeguard 2: No test slot booked yet
    if (!candidate.testSlot) {
      return Response.json(
        {
          error: "Candidato ainda não concluiu o agendamento de uma data de teste.",
          candidateName: candidate.name,
          notBooked: true,
        },
        { status: 400 }
      );
    }

    const today = getMaputoToday();
    const bookedDay = getSlotDayNumber(candidate.testSlot);
    const isToday = bookedDay === today.day;

    // Action: Mark Absent / Reset Attendance
    if (action === "mark_absent") {
      const updated = await updateApplication(candidate.id, {
        attendedAt: undefined,
        attendanceStatus: "absent",
      });
      return Response.json({
        success: true,
        action: "marked_absent",
        candidate: { id: updated.id, name: updated.name, attendanceStatus: "absent" },
      });
    }

    // Action: Toggle Attendance
    if (action === "toggle") {
      const nextAttended = candidate.attendanceStatus === "present" ? undefined : new Date().toISOString();
      const nextStatus = candidate.attendanceStatus === "present" ? "absent" : "present";
      const updated = await updateApplication(candidate.id, {
        attendedAt: nextAttended,
        attendanceStatus: nextStatus,
      });
      return Response.json({
        success: true,
        action: "toggled",
        candidate: {
          id: updated.id,
          name: updated.name,
          attendanceStatus: updated.attendanceStatus,
          attendedAt: updated.attendedAt,
        },
      });
    }

    // Action: Check In (Default)
    // Safeguard 2.5: Time Check (Check-in strictly allowed starting from 09:00 AM Mozambique Time)
    if (today.isBeforeNineAm && !force) {
      return Response.json(
        {
          error: "O check-in na portaria só é permitido a partir das 09h00 (Hora de Moçambique). O sistema de validação abrirá automaticamente às 09h00.",
          beforeNineAm: true,
          code: "BEFORE_NINE_AM",
          candidateName: candidate.name,
          currentHour: today.hour,
          currentMinute: today.minute,
          timeString: today.timeString,
          countdownString: today.countdownString,
        },
        { status: 403 }
      );
    }

    // Safeguard 3: Date Check (Unless admin force override is true)
    if (!isToday && !force) {
      const isFuture = bookedDay !== null && bookedDay > today.day;
      const isPast = bookedDay !== null && bookedDay < today.day;

      let msgPt = `Acesso Recusado: Turno Incorrecto. O seu teste está agendado para ${candidate.testSlot}, e não para hoje.`;
      if (isFuture) {
        msgPt += " Por favor compareça apenas no dia e hora marcados para garantir a sua vaga.";
      } else if (isPast) {
        msgPt += " A sua data agendada já passou. Contacte o RH para esclarecimentos.";
      }

      return Response.json(
        {
          error: msgPt,
          wrongDay: true,
          scheduledSlot: candidate.testSlot,
          candidateName: candidate.name,
          candidateId: candidate.id,
          todayDay: today.day,
          bookedDay,
        },
        { status: 409 }
      );
    }

    // Safeguard 4: Duplicate Scan Prevention (Already Checked In)
    if (candidate.attendedAt && !force) {
      return Response.json(
        {
          success: false,
          alreadyCheckedIn: true,
          code: "ALREADY_CHECKED_IN",
          error: "Candidato(a) já realizou o check-in anteriormente.",
          attendedAt: candidate.attendedAt,
          scheduledSlot: candidate.testSlot,
          candidate: {
            id: candidate.id,
            name: candidate.name,
            testSlot: candidate.testSlot,
            attendedAt: candidate.attendedAt,
            attendanceStatus: candidate.attendanceStatus || "present",
            whatsapp: candidate.whatsapp,
            email: candidate.email,
          },
        },
        { status: 409 }
      );
    }

    // Record attendance
    const nowIso = new Date().toISOString();
    const updated = await updateApplication(candidate.id, {
      attendedAt: nowIso,
      attendanceStatus: "present",
    });

    return Response.json({
      success: true,
      verified: true,
      candidate: {
        id: updated.id,
        name: updated.name,
        testSlot: updated.testSlot,
        attendedAt: updated.attendedAt,
        attendanceStatus: updated.attendanceStatus,
        whatsapp: updated.whatsapp,
        email: updated.email,
      },
      message: `Presença Confirmada! Bem-vinda, ${updated.name}. Entrada autorizada no Centro de Testes.`,
    });
  } catch (error) {
    console.error("Check-in POST error:", error);
    return Response.json({ error: "Falha ao registar presença." }, { status: 500 });
  }
}
