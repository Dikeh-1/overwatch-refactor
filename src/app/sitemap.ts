import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const baseUrl = "https://www.overwatchmoz.com";

const pages = [
  "",
  "/business",
  "/homes",
  "/about",
  "/faq",
  "/contact",
  "/careers",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routing.locales.flatMap((locale) =>
    pages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "weekly" : "monthly",
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((loc) => [loc, `${baseUrl}/${loc}${page}`])
        ),
      },
    }))
  );
}
