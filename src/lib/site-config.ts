export const siteContact = {
  email: "info@overwatchmoz.com",
  phone: "+258 84 287 0793",
  phoneHref: "+258842870793",
  whatsappNumber: "258842870793",
  website: "www.overwatchmoz.com",
  address: {
    en: "Avenida Paulo Samuel Kankhomba, No. 1498, Maputo, Mozambique",
    pt: "Avenida Paulo Samuel Kankhomba, N.º 1498, Maputo, Moçambique",
  },
} as const;

export const solutionNavigationLinks = [
  { href: "/solutions", key: "allSolutions" },
  { href: "/business", key: "business" },
  { href: "/homes", key: "homes" },
] as const;

export function getSiteAddress(locale: string) {
  return siteContact.address[locale === "pt" ? "pt" : "en"];
}
