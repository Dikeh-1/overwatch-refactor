/**
 * Utility functions for classifying candidate geographical locations.
 * Distinguishes between candidates currently based in Mozambique vs Outside Mozambique.
 */

export type LocationGroup = "mozambique" | "outside_mozambique";
export type LocationFilterValue = "all" | "mozambique" | "outside_mozambique";

export interface LocationClassification {
  isMozambique: boolean;
  group: LocationGroup;
  locationLabel: string;
  reason: string;
}

const MOZ_KEYWORDS = [
  "maputo", "matola", "marracuene", "beira", "sofala", "nampula", 
  "inhambane", "quelimane", "tete", "chimoio", "manica", "gaza", 
  "xai-xai", "zambezia", "niassa", "lichinga", "pemba", "cabo delgado", 
  "mocambique", "moçambique", "mozambique", "mavalane", "zimpeto", "machava"
];

const FOREIGN_KEYWORDS = [
  "pretoria", "johannesburg", "south africa", "durban", "cape town",
  "india", "chennai", "mumbai", "cuddalore", "paramakudi", "kalicherla", "andhra pradesh", "bharuch",
  "accra", "ghana",
  "abu dhabi", "abudhabi", "dubai", "uae", "sharjah", "united arab emirates",
  "khobar", "riyadh", "saudi", "jeddah", "dammam",
  "lagos", "nigeria", "abuja",
  "angola", "luanda",
  "rwanda", "kigali",
  "lahore", "pakistan", "karachi", "islamabad",
  "doha", "qatar",
  "united kingdom", "uk", "london",
  "muscat", "oman",
  "mateur", "tunisia",
  "egypt", "cairo"
];

export function classifyCandidateLocation(candidate: {
  currentLocation?: string;
  whatsapp?: string;
  technicalData?: { currentLocation?: string };
}): LocationClassification {
  const locRaw = (
    candidate.currentLocation ||
    (candidate.technicalData && candidate.technicalData.currentLocation) ||
    ""
  ).trim();
  const loc = locRaw.toLowerCase();
  const phone = (candidate.whatsapp || "").replace(/[\s\-\(\)]/g, "");

  // 1. Explicit foreign keywords take precedence
  for (const fk of FOREIGN_KEYWORDS) {
    if (loc.includes(fk)) {
      return {
        isMozambique: false,
        group: "outside_mozambique",
        locationLabel: locRaw || "Fora de Moçambique",
        reason: `Localização internacional: ${fk}`,
      };
    }
  }

  // 2. Explicit Mozambican cities/regions
  for (const mk of MOZ_KEYWORDS) {
    if (loc.includes(mk)) {
      return {
        isMozambique: true,
        group: "mozambique",
        locationLabel: locRaw || "Moçambique",
        reason: `Localização nacional: ${mk}`,
      };
    }
  }

  // 3. Mozambique phone pattern check (+258 or local 82-87 9-digit number)
  const isMozPhone = /^(\+?258)?8[2-7]\d{7}$/.test(phone);
  if (isMozPhone) {
    return {
      isMozambique: true,
      group: "mozambique",
      locationLabel: locRaw || "Moçambique",
      reason: "Contacto com prefixo de Moçambique (+258)",
    };
  }

  // 4. Default: If not matched, it is outside Mozambique
  return {
    isMozambique: false,
    group: "outside_mozambique",
    locationLabel: locRaw || "Fora de Moçambique",
    reason: "Localização não identificada como nacional",
  };
}
