"use client";
import { useEffect, useRef, useState } from "react";
import { Languages, Lock } from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { safeEmailDocument } from "@/lib/communication-content";
import { renderOfficialMail } from "@/lib/communication-renderer";
import type { Application } from "@/lib/careers";

type MessageRow = {
  id: string;
  kind?: string;
  updated_at: string;
  data: {
    status: string;
    subject?: string;
    recipient?: string;
    candidateName?: string;
    from?: string;
    messageBody?: string;
     message?: string;
    body?: string;
    htmlContent?: string;
    messageId?: string;
    folderId?: string;
    deliveryId?: string;
    campaignId?: string;
    fullContent?: boolean;
    candidateId?: string;
    roleId?: string;
    roleTitle?: string;
    locale?: "en" | "pt";
    includeBookingButton?: boolean;
    events?: { name: string; time: string; link?: string }[];
    error?: string;
  };
};

type TranslationResult = {
  subject: string;
  body: string;
  detectedLang: string;
  showOriginal?: boolean;
};

export type StudioFolder = "compose" | "drafts" | "incoming" | "sent" | "outbox" | "scheduled";
type MailboxProps = {
  scope: string;
  folder: StudioFolder;
  applications: Application[];
  onOpenDraft: (id: string) => Promise<void>;
  onOpenProgress?: (campaignId: string) => void;
};

