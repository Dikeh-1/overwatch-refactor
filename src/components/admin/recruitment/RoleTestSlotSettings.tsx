"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { cycleLabel } from "@/lib/careers-cycle-label";
import type { CareerCohort } from "@/lib/careers-models";
import { formatSlotDisplay } from "@/lib/careers";

type Catalog = { roles: { id: string; en: string; pt: string }[]; cohorts: CareerCohort[] };
export function RoleTestSlotSettings() {
  const { lang, t } = useAdminLanguage();
  const params = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null), [cycleId, setCycleId] = useState("");
  const [slots, setSlots] = useState<string[]>([]), [quota, setQuota] = useState(15);
  const [date, setDate] = useState(""), [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/careers/test-slots?catalog=1", { signal: controller.signal, cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error); setCatalog(data);
      const requested = data.cohorts.find((c: CareerCohort) => c.id === params.get("cohortId")) || data.cohorts.find((c: CareerCohort) => c.roleId === params.get("roleId"));
      if (requested) { setCycleId(requested.id); setSlots(requested.testSlots || []); setQuota(requested.slotQuota || 15); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [params]);
  const select = (id: string) => { const cohort = catalog?.cohorts.find(c => c.id === id); setCycleId(id); setSlots(cohort?.testSlots || []); setQuota(cohort?.slotQuota || 15); setNotice(""); setError(""); };
  const save = async () => {
    if (!cycleId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/careers/test-slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cohortId: cycleId, slots, quota }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error);
      setCatalog(current => current && ({ ...current, cohorts: current.cohorts.map(c => c.id === cycleId ? { ...c, testSlots: data.slots, slotQuota: quota } : c) }));
      setNotice(t("Schedule saved for this cycle. Applicant booking links use these slots.", "Horário guardado para este lote. Os links de agendamento usam estes turnos."));
      window.dispatchEvent(new Event("admin:careers-updated"));
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  };
  return <section id="test-slots" className="scroll-mt-20 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <div><h2 className="font-semibold">{t("Test schedules by role & recruitment cycle", "Horários por vaga e lote")}</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">{t("Dates and times use Maputo time (UTC+2). Each cycle keeps its own slots and capacity. Existing bookings remain recorded when a slot is removed.", "Datas e horas de Maputo (UTC+2). Cada lote tem os seus turnos e capacidade. Remover um turno não apaga agendamentos existentes.")}</p></div>
    <label className="block text-xs font-medium">{t("Role / recruitment cycle", "Vaga / lote")}<select aria-label={t("Role / recruitment cycle", "Vaga / lote")} disabled={!catalog || busy} value={cycleId} onChange={e => select(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"><option value="">{t("Choose a recruitment cycle", "Seleccione um lote")}</option>{catalog?.cohorts.map(cohort => { const role = catalog.roles.find(r => r.id === cohort.roleId) || { en: cohort.roleId, pt: cohort.roleId }; return <option key={cohort.id} value={cohort.id}>{cycleLabel(cohort, role, lang)}</option>; })}</select></label>
    {cycleId && <><div className="flex flex-wrap items-end gap-3"><label className="text-xs">{t("Date", "Data")}<input aria-label={t("Test date", "Data do teste")} type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block rounded-lg border p-2"/></label><label className="text-xs">{t("Time (Maputo)", "Hora (Maputo)")}<input aria-label={t("Test time", "Hora do teste")} type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 block rounded-lg border p-2"/></label><button type="button" disabled={!date || !time || busy} onClick={() => { const slot = `${date} - ${time}`; setSlots(previous => [...new Set([...previous, slot])]); setNotice(""); }} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-40">{t("Add slot", "Adicionar turno")}</button><label className="text-xs">{t("Capacity per slot", "Capacidade por turno")}<input aria-label={t("Capacity per slot", "Capacidade por turno")} type="number" min={1} max={200} value={quota} onChange={e => setQuota(Number(e.target.value))} className="mt-1 block w-24 rounded-lg border p-2"/></label></div>
      <ul className="divide-y divide-slate-100">{slots.map(slot => <li key={slot} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{formatSlotDisplay(slot, lang)}</span><button type="button" disabled={busy} onClick={() => setSlots(current => current.filter(s => s !== slot))} className="text-xs text-rose-700">{t("Remove", "Remover")}</button></li>)}</ul>
      {!slots.length && <p className="text-xs text-slate-500">{t("No slots configured. Booking invitations cannot be sent until future slots are saved.", "Sem turnos. Guarde turnos futuros antes de enviar convites.")}</p>}
      <div className="flex flex-wrap items-center gap-4"><button disabled={busy} onClick={() => void save()} className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? t("Saving…", "A guardar…") : t("Save cycle schedule", "Guardar horário do lote")}</button><Link className="text-xs font-medium text-sky-700" href={`/admin/recruitment/archive?cohortId=${encodeURIComponent(cycleId)}&view=testing`}>{t("Open testing workspace →", "Abrir área de testes →")}</Link></div>
    </>}
    {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}{error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </section>;
}
