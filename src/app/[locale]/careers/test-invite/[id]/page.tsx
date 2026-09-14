import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import CandidateBookingClient from "./CandidateBookingClient";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Confirmação de Teste de Selecção | Overwatch Moçambique"
      : "Selection Test Confirmation | Overwatch Mozambique",
    description: isPt
      ? "Confirme a sua presença e escolha o seu dia para o teste presencial de selecção para a vaga de Operadora de CCO da Overwatch."
      : "Confirm your attendance and choose your date for the in-person selection test for Overwatch.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function TestInvitePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <CandidateBookingClient id={id} locale={locale} />;
}