function htmlToPlainText(raw: string): string {
  return String(raw || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function StudioMailbox(props: MailboxProps) {
  // A folder is a separate session: old rows, selections and late message reads
  // must never appear beneath the next folder's heading, even for one render.
  return <MailboxSession key={`${props.scope}:${props.folder}`} {...props} />;
}

function MailboxSession({ scope, folder, applications, onOpenDraft, onOpenProgress }: MailboxProps) {
  const { t } = useAdminLanguage();
  const [items, setItems] = useState<MessageRow[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [retry, setRetry] = useState(0),
    [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const loaded = useRef(false);
  const [action, setAction] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const actionLock = useRef(false),
    mounted = useRef(true),
    detailsAbort = useRef(new AbortController());
  const requestNumber = useRef(0),
    confirmation = useRef<HTMLDialogElement>(null);
  const reading = useRef(new Set<string>()),
    [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, TranslationResult>>({});
  const [translatingIds, setTranslatingIds] = useState<string[]>([]);

  useEffect(() => {
    mounted.current = true;
    detailsAbort.current = new AbortController();
    return () => {
      mounted.current = false;
      detailsAbort.current.abort();
    };
  }, []);

  useEffect(() => {
    if (confirmIds) confirmation.current?.showModal();
    else confirmation.current?.close();
  }, [confirmIds]);

  const runAction = async (name: string, operation: () => Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setAction(name);
    setError("");
    setNotice("");
    try {
      await operation();
    } catch (error) {
      if (mounted.current) setError((error as Error).message);
    } finally {
      actionLock.current = false;
      if (mounted.current) setAction(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const number = ++requestNumber.current;
    queueMicrotask(() => {
      if (!controller.signal.aborted && !loaded.current) setBusy(true);
    });
    const endpoint =
      folder === "incoming"
        ? "/api/admin/careers/mail/incoming"
        : `/api/admin/careers/mail?scope=${encodeURIComponent(scope)}`;
    fetch(endpoint, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
      cache: "no-store",
    })
      .then(async (response) => {
        const text = await response.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw Error(
            t(
              "Connection is temporarily refreshing. Please wait a moment or click Refresh.",
              "A ligação está a actualizar temporariamente. Aguarde um instante ou clique em Actualizar."
            )
          );
        }
        if (controller.signal.aborted || number !== requestNumber.current) return;
        if (!response.ok) throw Error(data.error);
        setItems(data.items || []);
        setConnected(Boolean(data.connected));
        setLoadError("");
        setNotice((current) =>
          current === t("Refreshing messages…", "A actualizar mensagens…")
            ? t("Messages updated.", "Mensagens actualizadas.")
            : current
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted && number === requestNumber.current) setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted && number === requestNumber.current) {
          loaded.current = true;
          setBusy(false);
        }
      });
    return () => controller.abort();
  }, [scope, folder, retry, t]);

  useEffect(() => {
    if ((folder !== "outbox" && folder !== "scheduled") || action || confirmIds) return;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setRetry((n) => n + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [folder, action, confirmIds]);

  const resume = async () => {
    setError("");
    const response = await fetch("/api/admin/careers/mail/process", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    if (mounted.current) {
      setRetry((n) => n + 1);
      setNotice(
        t(
          "Delivery processing requested. Progress updates below; messages already sending will not be sent again.",
          "Processamento solicitado. O progresso é actualizado abaixo; mensagens em envio não serão repetidas."
        )
      );
    }
  };

  const retryRejected = async (idOrIds: string | string[]) => {
    setError("");
    try {
      const body = Array.isArray(idOrIds)
        ? { action: "retry", scope, ids: idOrIds }
        : { action: "retry", scope, id: idOrIds };
      const response = await fetch("/api/admin/careers/mail", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      await resume();
      const targetIds = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const campaignId = items.find((i) => targetIds.includes(i.id) && i.data.campaignId)?.data.campaignId;
      if (campaignId && onOpenProgress) onOpenProgress(campaignId);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const deleteSelected = async (ids: string[]) => {
    ++requestNumber.current;
    setError("");
    try {
      const response = await fetch("/api/admin/careers/mail", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", scope, ids }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setSelected([]);
      setRetry((n) => n + 1);
      setItems((current) => current.filter((item) => !result.deleted?.includes(item.id)));
      setConfirmIds(null);
      setNotice(
        t(
          `${result.deleted?.length || 0} messages removed from Outbox. Pending deliveries were cancelled.`,
          `${result.deleted?.length || 0} mensagens removidas. Os envios pendentes foram cancelados.`
        )
      );
      if (result.blocked?.length)
        setError(
          t(
            "Some messages are being sent or changed. They were not deleted.",
            "Algumas mensagens estão em envio ou foram alteradas e não foram apagadas."
          )
        );
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const readSent = async (item: MessageRow) => {
    try {
      const response = await fetch(
        `/api/admin/careers/mail/message?${new URLSearchParams({
          id: item.id,
          scope,
          ...(item.data.candidateId ? { candidateId: item.data.candidateId } : {}),
        })}`,
        { cache: "no-store", signal: AbortSignal.any([detailsAbort.current.signal, AbortSignal.timeout(30000)]) }
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (!mounted.current || detailsAbort.current.signal.aborted) return;
      setItems((current) => {
        const found = current.find((row) => row.id === item.id);
        const updated = {
          ...item,
          data: {
            ...item.data,
            htmlContent: data.htmlContent || item.data.htmlContent,
            events: data.events,
            fullContent: true,
          },
        };
        return found ? current.map((row) => (row.id === item.id ? updated : row)) : [...current, updated];
      });
    } catch (error) {
      if (mounted.current && !detailsAbort.current.signal.aborted) setError((error as Error).message);
    }
  };

  const readIncoming = async (item: MessageRow): Promise<string> => {
    try {
      if (!item.data.messageId || !item.data.folderId) throw Error("Message details are unavailable");
      const response = await fetch(
        `/api/admin/careers/mail/incoming?messageId=${encodeURIComponent(item.data.messageId)}&folderId=${encodeURIComponent(item.data.folderId)}`,
        { cache: "no-store", signal: AbortSignal.any([detailsAbort.current.signal, AbortSignal.timeout(30000)]) }
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (!mounted.current || detailsAbort.current.signal.aborted) return item.data.body || "";
      const bodyText = data.body || item.data.body || "";
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, data: { ...row.data, body: bodyText, fullContent: true } } : row))
      );
      return bodyText;
    } catch (error) {
      if (mounted.current && !detailsAbort.current.signal.aborted) setError((error as Error).message);
      return item.data.body || "";
    }
  };

  const readWithFeedback = async (item: MessageRow) => {
    if (reading.current.has(item.id)) return;
    reading.current.add(item.id);
    setLoadingIds((current) => [...current, item.id]);
    try {
      if (folder === "incoming") await readIncoming(item);
      else await readSent(item);
    } finally {
      reading.current.delete(item.id);
      if (mounted.current) setLoadingIds((current) => current.filter((id) => id !== item.id));
    }
  };

  const translateIncomingItem = async (item: MessageRow) => {
    if (translatingIds.includes(item.id)) return;
    setTranslatingIds((prev) => [...prev, item.id]);
    setError("");
    try {
      let rawBody = item.data.body || item.data.messageBody || "";
      if (folder === "incoming" && !item.data.fullContent && item.data.messageId && item.data.folderId) {
        rawBody = await readIncoming(item);
      }
      const plainBody = htmlToPlainText(rawBody);
      const response = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: item.data.subject || "",
          text: plainBody,
          from: "auto",
          to: "en",
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Translation failed");
      if (mounted.current) {
        setTranslations((prev) => ({
          ...prev,
          [item.id]: {
            subject: data.translatedSubject || item.data.subject || "",
            body: data.translated || plainBody,
            detectedLang: (data.detectedLang || "pt").toUpperCase(),
            showOriginal: false,
          },
        }));
      }
    } catch (err) {
      if (mounted.current) setError((err as Error).message);
    } finally {
      if (mounted.current) setTranslatingIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const records =
    folder === "incoming"
      ? items.filter(
          (item) =>
            !item.kind && ["received", "incoming"].includes(item.data.status) && item.data.messageId && item.data.folderId
        )
      : items
          .filter((item) => item.data.status !== "deleted")
          .filter((item) =>
            folder === "drafts"
              ? item.kind === "draft" && item.data.status === "draft"
              : folder === "scheduled"
                ? item.kind === "automation"
                : folder === "sent"
                  ? item.kind === "outbox" && item.data.status === "sent"
                  : folder === "outbox"
                    ? (item.kind === "outbox" && item.data.status !== "sent") ||
                      (item.kind === "draft" && item.data.status === "queued")
                    : false
          );

  const historical =
    folder === "sent"
      ? applications.flatMap((application) =>
          (application.communications || [])
            .filter(
              (record) =>
                ["sent", "delivered"].includes(record.status) &&
                !items.some((item) => item.id === record.id || item.data.deliveryId === record.id)
            )
            .map((record) => ({
              id: record.id,
              updated_at: record.sentAt,
              data: {
                subject: record.subject,
                messageBody: record.bodySnippet,
                candidateId: application.id,
                recipient: record.recipient || application.email,
                status: record.status,
              },
            }))
        )
      : [];

  const statusLabel = (value: string) =>
    ({
      draft: t("Draft", "Rascunho"),
      queued: t("Queued", "Em fila"),
      sending: t("Sending", "A enviar"),
      sent: t("Sent", "Enviado"),
      delivered: t("Delivered", "Entregue"),
      failed: t("Delivery failed", "Falha no envio"),
      skipped: t("Skipped · not sent", "Ignorado · não enviado"),
      needs_verification: t("Delivery outcome unconfirmed", "Resultado do envio por confirmar"),
      waiting_for_booking: t("Waiting for booking (0 booked yet)", "A aguardar agendamento"),
      needs_attention: t("Follow-up needs attention", "Seguimento requer atenção"),
      completed: t("Completed · Sent after booking", "Concluído · Enviado após agendamento"),
      incoming: t("Received", "Recebido"),
      received: t("Received", "Recebido"),
    })[value] || value;

  const recovered = folder === "sent" ? items.filter((item) => !item.kind && item.data.fullContent) : [];
  const all: MessageRow[] = [
    ...records.filter((row) => row.kind),
    ...recovered,
    ...historical,
    ...(folder === "incoming" ? records : []),
  ].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

  const removableIds = all
    .filter(
      (item) =>
        (item.kind === "outbox" && ["queued", "failed", "skipped"].includes(item.data.status)) ||
        (item.kind === "draft" && item.data.status === "queued")
    )
    .map((item) => item.id);
  const selectedIds = selected.filter((id) => removableIds.includes(id));

  const failedOutboxIds = all
    .filter((item) => item.kind === "outbox" && ["failed", "skipped"].includes(item.data.status))
    .map((item) => item.id);
  const selectedFailedIds = selected.filter((id) => failedOutboxIds.includes(id));
  const activeCampaignId = items.find(
    (item) => item.kind === "outbox" && ["queued", "sending", "failed"].includes(item.data.status) && item.data.campaignId
  )?.data.campaignId;
  const primaryRows = folder === "scheduled" ? [] : all;
  const scheduledRows = folder === "scheduled" ? all : [];

  return (
    <section aria-busy={busy || Boolean(action)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="sticky top-[calc(var(--workspace-sticky-top,48px)+60px)] z-10 -mx-5 -mt-5 rounded-t-2xl border-b border-slate-100 bg-white/95 backdrop-blur-md px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {
            ({
              drafts: t("Drafts", "Rascunhos"),
              incoming: t("Incoming · info@overwatchmoz.com", "Recebidos · info@overwatchmoz.com"),
              sent: t("Sent mail", "Enviados"),
              outbox: t("Outbox", "Caixa de saída"),
              scheduled: t("Scheduled Post-Booking Auto Follow-Ups", "Seguimentos Automáticos Pós-Agendamento"),
              compose: "",
            })[folder]
          }
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {folder === "incoming" && primaryRows.length > 0 && (
            <button
              type="button"
              disabled={busy || translatingIds.length > 0}
              onClick={() => {
                void (async () => {
                  for (const row of primaryRows) {
                    if (!translations[row.id]) {
                      await translateIncomingItem(row);
                    }
                  }
                })();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Languages size={14} />
              <span>
                {translatingIds.length > 0
                  ? t("Translating to English…", "A traduzir para Inglês…")
                  : t("Translate All to English (PT → EN)", "Traduzir Tudo para Inglês (PT → EN)")}
              </span>
            </button>
          )}
          {folder === "outbox" && activeCampaignId && onOpenProgress && (
            <button
              type="button"
              onClick={() => onOpenProgress(activeCampaignId)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {t("Open Live Dispatch Feed", "Abrir Painel de Envio em Tempo Real")}
            </button>
          )}
          <button
            disabled={busy || Boolean(action)}
            className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50"
            onClick={() => {
              setNotice(t("Refreshing messages…", "A actualizar mensagens…"));
              setBusy(true);
              setRetry((n) => n + 1);
            }}
          >
            {busy ? t("Refreshing…", "A actualizar…") : t("Refresh", "Actualizar")}
          </button>
        </div>
      </div>

      {folder === "outbox" &&
        (items.some((item) => ["outbox", "draft"].includes(item.kind || "") && item.data.status === "queued") ||
          failedOutboxIds.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {items.some((item) => ["outbox", "draft"].includes(item.kind || "") && item.data.status === "queued") && (
              <button
                className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                disabled={Boolean(action)}
                onClick={() => void runAction("resume", resume)}
              >
                {action === "resume"
                  ? t("Starting delivery processing…", "A iniciar processamento…")
                  : t("Resume pending deliveries", "Retomar envios pendentes")}
              </button>
            )}
            {failedOutboxIds.length > 0 && (
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                disabled={Boolean(action)}
                onClick={() => void runAction("retry-all", () => retryRejected(failedOutboxIds))}
              >
                {action === "retry-all"
                  ? t("Retrying all failed…", "A repetir todas as falhas…")
                  : t(`Retry all failed (${failedOutboxIds.length})`, `Repetir todas as falhas (${failedOutboxIds.length})`)}
              </button>
            )}
            {selectedFailedIds.length > 0 && selectedFailedIds.length < failedOutboxIds.length && (
              <button
                type="button"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                disabled={Boolean(action)}
                onClick={() => void runAction("retry-selected", () => retryRejected(selectedFailedIds))}
              >
                {action === "retry-selected"
                  ? t("Retrying selected…", "A repetir seleccionadas…")
                  : t(`Retry selected (${selectedFailedIds.length})`, `Repetir seleccionadas (${selectedFailedIds.length})`)}
              </button>
            )}
          </div>
        )}

      {folder === "outbox" && removableIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label>
            <input
              type="checkbox"
              disabled={Boolean(action) || !removableIds.length}
              ref={(element) => {
                if (element) element.indeterminate = selectedIds.length > 0 && selectedIds.length < removableIds.length;
              }}
              checked={removableIds.length > 0 && selectedIds.length === removableIds.length}
              onChange={(event) => setSelected(event.target.checked ? removableIds : [])}
            />{" "}
            {t("Select removable messages", "Seleccionar mensagens removíveis")}
          </label>
          <button
            disabled={!selectedIds.length || Boolean(action) || busy}
            className="rounded-lg border border-red-200 px-3 py-2 text-red-700 disabled:opacity-40"
            onClick={() => {
              setError("");
              setConfirmIds([...selectedIds]);
            }}
          >
            {t("Delete selected", "Apagar seleccionadas")} ({selectedIds.length})
          </button>
          <span className="text-xs text-slate-500">
            {t(
              "Sending messages cannot be removed. Deleting pending mail cancels its delivery.",
              "Mensagens em envio não podem ser removidas. Apagar mensagens pendentes cancela o envio."
            )}
          </span>
        </div>
      )}

      {folder === "outbox" && (
        <div role="status" className="rounded-lg bg-sky-50 p-3 text-sm">
          {t("Delivery batches: up to 5 emails at a time", "Lotes de envio: até 5 emails de cada vez")} ·{" "}
          {items.filter((i) => i.kind === "outbox" && i.data.status === "sent").length} {t("sent", "enviados")} ·{" "}
          {items.filter((i) => i.kind === "outbox" && i.data.status === "sending").length} {t("sending", "em envio")} ·{" "}
          {items.filter((i) => i.kind === "outbox" && i.data.status === "queued").length} {t("queued", "em fila")} ·{" "}
          {items.filter((i) => i.kind === "outbox" && ["failed", "skipped"].includes(i.data.status)).length}{" "}
          {t("failed", "falharam")}
        </div>
      )}

      {folder === "scheduled" && (
        <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-950 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-sm flex items-center gap-1.5">
              <Lock size={14} className="text-indigo-700" />
              {t(
                `${scheduledRows.filter((i) => i.data.status === "waiting_for_booking").length} waiting for candidate to book · ${scheduledRows.filter((i) => i.data.status === "completed").length} triggered & sent`,
                `${scheduledRows.filter((i) => i.data.status === "waiting_for_booking").length} a aguardar agendamento · ${scheduledRows.filter((i) => i.data.status === "completed").length} enviados após agendamento`
              )}
            </span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
              {t("Automated · Strictly Read-Only", "Automático · Apenas Leitura")}
            </span>
          </div>
          <p className="text-indigo-900/85 leading-relaxed">
            {t(
              "Each scheduled rule below was armed when a candidate's test invitation was delivered. As soon as a candidate selects and confirms their test date on their booking link, the system automatically dispatches their personalized follow-up email. These automated rules are locked and cannot be deleted or modified.",
              "Cada regra abaixo foi activada no envio do convite para teste. Assim que o candidato escolher e confirmar a data no link de agendamento, o sistema envia automaticamente o email de seguimento. Estas regras automáticas estão bloqueadas (apenas leitura)."
            )}
          </p>
        </div>
      )}

      <dialog
        ref={confirmation}
        aria-labelledby="delete-mail-title"
        aria-describedby="delete-mail-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!action) setConfirmIds(null);
        }}
        className="fixed inset-0 m-auto w-[min(92vw,440px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/50"
      >
        <h2 id="delete-mail-title" className="text-lg font-semibold">
          {t("Delete selected Outbox messages?", "Apagar mensagens seleccionadas?")}
        </h2>
        <p id="delete-mail-description" className="mt-3 text-sm text-slate-600">
          {t(
            `${confirmIds?.length || 0} messages will be removed and their pending deliveries cancelled. Messages already sending cannot be deleted.`,
            `${confirmIds?.length || 0} mensagens serão removidas e os envios pendentes cancelados. Mensagens em envio não podem ser apagadas.`
          )}
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            disabled={Boolean(action)}
            onClick={() => setConfirmIds(null)}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            {t("Cancel", "Cancelar")}
          </button>
          <button
            type="button"
            disabled={Boolean(action)}
            aria-busy={action === "delete"}
            onClick={() => void runAction("delete", () => deleteSelected(confirmIds || []))}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {action === "delete"
              ? t("Deleting…", "A apagar…")
              : t("Delete & cancel deliveries", "Apagar e cancelar envios")}
          </button>
        </div>
      </dialog>

      {action && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-700" />
          {t("Processing your request…", "A processar o seu pedido…")}
        </p>
      )}
      {notice && !action && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-slate-500">
          {t("Loading messages…", "A carregar mensagens…")}
        </p>
      )}
      {(error || loadError) && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error || loadError}
        </p>
      )}
      {!busy && folder === "incoming" && !connected && !error && !loadError && (
        <div className="space-y-2 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
          <p>
            {t(
              "The Zoho mailbox connection is required to receive replies here.",
              "É necessário ligar a caixa Zoho para receber respostas aqui."
            )}
          </p>
          <a href="https://mail.zoho.com" target="_blank" rel="noreferrer" className="font-semibold underline">
            {t("Open info@overwatchmoz.com in Zoho Mail", "Abrir info@overwatchmoz.com no Zoho Mail")}
          </a>
          <p className="text-xs">
            {t(
              "Outgoing emails still use the configured delivery service. Incoming messages are never simulated.",
              "Os envios usam o serviço configurado. As mensagens recebidas nunca são simuladas."
            )}
          </p>
        </div>
      )}
      {!busy &&
        folder !== "scheduled" &&
        !primaryRows.length &&
        !error &&
        !loadError &&
        (folder !== "incoming" || connected) && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center text-sm text-emerald-900">
            {folder === "outbox"
              ? t(
                  "Outbox is clear — no pending or failed emails. All dispatched emails are in your Sent folder.",
                  "A caixa de saída está limpa — sem emails pendentes ou com falha. Todos os emails enviados encontram-se na pasta Enviados."
                )
              : t("No messages in this folder.", "Sem mensagens nesta pasta.")}
          </div>
        )}

      {!busy && folder === "scheduled" && !scheduledRows.length && !error && !loadError && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
          {t(
            "No scheduled post-booking auto follow-ups in this cycle.",
            "Sem seguimentos automáticos agendados neste lote."
          )}
        </div>
      )}

      {folder === "scheduled" &&
        scheduledRows.map((item) => {
          const matchedCandidate = applications.find(
            (a) =>
              a.id === item.data.candidateId ||
              (item.data.recipient && a.email.trim().toLowerCase() === item.data.recipient.trim().toLowerCase())
          );
          const previewCandidate: Application = matchedCandidate || {
            id: item.data.candidateId || "preview",
            name: item.data.candidateName || item.data.recipient || "Candidato(a)",
            email: item.data.recipient || "candidato@exemplo.com",
            whatsapp: "+258 84 000 0000",
            role: item.data.roleId || "cctv_technical_manager",
            locale: item.data.locale || "pt",
            status: "test_invited",
            createdAt: item.updated_at || new Date().toISOString(),
            cvName: "cv.pdf",
            cvSize: 1024,
            cvType: "application/pdf",
          };
          const scheduledHtml =
            item.data.htmlContent ||
            renderOfficialMail({
              candidate: previewCandidate,
              subject: item.data.subject || "",
              message: item.data.message || item.data.messageBody || "",
              roleTitle: item.data.roleTitle || previewCandidate.role,
              locale: item.data.locale || "pt",
              includeBookingButton: false,
            }).html;
          return (
            <details key={item.id} className="rounded-xl border border-indigo-200/80 bg-white p-4 select-none">
              <summary className="cursor-pointer">
                <div className="inline-flex flex-wrap items-center justify-between gap-2 w-[calc(100%-1.5rem)] align-middle">
                  <div>
                    <div className="inline-flex flex-wrap items-center gap-2 font-semibold text-sm text-slate-900">
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                        <Lock size={10} />
                        {t("Auto Follow-Up · Read-Only", "Seguimento Automático · Bloqueado")}
                      </span>
                      <span>{item.data.subject || t("Follow-up message", "Mensagem de seguimento")}</span>
                    </div>
                    <span className="mt-1 block text-xs text-slate-500">
                      {matchedCandidate ? `${matchedCandidate.name} (${item.data.recipient})` : item.data.recipient} ·{" "}
                      {t("Armed at", "Activado às")} {new Date(item.updated_at).toLocaleString()} ·{" "}
                      <strong className="text-indigo-800">{statusLabel(item.data.status)}</strong>
                    </span>
                  </div>
                </div>
              </summary>
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700 space-y-3">
                <p className="text-[11px] font-semibold text-indigo-800">
                  {t(
                    "Trigger: Automatically dispatches immediately when candidate confirms a test slot.",
                    "Gatilho: Envia automaticamente assim que o candidato confirmar uma vaga de teste."
                  )}
                </p>
                <iframe
                  title={item.data.subject || "Follow-up Email"}
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="no-referrer"
                  className="h-[620px] w-full rounded-lg border bg-white"
                  srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://www.overwatchmoz.com data:;"><style>body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1e293b;}</style>${safeEmailDocument(
                    scheduledHtml
                  )}`}
                />
              </div>
            </details>
          );
        })}

      {primaryRows.map((item) => {
        const translation = translations[item.id];
        const isTranslating = translatingIds.includes(item.id);
        return (
          <details
            key={item.id}
            onToggle={(event) => {
              if (event.currentTarget.open && !item.data.fullContent) {
                if (
                  folder === "incoming" ||
                  (folder === "sent" && !item.data.htmlContent && !item.data.messageBody && !item.data.message)
                ) {
                  void readWithFeedback(item);
                }
              }
            }}
            className="rounded-xl border border-slate-200 p-4"
          >
            <summary className="cursor-pointer">
              <div className="inline-flex flex-wrap items-center justify-between gap-2 w-[calc(100%-1.5rem)] align-middle">
                <div>
                  {folder === "outbox" &&
                    ((item.kind === "outbox" && ["queued", "failed", "skipped"].includes(item.data.status)) ||
                      (item.kind === "draft" && item.data.status === "queued")) && (
                      <input
                        aria-label={t("Select message", "Seleccionar mensagem")}
                        type="checkbox"
                        disabled={Boolean(action)}
                        className="mr-3"
                        checked={selected.includes(item.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)
                          )
                        }
                      />
                    )}
                  <span className="text-sm font-semibold">
                    {item.kind === "draft" && folder === "outbox" && (
                      <span className="mr-2 rounded bg-sky-50 px-2 py-1 text-xs text-sky-800">
                        {t("Campaign queue", "Fila da campanha")}
                      </span>
                    )}
                    {translation && !translation.showOriginal
                      ? translation.subject || item.data.subject
                      : item.data.subject ||
                        (folder === "drafts"
                          ? t("Untitled draft", "Rascunho sem assunto")
                          : t("No subject", "Sem assunto"))}
                    {translation && (
                      <span className="ml-2 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {t(`Translated (${translation.detectedLang} → EN)`, `Traduzido (${translation.detectedLang} → EN)`)}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.data.candidateName
                      ? `${item.data.candidateName} (${item.data.recipient || ""})`
                      : item.data.recipient || item.data.from || ""}{" "}
                    · {new Date(item.updated_at).toLocaleString()} · {statusLabel(item.data.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {folder === "incoming" && (
                    <button
                      type="button"
                      disabled={isTranslating}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (translation) {
                          setTranslations((prev) => ({
                            ...prev,
                            [item.id]: { ...translation, showOriginal: !translation.showOriginal },
                          }));
                        } else {
                          void translateIncomingItem(item);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      <Languages size={13} />
                      <span>
                        {isTranslating
                          ? t("Translating…", "A traduzir…")
                          : translation
                            ? translation.showOriginal
                              ? t("Show English Translation", "Ver Tradução em Inglês")
                              : t("Show Original (PT)", "Ver Original (PT)")
                            : t("Translate to English", "Traduzir para Inglês")}
                      </span>
                    </button>
                  )}
                  {folder === "outbox" && item.kind === "outbox" && ["failed", "skipped"].includes(item.data.status) && (
                    <button
                      type="button"
                      disabled={Boolean(action)}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void runAction(`retry:${item.id}`, () => retryRejected(item.id));
                      }}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                    >
                      {action === `retry:${item.id}`
                        ? t("Retrying…", "A repetir…")
                        : t("Retry", "Repetir envio")}
                    </button>
                  )}
                </div>
              </div>
            </summary>
            <div className="mt-4 space-y-3">
              {loadingIds.includes(item.id) && (
                <p role="status" className="text-sm text-sky-700">
                  {t("Loading original message…", "A carregar mensagem original…")}
                </p>
              )}
              {folder === "incoming" && translation && !translation.showOriginal && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/70 pb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                      <Languages size={14} className="text-indigo-700" />
                      {t(
                        `English Translation (Detected: ${translation.detectedLang})`,
                        `Tradução para Inglês (Detectado: ${translation.detectedLang})`
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTranslations((prev) => ({
                          ...prev,
                          [item.id]: { ...translation, showOriginal: true },
                        }))
                      }
                      className="text-xs font-semibold text-indigo-700 underline"
                    >
                      {t("View original message", "Ver mensagem original")}
                    </button>
                  </div>
                  {translation.subject && (
                    <p className="text-xs font-semibold text-slate-900">
                      {t("Subject:", "Assunto:")} {translation.subject}
                    </p>
                  )}
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-800 leading-relaxed">
                    {translation.body}
                  </pre>
                </div>
              )}
              {item.data.htmlContent ||
              (folder === "incoming" && item.data.fullContent && item.data.body) ||
              (folder !== "incoming" && Boolean(item.data.messageBody || item.data.message)) ? (
                <iframe
                  title={item.data.subject || "Email"}
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="no-referrer"
                  className="h-[620px] w-full rounded-lg border bg-white"
                  srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://www.overwatchmoz.com data:;"><style>body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1e293b;}</style>${safeEmailDocument(
                    item.data.htmlContent ||
                      (folder === "incoming"
                        ? item.data.body || ""
                        : renderOfficialMail({
                            candidate:
                              applications.find(
                                (a) =>
                                  a.id === item.data.candidateId ||
                                  (item.data.recipient &&
                                    a.email.trim().toLowerCase() === item.data.recipient.trim().toLowerCase())
                              ) || {
                                id: item.data.candidateId || "preview",
                                name: item.data.candidateName || item.data.recipient || "Candidato(a)",
                                email: item.data.recipient || "candidato@exemplo.com",
                                whatsapp: "+258 84 000 0000",
                                role: item.data.roleId || "cctv_technical_manager",
                                locale: item.data.locale || "pt",
                                status: "test_invited",
                                createdAt: item.updated_at || new Date().toISOString(),
                                cvName: "cv.pdf",
                                cvSize: 1024,
                                cvType: "application/pdf",
                              },
                            subject: item.data.subject || "",
                            message: item.data.messageBody || item.data.message || "",
                            roleTitle: item.data.roleTitle || item.data.roleId || "Overwatch",
                            locale: item.data.locale || "pt",
                            includeBookingButton: Boolean(item.data.includeBookingButton),
                          }).html)
                  )}`}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700">
                  {String(
                    item.data.messageBody ||
                      item.data.body ||
                      t(
                        "Original content was not saved for this historical email.",
                        "O conteúdo original deste email histórico não foi guardado."
                      )
                  )
                    .replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>/gi, "\n")
                    .replace(/<[^>]*>/g, "")}
                </pre>
              )}
              {folder === "incoming" && (
                <div className="flex flex-wrap items-center gap-3">
                  {!item.data.fullContent && (
                    <button
                      className="text-xs font-semibold text-sky-700 underline"
                      disabled={loadingIds.includes(item.id)}
                      onClick={() => void readWithFeedback(item)}
                    >
                      {loadingIds.includes(item.id)
                        ? t("Loading…", "A carregar…")
                        : t("Read full message", "Ler mensagem completa")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 underline"
                    disabled={isTranslating}
                    onClick={() => void translateIncomingItem(item)}
                  >
                    <Languages size={13} />
                    {isTranslating
                      ? t("Translating to English…", "A traduzir para Inglês…")
                      : translation
                        ? t("Re-translate to English", "Traduzir novamente para Inglês")
                        : t("Translate message to English", "Traduzir mensagem para Inglês")}
                  </button>
                </div>
              )}
              {folder === "sent" && (
                <button
                  className="text-xs font-semibold text-sky-700 underline"
                  disabled={loadingIds.includes(item.id)}
                  onClick={() => void readWithFeedback(item)}
                >
                  {loadingIds.includes(item.id)
                    ? t("Loading…", "A carregar…")
                    : t("Load original email & delivery tracking", "Carregar email original e rastreio")}
                </button>
              )}
              {item.data.events && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="font-semibold">{t("Provider delivery history", "Histórico do fornecedor")}</p>
                  {!item.data.events.length && (
                    <p>
                      {t(
                        "No provider events are available for this message. Opens may be blocked or reported by privacy proxies.",
                        "Sem eventos disponíveis. Aberturas podem ser bloqueadas ou registadas por proxies de privacidade."
                      )}
                    </p>
                  )}
                  {item.data.events.map((event, index) => (
                    <p key={index}>
                      {event.name} · {new Date(event.time).toLocaleString()}
                      {event.link && <span className="block break-all">{event.link}</span>}
                    </p>
                  ))}
                </div>
              )}
              {folder === "outbox" && item.kind === "outbox" && ["failed", "skipped"].includes(item.data.status) && (
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-sky-700"
                  disabled={Boolean(action)}
                  onClick={() => void runAction(`retry:${item.id}`, () => retryRejected(item.id))}
                >
                  {action === `retry:${item.id}`
                    ? t("Checking & queuing…", "A verificar e enfileirar…")
                    : t("Retry delivery", "Repetir envio")}
                </button>
              )}
              {item.data.error && <p className="text-xs text-red-700">{item.data.error}</p>}
              {["sending", "needs_verification"].includes(item.data.status) && (
                <p className="text-xs text-amber-800">
                  {t(
                    "Delivery is in progress or awaiting verification. Do not resend until the delivery outcome is confirmed.",
                    "O envio está em curso ou aguarda verificação. Não repita sem confirmar o resultado."
                  )}
                </p>
              )}
              {folder === "drafts" && (
                <button
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                  disabled={Boolean(action)}
                  onClick={() => void runAction(`draft:${item.id}`, () => onOpenDraft(item.id))}
                >
                  {action === `draft:${item.id}`
                    ? t("Opening draft…", "A abrir rascunho…")
                    : t("Continue editing", "Continuar a editar")}
                </button>
              )}
            </div>
          </details>
        );
      })}
    </section>
  );
}
