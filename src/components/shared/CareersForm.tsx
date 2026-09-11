"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  FileText,
  LockKeyhole,
  Loader2,
  Radio,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import { type Role, MAX_CV } from "@/lib/careers";
import { darkEyebrowClassName } from "@/components/ui/eyebrow";
import TechGrid from "@/components/ui/TechGrid";

export default function CareersForm({
  initialLocale,
}: {
  initialLocale?: string;
} = {}) {
  const activeLocale = useLocale();
  const locale = initialLocale || activeLocale;
  const pt = locale === "pt";
  const t = (en: string, po: string) => (pt ? po : en);

  const [roles, setRoles] = useState<Role[]>([
    { id: "cctv", en: "CCTV Operator", pt: "Operadora de CCTV", open: true },
    {
      id: "operations",
      en: "Security Operations Manager",
      pt: "Gestor de Operações de Segurança",
      open: false,
    },
    {
      id: "technical",
      en: "Technical Support Specialist",
      pt: "Especialista de Suporte Técnico",
      open: false,
    },
    {
      id: "sales",
      en: "Sales & Business Development",
      pt: "Vendas e Desenvolvimento de Negócios",
      open: false,
    },
  ]);
  const [selectedRoleId, setSelectedRoleId] = useState("cctv");
  const [error, setError] = useState("");
  const [connection, setConnection] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Form field state
  const [grade12, setGrade12] = useState<"yes" | "no" | "">("");
  const [sex, setSex] = useState<"female" | "male" | "">("");
  const [ai, setAi] = useState<"yes" | "no" | "">("");
  const [experience, setExperience] = useState<"yes" | "no" | "">("");
  const [shifts, setShifts] = useState<"yes" | "no" | "">("");

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

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const isSelectedRoleClosed = roles.length > 0 && !selectedRole?.open;

  const closedText = t(
    "This position is currently closed for applications. Please choose an open role like CCTV Operator.",
    "Esta função não se encontra aberta a candidaturas no momento. Por favor, selecione uma vaga aberta como Operadora de CCTV.",
  );

  function handleSelectRole(roleItem: Role) {
    setSelectedRoleId(roleItem.id);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isSelectedRoleClosed) {
      setError(closedText);
      return;
    }

    if (!grade12 || !sex || !ai || !experience || !shifts) {
      setError(
        t(
          "Please answer all required questions before submitting.",
          "Por favor responda a todas as questões obrigatórias antes de submeter.",
        ),
      );
      return;
    }

    if (!file) {
      setError(t("Please attach your CV.", "Por favor, anexe o seu CV."));
      return;
    }

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    formData.set("cv", file);
    formData.set("role", selectedRoleId);
    formData.set("locale", pt ? "pt" : "en");
    formData.set("grade12", grade12);
    formData.set("sex", sex);
    formData.set("ai", ai);
    formData.set("experience", experience);
    formData.set("shifts", shifts);

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
  ) => (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
        {label} <span className="text-foreground/40">*</span>
      </span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("yes")}
          className={`min-h-11 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
            value === "yes"
              ? "border-foreground bg-foreground text-background shadow-sm font-bold"
              : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]"
          }`}
        >
          {t("Yes", "Sim")}
        </button>
        <button
          type="button"
          onClick={() => onChange("no")}
          className={`min-h-11 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
            value === "no"
              ? "border-foreground bg-foreground text-background shadow-sm font-bold"
              : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]"
          }`}
        >
          {t("No", "Não")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="dark relative isolate overflow-hidden bg-[#090d16] pb-16 pt-28 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
        {/* Authentic Physical Security / CCTV Control Room Image */}
        <Image
          src="/careers-hero.jpg"
          alt="Overwatch CCTV Surveillance Control Center"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none object-cover object-center opacity-35 mix-blend-luminosity"
        />
        <TechGrid className="absolute inset-0 opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(to_bottom,transparent_45%,rgba(9,13,22,0.95))]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

              <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-xs font-medium text-white/80 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  {t(
                    "Accepting applications: CCTV Operator",
                    "A receber candidaturas: Operadora de CCTV",
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

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

            {/* Role Cards List (Clean, modern, no arbitrary numbers) */}
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
                      {r.id === "cctv"
                        ? t(
                            "Surveillance & Incident Monitoring · 2 Days, 2 Nights, 2 Days Off rotation",
                            "Monitorização CCTV e Despacho de Incidentes · Escala 2 Dias, 2 Noites e 2 Folgas",
                          )
                        : t(
                            "Integrated security and virtual guarding operations across Mozambique",
                            "Operações de proteção integrada e monitorização em Moçambique",
                          )}
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

            {/* Trust and Privacy Support Card (Matching FAQ style) */}
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
                    {t(
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
                        setFile(null);
                        setGrade12("");
                        setSex("");
                        setAi("");
                        setExperience("");
                        setShifts("");
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-xs font-semibold text-background transition-transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      {t("Submit another application", "Enviar outra candidatura")}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Main Application Form */
                <form onSubmit={submit} className="space-y-8">
                  {/* Form Header */}
                  <div className="border-b border-border/80 pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                          {t("Application Form", "Formulário de Candidatura")}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          {t(
                            "Complete all required details accurately.",
                            "Preencha todos os campos obrigatórios com rigor.",
                          )}
                        </p>
                      </div>

                      {/* Clean Role State Pill */}
                      <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
                        <span className="text-muted">{t("Position:", "Cargo:")}</span>
                        <strong className="font-semibold text-foreground">
                          {pt ? selectedRole.pt : selectedRole.en}
                        </strong>
                        {!selectedRole.open && (
                          <LockKeyhole size={13} className="text-amber-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Dados Pessoais / Personal Details */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                      <UserCheck size={16} className="text-foreground/70" />
                      {t("Personal Details", "Dados Pessoais")}
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Name */}
                      <label className="space-y-1.5 block sm:col-span-2">
                        <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                          {t("Full name", "Nome completo")}{" "}
                          <span className="text-foreground/40">*</span>
                        </span>
                        <input
                          name="name"
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
                          <span className="text-foreground/40">*</span>
                        </span>
                        <input
                          name="email"
                          type="email"
                          required
                          maxLength={254}
                          autoComplete="email"
                          placeholder="exemplo@dominio.com"
                          className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                        />
                      </label>

                      {/* WhatsApp */}
                      <label className="space-y-1.5 block">
                        <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                          {t("WhatsApp contact", "Contacto de WhatsApp")}{" "}
                          <span className="text-foreground/40">*</span>
                        </span>
                        <input
                          name="whatsapp"
                          type="tel"
                          required
                          pattern="\+?[0-9 ()\-]{7,25}"
                          autoComplete="tel"
                          placeholder="+258 84 000 0000"
                          className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                        />
                      </label>

                      {/* Sex */}
                      <div className="space-y-2 sm:col-span-2">
                        <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                          {t("Sex", "Sexo")}{" "}
                          <span className="text-foreground/40">*</span>
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setSex("female")}
                            className={`min-h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              sex === "female"
                                ? "border-foreground bg-foreground text-background shadow-sm font-bold"
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
                                ? "border-foreground bg-foreground text-background shadow-sm font-bold"
                                : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]"
                            }`}
                          >
                            {t("Male", "Masculino")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Cargo e Experiência / Role & Experience */}
                  <div className="space-y-4 border-t border-border/80 pt-6">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                      <Radio size={16} className="text-foreground/70" />
                      {t("Role & Experience", "Cargo e Experiência")}
                    </h4>

                    {/* Position Selector */}
                    <label className="space-y-1.5 block">
                      <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                        {t("Selected position", "Cargo pretendido")}{" "}
                        <span className="text-foreground/40">*</span>
                      </span>
                      <select
                        value={selectedRoleId}
                        onChange={(e) => {
                          const r = roles.find((item) => item.id === e.target.value);
                          if (r) handleSelectRole(r);
                        }}
                        className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.open ? "✓ " : "🔒 "}
                            {pt ? r.pt : r.en}
                            {r.open
                              ? ""
                              : ` — ${t("Closed / Locked", "Encerrado")}`}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Specific Assessment Questions */}
                    <div className="grid gap-4 sm:grid-cols-2 pt-2">
                      {renderYesNo(
                        t(
                          "Have you completed Grade 12?",
                          "Concluiu a 12.ª classe?",
                        ),
                        grade12,
                        setGrade12,
                      )}

                      {renderYesNo(
                        t(
                          "Do you know how to use Artificial Intelligence?",
                          "Sabe usar inteligência artificial?",
                        ),
                        ai,
                        setAi,
                      )}

                      {renderYesNo(
                        t(
                          "Do you have CCTV or security experience?",
                          "Tem experiência em CCTV ou segurança?",
                        ),
                        experience,
                        setExperience,
                      )}

                      {renderYesNo(
                        t(
                          "Available for 2 days, 2 nights, 2 days off shifts?",
                          "Disponível para escala 2 dias, 2 noites, 2 folgas?",
                        ),
                        shifts,
                        setShifts,
                      )}

                      {/* Last Profession */}
                      <label className="space-y-1.5 block sm:col-span-2">
                        <span className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                          {t("Most recent profession", "Última profissão exercida")}{" "}
                          <span className="text-foreground/40">*</span>
                        </span>
                        <input
                          name="lastProfession"
                          required
                          maxLength={200}
                          placeholder={t(
                            "e.g. CCTV Operator, Security Guard, or 'No previous experience'",
                            "ex: Operadora de CCTV, Vigilante, ou 'Sem experiência prévia'",
                          )}
                          className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-colors"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Section: Carta de Apresentação / Cover Letter */}
                  <div className="space-y-3 border-t border-border/80 pt-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <FileText size={16} className="text-foreground/70" />
                        {t("Cover Letter", "Carta de Apresentação")}
                      </h4>
                      <span className="text-[0.7rem] text-muted">
                        {t("Recommended", "Recomendado")}
                      </span>
                    </div>

                    <label className="space-y-1.5 block">
                      <span className="text-xs font-semibold text-foreground/90">
                        {t(
                          "Tell us about yourself and your motivation",
                          "Fale-nos sobre si e sobre a sua motivação para trabalhar na Overwatch",
                        )}
                      </span>
                      <textarea
                        name="coverLetter"
                        rows={4}
                        maxLength={3000}
                        placeholder={t(
                          "Write a brief introduction about your career, personal qualities, and why you believe you are a great fit for this position...",
                          "Escreva uma breve apresentação sobre o seu percurso, as suas qualidades de atenção e vigilância, e por que razão considera ser a pessoa certa para esta função...",
                        )}
                        className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10 leading-relaxed transition-colors"
                      />
                    </label>
                  </div>

                  {/* Section: Currículo (CV) */}
                  <div className="space-y-3 border-t border-border/80 pt-6">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                      <Upload size={16} className="text-foreground/70" />
                      {t("Curriculum Vitae (CV)", "Currículo (CV)")}{" "}
                      <span className="text-foreground/40">*</span>
                    </h4>

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
                        className={
                          file ? "text-emerald-500 mb-2" : "text-muted mb-2"
                        }
                      />
                      <strong className="text-sm font-semibold text-foreground">
                        {file
                          ? file.name
                          : t(
                              "Drop your CV here or click to browse",
                              "Arraste o seu CV para aqui ou clique para selecionar",
                            )}
                      </strong>
                      <span className="mt-1 text-xs text-muted">
                        {file
                          ? `${(file.size / 1024).toFixed(0)} KB · ${t(
                              "Click to replace file",
                              "Clique para substituir ficheiro",
                            )}`
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

                  {/* Error Notification */}
                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                      {error}
                    </div>
                  )}

                  {/* Connection Notification */}
                  {!connection && (
                    <div
                      role="status"
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
                    >
                      {t(
                        "Re-checking role availability. Submission will be enabled once verified.",
                        "A verificar disponibilidade. O envio será ativado quando a ligação for validada.",
                      )}
                    </div>
                  )}

                  {/* Submit Button (Overwatch high-contrast design) */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={busy || isSelectedRoleClosed || !connection}
                      className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-bold text-background shadow-lg hover:bg-foreground/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {busy ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : null}
                      <span>
                        {busy
                          ? t("Submitting your application…", "A submeter candidatura…")
                          : t("Submit Application", "Submeter Candidatura")}
                      </span>
                      {!busy && <ArrowRight size={17} />}
                    </button>
                  </div>

                  {/* Privacy note */}
                  <p className="text-center text-[0.75rem] leading-relaxed text-muted">
                    {t(
                      "By applying, you agree to Overwatch recruitment processing your information in accordance with our ",
                      "Ao candidatar-se, autoriza a Overwatch a tratar as informações partilhadas para efeitos de recrutamento, conforme a nossa ",
                    )}
                    <a
                      href={pt ? "/pt/privacy" : "/en/privacy"}
                      className="font-medium text-foreground underline hover:text-foreground/80"
                    >
                      {t("privacy policy", "política de privacidade")}
                    </a>
                    .
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
