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

async function translateChunk(
  text: string,
  from: "en" | "pt",
  to: "en" | "pt",
): Promise<string> {
  if (!text || !text.trim()) return text;

  // Protect dynamic placeholders
  const NAME_TAG = "___NAME_RECRUIT_TAG___";
  const LINK_TAG = "___LINK_RECRUIT_TAG___";

  const prepped = text
    .replace(/\{\{\s*name\s*\}\}/gi, NAME_TAG)
    .replace(/\{\{\s*booking_link\s*\}\}/gi, LINK_TAG);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      prepped,
    )}&langpair=${from}|${to}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Translation service returned status ${res.status}`);
    }

    const data = await res.json();
    let translated: string =
      data?.responseData?.translatedText || prepped;

    // Restore dynamic placeholders
    translated = translated
      .replace(new RegExp(NAME_TAG, "g"), "{{name}}")
      .replace(new RegExp(LINK_TAG, "g"), "{{booking_link}}");

    if (to === "pt") {
      translated = normalizePortugueseRecruitment(translated);
    } else {
      translated = normalizeEnglishRecruitment(translated);
    }

    return translated;
  } catch (err) {
    console.warn("MyMemory translation fallback triggered:", err);
    return text;
  }
}

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const text: string = typeof body.text === "string" ? body.text : "";
    const from: "en" | "pt" = body.from === "pt" ? "pt" : "en";
    const to: "en" | "pt" = body.to === "en" ? "en" : "pt";

    if (!text.trim()) {
      return Response.json({ translated: "" });
    }

    if (from === to) {
      return Response.json({ translated: text });
    }

    // Split paragraphs so newline formatting and spacing are preserved precisely
    const paragraphs = text.split("\n\n");
    const translatedParagraphs: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        translatedParagraphs.push(paragraph);
        continue;
      }
      const translated = await translateChunk(paragraph, from, to);
      translatedParagraphs.push(translated);
    }

    const result = translatedParagraphs.join("\n\n");

    return Response.json({ success: true, translated: result });
  } catch (err) {
    console.error("Translation API error:", err);
    return Response.json(
      { error: "Failed to translate content." },
      { status: 500 },
    );
  }
}
