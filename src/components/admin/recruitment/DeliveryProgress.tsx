"use client";
import { useEffect, useState } from "react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";

export function DeliveryProgress({ scope, campaignId, onClose }: { scope: string; campaignId: string; onClose: () => void }) {
  const { t } = useAdminLanguage();
  const [counts, setCounts] = useState({ total: 0, sent: 0, sending: 0, failed: 0, skipped: 0, queued: 0 });
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const update = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch(`/api/admin/careers/mail?scope=${encodeURIComponent(scope)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw Error(data.error);
        const rows = data.items.filter((item: {kind: string; data: {campaignId: string}}) => item.kind === "outbox" && item.data.campaignId === campaignId);
        const count = (status: string) => rows.filter((item: {data: {status: string}}) => item.data.status === status).length;
        setCounts({ total: rows.length, sent: count("sent"), sending: count("sending"), failed: count("failed"), skipped: count("skipped") + count("deleted"), queued: count("queued") });
        setError("");
      } catch (error) { if (!controller.signal.aborted) setError((error as Error).message); }
      finally { running = false; }
    };
    void update(); const timer = setInterval(() => void update(), 2000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [scope, campaignId]);
  const finished = counts.total > 0 && !counts.queued && !counts.sending;
  return <div role="dialog" aria-modal="true" aria-label={t("Email delivery progress", "Progresso do envio")} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-5"><div className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-semibold">{finished ? t("Delivery processing complete", "Processamento concluído") : t("Sending your emails", "A enviar os seus emails")}</h2><p className="text-sm text-slate-600">{t("Up to five messages per batch. You can close this window; processing continues on the server.", "Até cinco mensagens por lote. Pode fechar esta janela; o processamento continua no servidor.")}</p><progress className="h-3 w-full" max={counts.total || 1} value={counts.sent + counts.failed + counts.skipped} /><div className="grid grid-cols-2 gap-3 text-sm"><p>{t("Sent", "Enviados")}: {counts.sent}/{counts.total}</p><p>{t("Sending", "Em envio")}: {counts.sending}</p><p>{t("Queued", "Em fila")}: {counts.queued}</p><p>{t("Failed", "Falhas")}: {counts.failed}</p><p>{t("Skipped / cancelled", "Ignorados / cancelados")}: {counts.skipped}</p></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white" onClick={onClose}>{t("View Outbox", "Ver caixa de saída")}</button></div></div>;
}
