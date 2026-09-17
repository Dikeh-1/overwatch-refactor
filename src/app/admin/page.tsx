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
  Plus,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Edit3,
  UserX,
  QrCode,
  Camera,
  Languages,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import TechGrid from "@/components/ui/TechGrid";
import LazyVideo from "@/components/ui/LazyVideo";
import DocxViewer from "@/components/admin/DocxViewer";
import GateCheckInModal from "@/components/admin/GateCheckInModal";
import { CustomBroadcastView } from "@/components/admin/CustomBroadcastView";
import RebookingGraceView from "@/components/admin/RebookingGraceView";
import { IMAGES } from "@/lib/constants";
import {
  type Application,
  type Role,
  stages,
  DEFAULT_TEST_SLOTS,
} from "@/lib/careers";
import { screenCandidate, type CandidateScreeningResult } from "@/lib/careers-screening";
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
    .replace("Segunda-feira", "Monday")
    .replace("Terça-feira", "Tuesday")
    .replace("Quarta-feira", "Wednesday")
    .replace("Quinta-feira", "Thursday")
    .replace("Sexta-feira", "Friday")
    .replace("Sábado", "Saturday")
    .replace("Domingo", "Sunday")
    .replace("de Setembro", "September")
    .replace("de Outubro", "October")
    .replace("de Novembro", "November")
    .replace("de Dezembro", "December")
    .replace("de Janeiro", "January")
    .replace("de Fevereiro", "February")
    .replace("de Março", "March")
    .replace("de Abril", "April")
    .replace("de Maio", "May")
    .replace("de Junho", "June")
    .replace("de Julho", "July")
    .replace("de Agosto", "August")
    .replace(/(\d{1,2})h(\d{2})/, (_, h, m) => {
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    });
}

/** Extract numeric day of the month from a slot label (e.g. "16", "21") */
export function getSlotDayNumber(slot: string): number | null {
  if (!slot) return null;
  const s = slot.trim();
  const iso = s.match(/^\d{4}-\d{2}-(\d{2})/);
  if (iso) return parseInt(iso[1], 10);
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})/);
  if (dmy) return parseInt(dmy[1], 10);
  const dayMonth = s.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:de\s*)?(?:Setembro|September|Outubro|October|Novembro|November|Dezembro|December|Janeiro|January|Fevereiro|February|Março|March|Abril|April|Maio|May|Junho|June|Julho|July|Agosto|August)/i
  );
  if (dayMonth) return parseInt(dayMonth[1], 10);
  const monthDay = s.match(
    /(?:Setembro|September|Outubro|October|Novembro|November|Dezembro|December|Janeiro|January|Fevereiro|February|Março|March|Abril|April|Maio|May|Junho|June|Julho|July|Agosto|August)\s*(\d{1,2})/i
  );
  if (monthDay) return parseInt(monthDay[1], 10);
  const generic = s.match(/(?:^|[^\d])(\d{1,2})(?:\s*de\s*|\s+[-–—]|\s+|$)/);
  if (generic) {
    const num = parseInt(generic[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 31) return num;
  }
  return null;
}

/** Classify slot into This Week (16 – 18 Sept) or Next Week (21 – 25 Sept) */
export function getSlotWeekCategory(slot: string): "this_week" | "next_week" {
  const day = getSlotDayNumber(slot);
  // September 2026: Days 14 to 20 are This Week (tests on 16, 17, 18).
  // Days 21 and above are Next Week (tests on 21, 22, 23, 24, 25).
  if (day !== null && day <= 20) {
    return "this_week";
  }
  return "next_week";
}

