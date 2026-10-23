"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Send, Clock, XCircle } from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import type { Application } from "@/lib/careers";

type OutboxItem = {
  id: string;
  kind: string;
  updated_at: string;
  data: {
    campaignId?: string;
    candidateId?: string;
    candidateName?: string;
    recipient?: string;
    subject?: string;
    status: string;
    sentAt?: string;
    error?: string;
  };
};

export function DeliveryProgress({
  scope,
  campaignId,
  applications = [],
  onClose,
  onViewSent,
  onComplete,
}: {
  scope: string;
  campaignId: string;
  applications?: Application[];
  onClose: () => void;
  onViewSent?: () => void;
  onComplete?: () => void;
}) {
  const { t } = useAdminLanguage();
  const [rows, setRows] = useState<OutboxItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, sent: 0, sending: 0, failed: 0, skipped: 0, queued: 0 });
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const completedRef = useRef(false);
  const lastProgressAt = useRef(Date.now());
  const lastProcessedCount = useRef(-1);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const update = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch(`/api/admin/careers/mail?scope=${encodeURIComponent(scope)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        const matching: OutboxItem[] = (data.items || []).filter(
          (item: OutboxItem) =>
            item.kind === "outbox" &&
            (campaignId === "all" ? item.data.status !== "deleted" : item.data.campaignId === campaignId),
        );
        const count = (status: string) => matching.filter((item) => item.data.status === status).length;
        const nextCounts = {
          total: matching.length,
          sent: count("sent"),
          sending: count("sending"),
          failed: count("failed"),
          skipped: count("skipped") + count("deleted"),
          queued: count("queued"),
        };
        setRows(matching);
        setCounts(nextCounts);
        setError("");

        const processed = nextCounts.sent + nextCounts.failed + nextCounts.skipped;
        if (processed !== lastProcessedCount.current || nextCounts.sending > 0) {
          lastProcessedCount.current = processed;
          lastProgressAt.current = Date.now();
        } else if (nextCounts.queued > 0 && nextCounts.sending === 0 && Date.now() - lastProgressAt.current > 4500) {
          lastProgressAt.current = Date.now();
          void fetch("/api/admin/careers/mail/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scope }),
            signal: controller.signal,
          }).catch(() => {});
        }

        if (nextCounts.total > 0 && nextCounts.queued === 0 && nextCounts.sending === 0) {
          if (!completedRef.current) {
            completedRef.current = true;
            window.dispatchEvent(new Event("admin:careers-updated"));
            onCompleteRef.current?.();
          }
        } else {
          completedRef.current = false;
        }
      } catch (err) {
        if (!controller.signal.aborted) setError((err as Error).message);
      } finally {
        running = false;
      }
    };
    void update();
    const timer = setInterval(() => void update(), 1200);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [scope, campaignId]);

  const handleRetryFailed = async (ids: string[]) => {
    if (!ids.length || retrying) return;
    setRetrying(true);
    setError("");
    try {
      const res = await fetch("/api/admin/careers/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", scope, ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retry");
      completedRef.current = false;
      lastProgressAt.current = Date.now();
      await fetch("/api/admin/careers/mail/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRetrying(false);
    }
  };

  const finished = counts.total > 0 && !counts.queued && !counts.sending;
  const allSuccess = finished && counts.failed === 0 && counts.sent > 0;
  const processed = counts.sent + counts.failed + counts.skipped;
  const percent = counts.total > 0 ? Math.min(100, Math.round((processed / counts.total) * 100)) : 0;
  const failedIds = rows.filter((r) => r.data.status === "failed" || r.data.status === "skipped").map((r) => r.id);

  const nameByCandidateId = new Map(applications.map((a) => [a.id, a.name]));
  const orderedFeed = [...rows].sort((a, b) => {
    const rank = (s: string) => (s === "sending" ? 0 : s === "failed" ? 1 : s === "sent" ? 2 : s === "queued" ? 3 : 4);
    const diff = rank(a.data.status) - rank(b.data.status);
    if (diff !== 0) return diff;
    return String(b.data.sentAt || b.updated_at).localeCompare(String(a.data.sentAt || a.updated_at));
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Email delivery progress", "Progresso do envio")}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0a1128] text-white px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {finished ? (
              allSuccess ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                  <AlertCircle size={20} />
                </div>
              )
            ) : (
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
                <RefreshCw size={18} className="animate-spin" />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {finished
                  ? allSuccess
                    ? t("All Emails Sent Successfully!", "Todos os Emails Enviados com Sucesso!")
                    : t("Delivery Processing Complete", "Processamento de Envio Concluído")
                  : t("Live Email Dispatch Feed", "Transmissão de Emails em Tempo Real")}
              </h2>
              <p className="text-xs text-slate-300">
                {finished
                  ? t(
                      `${counts.sent} of ${counts.total} emails delivered to provider.`,
                      `${counts.sent} de ${counts.total} emails entregues ao servidor de envio.`,
                    )
                  : t(
                      "Dispatching in safe batches of up to 5 emails at a time. Live status updates below.",
                      "A enviar em lotes seguros de até 5 emails de cada vez. Acompanhe o estado em tempo real abaixo.",
                    )}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 border border-white/15 shrink-0">
            {counts.sent}/{counts.total} ({percent}%)
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Completion Banner */}
          {finished && (
            <div
              role="status"
              className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                allSuccess
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-amber-50 border-amber-200 text-amber-950"
              }`}
            >
              <div className="flex items-start gap-3">
                {allSuccess ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm">
                    {allSuccess
                      ? t(
                          `All ${counts.sent} official email(s) sent successfully!`,
                          `Todos os ${counts.sent} email(s) oficiais foram enviados com sucesso!`,
                        )
                      : t(
                          `${counts.sent} sent successfully · ${counts.failed} failed · ${counts.skipped} skipped`,
                          `${counts.sent} enviados com sucesso · ${counts.failed} falharam · ${counts.skipped} ignorados`,
                        )}
                  </p>
                  <p className="opacity-85">
                    {allSuccess
                      ? t(
                          "Every targeted candidate has been updated and logged in Sent mail.",
                          "Todos os candidatos destinatários foram atualizados e registados em Enviados.",
                        )
                      : t(
                          "You can retry the failed deliveries below right now without resending to candidates who already received the email.",
                          "Pode repetir agora apenas os envios que falharam sem reenviar para quem já recebeu o email.",
                        )}
                  </p>
                </div>
              </div>
              {failedIds.length > 0 && (
                <button
                  type="button"
                  disabled={retrying}
                  onClick={() => void handleRetryFailed(failedIds)}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {retrying
                    ? t("Retrying…", "A repetir…")
                    : t(`Retry Failed (${failedIds.length})`, `Repetir Falhas (${failedIds.length})`)}
                </button>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>
                {finished
                  ? t("Dispatch Complete", "Despacho Concluído")
                  : counts.sending > 0
                    ? t(`Currently dispatching ${counts.sending} email(s)…`, `A despachar ${counts.sending} email(s) neste momento…`)
                    : t("Preparing next batch…", "A preparar próximo lote…")}
              </span>
              <span className="font-mono">
                {processed} / {counts.total} ({percent}%)
              </span>
            </div>
            <progress className="sr-only" max={counts.total || 1} value={processed} />
            <div className="h-3 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  allSuccess ? "bg-emerald-600" : counts.failed > 0 && finished ? "bg-amber-500" : "bg-sky-600"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Numeric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                {t("Sent", "Enviados")}
              </span>
              <span className="text-lg font-bold font-mono text-emerald-900">
                {counts.sent}/{counts.total}
              </span>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                {t("Sending", "Em envio")}
              </span>
              <span className="text-lg font-bold font-mono text-sky-900">{counts.sending}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                {t("Queued", "Em fila")}
              </span>
              <span className="text-lg font-bold font-mono text-slate-900">{counts.queued}</span>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                {t("Failed", "Falhas")}
              </span>
              <span className="text-lg font-bold font-mono text-rose-900">{counts.failed}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {t("Skipped / cancelled", "Ignorados / cancelados")}
              </span>
              <span className="text-lg font-bold font-mono text-slate-700">{counts.skipped}</span>
            </div>
          </div>

          {/* Live Recipient Feed List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                {t("Live Recipient Feed", "Registo de Destinatários em Tempo Real")} ({orderedFeed.length})
              </span>
              <span className="text-[11px] text-slate-500">
                {t("Updates automatically", "Atualiza automaticamente")}
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {orderedFeed.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500">
                  {t("Initializing dispatch queue…", "A inicializar fila de envio…")}
                </p>
              ) : (
                orderedFeed.map((item) => {
                  const candidateName =
                    item.data.candidateName ||
                    (item.data.candidateId ? nameByCandidateId.get(item.data.candidateId) : undefined) ||
                    item.data.recipient ||
                    "Candidate";
                  const st = item.data.status;
                  return (
                    <div key={item.id} className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{candidateName}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">{item.data.recipient}</div>
                        {item.data.error && (
                          <div className="text-[11px] text-rose-600 mt-0.5">{item.data.error}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {st === "sending" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px]">
                            <RefreshCw size={11} className="animate-spin" />
                            {t("Sending…", "A enviar…")}
                          </span>
                        )}
                        {st === "sent" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <CheckCircle2 size={12} />
                            {t("Sent", "Enviado")}
                          </span>
                        )}
                        {st === "queued" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px]">
                            <Clock size={11} />
                            {t("Queued", "Em fila")}
                          </span>
                        )}
                        {(st === "failed" || st === "skipped") && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                              <XCircle size={12} />
                              {st === "failed" ? t("Failed", "Falhou") : t("Skipped", "Ignorado")}
                            </span>
                            <button
                              type="button"
                              disabled={retrying}
                              onClick={() => void handleRetryFailed([item.id])}
                              className="px-2 py-1 rounded border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] cursor-pointer"
                            >
                              {t("Retry", "Repetir")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {finished
              ? t("All queued batches have finished processing.", "Todos os lotes em fila terminaram o processamento.")
              : t("You can keep this window open to watch live progress, or view Outbox.", "Pode manter esta janela aberta para acompanhar o envio em direto.")}
          </span>
          <div className="flex items-center gap-2.5">
            {finished && onViewSent && counts.sent > 0 && (
              <button
                type="button"
                onClick={onViewSent}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                {t("View Sent Mail", "Ver Enviados")} ({counts.sent})
              </button>
            )}
            <button
              type="button"
              className="rounded-lg bg-sky-600 hover:bg-sky-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
              onClick={onClose}
            >
              {finished ? t("Done / View Outbox", "Concluir / Ver Caixa de Saída") : t("View Outbox", "Ver caixa de saída")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
