import { bookingFollowUp, deliveryId } from "@/lib/communication-delivery";
import { getMail, listMail } from "@/lib/communication-mail-store";
import { after } from "next/server";
import { sameBookingScope, getQuotaForSlot } from "@/lib/careers-booking-rules";
import { auditRequest } from "@/lib/admin-activity";
import { resolveApplication, isTerminal, isNextPhase } from "@/lib/careers-workflow";
import { getCandidateSlotConfig, reserveTestSlot } from "@/lib/careers-booking";
import { getCareersPool } from "@/lib/careers-db";
import { getApplication, updateApplication, getApplications } from "@/lib/careers-store";
import { normalizeSlot, isPastDateSlot, isSlotBookingExpired, type Application } from "@/lib/careers";
import { sendBookingConfirmation } from "@/lib/careers-email";
import { siteContact } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const KNOWN_REQUIREMENT_TRANSLATIONS: Array<{
  match: RegExp;
  pt: string;
  en: string;
}> = [
  {
    match: /^documento de identifica[cç][aã]o$/i,
    pt: "Documento de identificação (BI / Passaporte)",
    en: "Identification document (ID / Passport)",
  },
  {
    match: /documento de identifica[cç][aã]o original/i,
    pt: "Documento de identificação original (BI / Passaporte)",
    en: "Original photo ID (BI / Passport)",
  },
  {
    match: /^caneta$/i,
    pt: "Caneta",
    en: "Pen",
  },
  {
    match: /caneta.*azul ou preta/i,
    pt: "Caneta (azul ou preta)",
    en: "A pen (blue or black)",
  },
  {
    match: /l[aá]pis e borracha/i,
    pt: "Lápis e borracha, se desejar",
    en: "Pencil and eraser, if desired",
  },
  {
    match: /calculadora simples/i,
    pt: "Calculadora simples, opcional",
    en: "Simple calculator, optional",
  },
  {
    match: /chegar at[eé] [aà]s 09h30/i,
    pt: "Chegar até às 09h30 (portão fecha às 09h50)",
    en: "Arrive by 09:30 (gate closes at 09:50)",
  },
];

