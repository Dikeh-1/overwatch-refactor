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

export function screenCandidate(candidate: Application): CandidateScreeningResult {
  const isMale = candidate.sex === "male";
  
  // Rule 1: Cover letter required for EVERYONE (men and women)
  const coverLetterText = (candidate.coverLetter || "").trim();
  const hasCoverLetter = coverLetterText.length >= 15;

  // Rule 2: CCTV experience check for men (women can do test without previous experience)
  let hasCctvExperience = true;
  if (isMale) {
    if (candidate.experience !== "yes") {
      hasCctvExperience = false;
    } else {
      const searchSpace = `${candidate.lastProfession} ${candidate.coverLetter || ""} ${candidate.cvName}`.toLowerCase();
      hasCctvExperience = CCTV_KEYWORDS.some((kw) => searchSpace.includes(kw));
    }
  }

  const reasons: DisqualificationReason[] = [];
  if (!hasCoverLetter) {
    reasons.push("no_cover_letter");
  }
  if (isMale && !hasCctvExperience) {
    reasons.push("male_no_cctv_experience");
  }

  const disqualified = reasons.length > 0;

  let reasonDescriptionPt = "";
  let reasonDescriptionEn = "";

  if (reasons.includes("no_cover_letter") && reasons.includes("male_no_cctv_experience")) {
    reasonDescriptionPt = "Ausência de carta de apresentação e falta de comprovação de experiência prévia em sistemas CCTV/CCO.";
    reasonDescriptionEn = "Missing cover letter and lack of verified prior CCTV/CCO experience.";
  } else if (reasons.includes("no_cover_letter")) {
    reasonDescriptionPt = "Ausência de carta de apresentação (requisito eliminatório básico da candidatura).";
    reasonDescriptionEn = "Missing cover letter (mandatory application requirement).";
  } else if (reasons.includes("male_no_cctv_experience")) {
    reasonDescriptionPt = "Candidato masculino sem comprovação curricular de experiência prévia em sistemas CCTV/CCO.";
    reasonDescriptionEn = "Male candidate without verified prior CCTV/CCO experience.";
  }

  return {
    candidate,
    hasCoverLetter,
    isMale,
    hasCctvExperience,
    disqualified,
    reasons,
    reasonDescriptionPt,
    reasonDescriptionEn,
    hasBookedSlot: Boolean(candidate.testSlot),
  };
}
