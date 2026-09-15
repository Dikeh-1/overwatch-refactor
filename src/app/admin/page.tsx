"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, useRef, type FormEvent } from "react";
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
  Archive,
  Filter,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Save,
  RotateCcw,
  Columns,
  Loader2,
  Trash2,
  Bell,
  Radio,
  Briefcase,
  ChevronDown,
  Menu,
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
    archived: "Archived",
  },
  pt: {
    new: "Novo",
    reviewing: "Em análise",
    shortlisted: "Pré-selecionado",
    interview: "Entrevista",
    hired: "Contratado",
    rejected: "Não selecionado",
    archived: "Arquivado",
  },
};

export function formatSlotDisplay(slot: string, l: "en" | "pt") {
  if (l === "pt") return slot;
  return slot
    .replace("Quarta-feira", "Wednesday")
    .replace("Quinta-feira", "Thursday")
    .replace("Sexta-feira", "Friday")
    .replace("de Setembro", "September")
    .replace("10h00", "10:00 AM");
}

const EMAIL_TEMPLATES = {
  pt: {
    subject: "Convocatória: Teste de Selecção Presencial — Overwatch Moçambique",
    message: `{{greeting}} {{name}},

Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.

Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: teste de selecção presencial.

Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do link pessoal no botão abaixo.

Após a sua selecção, a sua vaga fica automaticamente confirmada no nosso sistema.

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch Moçambique`,
  },
  en: {
    subject: "Convocation: In-Person Selection Test — Overwatch Mozambique",
    message: `{{greeting}} {{name}},

Thank you for your application for the CCTV Operator position at Overwatch.

Following the review of your application, you have been shortlisted to advance to the next stage of our recruitment process: an in-person selection test.

Please select one of the available date options below to confirm your attendance using your personalized link.

Upon selection, your slot is automatically confirmed in our system.

Com os melhores cumprimentos,
Equipa de Recrutamento
Overwatch Moçambique`,
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
  // ─── Per-Role Campaign Workspace ──────────────────────────────────
  const [activeCampaignRole, setActiveCampaignRole] = useState<string | null>(null);
  const [activeCampaignView, setActiveCampaignView] = useState<
    "applications" | "broadcast" | "schedule"
  >("applications");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState("");

  // Convocatórias & Criteria Filtering State
  const [filterRule, setFilterRule] = useState<"target" | "custom">("target");
  const [filterSex, setFilterSex] = useState<"all" | "female" | "male">("all");
  const [filterExp, setFilterExp] = useState<"all" | "yes" | "no">("all");
  const [filterShifts, setFilterShifts] = useState<"all" | "yes" | "no">("all");
  const [filterGrade12, setFilterGrade12] = useState<"all" | "yes" | "no">("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterInvited, setFilterInvited] = useState<"all" | "uninvited" | "invited">("uninvited");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // ─── Dual-Language Email Templates (Candidate email is ALWAYS PT) ──
  const [templatePT, setTemplatePT] = useState<{ subject: string; message: string }>({
    subject: EMAIL_TEMPLATES.pt.subject,
    message: EMAIL_TEMPLATES.pt.message,
  });
  const [templateEN, setTemplateEN] = useState<{ subject: string; message: string }>({
    subject: EMAIL_TEMPLATES.en.subject,
    message: EMAIL_TEMPLATES.en.message,
  });

  // Current draft in the editor (never auto-saved on keystroke)
  const [broadcastSubject, setBroadcastSubject] = useState(
    EMAIL_TEMPLATES.en.subject,
  );
  const [broadcastMessage, setBroadcastMessage] = useState(
    EMAIL_TEMPLATES.en.message,
  );
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [previewLang, setPreviewLang] = useState<"pt" | "en">("pt");

  const [broadcastSlots] = useState<string[]>([...DEFAULT_TEST_SLOTS]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    count: number;
    failed: number;
  } | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState<{
    current: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
    successCount: number;
    failedCount: number;
    currentNames: string[];
    recentLogs: string[];
    done: boolean;
  } | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [emailPreviewTab, setEmailPreviewTab] = useState<"edit" | "preview" | "split">(
    "split",
  );
  const [templateSavedFeedback, setTemplateSavedFeedback] = useState(false);

  // ─── Booking Confirmation Send Section ────────────────────────────
  const CONFIRM_DEFAULT_PT = `{{greeting}},

Obrigada pela confirmação.

O seu teste de selecção para a vaga de Operadora de CCO da Overwatch ficou agendado para:

Data: {{slot}}
Hora do teste: 10h00
Local:
Overwatch — Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia, Maputo

Pedimos que esteja no local 30 minutos antes, às 09h30.

Por motivos de organização do processo, às 09h50 o portão será encerrado e não será permitida a entrada de candidatas que cheguem depois dessa hora.

Pedimos também que traga:
• Uma caneta
• Uma cópia do seu documento de identificação

Por favor, planeie a sua deslocação com antecedência.

Com os melhores cumprimentos,
Overwatch`;
  const [confirmMessage, setConfirmMessage] = useState(CONFIRM_DEFAULT_PT);
  const [confirmPreview, setConfirmPreview] = useState<"edit" | "preview">("edit");
  const [confirmSending, setConfirmSending] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ success: number; failed: number } | null>(null);
  const [confirmSelectedIds, setConfirmSelectedIds] = useState<string[]>([]);

  // ─── Live Admin Presence Tracking ─────────────────────────────────
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // ─── Applications Table Pagination, Quick Filters & Bulk Selection ─
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [appQuickFilter, setAppQuickFilter] = useState<
    "all" | "review" | "shortlisted" | "booked" | "archived"
  >("all");

  // ─── Permanent Delete State (Single & Mass Delete) ─────────────────
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    ids: string[];
    candidateNames?: string[];
  }>({ open: false, ids: [] });
  const [deleteBusy, setDeleteBusy] = useState(false);

  // ─── Real-time Live Polling & Database Refresh State ──────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveNotification, setLiveNotification] = useState<{
    id: string;
    title: string;
    subtitle: string;
    type: "new_app" | "new_booking";
    timestamp: string;
    candidateId?: string;
  } | null>(null);
  const prevAppIds = useRef<Set<string> | null>(null);
  const prevBookedMap = useRef<Map<string, string> | null>(null);

  // ─── Mobile sidebar toggle ─────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── Live Mozambique greeting clock (UTC+2) ────────────────────────
  const [mozambiqueGreeting, setMozambiqueGreeting] = useState(() => {
    const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Maputo" })).getHours();
    if (h >= 5 && h < 12) return { pt: "Bom dia", en: "Good morning" };
    if (h >= 12 && h < 18) return { pt: "Boa tarde", en: "Good afternoon" };
    return { pt: "Boa noite", en: "Good evening" };
  });

  // Load language preference and persisted template customizations
  useEffect(() => {
    const savedLang = (localStorage.getItem("overwatch_admin_lang") as "en" | "pt") || "en";
    if (savedLang === "pt" || savedLang === "en") {
      setLang(savedLang);
    }

    // Migrate any stale templates that still have hardcoded greeting words — replace with {{greeting}}
    const migrateGreeting = (text: string): string =>
      text.replace(
        /^(Bom dia|Boa tarde|Boa noite|Good morning|Good afternoon|Good evening)(\s+\{\{name\}\})/i,
        "{{greeting}}$2"
      );

    const savedSubPT =
      localStorage.getItem("overwatch_template_subject_pt") ||
      EMAIL_TEMPLATES.pt.subject;
    const savedMsgPT = migrateGreeting(
      localStorage.getItem("overwatch_template_message_pt") ||
      EMAIL_TEMPLATES.pt.message
    );
    const savedSubEN =
      localStorage.getItem("overwatch_template_subject_en") ||
      EMAIL_TEMPLATES.en.subject;
    const savedMsgEN = migrateGreeting(
      localStorage.getItem("overwatch_template_message_en") ||
      EMAIL_TEMPLATES.en.message
    );

    // Persist migrated versions so future loads are clean
    localStorage.setItem("overwatch_template_message_pt", savedMsgPT);
    localStorage.setItem("overwatch_template_message_en", savedMsgEN);

    const ptTpl = { subject: savedSubPT, message: savedMsgPT };
    const enTpl = { subject: savedSubEN, message: savedMsgEN };
    setTemplatePT(ptTpl);
    setTemplateEN(enTpl);

    const active = savedLang === "pt" ? ptTpl : enTpl;
    setBroadcastSubject(active.subject);
    setBroadcastMessage(active.message);
    setIsDraftDirty(false);
  }, []);

  const handleSetLang = async (l: "en" | "pt") => {
    if (l === lang) return;

    // If there were unsaved edits in current language, sync/translate them to the target language
    if (isDraftDirty) {
      setIsTranslating(true);
      try {
        const fromLang = lang;
        const toLang = l;

        let translatedSub = broadcastSubject;
        let translatedMsg = broadcastMessage;
        try {
          const resSub = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: broadcastSubject, from: fromLang, to: toLang }),
          });
          const dataSub = await resSub.json();
          if (dataSub?.translated) translatedSub = dataSub.translated;

          const resMsg = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: broadcastMessage, from: fromLang, to: toLang }),
          });
          const dataMsg = await resMsg.json();
          if (dataMsg?.translated) translatedMsg = dataMsg.translated;
        } catch {
          // Keep fallback
        }

        if (fromLang === "en") {
          setTemplateEN({ subject: broadcastSubject, message: broadcastMessage });
          localStorage.setItem("overwatch_template_subject_en", broadcastSubject);
          localStorage.setItem("overwatch_template_message_en", broadcastMessage);

          setTemplatePT({ subject: translatedSub, message: translatedMsg });
          localStorage.setItem("overwatch_template_subject_pt", translatedSub);
          localStorage.setItem("overwatch_template_message_pt", translatedMsg);
          localStorage.setItem("overwatch_template_subject", translatedSub);
          localStorage.setItem("overwatch_template_message", translatedMsg);
        } else {
          setTemplatePT({ subject: broadcastSubject, message: broadcastMessage });
          localStorage.setItem("overwatch_template_subject_pt", broadcastSubject);
          localStorage.setItem("overwatch_template_message_pt", broadcastMessage);
          localStorage.setItem("overwatch_template_subject", broadcastSubject);
          localStorage.setItem("overwatch_template_message", broadcastMessage);

          setTemplateEN({ subject: translatedSub, message: translatedMsg });
          localStorage.setItem("overwatch_template_subject_en", translatedSub);
          localStorage.setItem("overwatch_template_message_en", translatedMsg);
        }

        setBroadcastSubject(translatedSub);
        setBroadcastMessage(translatedMsg);
        setIsDraftDirty(false);
      } catch (err) {
        console.error("Auto-sync error on lang toggle:", err);
        const targetTpl = l === "pt" ? templatePT : templateEN;
        setBroadcastSubject(targetTpl.subject);
        setBroadcastMessage(targetTpl.message);
        setIsDraftDirty(false);
      } finally {
        setIsTranslating(false);
      }
    } else {
      const targetTpl = l === "pt" ? templatePT : templateEN;
      setBroadcastSubject(targetTpl.subject);
      setBroadcastMessage(targetTpl.message);
    }

    setLang(l);
    localStorage.setItem("overwatch_admin_lang", l);
  };

  const handleSaveTemplate = async () => {
    setIsTranslating(true);
    try {
      if (lang === "en") {
        setTemplateEN({ subject: broadcastSubject, message: broadcastMessage });
        localStorage.setItem("overwatch_template_subject_en", broadcastSubject);
        localStorage.setItem("overwatch_template_message_en", broadcastMessage);

        let translatedSub = broadcastSubject;
        let translatedMsg = broadcastMessage;
        try {
          const resSub = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: broadcastSubject, from: "en", to: "pt" }),
          });
          const dataSub = await resSub.json();
          if (dataSub?.translated) translatedSub = dataSub.translated;

          const resMsg = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: broadcastMessage, from: "en", to: "pt" }),
          });
          const dataMsg = await resMsg.json();
          if (dataMsg?.translated) translatedMsg = dataMsg.translated;
        } catch {
          // Keep fallback
        }

        setTemplatePT({ subject: translatedSub, message: translatedMsg });
        localStorage.setItem("overwatch_template_subject_pt", translatedSub);
        localStorage.setItem("overwatch_template_message_pt", translatedMsg);
        localStorage.setItem("overwatch_template_subject", translatedSub);
        localStorage.setItem("overwatch_template_message", translatedMsg);
      } else {
        setTemplatePT({ subject: broadcastSubject, message: broadcastMessage });
        localStorage.setItem("overwatch_template_subject_pt", broadcastSubject);
        localStorage.setItem("overwatch_template_message_pt", broadcastMessage);
        localStorage.setItem("overwatch_template_subject", broadcastSubject);
        localStorage.setItem("overwatch_template_message", broadcastMessage);

        let translatedSub = broadcastSubject;
        let translatedMsg = broadcastMessage;
        try {
          const resSub = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: broadcastSubject, from: "pt", to: "en" }),
          });
          const dataSub = await resSub.json();
          if (dataSub?.translated) translatedSub = dataSub.translated;

          const resMsg = await fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: broadcastMessage, from: "pt", to: "en" }),
          });
          const dataMsg = await resMsg.json();
          if (dataMsg?.translated) translatedMsg = dataMsg.translated;
        } catch {
          // Keep fallback
        }

        setTemplateEN({ subject: translatedSub, message: translatedMsg });
        localStorage.setItem("overwatch_template_subject_en", translatedSub);
        localStorage.setItem("overwatch_template_message_en", translatedMsg);
      }

      setIsDraftDirty(false);
      setTemplateSavedFeedback(true);
      setTimeout(() => setTemplateSavedFeedback(false), 3500);
    } catch (err) {
      console.error("Save template error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateAndSync = async () => {
    setIsTranslating(true);
    try {
      const fromLang = lang;
      const toLang = lang === "en" ? "pt" : "en";

      let translatedSub = broadcastSubject;
      let translatedMsg = broadcastMessage;
      try {
        const resSub = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: broadcastSubject, from: fromLang, to: toLang }),
        });
        const dataSub = await resSub.json();
        if (dataSub?.translated) translatedSub = dataSub.translated;

        const resMsg = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: broadcastMessage, from: fromLang, to: toLang }),
        });
        const dataMsg = await resMsg.json();
        if (dataMsg?.translated) translatedMsg = dataMsg.translated;
      } catch {
        // Keep fallback
      }

      if (toLang === "pt") {
        setTemplatePT({ subject: translatedSub, message: translatedMsg });
        localStorage.setItem("overwatch_template_subject_pt", translatedSub);
        localStorage.setItem("overwatch_template_message_pt", translatedMsg);
        localStorage.setItem("overwatch_template_subject", translatedSub);
        localStorage.setItem("overwatch_template_message", translatedMsg);

        setTemplateEN({ subject: broadcastSubject, message: broadcastMessage });
        localStorage.setItem("overwatch_template_subject_en", broadcastSubject);
        localStorage.setItem("overwatch_template_message_en", broadcastMessage);
      } else {
        setTemplateEN({ subject: translatedSub, message: translatedMsg });
        localStorage.setItem("overwatch_template_subject_en", translatedSub);
        localStorage.setItem("overwatch_template_message_en", translatedMsg);

        setTemplatePT({ subject: broadcastSubject, message: broadcastMessage });
        localStorage.setItem("overwatch_template_subject_pt", broadcastSubject);
        localStorage.setItem("overwatch_template_message_pt", broadcastMessage);
        localStorage.setItem("overwatch_template_subject", broadcastSubject);
        localStorage.setItem("overwatch_template_message", broadcastMessage);
      }

      setIsDraftDirty(false);
      setTemplateSavedFeedback(true);
      setTimeout(() => setTemplateSavedFeedback(false), 3500);
    } catch (err) {
      console.error("Translate & sync error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleResetTemplate = (targetLang?: "en" | "pt") => {
    const l = targetLang || lang;
    const defaultSubject = EMAIL_TEMPLATES[l].subject;
    const defaultMessage = EMAIL_TEMPLATES[l].message;
    setBroadcastSubject(defaultSubject);
    setBroadcastMessage(defaultMessage);
    setIsDraftDirty(false);

    if (l === "pt") {
      setTemplatePT({ subject: defaultSubject, message: defaultMessage });
      localStorage.setItem("overwatch_template_subject_pt", defaultSubject);
      localStorage.setItem("overwatch_template_message_pt", defaultMessage);
      localStorage.setItem("overwatch_template_subject", defaultSubject);
      localStorage.setItem("overwatch_template_message", defaultMessage);
    } else {
      setTemplateEN({ subject: defaultSubject, message: defaultMessage });
      localStorage.setItem("overwatch_template_subject_en", defaultSubject);
      localStorage.setItem("overwatch_template_message_en", defaultMessage);
    }
    setTemplateSavedFeedback(true);
    setTimeout(() => setTemplateSavedFeedback(false), 3000);
  };

  const t = (enStr: string, ptStr: string) => (lang === "en" ? enStr : ptStr);

  const load = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }
    try {
      const r = await fetch(`/api/admin/careers?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
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
      const newApps: Application[] = d.applications || [];
      const newRoles: Role[] = d.roles || [];

      // Detect real-time updates if we already have a previous baseline
      if (prevAppIds.current !== null) {
        // 1. Check for brand-new incoming job applications
        const brandNew = newApps.filter((a) => !prevAppIds.current!.has(a.id));
        if (brandNew.length > 0) {
          const newest = brandNew[0];
          const roleObj = newRoles.find((ro) => ro.id === newest.role);
          const roleName = lang === "pt" ? (roleObj?.pt || newest.role) : (roleObj?.en || newest.role);
          setLiveNotification({
            id: `app_${Date.now()}_${newest.id}`,
            title: lang === "pt" ? "🔔 Nova Candidatura Recebida!" : "🔔 New Application Received!",
            subtitle: `${newest.name} — ${roleName}`,
            type: "new_app",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            candidateId: newest.id,
          });
        }

        // 2. Check for candidate test bookings
        if (prevBookedMap.current !== null) {
          const newlyBooked = newApps.find(
            (a) => a.testSlot && prevBookedMap.current!.get(a.id) !== a.testSlot,
          );
          if (newlyBooked && (!brandNew.length || newlyBooked.id !== brandNew[0].id)) {
            const slotShort = formatSlotDisplay(newlyBooked.testSlot?.split("–")[0]?.trim() || "", lang);
            setLiveNotification({
              id: `book_${Date.now()}_${newlyBooked.id}`,
              title: lang === "pt" ? "📅 Novo Agendamento Confirmado!" : "📅 Test Booking Confirmed!",
              subtitle: `${newlyBooked.name} (${slotShort})`,
              type: "new_booking",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              candidateId: newlyBooked.id,
            });
          }
        }
      }

      // Update baseline tracking refs
      prevAppIds.current = new Set(newApps.map((a) => a.id));
      const nextBookedMap = new Map<string, string>();
      newApps.forEach((a) => {
        if (a.testSlot) nextBookedMap.set(a.id, a.testSlot);
      });
      prevBookedMap.current = nextBookedMap;

      setApplications(newApps);
      setRoles(newRoles);
      setUpdated(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 350);
      }
    }
  }, [lang]);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAuth(d.authenticated))
      .catch(() => {
        setAuth(false);
        setError("Could not connect to session service.");
      });
  }, []);

  // ─── Real-time 3.5s Live Polling + Window Focus / Visibility Sync ────
  useEffect(() => {
    if (!auth) return;

    // Immediate initial sync
    load(false);

    // Instant refresh when user switches back to this browser tab or window gains focus
    const handleSyncOnVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        load(false);
      }
    };

    window.addEventListener("focus", handleSyncOnVisible);
    document.addEventListener("visibilitychange", handleSyncOnVisible);

    // Continuous 3.5 second live database polling
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        load(false);
      }
    }, 3500);

    return () => {
      window.removeEventListener("focus", handleSyncOnVisible);
      document.removeEventListener("visibilitychange", handleSyncOnVisible);
      clearInterval(timer);
    };
  }, [auth, load]);

  // Auto-select first open campaign role when roles first load
  useEffect(() => {
    if (roles.length > 0 && activeCampaignRole === null) {
      const firstOpen = roles.find((r) => r.open);
      if (firstOpen) {
        setActiveCampaignRole(firstOpen.id);
        setView("applications");
      }
    }
  }, [roles, activeCampaignRole]);

  // Auto-dismiss live arrival notification toast after 6 seconds
  useEffect(() => {
    if (!liveNotification) return;
    const timer = setTimeout(() => {
      setLiveNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [liveNotification]);

  // ─── Live Mozambique greeting clock — updates every second ───────────
  useEffect(() => {
    const computeGreeting = () => {
      const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Maputo" })).getHours();
      if (h >= 5 && h < 12) return { pt: "Bom dia", en: "Good morning" };
      if (h >= 12 && h < 18) return { pt: "Boa tarde", en: "Good afternoon" };
      return { pt: "Boa noite", en: "Good evening" };
    };
    const tick = setInterval(() => setMozambiqueGreeting(computeGreeting()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [selected]);

  // ─── Reset pagination & selection on filter changes ───────────────
  useEffect(() => {
    setCurrentPage(1);
    setSelectedAppIds([]);
  }, [query, roleFilter, stageFilter, appQuickFilter, pageSize]);

  // ─── Live Admin Presence Heartbeat ────────────────────────────────
  useEffect(() => {
    if (!auth) return;

    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("overwatch_admin_sid") || "";
      if (!sessionId) {
        sessionId =
          "sid_" +
          Math.random().toString(36).substring(2, 10) +
          "_" +
          Date.now().toString(36);
        sessionStorage.setItem("overwatch_admin_sid", sessionId);
      }
    } catch {
      sessionId = "sid_fallback_" + Date.now().toString(36);
    }

    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/admin/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, name: "Admin" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.onlineCount === "number") {
            setOnlineCount(Math.max(1, data.onlineCount));
          }
        }
      } catch {
        // fail silently
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [auth]);

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

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      // Scope to active campaign role workspace
      if (activeCampaignRole && a.role !== activeCampaignRole) return false;

      // Quick filter tabs
      if (appQuickFilter === "archived" && a.status !== "archived") return false;
      if (appQuickFilter === "booked" && !a.testSlot) return false;
      if (appQuickFilter === "shortlisted" && a.status !== "shortlisted") return false;
      if (appQuickFilter === "review" && a.status !== "reviewing" && a.status !== "new") return false;

      // When "all" is active, by default hide archived unless stageFilter specifically targets archived
      if (appQuickFilter === "all" && stageFilter === "all" && a.status === "archived") return false;

      if (stageFilter !== "all" && a.status !== stageFilter) return false;
      if (roleFilter !== "all" && a.role !== roleFilter) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const haystack = `${a.name} ${a.email} ${a.whatsapp} ${a.lastProfession} ${a.coverLetter || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [applications, activeCampaignRole, appQuickFilter, stageFilter, roleFilter, query]);

  // Pagination calculation
  const totalCandidates = filtered.length;
  const isAll = pageSize >= 9999;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalCandidates / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = isAll ? 0 : (activePage - 1) * pageSize;
  const endIndex = isAll ? totalCandidates : Math.min(startIndex + pageSize, totalCandidates);
  const paginatedCandidates = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  // Application selection helpers
  const allCurrentPageSelected =
    paginatedCandidates.length > 0 &&
    paginatedCandidates.every((c) => selectedAppIds.includes(c.id));

  const toggleSelectAllOnPage = () => {
    if (allCurrentPageSelected) {
      const pageIds = new Set(paginatedCandidates.map((c) => c.id));
      setSelectedAppIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = paginatedCandidates.map((c) => c.id);
      setSelectedAppIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectApp = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Mass action on applications
  const handleBulkStatusChange = async (targetIds: string[], newStatus: string) => {
    if (!targetIds.length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "bulk_status",
          ids: targetIds,
          status: newStatus,
        }),
      });
      if (!r.ok) {
        throw new Error("Bulk status update failed.");
      }
      setSelectedAppIds([]);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleArchive = async (candidate: Application) => {
    const nextStatus = candidate.status === "archived" ? "review" : "archived";
    await change({
      kind: "status",
      id: candidate.id,
      status: nextStatus,
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteModalState.ids.length) return;
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/admin/careers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deleteModalState.ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      if (selected && deleteModalState.ids.includes(selected.id)) {
        setSelected(null);
      }

      const deletedSet = new Set(deleteModalState.ids);
      setSelectedAppIds((prev) => prev.filter((id) => !deletedSet.has(id)));
      setDeleteModalState({ open: false, ids: [] });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  // ─── Filtered Audience for Convocatórias (Manual Criteria + Presets) ─
  const broadcastAudience = useMemo(() => {
    return applications.filter((a) => {
      // Scope to active campaign role
      if (activeCampaignRole && a.role !== activeCampaignRole) return false;
      // Exclude archived by default unless specifically filtering for archived
      if (filterStage !== "archived" && a.status === "archived") return false;

      if (filterRule === "target") {
        const matchesTarget =
          a.sex === "female" ||
          (a.sex === "male" && a.experience === "yes");
        if (!matchesTarget) return false;
      } else {
        if (filterSex !== "all" && a.sex !== filterSex) return false;
        if (filterExp !== "all" && a.experience !== filterExp) return false;
        if (filterShifts !== "all" && a.shifts !== filterShifts) return false;
        if (filterGrade12 !== "all" && a.grade12 !== filterGrade12) return false;
        if (filterStage !== "all" && a.status !== filterStage) return false;
      }

      if (filterInvited === "uninvited" && Boolean(a.invitedAt)) return false;
      if (filterInvited === "invited" && !a.invitedAt) return false;

      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchesSearch =
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.whatsapp.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [
    applications,
    activeCampaignRole,
    filterRule,
    filterSex,
    filterExp,
    filterShifts,
    filterGrade12,
    filterStage,
    filterInvited,
    filterSearch,
  ]);

  const unselectedCandidates = useMemo(() => {
    return broadcastAudience.filter(
      (a) => !selectedCandidateIds.includes(a.id) && a.status !== "archived",
    );
  }, [broadcastAudience, selectedCandidateIds]);

  // Sync selected candidates when audience changes
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

  async function handleMassShortlist() {
    if (selectedCandidateIds.length === 0) return;
    setBulkActionBusy(true);
    setBulkSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "bulk_status",
          ids: selectedCandidateIds,
          status: "shortlisted",
        }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            selectedCandidateIds.includes(a.id)
              ? { ...a, status: "shortlisted" }
              : a,
          ),
        );
        setBulkSuccessMsg(
          t(
            `Successfully set ${selectedCandidateIds.length} candidate(s) to Shortlisted.`,
            `${selectedCandidateIds.length} candidato(s) marcado(s) como Pré-selecionado(s) com sucesso.`,
          ),
        );
      } else {
        setError(t("Failed to update status", "Falha ao atualizar estado"));
      }
    } catch {
      setError(t("Failed to update status", "Falha ao atualizar estado"));
    } finally {
      setBulkActionBusy(false);
    }
  }

  async function handleMassArchive() {
    if (unselectedCandidates.length === 0) return;
    setBulkActionBusy(true);
    setBulkSuccessMsg(null);
    try {
      const idsToArchive = unselectedCandidates.map((a) => a.id);
      const res = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "bulk_status",
          ids: idsToArchive,
          status: "archived",
        }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            idsToArchive.includes(a.id) ? { ...a, status: "archived" } : a,
          ),
        );
        setArchiveModalOpen(false);
        setBulkSuccessMsg(
          t(
            `Archived ${idsToArchive.length} non-selected candidate(s).`,
            `${idsToArchive.length} candidato(s) não selecionado(s) arquivado(s).`,
          ),
        );
      } else {
        setError(t("Failed to archive candidates", "Falha ao arquivar candidatos"));
      }
    } catch {
      setError(t("Failed to archive candidates", "Falha ao arquivar candidatos"));
    } finally {
      setBulkActionBusy(false);
    }
  }

  async function handleSendBroadcast() {
    if (selectedCandidateIds.length === 0) return;
    setSendingBroadcast(true);
    setBroadcastResult(null);

    const BATCH_SIZE = 5;
    const allIds = [...selectedCandidateIds];
    const total = allIds.length;
    const totalBatches = Math.ceil(total / BATCH_SIZE);

    const initialProgress = {
      current: 0,
      total,
      currentBatch: 1,
      totalBatches,
      successCount: 0,
      failedCount: 0,
      currentNames: [] as string[],
      recentLogs: [] as string[],
      done: false,
    };
    setBroadcastProgress(initialProgress);

    let cumulativeSuccess = 0;
    let cumulativeFailed = 0;
    const logs: string[] = [];

    try {
      const outgoingSubject = templatePT.subject || EMAIL_TEMPLATES.pt.subject;
      const outgoingMessage = templatePT.message || EMAIL_TEMPLATES.pt.message;

      for (let i = 0; i < totalBatches; i++) {
        const batchIds = allIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const batchNames = batchIds.map(
          (id) => applications.find((a) => a.id === id)?.name || id,
        );

        setBroadcastProgress((prev) =>
          prev
            ? {
                ...prev,
                currentBatch: i + 1,
                currentNames: batchNames,
              }
            : null,
        );

        try {
          const res = await fetch("/api/admin/careers/bulk-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidateIds: batchIds,
              subject: outgoingSubject,
              messageText: outgoingMessage,
              slots: broadcastSlots,
            }),
          });

          const data = await res.json();
          if (res.ok) {
            cumulativeSuccess += data.count || 0;
            cumulativeFailed += data.failed || 0;
            if (Array.isArray(data.results)) {
              for (const r of data.results) {
                if (r.success) {
                  logs.push(`✓ ${r.name}`);
                } else {
                  logs.push(`✕ ${r.name} (${r.error || "Failed"})`);
                }
              }
            }
          } else {
            cumulativeFailed += batchIds.length;
            logs.push(`✕ Batch ${i + 1} error: ${data.error || "Request failed"}`);
          }
        } catch (batchErr) {
          cumulativeFailed += batchIds.length;
          logs.push(`✕ Batch ${i + 1} network error`);
        }

        const processedSoFar = Math.min((i + 1) * BATCH_SIZE, total);
        setBroadcastProgress((prev) =>
          prev
            ? {
                ...prev,
                current: processedSoFar,
                successCount: cumulativeSuccess,
                failedCount: cumulativeFailed,
                recentLogs: [...logs.slice(-8)],
              }
            : null,
        );

        // Polite 300ms pause between batches to protect Brevo deliverability & connection pool
        if (i < totalBatches - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setBroadcastProgress((prev) =>
        prev
          ? {
              ...prev,
              done: true,
            }
          : null,
      );

      setBroadcastResult({
        success: cumulativeSuccess > 0,
        count: cumulativeSuccess,
        failed: cumulativeFailed,
      });

      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function handleSendConfirmations() {
    if (confirmSelectedIds.length === 0) return;
    setConfirmSending(true);
    setConfirmResult(null);
    let success = 0, failed = 0;
    try {
      for (const id of confirmSelectedIds) {
        const candidate = applications.find((a) => a.id === id);
        if (!candidate || !candidate.testSlot) { failed++; continue; }
        try {
          const res = await fetch("/api/admin/careers/send-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateId: id, messageText: confirmMessage }),
          });
          if (res.ok) { success++; } else { failed++; }
        } catch { failed++; }
        await new Promise((r) => setTimeout(r, 120));
      }
      setConfirmResult({ success, failed });
      setConfirmSelectedIds([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfirmSending(false);
    }
  }

  async function sendSingleInvite(candidateId: string) {
    setBusy(true);
    try {
      const outgoingSubject = templatePT.subject || EMAIL_TEMPLATES.pt.subject;
      const outgoingMessage = templatePT.message || EMAIL_TEMPLATES.pt.message;

      const res = await fetch("/api/admin/careers/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: [candidateId],
          subject: outgoingSubject,
          messageText: outgoingMessage,
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

  // ─── Role-scoped apps (for stats + campaign workspace) ────────────
  const campaignApps = activeCampaignRole
    ? applications.filter((a) => a.role === activeCampaignRole)
    : applications;

  const confirmedCount = campaignApps.filter((a) => Boolean(a.testSlot)).length;
  const targetCount = campaignApps.filter(
    (a) => a.sex === "female" || (a.sex === "male" && a.experience === "yes"),
  ).length;
  const pendingConvocationsCount = campaignApps.filter(
    (a) =>
      (a.sex === "female" || (a.sex === "male" && a.experience === "yes")) &&
      !a.invitedAt &&
      a.status !== "archived",
  ).length;
  const dispatchedConvocationsCount = campaignApps.filter(
    (a) => Boolean(a.invitedAt) && a.status !== "archived",
  ).length;

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col lg:flex-row relative isolate">
      <TechGrid className="fixed inset-0 opacity-25 pointer-events-none" />

      {/* ─── MOBILE TOP BAR ─────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0e1320] border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-white/15 bg-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <Logo size="sm" variant="light" />
        </div>
        <div className="flex items-center gap-2">
          {activeCampaignRole && view !== "roles" && (
            <span className="flex items-center gap-1 text-[0.65rem] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2.5 py-1">
              <Briefcase size={10} />
              {roleLabel(activeCampaignRole)}
            </span>
          )}
          <button
            onClick={() => void load(true)}
            disabled={isRefreshing}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-white/15 bg-white/[0.06] text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ─── MOBILE SIDEBAR OVERLAY ──────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#0e1320] flex flex-col backdrop-blur-md border-r border-white/10 overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:w-64 lg:z-30 p-5 lg:p-6
      `}>
        {/* Mobile close button inside sidebar */}
        <div className="lg:hidden flex justify-end mb-2 -mt-1">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="pb-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="block">
              <Logo size="sm" variant="light" />
            </Link>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white/40"></span>
              <span className="text-[0.68rem] font-bold uppercase tracking-widest text-white/60">
                {t("Talent Operations", "Operações de Recrutamento")}
              </span>
            </div>
          </div>

          {/* Live Admin Presence Indicator */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 text-[0.68rem]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="font-medium text-white/85">
                {lang === "pt"
                  ? `${onlineCount} Admin${onlineCount > 1 ? "s" : ""} Online`
                  : `${onlineCount} Admin${onlineCount > 1 ? "s" : ""} Live`}
              </span>
            </div>
            <span className="text-[0.62rem] font-mono text-white/60 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">
              {t("Active", "Activo")}
            </span>
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

        {/* Navigation */}
        <nav className="mt-5 space-y-4">

          {/* ── ACTIVE CAMPAIGN WORKSPACES ─────────────────────────── */}
          {roles.filter((r) => r.open).length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[0.62rem] font-bold uppercase tracking-widest text-white/35">
                {t("Active Campaigns", "Campanhas Activas")}
              </p>
              <div className="space-y-1">
                {roles.filter((r) => r.open).map((role) => {
                  const isActiveCampaign = activeCampaignRole === role.id;
                  const roleAppsCount = applications.filter((a) => a.role === role.id).length;
                  const rolePending = applications.filter(
                    (a) =>
                      a.role === role.id &&
                      (a.sex === "female" || (a.sex === "male" && a.experience === "yes")) &&
                      !a.invitedAt &&
                      a.status !== "archived",
                  ).length;
                  const roleConfirmed = applications.filter(
                    (a) => a.role === role.id && Boolean(a.testSlot),
                  ).length;

                  return (
                    <div key={role.id}>
                      {/* Role Campaign Header Button */}
                      <button
                        onClick={() => {
                          setActiveCampaignRole(role.id);
                          setView("applications");
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                          isActiveCampaign
                            ? "bg-sky-500/15 text-white border border-sky-500/30 shadow-sm"
                            : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                            isActiveCampaign ? "bg-sky-500/20 text-sky-400" : "bg-white/[0.06] text-white/50"
                          }`}>
                            <Briefcase size={13} />
                          </div>
                          <span className="truncate text-[0.72rem]">
                            {lang === "pt" ? role.pt : role.en}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {rolePending > 0 && (
                            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[0.6rem] font-bold">
                              {rolePending}
                            </span>
                          )}
                          <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${
                            isActiveCampaign ? "bg-sky-500/20 text-sky-300" : "bg-white/10 text-white/60"
                          }`}>
                            {roleAppsCount}
                          </span>
                          <ChevronDown size={12} className={`transition-transform ${isActiveCampaign ? "rotate-180 text-sky-400" : "text-white/40"}`} />
                        </div>
                      </button>

                      {/* Sub-navigation (only visible when this campaign is active) */}
                      {isActiveCampaign && (
                        <div className="mt-1 ml-3 pl-3 border-l border-sky-500/20 space-y-0.5">
                          {/* Applications sub-tab */}
                          <button
                            onClick={() => { setView("applications"); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold transition-all cursor-pointer ${
                              view === "applications"
                                ? "bg-white/[0.1] text-white border border-white/15"
                                : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <LayoutDashboard size={13} />
                              <span>{t("Applications", "Candidaturas")}</span>
                            </div>
                            <span className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${
                              view === "applications" ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                            }`}>
                              {roleAppsCount}
                            </span>
                          </button>

                          {/* Convocations sub-tab */}
                          <button
                            onClick={() => { setView("broadcast"); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold transition-all cursor-pointer ${
                              view === "broadcast"
                                ? "bg-white/[0.1] text-white border border-white/15"
                                : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Mail size={13} />
                              <span>{t("Convocations", "Convocatórias")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {rolePending > 0 && (
                                <span className="rounded-md bg-white/10 text-white/90 border border-white/10 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium">
                                  {rolePending}
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Test Schedule sub-tab */}
                          <button
                            onClick={() => { setView("schedule"); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold transition-all cursor-pointer ${
                              view === "schedule"
                                ? "bg-white/[0.1] text-white border border-white/15"
                                : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-white/70" />
                              <span>{t("Test Schedule", "Agenda de Testes")}</span>
                            </div>
                            {roleConfirmed > 0 && (
                              <span className="rounded-md bg-white/10 text-white/80 border border-white/10 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium">
                                {roleConfirmed}
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── NO OPEN CAMPAIGNS PLACEHOLDER ─────────────────────── */}
          {roles.filter((r) => r.open).length === 0 && roles.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-4 text-center">
              <LockKeyhole size={18} className="mx-auto text-white/25 mb-2" />
              <p className="text-[0.68rem] text-white/40 leading-relaxed">
                {t("No roles are currently open.", "Nenhuma vaga está actualmente aberta.")}
              </p>
              <p className="text-[0.65rem] text-white/30 mt-1">
                {t("Toggle a role open below.", "Abra uma vaga em baixo.")}
              </p>
            </div>
          )}

          {/* ── SYSTEM SECTION ─────────────────────────────────────── */}
          <div>
            <p className="mb-2 px-1 text-[0.62rem] font-bold uppercase tracking-widest text-white/35">
              {t("System", "Sistema")}
            </p>
            <button
              onClick={() => { setView("roles"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                view === "roles"
                  ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                  : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal size={15} />
                <span>{t("Manage Roles", "Gestão de Vagas")}</span>
              </div>
              <span className="text-[0.65rem] font-mono text-white/60">
                {roles.filter((r) => r.open).length} {t("open", "abertas")}
              </span>
            </button>
          </div>
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
      <main className="flex-1 min-w-0 lg:ml-64 pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            {/* Campaign workspace context */}
            {view !== "roles" && activeCampaignRole && (
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-sky-400/80">
                  <Briefcase size={11} />
                  {roleLabel(activeCampaignRole)}
                </span>
                <span className="text-white/20 text-[0.6rem]">›</span>
                <span className="text-[0.65rem] text-white/40 font-medium">
                  {view === "broadcast"
                    ? t("Convocations", "Convocatórias")
                    : view === "schedule"
                      ? t("Test Schedule", "Agenda de Testes")
                      : t("Applications", "Candidaturas")}
                </span>
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {view === "roles"
                ? t("Role Availability", "Disponibilidade de Vagas")
                : view === "broadcast"
                  ? t("Test Convocations", "Convocatórias de Teste")
                  : view === "schedule"
                    ? t("Selection Test Schedule", "Agenda de Testes Presenciais")
                    : t("Applications", "Candidaturas")}
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              {view === "roles"
                ? t("Manage public careers page role availability", "Gerir disponibilidade de vagas na página pública")
                : view === "broadcast"
                  ? t("Dispatch and track candidate test invitations", "Envio e controlo de convites para testes presenciais")
                  : view === "schedule"
                    ? t("Confirmed candidate attendance by session", "Presenças confirmadas de candidatos por turno")
                    : t("Review and manage candidate applications", "Rever e gerir candidaturas recebidas")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void load(true)}
              disabled={isRefreshing}
              aria-label="Refresh"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isRefreshing ? "animate-spin text-white" : "text-white/70"}
              />
              <span>
                {isRefreshing ? t("Refreshing...", "A atualizar...") : t("Refresh", "Atualizar")}
              </span>
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
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#090d16] shadow-sm hover:bg-white/90 disabled:opacity-50 cursor-pointer transition-transform hover:-translate-y-0.5"
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
              {campaignApps.length}
            </strong>
            <span className="text-[0.7rem] text-white/40">
              {activeCampaignRole && applications.length !== campaignApps.length
                ? t(`${applications.length} total across all roles`, `${applications.length} no total de todas as vagas`)
                : t("All registered candidates", "Todos os candidatos inscritos")}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>{t("Eligible for Selection Test", "Elegíveis para Teste")}</span>
              <UserCheck size={16} className="text-sky-400" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-white">
              {targetCount}
            </strong>
            <span className="text-[0.7rem] text-white/40">
              {t("Women + Men w/ relevant exp.", "Mulheres + Homens c/ exp. relevante")}
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
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
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
                          r.open ? "text-sky-400" : "text-white/40"
                        }`}
                      >
                        {r.open ? t("Accepting applications", "A receber candidaturas") : t("Locked / Closed", "Trancada / Fechada")}
                      </span>

                      <button
                        role="switch"
                        aria-checked={r.open}
                        disabled={busy}
                        onClick={async () => {
                          const opening = !r.open;
                          await change({
                            kind: "role",
                            id: r.id,
                            open: opening,
                          });
                          // When opening a role, auto-navigate to its campaign workspace
                          if (opening) {
                            setActiveCampaignRole(r.id);
                            setView("applications");
                          } else if (activeCampaignRole === r.id) {
                            // If the currently active campaign is being closed, clear it
                            const nextOpen = roles.find((ro) => ro.id !== r.id && ro.open);
                            setActiveCampaignRole(nextOpen?.id ?? null);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          r.open ? "bg-sky-500" : "bg-white/20"
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
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-sky-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {t("Convocations sent successfully!", "Convocatórias enviadas com sucesso!")}
                    </h4>
                    <p className="text-xs text-sky-300 mt-0.5">
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

            {/* ─── Convocations Workflow Sections (Tabs) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tab 1: Ready to Invite */}
              <button
                type="button"
                onClick={() => setFilterInvited("uninvited")}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left cursor-pointer ${
                  filterInvited === "uninvited"
                    ? "border-white/25 bg-white/[0.08] shadow-sm text-white ring-1 ring-white/10"
                    : "border-white/10 bg-[#0e1320]/80 hover:bg-white/[0.03] text-white/70 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      filterInvited === "uninvited"
                        ? "bg-white/15 border-white/20 text-white"
                        : "bg-white/[0.04] border-white/10 text-white/60"
                    }`}
                  >
                    <Mail size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-white">
                      {t("Ready to Invite", "Prontos para Envio")}
                    </h3>
                    <p className="text-[0.68rem] text-white/45 mt-0.5">
                      {t("Auto-shortlisted & awaiting email", "Pré-selecionados a aguardar envio")}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium border ${
                    filterInvited === "uninvited"
                      ? "bg-white/20 text-white border-white/25"
                      : "bg-white/[0.06] text-white/70 border-white/10"
                  }`}
                >
                  {pendingConvocationsCount}
                </span>
              </button>

              {/* Tab 2: Already Dispatched */}
              <button
                type="button"
                onClick={() => setFilterInvited("invited")}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left cursor-pointer ${
                  filterInvited === "invited"
                    ? "border-white/25 bg-white/[0.08] shadow-sm text-white ring-1 ring-white/10"
                    : "border-white/10 bg-[#0e1320]/80 hover:bg-white/[0.03] text-white/70 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      filterInvited === "invited"
                        ? "bg-white/15 border-white/20 text-white"
                        : "bg-white/[0.04] border-white/10 text-white/60"
                    }`}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-white">
                      {t("Already Dispatched", "Já Convocados")}
                    </h3>
                    <p className="text-[0.68rem] text-white/45 mt-0.5">
                      {t("Sent invitations & bookings", "Convites enviados e presenças")}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium border ${
                    filterInvited === "invited"
                      ? "bg-white/20 text-white border-white/25"
                      : "bg-white/[0.06] text-white/70 border-white/10"
                  }`}
                >
                  {dispatchedConvocationsCount}
                </span>
              </button>

              {/* Tab 3: All Target Candidates */}
              <button
                type="button"
                onClick={() => setFilterInvited("all")}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left cursor-pointer ${
                  filterInvited === "all"
                    ? "border-white/25 bg-white/[0.08] shadow-sm text-white ring-1 ring-white/10"
                    : "border-white/10 bg-[#0e1320]/80 hover:bg-white/[0.03] text-white/70 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      filterInvited === "all"
                        ? "bg-white/15 border-white/20 text-white"
                        : "bg-white/[0.04] border-white/10 text-white/60"
                    }`}
                  >
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-white">
                      {t("All Target Candidates", "Todos Elegíveis")}
                    </h3>
                    <p className="text-[0.68rem] text-white/45 mt-0.5">
                      {t("Combined eligible pool", "Total de candidatos alvo")}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium border ${
                    filterInvited === "all"
                      ? "bg-white/20 text-white border-white/25"
                      : "bg-white/[0.06] text-white/70 border-white/10"
                  }`}
                >
                  {targetCount}
                </span>
              </button>
            </div>

            {/* Contextual Section Notification Banner */}
            {filterInvited === "uninvited" && (
              <div className="rounded-xl border border-white/10 bg-[#0e1320] p-4 text-xs text-white/80 flex items-start gap-3.5">
                <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={15} />
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-white block text-sm">
                    {t("Active Dispatch Queue · Ready to Send", "Fila de Envio Ativa · Prontos para Convocatória")}
                  </span>
                  <p className="text-white/60 text-xs leading-relaxed">
                    {t(
                      "New applicants submitting on the careers page who meet the target criteria (Female or Male with CCTV experience) are automatically shortlisted and land directly here without an email sent yet. You can review and dispatch their convocations with 1 click.",
                      "Novas candidaturas submetidas no site que cumpram os critérios (Mulheres ou Homens com experiência CCTV) são pré-selecionadas automaticamente e entram diretamente nesta fila. Pode revê-las e disparar as suas convocatórias com 1 clique.",
                    )}
                  </p>
                </div>
              </div>
            )}

            {filterInvited === "invited" && (
              <div className="rounded-xl border border-white/10 bg-[#0e1320] p-4 text-xs text-white/80 flex items-start gap-3.5">
                <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={15} />
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-white block text-sm">
                    {t("Already Dispatched Convocations", "Convocatórias Já Enviadas")}
                  </span>
                  <p className="text-white/60 text-xs leading-relaxed">
                    {t(
                      "These candidates have already received their personalized convocation email and test booking link. You can review booking status or individually resend an email if requested.",
                      "Estes candidatos já receberam o e-mail oficial com o link de agendamento do teste. Pode verificar quem já marcou data ou reenviar o e-mail individualmente se solicitado.",
                    )}
                  </p>
                </div>
              </div>
            )}


            {/* Audience Criteria & Queue Controls */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-sm space-y-5">
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-white" />
                    <span>
                      {filterInvited === "uninvited"
                        ? t("Pending Dispatch Queue", "Fila de Candidatos Prontos para Envio")
                        : filterInvited === "invited"
                          ? t("Dispatched Candidates", "Candidatos Já Convocados")
                          : t("Audience Criteria & Queue", "Critérios de Selecção e Fila de Envio")}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 text-white border border-white/20 px-2.5 py-0.5 text-xs font-bold">
                      {broadcastAudience.length} {t("in this view", "nesta vista")}
                    </span>
                    <span className="rounded-full bg-white/10 text-white px-2.5 py-0.5 text-xs font-bold">
                      {selectedCandidateIds.length} {t("selected", "selecionados")}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {filterInvited === "uninvited"
                    ? t(
                        "Candidates below will be sent the convocation email when you click the Send button.",
                        "Os candidatos abaixo receberão o e-mail de convocatória quando clicar no botão de envio.",
                      )
                    : filterInvited === "invited"
                      ? t(
                          "Overview of all applicants who have been sent an email. Track who has booked their slot.",
                          "Lista de candidatos que já receberam e-mail. Acompanhe quem já agendou a presença.",
                        )
                      : t(
                          "Filter applicants by manual criteria to build your emailing queue and archive remaining applicants.",
                          "Filtre candidatos por critérios manuais para criar a fila de envio e arquivar os restantes.",
                        )}
                </p>
              </div>

              {/* Quick Presets Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                <span className="text-[0.7rem] font-semibold text-white/40 mr-1 flex items-center gap-1">
                  <Filter size={11} />
                  <span>{t("Presets:", "Atalhos:")}</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setFilterRule("target");
                    setFilterSex("all");
                    setFilterExp("all");
                    setFilterShifts("all");
                    setFilterGrade12("all");
                    setFilterStage("all");
                    setFilterSearch("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterRule === "target"
                      ? "bg-white text-[#090d16] font-bold shadow-md"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("Target: Women + Men w/ CCTV Exp", "Alvo: Mulheres + Homens c/ Exp CCTV")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterRule("custom");
                    setFilterStage("shortlisted");
                    setFilterSex("all");
                    setFilterExp("all");
                    setFilterShifts("all");
                    setFilterGrade12("all");
                    setFilterSearch("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterRule === "custom" && filterStage === "shortlisted"
                      ? "bg-white text-[#090d16] font-bold shadow-md"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("Shortlisted Only", "Apenas Pré-selecionados")} ({applications.filter((a) => a.status === "shortlisted").length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterRule("custom");
                    setFilterSex("female");
                    setFilterExp("all");
                    setFilterShifts("all");
                    setFilterGrade12("all");
                    setFilterStage("all");
                    setFilterSearch("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterRule === "custom" && filterSex === "female" && filterExp === "all"
                      ? "bg-white text-[#090d16] font-bold shadow-md"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("All Women", "Todas Mulheres")} ({applications.filter((a) => a.sex === "female").length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterRule("custom");
                    setFilterSex("male");
                    setFilterExp("yes");
                    setFilterShifts("all");
                    setFilterGrade12("all");
                    setFilterStage("all");
                    setFilterSearch("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterRule === "custom" && filterSex === "male" && filterExp === "yes"
                      ? "bg-white text-[#090d16] font-bold shadow-md"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  {t("Men w/ CCTV Exp", "Homens c/ Exp CCTV")} ({applications.filter((a) => a.sex === "male" && a.experience === "yes").length})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterRule("custom");
                    setFilterSex("all");
                    setFilterExp("all");
                    setFilterShifts("all");
                    setFilterGrade12("all");
                    setFilterStage("all");
                    setFilterSearch("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterRule === "custom" && filterSex === "all" && filterExp === "all" && filterStage === "all" && !filterSearch
                      ? "bg-white/20 text-white font-bold"
                      : "bg-white/[0.04] text-white/60 hover:text-white border border-white/10"
                  }`}
                >
                  {t("Reset All", "Limpar Todos")}
                </button>
              </div>

              {/* Manual Filter Criteria Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-2">
                <div>
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("Gender:", "Sexo:")}
                  </label>
                  <select
                    value={filterSex}
                    onChange={(e) => {
                      setFilterRule("custom");
                      setFilterSex(e.target.value as "all" | "female" | "male");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121827]">{t("All Genders", "Todos")}</option>
                    <option value="female" className="bg-[#121827]">{t("Female Only", "Mulheres")}</option>
                    <option value="male" className="bg-[#121827]">{t("Male Only", "Homens")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("CCTV Experience:", "Exp. CCTV:")}
                  </label>
                  <select
                    value={filterExp}
                    onChange={(e) => {
                      setFilterRule("custom");
                      setFilterExp(e.target.value as "all" | "yes" | "no");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121827]">{t("Any Experience", "Qualquer")}</option>
                    <option value="yes" className="bg-[#121827]">{t("Yes (With Exp)", "Sim (Com Exp)")}</option>
                    <option value="no" className="bg-[#121827]">{t("No (Without Exp)", "Não (Sem Exp)")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("12h Shifts:", "Turnos 12h:")}
                  </label>
                  <select
                    value={filterShifts}
                    onChange={(e) => {
                      setFilterRule("custom");
                      setFilterShifts(e.target.value as "all" | "yes" | "no");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121827]">{t("Any Availability", "Qualquer")}</option>
                    <option value="yes" className="bg-[#121827]">{t("Yes (Available)", "Sim (Disponível)")}</option>
                    <option value="no" className="bg-[#121827]">{t("No", "Não")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("Grade 12:", "12ª Classe:")}
                  </label>
                  <select
                    value={filterGrade12}
                    onChange={(e) => {
                      setFilterRule("custom");
                      setFilterGrade12(e.target.value as "all" | "yes" | "no");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121827]">{t("Any Education", "Qualquer")}</option>
                    <option value="yes" className="bg-[#121827]">{t("Completed", "Concluída")}</option>
                    <option value="no" className="bg-[#121827]">{t("Not completed", "Incompleta")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("Current Status:", "Estado Atual:")}
                  </label>
                  <select
                    value={filterStage}
                    onChange={(e) => {
                      setFilterRule("custom");
                      setFilterStage(e.target.value);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121827]">{t("All (Excl. Archived)", "Todos (Excl. Arquivados)")}</option>
                    {stages.map((s) => (
                      <option key={s} value={s} className="bg-[#121827]">
                        {stageLabels[lang][s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("Invitation:", "Convocatória:")}
                  </label>
                  <select
                    value={filterInvited}
                    onChange={(e) => {
                      setFilterRule("custom");
                      setFilterInvited(e.target.value as "all" | "uninvited" | "invited");
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#121827]">{t("All Candidates", "Todos")}</option>
                    <option value="uninvited" className="bg-[#121827]">{t("Not Yet Invited", "Ainda Não Convocados")}</option>
                    <option value="invited" className="bg-[#121827]">{t("Already Invited", "Já Convocados")}</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-3 lg:col-span-1">
                  <label className="text-[0.68rem] font-semibold text-white/60 block mb-1">
                    {t("Search Applicant:", "Pesquisar:")}
                  </label>
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => {
                      setFilterRule("custom");
                      setFilterSearch(e.target.value);
                    }}
                    placeholder={t("Name, email, tel...", "Nome, e-mail...")}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* Mass Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 bg-white/[0.02] p-4 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {t("Mass Actions on Candidates:", "Ações em Massa nos Candidatos:")}
                  </span>
                  <span className="text-[0.68rem] text-white/50">
                    {t(
                      "Queue shortlisted candidates for test invitations, and move the rest to Archived.",
                      "Adicione candidatos pré-selecionados à fila de envio e mova os restantes para o arquivo.",
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleMassShortlist}
                    disabled={selectedCandidateIds.length === 0 || bulkActionBusy}
                    className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-white/90 px-3.5 py-2 text-xs font-bold text-[#090d16] disabled:opacity-40 shadow-sm transition-all cursor-pointer"
                  >
                    <UserCheck size={14} />
                    <span>
                      {t(
                        `Shortlist & Queue Selected (${selectedCandidateIds.length})`,
                        `Pré-selecionar e Enfileirar (${selectedCandidateIds.length})`,
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setArchiveModalOpen(true)}
                    disabled={unselectedCandidates.length === 0 || bulkActionBusy}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] px-3.5 py-2 text-xs font-semibold text-white/80 hover:text-white disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Archive size={14} />
                    <span>
                      {t(
                        `Archive Unselected (${unselectedCandidates.length})`,
                        `Arquivar Não Selecionados (${unselectedCandidates.length})`,
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {bulkSuccessMsg && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200 flex items-center justify-between">
                  <span>{bulkSuccessMsg}</span>
                  <button onClick={() => setBulkSuccessMsg(null)} className="text-white/60 hover:text-white cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              )}

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
                      className="rounded border-white/20 bg-white/10 accent-white focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <span>{t("Select All Matching", "Selecionar Todos Correspondentes")} ({broadcastAudience.length})</span>
                  </label>

                  <span className="text-white/40 text-[0.7rem]">
                    {selectedCandidateIds.length} {t("candidates selected for convocation", "candidatos selecionados para convocatória")}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {broadcastAudience.length === 0 ? (
                    <div className="py-12 px-4 text-center text-xs space-y-2">
                      {filterInvited === "uninvited" ? (
                        <>
                          <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                          <h4 className="font-bold text-white text-sm">
                            {t("All Eligible Candidates Have Been Invited!", "Todos os Candidatos Elegíveis Já Foram Convocados!")}
                          </h4>
                          <p className="text-white/60 max-w-md mx-auto text-[0.72rem] leading-relaxed">
                            {t(
                              "There are no pending candidates waiting for an email. When new applicants apply on the careers page and pass the auto-criteria check, they will automatically be shortlisted and appear here ready for you to send.",
                              "Não existem candidatos pendentes. Quando novas candidaturas submetidas no site cumprirem os critérios automáticos, entrarão aqui imediatamente como pré-selecionadas prontas para envio.",
                            )}
                          </p>
                        </>
                      ) : filterInvited === "invited" ? (
                        <>
                          <Mail size={32} className="mx-auto text-cyan-400 mb-2" />
                          <h4 className="font-bold text-white text-sm">
                            {t("No Dispatched Candidates Yet", "Nenhum Candidato Convocado Ainda")}
                          </h4>
                          <p className="text-white/60 max-w-md mx-auto text-[0.72rem]">
                            {t(
                              "Once you dispatch convocations from the 'Ready to Invite' tab, they will appear here.",
                              "Após disparar as convocatórias da aba 'Prontos para Envio', os candidatos aparecerão aqui.",
                            )}
                          </p>
                        </>
                      ) : (
                        <div className="text-white/40 italic">
                          {t("No candidates match the specified criteria.", "Nenhum candidato corresponde aos critérios especificados.")}
                        </div>
                      )}
                    </div>
                  ) : (
                    broadcastAudience.map((a) => {
                      const isChecked = selectedCandidateIds.includes(a.id);
                      const isAlreadyInvited = Boolean(a.invitedAt);
                      const hasBooked = Boolean(a.testSlot);

                      return (
                        <div
                          key={a.id}
                          className={`flex items-center justify-between px-4 py-3 text-xs transition-colors hover:bg-white/[0.02] ${
                            isChecked ? "bg-white/[0.02]" : "opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectCandidate(a.id)}
                              className="rounded border-white/20 bg-white/10 accent-white focus:ring-0 cursor-pointer h-4 w-4"
                            />
                            <div>
                              <span className="font-semibold text-white block">
                                {a.name}
                              </span>
                              <span className="text-white/40 block text-[0.68rem]">
                                {a.email} · <span className="text-emerald-400/90 font-medium">{a.whatsapp}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* Current Stage Badge */}
                            <span
                              className={`px-2 py-0.5 rounded text-[0.65rem] font-semibold uppercase tracking-wider ${
                                a.status === "shortlisted"
                                  ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                                  : a.status === "archived"
                                    ? "bg-slate-500/15 text-slate-400 border border-slate-500/25"
                                    : "bg-white/10 text-white/70"
                              }`}
                            >
                              {stageLabels[lang][a.status] || a.status}
                            </span>

                            <span className="capitalize px-2 py-0.5 rounded text-[0.68rem] bg-white/5 text-white/70">
                              {a.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded text-[0.68rem] font-medium ${
                                a.experience === "yes"
                                  ? "bg-white/10 text-white border border-white/15"
                                  : "bg-white/5 text-white/50"
                              }`}
                            >
                              {t("Exp: ", "Exp: ")}{a.experience === "yes" ? t("Yes", "Sim") : t("No", "Não")}
                            </span>

                            {hasBooked ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                                {t("Booked:", "Agendado:")} {formatSlotDisplay(a.testSlot?.split("–")[0].trim() || "", lang)}
                              </span>
                            ) : isAlreadyInvited ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] font-medium bg-white/[0.06] text-white/70 border border-white/10 flex items-center gap-1">
                                <span>{t("Invited", "Convocado")}</span>
                                {a.invitedAt && (
                                  <span className="text-[0.62rem] text-white/40 font-mono">
                                    · {new Date(a.invitedAt).toLocaleDateString(lang === "pt" ? "pt-MZ" : "en-GB")}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] text-white/90 bg-white/[0.08] border border-white/15 font-medium">
                                {t("Ready to Invite", "Pronto para Envio")}
                              </span>
                            )}

                            {/* Resend button for already invited */}
                            {isAlreadyInvited && (
                              <button
                                type="button"
                                onClick={() => sendSingleInvite(a.id)}
                                disabled={busy}
                                title={t("Resend convocation email", "Reenviar e-mail de convocatória")}
                                className="px-2 py-1 rounded-md text-[0.68rem] font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                <Send size={10} />
                                <span>{t("Resend", "Reenviar")}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => copyBookingLink(a.id)}
                              title={t("Copy candidate personal booking link", "Copiar link pessoal do candidato")}
                              className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedLinkId === a.id ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>

                            <a
                              href={`/${lang}/careers/test-invite/${a.id}`}
                              target="_blank"
                              rel="noreferrer"
                              title={t("Open candidate booking page in a new tab", "Abrir página de agendamento num novo separador")}
                              className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Email Template & Preview */}
            <div className="space-y-4">
              {/* Template Control Bar & View Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#121827] border border-white/10 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    {t("View Mode:", "Modo de Exibição:")}
                  </span>
                  <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setEmailPreviewTab("edit")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        emailPreviewTab === "edit"
                          ? "bg-white text-[#090d16] font-bold shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <FileText size={13} />
                      <span>{t("Edit", "Editar")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailPreviewTab("preview")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        emailPreviewTab === "preview"
                          ? "bg-white text-[#090d16] font-bold shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Eye size={13} />
                      <span>{t("Preview", "Pré-visualizar")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailPreviewTab("split")}
                      className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        emailPreviewTab === "split"
                          ? "bg-white text-[#090d16] font-bold shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Columns size={13} />
                      <span>{t("Split View", "Lado a Lado")}</span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons: Save Template, Load EN/PT, Reset, Translate */}
                <div className="flex items-center flex-wrap gap-2">
                  {isDraftDirty && (
                    <span className="text-[0.68rem] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md font-semibold animate-pulse">
                      {t("● Unsaved Draft", "● Rascunho Não Salvo")}
                    </span>
                  )}

                  <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs">
                    <span className="text-[0.68rem] text-white/40 px-1 font-semibold">{t("Load:", "Carregar:")}</span>
                    <button
                      type="button"
                      onClick={() => handleResetTemplate("en")}
                      title={t("Load English official template", "Carregar modelo oficial em inglês")}
                      className="px-2 py-1 rounded-lg hover:bg-white/10 text-[0.68rem] text-white/70 hover:text-white transition-colors cursor-pointer font-semibold"
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetTemplate("pt")}
                      title={t("Load Portuguese official template", "Carregar modelo oficial em português")}
                      className="px-2 py-1 rounded-lg hover:bg-white/10 text-[0.68rem] text-white/70 hover:text-white transition-colors cursor-pointer font-semibold"
                    >
                      PT
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleResetTemplate()}
                    title={t("Reset current language to default copy", "Restaurar texto padrão deste idioma")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.05] text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>{t("Reset", "Restaurar")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTranslateAndSync}
                    disabled={isTranslating}
                    title={
                      lang === "en"
                        ? t(
                            "Translate English draft to Portuguese and update candidate email",
                            "Traduzir rascunho de inglês para português e atualizar e-mail do candidato",
                          )
                        : t(
                            "Translate Portuguese draft to English",
                            "Traduzir rascunho de português para inglês",
                          )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTranslating ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Globe size={13} />
                    )}
                    <span>
                      {isTranslating
                        ? t("Translating...", "A traduzir...")
                        : lang === "en"
                        ? t("Translate & Sync to PT", "Traduzir para PT")
                        : t("Translate & Sync to EN", "Traduzir para EN")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={isTranslating}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                      templateSavedFeedback
                        ? "bg-emerald-500 text-[#090d16]"
                        : isDraftDirty
                        ? "bg-white text-[#090d16] hover:bg-white/90 ring-2 ring-sky-400"
                        : "bg-white text-[#090d16] hover:bg-white/90"
                    }`}
                  >
                    {isTranslating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : templateSavedFeedback ? (
                      <Check size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>
                      {isTranslating
                        ? t("Saving & Syncing...", "A guardar...")
                        : templateSavedFeedback
                        ? t("✓ Saved & Synced to PT!", "✓ Salvo & Sincronizado!")
                        : t("Save Template", "Salvar Modelo")}
                    </span>
                  </button>
                </div>
              </div>

              {/* Panels Container */}
              <div
                className={
                  emailPreviewTab === "split"
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
                    : "w-full"
                }
              >
                {/* Editor */}
                {(emailPreviewTab === "edit" || emailPreviewTab === "split") && (
                  <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FileText size={17} className="text-white" />
                        <h3 className="text-base font-bold text-white">
                          <span>{t("Convocation Template (Email)", "Modelo da Convocatória (E-mail)")}</span>
                        </h3>
                        <span className="text-[0.68rem] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-white/80">
                          {lang.toUpperCase()}
                        </span>
                      </div>
                      {templateSavedFeedback && (
                        <span className="text-[0.68rem] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                          {t("✓ Template Applied & Active", "✓ Modelo Activo & Aplicado")}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/70">
                        {t("Email Subject:", "Assunto do E-mail:")}
                      </label>
                      <input
                        type="text"
                        value={broadcastSubject}
                        onChange={(e) => {
                          setBroadcastSubject(e.target.value);
                          setIsDraftDirty(true);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white focus:border-white/40 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-semibold text-white/70">
                          {t("Message Body (Text):", "Corpo da Mensagem (Texto):")}
                        </label>
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                          <span className="text-[0.68rem] text-white/40">
                            {t("Dynamic tags: {{name}}, {{booking_link}}, {{greeting}}", "Tags dinâmicas: {{name}}, {{booking_link}}, {{greeting}}")}
                          </span>
                          {/* Live Mozambique greeting clock */}
                          <span className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1 text-[0.68rem] text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                            <span>{t("Mozambique now:", "Moçambique agora:")}</span>
                            <strong className="text-white font-semibold">{lang === "pt" ? mozambiqueGreeting.pt : mozambiqueGreeting.en}</strong>
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={emailPreviewTab === "edit" ? 14 : 11}
                        value={broadcastMessage}
                        onChange={(e) => {
                          setBroadcastMessage(e.target.value);
                          setIsDraftDirty(true);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs font-mono text-white leading-relaxed focus:border-white/40 focus:outline-none"
                      />
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[0.68rem] text-white/40">
                        <p className="italic">
                          {t(
                            "Outgoing emails to candidates are dispatched in Portuguese (Moçambique) by default.",
                            "Os e-mails aos candidatos são enviados em português (Moçambique) por padrão.",
                          )}
                        </p>
                        {isDraftDirty && (
                          <span className="text-amber-300/90 font-medium">
                            {t("Draft has unsaved changes.", "Rascunho com alterações não salvas.")}
                          </span>
                        )}
                      </div>
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
                            className="flex items-center gap-2 text-sky-300 font-medium"
                          >
                            <Calendar size={13} />
                            <span>{formatSlotDisplay(s, lang)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* If in edit mode, show action bar to preview or send */}
                    {emailPreviewTab === "edit" && (
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setEmailPreviewTab("preview")}
                          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>{t("Preview Letterhead →", "Pré-visualizar Formato Oficial →")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmModalOpen(true)}
                          disabled={selectedCandidateIds.length === 0 || sendingBroadcast}
                          className="flex items-center gap-2 rounded-xl bg-white hover:bg-white/90 px-5 py-3 text-xs font-bold text-[#090d16] shadow-md transition-all cursor-pointer disabled:opacity-40"
                        >
                          <Send size={14} />
                          <span>{t(`Send to ${selectedCandidateIds.length} Candidates`, `Enviar a ${selectedCandidateIds.length} Candidatos`)}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Live Preview Panel */}
                {(emailPreviewTab === "preview" || emailPreviewTab === "split") && (
                  <div className="rounded-2xl border border-white/10 bg-[#0e1320] p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                            {t("Candidate Email Preview", "Pré-visualização do E-mail para Candidato")}
                          </span>
                          <div className="flex items-center gap-1 bg-white/[0.08] p-0.5 rounded-lg border border-white/10 text-[0.65rem]">
                            <button
                              type="button"
                              onClick={() => setPreviewLang("pt")}
                              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                previewLang === "pt"
                                  ? "bg-emerald-500 text-[#090d16]"
                                  : "text-white/60 hover:text-white"
                              }`}
                            >
                              PT (Oficial)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewLang("en")}
                              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                previewLang === "en"
                                  ? "bg-white text-[#090d16]"
                                  : "text-white/60 hover:text-white"
                              }`}
                            >
                              EN (Draft)
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {emailPreviewTab === "preview" && (
                            <button
                              type="button"
                              onClick={() => setEmailPreviewTab("edit")}
                              className="flex items-center gap-1 text-[0.68rem] text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer"
                            >
                              <FileText size={11} />
                              <span>{t("← Back to Editor", "← Voltar ao Editor")}</span>
                            </button>
                          )}
                          <span className="text-[0.68rem] text-slate-300 bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-md font-mono">
                            {previewLang === "pt"
                              ? "Versão Oficial Maputo (PT)"
                              : "Draft View (EN)"}
                          </span>
                        </div>
                      </div>

                      {/* Document Card Mirroring Actual Email */}
                      {(() => {
                        const tp = (enStr: string, ptStr: string) => (previewLang === "en" ? enStr : ptStr);
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl overflow-hidden text-xs">
                            {/* Official Letterhead Header */}
                            <div className="bg-[#0b1329] px-5 py-4 border-b-2 border-white/20 text-white">
                              <div className="flex items-center justify-between">
                                <Logo size="sm" variant="light" />
                                <div className="text-right">
                                  <span className="inline-block bg-white/10 text-white font-mono text-[0.6rem] px-2 py-0.5 rounded border border-white/10 font-bold">
                                    REF: CCO-2026/MAPUTO
                                  </span>
                                  <div className="text-[0.65rem] text-slate-300 mt-0.5 font-medium">
                                    {tp("Human Resources Department", "Departamento de Recursos Humanos")}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Subject Bar */}
                            <div className="bg-slate-100/90 px-5 py-2.5 border-b border-slate-200 text-[0.72rem] flex items-center gap-2 text-slate-700">
                              <span className="font-bold text-slate-500 text-[0.65rem] uppercase tracking-wider">{tp("Subject:", "Assunto:")}</span>
                              <span className="font-semibold text-slate-900 truncate">
                                {previewLang === "pt"
                                  ? (templatePT.subject || EMAIL_TEMPLATES.pt.subject)
                                  : broadcastSubject}
                              </span>
                            </div>

                            {/* Official Document Subheading */}
                            <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-[0.68rem]">
                              <span className="font-semibold text-slate-700 uppercase tracking-wide">
                                {tp("Official Selection Test Convocation", "Convocatória Oficial · Teste de Selecção Presencial")}
                              </span>
                              <span className="text-slate-500">
                                {tp("Maputo, Mozambique", "Maputo, Moçambique")}
                              </span>
                            </div>

                            {/* Letter Body */}
                            <div className="p-5 space-y-4">
                              <div className="text-slate-800 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                {(previewLang === "pt"
                                  ? (templatePT.message || EMAIL_TEMPLATES.pt.message)
                                  : broadcastMessage
                                ).replace(
                                  /\{\{name\}\}/g,
                                  broadcastAudience[0]?.name || "Maria João",
                                )}
                              </div>

                              {/* Test Slots Clean Table */}
                              <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 text-[0.68rem] font-bold text-slate-700 uppercase tracking-wider">
                                  {tp("Available Slots (10:00 – 11:30):", "Turnos Disponíveis (10h00 – 11h30):")}
                                </div>
                                <div className="divide-y divide-slate-200">
                                  {broadcastSlots.map((s, idx) => (
                                    <div
                                      key={idx}
                                      className="px-3.5 py-2 text-slate-800 font-medium text-[0.72rem] flex items-center justify-between"
                                    >
                                      <span>{formatSlotDisplay(s, previewLang)}</span>
                                      <span className="text-[0.65rem] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {tp("Option 0", "Opção 0")}{idx + 1}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Solid Executive CTA Button - Clickable to test booking experience */}
                              <div className="pt-2 text-center">
                                {(broadcastAudience[0]?.id || applications[0]?.id) ? (
                                  <a
                                    href={`/${previewLang}/careers/test-invite/${broadcastAudience[0]?.id || applications[0]?.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={tp("Preview candidate booking page in a new tab", "Pré-visualizar portal de agendamento numa nova aba")}
                                    className="inline-flex items-center gap-2 bg-[#0b1329] hover:bg-[#182342] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-md border border-[#0b1329] transition-all hover:scale-[1.02] cursor-pointer"
                                  >
                                    <span>{tp("Confirm My Test Attendance →", "Confirmar Minha Presença no Teste →")}</span>
                                    <ExternalLink size={13} className="text-white/70" />
                                  </a>
                                ) : (
                                  <div className="inline-flex items-center gap-2 bg-[#0b1329] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-sm border border-[#0b1329]">
                                    <span>{tp("Confirm My Test Attendance →", "Confirmar Minha Presença no Teste →")}</span>
                                  </div>
                                )}
                                <p className="text-[0.65rem] text-slate-500 mt-2 flex items-center justify-center gap-1">
                                  <ExternalLink size={10} className="text-slate-400" />
                                  <span>
                                    {tp(
                                      "Click button to test candidate booking portal in a new tab.",
                                      "Clique no botão para testar o portal de agendamento numa nova aba.",
                                    )}
                                  </span>
                                </p>
                              </div>

                              {/* Security Protocol Note */}
                              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-[0.68rem] text-amber-900 leading-snug">
                                <strong className="font-semibold block mb-0.5">{tp("Security Notice:", "Nota de Segurança:")}</strong>
                                {tp(
                                  "Present original valid ID (ID Card/Passport) at the Overwatch security gate for authorized entry.",
                                  "Apresente documento de identificação original (BI/Passaporte) na portaria da Overwatch para entrada autorizada.",
                                )}
                              </div>
                            </div>

                            {/* Sign-Off & Official Footer */}
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-[0.68rem] text-slate-600 flex items-center justify-between">
                              <div>
                                <strong>{tp("Recruitment Team", "Equipa de Recrutamento")}</strong> · Overwatch Moçambique
                              </div>
                              <span className="font-mono text-[0.62rem] text-slate-400">
                                Maputo, MZ
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Send Button */}
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setConfirmModalOpen(true)}
                        disabled={selectedCandidateIds.length === 0 || sendingBroadcast}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-white/90 px-6 py-4 text-sm font-bold text-[#090d16] shadow-xl transition-all cursor-pointer disabled:opacity-40"
                      >
                        <Send size={16} />
                        <span>
                          {filterInvited === "invited"
                            ? t(
                                `Resend Convocations to ${selectedCandidateIds.length} Candidates`,
                                `Reenviar Convocatórias para ${selectedCandidateIds.length} Candidatos`,
                              )
                            : t(
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
                )}
              </div>
            </div>

            {/* Confirmation & Live Batch Progress Modal */}
            {confirmModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#121827] p-6 shadow-2xl space-y-5">
                  {broadcastProgress ? (
                    /* ─── Real-Time Batch Progress Monitor ───────────────────── */
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl ${
                              broadcastProgress.done
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-sky-500/20 text-sky-400"
                            }`}
                          >
                            {broadcastProgress.done ? (
                              <CheckCircle2 size={22} />
                            ) : (
                              <RefreshCw size={22} className="animate-spin" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">
                              {broadcastProgress.done
                                ? t("Convocations Dispatched!", "Convocatórias Enviadas!")
                                : t(
                                    "Sending Convocations in Batches...",
                                    "A Enviar Convocatórias em Lotes...",
                                  )}
                            </h3>
                            <p className="text-xs text-white/60">
                              {broadcastProgress.done
                                ? t(
                                    "All selected candidates have been processed successfully.",
                                    "Todos os candidatos selecionados foram processados com sucesso.",
                                  )
                                : t(
                                    `Batch ${broadcastProgress.currentBatch} of ${broadcastProgress.totalBatches} (5 per batch · Paced for high deliverability)`,
                                    `Lote ${broadcastProgress.currentBatch} de ${broadcastProgress.totalBatches} (5 por lote · Envio cadenciado contra bloqueios)`,
                                  )}
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-extrabold text-white font-mono">
                          {Math.round(
                            (broadcastProgress.current / broadcastProgress.total) *
                              100,
                          )}
                          %
                        </span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              broadcastProgress.done
                                ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                                : "bg-gradient-to-r from-sky-400 to-emerald-400"
                            }`}
                            style={{
                              width: `${Math.max(
                                3,
                                Math.round(
                                  (broadcastProgress.current /
                                    broadcastProgress.total) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[0.68rem] text-white/50">
                          <span>
                            {t("Processed:", "Processados:")}{" "}
                            <strong className="text-white">
                              {broadcastProgress.current} / {broadcastProgress.total}
                            </strong>
                          </span>
                          <span>
                            {broadcastProgress.done
                              ? t("Finished", "Concluído")
                              : t("Safe Brevo Throttle Active", "Controlo de Ritmo Brevo Activo")}
                          </span>
                        </div>
                      </div>

                      {/* Metrics 3-Card Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                          <span className="text-[0.65rem] text-white/50 block font-semibold">
                            {t("Total", "Total")}
                          </span>
                          <span className="font-bold text-white text-base">
                            {broadcastProgress.total}
                          </span>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-2.5">
                          <span className="text-[0.65rem] text-emerald-400 block font-semibold">
                            {t("Success", "Sucesso")}
                          </span>
                          <span className="font-bold text-emerald-300 text-base">
                            {broadcastProgress.successCount}
                          </span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                          <span className="text-[0.65rem] text-rose-400 block font-semibold">
                            {t("Failed", "Falhas")}
                          </span>
                          <span className="font-bold text-rose-300 text-base">
                            {broadcastProgress.failedCount}
                          </span>
                        </div>
                      </div>

                      {/* Current Batch Candidate Names */}
                      {!broadcastProgress.done &&
                        broadcastProgress.currentNames.length > 0 && (
                          <div className="text-[0.68rem] text-white/70 bg-white/[0.03] p-3 rounded-xl border border-white/10 space-y-1">
                            <span className="text-white/40 block font-semibold">
                              {t("Active Batch:", "Lote em Envio:")}
                            </span>
                            <p className="text-sky-300 font-medium truncate">
                              {broadcastProgress.currentNames.join(" · ")}
                            </p>
                          </div>
                        )}

                      {/* Live Activity Log */}
                      {broadcastProgress.recentLogs.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1 text-[0.68rem] font-mono max-h-28 overflow-y-auto">
                          {broadcastProgress.recentLogs.map((log, idx) => (
                            <div
                              key={idx}
                              className={
                                log.startsWith("✓")
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }
                            >
                              {log}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="pt-2">
                        {broadcastProgress.done ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModalOpen(false);
                              setBroadcastProgress(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3.5 text-xs font-bold text-[#090d16] shadow-lg transition-all cursor-pointer"
                          >
                            <Check size={16} />
                            <span>
                              {t(
                                "Done — View Shortlisted Applications",
                                "Concluído — Ver Candidaturas",
                              )}
                            </span>
                          </button>
                        ) : (
                          <div className="text-center text-[0.68rem] text-white/40 italic">
                            {t(
                              "Please keep this tab open while batches are dispatched safely...",
                              "Por favor, mantenha esta aba aberta enquanto os lotes são enviados com segurança...",
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ─── Pre-Dispatch Confirmation ───────────────────────────── */
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-white/10 text-white">
                            <Send size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">
                              {t("Confirm Bulk Dispatch", "Confirmar Envio em Massa")}
                            </h3>
                            <p className="text-xs text-white/60">
                              {t(
                                "Overwatch Recruitment Operations",
                                "Operação de recrutamento Overwatch",
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setConfirmModalOpen(false)}
                          className="p-1 text-white/50 hover:text-white cursor-pointer"
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
                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                          <span>{selectedCandidateIds.length}</span>
                          <span className="text-xs font-normal text-white/60">
                            {t("candidates", "candidatos")} (
                            {Math.ceil(selectedCandidateIds.length / 5)}{" "}
                            {t("batches of 5", "lotes de 5")})
                          </span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-white/70">
                          <li>
                            {t(
                              "Sent in batches of 5 with safe pacing to avoid Brevo rate limits or timeouts.",
                              "Enviado em lotes de 5 com ritmo cadenciado contra bloqueios ou limites de envio.",
                            )}
                          </li>
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
                        </ul>

                        {/* Portuguese Delivery Assurance */}
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs space-y-1 mt-2">
                          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <Check size={12} />
                            <span>
                              {t(
                                "Dispatched in Official Portuguese (Moçambique)",
                                "Enviado em Português Oficial (Moçambique)",
                              )}
                            </span>
                          </div>
                          <p className="text-white font-medium text-[0.72rem] truncate">
                            <span className="text-white/50">
                              {t("Subject:", "Assunto:")}{" "}
                            </span>
                            {templatePT.subject || EMAIL_TEMPLATES.pt.subject}
                          </p>
                        </div>
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
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-white/90 py-3 text-xs font-bold text-[#090d16] shadow-lg transition-all cursor-pointer disabled:opacity-50"
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
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Archive Confirmation Modal */}
            {archiveModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121827] p-6 shadow-2xl space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-500/20 text-slate-300">
                        <Archive size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {t("Archive Non-Selected Candidates", "Arquivar Candidatos Não Selecionados")}
                        </h3>
                        <p className="text-xs text-white/50">
                          {t(
                            `Move ${unselectedCandidates.length} candidate(s) to Archived status`,
                            `Mover ${unselectedCandidates.length} candidato(s) para o estado Arquivado`,
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setArchiveModalOpen(false)}
                      className="text-white/50 hover:text-white cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/70 space-y-2">
                    <p>
                      {t(
                        "You are about to archive all applicants who are not in the current test emailing queue.",
                        "Está prestes a arquivar todos os candidatos que não estão selecionados para convocatória.",
                      )}
                    </p>
                    <p className="text-[0.68rem] text-white/50">
                      {t(
                        "Archived candidates will be hidden from the active convocation list but remain accessible in the Applications pipeline under the 'Archived' filter.",
                        "Os candidatos arquivados ficarão ocultos da lista ativa de convocatórias, mas permanecerão acessíveis no pipeline de candidaturas sob o filtro 'Arquivado'.",
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setArchiveModalOpen(false)}
                      disabled={bulkActionBusy}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                    >
                      {t("Cancel", "Cancelar")}
                    </button>

                    <button
                      type="button"
                      onClick={handleMassArchive}
                      disabled={bulkActionBusy}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {bulkActionBusy ? (
                        <>
                          <RefreshCw className="animate-spin" size={14} />
                          <span>{t("Archiving...", "A arquivar...")}</span>
                        </>
                      ) : (
                        <span>{t("Confirm Archive", "Confirmar Arquivamento")}</span>
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
                          {formatSlotDisplay(slot, lang)}
                        </h3>
                        <span className="text-[0.68rem] text-white/40 flex items-center gap-1 mt-1">
                          <Clock size={11} /> {t("10:00 to 11:30 (Arrival 09:45)", "10h00 às 11h30 (Chegada 09h45)")}
                        </span>
                      </div>

                      <span className="rounded-md bg-white/10 text-white font-mono border border-white/10 px-2.5 py-0.5 text-xs font-semibold">
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
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
                              >
                                <Phone size={11} />
                                <span>{c.whatsapp}</span>
                              </a>

                              <div className="flex items-center gap-2">
                                <a
                                  href={`/${lang}/careers/test-invite/${c.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={t("Open booking page in a new tab", "Abrir link de agendamento")}
                                  className="text-white/60 hover:text-white inline-flex items-center gap-1"
                                >
                                  <span>{t("Booking Page", "Página de Teste")}</span>
                                  <ExternalLink size={11} />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => setSelected(c)}
                                  className="text-white/60 hover:text-white underline cursor-pointer"
                                >
                                  {t("View CV", "Ver CV")}
                                </button>
                              </div>
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
                          className="text-[0.68rem] text-sky-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone size={10} />
                          <span>{c.whatsapp}</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyBookingLink(c.id)}
                          title={t("Copy personal booking link to send via WhatsApp", "Copiar link de marcação para enviar via WhatsApp")}
                          className="rounded-lg bg-white/5 border border-white/10 p-1.5 text-white/70 hover:text-white cursor-pointer"
                        >
                          {copiedLinkId === c.id ? (
                            <Check size={13} className="text-sky-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>

                        <a
                          href={`/${lang}/careers/test-invite/${c.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title={t("Open candidate booking page in a new tab", "Abrir página de agendamento")}
                          className="rounded-lg bg-white/5 border border-white/10 p-1.5 text-white/70 hover:text-white cursor-pointer"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* ─── BOOKING CONFIRMATION SEND SECTION ───────────────── */}
            {(() => {
              const confirmedCandidates = campaignApps.filter((a) => Boolean(a.testSlot));
              const allSelectedConfirm =
                confirmedCandidates.length > 0 &&
                confirmedCandidates.every((a) => confirmSelectedIds.includes(a.id));

              const previewText = confirmMessage
                .replace(/\{\{greeting\}\}/gi, lang === "pt" ? mozambiqueGreeting.pt : mozambiqueGreeting.en)
                .replace(/\{\{slot\}\}/gi, "Quarta-feira, 16 de Setembro – 10h00")
                .replace(/\{\{name\}\}/gi, "Candidata");

              const previewHtml = previewText
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/•/g, "&#8226;")
                .replace(/\n\n/g, "</p><p style='margin:0 0 12px 0;'>")
                .replace(/\n/g, "<br />");

              return (
                <div className="rounded-2xl border border-white/10 bg-[#0e1520]/90 overflow-hidden shadow-lg mt-6">
                  {/* Section header */}
                  <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                        <Send size={16} className="text-sky-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {t("Send Booking Confirmations", "Enviar Confirmações de Agendamento")}
                        </h3>
                        <p className="text-[0.68rem] text-white/50 mt-0.5">
                          {t(
                            "Send test instructions with official location and schedule to confirmed candidates.",
                            "Envie instruções oficiais de presença com endereço e horário às candidatas agendadas."
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Live Mozambique greeting clock badge */}
                    <span className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1 text-[0.68rem] text-white/70 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                      <span>{t("Mozambique now:", "Moçambique agora:")}</span>
                      <strong className="text-white font-semibold">
                        {lang === "pt" ? mozambiqueGreeting.pt : mozambiqueGreeting.en}
                      </strong>
                    </span>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Candidate selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white/70">
                          {t("Select candidates to notify:", "Selecionar candidatas para enviar confirmação:")}
                        </label>
                        {confirmedCandidates.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              allSelectedConfirm
                                ? setConfirmSelectedIds([])
                                : setConfirmSelectedIds(confirmedCandidates.map((a) => a.id))
                            }
                            className="text-[0.68rem] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer transition-colors"
                          >
                            {allSelectedConfirm
                              ? t("Deselect all", "Desselecionar todos")
                              : t("Select all", "Selecionar todos")}{" "}
                            ({confirmedCandidates.length})
                          </button>
                        )}
                      </div>

                      {confirmedCandidates.length === 0 ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-white/40 italic">
                          {t("No candidates have confirmed a test slot yet.", "Ainda não há candidatas com data confirmada.")}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                          {confirmedCandidates.map((c) => {
                            const isChecked = confirmSelectedIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() =>
                                  setConfirmSelectedIds((prev) =>
                                    isChecked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                  )
                                }
                                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                                  isChecked
                                    ? "border-sky-500/40 bg-sky-500/10 text-white shadow-sm"
                                    : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white"
                                }`}
                              >
                                <div
                                  className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                    isChecked ? "bg-sky-500 border-sky-500" : "border-white/30"
                                  }`}
                                >
                                  {isChecked && <Check size={10} className="text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                                  <p className="text-[0.63rem] text-white/45 truncate">
                                    {formatSlotDisplay(c.testSlot ?? "", lang)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Edit / Preview tabs */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex rounded-lg border border-white/10 overflow-hidden text-[0.68rem] font-semibold bg-white/[0.03]">
                          {(["edit", "preview"] as const).map((tab) => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setConfirmPreview(tab)}
                              className={`px-3 py-1.5 cursor-pointer transition-colors ${
                                confirmPreview === tab
                                  ? "bg-white/[0.12] text-white shadow-sm"
                                  : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                              }`}
                            >
                              {tab === "edit" ? t("Edit template", "Editar modelo") : t("Preview email", "Pré-visualizar e-mail")}
                            </button>
                          ))}
                        </div>
                        <span className="text-[0.65rem] text-white/40">
                          {t("Tags: {{greeting}}, {{slot}}, {{name}}", "Tags: {{greeting}}, {{slot}}, {{name}}")}
                        </span>
                      </div>

                      {confirmPreview === "edit" ? (
                        <div className="space-y-1.5">
                          <textarea
                            rows={15}
                            value={confirmMessage}
                            onChange={(e) => setConfirmMessage(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs font-mono text-white leading-relaxed focus:border-white/30 focus:outline-none resize-y"
                          />
                          <p className="text-[0.65rem] text-white/40 italic">
                            {t(
                              "The {{greeting}} tag automatically adapts to Mozambique time (Bom dia / Boa tarde / Boa noite) at send time.",
                              "A tag {{greeting}} ajusta automaticamente a saudação à hora de Moçambique no momento do envio."
                            )}
                          </p>
                        </div>
                      ) : (
                        /* Mobile-responsive email preview */
                        <div className="rounded-xl border border-white/10 overflow-hidden bg-[#f1f5f9] max-w-xl mx-auto shadow-md">
                          {/* Accent bar */}
                          <div className="h-1 bg-[#090d16]" />
                          {/* Letterhead */}
                          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
                            <span className="text-xs font-black text-slate-800 tracking-widest uppercase">
                              OVERWATCH
                            </span>
                            <div className="text-right">
                              <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-wider block">
                                Recrutamento &amp; Selecção
                              </span>
                              <span className="text-[0.6rem] text-slate-400 block">
                                Maputo, Moçambique
                              </span>
                            </div>
                          </div>
                          {/* Body */}
                          <div className="bg-white px-5 py-5 text-[13px] text-slate-700 leading-relaxed font-sans">
                            <div
                              dangerouslySetInnerHTML={{
                                __html: `<p style='margin:0 0 12px 0;'>${previewHtml}</p>`,
                              }}
                            />

                            {/* Location Callout preview */}
                            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 border-l-4 border-l-[#090d16] rounded-lg text-xs">
                              <div className="font-bold text-slate-800">Local do Teste Presencial:</div>
                              <div className="text-slate-600 mt-0.5">
                                Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia, Maputo
                              </div>
                              <div className="text-[0.68rem] text-sky-600 font-semibold mt-1">
                                Ver localização no Google Maps &rarr;
                              </div>
                            </div>
                          </div>
                          {/* Footer */}
                          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 text-[0.65rem] text-slate-500">
                            <strong className="text-slate-700 block">Overwatch Moçambique, Lda.</strong>
                            Av. Paulo Samuel Khankhomba nº 1948, Maputo · info@overwatchmoz.com
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setConfirmMessage(CONFIRM_DEFAULT_PT)}
                        className="flex items-center gap-1.5 text-[0.68rem] text-white/50 hover:text-white/80 font-medium cursor-pointer transition-colors"
                      >
                        <RotateCcw size={12} />
                        {t("Reset template to default", "Repor modelo padrão")}
                      </button>

                      <div className="flex items-center gap-3">
                        {confirmResult && (
                          <span
                            className={`text-[0.7rem] font-semibold ${
                              confirmResult.failed > 0 ? "text-amber-400" : "text-emerald-400"
                            }`}
                          >
                            {confirmResult.success > 0 && `✓ ${confirmResult.success} ${t("sent", "enviados")}`}
                            {confirmResult.failed > 0 &&
                              ` · ✕ ${confirmResult.failed} ${t("failed", "falharam")}`}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleSendConfirmations()}
                          disabled={confirmSending || confirmSelectedIds.length === 0}
                          className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-sky-900/20"
                        >
                          {confirmSending ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>{t("Sending confirmations…", "A enviar confirmações…")}</span>
                            </>
                          ) : (
                            <>
                              <Send size={13} />
                              <span>
                                {t(
                                  `Send Confirmation (${confirmSelectedIds.length})`,
                                  `Enviar Confirmação (${confirmSelectedIds.length})`
                                )}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* ─── TAB 4: APPLICATIONS PIPELINE VIEW ──────────────────── */}
        {view === "applications" && (
          <section className="space-y-4">
            {/* Filters Bar */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center gap-3">
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

                {/* Per Page Selector */}
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <span>{t("Show:", "Ver:")}</span>
                  <select
                    aria-label="Items per page"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-xl border border-white/10 bg-[#121827] px-2.5 py-2 text-xs text-white font-medium focus:border-white/40 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={9999}>{t("All", "Todos")}</option>
                  </select>
                </div>
              </div>

              {/* Quick Filter Pills Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.68rem] font-semibold text-white/40 mr-1 flex items-center gap-1">
                    <Filter size={11} />
                    <span>{t("Filter:", "Filtrar:")}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setAppQuickFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      appQuickFilter === "all"
                        ? "bg-white text-[#090d16] font-bold shadow-sm"
                        : "bg-white/[0.04] text-white/60 hover:text-white"
                    }`}
                  >
                    {t("Active Pipeline", "Candidaturas Activas")} ({applications.filter((a) => a.status !== "archived").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppQuickFilter("review")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      appQuickFilter === "review"
                        ? "bg-white text-[#090d16] font-bold shadow-sm"
                        : "bg-white/[0.04] text-white/60 hover:text-white"
                    }`}
                  >
                    {t("Under Review", "Em Análise")} ({applications.filter((a) => a.status === "reviewing" || a.status === "new").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppQuickFilter("shortlisted")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      appQuickFilter === "shortlisted"
                        ? "bg-white text-[#090d16] font-semibold shadow-sm"
                        : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                    }`}
                  >
                    {t("Shortlisted", "Pré-selecionados")} ({applications.filter((a) => a.status === "shortlisted").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppQuickFilter("booked")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      appQuickFilter === "booked"
                        ? "bg-white text-[#090d16] font-semibold shadow-sm"
                        : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/10"
                    }`}
                  >
                    {t("Test Booked", "Teste Agendado")} ({confirmedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppQuickFilter("archived")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      appQuickFilter === "archived"
                        ? "bg-white text-[#090d16] font-bold shadow-sm"
                        : "bg-white/[0.04] text-white/60 hover:text-white"
                    }`}
                  >
                    {t("Archived", "Arquivados")} ({applications.filter((a) => a.status === "archived").length})
                  </button>
                </div>

                {(query || roleFilter !== "all" || stageFilter !== "all" || appQuickFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setRoleFilter("all");
                      setStageFilter("all");
                      setAppQuickFilter("all");
                    }}
                    className="text-[0.7rem] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                  >
                    {t("Reset all filters", "Limpar todos os filtros")}
                  </button>
                )}
              </div>
            </div>

            {/* Mass Selection Toolbar */}
            {selectedAppIds.length > 0 && (
              <div className="rounded-xl border border-white/20 bg-[#141b2c] p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#090d16] font-bold text-xs">
                    {selectedAppIds.length}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {t(`${selectedAppIds.length} candidate(s) selected`, `${selectedAppIds.length} candidato(s) selecionado(s)`)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {appQuickFilter === "archived" ? (
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange(selectedAppIds, "reviewing")}
                      disabled={busy || deleteBusy}
                      className="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw size={13} />
                      <span>{t("Restore Selected", "Restaurar Selecionados")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange(selectedAppIds, "archived")}
                      disabled={busy || deleteBusy}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Archive size={13} />
                      <span>{t("Archive Selected", "Arquivar Selecionados")}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleBulkStatusChange(selectedAppIds, "shortlisted")}
                    disabled={busy || deleteBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-white hover:bg-white/90 text-[#090d16] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <UserCheck size={13} />
                    <span>{t("Shortlist Selected", "Pré-selecionar Selecionados")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const names = applications
                        .filter((a) => selectedAppIds.includes(a.id))
                        .map((a) => a.name);
                      setDeleteModalState({
                        open: true,
                        ids: selectedAppIds,
                        candidateNames: names,
                      });
                    }}
                    disabled={busy || deleteBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Trash2 size={13} />
                    <span>{t("Delete Selected", "Eliminar Selecionados")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAppIds([])}
                    className="text-xs text-white/50 hover:text-white px-2 py-1 cursor-pointer ml-1"
                  >
                    {t("Clear", "Desmarcar")}
                  </button>
                </div>
              </div>
            )}

            {/* Candidate Table */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/60 uppercase font-semibold text-[0.68rem] tracking-wider">
                      <th className="px-3.5 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={toggleSelectAllOnPage}
                          className="rounded border-white/20 bg-white/10 accent-white focus:ring-0 cursor-pointer h-4 w-4"
                          title={t("Select all on this page", "Selecionar todos nesta página")}
                        />
                      </th>
                      <th className="px-3 py-3.5 w-12 text-center">{t("#", "Nº")}</th>
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
                    {paginatedCandidates.map((a, index) => {
                      const isChecked = selectedAppIds.includes(a.id);
                      const rowNumber = startIndex + index + 1;

                      return (
                        <tr
                          key={a.id}
                          className={`hover:bg-white/[0.03] transition-colors ${
                            isChecked ? "bg-white/[0.04]" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3.5 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectApp(a.id)}
                              className="rounded border-white/20 bg-white/10 accent-white focus:ring-0 cursor-pointer h-4 w-4"
                            />
                          </td>

                          {/* Numbered Row */}
                          <td className="px-3 py-3 text-center text-[0.72rem] font-mono text-white/50">
                            {rowNumber}
                          </td>

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
                                a.status === "hired" || a.status === "shortlisted"
                                  ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 font-bold"
                                  : a.status === "interview"
                                    ? "border-sky-500/30 text-sky-300 bg-sky-500/10 font-medium"
                                    : a.status === "archived"
                                      ? "border-slate-500/30 text-slate-400 bg-slate-500/10"
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
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-0.5 text-[0.68rem] font-medium text-indigo-300">
                                <CalendarCheck size={11} className="text-indigo-400" />
                                {formatSlotDisplay(a.testSlot.split("–")[0].trim(), lang)}
                              </span>
                            ) : a.invitedAt ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 text-[0.68rem] font-medium text-amber-300">
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
                              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white hover:underline text-xs"
                            >
                              <Phone size={11} className="text-sky-400" />
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
                              <span className="text-white font-medium">{t("Yes", "Sim")}</span>
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
                              <span className="text-white font-medium">
                                {t("Yes", "Sim")}
                              </span>
                            ) : (
                              <span className="text-white/40">{t("No", "Não")}</span>
                            )}
                          </td>

                          {/* CCTV Experience */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {a.experience === "yes" ? (
                              <span className="text-white font-medium">
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
                              <span className="text-white font-medium">
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

                          {/* Row Actions: Open Booking Page, Archive, Profile */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Open Candidate Booking Link */}
                              <a
                                href={`/${lang}/careers/test-invite/${a.id}`}
                                target="_blank"
                                rel="noreferrer"
                                title={t("Open candidate booking page in a new tab", "Abrir link de agendamento do candidato")}
                                className="inline-flex items-center p-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
                              >
                                <ExternalLink size={12} />
                              </a>

                              {/* Single Archive / Restore Action */}
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(a)}
                                title={
                                  a.status === "archived"
                                    ? t("Restore candidate to review", "Restaurar candidatura")
                                    : t("Archive candidate", "Arquivar candidato")
                                }
                                className={`inline-flex items-center p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  a.status === "archived"
                                    ? "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
                                    : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:border-white/25"
                                }`}
                              >
                                <Archive size={12} />
                              </button>

                              {/* Single Permanent Delete Action */}
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteModalState({
                                    open: true,
                                    ids: [a.id],
                                    candidateNames: [a.name],
                                  })
                                }
                                title={t("Delete candidate permanently", "Eliminar candidatura permanentemente")}
                                className="inline-flex items-center p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:border-red-500/40 transition-colors cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>

                              {/* Open Profile Modal */}
                              <button
                                onClick={() => setSelected(a)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-2 py-1 text-[0.7rem] font-semibold text-white hover:bg-white/15 transition-all cursor-pointer ml-0.5"
                              >
                                <span>{t("Profile", "Perfil")}</span>
                                <ArrowUpRight size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

              {/* Enhanced Table Pagination Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-4 py-3 text-[0.7rem] text-white/60">
                <div className="flex items-center gap-2">
                  <span>
                    {totalCandidates > 0
                      ? t(
                          `Showing ${startIndex + 1}–${endIndex} of ${totalCandidates} candidates`,
                          `A mostrar ${startIndex + 1}–${endIndex} de ${totalCandidates} candidatos`,
                        )
                      : t("No candidates", "Sem candidatos")}
                  </span>
                  <span className="text-white/20">|</span>
                  <span className="text-white/40">
                    {t(`Total: ${applications.length}`, `Total: ${applications.length}`)}
                  </span>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={activePage === 1}
                      title={t("First page", "Primeira página")}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none text-white cursor-pointer"
                    >
                      <ChevronsLeft size={13} />
                    </button>

                    {/* Previous Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={activePage === 1}
                      title={t("Previous page", "Página anterior")}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none text-white cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 mx-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            Math.abs(p - activePage) <= 1,
                        )
                        .map((p, i, arr) => {
                          const prev = arr[i - 1];
                          const showEllipsis = prev && p - prev > 1;

                          return (
                            <div key={p} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-1 text-white/30 text-[0.65rem]">…</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(p)}
                                className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  p === activePage
                                    ? "bg-white text-[#090d16] font-bold shadow-sm"
                                    : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white"
                                }`}
                              >
                                {p}
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    {/* Next Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={activePage === totalPages}
                      title={t("Next page", "Próxima página")}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none text-white cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>

                    {/* Last Page */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={activePage === totalPages}
                      title={t("Last page", "Última página")}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none text-white cursor-pointer"
                    >
                      <ChevronsRight size={13} />
                    </button>
                  </div>
                )}
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
            <div className="rounded-2xl border border-sky-500/20 bg-[#121827]/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <CalendarCheck size={14} />
                  <span>{t("Convocation & Selection Test", "Convocatória & Teste Presencial")}</span>
                </span>
                {current.testSlot ? (
                  <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                    {formatSlotDisplay(current.testSlot, lang)}
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
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-bold text-[#090d16] hover:bg-white/90 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{current.invitedAt ? t("Resend Email", "Reenviar E-mail") : t("Send Email", "Enviar E-mail")}</span>
                </button>
              </div>

              {/* Direct Booking Page Link */}
              <a
                href={`/${lang}/careers/test-invite/${current.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition-all cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>{t("Open Candidate Booking Page ↗", "Ver Página de Agendamento ↗")}</span>
              </a>
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
                    className="mt-1 font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
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
                  <FileText size={15} className="text-sky-400" />
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
                    <span className="text-[0.68rem] text-sky-400 font-semibold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
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

              {/* Danger Zone: Permanent Delete */}
              <div className="pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalState({
                      open: true,
                      ids: [current.id],
                      candidateNames: [current.name],
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{t("Delete Candidate Permanently", "Eliminar Candidato Definitivamente")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PERMANENT DELETE CONFIRMATION MODAL ─────────────────────── */}
      {deleteModalState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#121827] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {deleteModalState.ids.length === 1
                      ? t("Permanently Delete Candidate", "Eliminar Candidato Definitivamente")
                      : t(
                          `Permanently Delete ${deleteModalState.ids.length} Candidates`,
                          `Eliminar ${deleteModalState.ids.length} Candidatos Definitivamente`,
                        )}
                  </h3>
                  <p className="text-xs text-red-400/80 font-semibold">
                    {t("Irreversible Action · Cannot be undone", "Ação Irreversível · Não pode ser desfeita")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalState({ open: false, ids: [] })}
                disabled={deleteBusy}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-xs text-white/80 space-y-2">
              <p>
                {deleteModalState.ids.length === 1 ? (
                  <>
                    {t(
                      "Are you sure you want to permanently delete",
                      "Tem a certeza que deseja eliminar permanentemente",
                    )}{" "}
                    <strong className="text-white font-bold">
                      {deleteModalState.candidateNames?.[0] || "this candidate"}
                    </strong>
                    {t(
                      "? All application records and the attached CV document will be erased forever.",
                      "? Todos os dados da candidatura e o documento do CV anexo serão eliminados para sempre.",
                    )}
                  </>
                ) : (
                  <>
                    {t(
                      `Are you sure you want to permanently delete these ${deleteModalState.ids.length} selected candidates? All candidate profiles, test convocations, and attached CVs will be permanently removed from storage and database.`,
                      `Tem a certeza que deseja eliminar permanentemente estes ${deleteModalState.ids.length} candidatos selecionados? Todos os perfis, convocatórias e CVs anexos serão removidos definitivamente da base de dados e do armazenamento.`,
                    )}
                  </>
                )}
              </p>
              {deleteModalState.candidateNames && deleteModalState.candidateNames.length > 1 && (
                <div className="max-h-28 overflow-y-auto rounded-lg bg-black/40 p-2.5 text-[0.7rem] text-white/60 space-y-1">
                  {deleteModalState.candidateNames.slice(0, 10).map((name, idx) => (
                    <div key={idx} className="truncate">• {name}</div>
                  ))}
                  {deleteModalState.candidateNames.length > 10 && (
                    <div className="italic text-white/40">
                      + {deleteModalState.candidateNames.length - 10}{" "}
                      {t("more candidates...", "outros candidatos...")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalState({ open: false, ids: [] })}
                disabled={deleteBusy}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors cursor-pointer disabled:opacity-50"
              >
                {t("Cancel", "Cancelar")}
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={deleteBusy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteBusy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{t("Deleting...", "A eliminar...")}</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>{t("Delete Permanently", "Eliminar Definitivamente")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Live Arrival Toast ─────────────────────────────────────── */}
      {liveNotification && (() => {
        const isApp = liveNotification.type === "new_app";
        const nameParts = liveNotification.subtitle.split("—")[0].trim().split(" ");
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : liveNotification.subtitle.slice(0, 2).toUpperCase();
        return (
          <div className="fixed bottom-5 right-4 z-50 w-[320px] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="relative rounded-2xl bg-[#0d1422] border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.7)] overflow-hidden flex">
              {/* Left accent bar */}
              <div className={`w-1 shrink-0 ${isApp ? "bg-sky-400" : "bg-indigo-400"}`} />

              <div className="flex-1 px-4 py-3.5 min-w-0">
                {/* Top row: label + timestamp + close */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/50">
                    {isApp
                      ? t("New application", "Nova candidatura")
                      : t("Test slot confirmed", "Agendamento confirmado")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.6rem] text-white/35 font-mono tabular-nums">
                      {liveNotification.timestamp}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLiveNotification(null)}
                      className="text-white/30 hover:text-white/80 transition-colors cursor-pointer -mr-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Candidate row */}
                <div className="flex items-center gap-3">
                  {/* Initials avatar */}
                  <div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-[0.72rem] font-semibold bg-white/10 text-white/90 border border-white/15">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white leading-tight truncate">
                      {liveNotification.subtitle.split("—")[0].trim()}
                    </p>
                    {liveNotification.subtitle.includes("—") && (
                      <p className="text-[0.67rem] text-white/45 mt-0.5 truncate">
                        {liveNotification.subtitle.split("—").slice(1).join("—").trim()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action link */}
                {liveNotification.candidateId && (
                  <button
                    type="button"
                    onClick={() => {
                      const found = applications.find(a => a.id === liveNotification.candidateId);
                      if (found) { setSelected(found); setView("applications"); }
                      setLiveNotification(null);
                    }}
                    className="mt-3 text-[0.68rem] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowUpRight size={12} />
                    {isApp
                      ? t("Open application", "Ver candidatura")
                      : t("View in schedule", "Ver na agenda")}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
