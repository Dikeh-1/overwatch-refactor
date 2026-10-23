"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { cycleLabel } from "@/lib/careers-cycle-label";
import type { CareerCohort } from "@/lib/careers-models";
import { formatSlotDisplay } from "@/lib/careers";

type CatalogRole = { id: string; en: string; pt: string; open?: boolean; activeCohortId?: string | null };
type Catalog = { roles: CatalogRole[]; cohorts: CareerCohort[] };

export function RoleTestSlotSettings() {
  const { lang, t } = useAdminLanguage();
  const params = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [cycleId, setCycleId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [quota, setQuota] = useState(15);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadCatalog = useCallback(
    async (signal?: AbortSignal, preserveSelection = false) => {
      try {
        const response = await fetch(`/api/admin/careers/test-slots?catalog=1&t=${Date.now()}`, {
          signal,
          cache: "no-store",
        });
        const data: Catalog & { error?: string } = await response.json();
        if (!response.ok) throw Error(data.error || "Failed to load schedules");
        setCatalog(data);
        setCycleId((currentId) => {
          const targetId =
            (preserveSelection && currentId && data.cohorts.find((c) => c.id === currentId)?.id) ||
            data.cohorts.find((c) => c.id === params.get("cohortId"))?.id ||
            data.cohorts.find((c) => c.roleId === params.get("roleId"))?.id ||
            data.roles.find((r) => r.open && r.activeCohortId)?.activeCohortId ||
            data.cohorts.find((c) => Array.isArray(c.testSlots) && c.testSlots.length > 0)?.id ||
            data.cohorts[0]?.id ||
            "";
          const targetCohort = data.cohorts.find((c) => c.id === targetId);
          if (targetCohort) {
            setSlots(targetCohort.testSlots || []);
            setQuota(targetCohort.slotQuota || 15);
          }
          return targetId;
        });
      } catch (err) {
        if (!signal?.aborted) setError((err as Error).message);
      }
    },
    [params]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal, false);
    const onUpdated = () => {
      void loadCatalog(undefined, true);
    };
    window.addEventListener("admin:careers-updated", onUpdated);
    return () => {
      controller.abort();
      window.removeEventListener("admin:careers-updated", onUpdated);
    };
  }, [loadCatalog]);

  const select = (id: string) => {
    const cohort = catalog?.cohorts.find((c) => c.id === id);
    setCycleId(id);
    setSlots(cohort?.testSlots || []);
    setQuota(cohort?.slotQuota || 15);
    setNotice("");
    setError("");
  };

  const persistSchedule = async (nextSlots: string[], nextQuota: number) => {
    if (!cycleId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/careers/test-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortId: cycleId, slots: nextSlots, quota: nextQuota }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setSlots(data.slots || nextSlots);
      setCatalog(
        (current) =>
          current && {
            ...current,
            cohorts: current.cohorts.map((c) =>
              c.id === cycleId ? { ...c, testSlots: data.slots, slotQuota: nextQuota } : c
            ),
          }
      );
      setNotice(
        t(
          "Schedule saved live. All applicant booking pages and testing rosters now reflect these slots immediately.",
          "Horário guardado em tempo real. Todas as páginas de agendamento dos candidatos e listas de teste reflectem estes turnos imediatamente."
        )
      );
      window.dispatchEvent(new Event("admin:careers-updated"));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    await persistSchedule(slots, quota);
  };

  return (
    <section id="test-slots" className="scroll-mt-20 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">
          {t("Test schedules by role & recruitment cycle", "Horários por vaga e lote")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {t(
            "Dates and times use Maputo time (UTC+2). Adding, changing, or removing a slot here immediately updates every applicant's booking page and the general testing schedule live.",
            "Datas e horas de Maputo (UTC+2). Adicionar, alterar ou remover um turno aqui actualiza imediatamente a página de agendamento de cada candidato e a escala geral em tempo real."
          )}
        </p>
      </div>
      <label className="block text-xs font-medium">
        {t("Role / recruitment cycle", "Vaga / lote")}
        <select
          aria-label={t("Role / recruitment cycle", "Vaga / lote")}
          disabled={!catalog || busy}
          value={cycleId}
          onChange={(e) => select(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
        >
          <option value="">{t("Choose a recruitment cycle", "Seleccione um lote")}</option>
          {catalog?.cohorts.map((cohort) => {
            const role = catalog.roles.find((r) => r.id === cohort.roleId) || {
              en: cohort.roleId,
              pt: cohort.roleId,
            };
            return (
              <option key={cohort.id} value={cohort.id}>
                {cycleLabel(cohort, role, lang)}
              </option>
            );
          })}
        </select>
      </label>
      {cycleId && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              {t("Date", "Data")}
              <input
                aria-label={t("Test date", "Data do teste")}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block rounded-lg border p-2"
              />
            </label>
            <label className="text-xs">
              {t("Time (Maputo)", "Hora (Maputo)")}
              <input
                aria-label={t("Test time", "Hora do teste")}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 block rounded-lg border p-2"
              />
            </label>
            <button
              type="button"
              disabled={!date || !time || busy}
              onClick={() => {
                const slot = `${date} - ${time}`;
                const next = [...new Set([...slots, slot])];
                setSlots(next);
                setDate("");
                void persistSchedule(next, quota);
              }}
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-40"
            >
              {t("Add slot", "Adicionar turno")}
            </button>
            <label className="text-xs">
              {t("Capacity per slot", "Capacidade por turno")}
              <input
                aria-label={t("Capacity per slot", "Capacidade por turno")}
                type="number"
                min={1}
                max={200}
                value={quota}
                onChange={(e) => setQuota(Number(e.target.value))}
                className="mt-1 block w-24 rounded-lg border p-2"
              />
            </label>
          </div>
          <ul className="divide-y divide-slate-100">
            {slots.map((slot) => (
              <li key={slot} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{formatSlotDisplay(slot, lang)}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const next = slots.filter((s) => s !== slot);
                    setSlots(next);
                    void persistSchedule(next, quota);
                  }}
                  className="text-xs font-medium text-rose-700 hover:underline disabled:opacity-40"
                >
                  {t("Remove", "Remover")}
                </button>
              </li>
            ))}
          </ul>
          {!slots.length && (
            <p className="text-xs text-slate-500">
              {t(
                "No slots configured. Booking invitations cannot be sent until future slots are saved.",
                "Sem turnos. Guarde turnos futuros antes de enviar convites."
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <button
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {busy ? t("Saving…", "A guardar…") : t("Save cycle schedule", "Guardar horário do lote")}
            </button>
            <Link
              className="text-xs font-medium text-sky-700"
              href={`/admin/recruitment/archive?cohortId=${encodeURIComponent(cycleId)}&view=testing`}
            >
              {t("Open testing workspace →", "Abrir área de testes →")}
            </Link>
          </div>
        </>
      )}
      {notice && (
        <p role="status" className="text-xs font-medium text-emerald-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
