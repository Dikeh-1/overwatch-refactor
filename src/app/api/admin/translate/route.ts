import { auditRequest } from "@/lib/admin-activity";
import { authenticated, sameOrigin } from "@/lib/careers-auth";

export const dynamic = "force-dynamic";

/**
 * Intelligent domain normalization for Overwatch Mozambique recruitment terms.
 */
function normalizePortugueseRecruitment(text: string): string {
  return text
    .replace(/Operador(?:a)? de CFTV/gi, "Operadora de CCO")
    .replace(/operador(?:a)? de cftv/gi, "operadora de CCO")
    .replace(/posição de CFTV/gi, "vaga de Operadora de CCO")
    .replace(/sua inscrição/gi, "sua candidatura")
    .replace(/Obrigado por sua inscrição/gi, "Agradecemos a sua candidatura")
    .replace(/Obrigado pela sua candidatura/gi, "Agradecemos a sua candidatura")
    .replace(/Equipe de Recrutamento/gi, "Equipa de Recrutamento")
    .replace(/equipe de recrutamento/gi, "equipa de recrutamento")
    .replace(/selecionad[ao]/gi, "seleccionada")
    .replace(/Overwatch Mocambique/gi, "Overwatch Moçambique")
    .replace(/Overwatch Mozambique/gi, "Overwatch Moçambique");
}

function normalizeEnglishRecruitment(text: string): string {
  return text
    .replace(/CCO Operator/gi, "CCTV Operator")
    .replace(/Recruitment Team/gi, "Recruitment Team")
    .replace(/Overwatch Moçambique/gi, "Overwatch Mozambique");
}

async function translateViaGoogleGtx(
  text: string,
  from: "auto" | "en" | "pt",
  to: "en" | "pt",
): Promise<{ translated: string; detectedLang?: string } | null> {
  try {
    const sl = from === "auto" ? "auto" : from;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const joined = data[0]
      .map((seg: unknown) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""))
      .join("");
    const detectedLang = typeof data[2] === "string" ? data[2] : undefined;
    return joined ? { translated: joined, detectedLang } : null;
  } catch {
    return null;
  }
}

async function translateChunk(
  text: string,
  from: "auto" | "en" | "pt",
  to: "en" | "pt",
): Promise<{ translated: string; detectedLang?: string }> {
  if (!text || !text.trim()) return { translated: text };

  // Protect dynamic placeholders
  const NAME_TAG = "___NAME_RECRUIT_TAG___";
  const LINK_TAG = "___LINK_RECRUIT_TAG___";

  const prepped = text
    .replace(/\{\{\s*name\s*\}\}/gi, NAME_TAG)
    .replace(/\{\{\s*booking_link\s*\}\}/gi, LINK_TAG);

  const finalize = (raw: string) => {
    let out = raw
      .replace(new RegExp(NAME_TAG, "g"), "{{name}}")
      .replace(new RegExp(LINK_TAG, "g"), "{{booking_link}}");
    if (to === "pt") {
      out = normalizePortugueseRecruitment(out);
    } else {
      out = normalizeEnglishRecruitment(out);
    }
    return out;
  };

  // 1. Primary fast & multi-sentence engine with automatic language detection
  const gtx = await translateViaGoogleGtx(prepped, from, to);
  if (gtx && gtx.translated) {
    return { translated: finalize(gtx.translated), detectedLang: gtx.detectedLang };
  }

  // 2. Fallback to MyMemory (requires explicit source language, defaults 'auto' -> 'pt' when target is 'en')
  const pairFrom = from === "auto" ? (to === "en" ? "pt" : "en") : from;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      prepped.slice(0, 480),
    )}&langpair=${pairFrom}|${to}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Translation service returned status ${res.status}`);
    }

    const data = await res.json();
    const translated: string = data?.responseData?.translatedText || prepped;

    return { translated: finalize(translated), detectedLang: pairFrom };
  } catch (err) {
    console.warn("MyMemory translation fallback triggered:", err);
    return { translated: text, detectedLang: pairFrom };
  }
}

async function handlePOST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const text: string = typeof body.text === "string" ? body.text : "";
    const subject: string = typeof body.subject === "string" ? body.subject : "";
    const from: "auto" | "en" | "pt" =
      body.from === "auto" ? "auto" : body.from === "pt" ? "pt" : "en";
    const to: "en" | "pt" = body.to === "en" ? "en" : "pt";

    if (!text.trim() && !subject.trim()) {
      return Response.json({ translated: "", translatedSubject: "" });
    }

    if (from === to) {
      return Response.json({ translated: text, translatedSubject: subject, detectedLang: from });
    }

    let detectedLang: string | undefined;
    let translatedSubject = subject;
    if (subject.trim()) {
      const subjRes = await translateChunk(subject, from, to);
      translatedSubject = subjRes.translated;
      if (subjRes.detectedLang) detectedLang = subjRes.detectedLang;
    }

    // Split paragraphs so newline formatting and spacing are preserved precisely
    const paragraphs = text.split("\n\n");
    const translatedParagraphs: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        translatedParagraphs.push(paragraph);
        continue;
      }
      const chunkRes = await translateChunk(paragraph, from, to);
      translatedParagraphs.push(chunkRes.translated);
      if (!detectedLang && chunkRes.detectedLang) detectedLang = chunkRes.detectedLang;
    }

    const result = translatedParagraphs.join("\n\n");

    return Response.json({
      success: true,
      translated: result,
      translatedSubject,
      detectedLang: detectedLang || (from === "auto" ? "pt" : from),
    });
  } catch (err) {
    console.error("Translation API error:", err);
    return Response.json(
      { error: "Failed to translate content." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return auditRequest(request, () => handlePOST(request));
}
