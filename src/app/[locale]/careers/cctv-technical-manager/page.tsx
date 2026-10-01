import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowLeft,
  ArrowDown,
  CheckCircle2,
  Cpu,
  MapPin,
  ShieldCheck,
  Wrench,
  Network,
  Users,
  Camera,
  Layers,
  FileSpreadsheet,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";
import CareersForm from "@/components/shared/CareersForm";
import TechGrid from "@/components/ui/TechGrid";
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
          url: "https://www.overwatchmoz.com/careers-hero.jpg",
          width: 1200,
          height: 630,
          alt: "Overwatch CCTV Installation & Technical Manager",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://www.overwatchmoz.com/careers-hero.jpg"],
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

  const responsibilities = [
    {
      icon: MapPin,
      title: t(
        "Technical Site Surveys & Assessments",
        "Levantamentos Técnicos e Vistorias no Terreno"
      ),
      desc: t(
        "Conduct detailed technical site surveys, evaluate existing infrastructure, and identify critical vulnerabilities.",
        "Conduzir levantamentos técnicos detalhados nos locais dos clientes e avaliar a infraestrutura existente."
      ),
    },
    {
      icon: Camera,
      title: t(
        "Blind Spot Elimination & Camera Positioning",
        "Identificação de Ângulos Mortos e Posicionamento de Câmaras"
      ),
      desc: t(
        "Analyze facility layouts to eliminate coverage gaps and optimize camera angles for intelligent threat detection.",
        "Analisar plantas e layouts para eliminar pontos cegos e optimizar ângulos para deteção inteligente de ameaças."
      ),
    },
    {
      icon: FileSpreadsheet,
      title: t(
        "Technical Scopes of Work & BoQs",
        "Cadernos de Encargos Técnicos e Listas de Material (BoQs)"
      ),
      desc: t(
        "Prepare comprehensive technical scopes of work, Bills of Quantities (BoQs), and equipment specifications.",
        "Elaborar cadernos de encargos técnicos completos, especificações de equipamentos e orçamentos de material (BoQs)."
      ),
    },
    {
      icon: Users,
      title: t(
        "Supervision of Technicians & Subcontractors",
        "Supervisão de Equipas Técnicas e Subempreiteiros"
      ),
      desc: t(
        "Lead, mentor, and supervise on-site CCTV installation teams, ensuring flawless execution and safety compliance.",
        "Coordenar e fiscalizar equipas de técnicos no terreno e subempreiteiros, garantindo rigor de execução e segurança."
      ),
    },
    {
      icon: Network,
      title: t(
        "IP Cameras, NVR/DVR & Network Configuration",
        "Configuração de Câmaras IP, NVRs/DVRs e Redes"
      ),
      desc: t(
        "Configure IP addressing, subnets, routers, switches, port forwarding, and secure remote access protocols.",
        "Configurar endereçamento IP, sub-redes, switches, routers, regras de encaminhamento e acessos remotos seguros."
      ),
    },
    {
      icon: Zap,
      title: t(
        "Image Quality & System Performance Testing",
        "Testes de Qualidade de Imagem e Desempenho do Sistema"
      ),
      desc: t(
        "Rigorous commissioning of night vision, frame rates, bandwidth optimization, and recording retention cycles.",
        "Comissionamento rigoroso de visão noturna, taxas de fotogramas, otimização de largura de banda e gravação."
      ),
    },
    {
      icon: ShieldCheck,
      title: t(
        "Overwatch Remote Monitoring Platform Integration",
        "Integração com a Plataforma de Monitorização Overwatch"
      ),
      desc: t(
        "Ensure seamless live video streams and automated alarm telemetry into the Overwatch Central Control Operations (CCO).",
        "Garantir transmissão fluida de vídeo e telemetria de alarmes para a Central de Controlo e Operações (CCO) da Overwatch."
      ),
    },
    {
      icon: Wrench,
      title: t(
        "Preventive & Corrective Maintenance",
        "Gestão de Manutenção Preventiva e Corretiva"
      ),
      desc: t(
        "Establish inspection schedules and lead rapid corrective maintenance interventions to maintain maximum uptime.",
        "Estabelecer planos regulares de inspeção e liderar intervenções corretivas rápidas para garantir disponibilidade máxima."
      ),
    },
    {
      icon: Cpu,
      title: t(
        "Troubleshooting & Fault Diagnostics",
        "Diagnóstico e Resolução Avançada de Avarias"
      ),
      desc: t(
        "Systematic troubleshooting of camera dropouts, power interruptions, network bottlenecks, and hardware faults.",
        "Diagnóstico metódico e resolução rápida de falhas de sinal, quebras de conectividade de rede e avarias elétricas."
      ),
    },
    {
      icon: Layers,
      title: t(
        "Technical Documentation & Camera Layouts",
        "Documentação Técnica, Plantas e Registos de Equipamento",
      ),
      desc: t(
        "Maintain clean as-built schematics, IP registers, credentials logs, and asset serial tracking.",
        "Manter esquemas atualizados 'as-built', mapas de endereçamento IP, inventário de números de série e registos técnicos."
      ),
    },
    {
      icon: Sparkles,
      title: t(
        "Tools, Spare Parts & Technical Inventory",
        "Gestão de Ferramental, Stock Técnico e Sobressalentes"
      ),
      desc: t(
        "Manage technical equipment, testing tools, spare modules, and consumables to prevent operational delays.",
        "Controlar ferramentas especializadas de teste, equipamentos de reserva e materiais consumíveis de instalação."
      ),
    },
    {
      icon: CheckCircle2,
      title: t(
        "Quality Standards Compliance",
        "Garantia de Qualidade e Normas Técnicas Overwatch"
      ),
      desc: t(
        "Enforce rigorous cabling standards, aesthetic conduit runs, grounding, and tamper-resistant camera mounts.",
        "Assegurar padrões rigorosos de acabamento, fixação antivandalismo, passagem de calhas e proteção contra intempéries."
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD Schema for Job Postings */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── DEDICATED HERO SECTION ─────────────────────────────────── */}
      <section className="dark relative isolate overflow-hidden bg-[#090d16] pb-16 pt-24 text-white sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-32">
        <TechGrid className="absolute inset-0 opacity-30 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(2,132,199,0.06),transparent_40%),linear-gradient(to_bottom,transparent_40%,rgba(9,13,22,0.98))] pointer-events-none z-0" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
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

      {/* ─── 3 CORE PILLARS ──────────────────────────────────────────── */}
      <section className="border-b border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground mb-4 border border-border">
                <Camera size={22} />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t("Site Surveys & Engineering", "Levantamentos & Engenharia")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {t(
                  "Technical on-site evaluations, identifying coverage blind spots, calculating optical focal lengths, and preparing professional BoQ scopes.",
                  "Avaliação técnica no terreno, identificação precisa de ângulos mortos, cálculo de distâncias focais e elaboração de listas de material (BoQs)."
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground mb-4 border border-border">
                <Network size={22} />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t("Systems & IP Networking", "Sistemas & Redes IP")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {t(
                  "Deep hands-on configuration of Hikvision, Dahua, NVRs/DVRs, managed switches, VLANs, and streaming telemetry to our Central Control Operations.",
                  "Configuração prática avançada de plataformas Hikvision, Dahua, NVRs, switches geríveis, VLANs e integração com a Central de Controlo."
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground mb-4 border border-border">
                <Users size={22} />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {t("Leadership & Field Operations", "Liderança & Operações de Campo")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {t(
                  "Supervising teams of installation technicians, managing technical spares, maintaining quality standards, and rapid fault diagnosis.",
                  "Supervisão direta de técnicos e subempreiteiros em obra, controlo de ferramentas e peças, e diagnóstico expedito de incidentes técnicos."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DETAILED RESPONSIBILITIES ───────────────────────────────── */}
      <section id="responsibilities" className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              {t("SCOPE OF WORK", "ÂMBITO DE ACTUAÇÃO")}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t("Key Responsibilities", "Principais Responsabilidades")}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {t(
                "This role bridges practical on-site installation leadership with enterprise control centre monitoring standards.",
                "Esta função articula a liderança prática de instalação em campo com os padrões operacionais da nossa central de monitorização remota."
              )}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {responsibilities.map((r, idx) => {
              const Icon = r.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-xs"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-foreground border border-border">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {r.title}
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── EVALUATION CRITERIA & REQUIREMENTS ──────────────────────── */}
      <section id="requirements" className="border-y border-border bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              {t("CANDIDATE QUALIFICATIONS", "QUALIFICAÇÕES & REQUISITOS")}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t("Screening & Requirements Criteria", "Critérios de Triagem e Perfil")}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {t(
                "Our automated recruitment engine reviews applications against mandatory technical fundamentals and valued preferred capabilities.",
                "O nosso sistema de recrutamento automático avalia as candidaturas com base em critérios mandatórios essenciais e competências preferenciais valorizadas."
              )}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Mandatory Criteria */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {t("Mandatory Requirements", "Requisitos Obrigatórios")}
                </span>
                <span className="text-xs text-muted">
                  {t("(Must be met to advance)", "(Indispensáveis para qualificação)")}
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
                    "Basic networking knowledge (IP addressing, subnets, routers, and Ethernet switches)",
                    "Conhecimentos sólidos de redes (endereçamento IP, sub-redes, routers e switches Ethernet)"
                  ),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs leading-relaxed text-foreground/90">
                    <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Preferred / Advantage Criteria */}
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.03] p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  {t("Preferred Competencies", "Competências Preferenciais")}
                </span>
                <span className="text-xs text-muted">
                  {t("(Highly Valued)", "(Altamente Valorizadas)")}
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
