"use client";
import { useEffect, useState } from "react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { safeEmailDocument } from "@/lib/communication-content";
import type { Application } from "@/lib/careers";
type MessageRow = {id: string; kind?: string; updated_at: string; data: { status: string; subject?: string; recipient?: string; from?: string; messageBody?: string; body?: string; htmlContent?: string; messageId?: string; folderId?: string; deliveryId?: string; fullContent?: boolean; candidateId?: string; events?: {name: string; time: string; link?: string}[]; error?: string }};
export type StudioFolder = "compose" | "drafts" | "incoming" | "sent" | "outbox";
export function StudioMailbox({ scope, folder, applications, onOpenDraft }: { scope: string; folder: StudioFolder; applications: Application[]; onOpenDraft: (id: string) => Promise<void> }) {
  const { t } = useAdminLanguage();
  const [items, setItems] = useState<MessageRow[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(true), [retry, setRetry] = useState(0), [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) { setBusy(true); setError(""); } });
    const endpoint = folder === "incoming" ? "/api/admin/careers/mail/incoming" : `/api/admin/careers/mail?scope=${encodeURIComponent(scope)}`;
    fetch(endpoint, { signal: controller.signal, cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error); setItems(data.items || []); setConnected(Boolean(data.connected)); }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [scope, folder, retry]);
  useEffect(() => {
    if (folder !== "outbox") return;
    const timer = setInterval(() => setRetry(n => n + 1), 5000);
    return () => clearInterval(timer);
  }, [folder]);
  const resume = async () => {
    setError("");
    try { const response = await fetch("/api/admin/careers/mail/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope }) }); const data = await response.json(); if (!response.ok) throw Error(data.error); setRetry(n => n+1); } catch(error) { setError((error as Error).message); }
  };
  const retryRejected = async (id: string) => {
    setError("");
    try {
      const response = await fetch("/api/admin/careers/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry", scope, id }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      await resume();
    } catch (error) { setError((error as Error).message); }
  };
  const deleteSelected = async (ids: string[]) => {
    setError("");
    try {
      const response = await fetch("/api/admin/careers/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", scope, ids }) });
      const result = await response.json(); if (!response.ok) throw Error(result.error);
      setSelected([]); setRetry(n => n + 1);
      if (result.blocked?.length) setError(t("Some messages are being sent or changed. They were not deleted.", "Algumas mensagens estão em envio ou foram alteradas e não foram apagadas."));
    } catch (error) { setError((error as Error).message); }
  };
  const readSent = async (item: MessageRow) => {
    try {
      const response = await fetch(`/api/admin/careers/mail/message?${new URLSearchParams({id:item.id,scope,...(item.data.candidateId ? {candidateId:item.data.candidateId} : {})})}`, { cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setItems(current => {
        const found = current.find(row => row.id === item.id);
        const updated = { ...item, data: { ...item.data, htmlContent: data.htmlContent || item.data.htmlContent, events: data.events, fullContent: true } };
        return found ? current.map(row => row.id === item.id ? updated : row) : [...current, updated];
      });
    } catch (error) { setError((error as Error).message); }
  };
  const readIncoming = async (item: MessageRow) => {
    try {
      if (!item.data.messageId || !item.data.folderId) throw Error("Message details are unavailable");
      const response = await fetch(`/api/admin/careers/mail/incoming?messageId=${encodeURIComponent(item.data.messageId)}&folderId=${encodeURIComponent(item.data.folderId)}`, { cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setItems(current => current.map(row => row.id === item.id ? { ...row, data: { ...row.data, body: data.body, fullContent: true } } : row));
    } catch(error) { setError((error as Error).message); }
  };
  const records = folder === "incoming" ? items : items.filter(item => item.data.status !== "deleted").filter(item => folder === "drafts" ? item.kind === "draft" && item.data.status === "draft" : (item.kind === "outbox" && (folder === "sent" ? item.data.status === "sent" : item.data.status !== "sent")) || (folder === "outbox" && ((item.kind === "automation" && item.data.status !== "completed") || (item.kind === "draft" && item.data.status === "queued"))));
  const historical = folder === "sent" ? applications.flatMap(application => (application.communications || []).filter(record => ["sent", "delivered"].includes(record.status) && !items.some(item => item.id === record.id || item.data.deliveryId === record.id)).map(record => ({ id: record.id, updated_at: record.sentAt, data: { subject: record.subject, messageBody: record.bodySnippet, candidateId: application.id, recipient: record.recipient || application.email, status: record.status } }))) : [];
  const statusLabel = (value: string) => ({ draft:t("Draft", "Rascunho"), queued:t("Queued", "Em fila"), sending:t("Sending", "A enviar"), sent:t("Sent", "Enviado"), delivered:t("Delivered", "Entregue"), failed:t("Delivery failed", "Falha no envio"), skipped:t("Skipped · not sent", "Ignorado · não enviado"), needs_verification:t("Delivery outcome unconfirmed", "Resultado do envio por confirmar"), waiting_for_booking:t("Waiting for booking", "A aguardar agendamento"), needs_attention:t("Follow-up needs attention", "Seguimento requer atenção"), completed:t("Completed", "Concluído"), incoming:t("Received", "Recebido"), received:t("Received", "Recebido") }[value] || value);
  const recovered = folder === "sent" ? items.filter(item => !item.kind && item.data.fullContent) : [];
  const all: MessageRow[] = [...records.filter(row => row.kind), ...recovered, ...historical, ...(folder === "incoming" ? records : [])].sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{({ drafts: t("Drafts", "Rascunhos"), incoming: t("Incoming · info@overwatchmoz.com", "Recebidos · info@overwatchmoz.com"), sent: t("Sent mail", "Enviados"), outbox: t("Outbox & follow-ups", "Caixa de saída e seguimentos"), compose: "" })[folder]}</h2><button className="rounded-lg border px-3 py-2 text-xs" onClick={() => setRetry(n => n + 1)}>{t("Refresh", "Actualizar")}</button></div>
    {folder === "outbox" && items.some(item => ["outbox", "draft"].includes(item.kind || "") && item.data.status === "queued") && <button className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white" onClick={() => void resume()}>{t("Resume pending deliveries", "Retomar envios pendentes")}</button>}
    {folder === "outbox" && <div className="flex flex-wrap items-center gap-3 text-sm"><label><input type="checkbox" checked={selected.length > 0} onChange={event => setSelected(event.target.checked ? all.filter(item => ["outbox", "automation"].includes(item.kind || "") && ["queued", "failed", "skipped", "waiting_for_booking", "needs_attention"].includes(item.data.status)).map(item => item.id) : [])} /> {t("Select removable messages", "Seleccionar mensagens removíveis")}</label><button disabled={!selected.length} className="rounded-lg border border-red-200 px-3 py-2 text-red-700 disabled:opacity-40" onClick={() => void deleteSelected(selected)}>{t("Delete selected", "Apagar seleccionadas")} ({selected.length})</button><span className="text-xs text-slate-500">{t("Sending messages cannot be removed. Deleting pending mail cancels its delivery.", "Mensagens em envio não podem ser removidas. Apagar mensagens pendentes cancela o envio.")}</span></div>}
    {folder === "outbox" && <div role="status" className="rounded-lg bg-sky-50 p-3 text-sm">{t("Delivery batches: up to 5 emails at a time", "Lotes de envio: até 5 emails de cada vez")} · {items.filter(i => i.kind === "outbox" && i.data.status === "sent").length} {t("sent", "enviados")} · {items.filter(i => i.kind === "outbox" && i.data.status === "sending").length} {t("sending", "em envio")} · {items.filter(i => i.kind === "outbox" && i.data.status === "queued").length} {t("queued", "em fila")}</div>}
    {busy && <p role="status" className="text-sm text-slate-500">{t("Loading messages…", "A carregar mensagens…")}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!busy && folder === "incoming" && !connected && !error && <div className="space-y-2 rounded-xl bg-sky-50 p-4 text-sm text-sky-900"><p>{t("The Zoho mailbox connection is required to receive replies here.", "É necessário ligar a caixa Zoho para receber respostas aqui.")}</p><a href="https://mail.zoho.com" target="_blank" rel="noreferrer" className="font-semibold underline">{t("Open info@overwatchmoz.com in Zoho Mail", "Abrir info@overwatchmoz.com no Zoho Mail")}</a><p className="text-xs">{t("Outgoing emails still use the configured delivery service. Incoming messages are never simulated.", "Os envios usam o serviço configurado. As mensagens recebidas nunca são simuladas.")}</p></div>}
    {!busy && !all.length && !error && (folder !== "incoming" || connected) && <p className="py-6 text-center text-sm text-slate-500">{t("No messages in this folder.", "Sem mensagens nesta pasta.")}</p>}
    {all.map(item => <details key={item.id} onToggle={event => { if (event.currentTarget.open && !item.data.fullContent) { if (folder === "sent") void readSent(item); if (folder === "incoming") void readIncoming(item); } }} className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer">{folder === "outbox" && ["outbox", "automation"].includes(item.kind || "") && ["queued", "failed", "skipped", "waiting_for_booking", "needs_attention"].includes(item.data.status) && <input aria-label={t("Select message", "Seleccionar mensagem")} type="checkbox" className="mr-3" checked={selected.includes(item.id)} onClick={event => event.stopPropagation()} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />}<span className="text-sm font-semibold">{item.data.subject || (folder === "drafts" ? t("Untitled draft", "Rascunho sem assunto") : t("No subject", "Sem assunto"))}</span><span className="mt-1 block text-xs text-slate-500">{item.data.recipient || item.data.from || ""} · {new Date(item.updated_at).toLocaleString()} · {statusLabel(item.data.status)}</span></summary><div className="mt-4 space-y-3">{(item.data.htmlContent || (folder === "incoming" && item.data.fullContent && item.data.body)) ? <iframe title={item.data.subject || "Email"} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="h-[620px] w-full rounded-lg border bg-white" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://www.overwatchmoz.com data:;">${safeEmailDocument(item.data.htmlContent || item.data.body || "")}`} /> : <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700">{String(item.data.messageBody || item.data.body || t("Original content was not saved for this historical email.", "O conteúdo original deste email histórico não foi guardado.")).replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>/gi, "\n").replace(/<[^>]*>/g, "")}</pre>}{folder === "incoming" && !item.data.fullContent && <button className="text-xs font-semibold text-sky-700 underline" onClick={() => void readIncoming(item)}>{t("Read full message", "Ler mensagem completa")}</button>}{folder === "sent" && <button className="text-xs font-semibold text-sky-700 underline" onClick={() => void readSent(item)}>{t("Load original email & delivery tracking", "Carregar email original e rastreio")}</button>}{item.data.events && <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs"><p className="font-semibold">{t("Provider delivery history", "Histórico do fornecedor")}</p>{!item.data.events.length && <p>{t("No provider events are available for this message. Opens may be blocked or reported by privacy proxies.", "Sem eventos disponíveis. Aberturas podem ser bloqueadas ou registadas por proxies de privacidade.")}</p>}{item.data.events.map((event, index) => <p key={index}>{event.name} · {new Date(event.time).toLocaleString()}{event.link && <span className="block break-all">{event.link}</span>}</p>)}</div>}{folder === "outbox" && item.data.status === "failed" && /attachment is missing|^This applicant is no longer eligible for a booking invitation\.$/.test(item.data.error || "") && <button className="rounded-lg border px-3 py-2 text-xs font-semibold text-sky-700" onClick={() => void retryRejected(item.id)}>{t("Retry after eligibility check", "Repetir após verificar elegibilidade")}</button>}{item.data.error && <p className="text-xs text-red-700">{item.data.error}</p>}{["sending", "needs_verification"].includes(item.data.status) && <p className="text-xs text-amber-800">{t("Delivery is in progress or awaiting verification. Do not resend until the delivery outcome is confirmed.", "O envio está em curso ou aguarda verificação. Não repita sem confirmar o resultado.")}</p>}{folder === "drafts" && <button className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => { void onOpenDraft(item.id).catch(error => setError(error.message)); }}>{t("Continue editing", "Continuar a editar")}</button>}</div></details>)}
  </section>;
}