function extractListItemsFromHtml(html?: string): string[] {
  if (!html || typeof html !== "string") return [];
  const matches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  return matches
    .map((m) =>
      m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

async function resolveCandidateRoleRequirements(candidate: Application) {
  const isTechManager =
    candidate.role === "cctv_technical_manager" ||
    Boolean(candidate.cohortId && candidate.cohortId.includes("cctv_technical_manager"));

  const defaultRoleTitle = isTechManager
    ? {
        pt: "Gestor Técnico e Instalação de CCTV",
        en: "CCTV Installation & Technical Manager",
      }
    : {
        pt: "Operadora de CCO",
        en: "CCTV Operator",
      };

  const referenceCode = isTechManager ? "TM-2026/MZQ" : "CCO-2026/MZQ";

  const durationText = isTechManager
    ? {
        pt: "Duração aproximada: 90 minutos · Chegada com 15 min de antecedência",
        en: "Approximate duration: 90 minutes · Arrive 15 min early",
      }
    : {
        pt: "10h00 às 11h30 · Chegada às 09h30",
        en: "10:00 AM to 11:30 AM · Arrive at 09:30",
      };

  const venueLandmark = {
    pt: "Casa cor-de-laranja com portão preto, antes do cruzamento com a Av. Filipe Samuel Magaia",
    en: "Orange house with black gate, before the intersection with Av. Filipe Samuel Magaia",
  };

  let whatToBringPt = isTechManager
    ? [
        "Documento de identificação (BI / Passaporte)",
        "Caneta",
        "Lápis e borracha, se desejar",
        "Calculadora simples, opcional",
      ]
    : [
        "Documento de identificação original (BI / Passaporte)",
        "Caneta (azul ou preta)",
        "Chegar até às 09h30 (portão fecha às 09h50)",
      ];

  let whatToBringEn = isTechManager
    ? [
        "Identification document (ID / Passport)",
        "Pen",
        "Pencil and eraser, if desired",
        "Simple calculator, optional",
      ]
    : [
        "Original photo ID (BI / Passport)",
        "A pen (blue or black)",
        "Arrive by 09:30 (gate closes at 09:50)",
      ];

  try {
    let rule = await getMail(deliveryId(`booking-follow-up:${candidate.id}`));
    if (!rule && candidate.cohortId && candidate.role) {
      const cohortRules = await listMail(`${candidate.cohortId}:${candidate.role}:bulk`, "automation");
      rule = cohortRules[0] || null;
    }

    if (rule?.data?.message) {
      const extracted = extractListItemsFromHtml(rule.data.message);
      if (extracted.length > 0) {
        const mappedPt: string[] = [];
        const mappedEn: string[] = [];
        for (const item of extracted) {
          const known = KNOWN_REQUIREMENT_TRANSLATIONS.find((k) => k.match.test(item));
          if (known) {
            mappedPt.push(known.pt);
            mappedEn.push(known.en);
          } else {
            mappedPt.push(item);
            mappedEn.push(item);
          }
        }
        whatToBringPt = mappedPt;
        whatToBringEn = mappedEn;
      }
    }

    if (
      rule?.data?.roleTitle &&
      typeof rule.data.roleTitle === "string" &&
      !isTechManager &&
      candidate.role !== "cctv" &&
      candidate.role !== "cctv_operator"
    ) {
      defaultRoleTitle.pt = rule.data.roleTitle;
      defaultRoleTitle.en = rule.data.roleTitle;
    }
  } catch {
    // Fallback to role defaults if mail store lookup fails
  }

  return {
    roleTitle: defaultRoleTitle,
    referenceCode,
    durationText,
    venueLandmark,
    whatToBring: {
      pt: whatToBringPt,
      en: whatToBringEn,
    },
  };
}

async function resolveCandidateWithFallback(rawId?: string | null): Promise<Application | null> {
  const cleanId = (rawId || "").trim().replace(/\/+$/, "").replace(/[\s.…]+$/, "");
  if (!cleanId || !/^[\w.-]{6,64}$/i.test(cleanId)) return null;

  let raw = await getApplication(cleanId, true);
  if (!raw && cleanId.length >= 8) {
    const prefix = cleanId.replace(/[\s.…]+$/, "").split("-")[0];
    if (/^[a-f0-9]{8}$/i.test(prefix)) {
      const pool = getCareersPool();
      if (pool) {
        try {
          const fallback = await pool.query(
            "SELECT data FROM career_applications WHERE id::text LIKE $1 LIMIT 2",
            [`${prefix.toLowerCase()}%`]
          );
          if (fallback.rows.length === 1 && fallback.rows[0]?.data) {
            raw = fallback.rows[0].data;
          }
        } catch {}
      }
      if (!raw) {
        try {
          const all = await getApplications();
          const matches = all.filter((a) => a.id.toLowerCase().startsWith(prefix.toLowerCase()));
          if (matches.length === 1) {
            raw = matches[0];
          }
        } catch {}
      }
    }
  }
  return raw ? resolveApplication(raw) : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const candidate = await resolveCandidateWithFallback(id);
    if (!candidate) {
      return Response.json(
        { error: "Candidatura não encontrada." },
        { status: 404 },
      );
    }

    // Block booking link if candidate status is deactivated or archived
    if (isTerminal(candidate)) {
      return Response.json(
        {
          error: "Este link de convocatória foi desactivado.",
          deactivated: true,
          reason: "A candidatura foi arquivada ou excluída do processo de selecção.",
        },
        { status: 410 },
      );
    }

    if (!candidate.invitedAt && !candidate.testSlot && candidate.status !== "test_invited") return Response.json({ error: "This applicant has not received a test invitation.", code: "INVITATION_REQUIRED" }, { status: 403 });
    if (!candidate.bookingLinkOpenedAt) {
      updateApplication(candidate.id, { bookingLinkOpenedAt: new Date().toISOString() }).catch((err) => {
        console.warn("Could not mark bookingLinkOpenedAt (non-fatal):", err);
      });
    }

    const [allApps, slotConfig, roleMeta] = await Promise.all([
      getApplications(), // Use in-memory cache to eliminate massive Supabase egress
      getCandidateSlotConfig(candidate),
      resolveCandidateRoleRequirements(candidate),
    ]);
    const { slots: activeSlots, quota = 15, slotQuotas = {} } = slotConfig;
    const hasActiveGrace = Boolean(candidate.rebookingGrace && !candidate.rebookingGrace.usedAt);

    // Filter available candidate booking slots:
    // If candidate has not booked yet or is using Grace OTL, only provide future open slots (excluding slots expired 1 day prior).
    const candidateSlots = activeSlots.filter(s => !isPastDateSlot(s) && !isSlotBookingExpired(s));

    const slotStats: Record<string, { booked: number; max: number; isFull: boolean; remaining: number; isPast: boolean }> = {};
    for (const s of candidateSlots) {
      const normS = normalizeSlot(s);
      const maxPerDay = getQuotaForSlot(s, quota, slotQuotas);
      const isPast = isPastDateSlot(s) || isSlotBookingExpired(s);
      const booked = allApps.filter(
        (a) => sameBookingScope(a, candidate) && normalizeSlot(a.testSlot) === normS && !isTerminal(resolveApplication(a)) && a.id !== candidate.id
      ).length;
      const isFull = isPast || booked >= maxPerDay;
      slotStats[s] = {
        booked,
        max: maxPerDay,
        isFull,
        isPast,
        remaining: isPast ? 0 : Math.max(0, maxPerDay - booked),
      };
    }

    return Response.json(
      {
        id: candidate.id,
        name: candidate.name,
        role: candidate.role,
        cohortId: candidate.cohortId || null,
        roleTitle: roleMeta.roleTitle,
        referenceCode: roleMeta.referenceCode,
        durationText: roleMeta.durationText,
        venueLandmark: roleMeta.venueLandmark,
        whatToBring: roleMeta.whatToBring,
        testSlot: hasActiveGrace ? null : candidate.testSlot || null,
        previousTestSlot: candidate.rebookingGrace?.previousSlot || candidate.testSlot || null,
        rebookingGraceActive: hasActiveGrace,
        rebookingGrace: candidate.rebookingGrace || null,
        testBookedAt: candidate.testBookedAt || null,
        invitedAt: candidate.invitedAt || null,
        slots: candidateSlots,
        slotStats,
        windowFilledNotice: !candidate.testSlot,
        attendedAt: candidate.attendedAt || null,
        attendanceStatus: candidate.attendanceStatus || null,
        address: siteContact.address.pt,
        isNextPhase: isNextPhase(candidate),
        nextPhaseToken: candidate.nextPhaseToken || candidate.id,
        supportEmail: siteContact.email,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    console.error("Test booking GET error:", error);
    return Response.json(
      {
        error: "Erro ao carregar detalhes da convocatória.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { id, slot } = body;

    if (!slot || typeof slot !== "string" || !slot.trim()) {
      return Response.json(
        { error: "Por favor selecione uma data válida para o teste." },
        { status: 400 },
      );
    }

    const candidate = await resolveCandidateWithFallback(id);
    if (!candidate) {
      return Response.json(
        { error: "Candidatura não encontrada." },
        { status: 404 },
      );
    }

    // Block booking for deactivated or archived candidates
    if (isTerminal(candidate)) {
      return Response.json(
        {
          error: "Este link de agendamento foi desactivado. Contacte o departamento de RH para mais informações.",
          deactivated: true,
        },
        { status: 410 },
      );
    }

    // Single-use booking safeguard: block repeat booking unless active rebooking grace was authorized
    const hasActiveGrace = Boolean(candidate.rebookingGrace && !candidate.rebookingGrace.usedAt);

    if (candidate.testSlot && !hasActiveGrace) {
      return Response.json(
        {
          error:
            "Já agendou o seu teste anteriormente. O agendamento só pode ser realizado uma única vez.",
          alreadyBooked: true,
          testSlot: candidate.testSlot,
        },
        { status: 409 },
      );
    }

    const normalizedSlot = normalizeSlot(slot);

    // Past or expired slot safeguard: block booking for dates/times that have concluded or expired 1 day prior (11:59 PM day before)
    if (isPastDateSlot(normalizedSlot) || isSlotBookingExpired(normalizedSlot)) {
      return Response.json(
        {
          error:
            "As inscrições para este turno encerraram às 23h59 do dia anterior. Por favor escolha um turno disponível futuro.",
          slotExpired: true,
        },
        { status: 400 },
      );
    }

    const config = await getCandidateSlotConfig(candidate);
    const updated = await reserveTestSlot(candidate, normalizedSlot, config, await getApplications());

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    // Booking is already committed. Neither email blocks confirmation of the
    // reservation, and a slow standard receipt cannot delay the configured follow-up.
    after(async () => {
      const outcomes = await Promise.allSettled([
        bookingFollowUp(updated),
        sendBookingConfirmation({ application: updated, slot: normalizedSlot, baseUrl: origin }),
      ]);
      for (const result of outcomes) if (result.status === "rejected") console.error("Booking email needs attention:", result.reason);
    });

    return Response.json({
      success: true,
      id: updated.id,
      name: updated.name,
      testSlot: updated.testSlot,
      testBookedAt: updated.testBookedAt,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["SLOT_FULL", "ALREADY_BOOKED", "INVALID_SLOT", "CANDIDATE_INACTIVE", "INVITATION_REQUIRED", "BOOKING_CHANGED"].includes(code)) return Response.json({ error: code === "SLOT_FULL" ? "Este turno está cheio. Escolha outra data." : code === "INVALID_SLOT" ? "Seleccione um turno disponível configurado para este lote." : "Este agendamento não está disponível. Contacte a equipa de recrutamento.", code }, { status: 409 });
    console.error("Test booking POST error:", error);
    return Response.json(
      { error: "Falha ao gravar confirmação do teste." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
