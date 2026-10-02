import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  ArrowDown,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";
import CareersForm from "@/components/shared/CareersForm";
import TechGrid from "@/components/ui/TechGrid";
import LazyVideo from "@/components/ui/LazyVideo";
import { IMAGES } from "@/lib/constants";
import InteractiveResponsibilityStack from "@/components/careers/InteractiveResponsibilityStack";
import { darkEyebrowClassName } from "@/components/ui/eyebrow";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isPt = locale === "pt";

  const title = isPt
    ? "Vaga: Gestor Técnico e Instalação de CCTV | Recrutamento OverWatch Moçambique"
    : "Hiring: CCTV Installation & Technical Manager | OverWatch Careers Mozambique";

  const description = isPt
    ? "A Overwatch está a recrutar um Gestor Técnico e Instalação de CCTV em Maputo para liderar levantamentos técnicos, configuração IP/NVR, supervisão de equipas e integração de monitorização remota."
    : "Overwatch is looking for an experienced CCTV Installation & Technical Manager in Maputo to lead technical surveys, IP/NVR configuration, team supervision, and remote monitoring integration.";

  const canonicalUrl = `https://www.overwatchmoz.com/${locale}/careers/cctv-technical-manager`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: "https://www.overwatchmoz.com/en/careers/cctv-technical-manager",
        pt: "https://www.overwatchmoz.com/pt/careers/cctv-technical-manager",
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Overwatch Mozambique",
      locale: isPt ? "pt_MZ" : "en_US",
      type: "website",
      images: [
        {
          url: "https://www.overwatchmoz.com/cctv-hiring-linkedin.jpg",
          width: 1080,
          height: 1080,
          alt: "Overwatch CCTV Installation & Technical Manager Hiring",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://www.overwatchmoz.com/cctv-hiring-linkedin.jpg"],
    },
  };
}

