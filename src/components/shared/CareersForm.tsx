"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  LockKeyhole,
  Loader2,
  Radio,
  ShieldCheck,
  Upload,
  UserCheck,
  Cpu,
  Wrench,
  Network,
  Car,
  Briefcase,
  MapPin,
  Sparkles,
  Layers,
  Calendar,
  DollarSign,
} from "lucide-react";
import { type Role, MAX_CV } from "@/lib/careers";
import { darkEyebrowClassName } from "@/components/ui/eyebrow";
import TechGrid from "@/components/ui/TechGrid";
import LazyVideo from "@/components/ui/LazyVideo";
import { IMAGES } from "@/lib/constants";

interface RoleConfig {
  grade12Question: { en: string; pt: string };
  aiQuestion: { en: string; pt: string };
  experienceQuestion: { en: string; pt: string };
  shiftsQuestion: { en: string; pt: string };
  lastProfessionLabel: { en: string; pt: string };
  lastProfessionPlaceholder: { en: string; pt: string };
  coverLetterPlaceholder: { en: string; pt: string };
  sidebarDescription: { en: string; pt: string };
}

const ROLE_FORM_CONFIGS: Record<string, RoleConfig> = {
  cctv_technical_manager: {
    grade12Question: {
      en: "Do you have practical CCTV installation experience?",
      pt: "Tem experiência prática em instalação de CCTV?",
    },
    aiQuestion: {
      en: "Experience with AI cameras and video analytics?",
      pt: "Tem experiência com câmaras com IA e analítica de vídeo?",
    },
    experienceQuestion: {
      en: "Experienced with IP CCTV and NVR configuration?",
      pt: "Experiência em CCTV IP e configuração de NVRs?",
    },
    shiftsQuestion: {
      en: "Available for on-site technical supervision and emergency support?",
      pt: "Disponível para supervisão técnica em obra e suporte de emergência?",
    },
    lastProfessionLabel: {
      en: "Most recent technical / leadership role",
      pt: "Última função técnica ou de chefia exercida",
    },
    lastProfessionPlaceholder: {
      en: "e.g. CCTV Technical Manager, Senior CCTV Technician, Systems Engineer",
      pt: "ex: Gestor Técnico de CCTV, Técnico Sénior de CCTV, Engenheiro de Sistemas",
    },
    coverLetterPlaceholder: {
      en: "Highlight your CCTV project track record, team leadership experience, and how you ensure installations meet high standards...",
      pt: "Destaque os projectos de CCTV liderados, experiência em supervisão de equipas e como garante padrões de alta qualidade...",
    },
    sidebarDescription: {
      en: "Lead technical delivery of CCTV installations, site surveys, NVR configuration, and remote monitoring integration in Maputo.",
      pt: "Liderar a entrega técnica de instalações de CCTV, levantamentos técnicos, configuração NVR e monitorização remota em Maputo.",
    },
  },
  cctv: {
    grade12Question: {
      en: "Do you have a completed Grade 12 (12ª Classe)?",
      pt: "Tem a 12ª Classe concluída?",
    },
    aiQuestion: {
      en: "Do you have any basic knowledge of AI tools?",
      pt: "Tem algum conhecimento básico de ferramentas de IA?",
    },
    experienceQuestion: {
      en: "Do you have experience in security / CCTV monitoring?",
      pt: "Tem experiência em segurança ou monitorização CCTV?",
    },
    shiftsQuestion: {
      en: "Are you available for 12-hour rotating shifts (day/night)?",
      pt: "Tem disponibilidade para turnos rotativos de 12 horas (dia/noite)?",
    },
    lastProfessionLabel: {
      en: "Last profession / role held",
      pt: "Última profissão / função desempenhada",
    },
    lastProfessionPlaceholder: {
      en: "e.g. Security Guard, CCTV Operator, Call Centre Agent",
      pt: "ex: Vigilante, Operador de CCTV, Assistente de Call Centre",
    },
    coverLetterPlaceholder: {
      en: "Tell us about yourself, your vigilance, and why you want to work at Overwatch...",
      pt: "Fale-nos sobre si, a sua atenção ao detalhe e porque quer trabalhar na Overwatch...",
    },
    sidebarDescription: {
      en: "Stationed in our Maputo 24/7 Control Room, verifying live perimeter alerts and monitoring video feeds with AI support.",
      pt: "Integrado na nossa Central de Operações 24/7 em Maputo, verificando alertas perimetrais ao vivo e monitorizando câmaras com suporte de IA.",
    },
  },
  patrol_driver: {
    grade12Question: {
      en: "Do you have a valid professional driving licence (heavy/light)?",
      pt: "Possui carta de condução profissional válida (pesados/ligeiros)?",
    },
    aiQuestion: {
      en: "Comfortable using smartphone GPS navigation and tablet dispatch apps?",
      pt: "Tem facilidade no uso de navegação GPS por smartphone e aplicações móveis de despacho?",
    },
    experienceQuestion: {
      en: "Do you have prior rapid response or security patrol driving experience?",
      pt: "Tem experiência anterior em condução de patrulha ou resposta rápida armada?",
    },
    shiftsQuestion: {
      en: "Are you available for 12-hour high-alert day and night patrol shifts?",
      pt: "Tem disponibilidade para turnos operacionais de patrulha de 12 horas (dia e noite)?",
    },
    lastProfessionLabel: {
      en: "Last driving / security position held",
      pt: "Última função de condução ou segurança desempenhada",
    },
    lastProfessionPlaceholder: {
      en: "e.g. Patrol Driver, Armed Response Officer, Chauffeur",
      pt: "ex: Motorista de Patrulha, Agente de Resposta Armada, Motorista Profissional",
    },
    coverLetterPlaceholder: {
      en: "Detail your defensive driving background, knowledge of Maputo routes, and tactical response discipline...",
      pt: "Detalhe a sua experiência de condução defensiva, conhecimento das vias de Maputo e disciplina táctica...",
    },
    sidebarDescription: {
      en: "Conduct tactical patrols and immediate physical alarm response across client perimeters in dedicated response vehicles.",
      pt: "Efetuar patrulhas tácticas e resposta física imediata a alarmes em instalações de clientes com viaturas dedicadas.",
    },
  },
  control_room_supervisor: {
    grade12Question: {
      en: "Do you hold a completed Grade 12 or higher tertiary diploma?",
      pt: "Possui a 12ª Classe concluída ou formação superior?",
    },
    aiQuestion: {
      en: "Experienced with video management software (Milestone, HikCentral, DSS)?",
      pt: "Tem experiência em software de gestão de vídeo (Milestone, HikCentral, DSS)?",
    },
    experienceQuestion: {
      en: "Do you have at least 2 years supervisory experience in a 24/7 control centre?",
      pt: "Tem pelo menos 2 anos de experiência de chefia numa central de controlo 24/7?",
    },
    shiftsQuestion: {
      en: "Available to lead 12-hour rotating shifts and manage emergency escalations?",
      pt: "Disponibilidade para chefiar equipas em turnos rotativos de 12h e gerir incidentes críticos?",
    },
    lastProfessionLabel: {
      en: "Last supervisory role held",
      pt: "Última função de supervisão ou chefia desempenhada",
    },
    lastProfessionPlaceholder: {
      en: "e.g. Control Room Supervisor, Senior Dispatcher, Security Team Leader",
      pt: "ex: Supervisor de Central, Despachador Sénior, Chefe de Equipa de Segurança",
    },
    coverLetterPlaceholder: {
      en: "Describe your leadership style, how you manage incident pressure, and ensure strict SLA adherence...",
      pt: "Descreva o seu estilo de liderança, gestão sob pressão em incidentes e garantia de cumprimento de SLAs...",
    },
    sidebarDescription: {
      en: "Lead shifts in our Control Centre, oversee alert dispatch, enforce quality standards, and coordinate field teams.",
      pt: "Liderar equipas na nossa Central de Controlo, supervisionar despacho de alertas e coordenar equipas de terreno.",
    },
  },
  armed_response_officer: {
    grade12Question: {
      en: "Do you possess certified tactical security or military/police training?",
      pt: "Possui certificação de segurança táctica ou formação policial/militar comprovada?",
    },
    aiQuestion: {
      en: "Familiar with digital radio dispatch and body-worn camera procedures?",
      pt: "Tem familiaridade com rádio-comunicações digitais e câmaras corporais (bodycams)?",
    },
    experienceQuestion: {
      en: "Do you have at least 2 years active armed security or tactical response experience?",
      pt: "Tem pelo menos 2 anos de experiência activa em segurança armada ou intervenção táctica?",
    },
    shiftsQuestion: {
      en: "Available for demanding 12-hour operational night and day shifts?",
      pt: "Disponibilidade para turnos operacionais exigentes de 12 horas (nocturnos e diurnos)?",
    },
    lastProfessionLabel: {
      en: "Last tactical or security role",
      pt: "Última função táctica ou de segurança exercida",
    },
    lastProfessionPlaceholder: {
      en: "e.g. Armed Response Officer, Close Protection, Tactical Security",
      pt: "ex: Agente de Intervenção Rápida, Protecção Pessoal, Segurança Táctica",
    },
    coverLetterPlaceholder: {
      en: "Outline your tactical discipline, situational awareness, and de-escalation credentials...",
      pt: "Apresente a sua disciplina operacional, reacção rápida e experiência de intervenção no terreno...",
    },
    sidebarDescription: {
      en: "Rapid on-scene intervention, perimeter breach neutralisation, and client protection during emergency alarm triggers.",
      pt: "Intervenção rápida no local, contenção de invasões de perímetro e protecção de clientes durante alarmes.",
    },
  },
  cctv_technician: {
    grade12Question: {
      en: "Do you have formal technical training in electronics, cabling or telecommunications?",
      pt: "Possui formação técnica formal em electrónica, cablagem ou telecomunicações?",
    },
    aiQuestion: {
      en: "Comfortable configuring IP addresses, subnetting, PoE switches, and NVRs?",
      pt: "Tem facilidade na configuração de endereçamento IP, sub-redes, switches PoE e NVRs?",
    },
    experienceQuestion: {
      en: "Do you have hands-on experience installing IP/analogue cameras and cable conduits?",
      pt: "Tem experiência prática na montagem de câmaras IP/analógicas e passagem de calhas/tubagens?",
    },
    shiftsQuestion: {
      en: "Available for field callouts, height work (ladders/scaffolds), and urgent repairs?",
      pt: "Disponível para intervenções no terreno, trabalhos em altura e reparações urgentes?",
    },
    lastProfessionLabel: {
      en: "Last technical role held",
      pt: "Última função técnica exercida",
    },
    lastProfessionPlaceholder: {
      en: "e.g. CCTV Technician, Network Cable Installer, Electrician",
      pt: "ex: Técnico de CCTV, Instalador de Redes, Electricista",
    },
    coverLetterPlaceholder: {
      en: "Describe your technical skills, brands of equipment installed, and troubleshooting background...",
      pt: "Descreva as suas competências técnicas, marcas de equipamentos já instalados e diagnóstico de avarias...",
    },
    sidebarDescription: {
      en: "Install, service, and calibrate client camera arrays, NVRs, and sensors to ensure flawless telemetry to our Control Centre.",
      pt: "Instalar, reparar e calibrar sistemas de câmaras, NVRs e sensores para assegurar telemetria perfeita para a Central.",
    },
  },
};