const EMAIL_TEMPLATES = {
  pt: {
    subject: "Convocatória: Teste de Selecção Presencial — Overwatch Moçambique",
    message: `{{greeting}} {{name}},

Agradecemos a sua candidatura à vaga de Operadora de CCO da Overwatch.

Após análise da sua candidatura, foi seleccionada para avançar para a próxima fase do processo de recrutamento: teste de selecção presencial.

Por favor, escolha uma das seguintes opções de data e confirme a sua presença através do link pessoal no botão abaixo.

Após a sua selecção, a sua vaga fica automaticamente confirmada no nosso sistema. O agendamento é de utilização única e a escolha é definitiva, não podendo ser alterada.

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

Upon selection, your slot is automatically confirmed in our system. Booking is single-use and your selection is final and cannot be changed.

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
    "applications" | "roles" | "broadcast" | "confirmations" | "schedule" | "disqualify" | "custom_broadcast" | "rebooking_grace"
  >("applications");
  // ─── Per-Role Campaign Workspace ──────────────────────────────────
  const [activeCampaignRole, setActiveCampaignRole] = useState<string | null>(null);
  const [activeCampaignView, setActiveCampaignView] = useState<
    "applications" | "broadcast" | "confirmations" | "schedule"
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
  const [translatedCoverLetter, setTranslatedCoverLetter] = useState<{ [id: string]: string }>({});
  const [translatingCoverLetterId, setTranslatingCoverLetterId] = useState<string | null>(null);
  const [showCoverLetterEn, setShowCoverLetterEn] = useState<{ [id: string]: boolean }>({});

  const handleTranslateCoverLetter = async (candidateId: string, text?: string) => {
    if (!text || !text.trim()) return;
    if (translatedCoverLetter[candidateId]) {
      setShowCoverLetterEn((prev) => ({ ...prev, [candidateId]: !prev[candidateId] }));
      return;
    }
    setTranslatingCoverLetterId(candidateId);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from: "pt", to: "en" }),
      });
      const data = await res.json();
      if (data?.translated) {
        setTranslatedCoverLetter((prev) => ({ ...prev, [candidateId]: data.translated }));
        setShowCoverLetterEn((prev) => ({ ...prev, [candidateId]: true }));
      }
    } catch (err) {
      console.error("Cover letter translation failed:", err);
    } finally {
      setTranslatingCoverLetterId(null);
    }
  };
  const [broadcastSlots, setBroadcastSlots] = useState<string[]>([...DEFAULT_TEST_SLOTS]);
  const [savingSlots, setSavingSlots] = useState(false);
  const [slotsSavedFeedback, setSlotsSavedFeedback] = useState(false);
  const [isManagingSlots, setIsManagingSlots] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState("Segunda-feira");
  const [newSlotDayNum, setNewSlotDayNum] = useState("21");
  const [newSlotMonth, setNewSlotMonth] = useState("Setembro");
  const [newSlotTime, setNewSlotTime] = useState("10h00");
  const [newSlotCustom, setNewSlotCustom] = useState("");
  const [useCustomInput, setUseCustomInput] = useState(false);

  // Gate Attendance & QR scanner modal states
  const [gateScannerOpen, setGateScannerOpen] = useState(false);
  const [gatePosterOpen, setGatePosterOpen] = useState(false);

  const rosterSlots = useMemo(() => {
    const list = [...broadcastSlots];
    // Guarantee this week's scheduled sessions are present so admin can track them
    const THIS_WEEK_DEFAULTS = [
      "Quarta-feira, 16 de Setembro – 10h00",
      "Quinta-feira, 17 de Setembro – 10h00",
      "Sexta-feira, 18 de Setembro – 10h00",
    ];
    for (const tw of THIS_WEEK_DEFAULTS) {
      if (!list.includes(tw)) list.push(tw);
    }
    for (const a of applications) {
      if (a.testSlot && !list.includes(a.testSlot)) {
        list.push(a.testSlot);
      }
    }
    // Sort all slots chronologically by day number (16, 17, 18, 21, 22, 23, 24, 25...)
    return list.sort((a, b) => {
      const dayA = getSlotDayNumber(a) ?? 99;
      const dayB = getSlotDayNumber(b) ?? 99;
      return dayA - dayB;
    });
  }, [broadcastSlots, applications]);

  const thisWeekSlots = useMemo(() => {
    return rosterSlots.filter((s) => getSlotWeekCategory(s) === "this_week");
  }, [rosterSlots]);

  const nextWeekSlots = useMemo(() => {
    return rosterSlots.filter((s) => getSlotWeekCategory(s) === "next_week");
  }, [rosterSlots]);

  const thisWeekCount = useMemo(() => {
    return applications.filter((a) => Boolean(a.testSlot) && getSlotWeekCategory(a.testSlot!) === "this_week").length;
  }, [applications]);

  const nextWeekCount = useMemo(() => {
    return applications.filter((a) => Boolean(a.testSlot) && getSlotWeekCategory(a.testSlot!) === "next_week").length;
  }, [applications]);

  const missedTestCount = useMemo(() => {
    return applications.filter((a) => {
      if (a.status === "archived" || a.status === "rejected") return false;
      if (
        a.id === "6548b28d-9e3b-41c0-bfcf-47c992fa0956" ||
        a.email?.toLowerCase() === "inociowilson7@gmail.com"
      ) {
        return false;
      }
      const wasPast =
        a.testSlot &&
        (a.testSlot.includes("16 de Setembro") ||
          a.testSlot.includes("17 de Setembro") ||
          a.testSlot.includes("18 de Setembro"));
      return (wasPast && !a.attendedAt) || (Boolean(a.rebookingGrace) && !a.rebookingGrace?.usedAt);
    }).length;
  }, [applications]);

  const [rosterWeekTab, setRosterWeekTab] = useState<"this_week" | "next_week" | "all">("this_week");
  const [selectedRosterSlot, setSelectedRosterSlot] = useState<string>("all_this_week");

  const activeRosterSlot = useMemo(() => {
    if (selectedRosterSlot === "all") return "all";
    if (selectedRosterSlot === "all_this_week") return "all_this_week";
    if (selectedRosterSlot === "all_next_week") return "all_next_week";
    if (selectedRosterSlot && rosterSlots.includes(selectedRosterSlot)) {
      return selectedRosterSlot;
    }
    if (rosterWeekTab === "this_week") return "all_this_week";
    if (rosterWeekTab === "next_week") return "all_next_week";
    return "all";
  }, [selectedRosterSlot, rosterSlots, rosterWeekTab]);

  const rosterSlotRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rosterSlotRowRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [rosterWeekTab]);

  const scrollSlotRow = (direction: "left" | "right") => {
    if (rosterSlotRowRef.current) {
      const offset = direction === "left" ? -280 : 280;
      rosterSlotRowRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  useEffect(() => {
    async function loadTestSlots() {
      try {
        const res = await fetch("/api/admin/careers/test-slots");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.slots) && data.slots.length > 0) {
            setBroadcastSlots(data.slots);
          }
        }
      } catch (err) {
        console.error("Failed to load test slots:", err);
      }
    }
    loadTestSlots();
  }, []);

  const handleSaveSlotsToServer = async (slotsToSave: string[]) => {
    const valid = slotsToSave.map((s) => s.trim()).filter(Boolean);
    if (valid.length === 0) return;
    setSavingSlots(true);
    try {
      const res = await fetch("/api/admin/careers/test-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: valid }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.slots)) {
          setBroadcastSlots(data.slots);
        }
        setSlotsSavedFeedback(true);
        setTimeout(() => setSlotsSavedFeedback(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save slots:", err);
    } finally {
      setSavingSlots(false);
    }
  };

  const handleAddSlot = () => {
    const slotStr = useCustomInput
      ? newSlotCustom.trim()
      : `${newSlotDay}, ${newSlotDayNum} de ${newSlotMonth} – ${newSlotTime}`;
    if (!slotStr) return;
    if (broadcastSlots.includes(slotStr)) {
      return;
    }
    const updated = [...broadcastSlots, slotStr];
    setBroadcastSlots(updated);
    if (useCustomInput) setNewSlotCustom("");
    handleSaveSlotsToServer(updated);
  };

  const handleRemoveSlot = (index: number) => {
    if (broadcastSlots.length <= 1) return;
    const updated = broadcastSlots.filter((_, idx) => idx !== index);
    setBroadcastSlots(updated);
    handleSaveSlotsToServer(updated);
  };

  const handleMoveSlot = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= broadcastSlots.length) return;
    const updated = [...broadcastSlots];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setBroadcastSlots(updated);
    handleSaveSlotsToServer(updated);
  };

  const handleSlotEditChange = (index: number, newValue: string) => {
    const updated = [...broadcastSlots];
    updated[index] = newValue;
    setBroadcastSlots(updated);
  };

  const handleApplyPreset = (presetKey: "next_week_5" | "next_week_3" | "current_week") => {
    let slots: string[] = [];
    if (presetKey === "next_week_5") {
      slots = [
        "Segunda-feira, 21 de Setembro – 10h00",
        "Terça-feira, 22 de Setembro – 10h00",
        "Quarta-feira, 23 de Setembro – 10h00",
        "Quinta-feira, 24 de Setembro – 10h00",
        "Sexta-feira, 25 de Setembro – 10h00",
      ];
    } else if (presetKey === "next_week_3") {
      slots = [
        "Segunda-feira, 21 de Setembro – 10h00",
        "Terça-feira, 22 de Setembro – 10h00",
        "Quarta-feira, 23 de Setembro – 10h00",
      ];
    } else if (presetKey === "current_week") {
      slots = [
        "Quarta-feira, 16 de Setembro – 10h00",
        "Quinta-feira, 17 de Setembro – 10h00",
        "Sexta-feira, 18 de Setembro – 10h00",
      ];
    }
    setBroadcastSlots(slots);
    handleSaveSlotsToServer(slots);
  };

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
  const [confirmSubTab, setConfirmSubTab] = useState<"unsent" | "sent">("unsent");
  const [resendingConfirmId, setResendingConfirmId] = useState<string | null>(null);
  const [testConfirmEmail, setTestConfirmEmail] = useState("");
  const [testConfirmSending, setTestConfirmSending] = useState(false);
  const [testConfirmStatus, setTestConfirmStatus] = useState<"idle" | "success" | "error">("idle");
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testSendingType, setTestSendingType] = useState<"convocation" | "confirmation" | "disqualification" | null>(null);
  const [testEmailResult, setTestEmailResult] = useState<{
    type: "convocation" | "confirmation" | "disqualification";
    success: boolean;
    messageId?: string;
    error?: string;
  } | null>(null);
  const [disqualifyReasonPreset, setDisqualifyReasonPreset] = useState<string>(
    "Não cumprimento dos requisitos eliminatórios do concurso (ausência de carta de apresentação ou falta de comprovação curricular de experiência prévia em sistemas de CCTV para candidatos masculinos)."
  );
  const [customDisqualifyReason, setCustomDisqualifyReason] = useState<string>("");
  const [disqualifyFilterTab, setDisqualifyFilterTab] = useState<"all" | "booked">("all");

  // ─── Gate Pass Dispatch & 1-Day Prior Reminders ─────────────────────
  const [dispatchingPasses, setDispatchingPasses] = useState(false);
  const [dispatchPassesResult, setDispatchPassesResult] = useState<{
    success: number;
    failed: number;
    targetDay?: number;
    skippedToday?: number;
    skippedAttended?: number;
  } | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [remindersResult, setRemindersResult] = useState<{
    success: number;
    failed: number;
    targetDay?: number;
    skippedToday?: number;
  } | null>(null);

  // ─── Address Rectification ──────────────────────────────────────────
  const [dispatchingCorrection, setDispatchingCorrection] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<{ success: boolean; count: number; failed: number } | null>(null);

  // ─── Live Admin Presence Tracking ─────────────────────────────────
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // ─── Applications Table Pagination, Quick Filters & Bulk Selection ─
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusSuccessId, setStatusSuccessId] = useState<string | null>(null);
  const [appQuickFilter, setAppQuickFilter] = useState<
    "all" | "review" | "shortlisted" | "booked" | "archived" | "disqualified"
  >("all");

  // ─── Disqualification Audit Modal & Action ─────────────────────────
  const [disqualifyModalState, setDisqualifyModalState] = useState<{
    open: boolean;
    ids: string[];
    candidateNames: string[];
    bookedCount: number;
  }>({ open: false, ids: [], candidateNames: [], bookedCount: 0 });
  const [disqualifyBusy, setDisqualifyBusy] = useState(false);
  const [disqualifySendEmail, setDisqualifySendEmail] = useState(true);

  // ─── Undo Disqualification / Restore & Rectification State ─────────
  const [restoreModalState, setRestoreModalState] = useState<{
    open: boolean;
    ids: string[];
    candidateNames: string[];
    restoreAllWomen?: boolean;
  }>({ open: false, ids: [], candidateNames: [] });
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreSendEmail, setRestoreSendEmail] = useState(true);
  const [restoreSuccessToast, setRestoreSuccessToast] = useState<string | null>(null);

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
        /^(Bom dia|Boa tarde|Boa noite|Good morning|Good afternoon|Good evening)(,?\s*)/i,
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

  // Auto-select first open or populated campaign role when roles first load
  useEffect(() => {
    if (roles.length > 0 && activeCampaignRole === null) {
      const firstRole =
        roles.find((r) => r.open) ||
        roles.find((r) => applications.some((a) => a.role === r.id)) ||
        roles[0];
      if (firstRole) {
        setActiveCampaignRole(firstRole.id);
      }
    }
  }, [roles, activeCampaignRole, applications]);

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

  // Screening analysis for all candidates
  const candidateScreenings = useMemo(() => {
    const map = new Map<string, CandidateScreeningResult>();
    for (const a of applications) {
      map.set(a.id, screenCandidate(a));
    }
    return map;
  }, [applications]);

  const disqualifiedCandidates = useMemo(() => {
    return applications.filter((a) => {
      if (a.status === "archived") return false;
      const sc = candidateScreenings.get(a.id);
      return Boolean(sc?.disqualified);
    });
  }, [applications, candidateScreenings]);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      // Scope to active campaign role workspace
      if (activeCampaignRole && a.role !== activeCampaignRole) return false;

      // Quick filter tabs
      if (appQuickFilter === "archived" && a.status !== "archived") return false;
      if (appQuickFilter === "booked" && !a.testSlot) return false;
      if (appQuickFilter === "shortlisted" && a.status !== "shortlisted") return false;
      if (appQuickFilter === "review" && a.status !== "reviewing" && a.status !== "new") return false;
      if (appQuickFilter === "disqualified") {
        if (a.status === "archived") return false;
        const sc = candidateScreenings.get(a.id);
        if (!sc?.disqualified) return false;
      }

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
  }, [applications, activeCampaignRole, appQuickFilter, stageFilter, roleFilter, query, candidateScreenings]);

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

  // Instant optimistic status change with inline feedback indicator
  const handleCandidateStatusChange = async (id: string, newStatus: string) => {
    const previous = applications.find((a) => a.id === id)?.status;
    // Optimistic update for instant UI feedback
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus as any } : a))
    );
    if (selected && selected.id === id) {
      setSelected((prev) => (prev ? { ...prev, status: newStatus as any } : null));
    }
    setStatusUpdatingId(id);

    try {
      const r = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "status",
          id,
          status: newStatus,
        }),
      });
      if (!r.ok) throw new Error("Could not update candidate status.");
      setStatusSuccessId(id);
      setTimeout(() => {
        setStatusSuccessId((curr) => (curr === id ? null : curr));
      }, 2200);
    } catch (e) {
      // Revert optimistic update on failure
      if (previous) {
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: previous } : a))
        );
        if (selected && selected.id === id) {
          setSelected((prev) => (prev ? { ...prev, status: previous } : null));
        }
      }
      setError((e as Error).message);
    } finally {
      setStatusUpdatingId((curr) => (curr === id ? null : curr));
    }
  };

  // Disqualification executor (archives candidate and terminates booked slots)
  const handleExecuteDisqualification = async (targetIds: string[], sendEmail: boolean = true) => {
    if (!targetIds.length) return;
    setDisqualifyBusy(true);
    try {
      const res = await fetch("/api/admin/careers/disqualify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targetIds, sendEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disqualification failed.");

      // Optimistically update applications
      setApplications((prev) =>
        prev.map((a) =>
          targetIds.includes(a.id)
            ? { ...a, status: "archived", testSlot: undefined, testBookedAt: undefined }
            : a
        )
      );
      if (selected && targetIds.includes(selected.id)) {
        setSelected((prev) =>
          prev
            ? { ...prev, status: "archived", testSlot: undefined, testBookedAt: undefined }
            : null
        );
      }
      setSelectedAppIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      setDisqualifyModalState({ open: false, ids: [], candidateNames: [], bookedCount: 0 });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDisqualifyBusy(false);
    }
  };

  // Restore & Apology executor (undoes accidental disqualification, moves to shortlisted, and sends retraction email)
  const handleExecuteRestore = async (
    targetIds: string[],
    restoreAllWomen: boolean = false,
    sendEmail: boolean = true
  ) => {
    setRestoreBusy(true);
    try {
      const res = await fetch("/api/admin/careers/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: targetIds,
          restoreAllArchivedWomen: restoreAllWomen,
          sendApologyEmail: sendEmail,
          targetStatus: "shortlisted",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao restaurar candidaturas.");

      const restoredIdSet = new Set<string>(
        (data.results || []).map((r: { id: string }) => r.id).concat(targetIds)
      );

      setApplications((prev) =>
        prev.map((a) =>
          restoredIdSet.has(a.id)
            ? { ...a, status: "shortlisted" as any, testSlot: undefined, testBookedAt: undefined }
            : a
        )
      );

      if (selected && restoredIdSet.has(selected.id)) {
        setSelected((prev) =>
          prev
            ? { ...prev, status: "shortlisted" as any, testSlot: undefined, testBookedAt: undefined }
            : null
        );
      }

      setSelectedAppIds((prev) => prev.filter((id) => !restoredIdSet.has(id)));
      setRestoreModalState({ open: false, ids: [], candidateNames: [] });
      setRestoreSuccessToast(
        lang === "pt"
          ? `${data.count} candidatura(s) restaurada(s) com sucesso para "Pré-seleccionadas"! ${sendEmail ? "E-mail de rectificação enviado." : ""}`
          : `Successfully restored ${data.count} candidate(s) to "Shortlisted"! ${sendEmail ? "Rectification email sent." : ""}`
      );
      setTimeout(() => setRestoreSuccessToast(null), 7000);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRestoreBusy(false);
    }
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
    const nextStatus = candidate.status === "archived" ? "reviewing" : "archived";
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
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConfirmSending(false);
    }
  }

  async function handleResendConfirmation(candidateId: string) {
    setResendingConfirmId(candidateId);
    try {
      const res = await fetch("/api/admin/careers/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, messageText: confirmMessage }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to resend confirmation.");
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResendingConfirmId(null);
    }
  }

  async function handleDispatchAllGatePasses() {
    const msg = lang === "pt"
      ? `Deseja enviar o Passe Oficial de Acesso com Código QR por e-mail para as candidatas agendadas para amanhã? (Candidatas que já realizaram o teste ou com data de hoje serão automaticamente excluídas).`
      : `Send official Gate Access Pass with QR Code via email to candidates scheduled for tomorrow? (Candidates who already took the test or scheduled for today will be automatically excluded).`;
    if (!window.confirm(msg)) return;

    setDispatchingPasses(true);
    setDispatchPassesResult(null);
    try {
      const res = await fetch("/api/admin/careers/dispatch-gate-passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch gate passes.");
      }
      setDispatchPassesResult({
        success: data.count || 0,
        failed: data.failed || 0,
        targetDay: data.targetDay,
        skippedToday: data.skippedTodayCount,
        skippedAttended: data.skippedAlreadyAttendedCount,
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDispatchingPasses(false);
    }
  }

  async function handleSendTomorrowReminders() {
    const msg = lang === "pt"
      ? `Deseja enviar o lembrete oficial de teste para as candidatas agendadas para amanhã? (As candidatas de hoje serão automaticamente excluídas).`
      : `Send official test reminders to candidates scheduled for tomorrow? (Today's candidates will be automatically excluded).`;
    if (!window.confirm(msg)) return;

    setSendingReminders(true);
    setRemindersResult(null);
    try {
      const res = await fetch("/api/admin/careers/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send reminders.");
      }
      setRemindersResult({
        success: data.count || 0,
        failed: data.failed || 0,
        targetDay: data.targetDay,
        skippedToday: data.skippedTodayCount,
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingReminders(false);
    }
  }

  async function handleSendAddressCorrection() {
    const bookedCount = applications.filter(
      (a) => Boolean(a.testSlot) && a.status !== "rejected" && a.status !== "archived"
    ).length;
    const msg = lang === "pt"
      ? `Tem a certeza de que deseja enviar o e-mail oficial de rectificação de endereço (N.º 1948) com o passe QR actualizado para todas as ${bookedCount} candidatas agendadas?`
      : `Are you sure you want to broadcast the official address correction email (No. 1948) with updated QR pass to all ${bookedCount} booked candidates?`;
    if (!window.confirm(msg)) return;

    setDispatchingCorrection(true);
    setCorrectionResult(null);
    try {
      const res = await fetch("/api/admin/careers/address-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "all_booked" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send address correction emails.");
      }
      setCorrectionResult({ success: data.success, count: data.count || 0, failed: data.failed || 0 });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDispatchingCorrection(false);
    }
  }



  async function handleSendTestEmail(
    type: "convocation" | "confirmation" | "disqualification",
    targetEmail?: string,
    options?: {
      subject?: string;
      messageText?: string;
      slot?: string;
      reason?: string;
    }
  ) {
    const to = (targetEmail || testEmailAddress || testConfirmEmail).trim();
    if (!to || !to.includes("@")) {
      setError(lang === "pt" ? "Por favor indique um e-mail de teste válido." : "Please enter a valid test email.");
      return;
    }
    setTestSendingType(type);
    setTestConfirmSending(true);
    setTestEmailResult(null);
    setTestConfirmStatus("idle");
    try {
      const res = await fetch("/api/admin/careers/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          toEmail: to,
          subject:
            options?.subject ||
            (type === "convocation" ? broadcastSubject : undefined),
          messageText:
            options?.messageText ||
            (type === "convocation"
              ? broadcastMessage
              : type === "confirmation"
                ? confirmMessage
                : undefined),
          slot:
            options?.slot ||
            (!["all", "all_this_week", "all_next_week"].includes(activeRosterSlot) ? activeRosterSlot : (broadcastSlots[0] || "Segunda-feira, 21 de Setembro – 10h00")),
          reason:
            options?.reason ||
            customDisqualifyReason ||
            disqualifyReasonPreset,
          slots: broadcastSlots,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao enviar e-mail de teste.");
      }
      setTestEmailResult({
        type,
        success: true,
        messageId: data.messageId,
      });
      setTestConfirmStatus("success");
      setTimeout(() => {
        setTestEmailResult(null);
        setTestConfirmStatus("idle");
      }, 8000);
    } catch (err) {
      const errMsg = (err as Error).message || "Erro no envio de teste.";
      setTestEmailResult({
        type,
        success: false,
        error: errMsg,
      });
      setTestConfirmStatus("error");
      setError(errMsg);
    } finally {
      setTestSendingType(null);
      setTestConfirmSending(false);
    }
  }

  // Backward compatibility alias for confirmation section
  async function handleSendTestConfirmation() {
    await handleSendTestEmail("confirmation", testConfirmEmail);
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
    const targetApps = applications.filter((a) => {
      if (!a.testSlot) return false;
      if (!slotFilter || slotFilter === "all") return true;
      if (slotFilter === "all_this_week") return getSlotWeekCategory(a.testSlot) === "this_week";
      if (slotFilter === "all_next_week") return getSlotWeekCategory(a.testSlot) === "next_week";
      return a.testSlot === slotFilter;
    });
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
      t("Gate Attendance", "Presença no Portão"),
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
      `"${a.attendedAt ? `${t("Present", "Presente")} (${new Date(a.attendedAt).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })})` : t("Awaiting", "Aguardado")}"`,
      `""`, // Blank signature cell for physical sign-off sheet
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix =
      slotFilter === "all_this_week"
        ? "-esta-semana"
        : slotFilter === "all_next_week"
          ? "-proxima-semana"
          : slotFilter && slotFilter !== "all"
            ? `-${slotFilter.replace(/[^\w.-]/g, "_").slice(0, 24)}`
            : "-consolidado";
    a.download = `overwatch-attendance-roster${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Toggle candidate gate attendance (1-click from admin or check-in)
  const handleToggleAttendance = async (id: string, makePresent: boolean) => {
    const nowIso = makePresent ? new Date().toISOString() : undefined;
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              attendedAt: nowIso,
              attendanceStatus: makePresent ? "present" : undefined,
            }
          : a
      )
    );

    try {
      const res = await fetch("/api/careers/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: makePresent ? "check_in" : "mark_absent",
          force: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || (lang === "pt" ? "Erro ao atualizar presença." : "Failed to update attendance."));
        load();
      }
    } catch (err) {
      console.error("Failed to toggle attendance:", err);
      load();
    }
  };

  // Callback when candidate is successfully checked in via Gate Scanner
  const handleGateCheckInSuccess = (candidate: any) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === candidate.id
          ? {
              ...a,
              attendedAt: candidate.attendedAt || new Date().toISOString(),
              attendanceStatus: "present",
            }
          : a
      )
    );
  };

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

  const totalAppsCount = campaignApps.length;
  const womenTotalCount = campaignApps.filter((a) => a.sex === "female").length;
  const menTotalCount = campaignApps.filter((a) => a.sex === "male").length;

  const confirmedCount = campaignApps.filter((a) => Boolean(a.testSlot)).length;
  const confirmedWomenCount = campaignApps.filter((a) => Boolean(a.testSlot) && a.sex === "female").length;
  const confirmedMenCount = campaignApps.filter((a) => Boolean(a.testSlot) && a.sex === "male").length;

  const targetCount = campaignApps.filter(
    (a) => a.sex === "female" || (a.sex === "male" && a.experience === "yes"),
  ).length;
  const targetWomenCount = campaignApps.filter((a) => a.sex === "female").length;
  const targetMenCount = campaignApps.filter((a) => a.sex === "male" && a.experience === "yes").length;

  const pendingConfirmationCount = campaignApps.filter(
    (a) => Boolean(a.invitedAt) && !a.testSlot && a.status !== "archived",
  ).length;
  const pendingConfirmationWomen = campaignApps.filter(
    (a) => Boolean(a.invitedAt) && !a.testSlot && a.status !== "archived" && a.sex === "female",
  ).length;
  const pendingConfirmationMen = campaignApps.filter(
    (a) => Boolean(a.invitedAt) && !a.testSlot && a.status !== "archived" && a.sex === "male",
  ).length;

  const disqualifiedCount = campaignApps.filter(
    (a) => a.status === "archived" || (a.sex === "male" && a.experience !== "yes"),
  ).length;
  const disqualifiedWomen = campaignApps.filter(
    (a) => (a.status === "archived" || (a.sex === "male" && a.experience !== "yes")) && a.sex === "female",
  ).length;
  const disqualifiedMen = campaignApps.filter(
    (a) => (a.status === "archived" || (a.sex === "male" && a.experience !== "yes")) && a.sex === "male",
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
    <div className="min-h-screen text-white flex flex-col lg:flex-row relative isolate" style={{ background: "var(--bg-base)" }}>
      <TechGrid className="fixed inset-0 opacity-20 pointer-events-none" />

      {/* ─── MOBILE TOP BAR (STICKY DOCKED NAVBAR) ──────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-3.5 py-2.5 backdrop-blur-md shadow-lg" style={{ background: "rgba(7,8,15,0.95)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
            style={{ border: "1px solid var(--border-default)" }}
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
          <Link href="/admin" className="shrink-0 flex items-center">
            <Logo size="xs" variant="light" />
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeCampaignRole && view !== "roles" && (
            <span className="flex items-center gap-1 text-[0.62rem] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2.5 py-1 whitespace-nowrap">
              <Briefcase size={10} className="shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {roleLabel(activeCampaignRole)}
              </span>
            </span>
          )}
          <button
            onClick={() => void load(true)}
            disabled={isRefreshing}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            style={{ border: "1px solid var(--border-default)" }}
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* ─── MOBILE SIDEBAR OVERLAY ──────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
      <aside className={`
        admin-sidebar fixed inset-y-0 left-0 z-50 w-72 flex flex-col overflow-y-auto
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

        <div className="pb-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <Link href="/admin" className="block">
              <Logo size="sm" variant="light" />
            </Link>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white/20"></span>
              <span className="text-[0.62rem] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {t("Talent Operations", "Operações de Recrutamento")}
              </span>
            </div>
          </div>

          {/* Live Admin Presence Indicator */}
          <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-[0.68rem]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-2.5">
              <span className="live-dot"></span>
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                {lang === "pt"
                  ? `${onlineCount} Admin${onlineCount > 1 ? "s" : ""} Online`
                  : `${onlineCount} Admin${onlineCount > 1 ? "s" : ""} Live`}
              </span>
            </div>
            <span className="text-[0.62rem] font-semibold monospace" style={{ color: "var(--accent-green)", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "2px 6px" }}>
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

          {/* ── CAMPAIGN WORKSPACES (ALL ROLES) ───────────────────── */}
          {roles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[0.62rem] font-bold uppercase tracking-widest text-white/35">
                  {t("Role Workspaces", "Painéis das Vagas")}
                </p>
                <span className="text-[0.6rem] text-white/30 font-mono">
                  {roles.length} {t("roles", "vagas")}
                </span>
              </div>
              <div className="space-y-1">
                {roles.map((role) => {
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
                  const roleUnconfirmed = applications.filter(
                    (a) => a.role === role.id && Boolean(a.invitedAt) && !a.testSlot && a.status !== "archived",
                  ).length;
                  const roleConfirmedUnsent = applications.filter(
                    (a) => a.role === role.id && Boolean(a.testSlot) && !a.confirmationSentAt,
                  ).length;
                  const roleDisqualified = applications.filter(
                    (a) => a.role === role.id && screenCandidate(a).disqualified,
                  ).length;
                  const roleDisqualifiedBooked = applications.filter(
                    (a) => a.role === role.id && Boolean(a.testSlot) && screenCandidate(a).disqualified,
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
                          <span className={`px-1.5 py-0.2 rounded text-[0.52rem] font-bold ${
                            role.open
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          }`}>
                            {role.open ? t("OPEN", "ABERTA") : t("CLOSED", "FECHADA")}
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

                          {/* Confirmations sub-tab */}
                          <button
                            onClick={() => { setView("confirmations"); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold transition-all cursor-pointer ${
                              view === "confirmations"
                                ? "bg-white/[0.1] text-white border border-white/15"
                                : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-white/70" />
                              <span>{t("Confirmations", "Confirmações")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {roleConfirmedUnsent > 0 ? (
                                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium">
                                  {roleConfirmedUnsent}
                                </span>
                              ) : roleConfirmed > 0 ? (
                                <span className="rounded-md bg-white/10 text-white/60 border border-white/10 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium">
                                  {roleConfirmed}
                                </span>
                              ) : null}
                            </div>
                          </button>

                          {/* Disqualifications sub-tab */}
                          <button
                            onClick={() => { setView("disqualify"); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold transition-all cursor-pointer ${
                              view === "disqualify"
                                ? "bg-white/[0.1] text-white border border-white/15"
                                : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserX size={13} className={roleDisqualifiedBooked > 0 ? "text-amber-400" : "text-white/70"} />
                              <span>{t("Disqualifications", "Desqualificações")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {roleDisqualifiedBooked > 0 ? (
                                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium" title={t("Booked candidates failing criteria", "Agendados sem requisitos")}>
                                  {roleDisqualifiedBooked} {t("booked", "agendados")}
                                </span>
                              ) : roleDisqualified > 0 ? (
                                <span className="rounded-md bg-white/10 text-white/60 border border-white/10 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium">
                                  {roleDisqualified}
                                </span>
                              ) : null}
                            </div>
                          </button>

                          {/* Targeted Broadcast & Custom Emails sub-tab */}
                          <button
                            onClick={() => { setView("custom_broadcast"); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold transition-all cursor-pointer ${
                              view === "custom_broadcast"
                                ? "bg-white/[0.1] text-white border border-white/15"
                                : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Send size={13} className="text-sky-400" />
                              <span>{t("Broadcast & Emails", "Comunicações & Disparos")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {roleUnconfirmed > 0 && (
                                <span className="rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium" title={t("Unconfirmed invitations", "Convocados sem confirmação")}>
                                  {roleUnconfirmed}
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Rebooking Grace (OTL) sub-tab */}
                          <button
                            onClick={() => { setView("rebooking_grace"); setSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[0.72rem] font-semibold transition-all cursor-pointer ${
                              view === "rebooking_grace"
                                ? "bg-white/[0.1] text-white border border-white/15"
                                : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <RotateCcw size={13} className="text-amber-400" />
                              <span>{t("Rebooking Grace (OTL)", "Reagendamentos (OTL)")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {missedTestCount > 0 && (
                                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[0.58rem] font-mono font-medium" title={t("Missed test candidates", "Candidatos que faltaram")}>
                                  {missedTestCount}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
      <main className="flex-1 min-w-0 lg:ml-64 p-4 sm:p-6 lg:p-8 space-y-6">
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
                      : view === "confirmations"
                        ? t("Confirmations", "Confirmações")
                        : view === "disqualify"
                          ? t("Disqualifications", "Desqualificações")
                          : view === "custom_broadcast"
                            ? t("Broadcast & Emails", "Comunicações & Disparos")
                            : view === "rebooking_grace"
                              ? t("Rebooking Grace (OTL)", "Reagendamentos (OTL)")
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
                    : view === "confirmations"
                      ? t("Booking Confirmations", "Confirmações de Agendamento")
                      : view === "disqualify"
                        ? t("Disqualification & Compliance", "Desqualificação & Conformidade")
                        : view === "custom_broadcast"
                          ? t("Targeted Broadcasts & Direct Outreach", "Comunicações Personalizadas & Broadcast")
                          : view === "rebooking_grace"
                            ? t("Rebooking Grace & One-Time Links (OTL)", "Período de Graça & Reagendamento (OTL)")
                            : t("Applications", "Candidaturas")}
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              {view === "roles"
                ? t("Manage public careers page role availability", "Gerir disponibilidade de vagas na página pública")
                : view === "broadcast"
                  ? t("Dispatch and track candidate test invitations", "Envio e controlo de convites para testes presenciais")
                  : view === "schedule"
                    ? t("Confirmed candidate attendance by session", "Presenças confirmadas de candidatos por turno")
                    : view === "confirmations"
                      ? t("Dispatch official test instructions to confirmed candidates", "Envio de instruções oficiais às candidatas que já agendaram turno")
                      : view === "disqualify"
                        ? t("Manage candidate screening compliance, preview rejection letters, and cancel booked slots for non-compliant candidates", "Gestão de conformidade de critérios, pré-visualização de modelo de desqualificação e cancelamento de testes")
                        : view === "custom_broadcast"
                          ? t("Dispatch targeted emails, urgent notices, and reminders to selected candidate segments", "Envio de comunicados direccionados, avisos urgentes e lembretes a grupos de candidatos")
                          : view === "rebooking_grace"
                            ? t("Grant exceptional rebooking opportunities with single-use links (OTL) to candidates who missed their test", "Concessão de nova oportunidade de agendamento com links de uso único (OTL) para candidatos ausentes")
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
            className="alert-banner alert-red"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}



        {/* ─── STATS CARDS WITH GENDER BREAKDOWN ─────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Applicants */}
          <div className="kpi-card kpi-card-accent-blue">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="admin-label">{t("Total Applicants", "Total Candidatos")}</p>
              <div className="kpi-icon kpi-icon-blue shrink-0">
                <Users size={14} />
              </div>
            </div>
            <strong className="admin-metric text-xl sm:text-2xl">{totalAppsCount}</strong>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10 text-[0.65rem]">
              <span className="inline-flex items-center gap-0.5 text-pink-400 font-semibold bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                ♀ {womenTotalCount} {t("women", "mulheres")}
              </span>
              <span className="inline-flex items-center gap-0.5 text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                ♂ {menTotalCount} {t("men", "homens")}
              </span>
            </div>
          </div>

          {/* Shortlisted / Eligible for Test */}
          <div className="kpi-card kpi-card-accent-green">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="admin-label">{t("Shortlisted / Test", "Apurados p/ Teste")}</p>
              <div className="kpi-icon kpi-icon-green shrink-0">
                <UserCheck size={14} />
              </div>
            </div>
            <strong className="admin-metric text-xl sm:text-2xl" style={{ color: "var(--accent-green)" }}>
              {targetCount}
            </strong>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10 text-[0.65rem]">
              <span className="inline-flex items-center gap-0.5 text-pink-400 font-semibold bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                ♀ {targetWomenCount} {t("women", "mulheres")}
              </span>
              <span className="inline-flex items-center gap-0.5 text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                ♂ {targetMenCount} {t("men", "homens")}
              </span>
            </div>
          </div>

          {/* Confirmed Tests */}
          <div className="kpi-card kpi-card-accent-blue">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="admin-label">{t("Confirmed Tests", "Data Confirmada")}</p>
              <div className="kpi-icon kpi-icon-blue shrink-0">
                <CalendarCheck size={14} />
              </div>
            </div>
            <strong className="admin-metric text-xl sm:text-2xl" style={{ color: "var(--accent-blue)" }}>
              {confirmedCount}
            </strong>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10 text-[0.65rem]">
              <span className="inline-flex items-center gap-0.5 text-pink-400 font-semibold bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                ♀ {confirmedWomenCount} {t("women", "mulheres")}
              </span>
              <span className="inline-flex items-center gap-0.5 text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                ♂ {confirmedMenCount} {t("men", "homens")}
              </span>
            </div>
          </div>

          {/* Pending Confirmation (Filipa Target Audience) */}
          <div
            onClick={() => setView("custom_broadcast")}
            className="kpi-card kpi-card-accent-amber cursor-pointer hover:border-amber-500/50 hover:bg-white/[0.03] transition-all"
            title={t("Click to broadcast reminder", "Clique para enviar aviso de confirmação")}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="admin-label">{t("Pending Confirmation", "Pendente Confirmação")}</p>
              <div className="kpi-icon kpi-icon-amber shrink-0">
                <Clock size={14} />
              </div>
            </div>
            <strong className="admin-metric text-xl sm:text-2xl" style={{ color: "var(--accent-amber)" }}>
              {pendingConfirmationCount}
            </strong>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10 text-[0.65rem]">
              <span className="inline-flex items-center gap-0.5 text-pink-400 font-semibold bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                ♀ {pendingConfirmationWomen} {t("women", "mulheres")}
              </span>
              <span className="inline-flex items-center gap-0.5 text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                ♂ {pendingConfirmationMen} {t("men", "homens")}
              </span>
            </div>
          </div>

          {/* Disqualified / Not Shortlisted */}
          <div
            onClick={() => setView("disqualify")}
            className="kpi-card cursor-pointer hover:border-rose-500/40 hover:bg-white/[0.03] transition-all"
            style={{ borderColor: "rgba(244, 63, 94, 0.2)" }}
            title={t("Click to view disqualified", "Clique para ver não apurados")}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="admin-label">{t("Disqualified / No Exp", "Não Apurados")}</p>
              <div className="kpi-icon shrink-0 bg-rose-500/15 text-rose-400 border border-rose-500/20">
                <UserX size={14} />
              </div>
            </div>
            <strong className="admin-metric text-xl sm:text-2xl text-rose-400">
              {disqualifiedCount}
            </strong>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10 text-[0.65rem]">
              <span className="inline-flex items-center gap-0.5 text-pink-400 font-semibold bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">
                ♀ {disqualifiedWomen}
              </span>
              <span className="inline-flex items-center gap-0.5 text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                ♂ {disqualifiedMen}
              </span>
            </div>
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

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCampaignRole(r.id);
                          setView("applications");
                        }}
                        className="text-xs font-semibold text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Briefcase size={13} className="text-sky-400" />
                        <span>{t("Manage Applicants", "Gerir Candidatos")} ({applications.filter((a) => a.role === r.id).length})</span>
                      </button>

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
                          // When toggling a role, keep the workspace active so the team can continue processing applicants
                          if (opening) {
                            setActiveCampaignRole(r.id);
                            setView("applications");
                          } else {
                            // When closing role, do NOT clear activeCampaignRole. Keep managing current applicants!
                            if (!activeCampaignRole) {
                              setActiveCampaignRole(r.id);
                            }
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

                    {/* Test Slots Configuration & Manual Entry Card */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={16} className="text-cyan-400 shrink-0" />
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {t("Configure Test Schedule (Days, Dates & Times)", "Configuração de Datas, Dias e Horários do Teste")}
                            </span>
                            <span className="text-[0.68rem] text-white/50">
                              {t(
                                "Manual entry for test slots included in invitations and candidate booking link.",
                                "Entrada manual dos dias e horas incluídos nos convites e no link de agendamento.",
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[0.65rem] px-2.5 py-0.5 font-semibold">
                            {broadcastSlots.length} {t("Slots Active", "Turnos Activos")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsManagingSlots((prev) => !prev)}
                            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] hover:bg-white/10 px-2.5 py-1 text-[0.7rem] font-semibold text-white transition-colors cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>{isManagingSlots ? t("Close Editor", "Fechar Gestor") : t("Manage / Add Slots", "Gerir / Adicionar")}</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Presets Toolbar */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[0.7rem]">
                        <span className="text-white/40 font-medium text-[0.68rem]">
                          {t("Quick Presets:", "Predefinições:")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset("next_week_5")}
                          className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all font-medium cursor-pointer"
                        >
                          📅 {t("Next Week (Mon–Fri 10:00)", "Próxima Semana (Seg–Sex 10h00)")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset("next_week_3")}
                          className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                          📅 {t("Next Week (Mon–Wed)", "Próxima Semana (Seg–Qua)")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset("current_week")}
                          className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                          ↺ {t("Reset 16–18 Sept", "Repor 16–18 Set")}
                        </button>
                      </div>

                      {/* Slots List (Editable Rows) */}
                      <div className="space-y-2">
                        {broadcastSlots.map((slot, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-white/10 bg-black/30 p-2.5 flex items-center justify-between gap-3 text-xs group hover:border-white/20 transition-all"
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="font-mono text-[0.62rem] text-slate-400 bg-white/10 px-1.5 py-0.5 rounded shrink-0">
                                #{idx + 1}
                              </span>

                              {isManagingSlots ? (
                                <input
                                  type="text"
                                  value={slot}
                                  onChange={(e) => handleSlotEditChange(idx, e.target.value)}
                                  className="w-full bg-white/[0.06] border border-white/20 rounded px-2.5 py-1 text-xs text-white font-medium focus:border-cyan-400 focus:outline-none"
                                  placeholder="Ex: Segunda-feira, 21 de Setembro – 10h00"
                                />
                              ) : (
                                <div className="flex items-center gap-2 min-w-0">
                                  <Calendar size={13} className="text-cyan-400 shrink-0" />
                                  <span className="font-medium text-white truncate">
                                    {slot}
                                  </span>
                                  {lang === "en" && (
                                    <span className="text-[0.68rem] text-white/40 truncate">
                                      ({formatSlotDisplay(slot, "en")})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isManagingSlots && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSlot(idx, "up")}
                                    disabled={idx === 0}
                                    title="Mover para cima"
                                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSlot(idx, "down")}
                                    disabled={idx === broadcastSlots.length - 1}
                                    title="Mover para baixo"
                                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSlot(idx)}
                                    disabled={broadcastSlots.length <= 1}
                                    title="Remover turno"
                                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-20 cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Slot Builder / Manual Entry Form (Shown when isManagingSlots is active) */}
                      {isManagingSlots && (
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3.5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-[0.72rem] uppercase tracking-wider text-cyan-300">
                              {t("+ Add New Test Slot / Date", "+ Adicionar Novo Turno / Data")}
                            </span>
                            <button
                              type="button"
                              onClick={() => setUseCustomInput((p) => !p)}
                              className="text-[0.68rem] text-cyan-400 hover:underline cursor-pointer"
                            >
                              {useCustomInput
                                ? t("Use Day/Date Pickers", "Usar Selecção Rápida")
                                : t("Enter Custom Text Directly", "Digitar Texto Manual")}
                            </button>
                          </div>

                          {!useCustomInput ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[0.65rem] text-white/50 block mb-1">
                                  {t("Day of Week", "Dia da Semana")}
                                </label>
                                <select
                                  value={newSlotDay}
                                  onChange={(e) => setNewSlotDay(e.target.value)}
                                  className="w-full rounded bg-white/[0.08] border border-white/20 px-2 py-1.5 text-xs text-white"
                                >
                                  <option value="Segunda-feira" className="bg-[#121827]">Segunda-feira</option>
                                  <option value="Terça-feira" className="bg-[#121827]">Terça-feira</option>
                                  <option value="Quarta-feira" className="bg-[#121827]">Quarta-feira</option>
                                  <option value="Quinta-feira" className="bg-[#121827]">Quinta-feira</option>
                                  <option value="Sexta-feira" className="bg-[#121827]">Sexta-feira</option>
                                  <option value="Sábado" className="bg-[#121827]">Sábado</option>
                                  <option value="Domingo" className="bg-[#121827]">Domingo</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[0.65rem] text-white/50 block mb-1">
                                  {t("Day Number", "Dia (Número)")}
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={newSlotDayNum}
                                  onChange={(e) => setNewSlotDayNum(e.target.value)}
                                  className="w-full rounded bg-white/[0.08] border border-white/20 px-2 py-1.5 text-xs text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[0.65rem] text-white/50 block mb-1">
                                  {t("Month", "Mês")}
                                </label>
                                <select
                                  value={newSlotMonth}
                                  onChange={(e) => setNewSlotMonth(e.target.value)}
                                  className="w-full rounded bg-white/[0.08] border border-white/20 px-2 py-1.5 text-xs text-white"
                                >
                                  <option value="Janeiro" className="bg-[#121827]">Janeiro</option>
                                  <option value="Fevereiro" className="bg-[#121827]">Fevereiro</option>
                                  <option value="Março" className="bg-[#121827]">Março</option>
                                  <option value="Abril" className="bg-[#121827]">Abril</option>
                                  <option value="Maio" className="bg-[#121827]">Maio</option>
                                  <option value="Junho" className="bg-[#121827]">Junho</option>
                                  <option value="Julho" className="bg-[#121827]">Julho</option>
                                  <option value="Agosto" className="bg-[#121827]">Agosto</option>
                                  <option value="Setembro" className="bg-[#121827]">Setembro</option>
                                  <option value="Outubro" className="bg-[#121827]">Outubro</option>
                                  <option value="Novembro" className="bg-[#121827]">Novembro</option>
                                  <option value="Dezembro" className="bg-[#121827]">Dezembro</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[0.65rem] text-white/50 block mb-1">
                                  {t("Time", "Horário")}
                                </label>
                                <input
                                  type="text"
                                  value={newSlotTime}
                                  onChange={(e) => setNewSlotTime(e.target.value)}
                                  placeholder="10h00"
                                  className="w-full rounded bg-white/[0.08] border border-white/20 px-2 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="text"
                                value={newSlotCustom}
                                onChange={(e) => setNewSlotCustom(e.target.value)}
                                placeholder="Ex: Segunda-feira, 21 de Setembro – 10h00"
                                className="w-full rounded bg-white/[0.08] border border-white/20 px-3 py-2 text-xs text-white"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[0.68rem] text-white/40">
                              Preview: <strong className="text-white">{useCustomInput ? newSlotCustom || "—" : `${newSlotDay}, ${newSlotDayNum} de ${newSlotMonth} – ${newSlotTime}`}</strong>
                            </span>

                            <button
                              type="button"
                              onClick={handleAddSlot}
                              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3.5 py-1.5 text-xs font-bold text-[#090d16] transition-all cursor-pointer shadow-sm"
                            >
                              <Plus size={13} />
                              <span>{t("Add to Slots List", "Adicionar à Lista")}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Save Changes Button & Feedback */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveSlotsToServer(broadcastSlots)}
                          disabled={savingSlots}
                          className="flex items-center gap-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-40"
                        >
                          {savingSlots ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>{t("Saving...", "A gravar...")}</span>
                            </>
                          ) : (
                            <>
                              <Save size={13} className="text-cyan-400" />
                              <span>{t("Save Slots to System", "Gravar Turnos no Sistema")}</span>
                            </>
                          )}
                        </button>

                        {slotsSavedFeedback && (
                          <span className="flex items-center gap-1 text-[0.68rem] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                            <Check size={11} />
                            <span>{t("Saved & synchronized with portal!", "Gravado e sincronizado com o portal!")}</span>
                          </span>
                        )}
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

                    {/* Quick Test Email Dispatch for Convocations */}
                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[0.68rem] text-white/50 font-medium">
                          {t("Test dispatch to:", "Enviar teste para:")}
                        </span>
                        <input
                          type="email"
                          value={testEmailAddress}
                          onChange={(e) => {
                            setTestEmailAddress(e.target.value);
                            setTestConfirmEmail(e.target.value);
                          }}
                          placeholder="email@exemplo.com"
                          className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/30 focus:outline-none w-56"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSendTestEmail("convocation")}
                          disabled={testSendingType === "convocation" || !testEmailAddress.trim()}
                          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {testSendingType === "convocation" ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>{t("Sending test…", "A enviar teste…")}</span>
                            </>
                          ) : (
                            <>
                              <Mail size={12} />
                              <span>{t("Send Test Email", "Enviar E-mail de Teste")}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {testEmailResult?.type === "convocation" && (
                        <div className="text-[0.68rem] font-semibold">
                          {testEmailResult.success ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>{t("Test email sent!", "E-mail de teste enviado com sucesso!")}</span>
                            </span>
                          ) : (
                            <span className="text-red-400">
                              ✕ {testEmailResult.error || t("Failed to send test email", "Falha no envio de teste")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Send Button */}
                    <div className="mt-4 pt-2">
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendAddressCorrection}
                  disabled={dispatchingCorrection}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  title={t("Broadcast address correction (No. 1948) to all booked candidates", "Enviar rectificação de endereço (N.º 1948) a todas as candidatas agendadas")}
                >
                  <Mail size={13} className={dispatchingCorrection ? "animate-spin" : ""} />
                  <span>
                    {dispatchingCorrection
                      ? t("Broadcasting...", "A enviar rectificações...")
                      : t("Rectify Address (No. 1948)", "Rectificar Endereço (N.º 1948)")}
                  </span>
                </button>



                <button
                  type="button"
                  onClick={handleDispatchAllGatePasses}
                  disabled={dispatchingPasses}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <QrCode size={13} className={dispatchingPasses ? "animate-spin" : ""} />
                  <span>
                    {dispatchingPasses
                      ? t("Dispatching Passes...", "A disparar Passes QR...")
                      : t("Dispatch QR Passes (Tomorrow)", "Disparar Passes QR (Amanhã)")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTomorrowReminders}
                  disabled={sendingReminders}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Clock size={13} className={sendingReminders ? "animate-spin" : ""} />
                  <span>
                    {sendingReminders
                      ? t("Sending Reminders...", "A enviar Lembretes...")
                      : t("Send 1-Day Reminders", "Enviar Lembrete de Véspera")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setView("broadcast")}
                  className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>{t("Configure Test Slots →", "Configurar Datas & Turnos →")}</span>
                </button>
              </div>
            </div>

            {correctionResult && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-center justify-between">
                <span>
                  ✓ {t(`Address correction dispatched: ${correctionResult.count} candidates updated with No. 1948`, `Rectificação de endereço disparada: ${correctionResult.count} candidatas notificadas com o N.º 1948`)}
                  {correctionResult.failed > 0 && ` (${correctionResult.failed} ${t("failed", "falharam")})`}
                </span>
                <button type="button" onClick={() => setCorrectionResult(null)} className="text-amber-400 hover:text-white ml-3 cursor-pointer">✕</button>
              </div>
            )}



            {dispatchPassesResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center justify-between">
                <span>
                  ✓ {t(
                    `Gate passes dispatched: ${dispatchPassesResult.success} sent for tomorrow (Day ${dispatchPassesResult.targetDay || "N/A"}). Already attended skipped: ${dispatchPassesResult.skippedAttended ?? 0}. Today's candidates skipped: ${dispatchPassesResult.skippedToday ?? 0}`,
                    `Passes QR disparados: ${dispatchPassesResult.success} enviados para amanhã (Dia ${dispatchPassesResult.targetDay || "N/A"}). Já avaliadas/presentes omitidas: ${dispatchPassesResult.skippedAttended ?? 0}. Candidatas de hoje omitidas: ${dispatchPassesResult.skippedToday ?? 0}`
                  )}
                  {dispatchPassesResult.failed > 0 && ` (${dispatchPassesResult.failed} ${t("failed", "falharam")})`}
                </span>
                <button type="button" onClick={() => setDispatchPassesResult(null)} className="text-emerald-400 hover:text-white ml-3 cursor-pointer">✕</button>
              </div>
            )}

            {remindersResult && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-center justify-between">
                <span>
                  ✓ {t(`Reminders sent: ${remindersResult.success} for tomorrow (Day ${remindersResult.targetDay || "N/A"}). Today's candidates skipped: ${remindersResult.skippedToday ?? 0}`, `Lembretes enviados: ${remindersResult.success} para amanhã (Dia ${remindersResult.targetDay || "N/A"}). Candidatas de hoje omitidas: ${remindersResult.skippedToday ?? 0}`)}
                  {remindersResult.failed > 0 && ` (${remindersResult.failed} ${t("failed", "falharam")})`}
                </span>
                <button type="button" onClick={() => setRemindersResult(null)} className="text-amber-400 hover:text-white ml-3">✕</button>
              </div>
            )}

            {/* ─── SMART ATTENDANCE CONSOLE & INTERACTIVE DATE NAVIGATOR ─── */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 overflow-hidden shadow-sm">
              {/* Date Navigation Bar with Week Sections */}
              <div className="p-4 border-b border-white/10 bg-white/[0.01] space-y-3.5">
                {/* ─── TWO TABS: THIS WEEK vs NEXT WEEK ─────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 flex-wrap">
                    {/* Tab 1: Esta Semana */}
                    <button
                      type="button"
                      onClick={() => {
                        setRosterWeekTab("this_week");
                        setSelectedRosterSlot("all_this_week");
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        rosterWeekTab === "this_week"
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-1 ring-white/20"
                          : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
                      <Calendar size={14} className={rosterWeekTab === "this_week" ? "text-white" : "text-sky-400"} />
                      <span>{t("This Week (16 – 18 Sept)", "Esta Semana (16 – 18 Set)")}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                          rosterWeekTab === "this_week"
                            ? "bg-black/30 text-white"
                            : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        }`}
                      >
                        {thisWeekCount}
                      </span>
                    </button>

                    {/* Tab 2: Próxima Semana */}
                    <button
                      type="button"
                      onClick={() => {
                        setRosterWeekTab("next_week");
                        setSelectedRosterSlot("all_next_week");
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        rosterWeekTab === "next_week"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-white/20"
                          : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
                      <Calendar size={14} className={rosterWeekTab === "next_week" ? "text-white" : "text-purple-400"} />
                      <span>{t("Next Week (21 – 25 Sept)", "Próxima Semana (21 – 25 Set)")}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                          rosterWeekTab === "next_week"
                            ? "bg-black/30 text-white"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}
                      >
                        {nextWeekCount}
                      </span>
                    </button>

                    {/* Tab 3: Todos os Turnos */}
                    <button
                      type="button"
                      onClick={() => {
                        setRosterWeekTab("all");
                        setSelectedRosterSlot("all");
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        rosterWeekTab === "all"
                          ? "bg-white text-[#090d16] shadow-md font-bold"
                          : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
                      <CalendarDays size={14} />
                      <span>{t("All Sessions", "Todos os Turnos")}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                          rosterWeekTab === "all"
                            ? "bg-black/20 text-black font-extrabold"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {confirmedCount}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[0.7rem] flex items-center gap-2">
                      {rosterWeekTab === "this_week" && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                          <span>{t("Showing This Week (Wed 16 – Fri 18 Sept)", "A mostrar Esta Semana (Qua 16 – Sex 18 Set)")}</span>
                        </span>
                      )}
                      {rosterWeekTab === "next_week" && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                          <span>{t("Showing Next Week (Mon 21 – Fri 25 Sept)", "A mostrar Próxima Semana (Seg 21 – Sex 25 Set)")}</span>
                        </span>
                      )}
                      {rosterWeekTab === "all" && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 font-semibold">
                          <span>{rosterSlots.length} {t("sessions total", "turnos no total")}</span>
                        </span>
                      )}
                    </div>
                    {/* Navigation Arrows for Horizontal Scrolling */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollSlotRow("left")}
                        title={t("Scroll left", "Deslizar para a esquerda")}
                        className="p-1 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollSlotRow("right")}
                        title={t("Scroll right", "Deslizar para a direita")}
                        className="p-1 rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── SLOT PILLS ROW (FILTERED BY SELECTED WEEK TAB) ───────── */}
                <div
                  ref={rosterSlotRowRef}
                  className="slot-pills-scroll-row"
                >
                  {/* Consolidated pill for "This Week" */}
                  {rosterWeekTab === "this_week" && (
                    <button
                      type="button"
                      onClick={() => setSelectedRosterSlot("all_this_week")}
                      className={`slot-pill shrink-0 ${activeRosterSlot === "all_this_week" ? "active" : ""}`}
                    >
                      <span>{t("All This Week", "Todos Desta Semana")}</span>
                      <span
                        className={`slot-pill-count rounded-full ${
                          activeRosterSlot === "all_this_week"
                            ? "bg-sky-500 text-white font-bold"
                            : "bg-white/15 text-white"
                        }`}
                      >
                        {thisWeekCount}
                      </span>
                    </button>
                  )}

                  {/* Consolidated pill for "Next Week" */}
                  {rosterWeekTab === "next_week" && (
                    <button
                      type="button"
                      onClick={() => setSelectedRosterSlot("all_next_week")}
                      className={`slot-pill shrink-0 ${activeRosterSlot === "all_next_week" ? "active" : ""}`}
                    >
                      <span>{t("All Next Week", "Todos da Próx. Semana")}</span>
                      <span
                        className={`slot-pill-count rounded-full ${
                          activeRosterSlot === "all_next_week"
                            ? "bg-purple-600 text-white font-bold"
                            : "bg-white/15 text-white"
                        }`}
                      >
                        {nextWeekCount}
                      </span>
                    </button>
                  )}

                  {/* Consolidated pill for "All Sessions" */}
                  {rosterWeekTab === "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedRosterSlot("all")}
                      className={`slot-pill shrink-0 ${activeRosterSlot === "all" ? "active" : ""}`}
                    >
                      <span>{t("All Confirmed Sessions", "Todos os Turnos (Consolidado)")}</span>
                      <span
                        className={`slot-pill-count rounded-full ${
                          activeRosterSlot === "all"
                            ? "bg-[var(--accent-blue)] text-white font-bold"
                            : "bg-white/15 text-white"
                        }`}
                      >
                        {confirmedCount}
                      </span>
                    </button>
                  )}

                  {/* Individual slot pills */}
                  {(rosterWeekTab === "this_week"
                    ? thisWeekSlots
                    : rosterWeekTab === "next_week"
                      ? nextWeekSlots
                      : rosterSlots
                  ).map((slot) => {
                    const count = applications.filter((a) => a.testSlot === slot).length;
                    const isSelected = activeRosterSlot === slot;
                    const isFull = count >= 10;
                    const isThisWeek = getSlotWeekCategory(slot) === "this_week";

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedRosterSlot(slot)}
                        className={`slot-pill shrink-0 ${isSelected ? "active" : ""}`}
                      >
                        <span>{formatSlotDisplay(slot.split("–")[0].trim(), lang)}</span>
                        <span
                          className={`slot-pill-count rounded-full ${
                            isFull
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : count > 0
                                ? isSelected
                                  ? isThisWeek
                                    ? "bg-sky-500 text-white font-bold"
                                    : "bg-purple-600 text-white font-bold"
                                  : "bg-white/15 text-white"
                                : "bg-white/5 text-white/30"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Day Console Header & Table */}
              {activeRosterSlot && (() => {
                const isConsolidated = ["all", "all_this_week", "all_next_week"].includes(activeRosterSlot);
                const candidatesInSlot = activeRosterSlot === "all"
                  ? applications.filter((a) => Boolean(a.testSlot))
                  : activeRosterSlot === "all_this_week"
                    ? applications.filter((a) => Boolean(a.testSlot) && getSlotWeekCategory(a.testSlot!) === "this_week")
                    : activeRosterSlot === "all_next_week"
                      ? applications.filter((a) => Boolean(a.testSlot) && getSlotWeekCategory(a.testSlot!) === "next_week")
                      : applications.filter((a) => a.testSlot === activeRosterSlot);
                const attendedCount = candidatesInSlot.filter((c) => Boolean(c.attendedAt)).length;
                const isFull = !isConsolidated && candidatesInSlot.length >= 10;
                const remaining = !isConsolidated ? Math.max(0, 10 - candidatesInSlot.length) : 0;

                return (
                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              activeRosterSlot === "all_this_week"
                                ? "text-sky-400"
                                : activeRosterSlot === "all_next_week"
                                  ? "text-purple-400"
                                  : "text-sky-400"
                            }`}
                          >
                            {activeRosterSlot === "all"
                              ? t("Consolidated Roster (All Sessions)", "Lista Consolidada de Todos os Turnos")
                              : activeRosterSlot === "all_this_week"
                                ? t("This Week Roster (16 - 18 Sept)", "Escala Desta Semana (16 - 18 Set)")
                                : activeRosterSlot === "all_next_week"
                                  ? t("Next Week Roster (21 - 25 Sept)", "Escala da Próxima Semana (21 - 25 Set)")
                                  : t("Active Session Roster", "Escala do Turno Ativo")}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold border ${
                              isFull
                                ? "bg-red-500/15 border-red-500/30 text-red-300"
                                : candidatesInSlot.length > 0
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                  : "bg-white/10 border-white/15 text-white/60"
                            }`}
                          >
                            {candidatesInSlot.length} {t("candidates confirmed", "candidatas confirmadas")}
                            {!isConsolidated && (isFull ? ` · ${t("Full (10/10)", "Lotação Esgotada")}` : ` (${remaining} ${t("spots free", "vagas livres")})`)}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold border bg-emerald-500/15 border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>
                              {t("Present at Gate:", "Presentes no Portão:")} {attendedCount} / {candidatesInSlot.length}
                            </span>
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                          {activeRosterSlot === "all"
                            ? t("All Confirmed Candidates (All Sessions)", "Todas as Candidatas Confirmadas (Todos os Turnos)")
                            : activeRosterSlot === "all_this_week"
                              ? t("All Confirmed Candidates - This Week (16 - 18 September)", "Todas as Candidatas Desta Semana (16 - 18 de Setembro)")
                              : activeRosterSlot === "all_next_week"
                                ? t("All Confirmed Candidates - Next Week (21 - 25 September)", "Todas as Candidatas da Próxima Semana (21 - 25 de Setembro)")
                                : formatSlotDisplay(activeRosterSlot, lang)}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-sky-400" />
                            <span>
                              {activeRosterSlot === "all_this_week"
                                ? t("In-person test sessions: Wednesday 16, Thursday 17 & Friday 18 Sept (10:00 AM · Arrival 09:30)", "Sessões presenciais: Quarta 16, Quinta 17 e Sexta 18 de Setembro (10h00 · Chegada 09h30)")
                                : activeRosterSlot === "all_next_week"
                                  ? t("In-person test sessions: Monday 21 to Friday 25 Sept (10:00 AM · Arrival 09:30)", "Sessões presenciais: Segunda 21 a Sexta 25 de Setembro (10h00 · Chegada 09h30)")
                                  : t("10:00 to 11:30 (Arrival 09:30 · Gates lock at 09:50)", "10h00 às 11h30 (Chegada 09h30 · Portão fecha às 09h50)")}
                            </span>
                          </span>
                          <span>•</span>
                          <span>{siteContact.address.pt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setGateScannerOpen(true)}
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-colors cursor-pointer shadow"
                          title={t("Open camera QR scanner or search candidate at the gate", "Abrir leitor de câmara QR ou pesquisar candidata na portaria")}
                        >
                          <Camera size={13} />
                          <span>{t("Gate QR Scanner", "Leitor QR Portaria")}</span>
                        </button>

                        <a
                          href="/gate"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 px-3.5 py-2 text-xs font-bold text-sky-300 transition-colors cursor-pointer shadow"
                          title={t("Open dedicated Security Gatekeeper portal for guards at the door", "Abrir portal dedicado da Portaria para os guardas")}
                        >
                          <ShieldCheck size={13} />
                          <span>{t("Security Gate Portal", "Portal da Portaria")}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => exportAttendanceCSV(isConsolidated ? activeRosterSlot : activeRosterSlot)}
                          disabled={candidatesInSlot.length === 0}
                          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Download size={13} />
                          <span>{t("Export CSV Roster", "Exportar Roster (CSV)")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Non-Compliant Attendees Warning Banner for this Session */}
                    {(() => {
                      const nonCompliantInSlot = candidatesInSlot.filter((c) => screenCandidate(c).disqualified);
                      if (nonCompliantInSlot.length === 0) return null;
                      return (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
                          <div className="flex items-center gap-2.5">
                            <AlertCircle size={18} className="text-amber-400 shrink-0" />
                            <div>
                              <strong className="block text-white font-semibold">
                                {nonCompliantInSlot.length} {t("Candidate(s) failing recruitment criteria scheduled for this session", "Candidato(s) sem requisitos eliminatórios agendados para este turno")}
                              </strong>
                              <span className="text-[0.7rem] text-amber-200/80">
                                {t(
                                  "E.g. male candidates without CCTV experience or missing cover letter. Filipa instructed these must be canceled before test day.",
                                  "Ex: candidatos masculinos sem experiência CCTV ou sem carta. A Direção determinou que não devem realizar o teste presencial.",
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDisqualifyModalState({
                                open: true,
                                ids: nonCompliantInSlot.map((c) => c.id),
                                candidateNames: nonCompliantInSlot.map((c) => c.name),
                                bookedCount: nonCompliantInSlot.length,
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <UserX size={13} />
                            <span>
                              {t("Cancel & Disqualify All Non-Compliant for this Session", "Cancelar & Desqualificar Não Conformes Deste Turno")} ({nonCompliantInSlot.length})
                            </span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Table View of Candidates for this Day */}
                    {candidatesInSlot.length === 0 ? (
                      <div className="py-14 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] space-y-2">
                        <Calendar size={28} className="mx-auto text-white/30" />
                        <p className="text-sm font-semibold text-white/80">
                          {t("No candidates confirmed for this date yet", "Nenhuma confirmação registada para esta data ainda")}
                        </p>
                        <p className="text-xs text-white/40 max-w-sm mx-auto">
                          {t(
                            "Candidates who select this date from their invitation links will automatically appear here in real time.",
                            "As candidatas que selecionarem esta data através dos seus links de convocatória aparecerão aqui em tempo real.",
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th className="w-12 text-center">#</th>
                              <th>{t("Candidate", "Candidato(a)")}</th>
                              {isConsolidated && <th>{t("Test Session", "Turno Marcado")}</th>}
                              <th>{t("WhatsApp Contact", "Contacto WhatsApp")}</th>
                              <th>{t("Gender", "Género")}</th>
                              <th>{t("Confirmation Time", "Horário da Marcação")}</th>
                              <th>{t("Gate Attendance", "Presença no Portão")}</th>
                              <th className="text-right">{t("Actions", "Ações")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {candidatesInSlot.map((c, idx) => {
                              const screening = screenCandidate(c);
                              return (
                                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                                  <td className="px-4 py-3.5 text-center text-white/40 font-mono text-[0.72rem]">
                                    {idx + 1}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelected(c)}
                                      className="text-left group cursor-pointer block"
                                    >
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <strong className="text-white font-medium text-xs group-hover:text-sky-300 transition-colors">
                                          {c.name}
                                        </strong>
                                        {screening.disqualified && (
                                          <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                            ⚠️ {screening.isMale && !screening.hasCctvExperience
                                              ? t("Male w/o CCTV", "Homem s/ CCTV")
                                              : t("Non-compliant", "Não Conforme")}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[0.68rem] text-white/40 block">
                                        {c.email}
                                      </span>
                                    </button>
                                  </td>
                                  {isConsolidated && (
                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                      {(() => {
                                        const isTw = getSlotWeekCategory(c.testSlot || "") === "this_week";
                                        return (
                                          <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-bold border ${
                                              isTw
                                                ? "bg-sky-500/15 text-sky-300 border-sky-500/25"
                                                : "bg-purple-500/15 text-purple-300 border-purple-500/25"
                                            }`}
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full ${isTw ? "bg-sky-400" : "bg-purple-400"}`} />
                                            <span>{formatSlotDisplay(c.testSlot?.split("–")[0].trim() || c.testSlot || "", lang)}</span>
                                          </span>
                                        );
                                      })()}
                                    </td>
                                  )}
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <a
                                      href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium text-xs hover:underline"
                                    >
                                      <Phone size={11} />
                                      <span>{c.whatsapp}</span>
                                    </a>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-white/10 text-white/80 capitalize">
                                      {c.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap text-[0.72rem] text-white/60">
                                    {c.testBookedAt
                                      ? new Date(c.testBookedAt).toLocaleString(lang === "pt" ? "pt-MZ" : "en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : t("Pre-assigned", "Pré-atribuído")}
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    {c.attendedAt ? (
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                          <span>{t("Present", "Presente")}</span>
                                        </span>
                                        <span className="text-[0.65rem] text-white/50 font-mono">
                                          {new Date(c.attendedAt).toLocaleTimeString("pt-MZ", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            timeZone: "Africa/Maputo",
                                          })}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleAttendance(c.id, false)}
                                          title={t("Unmark attendance", "Desmarcar presença")}
                                          className="text-[0.62rem] text-white/40 hover:text-red-300 ml-1 underline cursor-pointer"
                                        >
                                          {t("Undo", "Desfazer")}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-white/5 text-white/40 border border-white/10">
                                        <Clock size={10} className="text-white/30" />
                                        <span>{t("Awaiting", "Aguardado")}</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                                    {screening.disqualified ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDisqualifyModalState({
                                            open: true,
                                            ids: [c.id],
                                            candidateNames: [c.name],
                                            bookedCount: 1,
                                          });
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[0.7rem] font-bold text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                                        title={t("Cancel test slot & dispatch polite disqualification notice", "Cancelar vaga e enviar notificação de desqualificação")}
                                      >
                                        <UserX size={11} />
                                        <span>{t("Cancel & Disqualify", "Cancelar & Desqualificar")}</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const confirmMsg = lang === "pt"
                                            ? `Deseja libertar a vaga agendada de ${c.name}? O turno voltará a ficar livre para outros candidatos.`
                                            : `Do you want to free the booked slot for ${c.name}? The slot will become available for other applicants.`;
                                          if (!confirm(confirmMsg)) return;
                                          try {
                                            const res = await fetch("/api/admin/careers", {
                                              method: "PATCH",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ kind: "clear_slot", id: c.id }),
                                            });
                                            if (res.ok) {
                                              setApplications((prev) =>
                                                prev.map((a) => (a.id === c.id ? { ...a, testSlot: undefined, testBookedAt: undefined } : a))
                                              );
                                            }
                                          } catch (err) {
                                            console.error("Failed to cancel slot:", err);
                                          }
                                        }}
                                        title={t("Free up this booked slot without archiving", "Libertar este turno")}
                                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[0.68rem] text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                      >
                                        <X size={11} />
                                        <span>{t("Free Slot", "Libertar")}</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelected(c)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                      <span>{t("Profile & CV", "Perfil & CV")}</span>
                                    </button>
                                    <a
                                      href={`/${lang}/careers/test-invite/${c.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={t("Open candidate booking page", "Abrir página de teste")}
                                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[0.7rem] font-medium px-2 py-1"
                                    >
                                      <span>{t("Link", "Link")}</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Pending Candidates (Invited but not yet booked) */}
            {(() => {
              const pendingInvites = applications.filter((a) => a.invitedAt && !a.testSlot);
              if (pendingInvites.length === 0) return null;

              return (
                <div className="rounded-2xl border border-amber-500/20 bg-[#121827]/80 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-amber-400" />
                      <h3 className="text-sm font-bold text-white">
                        {t("Invited Candidates Awaiting Slot Selection", "Candidatos Convocados a Aguardar Escolha de Data")}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      {pendingInvites.length} {t("pending", "pendentes")}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t("Candidate", "Candidato(a)")}</th>
                          <th>{t("WhatsApp Contact", "Contacto WhatsApp")}</th>
                          <th>{t("Invited On", "Convocado Em")}</th>
                          <th className="text-right">{t("Quick Actions", "Ações Rápidas")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingInvites.map((c) => (
                          <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setSelected(c)}
                                className="text-left group cursor-pointer block"
                              >
                                <strong className="text-white text-xs font-medium group-hover:text-sky-300 transition-colors">
                                  {c.name}
                                </strong>
                                <span className="text-[0.68rem] text-white/40 block">
                                  {c.email}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <a
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium text-xs hover:underline"
                              >
                                <Phone size={11} />
                                <span>{c.whatsapp}</span>
                              </a>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-[0.72rem] text-white/60">
                              {c.invitedAt
                                ? new Date(c.invitedAt).toLocaleDateString(lang === "pt" ? "pt-MZ" : "en-GB")
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => copyBookingLink(c.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedLinkId === c.id ? (
                                  <>
                                    <Check size={11} className="text-emerald-400" />
                                    <span>{t("Copied!", "Copiado!")}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>{t("Copy Link", "Copiar Link")}</span>
                                  </>
                                )}
                              </button>
                              <a
                                href={`/${lang}/careers/test-invite/${c.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[0.7rem] font-medium px-2 py-1"
                              >
                                <span>{t("Open Page", "Abrir")}</span>
                                <ExternalLink size={10} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Quick Navigation to Dedicated Confirmations Workspace */}
            {confirmedCount > 0 && (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                    <Send size={16} className="text-sky-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {t("Dispatch Official Attendance Confirmations", "Enviar Confirmações de Presença Oficiais")}
                    </p>
                    <p className="text-[0.68rem] text-white/50">
                      {t(
                        `${campaignApps.filter((a) => Boolean(a.testSlot) && !a.confirmationSentAt).length} candidates with confirmed slots are awaiting confirmation dispatch.`,
                        `${campaignApps.filter((a) => Boolean(a.testSlot) && !a.confirmationSentAt).length} candidatas agendadas aguardam o envio de instruções oficiais.`
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView("confirmations")}
                  className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
                >
                  <CheckCircle2 size={13} />
                  <span>{t("Open Confirmations Tab →", "Abrir Separador de Confirmações →")}</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* ─── TAB: BOOKING CONFIRMATIONS WORKSPACE ─────────────────── */}
        {view === "confirmations" && (() => {
          const confirmedCandidates = campaignApps.filter((a) => Boolean(a.testSlot));
          const unsentCandidates = confirmedCandidates.filter((a) => !a.confirmationSentAt);
          const sentCandidates = confirmedCandidates.filter((a) => Boolean(a.confirmationSentAt));

          const allSelectedConfirm =
            unsentCandidates.length > 0 &&
            unsentCandidates.every((a) => confirmSelectedIds.includes(a.id));

          // Real Mozambique greeting strictly in Portuguese
          const greetingPt = mozambiqueGreeting.pt;

          let previewText = confirmMessage
            .replace(/\{\{greeting\}\}/gi, greetingPt)
            .replace(/\{\{slot\}\}/gi, "Quarta-feira, 16 de Setembro – 10h00")
            .replace(/\{\{name\}\}/gi, "Candidata");

          previewText = previewText.replace(/^(Boa tarde|Bom dia|Boa noite)(,?)/i, `${greetingPt}$2`);

          const previewHtml = previewText
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/•/g, "&#8226;")
            .replace(/\n\n/g, "</p><p style='margin:0 0 12px 0;'>")
            .replace(/\n/g, "<br />");

          return (
            <section className="space-y-6">
              {/* Top KPI Cards for Confirmations */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Booked Candidates", "Candidatas Agendadas")}</span>
                    <CalendarCheck size={16} className="text-cyan-400" />
                  </div>
                  <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-white">
                    {confirmedCandidates.length}
                  </strong>
                  <span className="text-[0.7rem] text-white/40">
                    {t("Slots selected by candidate", "Turno escolhido")}
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Awaiting Dispatch", "Aguardam Envio")}</span>
                    <Clock size={16} className="text-amber-400" />
                  </div>
                  <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-amber-400">
                    {unsentCandidates.length}
                  </strong>
                  <span className="text-[0.7rem] text-amber-400/70">
                    {t("Not yet notified with location/rules", "Ainda não notificadas")}
                  </span>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Confirmations Sent", "Já Enviadas")}</span>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </div>
                  <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-emerald-400">
                    {sentCandidates.length}
                  </strong>
                  <span className="text-[0.7rem] text-white/40">
                    {t("Official instructions delivered", "Instruções já entregues")}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Mozambique Clock", "Relógio Moçambique")}</span>
                    <Globe size={16} className="text-sky-400" />
                  </div>
                  <strong className="mt-2 block text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {greetingPt}
                  </strong>
                  <span className="text-[0.7rem] text-sky-400/80">
                    {t("Live greeting for outgoing emails", "Saudação activa de envio")}
                  </span>
                </div>
              </div>

              {/* Sub-tabs: Aguardam Envio vs Já Enviadas */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmSubTab("unsent")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      confirmSubTab === "unsent"
                        ? "bg-white text-[#090d16] shadow-sm"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{t("Awaiting Confirmation Dispatch", "Por Enviar (Aguardam Envio)")}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold ${
                        confirmSubTab === "unsent"
                          ? "bg-[#090d16]/15 text-[#090d16]"
                          : unsentCandidates.length > 0
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-white/60"
                      }`}
                    >
                      {unsentCandidates.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmSubTab("sent")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      confirmSubTab === "sent"
                        ? "bg-white text-[#090d16] shadow-sm"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{t("Already Dispatched", "Já Enviadas")}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold ${
                        confirmSubTab === "sent"
                          ? "bg-[#090d16]/15 text-[#090d16]"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {sentCandidates.length}
                    </span>
                  </button>
                </div>

                {confirmSubTab === "unsent" && unsentCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      allSelectedConfirm
                        ? setConfirmSelectedIds([])
                        : setConfirmSelectedIds(unsentCandidates.map((a) => a.id))
                    }
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    {allSelectedConfirm
                      ? t("Deselect all", "Desselecionar todas")
                      : t("Select all candidates", "Selecionar todas as candidatas")}{" "}
                    ({unsentCandidates.length})
                  </button>
                )}
              </div>

              {/* TAB 1: UNSENT / AWAITING DISPATCH */}
              {confirmSubTab === "unsent" && (
                <div className="space-y-3">
                  {unsentCandidates.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-8 text-center">
                      <CheckCircle2 size={28} className="mx-auto text-emerald-400/80 mb-2" />
                      <p className="text-sm font-semibold text-white">
                        {t(
                          "All confirmed candidates have already been notified!",
                          "Todas as candidatas que agendaram teste já receberam a confirmação oficial."
                        )}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {t(
                          "When new candidates select a test date, they will appear here ready for dispatch.",
                          "Assim que novas candidatas marcarem turno, surgirão aqui para receber instruções."
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unsentCandidates.map((c) => {
                        const isChecked = confirmSelectedIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() =>
                              setConfirmSelectedIds((prev) =>
                                isChecked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                              )
                            }
                            className={`rounded-xl border p-3.5 transition-all cursor-pointer flex items-start gap-3 ${
                              isChecked
                                ? "border-sky-500/50 bg-sky-500/10 shadow-sm"
                                : "border-white/10 bg-[#121827]/80 hover:bg-white/[0.04] text-white/70 hover:text-white"
                            }`}
                          >
                            <div
                              className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                isChecked ? "bg-sky-500 border-sky-500 text-white" : "border-white/30"
                              }`}
                            >
                              {isChecked && <Check size={11} className="text-white stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <strong className="text-xs font-bold text-white truncate">
                                  {c.name}
                                </strong>
                                <span className="rounded bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[0.6rem] font-mono text-amber-300 shrink-0">
                                  {t("Unsent", "Por Enviar")}
                                </span>
                              </div>
                              <p className="text-[0.68rem] text-sky-400 font-medium mt-1 truncate">
                                📅 {formatSlotDisplay(c.testSlot ?? "", lang)}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-[0.65rem] text-white/50">
                                <span className="truncate">{c.email}</span>
                                <span>•</span>
                                <span className="truncate">{c.whatsapp}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SENT QUEUE */}
              {confirmSubTab === "sent" && (
                <div className="space-y-3">
                  {sentCandidates.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-8 text-center text-xs text-white/40 italic">
                      {t("No confirmations have been sent yet.", "Nenhuma confirmação enviada ainda.")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sentCandidates.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-white/10 bg-[#121827]/80 p-3.5 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                              <strong className="text-xs font-bold text-white truncate">
                                {c.name}
                              </strong>
                            </div>
                            <p className="text-[0.68rem] text-sky-300 font-medium mt-1 truncate">
                              📅 {formatSlotDisplay(c.testSlot ?? "", lang)}
                            </p>
                            <div className="mt-1 text-[0.65rem] text-emerald-400 font-mono">
                              ✓ {t("Sent:", "Enviado:")}{" "}
                              {c.confirmationSentAt
                                ? new Date(c.confirmationSentAt).toLocaleString("pt-MZ", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[0.65rem] text-white/40">
                              <span className="truncate">{c.email}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleResendConfirmation(c.id)}
                            disabled={resendingConfirmId === c.id}
                            title={t("Resend confirmation email", "Reenviar e-mail de confirmação")}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-[0.68rem] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            {resendingConfirmId === c.id ? (
                              <>
                                <Loader2 size={11} className="animate-spin" />
                                <span>{t("Resending…", "A reenviar…")}</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw size={11} />
                                <span>{t("Resend", "Reenviar")}</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Template Editor & Email Preview Workspace */}
              <div className="rounded-2xl border border-white/10 bg-[#0e1520]/95 overflow-hidden shadow-lg">
                {/* Header of Editor Box */}
                <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0">
                      <Send size={16} className="text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {t("Confirmation Message Template", "Modelo da Mensagem de Confirmação")}
                      </h3>
                      <p className="text-[0.68rem] text-white/50 mt-0.5">
                        {t(
                          "Customise the official confirmation letter before dispatching to candidates.",
                          "Personalize o modelo oficial de confirmação com regras e horário do teste presencial."
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Edit / Preview Tabs Toggle */}
                  <div className="flex rounded-lg border border-white/10 overflow-hidden text-[0.68rem] font-semibold bg-white/[0.03]">
                    {(["edit", "preview"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setConfirmPreview(tab)}
                        className={`px-3.5 py-1.5 cursor-pointer transition-colors ${
                          confirmPreview === tab
                            ? "bg-white text-[#090d16] font-bold shadow-sm"
                            : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                        }`}
                      >
                        {tab === "edit" ? t("Edit Template", "Editar Modelo") : t("Preview Email", "Pré-visualizar E-mail")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {confirmPreview === "edit" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[0.68rem] text-white/50">
                        <span>{t("Available tags:", "Tags dinâmicas disponíveis:")} <code className="text-sky-400">{"{{greeting}}"}</code>, <code className="text-sky-400">{"{{slot}}"}</code>, <code className="text-sky-400">{"{{name}}"}</code></span>
                        <button
                          type="button"
                          onClick={() => setConfirmMessage(CONFIRM_DEFAULT_PT)}
                          className="flex items-center gap-1 text-white/40 hover:text-white/80 cursor-pointer transition-colors"
                        >
                          <RotateCcw size={11} />
                          <span>{t("Reset to default", "Repor modelo padrão")}</span>
                        </button>
                      </div>

                      <textarea
                        rows={14}
                        value={confirmMessage}
                        onChange={(e) => setConfirmMessage(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#090d16]/80 p-4 text-xs font-mono text-white leading-relaxed focus:border-white/30 focus:outline-none resize-y"
                      />

                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[0.68rem] text-white/50 space-y-1">
                        <p>
                          💡 <strong>{t("Automatic Mozambique Greeting:", "Actualizador de Saudação Automático:")}</strong>{" "}
                          {t(
                            "The system automatically detects the current time in Mozambique and updates the greeting to 'Bom dia', 'Boa tarde' or 'Boa noite'. Candidate emails are strictly in Portuguese.",
                            "O sistema detecta em tempo real a hora oficial de Moçambique e actualiza automaticamente a saudação para 'Bom dia', 'Boa tarde' ou 'Boa noite'. As comunicações a candidatos são sempre em Português."
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* High-fidelity responsive preview matching official email */
                    <div className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl overflow-hidden text-xs max-w-xl mx-auto">
                      {/* Official Letterhead Header (Dark Navy #0b1329 with White Logo) */}
                      <div className="bg-[#0b1329] px-5 py-4 border-b-2 border-white/20 text-white">
                        <div className="flex items-center justify-between">
                          <Logo size="sm" variant="light" />
                          <div className="text-right">
                            <span className="inline-block bg-white/10 text-white font-mono text-[0.6rem] px-2 py-0.5 rounded border border-white/10 font-bold tracking-wider">
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
                          CONFIRMAÇÃO OFICIAL · TESTE DE SELECÇÃO PRESENCIAL
                        </span>
                        <span className="text-slate-500">
                          Maputo, Moçambique
                        </span>
                      </div>

                      {/* Body Content */}
                      <div className="p-5 space-y-4">
                        <div
                          className="text-slate-800 whitespace-pre-wrap font-sans text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: `<p style='margin:0 0 12px 0;'>${previewHtml}</p>`,
                          }}
                        />

                        {/* Confirmed Slot Card */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden my-3">
                          <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 text-[0.68rem] font-bold text-slate-700 uppercase tracking-wider">
                            Turno Agendado:
                          </div>
                          <div className="bg-white px-3.5 py-2.5 flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">
                              📅 Quarta-feira, 16 de Setembro – 10h00
                            </span>
                            <span className="font-mono text-[0.6rem] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Confirmado
                            </span>
                          </div>
                        </div>

                        {/* Security & Location Instructions Notice Box (Matching Image 3) */}
                        <div className="bg-[#fefce8] border border-[#fef08a] rounded-lg p-3.5 text-[0.72rem] text-[#713f12] leading-relaxed">
                          <strong className="block mb-1.5 text-[#854d0e] font-bold text-[0.75rem]">
                            Instruções para o Dia do Teste:
                          </strong>
                          <div className="mb-1">
                            • <strong>Local:</strong> Overwatch — Av. Paulo Samuel Khankhomba nº 1948, antes da esquina com a Av. Filipe Samuel Magaia, Maputo
                          </div>
                          <div className="mb-1">
                            • <strong>Horário &amp; Pontualidade:</strong> Estar no local às 09h30 (30 minutos antes). O portão encerra impreterivelmente às 09h50.
                          </div>
                          <div>
                            • <strong>Documentos &amp; Material:</strong> Trazer caneta esferográfica e documento de identificação original e válido (BI/Passaporte/DIRE).
                          </div>
                        </div>
                      </div>

                      {/* Sign-Off & Official Footer */}
                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-[0.68rem] text-slate-500 flex items-center justify-between">
                        <span>
                          <strong className="text-slate-900">Equipa de Recrutamento</strong> · Overwatch Moçambique
                        </span>
                        <span className="font-mono text-slate-400 text-[0.6rem]">
                          Maputo, MZ
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions & Dispatch Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                    {/* Left: Quick Test Email Dispatch */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[0.68rem] text-white/50 font-medium">
                        {t("Test dispatch to:", "Enviar teste para:")}
                      </span>
                      <input
                        type="email"
                        value={testConfirmEmail}
                        onChange={(e) => setTestConfirmEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/30 focus:outline-none w-52"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSendTestConfirmation()}
                        disabled={testConfirmSending || !testConfirmEmail.trim()}
                        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {testConfirmSending ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>{t("Sending test…", "A enviar…")}</span>
                          </>
                        ) : (
                          <>
                            <Mail size={12} />
                            <span>{t("Send Test Email", "Enviar E-mail de Teste")}</span>
                          </>
                        )}
                      </button>
                      {testConfirmStatus === "success" && (
                        <span className="text-[0.68rem] font-semibold text-emerald-400">
                          ✓ {t("Test email sent!", "E-mail de teste enviado com sucesso!")}
                        </span>
                      )}
                      {testConfirmStatus === "error" && (
                        <span className="text-[0.68rem] font-semibold text-red-400">
                          ✕ {t("Failed to send test email", "Falha no envio de teste")}
                        </span>
                      )}
                    </div>

                    {/* Right: Bulk Dispatch Button */}
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
            </section>
          );
        })()}

        {/* ─── TAB: DISQUALIFICATION & REJECTION WORKSPACE ─────────── */}
        {view === "disqualify" && (() => {
          const screenedList = campaignApps.map((a) => ({
            app: a,
            screening: screenCandidate(a),
          }));

          const nonCompliantList = screenedList.filter(({ screening }) => screening.disqualified);
          const bookedNonCompliant = nonCompliantList.filter(({ app }) => Boolean(app.testSlot));
          const menWithoutCctv = nonCompliantList.filter(
            ({ screening }) => screening.isMale && !screening.hasCctvExperience
          );
          const missingCoverLetter = nonCompliantList.filter(
            ({ screening }) => !screening.hasCoverLetter
          );
          const archivedWomen = campaignApps.filter(
            (a) => a.status === "archived" && a.sex !== "male"
          );
          const allArchived = campaignApps.filter((a) => a.status === "archived");

          const displayedList =
            disqualifyFilterTab === "booked" ? bookedNonCompliant : nonCompliantList;

          const activeReason = customDisqualifyReason.trim() || disqualifyReasonPreset;
          const greetingPt = mozambiqueGreeting.pt;

          return (
            <section className="space-y-6">
              {/* Emergency Restore Banner if any women or candidates are archived by accident */}
              {archivedWomen.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/50 via-[#121827] to-transparent p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <RotateCcw size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{t("Mistakenly Disqualified Women Detected", "Candidatas Arquivadas por Engano")}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[0.7rem] font-mono">
                          {archivedWomen.length} {t("candidates", "candidatas")}
                        </span>
                      </h4>
                      <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
                        {t(
                          "Filipa's explicit instruction: 'dont forget to leave the inexperienced women'. Female candidates do not require prior CCTV experience. Click to restore them to 'Shortlisted' and automatically dispatch the official apology/rectification email with booking links.",
                          "Conforme orientação expressa da Direcção (Filipa): todas as mulheres realizam o teste de CCO sem exigência de experiência prévia. Clique para restaurá-las de imediato para 'Pré-seleccionadas' e enviar o e-mail de rectificação com o link de agendamento.",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreModalState({
                          open: true,
                          restoreAllWomen: true,
                          ids: archivedWomen.map((w) => w.id),
                          candidateNames: archivedWomen.map((w) => w.name),
                        });
                      }}
                      disabled={restoreBusy}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>
                        {t(
                          `Restore All Archived Women (${archivedWomen.length}) & Rectify`,
                          `Restaurar Todas as Mulheres Arquivadas (${archivedWomen.length}) & Rectificar`,
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}
              {/* Top KPI Cards for Disqualification Compliance */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-red-500/20 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Total Non-Compliant", "Total Não Conformes")}</span>
                    <UserX size={16} className="text-red-400" />
                  </div>
                  <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-red-400">
                    {nonCompliantList.length}
                  </strong>
                  <span className="text-[0.7rem] text-white/40">
                    {t("Failed mandatory requirements", "Falharam critérios eliminatórios")}
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Men w/o CCTV Experience", "Homens sem CCTV")}</span>
                    <AlertCircle size={16} className="text-amber-400" />
                  </div>
                  <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-amber-400">
                    {menWithoutCctv.length}
                  </strong>
                  <span className="text-[0.7rem] text-amber-400/70">
                    {t("Filipa rule (disqualify & archive)", "Critério Filipa (não realizam teste)")}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Missing Cover Letter", "Sem Carta Apresentação")}</span>
                    <FileText size={16} className="text-sky-400" />
                  </div>
                  <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-white">
                    {missingCoverLetter.length}
                  </strong>
                  <span className="text-[0.7rem] text-white/40">
                    {t("Mandatory for all genders", "Obrigatória p/ homens e mulheres")}
                  </span>
                </div>

                <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${
                  bookedNonCompliant.length > 0
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-emerald-500/20 bg-[#121827]/90"
                }`}>
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>{t("Scheduled for In-Person Test", "Agendados para Teste")}</span>
                    <CalendarCheck size={16} className={bookedNonCompliant.length > 0 ? "text-red-400" : "text-emerald-400"} />
                  </div>
                  <strong className={`mt-2 block text-2xl sm:text-3xl font-bold ${
                    bookedNonCompliant.length > 0 ? "text-red-300" : "text-emerald-400"
                  }`}>
                    {bookedNonCompliant.length}
                  </strong>
                  <span className="text-[0.7rem] text-white/50">
                    {bookedNonCompliant.length > 0
                      ? t("Urgent: cancel before test day!", "Urgente: cancelar antes do teste!")
                      : t("No non-compliant booked", "Nenhum agendamento irregular")}
                  </span>
                </div>
              </div>

              {/* Urgent Action Banner if non-compliant are booked */}
              {bookedNonCompliant.length > 0 && (
                <div className="rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-950/40 via-red-900/20 to-transparent p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {t(
                          `⚠️ ${bookedNonCompliant.length} Non-compliant candidate(s) currently occupy in-person test spots!`,
                          `⚠️ ${bookedNonCompliant.length} Candidato(s) não conforme(s) estão agendados para o teste presencial!`,
                        )}
                      </h4>
                      <p className="text-xs text-red-200/80 mt-0.5 max-w-2xl leading-relaxed">
                        {t(
                          "Filipa instructed that men without CCTV experience must not be tested. Canceling their test frees up slots under the 10/day quota and dispatches the official disqualification email.",
                          "A Direção determinou que homens sem CCTV comprovado não realizam o teste. O cancelamento liberta imediatamente as vagas sob a cota diária de 10 candidatos e envia a notificação formal por e-mail.",
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDisqualifyModalState({
                        open: true,
                        ids: bookedNonCompliant.map((b) => b.app.id),
                        candidateNames: bookedNonCompliant.map((b) => b.app.name),
                        bookedCount: bookedNonCompliant.length,
                      });
                    }}
                    className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2.5 text-xs shadow-lg transition-all cursor-pointer"
                  >
                    <UserX size={14} />
                    <span>
                      {t("Cancel & Disqualify All Booked Candidates", "Cancelar & Desqualificar Todos os Agendados")} ({bookedNonCompliant.length})
                    </span>
                  </button>
                </div>
              )}

              {/* Disqualification Email Template Configuration & Live Letterhead Preview */}
              <div className="rounded-2xl border border-white/10 bg-[#121827]/95 overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Mail size={16} className="text-red-400" />
                      <span>{t("Official Disqualification Notice Template", "Modelo Oficial de Desqualificação & Arquivamento")}</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      {t(
                        "Pre-configured formal letterhead notice sent when candidates are archived due to recruitment criteria.",
                        "Carta formal com cabeçalho oficial enviada aos candidatos desqualificados do concurso.",
                      )}
                    </p>
                  </div>

                  {/* Mozambique Live Greeting Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-[0.7rem] text-white/70">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {t("Maputo Time (UTC+2) Greeting:", "Saudação Maputo (UTC+2):")} <strong className="text-white font-mono">"{greetingPt}"</strong>
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Decision Reason Settings */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-2">
                        {t("Select or Customize Decision Reason:", "Seleccione ou Personalize o Motivo da Decisão:")}
                      </label>
                      <div className="space-y-2">
                        {[
                          {
                            id: "p1",
                            label: t("Male without CCTV experience (Filipa rule)", "Homem sem experiência CCTV (Regra Filipa)"),
                            text: "Candidato masculino sem comprovação curricular de experiência prévia em sistemas CCTV/CCO.",
                          },
                          {
                            id: "p2",
                            label: t("Missing mandatory cover letter", "Ausência de carta de apresentação"),
                            text: "Ausência de carta de apresentação (requisito eliminatório básico da candidatura).",
                          },
                          {
                            id: "p3",
                            label: t("Combined criteria failure (default)", "Critérios combinados (padrão oficial)"),
                            text: "Não cumprimento da totalidade dos requisitos eliminatórios do concurso (submissão de carta de apresentação e/ou comprovação curricular de experiência em sistemas de CCTV para candidatos masculinos).",
                          },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setDisqualifyReasonPreset(preset.text);
                              setCustomDisqualifyReason("");
                            }}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                              disqualifyReasonPreset === preset.text && !customDisqualifyReason.trim()
                                ? "border-red-500/50 bg-red-500/10 text-white font-medium shadow-sm"
                                : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.05]"
                            }`}
                          >
                            <span className="block font-semibold text-white text-[0.72rem] mb-0.5">
                              {preset.label}
                            </span>
                            <span className="block text-[0.68rem] text-white/50 line-clamp-2">
                              {preset.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1.5">
                        {t("Or write custom decision text:", "Ou edite o texto personalizado:")}
                      </label>
                      <textarea
                        rows={4}
                        value={customDisqualifyReason}
                        onChange={(e) => setCustomDisqualifyReason(e.target.value)}
                        placeholder={disqualifyReasonPreset}
                        className="w-full rounded-xl border border-white/10 bg-[#090d16]/80 p-3 text-xs font-mono text-white leading-relaxed focus:border-white/30 focus:outline-none resize-y"
                      />
                      <span className="text-[0.65rem] text-white/40 block mt-1">
                        {t(
                          "This text appears inside the red highlighted callout box in the candidate's email.",
                          "Este texto é inserido na caixa de destaque com fundo vermelho no e-mail do candidato.",
                        )}
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-[0.7rem] text-white/60 space-y-1.5">
                      <strong className="block text-white text-xs">ℹ️ {t("Legal & Compliance Note", "Nota de Conformidade:")}</strong>
                      <p className="leading-relaxed">
                        {t(
                          "Disqualification emails are sent strictly in Portuguese with official Overwatch Mozambique legal letterhead. The greeting dynamically adapts to the candidate's local time in Maputo.",
                          "As notificações de desqualificação são enviadas em Português com o cabeçalho oficial da Overwatch Moçambique. A saudação inicial adapta-se automaticamente à hora de Maputo.",
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: High-Fidelity Letterhead Preview */}
                  <div className="lg:col-span-7">
                    <div className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl overflow-hidden text-xs max-w-xl mx-auto">
                      {/* Official Letterhead Header (Dark Navy) */}
                      <div className="bg-[#0b1329] px-5 py-4 border-b-2 border-white/20 text-white">
                        <div className="flex items-center justify-between">
                          <Logo size="sm" variant="light" />
                          <div className="text-right">
                            <span className="inline-block bg-white/10 text-white font-mono text-[0.6rem] px-2 py-0.5 rounded border border-white/10 font-bold tracking-wider">
                              REF: CCO-2026/MAPUTO
                            </span>
                            <div className="text-[0.65rem] text-slate-300 mt-0.5 font-medium">
                              Departamento de Recursos Humanos
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Official Subheading Bar */}
                      <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between text-[0.68rem]">
                        <span className="font-semibold text-slate-700 uppercase tracking-wide">
                          NOTIFICAÇÃO OFICIAL · PROCESSO DE SELECÇÃO
                        </span>
                        <span className="text-slate-500">
                          Maputo, Moçambique
                        </span>
                      </div>

                      {/* Body Content */}
                      <div className="p-5 space-y-3.5 leading-relaxed text-slate-700">
                        <h4 className="text-sm font-bold text-slate-900">
                          {greetingPt} Candidato(a),
                        </h4>
                        <p>
                          Agradecemos a sua candidatura e o interesse demonstrado em integrar a equipa de Operadoras de CCO da <strong>Overwatch Moçambique</strong>.
                        </p>
                        <p>
                          Após verificação detalhada da conformidade da sua candidatura com os requisitos formais e eliminatórios do concurso, informamos que o seu perfil não preenche os critérios obrigatórios definidos pela direcção para avançar para a fase de testes presenciais.
                        </p>

                        {/* Red Highlighted Reason Callout Box */}
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
                          <strong className="block text-[0.68rem] uppercase tracking-wider text-red-800 mb-1 font-bold">
                            Motivo da Decisão:
                          </strong>
                          <p className="font-medium text-red-950 leading-relaxed">
                            {activeReason}
                          </p>
                        </div>

                        <p className="text-[0.72rem] text-slate-500">
                          Nestes termos, qualquer agendamento de teste anteriormente registado fica sem efeito e a sua candidatura foi arquivada na nossa base de dados.
                        </p>
                        <p className="text-[0.72rem] text-slate-500">
                          Agradecemos o tempo dedicado ao processo e desejamos-lhe os maiores sucessos nos seus projectos futuros e na sua carreira profissional.
                        </p>

                        <div className="pt-2 text-xs text-slate-700">
                          Com os melhores cumprimentos,<br />
                          <strong className="text-slate-900 font-semibold">Equipa de Recrutamento & Selecção</strong><br />
                          <span className="text-slate-500">Overwatch Moçambique</span>
                        </div>
                      </div>

                      {/* Official Sign-Off & Legal Footer */}
                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-[0.65rem] text-slate-500 leading-normal">
                        <strong className="text-slate-800 block">Overwatch Moçambique, Lda.</strong>
                        <span>{siteContact.address.pt}</span>
                        <div className="mt-0.5 text-slate-400">
                          Telefone / WhatsApp: +258 84 287 0793 · Email: {siteContact.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions & Dispatch Bar with Test Email Input */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.01] flex flex-wrap items-center justify-between gap-4">
                  {/* Left: Quick Test Email Dispatch */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.68rem] text-white/50 font-medium">
                      {t("Test dispatch to:", "Enviar teste para:")}
                    </span>
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => {
                        setTestEmailAddress(e.target.value);
                        setTestConfirmEmail(e.target.value);
                      }}
                      placeholder="email@exemplo.com"
                      className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/30 focus:outline-none w-56"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendTestEmail("disqualification")}
                      disabled={testSendingType === "disqualification" || !testEmailAddress.trim()}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {testSendingType === "disqualification" ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>{t("Sending test…", "A enviar teste…")}</span>
                        </>
                      ) : (
                        <>
                          <Mail size={12} />
                          <span>{t("Send Test Email", "Enviar E-mail de Teste")}</span>
                        </>
                      )}
                    </button>

                    {testEmailResult?.type === "disqualification" && (
                      <span
                        className={`text-[0.68rem] font-semibold ${
                          testEmailResult.success ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {testEmailResult.success
                          ? `✓ ${t("Test email delivered!", "E-mail de teste enviado com sucesso!")} (ID: ${testEmailResult.messageId || "ok"})`
                          : `✕ ${testEmailResult.error || t("Failed to send test email", "Falha no envio de teste")}`}
                      </span>
                    )}
                  </div>

                  <span className="text-[0.68rem] text-white/40 italic">
                    {t(
                      "Delivers exact letterhead with Maputo dynamic greeting and selected reason.",
                      "Entrega o modelo oficial com saudação de Maputo e motivo da decisão.",
                    )}
                  </span>
                </div>
              </div>

              {/* Table of Non-Compliant Candidates */}
              <div className="rounded-2xl border border-white/10 bg-[#121827]/95 overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserX size={16} className="text-red-400" />
                      <span>{t("Non-Compliant Applicants List", "Lista de Candidatos Não Conformes")}</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      {t(
                        "Candidates flagged by automated screening rules. Review their profiles or cancel bookings.",
                        "Candidatos identificados pelo filtro de conformidade. Reveja o perfil ou cancele agendamentos.",
                      )}
                    </p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex rounded-lg border border-white/10 overflow-hidden text-[0.68rem] font-semibold bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => setDisqualifyFilterTab("all")}
                      className={`px-3 py-1.5 cursor-pointer transition-colors ${
                        disqualifyFilterTab === "all"
                          ? "bg-white text-[#090d16] font-bold shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {t("All Non-Compliant", "Todos os Não Conformes")} ({nonCompliantList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisqualifyFilterTab("booked")}
                      className={`px-3 py-1.5 cursor-pointer transition-colors ${
                        disqualifyFilterTab === "booked"
                          ? "bg-white text-[#090d16] font-bold shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {t("Only with Booked Test", "Apenas c/ Teste Marcado")} ({bookedNonCompliant.length})
                    </button>
                  </div>
                </div>

                {displayedList.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                    <p className="text-xs font-semibold text-white">
                      {t("No candidates match this filter.", "Nenhum candidato corresponde a este filtro.")}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t("Candidate", "Candidato")}</th>
                          <th>{t("WhatsApp Contact", "Contacto WhatsApp")}</th>
                          <th>{t("Gender", "Género")}</th>
                          <th>{t("Compliance Flaw", "Motivo de Não Conformidade")}</th>
                          <th>{t("Test Slot", "Turno de Teste")}</th>
                          <th className="text-right">{t("Actions", "Ações")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedList.map(({ app: c, screening }, idx) => (
                          <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-4 py-3.5 text-center text-white/40 font-mono text-[0.72rem]">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3.5">
                              <button
                                type="button"
                                onClick={() => setSelected(c)}
                                className="text-left group cursor-pointer block"
                              >
                                <strong className="block text-white font-medium text-xs group-hover:text-sky-300 transition-colors">
                                  {c.name}
                                </strong>
                                <span className="text-[0.68rem] text-white/40 block">
                                  {c.email}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <a
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium text-xs hover:underline"
                              >
                                <Phone size={11} />
                                <span>{c.whatsapp}</span>
                              </a>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold bg-white/10 text-white/80 capitalize">
                                {c.sex === "female" ? t("Female", "Feminino") : t("Male", "Masculino")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-block px-2 py-0.5 rounded text-[0.62rem] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                {screening.isMale && !screening.hasCctvExperience
                                  ? t("Male w/o CCTV Experience", "Homem s/ CCTV")
                                  : t("Missing Cover Letter", "Sem Carta Apresentação")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-[0.72rem]">
                              {c.testSlot ? (
                                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {formatSlotDisplay(c.testSlot, lang)}
                                </span>
                              ) : (
                                <span className="text-white/40 text-[0.68rem]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                              {c.status !== "archived" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDisqualifyModalState({
                                      open: true,
                                      ids: [c.id],
                                      candidateNames: [c.name],
                                      bookedCount: c.testSlot ? 1 : 0,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[0.7rem] font-bold text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                                >
                                  <UserX size={11} />
                                  <span>{t("Disqualify", "Desqualificar")}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelected(c)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <span>{t("Profile & CV", "Perfil & CV")}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* ─── TAB 6: TARGETED BROADCASTS & OUTREACH VIEW ───────── */}
        {view === "custom_broadcast" && (
          <CustomBroadcastView
            applications={applications}
            activeCampaignRole={activeCampaignRole}
            roleLabel={roleLabel}
            lang={lang}
            t={t}
            onRefresh={() => load(true)}
          />
        )}

        {/* ─── TAB 7: REBOOKING GRACE & OTL VIEW ──────────────────── */}
        {view === "rebooking_grace" && (
          <RebookingGraceView
            applications={applications}
            lang={lang}
            t={t}
            onRefresh={() => load(true)}
          />
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

                  <button
                    type="button"
                    onClick={() => setAppQuickFilter("disqualified")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      appQuickFilter === "disqualified"
                        ? "bg-amber-500 text-[#090d16] font-bold shadow-sm"
                        : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
                    }`}
                  >
                    <AlertCircle size={12} />
                    <span>{t("Disqualification Audit", "Auditoria de Critérios")}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[0.65rem] font-bold ${
                      appQuickFilter === "disqualified" ? "bg-black/20 text-[#090d16]" : "bg-amber-500/30 text-amber-200"
                    }`}>
                      {disqualifiedCandidates.length}
                    </span>
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
                      const targets = applications.filter((a) => selectedAppIds.includes(a.id));
                      setRestoreModalState({
                        open: true,
                        ids: selectedAppIds,
                        candidateNames: targets.map((a) => a.name),
                      });
                    }}
                    disabled={busy || deleteBusy || disqualifyBusy || restoreBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <RotateCcw size={13} />
                    <span>{t("Restore & Rectify", "Restaurar & Rectificar")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targets = applications.filter((a) => selectedAppIds.includes(a.id));
                      const names = targets.map((a) => a.name);
                      const bookedCount = targets.filter((a) => Boolean(a.testSlot)).length;
                      setDisqualifyModalState({
                        open: true,
                        ids: selectedAppIds,
                        candidateNames: names,
                        bookedCount,
                      });
                    }}
                    disabled={busy || deleteBusy || disqualifyBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <UserX size={13} />
                    <span>{t("Disqualify Selected", "Desqualificar Selecionados")}</span>
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
                    disabled={busy || deleteBusy || disqualifyBusy}
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

            {/* Disqualification Audit Operational Banner */}
            {appQuickFilter === "disqualified" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 max-w-xl">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                    <UserX size={18} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                      <span>{t("Filipa Recruitment Compliance Filter", "Filtro de Critérios Eliminatórios (Filipa)")}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[0.65rem] font-mono">
                        {disqualifiedCandidates.length} {t("non-compliant", "não conformes")}
                      </span>
                    </div>
                    <p className="text-xs text-amber-100/80 leading-relaxed">
                      {t(
                        "Identifies candidates without a cover letter (all candidates) and male candidates without verified CCTV/CCO experience. Only women can do the test without previous experience.",
                        "Identifica candidatos sem carta de apresentação (todos) e candidatos do sexo masculino sem comprovação curricular de experiência em CCTV/CCO. Apenas mulheres podem realizar o teste sem experiência prévia.",
                      )}
                    </p>
                  </div>
                </div>

                {disqualifiedCandidates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const ids = disqualifiedCandidates.map((a) => a.id);
                        setSelectedAppIds(ids);
                      }}
                      className="px-3 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      {t("Select All Flagged", "Selecionar Todos os Não Conformes")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ids = disqualifiedCandidates.map((a) => a.id);
                        const names = disqualifiedCandidates.map((a) => a.name);
                        const bookedCount = disqualifiedCandidates.filter((a) => Boolean(a.testSlot)).length;
                        setDisqualifyModalState({
                          open: true,
                          ids,
                          candidateNames: names,
                          bookedCount,
                        });
                      }}
                      disabled={disqualifyBusy}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#090d16] text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <UserX size={14} />
                      <span>
                        {t(
                          `Disqualify All Flagged (${disqualifiedCandidates.length})`,
                          `Desqualificar Todos os ${disqualifiedCandidates.length} Não Conformes`,
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Candidate Table */}
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "var(--bg-card)" }}>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={toggleSelectAllOnPage}
                          className="admin-checkbox"
                          title={t("Select all on this page", "Selecionar todos nesta página")}
                        />
                      </th>
                      <th className="w-12 text-center">{t("#", "Nº")}</th>
                      <th>{t("Candidate", "Candidato")}</th>
                      <th>{t("Role", "Vaga")}</th>
                      <th>{t("Status", "Estado")}</th>
                      <th>{t("Convocation / Slot", "Convocatória / Turno")}</th>
                      <th>{t("WhatsApp", "WhatsApp")}</th>
                      <th>{t("Cover Letter", "Carta")}</th>
                      <th>{t("12th Grade", "12.ª Classe")}</th>
                      <th>{t("Sex", "Sexo")}</th>
                      <th>{t("AI User", "Usa IA")}</th>
                      <th>{t("CCTV Exp.", "Exp. CCTV")}</th>
                      <th>{t("Last Profession", "Última Profissão")}</th>
                      <th>{t("2D/2N Shifts", "Turnos 2D/2N")}</th>
                      <th>{t("Date", "Data")}</th>
                      <th>{t("CV", "CV")}</th>
                      <th className="text-right">{t("Actions", "Ações")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedCandidates.map((a, index) => {
                      const isChecked = selectedAppIds.includes(a.id);
                      const rowNumber = startIndex + index + 1;
                      const screening = candidateScreenings.get(a.id);

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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className="block text-white font-medium group-hover:text-white/80 transition-colors">
                                    {a.name}
                                  </strong>
                                  {screening?.disqualified && a.status !== "archived" && (
                                    <span
                                      className="inline-flex items-center gap-1 text-[0.62rem] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded"
                                      title={screening.reasonDescriptionPt}
                                    >
                                      <AlertCircle size={9} className="text-amber-400" />
                                      <span>
                                        {!screening.hasCoverLetter
                                          ? (lang === "pt" ? "Sem carta" : "No cover letter")
                                          : (lang === "pt" ? "Homem s/ CCTV" : "Male no CCTV")}
                                      </span>
                                    </span>
                                  )}
                                </div>
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
                            <div className="flex items-center gap-1.5">
                              <select
                                aria-label={`Stage for ${a.name}`}
                                value={a.status}
                                disabled={statusUpdatingId === a.id}
                                onChange={(e) =>
                                  void handleCandidateStatusChange(a.id, e.target.value)
                                }
                                className={`rounded-lg border px-2.5 py-1 text-[0.7rem] font-semibold bg-[#121827] focus:outline-none cursor-pointer transition-all ${
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

                              {statusUpdatingId === a.id && (
                                <span className="flex items-center gap-1 text-[0.65rem] text-sky-400 font-medium animate-pulse">
                                  <Loader2 size={11} className="animate-spin" />
                                  <span className="hidden sm:inline">{lang === "pt" ? "A guardar..." : "Saving..."}</span>
                                </span>
                              )}

                              {statusSuccessId === a.id && (
                                <span className="flex items-center gap-1 text-[0.65rem] text-emerald-400 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                  <Check size={11} />
                                  <span>{lang === "pt" ? "Gravado" : "Saved"}</span>
                                </span>
                              )}
                            </div>
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/70">
                  {t("Recruitment Stage:", "Fase do Recrutamento:")}
                </label>
                {statusUpdatingId === current.id && (
                  <span className="flex items-center gap-1 text-[0.68rem] text-sky-400 font-medium animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    <span>{lang === "pt" ? "A atualizar estado..." : "Saving..."}</span>
                  </span>
                )}
                {statusSuccessId === current.id && (
                  <span className="flex items-center gap-1 text-[0.68rem] text-emerald-400 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Check size={12} />
                    <span>{lang === "pt" ? "Estado Gravado" : "Saved"}</span>
                  </span>
                )}
              </div>
              <select
                value={current.status}
                disabled={statusUpdatingId === current.id}
                onChange={(e) =>
                  void handleCandidateStatusChange(current.id, e.target.value)
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

            {/* ─── CANDIDATE SCREENING & ELIGIBILITY AUDIT (FILIPA CRITERIA) ─── */}
            {(() => {
              const screening = screenCandidate(current);
              return (
                <div
                  className={`rounded-2xl border p-4 space-y-3 ${
                    screening.disqualified
                      ? "border-amber-500/30 bg-amber-500/[0.05]"
                      : "border-emerald-500/30 bg-emerald-500/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        screening.disqualified ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {screening.disqualified ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                      <span>{t("Eligibility Audit (Criteria)", "Auditoria de Critérios")}</span>
                    </span>
                    <span
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border ${
                        screening.disqualified
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {screening.disqualified
                        ? t("Non-compliant", "Não Conforme")
                        : t("Eligible", "Elegível")}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Rule 1: Cover Letter Check */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                      <div className="flex items-center gap-2">
                        {screening.hasCoverLetter ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <X size={13} className="text-red-400" />
                        )}
                        <span className="text-white/80">
                          {t("Cover Letter submitted (men & women):", "Carta de Apresentação (homens e mulheres):")}
                        </span>
                      </div>
                      <span
                        className={`text-[0.68rem] font-semibold ${
                          screening.hasCoverLetter ? "text-emerald-300" : "text-red-400"
                        }`}
                      >
                        {screening.hasCoverLetter
                          ? t("Verified", "Apresentada")
                          : t("Missing", "Em Falta")}
                      </span>
                    </div>

                    {/* Rule 2: Male CCTV Experience Check */}
                    {screening.isMale && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          {screening.hasCctvExperience ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <X size={13} className="text-red-400" />
                          )}
                          <span className="text-white/80">
                            {t("CCTV/CCO Experience (mandatory for men):", "Experiência CCTV/CCO (obrigatória p/ homens):")}
                          </span>
                        </div>
                        <span
                          className={`text-[0.68rem] font-semibold ${
                            screening.hasCctvExperience ? "text-emerald-300" : "text-red-400"
                          }`}
                        >
                          {screening.hasCctvExperience
                            ? t("Detected in CV", "Detectada no CV")
                            : t("No CCTV experience", "Sem experiência")}
                        </span>
                      </div>
                    )}

                    {screening.disqualified && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[0.72rem] text-red-300 space-y-1">
                        <span className="font-semibold block">
                          {lang === "pt" ? screening.reasonDescriptionPt : screening.reasonDescriptionEn}
                        </span>
                        {current.testSlot && (
                          <span className="text-[0.68rem] text-amber-300 block">
                            ⚠️ {t("Candidate has a booked test slot that will be terminated and freed up upon disqualification.", "O candidato tem um teste agendado que será cancelado e a vaga libertada ao desqualificar.")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {screening.disqualified && current.status !== "archived" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDisqualifyModalState({
                          open: true,
                          ids: [current.id],
                          candidateNames: [current.name],
                          bookedCount: current.testSlot ? 1 : 0,
                        });
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white py-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <UserX size={13} />
                      <span>{t("Disqualify & Archive Candidate", "Desqualificar e Arquivar Candidato")}</span>
                    </button>
                  )}

                  {current.status === "archived" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreModalState({
                          open: true,
                          ids: [current.id],
                          candidateNames: [current.name],
                        });
                      }}
                      disabled={restoreBusy}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <RotateCcw size={13} />
                      <span>{t("Restore to Shortlisted & Send Rectification", "Restaurar Candidatura & Enviar Rectificação")}</span>
                    </button>
                  )}
                </div>
              );
            })()}

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

                  {/* Slot Actions */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 mt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmMsg = lang === "pt"
                          ? `Deseja cancelar o agendamento de ${current.name}? O turno "${current.testSlot}" será libertado para outros candidatos.`
                          : `Do you want to cancel the booking for ${current.name}? The slot will be freed.`;
                        if (!confirm(confirmMsg)) return;
                        try {
                          const res = await fetch(`/api/admin/careers?id=${current.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ testSlot: null, testBookedAt: null }),
                          });
                          if (res.ok) {
                            setApplications((prev) =>
                              prev.map((a) => (a.id === current.id ? { ...a, testSlot: undefined, testBookedAt: undefined } : a))
                            );
                            setSelected((prev) => (prev ? { ...prev, testSlot: undefined, testBookedAt: undefined } : null));
                          }
                        } catch (err) {
                          console.error("Failed to cancel test slot:", err);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white py-1.5 text-[0.68rem] font-semibold transition-colors cursor-pointer"
                    >
                      <X size={11} />
                      <span>{t("Free Slot", "Libertar Turno")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDisqualifyModalState({
                          open: true,
                          ids: [current.id],
                          candidateNames: [current.name],
                          bookedCount: 1,
                        });
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-1.5 text-[0.68rem] font-bold transition-colors cursor-pointer"
                    >
                      <UserX size={11} />
                      <span>{t("Cancel & Disqualify", "Cancelar & Desqualificar")}</span>
                    </button>
                  </div>
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

              {/* Manage Rebooking Grace (OTL) */}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setView("rebooking_grace");
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>{t("Manage Rebooking Grace (OTL) →", "Gerir Período de Graça / Reagendar (OTL) →")}</span>
              </button>
            </div>

            {/* Cover Letter Section with 1-Click English Translation */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/90">
                  <FileText size={15} />
                  <span>{t("Cover Letter", "Carta de Apresentação")}</span>
                </div>

                {current.coverLetter && (
                  <button
                    type="button"
                    onClick={() => handleTranslateCoverLetter(current.id, current.coverLetter)}
                    disabled={translatingCoverLetterId === current.id}
                    className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {translatingCoverLetterId === current.id ? (
                      <Loader2 size={11} className="animate-spin text-sky-300" />
                    ) : (
                      <Languages size={11} className="text-sky-300" />
                    )}
                    <span>
                      {showCoverLetterEn[current.id]
                        ? t("Show Original (PT)", "Ver Original (PT)")
                        : t("Translate to English", "Traduzir para Inglês")}
                    </span>
                  </button>
                )}
              </div>

              {showCoverLetterEn[current.id] && translatedCoverLetter[current.id] && (
                <div className="text-[0.62rem] text-sky-400 font-medium bg-sky-500/[0.08] border border-sky-500/20 rounded px-2 py-0.5 inline-block">
                  ✓ {t("Translated to English", "Traduzido para Inglês")}
                </div>
              )}

              <p className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap">
                {(showCoverLetterEn[current.id] ? translatedCoverLetter[current.id] : current.coverLetter) || (
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
        <div className="admin-modal-overlay">
          <div className="admin-modal p-6 space-y-5" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
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

      {/* ─── DISQUALIFICATION CONFIRMATION MODAL ───────────────────── */}
      {disqualifyModalState.open && (
        <div className="admin-modal-overlay">
          <div className="admin-modal p-6 space-y-5" style={{ borderColor: "rgba(245,158,11,0.25)" }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <UserX size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {disqualifyModalState.ids.length === 1
                      ? t("Disqualify & Archive Candidate", "Desqualificar e Arquivar Candidato")
                      : t(
                          `Disqualify & Archive ${disqualifyModalState.ids.length} Candidates`,
                          `Desqualificar e Arquivar ${disqualifyModalState.ids.length} Candidatos`,
                        )}
                  </h3>
                  <p className="text-xs text-amber-400 font-semibold">
                    {t("Selection Criteria Compliance (Filipa)", "Conformidade de Critérios de Seleção")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisqualifyModalState({ open: false, ids: [], candidateNames: [], bookedCount: 0 })}
                disabled={disqualifyBusy}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-xs text-white/80 space-y-3">
              <p className="leading-relaxed">
                {disqualifyModalState.ids.length === 1 ? (
                  <>
                    {t("Are you sure you want to disqualify", "Tem a certeza que deseja desqualificar e arquivar")}{" "}
                    <strong className="text-white font-bold">{disqualifyModalState.candidateNames?.[0] || "this candidate"}</strong>
                    {t(
                      "? Their status will be moved to Archived according to recruitment criteria.",
                      "? O estado da candidatura passará para Arquivado em conformidade com as regras eliminatórias.",
                    )}
                  </>
                ) : (
                  <>
                    {t(
                      `Are you sure you want to disqualify and archive these ${disqualifyModalState.ids.length} selected candidates who failed mandatory criteria (missing cover letter or male without CCTV experience)?`,
                      `Tem a certeza que deseja desqualificar e arquivar estes ${disqualifyModalState.ids.length} candidatos que não cumprem os critérios eliminatórios (ausência de carta de apresentação ou candidatos masculinos sem experiência em CCTV)?`,
                    )}
                  </>
                )}
              </p>

              {disqualifyModalState.bookedCount > 0 && (
                <div className="p-3 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-200 text-xs flex items-start gap-2 font-medium">
                  <CalendarCheck size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    {t(
                      `⚠️ ${disqualifyModalState.bookedCount} booked test session(s) will be terminated immediately, freeing up slots under the 10-candidate daily quota for new applicants.`,
                      `⚠️ ${disqualifyModalState.bookedCount} vaga(s) agendada(s) de teste presencial serão canceladas imediatamente, libertando lugares sob o limite de 10 vagas/dia para novas candidatas.`,
                    )}
                  </span>
                </div>
              )}

              {disqualifyModalState.candidateNames && disqualifyModalState.candidateNames.length > 1 && (
                <div className="max-h-28 overflow-y-auto rounded-lg bg-black/40 p-2.5 text-[0.7rem] text-white/60 space-y-1">
                  {disqualifyModalState.candidateNames.slice(0, 10).map((name, idx) => (
                    <div key={idx} className="truncate">• {name}</div>
                  ))}
                  {disqualifyModalState.candidateNames.length > 10 && (
                    <div className="italic text-white/40">
                      + {disqualifyModalState.candidateNames.length - 10}{" "}
                      {t("more candidates...", "outros candidatos...")}
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 text-xs text-white/90 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={disqualifySendEmail}
                  onChange={(e) => setDisqualifySendEmail(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 accent-amber-500 h-4 w-4 cursor-pointer"
                />
                <span>{t("Send formal disqualification email to candidate(s)", "Enviar e-mail formal de notificação de desqualificação")}</span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisqualifyModalState({ open: false, ids: [], candidateNames: [], bookedCount: 0 })}
                disabled={disqualifyBusy}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors cursor-pointer disabled:opacity-50"
              >
                {t("Cancel", "Cancelar")}
              </button>

              <button
                type="button"
                onClick={() => handleExecuteDisqualification(disqualifyModalState.ids, disqualifySendEmail)}
                disabled={disqualifyBusy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {disqualifyBusy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{t("Processing...", "A processar...")}</span>
                  </>
                ) : (
                  <>
                    <UserX size={14} />
                    <span>{t("Confirm Disqualification", "Confirmar Desqualificação")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── UNDO DISQUALIFICATION & RECTIFICATION MODAL ───────────── */}
      {restoreModalState.open && (
        <div className="admin-modal-overlay">
          <div className="admin-modal p-6 space-y-5" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {restoreModalState.restoreAllWomen
                      ? t("Restore All Archived Women", "Restaurar Todas as Mulheres Arquivadas")
                      : restoreModalState.ids.length === 1
                        ? t("Restore Candidate & Rectify", "Restaurar Candidatura & Rectificar")
                        : t(
                            `Restore ${restoreModalState.ids.length} Candidates & Rectify`,
                            `Restaurar ${restoreModalState.ids.length} Candidatos & Rectificar`,
                          )}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {t("Undo System Error · Re-activate Candidates", "Desfazer Erro de Sistema · Reativar Candidaturas")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreModalState({ open: false, ids: [], candidateNames: [] })}
                disabled={restoreBusy}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-xs text-white/80 space-y-3">
              <p className="leading-relaxed">
                {restoreModalState.restoreAllWomen ? (
                  t(
                    "All female candidates currently marked as archived will have their status restored to 'Shortlisted'. Their booking slot is reset so they can book next week's sessions (Mon–Fri 10:00).",
                    "Todas as candidatas do sexo feminino atualmente arquivadas terão o seu estado restaurado para 'Pré-seleccionadas'. O link de agendamento é reactivado para poderem marcar o teste presencial para a próxima semana.",
                  )
                ) : restoreModalState.ids.length === 1 ? (
                  <>
                    {t("Are you sure you want to restore", "Tem a certeza que deseja restaurar e rectificar a candidatura de")}{" "}
                    <strong className="text-white font-bold">{restoreModalState.candidateNames?.[0] || "this candidate"}</strong>
                    {t(
                      "? Their status will be moved back to 'Shortlisted'.",
                      "? O estado será alterado de volta para 'Pré-seleccionadas' e a candidatura reactivada.",
                    )}
                  </>
                ) : (
                  t(
                    `Are you sure you want to restore these ${restoreModalState.ids.length} selected candidates back to 'Shortlisted'?`,
                    `Tem a certeza que deseja restaurar estes ${restoreModalState.ids.length} candidatos seleccionados de volta para 'Pré-seleccionadas'?`,
                  )
                )}
              </p>

              {restoreModalState.candidateNames && restoreModalState.candidateNames.length > 0 && !restoreModalState.restoreAllWomen && (
                <div className="max-h-28 overflow-y-auto space-y-1 rounded-lg bg-black/30 p-2 border border-white/5 font-mono text-[0.68rem] text-white/70">
                  {restoreModalState.candidateNames.slice(0, 10).map((name, idx) => (
                    <div key={idx} className="truncate">• {name}</div>
                  ))}
                  {restoreModalState.candidateNames.length > 10 && (
                    <div className="text-white/40 italic">
                      + {restoreModalState.candidateNames.length - 10}{" "}
                      {t("more candidates...", "outros candidatos...")}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email Notification Option */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer text-xs text-white/80 select-none">
              <input
                type="checkbox"
                checked={restoreSendEmail}
                onChange={(e) => setRestoreSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#121827] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
              />
              <span>
                {t(
                  "Send official Rectification & Apology email (with direct booking link)",
                  "Enviar e-mail formal de Rectificação e Desculpas (com link individual de agendamento)",
                )}
              </span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalState({ open: false, ids: [], candidateNames: [] })}
                disabled={restoreBusy}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors cursor-pointer disabled:opacity-50"
              >
                {t("Cancel", "Cancelar")}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleExecuteRestore(
                    restoreModalState.ids,
                    Boolean(restoreModalState.restoreAllWomen),
                    restoreSendEmail,
                  )
                }
                disabled={restoreBusy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {restoreBusy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{t("Restoring...", "A restaurar...")}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>{t("Confirm & Restore", "Confirmar e Restaurar")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESTORE SUCCESS TOAST ──────────────────────────────────── */}
      {restoreSuccessToast && (
        <div className="admin-toast admin-toast-green" style={{ zIndex: 999 }}>
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block text-xs font-bold text-white mb-0.5">
              {lang === "pt" ? "Operação Concluída" : "Restore Completed"}
            </strong>
            <p className="text-xs leading-relaxed" style={{ color: "var(--accent-green)", opacity: 0.9 }}>
              {restoreSuccessToast}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRestoreSuccessToast(null)}
            className="text-emerald-400/60 hover:text-emerald-300 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
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

      {/* Gate QR Live Scanner Modal */}
      <GateCheckInModal
        isOpen={gateScannerOpen}
        onClose={() => setGateScannerOpen(false)}
        onCheckInSuccess={handleGateCheckInSuccess}
        lang={lang}
      />
    </div>
  );
}