export default async function CctvTechnicalManagerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isPt = locale === "pt";

  const t = (en: string, pt: string) => (isPt ? pt : en);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: isPt
      ? "Gestor Técnico e Instalação de CCTV"
      : "CCTV Installation & Technical Manager",
    description: isPt
      ? "Liderar a entrega técnica de instalação, manutenção e monitorização remota de CCTV da Overwatch em Maputo, Moçambique."
      : "Lead technical delivery of CCTV installation, maintenance and remote monitoring infrastructure for Overwatch in Maputo, Mozambique.",
    identifier: {
      "@type": "PropertyValue",
      name: "Overwatch Mozambique",
      value: "OWT-CCTV-TECH-MGR-2026",
    },
    datePosted: "2026-10-01",
    validThrough: "2026-12-31",
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: "Overwatch Moçambique, Lda.",
      sameAs: "https://www.overwatchmoz.com",
      logo: "https://www.overwatchmoz.com/logo-white.png",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Avenida Paulo Samuel Kankhomba, No. 1948",
        addressLocality: "Maputo",
        addressCountry: "MZ",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "MZN",
      value: {
        "@type": "QuantitativeValue",
        unitText: "MONTH",
      },
    },
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD Schema for Job Postings */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── DEDICATED FULL-VIEWPORT HERO SECTION WITH VIDEO BACKGROUND ─ */}
      <section className="dark relative isolate overflow-hidden bg-[#090d16] text-white min-h-screen flex flex-col justify-center pt-28 pb-20 sm:pt-32 sm:pb-24 lg:pt-36 lg:pb-28">
        {/* Authentic Security Surveillance Background Video */}
        <div className="absolute inset-0 z-0 opacity-35 pointer-events-none">
          <LazyVideo
            className="h-full w-full object-cover mix-blend-luminosity"
            poster={IMAGES.videoPoster}
            rootMargin="700px"
            src={IMAGES.videoSrc}
          />
        </div>
        <TechGrid className="absolute inset-0 opacity-35 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(2,132,199,0.06),transparent_40%),linear-gradient(to_bottom,transparent_40%,rgba(9,13,22,0.98))] pointer-events-none z-0" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          {/* Back link */}
          <div className="mb-6">
            <Link
              href={`/${locale}/careers`}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              {t("All Career Opportunities", "Todas as Vagas de Carreira")}
            </Link>
          </div>

          <div className="max-w-4xl">
            {/* Top badges */}
            <div className="flex flex-wrap items-center gap-2.5 mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t("Active Opening • Immediate Start", "Vaga Aberta • Admissão Imediata")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                <MapPin size={12} className="text-white/60" />
                Maputo, Moçambique
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                <Clock size={12} className="text-white/60" />
                {t("Full-Time • On-Site & Field", "Tempo Inteiro • Campo & Presencial")}
              </span>
            </div>

            <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {t(
                "CCTV Installation & Technical Manager",
                "Gestor Técnico e Instalação de CCTV"
              )}
            </h1>

            <p className="mt-6 max-w-3xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg lg:text-xl">
              {t(
                "Overwatch is looking for an experienced CCTV Installation & Technical Manager to lead the technical delivery of our CCTV installation, maintenance and remote monitoring infrastructure in Maputo. This is a hands-on technical and supervisory role responsible for ensuring that client CCTV systems are properly assessed, designed, installed, configured, commissioned and maintained to support reliable 24/7 monitoring from our Control Centre.",
                "A Overwatch procura um Gestor Técnico e Instalação de CCTV experiente para liderar a entrega técnica da nossa infraestrutura de instalação, manutenção e monitorização remota em Maputo. Uma função prática e de supervisão, responsável por assegurar que os sistemas de CCTV sejam perfeitamente dimensionados, instalados, configurados e mantidos para garantir vigilância remota fiável a partir da nossa Central de Operações."
              )}
            </p>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#application-form"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-[#090d16] shadow-xl shadow-black/30 transition-all hover:-translate-y-0.5 hover:bg-white/90"
              >
                {t("Apply for this Position", "Candidatar-se a esta Vaga")}
                <ArrowDown size={16} />
              </a>
              <a
                href="#responsibilities"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                {t("View Responsibilities & Criteria", "Ver Responsabilidades e Requisitos")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE FAN-OUT CARD STACK ─────────────────────────── */}
      <section id="responsibilities" className="relative py-8 sm:py-12 lg:py-16 overflow-hidden bg-background">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1780px] mx-auto px-2 sm:px-4 lg:px-6">
          <InteractiveResponsibilityStack locale={locale} />
        </div>
      </section>


      {/* ─── CANDIDATE PROFILE & QUALIFICATIONS ─────────────────────── */}
      <section id="requirements" className="border-b border-border bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              {t("CANDIDATE QUALIFICATIONS", "QUALIFICAÇÕES & REQUISITOS")}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t("Candidate Profile & Key Qualifications", "Perfil do Candidato & Qualificações Desejadas")}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {t(
                "We are seeking dedicated professionals with practical technical foundations and a passion for excellence in electronic security systems delivery.",
                "Procuramos profissionais dedicados com bases técnicas sólidas e paixão pela excelência na entrega de sistemas de segurança eletrónica."
              )}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Core Qualifications */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-foreground/10 text-foreground border border-border">
                  {t("Core Qualifications", "Qualificações Essenciais")}
                </span>
                <span className="text-xs text-muted">
                  {t("(Fundamental Expertise)", "(Competências Fundamentais)")}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-4">
                {t(
                  "Essential Technical Foundations",
                  "Fundamentos Técnicos Indispensáveis"
                )}
              </h3>
              <ul className="space-y-3">
                {[
                  t(
                    "Practical, hands-on CCTV installation and field maintenance experience",
                    "Experiência prática comprovada em instalação e manutenção de CCTV no terreno"
                  ),
                  t(
                    "Solid working experience with IP CCTV systems and digital camera protocols",
                    "Experiência sólida com sistemas de CCTV IP e protocolos de câmaras digitais"
                  ),
                  t(
                    "NVR / DVR storage sizing, RAID recording schedules, and firmware configuration",
                    "Configuração e dimensionamento de NVRs / DVRs, armazenamento e esquemas de gravação"
                  ),
                  t(
                    "Solid networking knowledge (IP addressing, subnets, routers, and Ethernet switches)",
                    "Conhecimentos sólidos de redes (endereçamento IP, sub-redes, routers e switches Ethernet)"
                  ),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs leading-relaxed text-foreground/90">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Valued Experience */}
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.03] p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  {t("Valued Experience", "Experiência Valorizada")}
                </span>
                <span className="text-xs text-muted">
                  {t("(Advantageous Capabilities)", "(Competências Vantajosas)")}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-4">
                {t("Advanced Platforms & Leadership", "Plataformas Avançadas & Liderança")}
              </h3>
              <ul className="space-y-3">
                {[
                  t(
                    "Hikvision ecosystem experience (iVMS, Hik-Connect, ColorVu, AcuSense)",
                    "Experiência sólida no ecossistema Hikvision (iVMS, Hik-Connect, AcuSense)"
                  ),
                  t(
                    "Dahua platform experience (SmartPSS, DSS Pro, TiOC, perimeter protection)",
                    "Experiência na plataforma Dahua (SmartPSS, DSS Pro, TiOC, analítica perimetral)"
                  ),
                  t(
                    "Prior technical leadership or supervision of field installation teams",
                    "Experiência anterior de chefia ou supervisão técnica de equipas de instalação"
                  ),
                  t(
                    "Valid driving licence (essential for site visits and emergency response)",
                    "Carta de condução válida (essencial para vistorias no terreno e emergências)"
                  ),
                  t(
                    "AI video analytics experience (tripwire line crossing, human/vehicle classification)",
                    "Analítica de vídeo e IA (cruzamento de linhas, classificação de pessoas e viaturas)"
                  ),
                  t(
                    "Experience integrating CCTV with 24/7 remote monitoring control rooms",
                    "Experiência na integração de CCTV com centrais de monitorização remota 24/7"
                  ),
                  t(
                    "Preparation of technical scopes of work and Bills of Quantities (BoQs)",
                    "Elaboração de cadernos de encargos técnicos e listas de quantidades (BoQs)"
                  ),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs leading-relaxed text-foreground/90">
                    <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Location & Ownership Profile Box */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {t("Candidate Profile & Work Location", "Perfil do Candidato & Localização")}
              </h4>
              <p className="mt-1 text-xs text-muted max-w-2xl leading-relaxed">
                {t(
                  "The successful candidate should be practical, organised, technically strong, and able to take full ownership of installations from initial site survey through to final commissioning and ongoing maintenance in Maputo, Mozambique.",
                  "O candidato ideal deve ser prático, organizado, tecnicamente autónomo e capaz de assumir total responsabilidade pelas instalações, desde o levantamento inicial no terreno até ao comissionamento e manutenção contínua em Maputo, Moçambique."
                )}
              </p>
            </div>
            <a
              href="#application-form"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-xs font-bold text-background transition-all hover:bg-foreground/90"
            >
              {t("Start Application", "Iniciar Candidatura")}
              <ArrowDown size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ─── EMBEDDED STRUCTURED APPLICATION FORM ───────────────────── */}
      <section id="application-form" className="relative scroll-mt-20 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-4">
          <div className="max-w-2xl">
            <span className={darkEyebrowClassName}>
              <ShieldCheck size={15} className="shrink-0 text-foreground" />
              {t("FORMULÁRIO OFICIAL", "OFFICIAL APPLICATION")}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {t(
                "Submit Your Technical Application",
                "Submeta a sua Candidatura Técnica"
              )}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {t(
                "Complete the structured technical screening questionnaire below. Candidates meeting mandatory criteria are reviewed by management for the next selection phase.",
                "Preencha o questionário de triagem técnica abaixo. Os candidatos que cumprem os requisitos mandatórios avançam para a fase de revisão de gestão e entrevistas."
              )}
            </p>
          </div>
        </div>

        {/* Embedded Careers Form pre-selected to CCTV Technical Manager */}
        <CareersForm
          initialLocale={locale}
          defaultRoleId="cctv_technical_manager"
          hideHero={true}
        />
      </section>
    </div>
  );
}
