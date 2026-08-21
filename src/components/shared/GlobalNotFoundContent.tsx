"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const content = {
  en: {
    kicker: "Security route unavailable",
    title: "404: Signal Lost",
    description:
      "This page is outside the monitored perimeter. Return to the homepage or contact Overwatch so we can get you back on track.",
    back: "Back to Home",
    contact: "Contact Team",
  },
  pt: {
    kicker: "Rota de segurança indisponível",
    title: "404: Sinal Perdido",
    description:
      "Esta página está fora do perímetro monitorizado. Volte à página inicial ou contacte a Overwatch para regressar ao caminho certo.",
    back: "Voltar ao Início",
    contact: "Contactar a Equipa",
  },
} as const;

export default function GlobalNotFoundContent() {
  const pathname = usePathname();
  const locale = pathname === "/pt" || pathname.startsWith("/pt/") ? "pt" : "en";
  const copy = content[locale];

  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-MZ" : "en";
  }, [locale]);

  return (
    <main className="not-found-page">
      <section className="not-found-shell">
        <div className="not-found-copy">
          <Image
            src="/logo.png"
            alt="Overwatch"
            width={230}
            height={34}
            className="not-found-logo"
            priority
          />
          <p className="not-found-kicker">{copy.kicker}</p>
          <h1>{copy.title}</h1>
          <p className="not-found-text">{copy.description}</p>
          <div className="not-found-actions">
            <Link href={`/${locale}`}>{copy.back}</Link>
            <Link href={`/${locale}/contact`} className="secondary">
              {copy.contact}
            </Link>
          </div>
        </div>

        <div className="not-found-radar" aria-hidden="true">
          <span className="code">404</span>
          <span className="ring one" />
          <span className="ring two" />
          <span className="ring three" />
          <span className="sweep" />
          <span className="dot a" />
          <span className="dot b" />
          <span className="dot c" />
        </div>
      </section>
    </main>
  );
}
