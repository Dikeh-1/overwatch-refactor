import { type Application } from "./careers";

export type DisqualificationReason = 
  | "no_cover_letter"
  | "male_no_cctv_experience";

export interface CandidateScreeningResult {
  candidate: Application;
  hasCoverLetter: boolean;
  isMale: boolean;
  hasCctvExperience: boolean;
  disqualified: boolean;
  reasons: DisqualificationReason[];
  reasonDescriptionPt: string;
  reasonDescriptionEn: string;
  hasBookedSlot: boolean;
}

export const CCTV_KEYWORDS = [
  "cctv",
  "cco",
  "circuito fechado",
  "videovigilancia",
  "videovigilância",
  "video vigilância",
  "camera",
  "câmera",
  "câmaras",
  "camaras",
  "central de controlo",
  "central de controle",
  "sala de controlo",
  "sala de controle",
  "segurança electrónica",
  "segurança eletronica",
  "monitoramento",
  "monitoria",
  "vigilância",
  "surveillance",
  "control room",
  "camera operator",
  "operador de cco",
  "operadora de cco",
  "operador cctv",
  "operadora cctv",
  "operador de cctv",
  "operador de câmara",
  "operador de camara",
];

export const NEGATIVE_CCTV_KEYWORDS = [
  "gostaria de aprender",
  "quero aprender",
  "pretendo aprender",
  "desejo aprender",
  "disposto a aprender",
  "disposta a aprender",
  "vontade de aprender",
  "interessado em aprender",
  "sem experiência",
  "sem experiencia",
  "não tenho experiência",
  "nao tenho experiencia",
  "não possuo experiência",
  "nao possuo experiencia",
  "nunca trabalhei",
  "sem conhecimento",
  "pouco conhecimento",
  "iniciante",
  "aprendiz",
  "aprender sobre cctv",
  "aprender cctv",
  "aprender cco",
];

// Specific male candidates explicitly verified by leadership as lacking prior CCTV experience
export const KNOWN_INEXPERIENCED_MALE_EMAILS = [
  "h.muapse@gmail.com",
  "catinealbertoelias@gmail.com",
];

export function screenCandidate(candidate: Application): CandidateScreeningResult {
  const isMale = candidate.sex === "male";
  const coverLetterText = (candidate.coverLetter || "").trim();
  const hasCoverLetter = coverLetterText.length >= 15 || Boolean(candidate.cvName);

  // Female candidates: Filipa's instruction is explicit:
  // "dont forget to leave the inexperienced women"
  // Women are 100% eligible for test slots regardless of prior experience.
  if (!isMale) {
    return {
      candidate,
      hasCoverLetter,
      isMale: false,
      hasCctvExperience: true,
      disqualified: false,
      reasons: [],
      reasonDescriptionPt: "",
      reasonDescriptionEn: "",
      hasBookedSlot: Boolean(candidate.testSlot),
    };
  }

  // Male candidates: MUST have verified prior CCTV/CCO experience.
  let hasCctvExperience = true;
  const candidateEmail = (candidate.email || "").toLowerCase().trim();

  if (KNOWN_INEXPERIENCED_MALE_EMAILS.includes(candidateEmail)) {
    hasCctvExperience = false;
  } else if (candidate.experience !== "yes") {
    hasCctvExperience = false;
  } else {
    const searchSpace = `${candidate.lastProfession || ""} ${candidate.coverLetter || ""} ${candidate.cvName || ""}`.toLowerCase();
    
    // Check if candidate explicitly expresses inexperience or desire to learn
    const hasNegativeKeywords = NEGATIVE_CCTV_KEYWORDS.some((kw) => searchSpace.includes(kw));
    const hasPositiveKeywords = CCTV_KEYWORDS.some((kw) => searchSpace.includes(kw));

    if (hasNegativeKeywords && !searchSpace.includes("operador de cctv") && !searchSpace.includes("operador de cco")) {
      hasCctvExperience = false;
    } else if (!hasPositiveKeywords) {
      hasCctvExperience = false;
    }
  }

  const reasons: DisqualificationReason[] = [];
  if (!hasCctvExperience) {
    reasons.push("male_no_cctv_experience");
  }

  const disqualified = reasons.length > 0;

  let reasonDescriptionPt = "";
  let reasonDescriptionEn = "";

  if (reasons.includes("male_no_cctv_experience")) {
    reasonDescriptionPt = "Candidato masculino sem comprovação curricular de experiência prévia em sistemas CCTV/CCO.";
    reasonDescriptionEn = "Male candidate without verified prior CCTV/CCO experience.";
  }

  return {
    candidate,
    hasCoverLetter,
    isMale: true,
    hasCctvExperience,
    disqualified,
    reasons,
    reasonDescriptionPt,
    reasonDescriptionEn,
    hasBookedSlot: Boolean(candidate.testSlot),
  };
}
