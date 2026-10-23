"use client";
import { useEffect, useRef, useState } from "react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { safeEmailDocument } from "@/lib/communication-content";
import type { Application } from "@/lib/careers";
type MessageRow = {id: string; kind?: string; updated_at: string; data: { status: string; subject?: string; recipient?: string; from?: string; messageBody?: string; body?: string; htmlContent?: string; messageId?: string; folderId?: string; deliveryId?: string; fullContent?: boolean; candidateId?: string; events?: {name: string; time: string; link?: string}[]; error?: string }};
export type StudioFolder = "compose" | "drafts" | "incoming" | "sent" | "outbox";
type MailboxProps = { scope: string; folder: StudioFolder; applications: Application[]; onOpenDraft: (id: string) => Promise<void> };
export function StudioMailbox(props: MailboxProps) {
  // A folder is a separate session: old rows, selections and late message reads
  // must never appear beneath the next folder's heading, even for one render.
  return <MailboxSession key={`${props.scope}:${props.folder}`} {...props} />;
}
function MailboxSession({ scope, folder, applications, onOpenDraft }: MailboxProps) {
  const { t } = useAdminLanguage();
  const [items, setItems] = useState<MessageRow[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(true), [retry, setRetry] = useState(0), [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const loaded = useRef(false);
  const [action, setAction] = useState<string | null>(null), [notice, setNotice] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const actionLock = useRef(false), mounted = useRef(true), detailsAbort = useRef(new AbortController());
  const requestNumber = useRef(0), confirmation = useRef<HTMLDialogElement>(null);
  const reading = useRef(new Set<string>()), [loadingIds, setLoadingIds] = useState<string[]>([]);
  useEffect(() => { mounted.current = true; detailsAbort.current = new AbortController(); return () => { mounted.current = false; detailsAbort.current.abort(); }; }, []);
  useEffect(() => { if (confirmIds) confirmation.current?.showModal(); else confirmation.current?.close(); }, [confirmIds]);
  const runAction = async (name: string, operation: () => Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true; setAction(name); setError(""); setNotice("");
    try { await operation(); }
    catch (error) { if (mounted.current) setError((error as Error).message); }
    finally { actionLock.current = false; if (mounted.current) setAction(null); }
  };
  useEffect(() => {
    const controller = new AbortController();
    const number = ++requestNumber.current;
    queueMicrotask(() => { if (!controller.signal.aborted && !loaded.current) setBusy(true); });
    const endpoint = folder === "incoming" ? "/api/admin/careers/mail/incoming" : `/api/admin/careers/mail?scope=${encodeURIComponent(scope)}`;
    fetch(endpoint, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]), cache: "no-store" }).then(async response => { const data = await response.json(); if (controller.signal.aborted || number !== requestNumber.current) return; if (!response.ok) throw Error(data.error); setItems(data.items || []); setConnected(Boolean(data.connected)); setLoadError(""); setNotice(current => current === t("Refreshing messages…", "A actualizar mensagens…") ? t("Messages updated.", "Mensagens actualizadas.") : current); }).catch(error => { if (!controller.signal.aborted && number === requestNumber.current) setLoadError(error.message); }).finally(() => { if (!controller.signal.aborted && number === requestNumber.current) { loaded.current = true; setBusy(false); } });
    return () => controller.abort();
  }, [scope, folder, retry, t]);
  useEffect(() => {
    if (folder !== "outbox" || action || confirmIds) return;
    const timer = setInterval(() => setRetry(n => n + 1), 5000);
    return () => clearInterval(timer);
  }, [folder, action, confirmIds]);
  const resume = async () => {
    setError("");
    const response = await fetch("/api/admin/careers/mail/process", { method: "POST", signal: AbortSignal.timeout(30000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope }) }); const data = await response.json(); if (!response.ok) throw Error(data.error); if (mounted.current) { setRetry(n => n+1); setNotice(t("Delivery processing requested. Progress updates below; messages already sending will not be sent again.", "Processamento solicitado. O progresso é actualizado abaixo; mensagens em envio não serão repetidas.")); }
  };
  const retryRejected = async (id: string) => {
    setError("");
    try {
      const response = await fetch("/api/admin/careers/mail", { method: "POST", signal: AbortSignal.timeout(30000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry", scope, id }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      await resume();
    } catch (error) { setError((error as Error).message); }
  };
  const deleteSelected = async (ids: string[]) => {
    ++requestNumber.current;
    setError("");
    try {
      const response = await fetch("/api/admin/careers/mail", { method: "POST", signal: AbortSignal.timeout(30000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", scope, ids }) });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      setSelected([]); setRetry(n => n + 1);
      setItems(current => current.filter(item => !result.deleted?.includes(item.id)));
      setConfirmIds(null);
      setNotice(t(`${result.deleted?.length || 0} messages removed from Outbox. Pending deliveries were cancelled.`, `${result.deleted?.length || 0} mensagens removidas. Os envios pendentes foram cancelados.`));
      if (result.blocked?.length) setError(t("Some messages are being sent or changed. They were not deleted.", "Algumas mensagens estão em envio ou foram alteradas e não foram apagadas."));
    } catch (error) { setError((error as Error).message); }
  };
  const readSent = async (item: MessageRow) => {
    try {
      const response = await fetch(`/api/admin/careers/mail/message?${new URLSearchParams({id:item.id,scope,...(item.data.candidateId ? {candidateId:item.data.candidateId} : {})})}`, { cache: "no-store", signal: AbortSignal.any([detailsAbort.current.signal, AbortSignal.timeout(30000)]) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      if (!mounted.current || detailsAbort.current.signal.aborted) return;
      setItems(current => {
        const found = current.find(row => row.id === item.id);
        const updated = { ...item, data: { ...item.data, htmlContent: data.htmlContent || item.data.htmlContent, events: data.events, fullContent: true } };
        return found ? current.map(row => row.id === item.id ? updated : row) : [...current, updated];
      });
    } catch (error) { if (mounted.current && !detailsAbort.current.signal.aborted) setError((error as Error).message); }
  };
  const readIncoming = async (item: MessageRow) => {
    try {
      if (!item.data.messageId || !item.data.folderId) throw Error("Message details are unavailable");
      const response = await fetch(`/api/admin/careers/mail/incoming?messageId=${encodeURIComponent(item.data.messageId)}&folderId=${encodeURIComponent(item.data.folderId)}`, { cache: "no-store", signal: AbortSignal.any([detailsAbort.current.signal, AbortSignal.timeout(30000)]) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      if (!mounted.current || detailsAbort.current.signal.aborted) return;
      setItems(current => current.map(row => row.id === item.id ? { ...row, data: { ...row.data, body: data.body, fullContent: true } } : row));
    } catch(error) { if (mounted.current && !detailsAbort.current.signal.aborted) setError((error as Error).message); }
  };
  const readWithFeedback = async (item: MessageRow) => {
    if (reading.current.has(item.id)) return;
    reading.current.add(item.id); setLoadingIds(current => [...current, item.id]);
    try { if (folder === "incoming") await readIncoming(item); else await readSent(item); }
    finally { reading.current.delete(item.id); if (mounted.current) setLoadingIds(current => current.filter(id => id !== item.id)); }
  };
  const records = folder === "incoming" ? items.filter(item => !item.kind && ["received", "incoming"].includes(item.data.status) && item.data.messageId && item.data.folderId) : items.filter(item => item.data.status !== "deleted").filter(item => folder === "drafts" ? item.kind === "draft" && item.data.status === "draft" : (item.kind === "outbox" && (folder === "sent" ? item.data.status === "sent" : item.data.status !== "sent")) || (folder === "outbox" && ((item.kind === "automation" && item.data.status !== "completed") || (item.kind === "draft" && item.data.status === "queued"))));
  const historical = folder === "sent" ? applications.flatMap(application => (application.communications || []).filter(record => ["sent", "delivered"].includes(record.status) && !items.some(item => item.id === record.id || item.data.deliveryId === record.id)).map(record => ({ id: record.id, updated_at: record.sentAt, data: { subject: record.subject, messageBody: record.bodySnippet, candidateId: application.id, recipient: record.recipient || application.email, status: record.status } }))) : [];
  const statusLabel = (value: string) => ({ draft:t("Draft", "Rascunho"), queued:t("Queued", "Em fila"), sending:t("Sending", "A enviar"), sent:t("Sent", "Enviado"), delivered:t("Delivered", "Entregue"), failed:t("Delivery failed", "Falha no envio"), skipped:t("Skipped · not sent", "Ignorado · não enviado"), needs_verification:t("Delivery outcome unconfirmed", "Resultado do envio por confirmar"), waiting_for_booking:t("Waiting for booking", "A aguardar agendamento"), needs_attention:t("Follow-up needs attention", "Seguimento requer atenção"), completed:t("Completed", "Concluído"), incoming:t("Received", "Recebido"), received:t("Received", "Recebido") }[value] || value);
  const recovered = folder === "sent" ? items.filter(item => !item.kind && item.data.fullContent) : [];
  const all: MessageRow[] = [...records.filter(row => row.kind), ...recovered, ...historical, ...(folder === "incoming" ? records : [])].sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  const removableIds = all.filter(item => ["outbox", "automation"].includes(item.kind || "") && ["queued", "failed", "skipped", "waiting_for_booking", "needs_attention"].includes(item.data.status)).map(item => item.id);
  const selectedIds = selected.filter(id => removableIds.includes(id));
  return <section aria-busy={busy || Boolean(action)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{({ drafts: t("Drafts", "Rascunhos"), incoming: t("Incoming · info@overwatchmoz.com", "Recebidos · info@overwatchmoz.com"), sent: t("Sent mail", "Enviados"), outbox: t("Outbox & follow-ups", "Caixa de saída e seguimentos"), compose: "" })[folder]}</h2><button disabled={busy || Boolean(action)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50" onClick={() => { setNotice(t("Refreshing messages…", "A actualizar mensagens…")); setBusy(true); setRetry(n => n + 1); }}>{busy ? t("Refreshing…", "A actualizar…") : t("Refresh", "Actualizar")}</button></div>
    {folder === "outbox" && items.some(item => ["outbox", "draft"].includes(item.kind || "") && item.data.status === "queued") && <button className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white" disabled={Boolean(action)} onClick={() => void runAction("resume", resume)}>{action === "resume" ? t("Starting delivery processing…", "A iniciar processamento…") : t("Resume pending deliveries", "Retomar envios pendentes")}</button>}
    {folder === "outbox" && <div className="flex flex-wrap items-center gap-3 text-sm"><label><input type="checkbox" disabled={Boolean(action) || !removableIds.length} ref={element => { if (element) element.indeterminate = selectedIds.length > 0 && selectedIds.length < removableIds.length; }} checked={removableIds.length > 0 && selectedIds.length === removableIds.length} onChange={event => setSelected(event.target.checked ? removableIds : [])} /> {t("Select removable messages", "Seleccionar mensagens removíveis")}</label><button disabled={!selectedIds.length || Boolean(action) || busy} className="rounded-lg border border-red-200 px-3 py-2 text-red-700 disabled:opacity-40" onClick={() => { setError(""); setConfirmIds([...selectedIds]); }}>{t("Delete selected", "Apagar seleccionadas")} ({selectedIds.length})</button><span className="text-xs text-slate-500">{t("Sending messages cannot be removed. Deleting pending mail cancels its delivery.", "Mensagens em envio não podem ser removidas. Apagar mensagens pendentes cancela o envio.")}</span></div>}
    {folder === "outbox" && <div role="status" className="rounded-lg bg-sky-50 p-3 text-sm">{t("Delivery batches: up to 5 emails at a time", "Lotes de envio: até 5 emails de cada vez")} · {items.filter(i => i.kind === "outbox" && i.data.status === "sent").length} {t("sent", "enviados")} · {items.filter(i => i.kind === "outbox" && i.data.status === "sending").length} {t("sending", "em envio")} · {items.filter(i => i.kind === "outbox" && i.data.status === "queued").length} {t("queued", "em fila")}</div>}
    <dialog ref={confirmation} aria-labelledby="delete-mail-title" aria-describedby="delete-mail-description" onCancel={event => { event.preventDefault(); if (!action) setConfirmIds(null); }} className="fixed inset-0 m-auto w-[min(92vw,440px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/50"><h2 id="delete-mail-title" className="text-lg font-semibold">{t("Delete selected Outbox messages?", "Apagar mensagens seleccionadas?")}</h2><p id="delete-mail-description" className="mt-3 text-sm text-slate-600">{t(`${confirmIds?.length || 0} messages will be removed and their pending deliveries cancelled. Messages already sending cannot be deleted.`, `${confirmIds?.length || 0} mensagens serão removidas e os envios pendentes cancelados. Mensagens em envio não podem ser apagadas.`)}</p>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" autoFocus disabled={Boolean(action)} onClick={() => setConfirmIds(null)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{t("Cancel", "Cancelar")}</button><button type="button" disabled={Boolean(action)} aria-busy={action === "delete"} onClick={() => void runAction("delete", () => deleteSelected(confirmIds || []))} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{action === "delete" ? t("Deleting…", "A apagar…") : t("Delete & cancel deliveries", "Apagar e cancelar envios")}</button></div></dialog>
    {action && <p role="status" className="flex items-center gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-800"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-700" />{t("Processing your request…", "A processar o seu pedido…")}</p>}
    {notice && !action && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {busy && <p role="status" className="text-sm text-slate-500">{t("Loading messages…", "A carregar mensagens…")}</p>}
    {(error || loadError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || loadError}</p>}
    {!busy && folder === "incoming" && !connected && !error && !loadError && <div className="space-y-2 rounded-xl bg-sky-50 p-4 text-sm text-sky-900"><p>{t("The Zoho mailbox connection is required to receive replies here.", "É necessário ligar a caixa Zoho para receber respostas aqui.")}</p><a href="https://mail.zoho.com" target="_blank" rel="noreferrer" className="font-semibold underline">{t("Open info@overwatchmoz.com in Zoho Mail", "Abrir info@overwatchmoz.com no Zoho Mail")}</a><p className="text-xs">{t("Outgoing emails still use the configured delivery service. Incoming messages are never simulated.", "Os envios usam o serviço configurado. As mensagens recebidas nunca são simuladas.")}</p></div>}
    {!busy && !all.length && !error && !loadError && (folder !== "incoming" || connected) && <p className="py-6 text-center text-sm text-slate-500">{t("No messages in this folder.", "Sem mensagens nesta pasta.")}</p>}
    {all.map(item => <details key={item.id} onToggle={event => { if (event.currentTarget.open && !item.data.fullContent) { if (folder === "sent" || folder === "incoming") void readWithFeedback(item); } }} className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer">{folder === "outbox" && ["outbox", "automation"].includes(item.kind || "") && ["queued", "failed", "skipped", "waiting_for_booking", "needs_attention"].includes(item.data.status) && <input aria-label={t("Select message", "Seleccionar mensagem")} type="checkbox" disabled={Boolean(action)} className="mr-3" checked={selected.includes(item.id)} onClick={event => event.stopPropagation()} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />}<span className="text-sm font-semibold">{item.data.subject || (folder === "drafts" ? t("Untitled draft", "Rascunho sem assunto") : t("No subject", "Sem assunto"))}</span><span className="mt-1 block text-xs text-slate-500">{item.data.recipient || item.data.from || ""} · {new Date(item.updated_at).toLocaleString()} · {statusLabel(item.data.status)}</span></summary><div className="mt-4 space-y-3">{loadingIds.includes(item.id) && <p role="status" className="text-sm text-sky-700">{t("Loading original message…", "A carregar mensagem original…")}</p>}{(item.data.htmlContent || (folder === "incoming" && item.data.fullContent && item.data.body)) ? <iframe title={item.data.subject || "Email"} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="h-[620px] w-full rounded-lg border bg-white" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://www.overwatchmoz.com data:;">${safeEmailDocument(item.data.htmlContent || item.data.body || "")}`} /> : <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700">{String(item.data.messageBody || item.data.body || t("Original content was not saved for this historical email.", "O conteúdo original deste email histórico não foi guardado.")).replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>/gi, "\n").replace(/<[^>]*>/g, "")}</pre>}{folder === "incoming" && !item.data.fullContent && <button className="text-xs font-semibold text-sky-700 underline" disabled={loadingIds.includes(item.id)} onClick={() => void readWithFeedback(item)}>{loadingIds.includes(item.id) ? t("Loading…", "A carregar…") : t("Read full message", "Ler mensagem completa")}</button>}{folder === "sent" && <button className="text-xs font-semibold text-sky-700 underline" disabled={loadingIds.includes(item.id)} onClick={() => void readWithFeedback(item)}>{loadingIds.includes(item.id) ? t("Loading…", "A carregar…") : t("Load original email & delivery tracking", "Carregar email original e rastreio")}</button>}{item.data.events && <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs"><p className="font-semibold">{t("Provider delivery history", "Histórico do fornecedor")}</p>{!item.data.events.length && <p>{t("No provider events are available for this message. Opens may be blocked or reported by privacy proxies.", "Sem eventos disponíveis. Aberturas podem ser bloqueadas ou registadas por proxies de privacidade.")}</p>}{item.data.events.map((event, index) => <p key={index}>{event.name} · {new Date(event.time).toLocaleString()}{event.link && <span className="block break-all">{event.link}</span>}</p>)}</div>}{folder === "outbox" && item.data.status === "failed" && /attachment is missing|^This applicant is no longer eligible for a booking invitation\.$/.test(item.data.error || "") && <button className="rounded-lg border px-3 py-2 text-xs font-semibold text-sky-700" disabled={Boolean(action)} onClick={() => void runAction(`retry:${item.id}`, () => retryRejected(item.id))}>{action === `retry:${item.id}` ? t("Checking & queuing…", "A verificar e enfileirar…") : t("Retry after eligibility check", "Repetir após verificar elegibilidade")}</button>}{item.data.error && <p className="text-xs text-red-700">{item.data.error}</p>}{["sending", "needs_verification"].includes(item.data.status) && <p className="text-xs text-amber-800">{t("Delivery is in progress or awaiting verification. Do not resend until the delivery outcome is confirmed.", "O envio está em curso ou aguarda verificação. Não repita sem confirmar o resultado.")}</p>}{folder === "drafts" && <button className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white" disabled={Boolean(action)} onClick={() => void runAction(`draft:${item.id}`, () => onOpenDraft(item.id))}>{action === `draft:${item.id}` ? t("Opening draft…", "A abrir rascunho…") : t("Continue editing", "Continuar a editar")}</button>}</div></details>)}
  </section>;
}
