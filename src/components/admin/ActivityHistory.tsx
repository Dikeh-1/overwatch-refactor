"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { History, RefreshCw, X, ChevronDown, AlertCircle } from "lucide-react";
import type { ActivityEvent } from "@/lib/admin-activity";
import { useAdminLanguage } from "./shell/AdminLanguageContext";

const sections = ["overview", "candidates", "testing", "next-phase", "communications", "roles", "form-builder", "archive", "settings", "security", "system"];
const labels: Record<string, [string, string]> = {
  overview: ["Overview", "Visão geral"], candidates: ["Candidates", "Candidaturas"], testing: ["Testing & attendance", "Testes e presenças"],
  "next-phase": ["Next phase", "Próxima fase"], communications: ["Communications", "Comunicações"], roles: ["Job roles", "Vagas"],
  "form-builder": ["Form builder", "Formulário"], archive: ["Archive Vault", "Cofre de Arquivo"], settings: ["Settings", "Configurações"], security: ["Login & security", "Acesso e segurança"], system: ["System", "Sistema"],
};
function actionTitle(event: ActivityEvent, lang: "en" | "pt") {
  if (!/^(GET|POST|PATCH|PUT|DELETE) \/api\//.test(event.action)) return event.action;
  if (event.action.includes("/session")) return event.action.startsWith("DELETE") ? (lang === "en" ? "Sign out" : "Terminar sessão") : (lang === "en" ? "Sign in" : "Iniciar sessão");
  if (event.action.startsWith("GET /api/admin/cv")) return lang === "en" ? "CV accessed" : "Currículo consultado";
  const action = event.action.split(" · ")[1]?.replaceAll("_", " ");
  return `${labels[event.section]?.[lang === "en" ? 0 : 1] || event.section} · ${action || (lang === "en" ? "Action request" : "Pedido de ação")}`;
}
function sectionForPage(path: string) {
  if (path.includes("/activity")) return "system";
  if (path.includes("/settings")) return "settings";
  return sections.find(section => path.includes(`/${section}`)) || "overview";
}
export function ActivityLogView({ initialSection = "", roleId = "", cohortId = "", entityId = "", compact = false }: { initialSection?: string; roleId?: string; cohortId?: string; entityId?: string; compact?: boolean }) {
  const { t, lang } = useAdminLanguage();
  const [section, setSection] = useState(initialSection);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async (before?: string) => {
    const current = ++generation.current;
    try {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries({ section, roleId, cohortId, entityId, before })) if (value) query.set(key, value);
      const response = await fetch(`/api/admin/activity?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "History could not be loaded");
      if (current !== generation.current) return;
      setError("");
      setEvents(previous => before ? [...previous, ...data.events] : data.events);
      setCursor(data.nextCursor);
    } catch (err) { if (current === generation.current) setError(err instanceof Error ? err.message : "History could not be loaded"); }
    finally { if (current === generation.current) setLoading(false); }
  }, [section, roleId, cohortId, entityId]);
  // Synchronize with external history storage; load updates state only after its fetch settles.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const counter = generation; void load(); return () => { counter.current++; }; }, [load]);
  return <section className="space-y-4">
    {!compact && <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><History size={24} />{t("Activity Log", "Registo de Atividade")}</h1><p className="text-sm text-slate-500 mt-2">{t("Timestamped actions, saved changes, message content and login activity across the system.", "Ações, alterações guardadas, conteúdo de mensagens e acessos com data e hora.")}</p></div>}
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{t("History shows saved changes, communication outcomes and security events. Page views and internal preparation records are excluded. Shared logins identify the account used.", "O histórico mostra alterações guardadas, resultados de comunicações e eventos de segurança. Consultas de páginas e registos internos de preparação são excluídos. Acessos partilhados identificam a conta utilizada.")}</div>
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm text-slate-700">{t("Section", "Secção")} <select aria-label={t("Filter history by section", "Filtrar histórico por secção")} value={section} onChange={event => { setEvents([]); setCursor(null); setLoading(true); setError(""); setSection(event.target.value); }} className="ml-2 border border-slate-200 rounded-lg px-3 py-2 bg-white"><option value="">{t("All sections", "Todas as secções")}</option>{sections.map(key => <option key={key} value={key}>{t(...labels[key])}</option>)}</select></label>
      <button type="button" onClick={() => { setLoading(true); setError(""); void load(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{t("Refresh", "Atualizar")}</button>
      {(roleId || cohortId || entityId) && <span className="text-xs text-slate-500">{t("Filtered to this workspace or candidate", "Filtrado por este espaço ou candidato")}</span>}
    </div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700 text-sm flex gap-2"><AlertCircle size={16}/>{error}</div>}
    {!events.length && !loading && !error && <p className="py-8 text-center text-sm text-slate-500">{t("No recorded activity matches these filters.", "Nenhuma atividade corresponde a estes filtros.")}</p>}
    <div className="space-y-3">{events.map(event => <ActivityRow key={event.id} event={event} lang={lang} />)}</div>
    {loading && <p role="status" className="text-sm text-slate-500">{t("Loading history…", "A carregar histórico…")}</p>}
    {cursor && <button type="button" disabled={loading} onClick={() => { setLoading(true); setError(""); void load(cursor); }} className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:opacity-50">{t("Load older activity", "Carregar atividade anterior")}</button>}
  </section>;
}
function ActivityRow({ event, lang }: { event: ActivityEvent; lang: "en" | "pt" }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<unknown>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const toggle = async () => {
    setOpen(!open);
    if (open || detail || loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/activity?id=${event.id}`, { cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setDetail({ ...(data.started ? { recordedAction: data.started.details, startedAt: data.started.timestamp } : {}), result: data.event.details });
    } catch { setError(lang === "en" ? "Details could not be loaded. Close and reopen to retry." : "Não foi possível carregar detalhes. Feche e reabra para tentar novamente."); }
    finally { setLoading(false); }
  };
  const outcome = { started: ["Started", "Iniciado"], succeeded: ["Succeeded", "Concluído"], failed: ["Failed", "Falhou"] }[event.outcome][lang === "en" ? 0 : 1];
  type Message = { subject?: string; body?: string; textContent?: string; htmlContent?: string; to?: { email: string }[] };
  const evidence = detail as { recordedAction?: Message & { before?: Message; after?: Message }; result?: Message & { before?: Message; after?: Message } } | undefined;
  const payload = evidence?.recordedAction || evidence?.result;
  const message = payload?.subject ? payload : payload?.after || payload?.before;

  return <article className="rounded-xl border border-slate-200 bg-white overflow-hidden">
    <button type="button" onClick={() => void toggle()} aria-expanded={open} className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50">
      <span className="min-w-0 space-y-2"><span className="block text-sm font-semibold text-slate-900 break-words">{actionTitle(event, lang)}</span><span className="flex flex-wrap gap-2 items-center text-xs text-slate-500"><time dateTime={event.timestamp} title={event.timestamp}>{new Date(event.timestamp).toLocaleString(lang === "en" ? "en-GB" : "pt-PT", { dateStyle: "medium", timeStyle: "long" })}</time><span>· {event.actor}</span><span>· {labels[event.section]?.[lang === "en" ? 0 : 1] || event.section}</span></span><span className={`inline-block text-xs rounded px-2 py-1 ${event.outcome === "failed" ? "bg-red-50 text-red-700" : event.outcome === "started" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{outcome}</span></span><ChevronDown size={16} className={`shrink-0 mt-1 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="border-t border-slate-100 p-4 space-y-3"><p className="text-xs text-slate-500 break-all">{lang === "en" ? "Request" : "Pedido"}: {event.requestId}{event.entityId && ` · Candidate: ${event.entityId}`}{event.roleId && ` · Role: ${event.roleId}`}{event.cohortId && ` · Cycle: ${event.cohortId}`}</p>{loading && <p role="status">{lang === "en" ? "Loading details…" : "A carregar detalhes…"}</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message?.subject && <div className="rounded-xl border border-slate-200 p-4 space-y-3"><h3 className="font-semibold text-slate-900">{message.subject}</h3>{message.to && <p className="text-xs text-slate-500">{message.to.map(person => person.email).join(", ")}</p>}<pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">{message.textContent || message.body || (lang === "en" ? "HTML-only message; expand the recorded details below to inspect its source." : "Mensagem apenas HTML; consulte os detalhes abaixo.")}</pre></div>}{detail !== undefined && <details><summary className="cursor-pointer text-sm text-sky-700">{lang === "en" ? "Recorded details and changes" : "Detalhes e alterações registados"}</summary><pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(detail, null, 2)}</pre></details>}<p className="text-xs text-slate-500">{lang === "en" ? "Message content and HTML are displayed as inert text. Credentials, signed links and attachment bytes are redacted." : "O conteúdo e HTML são apresentados como texto inerte. Credenciais, ligações assinadas e anexos são ocultados."}</p></div>}
  </article>;
}
export function SectionHistoryButton() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useAdminLanguage();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const section = sectionForPage(pathname);
  const roleId = params.get("role") || "", cohortId = params.get("cohortId") || "";
  const entityId = pathname.match(/\/candidates\/([^/]+)$/)?.[1] || "";
  useEffect(() => {
    if (!open) return;
    const element = dialog.current, button = opener.current; element?.showModal();
    return () => { element?.close(); button?.focus(); };
  }, [open]);
  if (pathname.includes("/activity")) return null;
  return <><button ref={opener} type="button" onClick={() => setOpen(true)} title={t("Section history", "Histórico da secção")} aria-label={t("Section history", "Histórico da secção")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"><History size={15}/><span className="hidden sm:inline">{t("History", "Histórico")}</span></button>{open && <dialog ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-labelledby="section-history-title" className="m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[85vh] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40"><div className="flex justify-between items-center border-b border-slate-200 p-4"><h2 id="section-history-title" className="font-bold text-slate-900">{t(...labels[section])} · {t("History", "Histórico")}</h2><button type="button" onClick={() => setOpen(false)} aria-label={t("Close history", "Fechar histórico")} className="p-2 rounded hover:bg-slate-100"><X size={18}/></button></div><div className="overflow-auto max-h-[calc(85vh-5rem)] p-4"><ActivityLogView key={`${pathname}-${roleId}-${cohortId}`} initialSection={entityId ? "" : section} roleId={roleId} cohortId={cohortId} entityId={entityId} compact /></div></dialog>}</>;
}
