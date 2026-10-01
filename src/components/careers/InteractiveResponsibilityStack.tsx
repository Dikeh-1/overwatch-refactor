"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Camera,
  Network,
  Radio,
  Wrench,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Layers,
  Cpu,
  Eye,
  Sliders,
  FileSpreadsheet,
  Users,
} from "lucide-react";

// Dynamically import Lottie to prevent any SSR hydration mismatch
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface InteractiveResponsibilityStackProps {
  locale: string;
}

interface ResponsibilityItem {
  title: string;
  desc: string;
}

interface DomainSection {
  id: string;
  number: string;
  title: { en: string; pt: string };
  subtitle: { en: string; pt: string };
  badge: { en: string; pt: string };
  accentColor: string;
  borderColor: string;
  bgGlow: string;
  icon: any;
  items: {
    en: ResponsibilityItem[];
    pt: ResponsibilityItem[];
  };
}

const DOMAINS: DomainSection[] = [
  {
    id: "surveys-optics",
    number: "01",
    title: {
      en: "Site Surveys & Optical Engineering",
      pt: "Levantamentos Técnicos & Engenharia Óptica",
    },
    subtitle: {
      en: "Site assessment, blind spot elimination, and BoQ scopes",
      pt: "Vistoria no terreno, eliminação de ângulos mortos e cadernos de encargos",
    },
    badge: {
      en: "Site Engineering",
      pt: "Engenharia de Campo",
    },
    accentColor: "text-cyan-400",
    borderColor: "border-cyan-500/30 hover:border-cyan-500/50",
    bgGlow: "from-cyan-500/10 via-cyan-500/5 to-transparent",
    icon: Camera,
    items: {
      en: [
        {
          title: "Technical Site Surveys & Assessments",
          desc: "Conduct thorough on-site physical evaluations, assess structural layout, cabling pathways, lighting conditions, and identify security vulnerabilities.",
        },
        {
          title: "Blind Spot Elimination & Camera Positioning",
          desc: "Calculate optical focal lengths and field-of-view angles to eliminate blind spots across perimeters, entry gates, and high-risk storage zones.",
        },
        {
          title: "Technical Scopes of Work & BoQ Preparation",
          desc: "Formulate detailed Bills of Quantities (BoQs), equipment specifications, mounting brackets, conduit runs, and power requirements for client proposals.",
        },
      ],
      pt: [
        {
          title: "Levantamentos Técnicos e Vistorias no Terreno",
          desc: "Conduzir avaliações físicas rigorosas nos locais dos clientes, analisando traçados de cabos, iluminação e pontos críticos de vulnerabilidade.",
        },
        {
          title: "Eliminação de Ângulos Mortos e Posicionamento",
          desc: "Calcular distâncias focais e ângulos de cobertura para eliminar pontos cegos em perímetros, portarias e áreas de armazenamento sensíveis.",
        },
        {
          title: "Cadernos de Encargos Técnicos e Listas de Material (BoQ)",
          desc: "Elaborar listas discriminadas de materiais (BoQ), especificações de equipamentos, tubagens e necessidades energéticas para orçamentação.",
        },
      ],
    },
  },
  {
    id: "ip-platforms",
    number: "02",
    title: {
      en: "IP CCTV Systems & NVR Architecture",
      pt: "Sistemas CCTV IP & Arquitetura NVR",
    },
    subtitle: {
      en: "Hikvision, Dahua, NVR/DVR storage, and digital protocols",
      pt: "Hikvision, Dahua, armazenamento NVR/DVR e protocolos digitais",
    },
    badge: {
      en: "Systems & Platforms",
      pt: "Sistemas & Plataformas",
    },
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/30 hover:border-blue-500/50",
    bgGlow: "from-blue-500/10 via-blue-500/5 to-transparent",
    icon: Cpu,
    items: {
      en: [
        {
          title: "IP Camera & NVR/DVR System Configuration",
          desc: "Configure multi-channel NVRs/DVRs, storage retention schedules, RAID arrays, firmware updates, and remote access across Hikvision and Dahua systems.",
        },
        {
          title: "Image Quality, Bitrate & Resolution Calibration",
          desc: "Calibrate WDR, backlight compensation, night-vision infrared cut filters, video codecs (H.265+), and motion detection sensitivity for crystal-clear feeds.",
        },
        {
          title: "Analogue & Hybrid Systems Integration",
          desc: "Manage legacy analogue/HD-TVI/CVI infrastructure and migrate facilities seamlessly into modern networked digital CCTV environments.",
        },
      ],
      pt: [
        {
          title: "Configuração de Câmaras IP e Gravadores NVR/DVR",
          desc: "Configurar NVRs/DVRs multicanal, planos de retenção em disco, esquemas RAID, atualizações de firmware e acesso remoto em plataformas Hikvision e Dahua.",
        },
        {
          title: "Calibração de Imagem, Taxa de Bits e Resolução",
          desc: "Ajustar WDR, compensação de contraluz, visão noturna IV, codecs de compressão (H.265+) e sensibilidade de deteção para imagens nítidas 24/7.",
        },
        {
          title: "Sistemas Analógicos e Infraestruturas Híbridas",
          desc: "Intervir em sistemas existentes analógicos/HD-TVI/CVI e assegurar transições fluidas para arquiteturas modernas de CCTV em rede.",
        },
      ],
    },
  },
  {
    id: "networks-feeds",
    number: "03",
    title: {
      en: "Networking & Remote Monitoring Integration",
      pt: "Redes IP & Integração com Central 24/7",
    },
    subtitle: {
      en: "Switches, VLANs, routing, and live control room telemetry",
      pt: "Switches geríveis, VLANs, roteamento e fluxos para a Central de Controlo",
    },
    badge: {
      en: "Networks & Telemetry",
      pt: "Redes & Telemetria",
    },
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-500/30 hover:border-emerald-500/50",
    bgGlow: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    icon: Network,
    items: {
      en: [
        {
          title: "Overwatch Control Centre 24/7 Integration",
          desc: "Integrate on-premise camera streams directly with Overwatch's Central Control Operations (CCO) for real-time video surveillance and rapid response.",
        },
        {
          title: "Managed Switches, IP Addressing & Routing",
          desc: "Design subnets, assign static IPs, configure managed PoE switches, VLAN network isolation, port forwarding, and secure firewall gateways.",
        },
        {
          title: "Structured Cabling, Patch Panels & Power Backup",
          desc: "Supervise Cat6 UTP/STP cable pulling, RJ45 termination, patch panel labeling, voltage calculations, and uninterrupted power supplies (UPS).",
        },
      ],
      pt: [
        {
          title: "Integração com a Central de Operações Overwatch",
          desc: "Integrar fluxos de vídeo no terreno diretamente com a Central de Controlo Overwatch (CCO) para vigilância remota contínua e despacho rápido.",
        },
        {
          title: "Switches Geríveis, Endereçamento IP e Roteamento",
          desc: "Estruturar sub-redes, IPs estáticos, gestão de portas PoE, segmentação de tráfego em VLANs e regras seguras de firewall para acesso remoto.",
        },
        {
          title: "Cablagem Estruturada, Patch Panels e Sistemas UPS",
          desc: "Supervisionar passagem de cabo Cat6, conectorização RJ45, etiquetagem em bastidores, fontes de alimentação e autonomia com no-breaks (UPS).",
        },
      ],
    },
  },
  {
    id: "maintenance-ai",
    number: "04",
    title: {
      en: "Maintenance, Diagnostics & AI Analytics",
      pt: "Manutenção, Diagnóstico de Avarias & IA",
    },
    subtitle: {
      en: "Preventive upkeep, rapid fault diagnosis, and video analytics",
      pt: "Plano preventivo, diagnóstico ágil e analítica inteligente de vídeo",
    },
    badge: {
      en: "Diagnostics & AI",
      pt: "Diagnóstico & IA",
    },
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/30 hover:border-amber-500/50",
    bgGlow: "from-amber-500/10 via-amber-500/5 to-transparent",
    icon: Wrench,
    items: {
      en: [
        {
          title: "Preventive & Corrective Maintenance Schedules",
          desc: "Establish routine inspection schedules, lens cleaning, weather seal checks, cable continuity testing, and rapid repairs to maintain 99.9% uptime.",
        },
        {
          title: "Rapid Fault Diagnosis & Connectivity Troubleshooting",
          desc: "Diagnose offline camera faults, packet loss, bandwidth bottlenecks, power drops, and ground loops swiftly with diagnostic multi-meters and testers.",
        },
        {
          title: "AI-Enabled Cameras & Video Analytics",
          desc: "Deploy and tune smart analytics including virtual tripwires, perimeter intrusion detection, and vehicle/human classification with minimal false alarms.",
        },
      ],
      pt: [
        {
          title: "Plano de Manutenção Preventiva e Corretiva",
          desc: "Estabelecer rotinas periódicas de limpeza de lentes, verificação de vedação estanque, teste de cabos e reparação imediata de anomalias operacionais.",
        },
        {
          title: "Diagnóstico Rápido de Avarias e Conectividade",
          desc: "Identificar com rapidez quebras de sinal, perda de pacotes de dados, quebras de tensão e falhas em switches usando aparelhos de medição e teste.",
        },
        {
          title: "Câmaras com IA e Analítica Inteligente de Vídeo",
          desc: "Configurar barreiras virtuais, deteção de intrusão perimetral e classificação inteligente de humanos e viaturas com redução de falsos alarmes.",
        },
      ],
    },
  },
  {
    id: "leadership-standards",
    number: "05",
    title: {
      en: "Field Team Leadership & Quality Standards",
      pt: "Liderança de Equipas & Normas de Qualidade",
    },
    subtitle: {
      en: "Supervising technicians, stock control, and Overwatch standards",
      pt: "Supervisão técnica em obra, gestão de peças e rigor de acabamentos",
    },
    badge: {
      en: "Field Management",
      pt: "Gestão Operacional",
    },
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/30 hover:border-purple-500/50",
    bgGlow: "from-purple-500/10 via-purple-500/5 to-transparent",
    icon: ShieldCheck,
    items: {
      en: [
        {
          title: "Supervising Technicians & Subcontractors",
          desc: "Lead and inspect the work of CCTV installation technicians and contracted specialists, guaranteeing adherence to safety and execution timelines.",
        },
        {
          title: "Tools, Technical Stock & Spare Equipment Control",
          desc: "Manage field toolkits, cable testers, mounting hardware, and spare camera inventory to ensure zero downtime on urgent client callouts.",
        },
        {
          title: "Overwatch High Quality & Aesthetic Standards",
          desc: "Enforce meticulous cable management, clean conduits, weatherproofing, tamper-proof brackets, and comprehensive handover documentation.",
        },
      ],
      pt: [
        {
          title: "Supervisão de Técnicos e Subempreiteiros",
          desc: "Coordenar e fiscalizar diretamente equipas técnicas e prestadores de serviço, garantindo respeito escrupuloso pelas normas de segurança e prazos.",
        },
        {
          title: "Gestão de Ferramental, Stock Técnico e Peças Sobressalentes",
          desc: "Controlar ferramentas de precisão, testadores de rede, fixações e peças de substituição para resposta imediata a chamados de assistência técnica.",
        },
        {
          title: "Padrões de Rigor, Estética e Qualidade Overwatch",
          desc: "Assegurar tubagens e calhas retas e discretas, isolamento contra intempéries, fixações antivandalismo e dossiers técnicos completos de entrega.",
        },
      ],
    },
  },
];

