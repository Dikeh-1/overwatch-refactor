import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import CareersForm from "@/components/shared/CareersForm";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.careers" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/careers`,
      languages: { en: "/en/careers", pt: "/pt/careers" },
    },
  };
}
export default async function CareersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CareersForm />;
}