interface CareersFormProps {
  initialLocale?: string;
  defaultRoleId?: string;
  hideHero?: boolean;
}

export default function CareersForm({
  initialLocale,
  defaultRoleId = "cctv_technical_manager",
  hideHero = false,
}: CareersFormProps) {
  const currentLocale = useLocale();
  const locale = initialLocale || currentLocale;
  const pt = locale === "pt";

  const t = (en: string, ptText: string) => (pt ? ptText : en);

  const [roles, setRoles] = useState<Role[]>([
    {
      id: "cctv_technical_manager",
      en: "CCTV Installation & Technical Manager",
      pt: "Gestor Técnico e Instalação de CCTV",
      open: true,
    },
    {
      id: "cctv",
      en: "CCTV Monitoring Operator",
      pt: "Operador de Monitoramento CCTV",
      open: false,
    },
    {
      id: "patrol_driver",
      en: "Patrol Driver",
      pt: "Motorista de Patrulha",
      open: false,
    },
    {
      id: "control_room_supervisor",
      en: "Control Room Supervisor",
      pt: "Supervisor de Sala de Controlo",
      open: false,
    },
    {
      id: "armed_response_officer",
      en: "Armed Response Officer",
      pt: "Oficial de Resposta Armada",
      open: false,
    },
    {
      id: "cctv_technician",
      en: "CCTV Technician",
      pt: "Técnico de CCTV",
      open: false,
    },
    {
      id: "sales",
      en: "Sales & Business Development",
      pt: "Vendas e Desenvolvimento de Negócios",
      open: false,
    },
  ]);
  const [selectedRoleId, setSelectedRoleId] = useState(defaultRoleId);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Dynamic Section / Step State
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [lastProfession, setLastProfession] = useState("");

  // CCTV Operator legacy form field state
  const [grade12, setGrade12] = useState<"yes" | "no" | "">("");
  const [sex, setSex] = useState<"female" | "male" | "">("");
  const [ai, setAi] = useState<"yes" | "no" | "">("");
  const [experience, setExperience] = useState<"yes" | "no" | "">("");
  const [shifts, setShifts] = useState<"yes" | "no" | "">("");

  // Technical Manager Form States
  const [currentLocation, setCurrentLocation] = useState("");
  const [yearsCctvExperience, setYearsCctvExperience] = useState("");
  const [ipCctv, setIpCctv] = useState<"yes" | "no" | "">("");
  const [analogueCctv, setAnalogueCctv] = useState<"yes" | "no" | "">("");
  const [hikvision, setHikvision] = useState<"yes" | "no" | "">("");
  const [dahua, setDahua] = useState<"yes" | "no" | "">("");
  const [nvrDvr, setNvrDvr] = useState<"yes" | "no" | "">("");
  const [networking, setNetworking] = useState<"yes" | "no" | "">("");
  const [structuredCabling, setStructuredCabling] = useState<"yes" | "no" | "">("");
  const [electricalUps, setElectricalUps] = useState<"yes" | "no" | "">("");
  const [troubleshooting, setTroubleshooting] = useState<"yes" | "no" | "">("");
  const [supervision, setSupervision] = useState<"yes" | "no" | "">("");
  const [drivingLicence, setDrivingLicence] = useState<"yes" | "no" | "">("");
  const [aiAnalytics, setAiAnalytics] = useState<"yes" | "no" | "">("");
  const [remoteMonitoring, setRemoteMonitoring] = useState<"yes" | "no" | "">("");
  const [boqScopes, setBoqScopes] = useState<"yes" | "no" | "">("");
  const [startDate, setStartDate] = useState("immediate");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [largestProjectDescription, setLargestProjectDescription] = useState("");

  const isTechnicalManager = selectedRoleId === "cctv_technical_manager";
  const totalSteps = isTechnicalManager ? 5 : 3;

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/careers/roles", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active && Array.isArray(data.roles)) {
          setRoles(data.roles);
          setConnection(true);
          setSelectedRoleId((prev) => {
            const current = data.roles.find((r: Role) => r.id === prev);
            if (!current || !current.open) {
              const firstOpen = data.roles.find((r: Role) => r.open);
              return firstOpen ? firstOpen.id : prev;
            }
            return prev;
          });
        }
      } catch {
        if (active) setConnection(false);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const openRoles = roles.filter((r) => r.open);
  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const isSelectedRoleClosed = roles.length > 0 && !selectedRole?.open;
  const currentConfig = ROLE_FORM_CONFIGS[selectedRoleId] || ROLE_FORM_CONFIGS.cctv;

  const closedText = t(
    `This position is currently closed for applications. Please choose an open position.`,
    `Esta função não se encontra aberta a candidaturas no momento. Por favor, selecione uma vaga aberta.`,
  );

  function handleSelectRole(roleItem: Role) {
    setSelectedRoleId(roleItem.id);
    setCurrentStep(1);
    if (!roleItem.open) {
      setError(closedText);
    } else {
      setError("");
    }
  }

  function selectFile(selected?: File) {
    if (!selected) return;
    if (
      !/\.(pdf|doc|docx)$/i.test(selected.name) ||
      selected.size > MAX_CV ||
      !selected.size
    ) {
      setError(
        t(
          "Please upload a valid PDF, DOC or DOCX document up to 3 MB.",
          "Por favor carregue um documento PDF, DOC ou DOCX válido de até 3 MB.",
        ),
      );
      setFile(null);
      return;
    }
    setFile(selected);
    setError("");
  }

  // Section-by-Section Validation and Navigation
  function handleNextStep() {
    setError("");

    if (currentStep === 1) {
      if (!name.trim()) {
        setError(t("Please enter your official full name.", "Por favor indique o seu nome completo."));
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setError(t("Please enter a valid email address.", "Por favor indique um endereço de e-mail válido."));
        return;
      }
      if (!whatsapp.trim() || whatsapp.trim().length < 7) {
        setError(t("Please enter a valid WhatsApp or phone number.", "Por favor indique um número de WhatsApp ou telemóvel válido."));
        return;
      }
      if (isTechnicalManager) {
        if (!currentLocation.trim()) {
          setError(t("Please enter your current location / city.", "Por favor indique a sua localização / cidade actual."));
          return;
        }
      } else {
        if (!sex) {
          setError(t("Please select your sex.", "Por favor selecione o seu sexo."));
          return;
        }
      }
    } else if (currentStep === 2) {
      if (isTechnicalManager) {
        if (!yearsCctvExperience) {
          setError(t("Please select your years of practical CCTV experience.", "Por favor selecione os seus anos de experiência em CCTV."));
          return;
        }
        if (!ipCctv || !nvrDvr || !networking) {
          setError(t("Please answer all required technical questions (marked with *).", "Por favor responda a todas as questões técnicas obrigatórias (marcadas com *)."));
          return;
        }
      } else {
        if (!grade12 || !ai || !experience || !shifts || !lastProfession.trim()) {
          setError(t("Please complete all required fields before continuing.", "Por favor preencha todos os campos obrigatórios antes de continuar."));
          return;
        }
      }
    } else if (currentStep === 4) {
      if (isTechnicalManager) {
        if (!largestProjectDescription.trim() || largestProjectDescription.trim().length < 15) {
          setError(t("Please provide details about your largest CCTV installation project (at least a brief summary).", "Por favor forneça detalhes sobre o seu projecto de CCTV de maior dimensão (pelo menos um resumo breve)."));
          return;
        }
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      const formEl = document.getElementById("application-form");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function handlePrevStep() {
    setError("");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      const formEl = document.getElementById("application-form");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isSelectedRoleClosed) {
      setError(closedText);
      return;
    }

    if (!file) {
      setError(t("Please attach your CV document.", "Por favor anexe o seu currículo (CV)."));
      return;
    }

    const formData = new FormData();
    formData.set("cv", file);
    formData.set("role", selectedRoleId);
    formData.set("locale", pt ? "pt" : "en");
    formData.set("name", name.trim());
    formData.set("email", email.trim());
    formData.set("whatsapp", whatsapp.trim());
    formData.set("coverLetter", coverLetter.trim());

    if (isTechnicalManager) {
      formData.set("currentLocation", currentLocation.trim());
      formData.set("yearsCctvExperience", yearsCctvExperience);
      formData.set("ipCctv", ipCctv || "no");
      formData.set("analogueCctv", analogueCctv || "no");
      formData.set("hikvision", hikvision || "no");
      formData.set("dahua", dahua || "no");
      formData.set("nvrDvr", nvrDvr || "no");
      formData.set("networking", networking || "no");
      formData.set("structuredCabling", structuredCabling || "no");
      formData.set("electricalUps", electricalUps || "no");
      formData.set("troubleshooting", troubleshooting || "no");
      formData.set("supervision", supervision || "no");
      formData.set("drivingLicence", drivingLicence || "no");
      formData.set("aiAnalytics", aiAnalytics || "no");
      formData.set("remoteMonitoring", remoteMonitoring || "no");
      formData.set("boqScopes", boqScopes || "no");
      formData.set("startDate", startDate);
      formData.set("salaryExpectation", salaryExpectation.trim());
      formData.set("largestProjectDescription", largestProjectDescription.trim());
    } else {
      formData.set("grade12", grade12);
      formData.set("sex", sex);
      formData.set("ai", ai);
      formData.set("experience", experience);
      formData.set("shifts", shifts);
      formData.set("lastProfession", lastProfession.trim());
    }

    setBusy(true);
    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.code);
      setSuccess(result.id);
    } catch (e) {
      const code = (e as Error).message;
      if (code === "ROLE_CLOSED") {
        setError(closedText);
      } else if (code === "FILE_INVALID") {
        setError(
          t(
            "Your CV could not be processed. Please provide a standard PDF, DOC, or DOCX under 3 MB.",
            "O seu CV não pôde ser processado. Envie um ficheiro PDF, DOC ou DOCX válido de até 3 MB.",
          ),
        );
      } else {
        setError(
          t(
            "We were unable to submit your application right now. Please check your information and try again.",
            "Não foi possível submeter a sua candidatura neste momento. Verifique os dados e tente novamente.",
          ),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const renderYesNo = (
    label: string,
    value: "yes" | "no" | "",
    onChange: (val: "yes" | "no") => void,
    isRequired: boolean = false,
    helpText?: string,
  ) => (
    <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-background/50 hover:border-foreground/20 transition-all">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-foreground/90 leading-tight">
          {label} {isRequired ? <span className="text-amber-500 font-bold">*</span> : null}
        </span>
      </div>
      {helpText && (
        <p className="text-[0.7rem] text-muted leading-relaxed">{helpText}</p>
      )}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange("yes")}
          className={`min-h-10 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer ${
            value === "yes"
              ? "border-foreground bg-foreground text-background shadow-xs font-bold"
              : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]"
          }`}
        >
          {t("Yes", "Sim")}
        </button>
        <button
          type="button"
          onClick={() => onChange("no")}
          className={`min-h-10 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer ${
            value === "no"
              ? "border-foreground bg-foreground text-background shadow-xs font-bold"
              : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]"
          }`}
        >
          {t("No", "Não")}
        </button>
      </div>
    </div>
  );

  const stepLabels = isTechnicalManager
    ? [
        { num: 1, title: t("Contact", "Contacto"), icon: UserCheck },
        { num: 2, title: t("CCTV Core", "CCTV Base"), icon: Wrench },
        { num: 3, title: t("Platforms", "Plataformas"), icon: Cpu },
        { num: 4, title: t("Projects", "Projectos"), icon: Layers },
        { num: 5, title: t("CV & Submit", "CV & Envio"), icon: Upload },
      ]
    : [
        { num: 1, title: t("Contact", "Contacto"), icon: UserCheck },
        { num: 2, title: t("Experience", "Experiência"), icon: Radio },
        { num: 3, title: t("CV & Submit", "CV & Envio"), icon: Upload },
      ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      {!hideHero && (
        <section className="dark relative isolate overflow-hidden bg-[#090d16] pb-16 pt-28 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(to_bottom,transparent_45%,rgba(9,13,22,0.95))] pointer-events-none z-0" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className={darkEyebrowClassName}>
                <ShieldCheck size={15} className="shrink-0" aria-hidden="true" />
                OVERWATCH / {t("CAREERS", "CARREIRAS")}
              </span>

              <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.06] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                {t("Your focus.", "A sua atenção.")}{" "}
                <span className="text-white/70">
                  {t("Their peace of mind.", "A tranquilidade de todos.")}
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg lg:text-xl">
                {t(
                  "Behind every protected facility is someone vigilant and dedicated. Shape your career at Overwatch where AI-powered CCTV surveillance, real-time alert verification, and human dedication protect what matters most.",
                  "Por trás de cada instalação protegida, há alguém atento, vigilante e empenhado. Construa a sua carreira na Overwatch, onde a monitorização CCTV apoiada por IA, a verificação de alertas em tempo real e a dedicação humana protegem o que mais importa.",
                )}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#opportunities"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#090d16] shadow-lg shadow-black/25 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#090d16]"
                >
                  {t("Explore open roles", "Explorar vagas abertas")}
                  <ArrowDown size={17} aria-hidden="true" />
                </a>

                {/* Dynamic live badge based on open roles */}
                <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-xs font-medium text-white/80 backdrop-blur-sm shadow-sm">
                  {openRoles.length > 0 ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>
                        {t("Accepting applications: ", "A receber candidaturas: ")}
                        <strong className="font-semibold text-white">
                          {openRoles.map((r) => (pt ? r.pt : r.en)).join(", ")}
                        </strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 shrink-0" />
                      <span>
                        {t(
                          "No positions currently accepting applications",
                          "Nenhuma vaga aberta no momento",
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── OPPORTUNITIES & APPLICATION (FAQ STICKY-SCROLL ARCHITECTURE) ── */}
      <section
        id="opportunities"
        className="relative scroll-mt-20 overflow-clip bg-background py-16 sm:py-20 lg:py-24"
      >
        <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none" />
        <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-foreground/[0.02] blur-3xl pointer-events-none" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:px-8">
          {/* ─── LEFT STICKY COLUMN (LIKE FAQ PAGE ASIDE) ───────────── */}
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                {t("AVAILABLE POSITIONS", "OPORTUNIDADES DE CARREIRA")}
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                {t("Join the Overwatch team", "Faça parte da Overwatch")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                {t(
                  "Select an opening to review the role and complete your application. Role availability is managed in real time by our recruitment team.",
                  "Selecione uma função para submeter a sua candidatura. A disponibilidade de vagas é atualizada em tempo real pela nossa equipa de recrutamento.",
                )}
              </p>
            </div>

            {/* Role Cards List */}
            <div className="space-y-3">
              {roles.map((r) => {
                const isSelected = selectedRoleId === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      handleSelectRole(r);
                      if (r.open) {
                        document
                          .getElementById("application-form")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={`group relative flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-foreground/40 bg-foreground/[0.04] shadow-md ring-1 ring-foreground/20 -translate-y-0.5"
                        : "border-border bg-card hover:border-foreground/25 hover:-translate-y-0.5 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-foreground transition-colors">
                        {pt ? r.pt : r.en}
                      </h3>
                      {r.open ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          {t("Open", "Aberta")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-foreground/[0.04] px-2.5 py-0.5 text-[0.7rem] font-semibold text-muted">
                          <LockKeyhole size={11} className="text-muted" />
                          {t("Closed", "Encerrado")}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                      {pt
                        ? (ROLE_FORM_CONFIGS[r.id] || ROLE_FORM_CONFIGS.cctv).sidebarDescription.pt
                        : (ROLE_FORM_CONFIGS[r.id] || ROLE_FORM_CONFIGS.cctv).sidebarDescription.en}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Closed role alert in the sidebar */}
            {isSelectedRoleClosed && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-700 dark:text-amber-300"
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <LockKeyhole size={14} />
                  <span>{t("Role Not Available", "Função Não Disponível")}</span>
                </div>
                {closedText}
              </div>
            )}

            {/* Trust and Privacy Support Card */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
                <ShieldCheck size={21} aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                {t("RECRUITMENT INTEGRITY", "TRANSPARÊNCIA E RIGOR")}
              </p>
              <h3 className="mt-2 text-lg font-bold leading-snug text-foreground">
                {t("Your privacy is protected", "Processo seletivo confidencial")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {t(
                  "All applications and resumes are accessed exclusively by authorized Overwatch recruitment personnel.",
                  "Todas as candidaturas e currículos enviados são analisados exclusivamente pela equipa de recursos humanos e gestão de operações da Overwatch.",
                )}
              </p>
            </div>
          </aside>

          {/* ─── RIGHT MAIN FORM COLUMN ─────────────────────────────── */}
          <div id="application-form" className="min-w-0">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_16px_42px_rgba(2,6,23,0.075)] sm:p-8">
              {success ? (
                /* Success State */
                <div className="py-12 text-center" role="status">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 mb-6">
                    <CheckCircle2 size={36} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                    {t("APPLICATION RECEIVED", "CANDIDATURA RECEBIDA")}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                    {t("Thank you for applying", "Obrigado pela sua candidatura")}
                  </h3>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                    {selectedRoleId === "cctv_technical_manager"
                      ? t(
                          "Your application for CCTV Installation & Technical Manager has been received. Our technical recruitment team will review your qualifications against the role requirements and contact you with further instructions.",
                          "A sua candidatura para Gestor Técnico e Instalação de CCTV foi registada com sucesso. A nossa equipa irá analisar o seu perfil técnico e entrará em contacto com as instruções para as próximas etapas.",
                        )
                      : t(
                          "Your application and curriculum vitae have been recorded. Our hiring team will review your qualifications and contact you via WhatsApp or email if your profile matches the role.",
                          "A sua candidatura e o seu currículo foram registados com sucesso. A nossa equipa irá analisar o seu perfil e entrar em contacto via WhatsApp ou e-mail caso seja selecionado(a).",
                        )}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-mono text-muted">
                    <span>{t("Reference", "Referência")}:</span>
                    <strong className="text-foreground">
                      {success.slice(0, 8).toUpperCase()}
                    </strong>
                  </div>
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess("");
                        setCurrentStep(1);
                        setName("");
                        setEmail("");
                        setWhatsapp("");
                        setCurrentLocation("");
                        setYearsCctvExperience("");
                        setIpCctv("");
                        setAnalogueCctv("");
                        setHikvision("");
                        setDahua("");
                        setNvrDvr("");
                        setNetworking("");
                        setStructuredCabling("");
                        setElectricalUps("");
                        setTroubleshooting("");
                        setSupervision("");
                        setDrivingLicence("");
                        setAiAnalytics("");
                        setRemoteMonitoring("");
                        setBoqScopes("");
                        setStartDate("immediate");
                        setSalaryExpectation("");
                        setLargestProjectDescription("");
                        setCoverLetter("");
                        setLastProfession("");
                        setGrade12("");
                        setSex("");
                        setAi("");
                        setExperience("");
                        setShifts("");
                        setFile(null);
                        setError("");
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-xs font-semibold text-background transition-transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      {t("Submit another application", "Enviar outra candidatura")}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Dynamic Section-by-Section Interactive Form */
                <form onSubmit={submit} className="space-y-6">
                  {/* Top Header: Title + Role + TOTAL SECTION COUNT ON TOP RIGHT */}
                  <div className="border-b border-border/80 pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                          {t("Application Form", "Formulário de Candidatura")}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          {isTechnicalManager
                            ? t(
                                "Step-by-step technical application for CCTV Installation & Technical Manager.",
                                "Candidatura técnica por etapas para Gestor Técnico e Instalação de CCTV.",
                              )
                            : t(
                                "Complete each section to submit your candidacy.",
                                "Preencha cada secção para submeter a sua candidatura.",
                              )}
                        </p>
                      </div>

                      {/* TOTAL SECTION COUNT BADGE (TOP RIGHT) */}
                      <div className="flex items-center gap-3 bg-foreground/[0.04] border border-border rounded-2xl px-4 py-2.5 shadow-xs">
                        <div className="text-right">
                          <div className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                            {t(
                              `Section ${currentStep} of ${totalSteps}`,
                              `Secção ${currentStep} de ${totalSteps}`
                            )}
                          </div>
                          <div className="text-[10px] font-medium text-muted">
                            {Math.round((currentStep / totalSteps) * 100)}% {t("completed", "concluído")}
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-16 h-2 rounded-full bg-foreground/[0.1] overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stepped Pill Indicator */}
                    <div className="mt-5 grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {stepLabels.map((s) => {
                        const isCurrent = s.num === currentStep;
                        const isPast = s.num < currentStep;
                        return (
                          <div
                            key={s.num}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold transition-all ${
                              isCurrent
                                ? "border-foreground bg-foreground text-background shadow-xs font-bold"
                                : isPast
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-border/60 bg-background/50 text-muted/60"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                                isCurrent
                                  ? "bg-background text-foreground"
                                  : isPast
                                  ? "bg-emerald-500 text-white"
                                  : "bg-foreground/5 text-muted"
                              }`}
                            >
                              {isPast ? "✓" : s.num}
                            </span>
                            <span className="truncate hidden sm:inline">{s.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ─── DYNAMIC STEP CONTAINER WITH TRANSITIONS ─── */}
                  <AnimatePresence mode="wait">
                    {/* ────────────────── SECTION 1: PERSONAL DETAILS & CONTACT ────────────────── */}
                    {currentStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        {/* Opening Position Selector */}
                        <div className="p-4 rounded-2xl border border-border bg-background/50 space-y-2">
                          <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                            <Radio size={14} className="text-muted" />
                            {t("Applying for opening:", "A candidatar-se à vaga:")}
                          </span>
                          <select
                            value={selectedRoleId}
                            onChange={(e) => {
                              const r = roles.find((item) => item.id === e.target.value);
                              if (r) handleSelectRole(r);
                            }}
                            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-foreground/40 focus:outline-none transition-colors"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.open ? "✓ " : "🔒 "}
                                {pt ? r.pt : r.en}
                                {r.open ? "" : ` — ${t("Closed", "Encerrado")}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <UserCheck size={16} className="text-foreground/70" />
                            {t("Personal Details & Contact", "Identificação & Contacto")}
                          </h4>
                          <span className="text-[10px] font-mono text-muted">
                            {t("Step 1 of", "Passo 1 de")} {totalSteps}
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Full Name */}
                          <label className="space-y-1.5 block sm:col-span-2">
                            <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                              {t("Full name", "Nome completo")}{" "}
                              <span className="text-amber-500 font-bold">*</span>
                            </span>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                              maxLength={120}
                              autoComplete="name"
                              placeholder={t(
                                "Your official full name",
                                "O seu nome completo",
                              )}
                              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                            />
                          </label>

                          {/* Email */}
                          <label className="space-y-1.5 block">
                            <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                              {t("Email address", "Endereço de e-mail")}{" "}
                              <span className="text-amber-500 font-bold">*</span>
                            </span>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              maxLength={254}
                              autoComplete="email"
                              placeholder="exemplo@dominio.com"
                              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                            />
                          </label>

                          {/* WhatsApp / Phone */}
                          <label className="space-y-1.5 block">
                            <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                              {t("WhatsApp / Mobile Number", "Número de WhatsApp / Telemóvel")}{" "}
                              <span className="text-amber-500 font-bold">*</span>
                            </span>
                            <input
                              type="tel"
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(e.target.value)}
                              required
                              pattern="\+?[0-9 ()-]{7,25}"
                              autoComplete="tel"
                              placeholder="+258 84 000 0000"
                              className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                            />
                          </label>

                          {/* Current Location (for Technical Manager) */}
                          {isTechnicalManager && (
                            <label className="space-y-1.5 block sm:col-span-2">
                              <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                                <MapPin size={13} className="text-muted" />
                                {t("Current Location / City", "Localização Actual / Cidade")}{" "}
                                <span className="text-amber-500 font-bold">*</span>
                              </span>
                              <input
                                type="text"
                                value={currentLocation}
                                onChange={(e) => setCurrentLocation(e.target.value)}
                                required
                                maxLength={100}
                                placeholder={t("e.g. Maputo, Matola, etc.", "ex.: Maputo, Matola, etc.")}
                                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                              />
                            </label>
                          )}

                          {/* Sex (for other roles) */}
                          {!isTechnicalManager && (
                            <div className="space-y-2 sm:col-span-2">
                              <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                                {t("Sex", "Sexo")}{" "}
                                <span className="text-amber-500 font-bold">*</span>
                              </span>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setSex("female")}
                                  className={`min-h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                    sex === "female"
                                      ? "border-foreground bg-foreground text-background shadow-xs font-bold"
                                      : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]"
                                  }`}
                                >
                                  {t("Female", "Feminino")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSex("male")}
                                  className={`min-h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                    sex === "male"
                                      ? "border-foreground bg-foreground text-background shadow-xs font-bold"
                                      : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]"
                                  }`}
                                >
                                  {t("Male", "Masculino")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Error message in section 1 */}
                        {error && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                            {error}
                          </div>
                        )}

                        {/* Section 1 Navigation */}
                        <div className="pt-4 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-xs font-bold text-background shadow-sm hover:bg-foreground/90 transition-all cursor-pointer"
                          >
                            <span>{t("Continue to Section 2", "Continuar para a Secção 2")}</span>
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ────────────────── SECTION 2: CCTV CORE INFRASTRUCTURE (OR QUALIFICATIONS) ────────────────── */}
                    {currentStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        {isTechnicalManager ? (
                          <>
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                <Wrench size={16} className="text-foreground/70" />
                                {t("CCTV Installation & Core Infrastructure", "Instalação de CCTV & Infraestrutura")}
                              </h4>
                              <span className="text-[10px] font-mono text-muted">
                                {t("Step 2 of", "Passo 2 de")} {totalSteps}
                              </span>
                            </div>

                            {/* Years of practical experience */}
                            <label className="space-y-1.5 block">
                              <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                                {t("Years of practical CCTV installation experience", "Anos de experiência prática em instalação de CCTV")}{" "}
                                <span className="text-amber-500 font-bold">*</span>
                              </span>
                              <select
                                value={yearsCctvExperience}
                                onChange={(e) => setYearsCctvExperience(e.target.value)}
                                required
                                className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                              >
                                <option value="">{t("Select experience...", "Selecione a sua experiência...")}</option>
                                <option value="0">{t("No prior CCTV installation experience", "Sem experiência prévia em instalação de CCTV")}</option>
                                <option value="1-2">{t("1 – 2 years", "1 a 2 anos")}</option>
                                <option value="3-5">{t("3 – 5 years", "3 a 5 anos")}</option>
                                <option value="5-8">{t("5 – 8 years", "5 a 8 anos")}</option>
                                <option value="8+">{t("More than 8 years", "Mais de 8 anos")}</option>
                              </select>
                            </label>

                            {/* Core Technical Questions */}
                            <div className="grid gap-3 sm:grid-cols-2 pt-1">
                              {renderYesNo(
                                t("Hands-on experience with IP CCTV systems", "Experiência prática com sistemas de CCTV IP"),
                                ipCctv,
                                setIpCctv,
                                true,
                                t("PoE, IP cameras, ONVIF, RTSP streams setup", "Câmaras IP, PoE, protocolos ONVIF, configuração de streams")
                              )}

                              {renderYesNo(
                                t("NVR / DVR storage & system configuration", "Configuração de NVRs / DVRs e armazenamento"),
                                nvrDvr,
                                setNvrDvr,
                                true,
                                t("HDD sizing, RAID, motion recording, schedules", "Dimensionamento de discos, gravação, agendamentos")
                              )}

                              {renderYesNo(
                                t("Networking, IP addressing, switches & routers", "Redes, endereçamento IP, switches e routers"),
                                networking,
                                setNetworking,
                                true,
                                t("Subnets, static IPs, port forwarding, VLAN basics", "Sub-redes, IPs estáticos, port forwarding, VLANs básicas")
                              )}

                              {renderYesNo(
                                t("CCTV preventive maintenance & fault diagnosis", "Manutenção preventiva e diagnóstico de avarias CCTV"),
                                troubleshooting,
                                setTroubleshooting,
                                false,
                                t("Troubleshooting camera offline, signal drops, power loss", "Resolução de falhas de sinal, perda de ligação e energia")
                              )}

                              {renderYesNo(
                                t("Experience with Analogue / HD-TVI / CVI CCTV", "Experiência com CCTV Analógico / HD-TVI / CVI"),
                                analogueCctv,
                                setAnalogueCctv,
                                false
                              )}

                              {renderYesNo(
                                t("Structured cabling (Cat6, Patch Panels, RJ45)", "Cablagem estruturada (Cat6, Patch Panels, RJ45)"),
                                structuredCabling,
                                setStructuredCabling,
                                false
                              )}

                              {renderYesNo(
                                t("Basic electrical, power supplies & UPS systems", "Electricidade básica, fontes de alimentação e UPS"),
                                electricalUps,
                                setElectricalUps,
                                false
                              )}
                            </div>
                          </>
                        ) : (
                          /* Standard Role Questions */
                          <>
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                <Radio size={16} className="text-foreground/70" />
                                {t("Role Qualifications & Experience", "Qualificações & Experiência")}
                              </h4>
                              <span className="text-[10px] font-mono text-muted">
                                {t("Step 2 of", "Passo 2 de")} {totalSteps}
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 pt-1">
                              {renderYesNo(
                                pt ? currentConfig.grade12Question.pt : currentConfig.grade12Question.en,
                                grade12,
                                setGrade12,
                                true
                              )}

                              {renderYesNo(
                                pt ? currentConfig.aiQuestion.pt : currentConfig.aiQuestion.en,
                                ai,
                                setAi,
                                true
                              )}

                              {renderYesNo(
                                pt ? currentConfig.experienceQuestion.pt : currentConfig.experienceQuestion.en,
                                experience,
                                setExperience,
                                true
                              )}

                              {renderYesNo(
                                pt ? currentConfig.shiftsQuestion.pt : currentConfig.shiftsQuestion.en,
                                shifts,
                                setShifts,
                                true
                              )}

                              <label className="space-y-1.5 block sm:col-span-2">
                                <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                                  {pt ? currentConfig.lastProfessionLabel.pt : currentConfig.lastProfessionLabel.en}{" "}
                                  <span className="text-amber-500 font-bold">*</span>
                                </span>
                                <input
                                  type="text"
                                  value={lastProfession}
                                  onChange={(e) => setLastProfession(e.target.value)}
                                  required
                                  maxLength={200}
                                  placeholder={
                                    pt
                                      ? currentConfig.lastProfessionPlaceholder.pt
                                      : currentConfig.lastProfessionPlaceholder.en
                                  }
                                  className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                                />
                              </label>
                            </div>
                          </>
                        )}

                        {error && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                            {error}
                          </div>
                        )}

                        <div className="pt-4 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-xs font-semibold text-foreground hover:bg-foreground/[0.04] transition-all cursor-pointer"
                          >
                            <ArrowLeft size={15} />
                            <span>{t("Back", "Voltar")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-xs font-bold text-background shadow-sm hover:bg-foreground/90 transition-all cursor-pointer"
                          >
                            <span>{t("Continue to Section 3", "Continuar para a Secção 3")}</span>
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ────────────────── SECTION 3: PLATFORMS & LOGISTICS (OR CV FOR STANDARD) ────────────────── */}
                    {currentStep === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        {isTechnicalManager ? (
                          <>
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                <Cpu size={16} className="text-foreground/70" />
                                {t("Platforms & Advanced Technologies", "Plataformas & Tecnologias Avançadas")}
                              </h4>
                              <span className="text-[10px] font-mono text-muted">
                                {t("Step 3 of", "Passo 3 de")} {totalSteps}
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {renderYesNo(
                                t("Hikvision experience (Cameras, NVRs, iVMS, Hik-Connect)", "Experiência Hikvision (Câmaras, NVRs, iVMS, Hik-Connect)"),
                                hikvision,
                                setHikvision,
                                false
                              )}

                              {renderYesNo(
                                t("Dahua experience (SmartPSS, DSS, NVRs, TiOC)", "Experiência Dahua (SmartPSS, DSS, NVRs, TiOC)"),
                                dahua,
                                setDahua,
                                false
                              )}

                              {renderYesNo(
                                t("AI-enabled cameras & video analytics", "Câmaras com IA e analítica inteligente de vídeo"),
                                aiAnalytics,
                                setAiAnalytics,
                                false,
                                t("Tripwire, perimeter protection, human/vehicle classification", "Cruzamento de linhas, protecção perimetral, classificação de alvos")
                              )}

                              {renderYesNo(
                                t("Remote monitoring centre integration", "Integração com centrais de monitorização remota"),
                                remoteMonitoring,
                                setRemoteMonitoring,
                                false,
                                t("Integrating camera feeds with live control rooms", "Transmissão e integração com centros de controlo ao vivo")
                              )}

                              {renderYesNo(
                                t("Preparing technical scopes of work & BoQs", "Elaboração de cadernos de encargos técnicos e BoQs"),
                                boqScopes,
                                setBoqScopes,
                                false,
                                t("Equipment lists, bills of quantities, site survey documentation", "Listas de material, dimensionamento e documentação técnica")
                              )}

                              {renderYesNo(
                                t("Experience supervising or managing technical teams", "Experiência em supervisão ou gestão de equipas técnicas"),
                                supervision,
                                setSupervision,
                                false,
                                t("Directing installers, technicians and site subcontractors", "Orientação de instaladores, técnicos e subempreiteiros em obra")
                              )}

                              {renderYesNo(
                                t("Valid driving licence (Carta de Condução)", "Carta de condução válida"),
                                drivingLicence,
                                setDrivingLicence,
                                false
                              )}
                            </div>

                            <div className="border-t border-border/80 pt-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 mb-3">
                                <Briefcase size={14} className="text-foreground/70" />
                                {t("Availability & Remuneration", "Disponibilidade & Remuneração")}
                              </h4>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className="space-y-1.5 block">
                                  <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                                    <Calendar size={13} className="text-muted" />
                                    {t("Availability / Start Date", "Disponibilidade / Data de Início")}{" "}
                                    <span className="text-amber-500 font-bold">*</span>
                                  </span>
                                  <select
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                                  >
                                    <option value="immediate">{t("Immediate availability", "Disponibilidade Imediata")}</option>
                                    <option value="2_weeks">{t("Within 2 weeks", "Dentro de 2 semanas")}</option>
                                    <option value="1_month">{t("1 month notice", "1 mês de aviso prévio")}</option>
                                    <option value="more_than_month">{t("More than 1 month", "Mais de 1 mês")}</option>
                                  </select>
                                </label>

                                <label className="space-y-1.5 block">
                                  <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                                    <DollarSign size={13} className="text-muted" />
                                    {t("Current / Expected Monthly Salary (MZN)", "Salário Mensal Actual / Pretendido (MZN)")}
                                  </span>
                                  <input
                                    type="text"
                                    value={salaryExpectation}
                                    onChange={(e) => setSalaryExpectation(e.target.value)}
                                    placeholder={t("e.g. 50,000 MZN or Negotiable", "ex.: 50.000 MZN ou A negociar")}
                                    className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                                  />
                                </label>
                              </div>
                            </div>

                            {error && (
                              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                                {error}
                              </div>
                            )}

                            <div className="pt-4 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={handlePrevStep}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-xs font-semibold text-foreground hover:bg-foreground/[0.04] transition-all cursor-pointer"
                              >
                                <ArrowLeft size={15} />
                                <span>{t("Back", "Voltar")}</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleNextStep}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-xs font-bold text-background shadow-sm hover:bg-foreground/90 transition-all cursor-pointer"
                              >
                                <span>{t("Continue to Section 4", "Continuar para a Secção 4")}</span>
                                <ArrowRight size={15} />
                              </button>
                            </div>
                          </>
                        ) : (
                          /* Standard Role Final Step: Cover Letter & CV Upload */
                          <>
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                <Upload size={16} className="text-foreground/70" />
                                {t("Cover Letter & Curriculum Vitae", "Carta de Apresentação & Currículo")}
                              </h4>
                              <span className="text-[10px] font-mono text-muted">
                                {t("Final Step 3 of 3", "Passo Final 3 de 3")}
                              </span>
                            </div>

                            {/* Cover Letter */}
                            <label className="space-y-1.5 block">
                              <span className="text-xs font-semibold text-foreground/90">
                                {t("Cover letter / personal summary", "Carta de apresentação / resumo pessoal")}{" "}
                                <span className="text-muted text-[11px]">({t("Optional", "Opcional")})</span>
                              </span>
                              <textarea
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                rows={3}
                                maxLength={3000}
                                placeholder={
                                  pt
                                    ? currentConfig.coverLetterPlaceholder.pt
                                    : currentConfig.coverLetterPlaceholder.en
                                }
                                className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 leading-relaxed transition-colors"
                              />
                            </label>

                            {/* CV Upload */}
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                                {t("Curriculum Vitae (CV)", "Currículo (CV)")}{" "}
                                <span className="text-amber-500 font-bold">*</span>
                              </span>
                              <label
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  selectFile(e.dataTransfer.files[0]);
                                }}
                                className={`relative flex min-h-[130px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                                  file
                                    ? "border-emerald-500/60 bg-emerald-500/[0.04]"
                                    : "border-border bg-background hover:border-foreground/40 hover:bg-foreground/[0.02]"
                                }`}
                              >
                                <Upload
                                  size={26}
                                  className={file ? "text-emerald-500 mb-2" : "text-muted mb-2"}
                                />
                                <strong className="text-sm font-semibold text-foreground">
                                  {file
                                    ? file.name
                                    : t("Drop your CV here or click to browse", "Arraste o seu CV para aqui ou clique para selecionar")}
                                </strong>
                                <span className="mt-1 text-xs text-muted">
                                  {file
                                    ? `${(file.size / 1024).toFixed(0)} KB · ${t("Click to replace", "Clique para substituir")}`
                                    : "PDF, DOC, DOCX · Max. 3 MB"}
                                </span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => selectFile(e.target.files?.[0])}
                                  className="sr-only"
                                />
                              </label>
                            </div>

                            {error && (
                              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                                {error}
                              </div>
                            )}

                            <div className="pt-4 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={handlePrevStep}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-xs font-semibold text-foreground hover:bg-foreground/[0.04] transition-all cursor-pointer"
                              >
                                <ArrowLeft size={15} />
                                <span>{t("Back", "Voltar")}</span>
                              </button>

                              <button
                                type="submit"
                                disabled={busy || isSelectedRoleClosed || !connection}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-xs font-bold text-background shadow-lg hover:bg-foreground/90 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                                <span>{busy ? t("Submitting…", "A submeter…") : t("Submit Application", "Submeter Candidatura")}</span>
                                {!busy && <ArrowRight size={15} />}
                              </button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* ────────────────── SECTION 4: PROJECT EXPERIENCE (TECHNICAL MANAGER) ────────────────── */}
                    {isTechnicalManager && currentStep === 4 && (
                      <motion.div
                        key="step-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Layers size={16} className="text-foreground/70" />
                            {t("Practical Project Experience", "Experiência Prática em Projectos")}
                          </h4>
                          <span className="text-[10px] font-mono text-muted">
                            {t("Step 4 of", "Passo 4 de")} {totalSteps}
                          </span>
                        </div>

                        {/* Project Showcase Question */}
                        <label className="space-y-2 block">
                          <span className="text-xs font-semibold text-foreground/90 leading-relaxed block">
                            {t(
                              "Briefly describe the largest CCTV installation you have personally managed or installed, including the approximate number of cameras and your responsibilities:",
                              "Descreva brevemente a maior instalação de CCTV que geriu ou instalou pessoalmente, incluindo o número aproximado de câmaras e as suas responsabilidades:",
                            )}{" "}
                            <span className="text-amber-500 font-bold">*</span>
                          </span>
                          <textarea
                            value={largestProjectDescription}
                            onChange={(e) => setLargestProjectDescription(e.target.value)}
                            required
                            rows={5}
                            maxLength={4000}
                            placeholder={t(
                              "Mention the client type (commercial, industrial, residential), approximate number of cameras, equipment brands used, networking challenges, and your role in installation/supervision...",
                              "Indique o tipo de cliente (comercial, industrial, residencial), número aproximado de câmaras, marcas de equipamentos, desafios de rede e a sua função na instalação/supervisão...",
                            )}
                            className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 leading-relaxed transition-colors"
                          />
                        </label>

                        {/* Cover letter / summary */}
                        <label className="space-y-1.5 block pt-2 border-t border-border/80">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground/90">
                              {t("Cover Letter / Professional Summary", "Carta de Apresentação / Resumo Profissional")}
                            </span>
                            <span className="text-[10px] text-muted">{t("Recommended", "Recomendado")}</span>
                          </div>
                          <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={3}
                            maxLength={3000}
                            placeholder={t(
                              "Highlight your hands-on technical background, team leadership capabilities, and why you are the ideal candidate to lead Overwatch's technical installations...",
                              "Destaque o seu percurso técnico no terreno, capacidades de liderança de equipas e por que razão é o(a) candidato(a) ideal para liderar as instalações técnicas da Overwatch...",
                            )}
                            className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 leading-relaxed transition-colors"
                          />
                        </label>

                        {error && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                            {error}
                          </div>
                        )}

                        <div className="pt-4 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-xs font-semibold text-foreground hover:bg-foreground/[0.04] transition-all cursor-pointer"
                          >
                            <ArrowLeft size={15} />
                            <span>{t("Back", "Voltar")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-xs font-bold text-background shadow-sm hover:bg-foreground/90 transition-all cursor-pointer"
                          >
                            <span>{t("Continue to Final Step (CV Upload)", "Continuar para o Passo Final (CV)")}</span>
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ────────────────── SECTION 5: CV UPLOAD & FINAL SUBMISSION (TECHNICAL MANAGER) ────────────────── */}
                    {isTechnicalManager && currentStep === 5 && (
                      <motion.div
                        key="step-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <Upload size={16} className="text-foreground/70" />
                            {t("Curriculum Vitae (CV) & Final Submission", "Currículo (CV) & Envio da Candidatura")}
                          </h4>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                            {t("Final Section 5 of 5", "Secção Final 5 de 5")}
                          </span>
                        </div>

                        {/* CV Dropzone */}
                        <div className="space-y-2">
                          <label
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              selectFile(e.dataTransfer.files[0]);
                            }}
                            className={`relative flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                              file
                                ? "border-emerald-500/60 bg-emerald-500/[0.04]"
                                : "border-border bg-background hover:border-foreground/40 hover:bg-foreground/[0.02]"
                            }`}
                          >
                            <Upload
                              size={28}
                              className={file ? "text-emerald-500 mb-2" : "text-muted mb-2"}
                            />
                            <strong className="text-sm font-semibold text-foreground">
                              {file
                                ? file.name
                                : t("Drop your CV here or click to browse", "Arraste o seu CV para aqui ou clique para selecionar")}
                            </strong>
                            <span className="mt-1 text-xs text-muted">
                              {file
                                ? `${(file.size / 1024).toFixed(0)} KB · ${t("Click to replace file", "Clique para substituir ficheiro")}`
                                : "PDF, DOC, DOCX · Max. 3 MB"}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => selectFile(e.target.files?.[0])}
                              className="sr-only"
                            />
                          </label>
                        </div>

                        {/* Candidate Summary Verification Card */}
                        <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-2 text-xs">
                          <div className="font-bold text-foreground flex items-center justify-between border-b border-border/80 pb-2">
                            <span>{t("Application Summary", "Resumo da Candidatura")}</span>
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                              <CheckCircle2 size={13} /> {t("Ready to Submit", "Pronto a Enviar")}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-muted pt-1">
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-muted/70">{t("Candidate", "Candidato")}</span>
                              <strong className="text-foreground">{name || "—"}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-muted/70">{t("Location", "Localização")}</span>
                              <strong className="text-foreground">{currentLocation || "—"}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-muted/70">{t("Experience", "Experiência")}</span>
                              <strong className="text-foreground">{yearsCctvExperience || "—"} {t("years", "anos")}</strong>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-bold text-muted/70">{t("Contact", "Contacto")}</span>
                              <strong className="text-foreground">{whatsapp || "—"}</strong>
                            </div>
                          </div>
                        </div>

                        {error && (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                            {error}
                          </div>
                        )}

                        {!connection && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                            {t(
                              "Re-checking role availability. Submission will be enabled once verified.",
                              "A verificar disponibilidade. O envio será ativado quando a ligação for validada.",
                            )}
                          </div>
                        )}

                        <div className="pt-4 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-xs font-semibold text-foreground hover:bg-foreground/[0.04] transition-all cursor-pointer"
                          >
                            <ArrowLeft size={15} />
                            <span>{t("Back", "Voltar")}</span>
                          </button>

                          <button
                            type="submit"
                            disabled={busy || isSelectedRoleClosed || !connection}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-xs font-bold text-background shadow-lg hover:bg-foreground/90 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                            <span>
                              {busy
                                ? t("Submitting your application…", "A submeter candidatura…")
                                : t("Submit Application", "Submeter Candidatura")}
                            </span>
                            {!busy && <ArrowRight size={15} />}
                          </button>
                        </div>

                        <p className="text-center text-[0.72rem] leading-relaxed text-muted pt-2">
                          {t(
                            "By submitting, you confirm that the technical information provided is accurate and agree to our ",
                            "Ao submeter, confirma a veracidade das informações técnicas prestadas e aceita a nossa ",
                          )}
                          <a
                            href={pt ? "/pt/privacy" : "/en/privacy"}
                            className="font-medium text-foreground underline hover:text-foreground/80"
                          >
                            {t("privacy policy", "política de privacidade")}
                          </a>
                          .
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