export default function InteractiveResponsibilityStack({
  locale,
}: InteractiveResponsibilityStackProps) {
  const isPt = locale === "pt";
  const [activeDomainIdx, setActiveDomainIdx] = useState(0);
  const [animationData, setAnimationData] = useState<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const lottieRef = useRef<any>(null);

  const t = (en: string, pt: string) => (isPt ? pt : en);

  // Load the optimized CCTV card stack JSON in the background
  useEffect(() => {
    let isMounted = true;
    fetch("/animations/cctv-card-stack.json")
      .then((res) => {
        if (!res.ok) throw new Error("Animation fetch failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) setAnimationData(data);
      })
      .catch((err) => {
        console.warn("Could not load card stack animation:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const currentDomain = DOMAINS[activeDomainIdx];
  const items = isPt ? currentDomain.items.pt : currentDomain.items.en;

  const handleNext = () => {
    setActiveDomainIdx((prev) => (prev + 1) % DOMAINS.length);
  };

  const handlePrev = () => {
    setActiveDomainIdx((prev) => (prev - 1 + DOMAINS.length) % DOMAINS.length);
  };

  const handleStackMouseEnter = () => {
    setIsHovered(true);
    if (lottieRef.current && typeof lottieRef.current.playSegments === "function") {
      // Free Interactive Card Stack markers: hover-desktop is frames 117-196
      try {
        lottieRef.current.playSegments([117, 196], true);
      } catch (e) {
        // Fallback play
      }
    }
  };

  const handleStackMouseLeave = () => {
    setIsHovered(false);
    if (lottieRef.current && typeof lottieRef.current.playSegments === "function") {
      try {
        // close-desktop is frames 196-240 or idle-desktop 0-100
        lottieRef.current.playSegments([0, 100], true);
      } catch (e) {
        // Fallback
      }
    }
  };

  return (
    <div className="space-y-10">
      {/* ─── INTERACTIVE DOMAIN PILL SELECTORS ────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {DOMAINS.map((domain, idx) => {
          const Icon = domain.icon;
          const isActive = idx === activeDomainIdx;
          return (
            <button
              key={domain.id}
              type="button"
              onClick={() => setActiveDomainIdx(idx)}
              className={`group inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? `border-foreground/30 bg-foreground text-background shadow-md`
                  : `border-border bg-card/60 text-muted hover:border-foreground/20 hover:text-foreground hover:bg-card`
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
                  isActive ? "bg-background text-foreground" : "bg-foreground/5 text-muted"
                }`}
              >
                {domain.number}
              </span>
              <Icon size={14} className={isActive ? "text-background" : domain.accentColor} />
              <span className="truncate">{domain.badge[isPt ? "pt" : "en"]}</span>
            </button>
          );
        })}
      </div>

      {/* ─── MAIN SHOWCASE: 3D CARD STACK + ACTIVE DETAILS ────────── */}
      <div className="grid gap-8 lg:grid-cols-[420px_1fr] lg:gap-12 items-center">
        {/* LEFT COLUMN: INTERACTIVE CARD STACK CONTAINER */}
        <div
          onMouseEnter={handleStackMouseEnter}
          onMouseLeave={handleStackMouseLeave}
          className="relative group rounded-3xl border border-border/80 bg-gradient-to-b from-[#090d16] to-[#04060b] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl overflow-hidden min-h-[460px]"
        >
          {/* Ambient glow backing */}
          <div
            className={`absolute inset-0 bg-radial from-current/10 via-transparent to-transparent pointer-events-none ${currentDomain.accentColor} opacity-40 blur-2xl transition-all duration-500`}
          />

          {/* Top Header inside Stack View */}
          <div className="relative z-10 w-full flex items-center justify-between pb-4 border-b border-white/10 text-xs">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              OVERWATCH // CCTV DECK
            </span>
            <span className="font-mono text-[11px] text-white/50">
              {activeDomainIdx + 1} / {DOMAINS.length}
            </span>
          </div>

          {/* Card Stack Animation / Interactive Visual Deck */}
          <div className="relative z-10 my-4 w-full flex items-center justify-center min-h-[300px]">
            {animationData ? (
              <div className="w-full max-w-[320px] aspect-[306/373] flex items-center justify-center">
                <Lottie
                  lottieRef={lottieRef}
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              /* Fallback High-Tech 3D Stack Mockup while Lottie streams */
              <div className="relative w-64 h-80 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl border border-white/10 bg-[#0b1220]/60 -rotate-6 scale-90 translate-y-3 shadow-lg" />
                <div className="absolute inset-0 rounded-2xl border border-white/15 bg-[#0f172a]/80 rotate-3 scale-95 translate-y-1 shadow-lg" />
                <div className="relative z-10 w-full h-full rounded-2xl border border-cyan-500/30 bg-[#0d1424] p-5 flex flex-col justify-between shadow-2xl text-left">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 font-mono">
                      {currentDomain.number} // DOMAIN
                    </span>
                    <h4 className="mt-2 text-base font-extrabold text-white">
                      {currentDomain.title[isPt ? "pt" : "en"]}
                    </h4>
                    <p className="mt-1 text-xs text-white/60">
                      {currentDomain.subtitle[isPt ? "pt" : "en"]}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/40">OVERWATCH TECH</span>
                    <span className="text-[9px] font-bold text-cyan-400 uppercase">
                      ACTIVE PILLAR
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Stack Prompt & Controls */}
          <div className="relative z-10 w-full pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-white/60 flex items-center gap-1.5">
              <Eye size={13} className="text-white/40" />
              {t("Hover stack to fan out cards", "Passe o cursor para abrir as cartas")}
            </span>

            {/* Quick Switch Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous domain"
                className="h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next domain"
                className="h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE DOMAIN DETAILS (CLEAN, EXPANDED, BILINGUAL) */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground">
              <span className="font-mono text-muted">{currentDomain.number}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className={currentDomain.accentColor}>
                {currentDomain.badge[isPt ? "pt" : "en"]}
              </span>
            </div>

            <div className="text-xs text-muted font-medium">
              {t(
                `Showing ${items.length} core responsibilities`,
                `${items.length} responsabilidades chave`
              )}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {currentDomain.title[isPt ? "pt" : "en"]}
            </h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {currentDomain.subtitle[isPt ? "pt" : "en"]}
            </p>
          </div>

          {/* Granular Responsibilities Cards under this Domain */}
          <div className="space-y-3.5 pt-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground border border-border mt-0.5">
                    <CheckCircle2 size={16} className={currentDomain.accentColor} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {item.title}
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fast Navigation between Domains */}
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              {t("Previous Domain", "Domínio Anterior")}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              {t("Next Domain", "Próximo Domínio")}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
