/**
 * Utility functions for classifying candidate geographical locations.
 * Three-tier system:
 *   1. maputo_region   — Maputo, Matola, Marracuene, Mavalane (Maputo metro area)
 *   2. mozambique_other — Other Mozambican cities (Beira, Nampula, Sofala, etc.)
 *   3. outside_mozambique — Candidates based outside Mozambique entirely
 */

export type LocationGroup = "maputo_region" | "mozambique_other" | "outside_mozambique";
export type LocationFilterValue = "all" | "maputo_region" | "mozambique_other" | "outside_mozambique";

export interface LocationClassification {
  isMozambique: boolean;
  isMaputoRegion: boolean;
  group: LocationGroup;
  locationLabel: string;
  reason: string;
}

/** Maputo metropolitan area — the preferred zone per leadership directive */
const MAPUTO_REGION_KEYWORDS = [
  "maputo", "matola", "marracuene", "mavalane", "zimpeto", "machava",
  "cidade de maputo", "maputo city",
];

/** Other valid Mozambican cities/provinces (not Maputo metro) */
const OTHER_MOZAMBIQUE_KEYWORDS = [
  "beira", "sofala", "nampula", "inhambane", "quelimane", "tete",
  "chimoio", "manica", "gaza", "xai-xai", "zambezia", "niassa",
  "lichinga", "pemba", "cabo delgado", "mocambique", "moçambique",
  "mozambique",
];

const FOREIGN_KEYWORDS = [
  "pretoria", "johannesburg", "south africa", "durban", "cape town",
  "india", "chennai", "mumbai", "cuddalore", "paramakudi", "kalicherla",
  "andhra pradesh", "bharuch",
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
  "egypt", "cairo",
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
        isMaputoRegion: false,
        group: "outside_mozambique",
        locationLabel: locRaw || "Fora de Moçambique",
        reason: `Localização internacional: ${fk}`,
      };
    }
  }

  // 2. Maputo metropolitan area (checked before generic Mozambique)
  for (const mk of MAPUTO_REGION_KEYWORDS) {
    if (loc.includes(mk)) {
      return {
        isMozambique: true,
        isMaputoRegion: true,
        group: "maputo_region",
        locationLabel: locRaw || "Maputo / Matola / Marracuene",
        reason: `Região de Maputo: ${mk}`,
      };
    }
  }

  // 3. Other Mozambican provinces / cities
  for (const ok of OTHER_MOZAMBIQUE_KEYWORDS) {
    if (loc.includes(ok)) {
      return {
        isMozambique: true,
        isMaputoRegion: false,
        group: "mozambique_other",
        locationLabel: locRaw || "Outro — Moçambique",
        reason: `Moçambique (fora da região de Maputo): ${ok}`,
      };
    }
  }

  // 4. Mozambique phone pattern check (+258 or local 8x xxxxxxx)
  const isMozPhone = /^(\+?258)?8[2-7]\d{7}$/.test(phone);
  if (isMozPhone) {
    return {
      isMozambique: true,
      isMaputoRegion: true, // Assume Maputo region when only phone confirms Mozambique
      group: "maputo_region",
      locationLabel: locRaw || "Moçambique (localização não especificada)",
      reason: "Contacto com prefixo de Moçambique (+258) — assumido região de Maputo",
    };
  }

  // 5. Default: unrecognised = outside Mozambique
  return {
    isMozambique: false,
    isMaputoRegion: false,
    group: "outside_mozambique",
    locationLabel: locRaw || "Fora de Moçambique",
    reason: "Localização não identificada como nacional",
  };
}
