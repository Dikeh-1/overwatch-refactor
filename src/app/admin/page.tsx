"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, type FormEvent } from "react";
import {
  ArrowUpRight,
  LayoutDashboard,
  Users,
  LockKeyhole,
  UnlockKeyhole,
  Search,
  Download,
  X,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  ArrowRight,
  RefreshCw,
  FileText,
  Phone,
  ExternalLink,
  Eye,
  Mail,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  CalendarCheck,
  Clock,
  UserCheck,
  Globe,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import TechGrid from "@/components/ui/TechGrid";
import LazyVideo from "@/components/ui/LazyVideo";
import DocxViewer from "@/components/admin/DocxViewer";
import { IMAGES } from "@/lib/constants";
import {
  type Application,
  type Role,
  stages,
  DEFAULT_TEST_SLOTS,
} from "@/lib/careers";
import { siteContact } from "@/lib/site-config";
import "./admin.css";

const stageLabels: Record<"en" | "pt", Record<string, string>> = {
  en: {
    new: "New",
    reviewing: "In review",
    shortlisted: "Shortlisted",
    interview: "Interview",
    hired: "Hired",
    rejected: "Not selected",
  },
  pt: {
    new: "Novo",
    reviewing: "Em análise",
    shortlisted: "Pré-selecionado",
    interview: "Entrevista",
    hired: "Contratado",
    rejected: "Não selecionado",
  },
};

export default function AdminPage() {
  const [lang, setLang] = useState<"en" | "pt">("en");
  const [auth, setAuth] = useState<boolean | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [view, setView] = useState<
    "applications" | "roles" | "broadcast" | "schedule"
  >("applications");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState("");

  // Load language preference
  useEffect(() => {
    const saved = localStorage.getItem("overwatch_admin_lang");
    if (saved === "pt" || saved === "en") {
      setLang(saved);
    }
  }, []);

  const handleSetLang = (l: "en" | "pt") => {
    setLang(l);
    localStorage.setItem("overwatch_admin_lang", l);
  };

  const t = (enStr: string, ptStr: string) => (lang === "en" ? enStr : ptStr);

  // ─── Convocatórias (Broadcast) State ──────────────────────────────
  const [presetFilter, setPresetFilter] = useState<
    "target" | "women" | "men_exp" | "cctv" | "all"
  >("target");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState(
    "Convocatória: Teste de Selecção Presencial — Overwatch Moçambique",
  );
  const [broadcastMessage, setBroadcastMessage] = useState(
`Boa tarde {{name}},

Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.

Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: teste de selecção presencial.

Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do link pessoal no botão abaixo.

Após a sua selecção, a sua vaga fica automaticamente confirmada no nosso sistema.

Atenciosamente,
Equipa de Recrutamento
Overwatch Moçambique`
  );
  const [broadcastSlots] = useState<string[]>([...DEFAULT_TEST_SLOTS]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    count: number;
    failed: number;
  } | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [emailPreviewTab, setEmailPreviewTab] = useState<"edit" | "preview">(
    "edit",
  );

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/careers", { cache: "no-store" });
      if (r.status === 401) {
        setAuth(false);
        return;
      }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(
          d.details ||
            d.error ||
            "Could not load applications. Please check connection.",
        );
      }
      const d = await r.json();
      setApplications(d.applications || []);
      setRoles(d.roles || []);
      setUpdated(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAuth(d.authenticated))
      .catch(() => {
        setAuth(false);
        setError("Could not connect to session service.");
      });
  }, []);

  useEffect(() => {
    if (!auth) return;
    const initial = setTimeout(load, 0);
    const timer = setInterval(load, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [auth, load]);

  useEffect(() => {
    if (!selected) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [selected]);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get("password"),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Login failed");
      setAuth(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function change(data: object) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Change could not be saved.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const roleLabel = (id: string) =>
    (lang === "pt"
      ? roles.find((r) => r.id === id)?.pt || roles.find((r) => r.id === id)?.en
      : roles.find((r) => r.id === id)?.en || roles.find((r) => r.id === id)?.pt) ||
    id;

  const filtered = applications.filter(
    (a) =>
      (stageFilter === "all" || a.status === stageFilter) &&
      (roleFilter === "all" || a.role === roleFilter) &&
      `${a.name} ${a.email} ${a.whatsapp} ${a.lastProfession} ${a.coverLetter || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  // ─── Filtered Audience for Convocatórias ───────────────────────────
  const broadcastAudience = useMemo(() => {
    return applications.filter((a) => {
      if (presetFilter === "target") {
        return (
          a.sex === "female" ||
          (a.sex === "male" && a.experience === "yes")
        );
      }
      if (presetFilter === "women") return a.sex === "female";
      if (presetFilter === "men_exp")
        return a.sex === "male" && a.experience === "yes";
      if (presetFilter === "cctv") return a.role === "cctv";
      return true;
    });
  }, [applications, presetFilter]);

  // Sync selected candidates when switching presets or when applications load
  useEffect(() => {
    const defaultSelected = broadcastAudience.map((a) => a.id);
    setSelectedCandidateIds(defaultSelected);
  }, [broadcastAudience]);

  function toggleSelectAllBroadcast() {
    if (selectedCandidateIds.length === broadcastAudience.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(broadcastAudience.map((a) => a.id));
    }
  }

  function toggleSelectCandidate(id: string) {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSendBroadcast() {
    if (selectedCandidateIds.length === 0) return;
    setSendingBroadcast(true);
    setBroadcastResult(null);
    try {
      const res = await fetch("/api/admin/careers/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          subject: broadcastSubject,
          messageText: broadcastMessage,
          slots: broadcastSlots,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch test invitations.");
      }

      setBroadcastResult({
        success: true,
        count: data.count || 0,
        failed: data.failed || 0,
      });
      setConfirmModalOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function sendSingleInvite(candidateId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/careers/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: [candidateId],
          subject: broadcastSubject,
          messageText: broadcastMessage,
          slots: broadcastSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch invitation.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function copyBookingLink(id: string) {
    const origin = window.location.origin;
    const link = `${origin}/pt/careers/test-invite/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2500);
  }

  function exportCSV() {
    if (!applications.length) return;
    const keys: (keyof Application)[] = [
      "id",
      "createdAt",
      "name",
      "email",
      "whatsapp",
      "role",
      "status",
      "grade12",
      "sex",
      "ai",
      "experience",
      "lastProfession",
      "shifts",
      "coverLetter",
      "locale",
      "cvName",
      "cvSize",
    ];
    const cell = (v: unknown) =>
      `"${String(v ?? "")
        .replace(/^[=+\-@\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const csvContent =
      "\uFEFF" +
      [
        keys.join(","),
        ...filtered.map((a) => keys.map((k) => cell(a[k])).join(",")),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overwatch-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAttendanceCSV(slotFilter?: string) {
    const targetApps = applications.filter((a) =>
      slotFilter ? a.testSlot === slotFilter : Boolean(a.testSlot),
    );
    if (!targetApps.length) {
      alert(t("No confirmed candidates found for this slot filter.", "Nenhum candidato com teste confirmado para este filtro."));
      return;
    }

    const headers = [
      t("Test Slot / Date", "Turno / Data do Teste"),
      t("Full Name", "Nome Completo"),
      t("WhatsApp", "WhatsApp"),
      t("Email", "Email"),
      t("Gender", "Género"),
      t("CCTV Experience", "Experiência CCTV"),
      t("12th Grade Completed", "12.ª Classe Concluída"),
      t("Confirmation Date", "Data de Confirmação"),
      t("Attendance Signature", "Assinatura de Presença"),
    ];

    const rows = targetApps.map((a) => [
      `"${(a.testSlot || "").replace(/"/g, '""')}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.whatsapp}"`,
      `"${a.email}"`,
      `"${a.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}"`,
      `"${a.experience === "yes" ? t("Yes", "Sim") : t("No", "Não")}"`,
      `"${a.grade12 === "yes" ? t("Yes", "Sim") : t("No", "Não")}"`,
      `"${a.testBookedAt ? new Date(a.testBookedAt).toLocaleString(lang === "pt" ? "pt-MZ" : "en-GB") : ""}"`,
      `""`, // Blank signature cell for physical sign-off sheet
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overwatch-attendance-roster-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Loading State
  if (auth === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#090d16] text-white">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <RefreshCw className="animate-spin text-white/80" size={20} />
          <span>{t("Connecting to Overwatch recruitment workspace…", "A ligar ao portal de recrutamento Overwatch…")}</span>
        </div>
      </main>
    );
  }

  // Unauthenticated Login Screen
  if (!auth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#090d16] text-white relative isolate overflow-hidden px-4 py-12">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <LazyVideo
            className="h-full w-full object-cover mix-blend-luminosity"
            poster={IMAGES.videoPoster}
            rootMargin="700px"
            src={IMAGES.videoSrc}
          />
        </div>
        <div className="absolute inset-0 bg-[#090d16]/80 z-0 pointer-events-none" />
        <TechGrid className="absolute inset-0 opacity-35 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none z-0" />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#121827]/95 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {/* Top Language Toggle */}
          <div className="flex justify-end mb-2">
            <div className="flex items-center rounded-xl bg-white/[0.06] border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleSetLang("en")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleSetLang("pt")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  lang === "pt"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                PT
              </button>
            </div>
          </div>

          <div className="text-center pb-6 border-b border-white/10">
            <div className="flex justify-center mb-4">
              <Logo size="md" variant="light" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white/80">
              <ShieldCheck size={13} />
              {t("Talent Operations Portal", "Portal de Operações de Recrutamento")}
            </span>
            <h1 className="mt-3 text-xl font-bold text-white tracking-tight">
              {t("Recruitment Workspace", "Área de Recrutamento")}
            </h1>
            <p className="mt-1 text-xs text-white/60">
              {t(
                "Sign in with your administrator key to review applications and manage candidates.",
                "Inicie sessão com a sua chave de administração para rever candidaturas e gerir vagas.",
              )}
            </p>
          </div>

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-left">
              <span className="text-xs font-semibold text-white/80">
                {t("Admin password", "Palavra-passe de administrador")}
              </span>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder={t("Enter administrator password", "Introduza a palavra-passe")}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15 transition-colors"
                />
              </div>
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#090d16] shadow-lg shadow-black/30 transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {busy ? <RefreshCw className="animate-spin" size={16} /> : null}
              <span>{busy ? t("Authenticating…", "A autenticar…") : t("Enter Workspace", "Entrar no Portal")}</span>
              {!busy && <ArrowRight size={16} />}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs text-white/50">
              <span className="flex items-center gap-1">
                <LockKeyhole size={12} /> {t("Confidential access", "Acesso reservado")}
              </span>
              <Link
                href="/en/careers"
                target="_blank"
                className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                {t("View Careers Page", "Ver Página de Carreiras")} <ExternalLink size={12} />
              </Link>
            </div>
          </form>
        </div>
      </main>
    );
  }

  const current = selected
    ? applications.find((a) => a.id === selected.id) || selected
    : null;

  const confirmedCount = applications.filter((a) => Boolean(a.testSlot)).length;
  const targetCount = applications.filter(
    (a) => a.sex === "female" || (a.sex === "male" && a.experience === "yes"),
  ).length;

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col lg:flex-row relative isolate overflow-x-hidden">
      <TechGrid className="fixed inset-0 opacity-25 pointer-events-none" />

      {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0e1320]/95 p-5 lg:p-6 flex flex-col z-20 backdrop-blur-md lg:sticky lg:top-0 lg:h-screen">
        <div className="pb-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="block">
              <Logo size="sm" variant="light" />
            </Link>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[0.68rem] font-bold uppercase tracking-widest text-white/60">
                {t("Talent Operations", "Operações de Recrutamento")}
              </span>
            </div>
          </div>
        </div>

        {/* Language Switcher in Sidebar */}
        <div className="mt-4 pt-1">
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/10 p-1 text-xs">
            <div className="flex items-center gap-1.5 pl-2 text-white/50 text-[0.68rem] font-semibold">
              <Globe size={12} />
              <span>{t("Language:", "Idioma:")}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSetLang("en")}
                className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-semibold transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleSetLang("pt")}
                className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-semibold transition-all cursor-pointer ${
                  lang === "pt"
                    ? "bg-white text-[#090d16] shadow-sm font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                PT
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-5 space-y-1.5">
          {/* Applications Tab */}
          <button
            onClick={() => setView("applications")}
            className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all cursor-pointer ${
              view === "applications"
                ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard size={17} />
              <span>{t("Applications", "Candidaturas")}</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                view === "applications"
                  ? "bg-white/25 text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {applications.length}
            </span>
          </button>

          {/* Convocatórias Tab */}
          <button
            onClick={() => setView("broadcast")}
            className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all cursor-pointer ${
              view === "broadcast"
                ? "bg-emerald-500/20 text-white border border-emerald-500/40 shadow-sm"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Mail size={17} className="text-emerald-400" />
              <span>{t("Convocations", "Convocatórias")}</span>
            </div>
            <span className="rounded-full bg-emerald-500/30 text-emerald-300 px-2 py-0.5 text-[0.65rem] font-bold">
              {targetCount} {t("Target", "Alvo")}
            </span>
          </button>

          {/* Agenda de Testes Tab */}
          <button
            onClick={() => setView("schedule")}
            className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all cursor-pointer ${
              view === "schedule"
                ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar size={17} className="text-cyan-400" />
              <span>{t("Test Schedule", "Agenda de Testes")}</span>
            </div>
            <span className="rounded-full bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[0.65rem] font-bold">
              {confirmedCount} {t("Booked", "Confirmados")}
            </span>
          </button>

          {/* Roles Tab */}
          <button
            onClick={() => setView("roles")}
            className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all cursor-pointer ${
              view === "roles"
                ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal size={17} />
              <span>{t("Manage Roles", "Gestão de Vagas")}</span>
            </div>
            <span className="text-[0.65rem] font-mono text-emerald-400">
              {roles.filter((r) => r.open).length} {t("open", "abertas")}
            </span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
          <a
            href="/en/careers"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white/70 hover:text-white hover:border-white/25 transition-all"
          >
            <span>{t("View live careers page", "Ver página de carreiras")}</span>
            <ArrowUpRight size={14} />
          </a>

          <button
            onClick={async () => {
              try {
                await fetch("/api/admin/session", { method: "DELETE" });
                setAuth(false);
                setApplications([]);
                setSelected(null);
              } catch {
                setError(t("Sign out failed", "Falha ao terminar sessão"));
              }
            }}
            className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>{t("Sign out", "Terminar sessão")}</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────────────────── */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
              <span>Overwatch</span>
              <span>/</span>
              <span className="text-white/90 capitalize">
                {view === "roles"
                  ? t("Manage Roles", "Gestão de Vagas")
                  : view === "broadcast"
                    ? t("Test Convocations", "Convocatórias de Teste")
                    : view === "schedule"
                      ? t("Selection Test Schedule", "Agenda de Testes Presenciais")
                      : t("Applications Pipeline", "Pipeline de Candidaturas")}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {view === "roles"
                ? t("Role Availability", "Disponibilidade de Vagas")
                : view === "broadcast"
                  ? t("Bulk Test Convocations", "Envio de Convocatórias em Massa")
                  : view === "schedule"
                    ? t("Selection Test Attendance Roster", "Agenda de Testes Presenciais")
                    : t("Candidate Recruitment Pipeline", "Pipeline de Recrutamento")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher in Header */}
            <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleSetLang("en")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-white text-[#090d16] font-bold shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleSetLang("pt")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  lang === "pt"
                    ? "bg-white text-[#090d16] font-bold shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                PT
              </button>
            </div>

            <button
              onClick={() => void load()}
              aria-label="Refresh data"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              <span>{updated ? `${t("Updated", "Atualizado às")} ${updated}` : t("Refresh", "Atualizar")}</span>
            </button>

            {view === "applications" && (
              <button
                onClick={exportCSV}
                disabled={!filtered.length}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#090d16] shadow-sm hover:bg-white/90 disabled:opacity-50 cursor-pointer transition-transform hover:-translate-y-0.5"
              >
                <Download size={14} />
                <span>{t("Export CSV", "Exportar CSV")}</span>
              </button>
            )}

            {view === "schedule" && (
              <button
                onClick={() => exportAttendanceCSV()}
                disabled={!confirmedCount}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-[#090d16] shadow-sm hover:bg-emerald-400 disabled:opacity-50 cursor-pointer transition-transform hover:-translate-y-0.5"
              >
                <Download size={14} />
                <span>{t("Export Attendance Sheet (CSV)", "Exportar Lista de Presenças (CSV)")}</span>
              </button>
            )}
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-400"
          >
            {error}
          </div>
        )}

        {/* ─── STATS CARDS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>{t("Total Applicants", "Total de Candidatos")}</span>
              <Users size={16} className="text-white/70" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-white">
              {applications.length}
            </strong>
            <span className="text-[0.7rem] text-white/40">
              {t("All registered candidates", "Todos os candidatos inscritos")}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>{t("Eligible for Selection Test", "Elegíveis para Teste")}</span>
              <UserCheck size={16} className="text-emerald-400" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-emerald-400">
              {targetCount}
            </strong>
            <span className="text-[0.7rem] text-white/40">
              {t("Women + Men w/ CCTV Exp.", "Mulheres + Homens c/ Exp.")}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>{t("Confirmed Tests", "Testes Confirmados")}</span>
              <CalendarCheck size={16} className="text-cyan-400" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-cyan-400">
              {confirmedCount}
            </strong>
            <span className="text-[0.7rem] text-white/40">
              {t("Date selected by candidate", "Presença marcada pelo candidato")}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>{t("Open Roles", "Vagas Abertas")}</span>
              <UnlockKeyhole size={16} className="text-white/70" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-white">
              {roles.filter((r) => r.open).length}
            </strong>
            <span className="text-[0.7rem] text-white/40">
              {t(`Of ${roles.length} total roles`, `De ${roles.length} vagas no total`)}
            </span>
          </div>
        </div>

        {/* ─── TAB 1: MANAGE ROLES VIEW ─────────────────────────────── */}
        {view === "roles" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">
                  {t("Public Role Availability", "Disponibilidade Pública das Vagas")}
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  {t(
                    "Toggle roles open or closed. Locked roles will show a padlock icon on the careers page and prevent submissions.",
                    "Abra ou tranque vagas. Vagas trancadas mostrarão um cadeado na página de carreiras e impedirão candidaturas.",
                  )}
                </p>
              </div>

              <div className="space-y-3">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                          r.open
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-white/10 bg-white/[0.05] text-white/50"
                        }`}
                      >
                        {r.open ? (
                          <UnlockKeyhole size={19} />
                        ) : (
                          <LockKeyhole size={19} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {lang === "pt" ? r.pt : r.en}
                        </h3>
                        <p className="text-xs text-white/50">
                          {lang === "pt" ? r.en : r.pt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`text-xs font-semibold ${
                          r.open ? "text-emerald-400" : "text-white/40"
                        }`}
                      >
                        {r.open ? t("Accepting applications", "A receber candidaturas") : t("Locked / Closed", "Trancada / Fechada")}
                      </span>

                      <button
                        role="switch"
                        aria-checked={r.open}
                        disabled={busy}
                        onClick={() =>
                          void change({
                            kind: "role",
                            id: r.id,
                            open: !r.open,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          r.open ? "bg-emerald-600" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            r.open ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-white/15 bg-white/[0.04] p-4 text-xs text-white/80">
                <span className="font-semibold text-white">{t("Live synchronization:", "Sincronização em tempo real:")}</span>{" "}
                {t(
                  "Changes save instantly to database and sync to the live careers page within seconds.",
                  "As alterações guardam instantaneamente na base de dados e reflectem-se na página de carreiras em segundos.",
                )}
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 2: CONVOCATÓRIAS (BULK INVITE) VIEW ─────────────────── */}
        {view === "broadcast" && (
          <section className="space-y-6">
            {broadcastResult && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {t("Convocations sent successfully!", "Convocatórias enviadas com sucesso!")}
                    </h4>
                    <p className="text-xs text-emerald-300 mt-0.5">
                      {broadcastResult.count} {t("emails dispatched.", "e-mails enviados.")}{" "}
                      {broadcastResult.failed > 0
                        ? `(${broadcastResult.failed} ${t("failed", "falharam")})`
                        : t("All candidates notified.", "Todos os candidatos foram notificados.")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBroadcastResult(null)}
                  className="text-white/60 hover:text-white p-1 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Audience Presets & Controls */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-sm space-y-5">
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-emerald-400" />
                    <span>{t("Target Audience Selection", "Selecção do Público-Alvo")}</span>
                  </h2>
                  <span className="text-xs text-white/50">
                    {broadcastAudience.length} {t("eligible candidates", "candidatos elegíveis")} · {selectedCandidateIds.length} {t("selected", "selecionados")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {t(
                    "Filter candidates based on criteria: All Women + Men with prior CCTV experience.",
                    "Filtre os candidatos com base nos critérios acordados (Mulheres + Homens com experiência CCTV prévia).",
                  )}
                </p>
              </div>

              {/* Filter Preset Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPresetFilter("target")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    presetFilter === "target"
                      ? "bg-emerald-500 text-[#090d16] font-bold shadow-lg shadow-emerald-500/20"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("Target Criteria: Women + Men w/ CCTV Exp.", "Critério Alvo: Mulheres + Homens c/ Exp. CCTV")}
                </button>

                <button
                  type="button"
                  onClick={() => setPresetFilter("women")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    presetFilter === "women"
                      ? "bg-emerald-500 text-[#090d16] font-bold shadow-lg shadow-emerald-500/20"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("All Women", "Todas as Mulheres")} ({applications.filter((a) => a.sex === "female").length})
                </button>

                <button
                  type="button"
                  onClick={() => setPresetFilter("men_exp")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    presetFilter === "men_exp"
                      ? "bg-emerald-500 text-[#090d16] font-bold shadow-lg shadow-emerald-500/20"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("Men w/ CCTV Experience", "Homens c/ Exp. CCTV")} ({applications.filter((a) => a.sex === "male" && a.experience === "yes").length})
                </button>

                <button
                  type="button"
                  onClick={() => setPresetFilter("cctv")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    presetFilter === "cctv"
                      ? "bg-emerald-500 text-[#090d16] font-bold shadow-lg shadow-emerald-500/20"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("All CCTV Role Applicants", "Todas Candidaturas CCO")} ({applications.filter((a) => a.role === "cctv").length})
                </button>

                <button
                  type="button"
                  onClick={() => setPresetFilter("all")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    presetFilter === "all"
                      ? "bg-emerald-500 text-[#090d16] font-bold shadow-lg shadow-emerald-500/20"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("All Candidates", "Todos")} ({applications.length})
                </button>
              </div>

              {/* Table of Candidates to Select */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={
                        broadcastAudience.length > 0 &&
                        selectedCandidateIds.length === broadcastAudience.length
                      }
                      onChange={toggleSelectAllBroadcast}
                      className="rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <span>{t("Select All", "Selecionar Todos")} ({broadcastAudience.length})</span>
                  </label>

                  <span className="text-white/40 text-[0.7rem]">
                    {t("Check or uncheck boxes to select recipients", "Clique nas caixas para incluir ou desmarcar candidatos")}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                  {broadcastAudience.map((a) => {
                    const isChecked = selectedCandidateIds.includes(a.id);
                    const isAlreadyInvited = Boolean(a.invitedAt);
                    const hasBooked = Boolean(a.testSlot);

                    return (
                      <div
                        key={a.id}
                        className={`flex items-center justify-between px-4 py-3 text-xs transition-colors hover:bg-white/[0.02] ${
                          isChecked ? "bg-white/[0.01]" : "opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectCandidate(a.id)}
                            className="rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                          />
                          <div>
                            <span className="font-semibold text-white block">
                              {a.name}
                            </span>
                            <span className="text-white/40 block text-[0.68rem]">
                              {a.email} · {a.whatsapp}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="capitalize px-2 py-0.5 rounded text-[0.68rem] bg-white/5 text-white/70">
                            {a.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[0.68rem] font-medium ${
                              a.experience === "yes"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-white/5 text-white/50"
                            }`}
                          >
                            {t("Exp: ", "Exp: ")}{a.experience === "yes" ? t("Yes", "Sim") : t("No", "Não")}
                          </span>

                          {hasBooked ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {t("Booked:", "Agendado:")} {a.testSlot?.split("–")[0]}
                            </span>
                          ) : isAlreadyInvited ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {t("Invited", "Convocado")}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] text-white/40 bg-white/5">
                              {t("Not Invited", "Não Convocado")}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => copyBookingLink(a.id)}
                            title={t("Copy candidate personal booking link", "Copiar link pessoal do candidato")}
                            className="p-1 text-white/50 hover:text-white transition-colors"
                          >
                            {copiedLinkId === a.id ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Email Template & Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor */}
              <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText size={17} className="text-emerald-400" />
                    <span>{t("Convocation Template (Email)", "Modelo da Convocatória (E-mail)")}</span>
                  </h3>
                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setEmailPreviewTab("edit")}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        emailPreviewTab === "edit"
                          ? "bg-white/20 text-white font-semibold"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {t("Edit", "Editar")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailPreviewTab("preview")}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        emailPreviewTab === "preview"
                          ? "bg-white/20 text-white font-semibold"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {t("Preview", "Pré-visualizar")}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/70">
                    {t("Email Subject:", "Assunto do E-mail:")}
                  </label>
                  <input
                    type="text"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white focus:border-white/40 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-white/70">
                      {t("Message Body (Text):", "Corpo da Mensagem (Texto):")}
                    </label>
                    <span className="text-[0.68rem] text-white/40">
                      {t("Dynamic tags: {{name}}, {{booking_link}}", "Tags dinâmicas: {{name}}, {{booking_link}}")}
                    </span>
                  </div>
                  <textarea
                    rows={11}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs font-mono text-white leading-relaxed focus:border-white/40 focus:outline-none"
                  />
                  <p className="text-[0.68rem] text-white/40 italic">
                    {t(
                      "Note: Candidate message is in Portuguese as the job is in Maputo, Mozambique.",
                      "Nota: A mensagem aos candidatos é em português pois a vaga é sediada em Maputo.",
                    )}
                  </p>
                </div>

                {/* Slots info */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2 text-xs">
                  <span className="font-semibold text-white/80 block">
                    {t("Test Slots Included in Email & Candidate Portal:", "Opções de Turnos Incluídas no E-mail e Portal:")}
                  </span>
                  <div className="space-y-1">
                    {broadcastSlots.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-emerald-400 font-medium"
                      >
                        <Calendar size={13} />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="rounded-2xl border border-white/10 bg-[#0e1320] p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                      {t("Candidate Email Preview", "Pré-visualização do E-mail para Candidato")}
                    </span>
                    <span className="text-[0.68rem] text-slate-300 bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-md font-mono">
                      {t("Executive Letterhead", "Formato Oficial")}
                    </span>
                  </div>

                  {/* Document Card Mirroring Actual Email */}
                  <div className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl overflow-hidden text-xs">
                    {/* Official Letterhead Header */}
                    <div className="bg-[#0b1329] px-5 py-4 border-b-2 border-emerald-500 text-white">
                      <div className="flex items-center justify-between">
                        <Logo size="sm" variant="light" />
                        <div className="text-right">
                          <span className="inline-block bg-white/10 text-emerald-300 font-mono text-[0.6rem] px-2 py-0.5 rounded border border-white/10 font-bold">
                            REF: CCO-2026/MAPUTO
                          </span>
                          <div className="text-[0.65rem] text-slate-300 mt-0.5 font-medium">
                            Departamento de Recursos Humanos
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Official Document Subheading */}
                    <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-[0.68rem]">
                      <span className="font-semibold text-slate-700 uppercase tracking-wide">
                        Convocatória Oficial · Teste de Selecção Presencial
                      </span>
                      <span className="text-slate-500">
                        Maputo, Moçambique
                      </span>
                    </div>

                    {/* Letter Body */}
                    <div className="p-5 space-y-4">
                      <div className="text-slate-800 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                        {broadcastMessage.replace(
                          /\{\{name\}\}/g,
                          broadcastAudience[0]?.name || "Maria João",
                        )}
                      </div>

                      {/* Test Slots Clean Table */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                        <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 text-[0.68rem] font-bold text-slate-700 uppercase tracking-wider">
                          {t("Turnos Disponíveis (10h00 – 11h30):", "Turnos Disponíveis (10h00 – 11h30):")}
                        </div>
                        <div className="divide-y divide-slate-200">
                          {broadcastSlots.map((s, idx) => (
                            <div
                              key={idx}
                              className="px-3.5 py-2 text-slate-800 font-medium text-[0.72rem] flex items-center justify-between"
                            >
                              <span>{s}</span>
                              <span className="text-[0.65rem] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                Opção 0{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Solid Executive CTA Button */}
                      <div className="pt-2 text-center">
                        <div className="inline-block bg-[#0b1329] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-sm border border-[#0b1329]">
                          Confirmar Minha Presença no Teste →
                        </div>
                        <p className="text-[0.65rem] text-slate-500 mt-2">
                          {t(
                            "Link individual com confirmação instantânea de vaga.",
                            "Link individual com confirmação instantânea de vaga.",
                          )}
                        </p>
                      </div>

                      {/* Security Protocol Note */}
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-[0.68rem] text-amber-900 leading-snug">
                        <strong className="font-semibold block mb-0.5">Nota de Segurança:</strong>
                        Apresente documento de identificação original (BI/Passaporte) na portaria da Overwatch para entrada autorizada.
                      </div>
                    </div>

                    {/* Document Footer */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-center text-[0.65rem] text-slate-500 space-y-0.5">
                      <div className="font-semibold text-slate-700">Overwatch Moçambique, Lda.</div>
                      <div>{siteContact.address.pt}</div>
                      <div>WhatsApp: +258 84 287 0793 · info@overwatchmoz.com</div>
                    </div>
                  </div>
                </div>

                {/* Send Button */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={selectedCandidateIds.length === 0 || sendingBroadcast}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-4 text-sm font-bold text-[#090d16] shadow-xl transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Send size={16} />
                    <span>
                      {t(
                        `Send Convocations to ${selectedCandidateIds.length} Candidates`,
                        `Enviar Convocatórias para ${selectedCandidateIds.length} Candidatos`,
                      )}
                    </span>
                  </button>
                  <p className="text-center text-[0.68rem] text-white/40 mt-2">
                    {t(
                      "Each candidate will receive a unique personalized link to choose their test date with 1 click.",
                      "Cada candidato receberá um link individual e exclusivo para escolher o seu dia com 1 clique.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121827] p-6 shadow-2xl space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <Send size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {t("Confirm Bulk Dispatch", "Confirmar Envio em Massa")}
                        </h3>
                        <p className="text-xs text-white/60">
                          {t("Overwatch Recruitment Operations", "Operação de recrutamento Overwatch")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmModalOpen(false)}
                      className="p-1 text-white/50 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs text-white/80 bg-white/[0.03] p-4 rounded-xl border border-white/10">
                    <p>
                      {t(
                        "You are about to send official test invitation emails to:",
                        "Está prestes a enviar e-mails de convocatória oficial para:",
                      )}
                    </p>
                    <div className="text-2xl font-bold text-emerald-400">
                      {selectedCandidateIds.length} {t("candidates", "candidatos")}
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-white/70">
                      <li>
                        {t(
                          "Each candidate receives an exclusive personal booking link.",
                          "Cada candidato terá um link personalizado.",
                        )}
                      </li>
                      <li>
                        {t(
                          "Application stage automatically advances to Shortlisted.",
                          "A sua fase passará automaticamente para Shortlisted.",
                        )}
                      </li>
                      <li>
                        {t(
                          "When candidates pick a slot, it automatically books into the Test Schedule.",
                          "Ao escolherem o turno, a vaga fica registada na Agenda.",
                        )}
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmModalOpen(false)}
                      disabled={sendingBroadcast}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-3 text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                    >
                      {t("Cancel", "Cancelar")}
                    </button>

                    <button
                      type="button"
                      onClick={handleSendBroadcast}
                      disabled={sendingBroadcast}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 text-xs font-bold text-[#090d16] shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {sendingBroadcast ? (
                        <>
                          <RefreshCw className="animate-spin" size={14} />
                          <span>{t("Sending...", "A enviar...")}</span>
                        </>
                      ) : (
                        <span>{t("Yes, Send Now", "Sim, Enviar Agora")}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── TAB 3: AGENDA DE TESTES (SCHEDULE ROSTER) ────────────────── */}
        {view === "schedule" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar size={20} className="text-cyan-400" />
                  <span>{t("Candidate Attendance Roster by Slot", "Escala de Presenças por Turno")}</span>
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  {t(
                    "Real-time view of candidates who confirmed their in-person selection test attendance.",
                    "Acompanhe em tempo real os candidatos que confirmaram presença em cada dia do teste.",
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => exportAttendanceCSV()}
                disabled={!confirmedCount}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#090d16] hover:bg-white/90 disabled:opacity-40 transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Download size={14} />
                <span>{t("Export Complete Attendance Sheet (CSV)", "Exportar Lista Completa para Teste (CSV)")}</span>
              </button>
            </div>

            {/* Grid of Slots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {DEFAULT_TEST_SLOTS.map((slot) => {
                const candidatesInSlot = applications.filter(
                  (a) => a.testSlot === slot,
                );

                return (
                  <div
                    key={slot}
                    className="rounded-2xl border border-white/10 bg-[#121827]/95 p-5 flex flex-col shadow-sm"
                  >
                    {/* Slot Header */}
                    <div className="pb-4 border-b border-white/10 flex items-start justify-between">
                      <div>
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-cyan-400">
                          {t("Test Slot", "Turno de Teste")}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-0.5">
                          {slot}
                        </h3>
                        <span className="text-[0.68rem] text-white/40 flex items-center gap-1 mt-1">
                          <Clock size={11} /> {t("10:00 to 11:30 (Arrival 09:45)", "10h00 às 11h30 (Chegada 09h45)")}
                        </span>
                      </div>

                      <span className="rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-bold">
                        {candidatesInSlot.length}
                      </span>
                    </div>

                    {/* Candidates in this slot */}
                    <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-96">
                      {candidatesInSlot.length === 0 ? (
                        <div className="py-10 text-center text-xs text-white/40 italic">
                          {t("No confirmations for this slot yet.", "Ainda sem confirmações para este turno.")}
                        </div>
                      ) : (
                        candidatesInSlot.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <strong className="text-white text-xs block">
                                  {c.name}
                                </strong>
                                <span className="text-[0.65rem] text-white/40">
                                  {c.email}
                                </span>
                              </div>
                              <span className="capitalize px-1.5 py-0.5 rounded text-[0.62rem] bg-white/10 text-white/70">
                                {c.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[0.68rem] text-white/60 pt-1 border-t border-white/5">
                              <a
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                              >
                                <Phone size={11} />
                                <span>{c.whatsapp}</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => setSelected(c)}
                                className="text-white/60 hover:text-white underline cursor-pointer"
                              >
                                {t("View Profile / CV", "Ver Perfil / CV")}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer action */}
                    <div className="pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => exportAttendanceCSV(slot)}
                        disabled={candidatesInSlot.length === 0}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-[0.7rem] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Download size={12} />
                        <span>{t("Export Day Roster (CSV)", "Exportar Roster Deste Dia")}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pending Candidates (Invited but not yet booked) */}
            <div className="rounded-2xl border border-amber-500/20 bg-[#121827]/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    {t("Invited Candidates Awaiting Slot Selection", "Candidatos Convocados a Aguardar Escolha de Data")}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-amber-400">
                  {applications.filter((a) => a.invitedAt && !a.testSlot).length} {t("pending", "pendentes")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {applications
                  .filter((a) => a.invitedAt && !a.testSlot)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-white block truncate max-w-[130px]">
                          {c.name}
                        </strong>
                        <a
                          href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[0.68rem] text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone size={10} />
                          <span>{c.whatsapp}</span>
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyBookingLink(c.id)}
                        title={t("Copy personal booking link to send via WhatsApp", "Copiar link de marcação para enviar via WhatsApp")}
                        className="rounded-lg bg-white/5 border border-white/10 p-1.5 text-white/70 hover:text-white"
                      >
                        {copiedLinkId === c.id ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── TAB 4: APPLICATIONS PIPELINE VIEW ──────────────────── */}
        {view === "applications" && (
          <section className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#121827]/95 p-4 shadow-sm">
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  aria-label="Search candidates"
                  placeholder={t("Search name, email, WhatsApp, profession, cover letter…", "Pesquisar nome, email, WhatsApp, profissão, carta…")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none transition-colors"
                />
              </div>

              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#121827] px-3 py-2 text-xs text-white focus:border-white/40 focus:outline-none cursor-pointer"
              >
                <option value="all">{t("All roles", "Todas as vagas")}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {lang === "pt" ? r.pt : r.en}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by stage"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#121827] px-3 py-2 text-xs text-white focus:border-white/40 focus:outline-none cursor-pointer"
              >
                <option value="all">{t("All stages", "Todas as fases")}</option>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {stageLabels[lang][s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Candidate Table */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/60 uppercase font-semibold text-[0.68rem] tracking-wider">
                      <th className="px-4 py-3.5">{t("Candidate", "Candidato")}</th>
                      <th className="px-4 py-3.5">{t("Role", "Vaga")}</th>
                      <th className="px-4 py-3.5">{t("Status", "Estado")}</th>
                      <th className="px-4 py-3.5">{t("Convocation / Slot", "Convocatória / Turno")}</th>
                      <th className="px-4 py-3.5">{t("WhatsApp", "WhatsApp")}</th>
                      <th className="px-4 py-3.5">{t("Cover Letter", "Carta")}</th>
                      <th className="px-4 py-3.5">{t("12th Grade", "12.ª Classe")}</th>
                      <th className="px-4 py-3.5">{t("Sex", "Sexo")}</th>
                      <th className="px-4 py-3.5">{t("AI User", "Usa IA")}</th>
                      <th className="px-4 py-3.5">{t("CCTV Exp.", "Exp. CCTV")}</th>
                      <th className="px-4 py-3.5">{t("Last Profession", "Última Profissão")}</th>
                      <th className="px-4 py-3.5">{t("2D/2N Shifts", "Turnos 2D/2N")}</th>
                      <th className="px-4 py-3.5">{t("Date", "Data")}</th>
                      <th className="px-4 py-3.5">{t("CV", "CV")}</th>
                      <th className="px-4 py-3.5 text-right">{t("Actions", "Ações")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((a) => (
                      <tr
                        key={a.id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        {/* Candidate Name & Email */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => setSelected(a)}
                            className="flex items-center gap-2.5 text-left cursor-pointer group"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15 text-white font-bold text-xs">
                              {a.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </span>
                            <div>
                              <strong className="block text-white font-medium group-hover:text-white/80 transition-colors">
                                {a.name}
                              </strong>
                              <span className="text-[0.68rem] text-white/40">
                                {a.email}
                              </span>
                            </div>
                          </button>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3 whitespace-nowrap text-white/80">
                          {roleLabel(a.role)}
                        </td>

                        {/* Stage Selector Dropdown */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            aria-label={`Stage for ${a.name}`}
                            value={a.status}
                            disabled={busy}
                            onChange={(e) =>
                              void change({
                                kind: "status",
                                id: a.id,
                                status: e.target.value,
                              })
                            }
                            className={`rounded-lg border px-2.5 py-1 text-[0.7rem] font-semibold bg-[#121827] focus:outline-none cursor-pointer ${
                              a.status === "hired"
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                : a.status === "shortlisted" ||
                                    a.status === "interview"
                                  ? "border-white/30 text-white bg-white/10"
                                  : a.status === "rejected"
                                    ? "border-red-500/30 text-red-400 bg-red-500/10"
                                    : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                            }`}
                          >
                            {stages.map((s) => (
                              <option key={s} value={s}>
                                {stageLabels[lang][s]}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Test Slot / Convocatória Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.testSlot ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-0.5 text-[0.68rem] font-semibold text-cyan-300">
                              <CalendarCheck size={11} />
                              {a.testSlot.split("–")[0].trim()}
                            </span>
                          ) : a.invitedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[0.68rem] font-medium text-amber-300">
                              <Clock size={11} /> {t("Invited", "Convocado")}
                            </span>
                          ) : (
                            <span className="text-white/30 text-[0.68rem]">—</span>
                          )}
                        </td>

                        {/* WhatsApp */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <a
                            href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <Phone size={12} />
                            <span>{a.whatsapp}</span>
                          </a>
                        </td>

                        {/* Cover Letter Preview */}
                        <td className="px-4 py-3 max-w-[160px] truncate text-white/60">
                          {a.coverLetter ? (
                            <button
                              type="button"
                              onClick={() => setSelected(a)}
                              className="text-left truncate hover:text-white hover:underline cursor-pointer"
                            >
                              {a.coverLetter}
                            </button>
                          ) : (
                            <span className="text-white/30 italic">{t("None", "Nenhuma")}</span>
                          )}
                        </td>

                        {/* Grade 12 */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.grade12 === "yes" ? (
                            <span className="text-emerald-400">{t("Yes", "Sim")}</span>
                          ) : (
                            <span className="text-white/40">{t("No", "Não")}</span>
                          )}
                        </td>

                        {/* Sex */}
                        <td className="px-4 py-3 whitespace-nowrap capitalize text-white/70">
                          {a.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                        </td>

                        {/* Uses AI */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.ai === "yes" ? (
                            <span className="text-emerald-400 font-medium">
                              {t("Yes", "Sim")}
                            </span>
                          ) : (
                            <span className="text-white/40">{t("No", "Não")}</span>
                          )}
                        </td>

                        {/* CCTV Experience */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.experience === "yes" ? (
                            <span className="text-emerald-400 font-medium">
                              {t("Yes", "Sim")}
                            </span>
                          ) : (
                            <span className="text-white/40">{t("No", "Não")}</span>
                          )}
                        </td>

                        {/* Last Profession */}
                        <td className="px-4 py-3 max-w-[140px] truncate text-white/80">
                          {a.lastProfession}
                        </td>

                        {/* Shifts */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.shifts === "yes" ? (
                            <span className="text-emerald-400 font-medium">
                              {t("Available", "Disponível")}
                            </span>
                          ) : (
                            <span className="text-red-400">{t("No", "Não")}</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-white/50">
                          {new Date(a.createdAt).toLocaleDateString(lang === "pt" ? "pt-MZ" : "en-GB")}
                        </td>

                        {/* CV View & Download */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`/api/admin/cv?id=${a.id}&inline=1`}
                              target="_blank"
                              rel="noreferrer"
                              title={t("View attached CV", "Ver CV anexo")}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-2 py-1 text-[0.7rem] font-medium text-white hover:bg-white/[0.1] hover:border-white/30 transition-colors"
                            >
                              <Eye size={12} />
                              <span>{t("View", "Ver")}</span>
                            </a>
                            <a
                              href={`/api/admin/cv?id=${a.id}`}
                              title={t("Download CV", "Descarregar CV")}
                              className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.05] p-1 text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors"
                            >
                              <Download size={12} />
                            </a>
                          </div>
                        </td>

                        {/* View Button */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelected(a)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[0.7rem] font-semibold text-white hover:bg-white/15 transition-all cursor-pointer"
                          >
                            <span>{t("Profile", "Perfil")}</span>
                            <ArrowUpRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty state */}
              {!filtered.length && (
                <div className="py-16 text-center">
                  <Users size={32} className="mx-auto text-white/30 mb-3" />
                  <h3 className="text-sm font-semibold text-white">
                    {applications.length
                      ? t("No matching candidates", "Nenhum candidato encontrado")
                      : t("No applications submitted yet", "Ainda não foram submetidas candidaturas")}
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    {applications.length
                      ? t("Try adjusting your search query or filters.", "Tente ajustar o termo de pesquisa ou os filtros.")
                      : t("New candidate submissions from the careers page will appear here instantly.", "Novas candidaturas submetidas na página de carreiras aparecerão aqui instantaneamente.")}
                  </p>
                </div>
              )}

              {/* Table Footer */}
              <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-4 py-3 text-[0.7rem] text-white/50">
                <span>
                  {t("Showing", "A mostrar")} {filtered.length} {t("of", "de")} {applications.length} {t("applications", "candidaturas")}
                </span>
                <span className="hidden sm:inline">
                  {t("Scroll table horizontally for full candidate answers →", "Desloque a tabela horizontalmente para ver todas as respostas →")}
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── CANDIDATE PROFILE MODAL DRAWER ─────────────────────────── */}
      {current && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-full bg-[#0e1320] border-l border-white/10 p-6 sm:p-8 overflow-y-auto space-y-6 shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-white/60">
                  {t("Candidate Profile", "Perfil do Candidato")}
                </span>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {current.name}
                </h2>
                <p className="text-xs text-white/60">
                  {roleLabel(current.role)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white/70 hover:bg-white/[0.1] hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stage Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">
                {t("Recruitment Stage:", "Fase do Recrutamento:")}
              </label>
              <select
                value={current.status}
                disabled={busy}
                onChange={(e) =>
                  void change({
                    kind: "status",
                    id: current.id,
                    status: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/15 bg-[#121827] px-3.5 py-2.5 text-xs font-semibold text-white focus:border-white/40 focus:outline-none cursor-pointer"
              >
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {stageLabels[lang][s]}
                  </option>
                ))}
              </select>
            </div>

            {/* ─── CONVOCATÓRIA & TESTE PRESENCIAL CARD ─── */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CalendarCheck size={14} />
                  <span>{t("Convocation & Selection Test", "Convocatória & Teste Presencial")}</span>
                </span>
                {current.testSlot ? (
                  <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {t("Confirmed", "Confirmado")}
                  </span>
                ) : current.invitedAt ? (
                  <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {t("Invited", "Convocado")}
                  </span>
                ) : (
                  <span className="text-[0.65rem] text-white/40">
                    {t("Pending", "Pendente")}
                  </span>
                )}
              </div>

              {current.testSlot ? (
                <div className="rounded-xl bg-[#090d16]/80 p-3 border border-white/10 text-xs space-y-1">
                  <span className="text-white/50 text-[0.68rem] block">
                    {t("Confirmed Date & Time:", "Data e Hora Confirmada:")}
                  </span>
                  <div className="text-white font-bold text-sm">
                    {current.testSlot}
                  </div>
                  {current.testBookedAt && (
                    <span className="text-[0.65rem] text-white/40 block">
                      {t("Booked on:", "Marcado em:")} {new Date(current.testBookedAt).toLocaleString(lang === "pt" ? "pt-MZ" : "en-GB")}
                    </span>
                  )}
                </div>
              ) : current.invitedAt ? (
                <div className="rounded-xl bg-[#090d16]/80 p-3 border border-white/10 text-xs">
                  <span className="text-amber-300 font-medium block">
                    {t("Invitation email sent on", "Convocatória enviada por e-mail em")}{" "}
                    {new Date(current.invitedAt).toLocaleDateString(lang === "pt" ? "pt-MZ" : "en-GB")}.
                  </span>
                  <span className="text-[0.68rem] text-white/50 block mt-0.5">
                    {t("Awaiting candidate to select their preferred test date.", "A aguardar que a candidata confirme a sua data de teste.")}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-white/60">
                  {t("This candidate has not yet received a selection test convocation.", "Esta candidata ainda não recebeu a convocatória para o teste de selecção presencial.")}
                </div>
              )}

              {/* Quick Actions: Copy Link / Send Invite */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => copyBookingLink(current.id)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {copiedLinkId === current.id ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span>{t("Link Copied!", "Link Copiado!")}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>{t("Copy Booking Link", "Copiar Link")}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => sendSingleInvite(current.id)}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-[#090d16] hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{current.invitedAt ? t("Resend Email", "Reenviar E-mail") : t("Send Email", "Enviar E-mail")}</span>
                </button>
              </div>
            </div>

            {/* Cover Letter Section */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/90">
                <FileText size={15} />
                <span>{t("Cover Letter", "Carta de Apresentação")}</span>
              </div>
              <p className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap">
                {current.coverLetter || (
                  <span className="italic text-white/40">
                    {t("No cover letter was submitted with this application.", "Nenhuma carta de apresentação foi submetida com esta candidatura.")}
                  </span>
                )}
              </p>
            </div>

            {/* Candidate Answers Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
                {t("Application Answers", "Respostas da Candidatura")}
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">Email</span>
                  <a
                    href={`mailto:${current.email}`}
                    className="mt-1 font-semibold text-white hover:underline truncate block"
                  >
                    {current.email}
                  </a>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">WhatsApp</span>
                  <a
                    href={`https://wa.me/${current.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Phone size={12} />
                    <span>{current.whatsapp}</span>
                  </a>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">{t("12th Grade", "12.ª Classe")}</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.grade12 === "yes" ? t("Completed", "Concluída") : t("Not completed", "Não concluída")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">{t("Gender", "Sexo")}</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">{t("Uses Artificial Intelligence", "Usa Inteligência Artificial")}</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.ai === "yes" ? t("Yes", "Sim") : t("No", "Não")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">{t("CCTV / Security Experience", "Experiência CCTV / Segurança")}</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.experience === "yes" ? t("Yes", "Sim") : t("No", "Não")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 col-span-2">
                  <span className="text-white/40 block text-[0.68rem]">{t("Last Profession", "Última Profissão")}</span>
                  <strong className="mt-1 block text-white">
                    {current.lastProfession}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 col-span-2">
                  <span className="text-white/40 block text-[0.68rem]">{t("Shift Rotation (2D / 2N / 2 Off)", "Regime de Turnos (2D / 2N / 2 Folgas)")}</span>
                  <strong className="mt-1 block text-white">
                    {current.shifts === "yes"
                      ? t("Available for 2 days, 2 nights, 2 off", "Disponível para escala 2 dias, 2 noites, 2 folgas")
                      : t("Not available", "Não disponível")}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">{t("Submitted Date", "Data de Submissão")}</span>
                  <span className="mt-1 block text-white/70">
                    {new Date(current.createdAt).toLocaleString(lang === "pt" ? "pt-MZ" : "en-GB")}
                  </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">{t("Language", "Idioma")}</span>
                  <span className="mt-1 block text-white/70 uppercase">
                    {current.locale}
                  </span>
                </div>
              </div>
            </div>

            {/* Attached CV Section with Embedded Document Viewer */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                  <FileText size={15} className="text-emerald-400" />
                  <span>{t("Curriculum Vitae (CV) Attached", "Curriculum Vitae (CV) Anexo")}</span>
                </h3>
                <span className="text-[0.68rem] text-white/50">
                  {Math.round(current.cvSize / 1024)} KB · {current.cvType.includes("pdf") ? "PDF" : "Document"}
                </span>
              </div>

              {current.cvType === "application/pdf" || current.cvName.toLowerCase().endsWith(".pdf") ? (
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] border-b border-white/10 text-xs">
                    <span className="text-white/80 font-medium truncate max-w-[220px]">
                      {current.cvName}
                    </span>
                    <a
                      href={`/api/admin/cv?id=${current.id}&inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>{t("Full screen", "Ecrã inteiro")}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <iframe
                    src={`/api/admin/cv?id=${current.id}&inline=1`}
                    title={`CV - ${current.name}`}
                    className="w-full h-80 sm:h-96 border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] border-b border-white/10 text-xs">
                    <span className="text-white/80 font-medium truncate max-w-[220px]">
                      {current.cvName}
                    </span>
                    <span className="text-[0.68rem] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Word Document Preview
                    </span>
                  </div>
                  <DocxViewer
                    url={`/api/admin/cv?id=${current.id}&inline=1`}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href={`/api/admin/cv?id=${current.id}&inline=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Eye size={14} />
                  <span>{t("Open in Tab", "Abrir no Separador")}</span>
                  <ExternalLink size={12} className="opacity-60" />
                </a>

                <a
                  href={`/api/admin/cv?id=${current.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#090d16] shadow-md hover:bg-white/90 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>{t("Download CV", "Descarregar CV")}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
