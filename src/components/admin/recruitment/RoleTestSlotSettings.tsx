"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import { cycleLabel } from "@/lib/careers-cycle-label";
import type { CareerCohort } from "@/lib/careers-models";
import { formatSlotDisplay, normalizeSlot, parseSlotComponents, isSlotBookingExpired, isPastDateSlot } from "@/lib/careers";
import { getQuotaForSlot } from "@/lib/careers-booking-rules";

type CatalogRole = { id: string; en: string; pt: string; open?: boolean; activeCohortId?: string | null };
type Catalog = { roles: CatalogRole[]; cohorts: CareerCohort[] };

function slotToDateTimeInputs(slot: string): { date: string; time: string } {
  const parsed = parseSlotComponents(slot);
  if (!parsed) return { date: "", time: "10:00" };
  const yyyy = String(parsed.year).padStart(4, "0");
  const mm = String(parsed.month).padStart(2, "0");
  const dd = String(parsed.day).padStart(2, "0");
  const hh = String(parsed.hour).padStart(2, "0");
  const min = String(parsed.minute).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

export function RoleTestSlotSettings() {
  const { lang, t } = useAdminLanguage();
  const params = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [cycleId, setCycleId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [quota, setQuota] = useState(15);
  const [quotaInput, setQuotaInput] = useState("15");
  const [slotQuotas, setSlotQuotas] = useState<Record<string, number>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("10:00");
  const [editSlotQuota, setEditSlotQuota] = useState("15");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const isEditingQuotaRef = useRef(false);

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
            setSlotQuotas(targetCohort.slotQuotas || {});
            if (!isEditingQuotaRef.current) {
              const nextQ = targetCohort.slotQuota || 15;
              setQuota(nextQ);
              setQuotaInput(String(nextQ));
            }
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
    const nextQ = cohort?.slotQuota || 15;
    setCycleId(id);
    setSlots(cohort?.testSlots || []);
    setSlotQuotas(cohort?.slotQuotas || {});
    setQuota(nextQ);
    setQuotaInput(String(nextQ));
    setEditingSlot(null);
    setNotice("");
    setError("");
  };

  const persistSchedule = async (
    nextSlots: string[],
    nextQuota: number,
    renamedSlot?: { from: string; to: string },
    nextSlotQuotas?: Record<string, number>
  ) => {
    if (!cycleId) return;
    const validQuota = Number.isInteger(nextQuota) && nextQuota >= 1 && nextQuota <= 200 ? nextQuota : quota;
    const effectiveSlotQuotas = nextSlotQuotas ?? slotQuotas;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/careers/test-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortId: cycleId,
          slots: nextSlots,
          quota: validQuota,
          slotQuotas: effectiveSlotQuotas,
          ...(renamedSlot ? { renamedSlot } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      const savedSlots = data.slots || nextSlots;
      const savedQuota = typeof data.quota === "number" ? data.quota : validQuota;
      const savedSlotQuotas =
        data.slotQuotas && typeof data.slotQuotas === "object" ? data.slotQuotas : effectiveSlotQuotas;
      setSlots(savedSlots);
      setQuota(savedQuota);
      setQuotaInput(String(savedQuota));
      setSlotQuotas(savedSlotQuotas);
      setCatalog(
        (current) =>
          current && {
            ...current,
            cohorts: current.cohorts.map((c) =>
              c.id === cycleId
                ? { ...c, testSlots: savedSlots, slotQuota: savedQuota, slotQuotas: savedSlotQuotas }
                : c
            ),
          }
      );
      setNotice(
        t(
          "Schedule & slot capacity saved live. Applicant booking pages and testing rosters for this selected recruitment cycle now reflect these changes immediately.",
          "Horário e capacidade por turno guardados em tempo real. As páginas de agendamento e listas de teste deste lote seleccionado reflectem estas alterações imediatamente."
        )
      );
      setTimeout(() => setNotice(""), 4000);
      window.dispatchEvent(new Event("admin:careers-updated"));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleQuotaCommit = (rawVal: string) => {
    isEditingQuotaRef.current = false;
    const parsed = parseInt(rawVal, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
      setQuotaInput(String(quota));
      return;
    }
    setQuota(parsed);
    setQuotaInput(String(parsed));
    if (parsed !== quota) {
      void persistSchedule(slots, parsed);
    }
  };

  const save = async () => {
    const parsed = parseInt(quotaInput, 10);
    const effectiveQuota = Number.isFinite(parsed) && parsed >= 1 && parsed <= 200 ? parsed : quota;
    setQuota(effectiveQuota);
    setQuotaInput(String(effectiveQuota));
    await persistSchedule(slots, effectiveQuota);
  };

  return (
    <section id="test-slots" className="scroll-mt-20 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">
          {t("Test schedules by role & recruitment cycle", "Horários por vaga e lote")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {t(
            "Dates and times use Maputo time (UTC+2). Adding, editing, or removing a slot or changing slot capacity here immediately updates applicant booking pages and testing schedules for the selected recruitment cycle.",
            "Datas e horas de Maputo (UTC+2). Adicionar, editar ou remover um turno ou alterar a capacidade por turno aqui actualiza imediatamente as páginas de agendamento e a escala de testes apenas para o lote de recrutamento seleccionado."
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
                value={quotaInput}
                onFocus={() => {
                  isEditingQuotaRef.current = true;
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuotaInput(val);
                  const num = parseInt(val, 10);
                  if (Number.isFinite(num) && num >= 1 && num <= 200) {
                    setQuota(num);
                  }
                }}
                onBlur={(e) => handleQuotaCommit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuotaCommit((e.target as HTMLInputElement).value);
                  }
                }}
                className="mt-1 block w-24 rounded-lg border p-2"
              />
            </label>
          </div>
          <div className="space-y-4">
            {/* Active Bookable Slots */}
            {(() => {
              const activeSlots = slots.filter((s) => !isSlotBookingExpired(s));
              const expiredSlots = slots.filter((s) => isSlotBookingExpired(s));

              return (
                <>
                  {expiredSlots.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="font-medium">
                          {t(
                            `${expiredSlots.length} slot${expiredSlots.length > 1 ? "s" : ""} expired (booking cut-off passed at 11:59 PM day prior) · Synced with live candidate booking.`,
                            `${expiredSlots.length} turno${expiredSlots.length > 1 ? "s" : ""} expirado${expiredSlots.length > 1 ? "s" : ""} (inscrições fecharam na véspera às 23:59) · Sincronizado com agendamento.`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowExpired(!showExpired)}
                          className="text-xs text-sky-700 hover:underline font-semibold"
                        >
                          {showExpired
                            ? t("Hide expired slots", "Ocultar turnos expirados")
                            : t(`View expired (${expiredSlots.length})`, `Ver expirados (${expiredSlots.length})`)}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            const nextMap: Record<string, number> = {};
                            activeSlots.forEach((s) => {
                              nextMap[normalizeSlot(s)] = getQuotaForSlot(s, quota, slotQuotas);
                            });
                            setSlots(activeSlots);
                            setSlotQuotas(nextMap);
                            void persistSchedule(activeSlots, quota, undefined, nextMap);
                          }}
                          className="px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
                        >
                          {t("Sync & Remove Expired Slots", "Sincronizar e Limpar Expirados")}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs">
                      <span className="font-bold text-slate-800 uppercase tracking-wider font-mono">
                        {t(`Active Booking Slots (${activeSlots.length})`, `Turnos Activos para Agendamento (${activeSlots.length})`)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {t("Candidates can book these slots until 11:59 PM 1 day prior.", "Candidatos podem agendar até às 23:59 da véspera.")}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100">
                      {activeSlots.map((slot) => {
                        const isEditingThis = editingSlot === slot;
                        const currentSlotCapacity = getQuotaForSlot(slot, quota, slotQuotas);
                        return (
                          <li key={slot} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                            {isEditingThis ? (
                              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  aria-label={t("Edit slot date", "Editar data do turno")}
                                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                                />
                                <input
                                  type="time"
                                  value={editTime}
                                  onChange={(e) => setEditTime(e.target.value)}
                                  aria-label={t("Edit slot time", "Editar hora do turno")}
                                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                                />
                                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                  <span>{t("Capacity:", "Capacidade:")}</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={editSlotQuota}
                                    onChange={(e) => setEditSlotQuota(e.target.value)}
                                    aria-label={t("Edit slot capacity", "Editar capacidade do turno")}
                                    className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={!editDate || !editTime || busy}
                                  onClick={() => {
                                    const updatedSlot = `${editDate} - ${editTime}`;
                                    const parsedSlotQ = parseInt(editSlotQuota, 10);
                                    const validSlotQ =
                                      Number.isFinite(parsedSlotQ) && parsedSlotQ >= 1 && parsedSlotQ <= 200
                                        ? parsedSlotQ
                                        : currentSlotCapacity;
                                    const next = slots.map((s) => (s === slot ? updatedSlot : s));
                                    const uniqueNext = [...new Set(next)];
                                    const nextMap: Record<string, number> = { ...slotQuotas };
                                    if (updatedSlot !== slot) {
                                      delete nextMap[normalizeSlot(slot)];
                                      delete nextMap[slot];
                                    }
                                    nextMap[normalizeSlot(updatedSlot)] = validSlotQ;
                                    setEditingSlot(null);
                                    setSlots(uniqueNext);
                                    setSlotQuotas(nextMap);
                                    void persistSchedule(
                                      uniqueNext,
                                      quota,
                                      updatedSlot !== slot ? { from: slot, to: updatedSlot } : undefined,
                                      nextMap
                                    );
                                  }}
                                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
                                >
                                  {t("Apply", "Aplicar")}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setEditingSlot(null)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                >
                                  {t("Cancel", "Cancelar")}
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="font-medium text-slate-900">{formatSlotDisplay(slot, lang)}</span>
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  {t(`Capacity: ${currentSlotCapacity}`, `Capacidade: ${currentSlotCapacity}`)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              {!isEditingThis && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    const initial = slotToDateTimeInputs(slot);
                                    setEditDate(initial.date);
                                    setEditTime(initial.time);
                                    setEditSlotQuota(String(currentSlotCapacity));
                                    setEditingSlot(slot);
                                  }}
                                  className="text-xs font-medium text-sky-700 hover:underline disabled:opacity-40"
                                >
                                  {t("Edit", "Editar")}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  const next = slots.filter((s) => s !== slot);
                                  const nextMap: Record<string, number> = { ...slotQuotas };
                                  delete nextMap[normalizeSlot(slot)];
                                  delete nextMap[slot];
                                  setSlots(next);
                                  setSlotQuotas(nextMap);
                                  if (editingSlot === slot) setEditingSlot(null);
                                  void persistSchedule(next, quota, undefined, nextMap);
                                }}
                                className="text-xs font-medium text-rose-700 hover:underline disabled:opacity-40"
                              >
                                {t("Remove", "Remover")}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {!activeSlots.length && (
                      <p className="text-xs text-slate-500 py-3">
                        {t(
                          "No active future booking slots configured. Add future dates above so applicants can book.",
                          "Sem turnos futuros activos configurados. Adicione datas futuras acima para os candidatos agendarem."
                        )}
                      </p>
                    )}
                  </div>

                  {/* Collapsible Expired Slots Section */}
                  {showExpired && expiredSlots.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                          {t("Past / Expired Slots (Cut-off Passed):", "Turnos Passados / Expirados (Prazo Encerrado):")}
                        </span>
                        <span className="text-[11px] text-amber-700 font-semibold">
                          {t("Hidden from applicant booking pages", "Ocultos das páginas de agendamento")}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100 bg-slate-50/60 rounded-xl border border-slate-200 px-3">
                        {expiredSlots.map((slot) => {
                          const currentSlotCapacity = getQuotaForSlot(slot, quota, slotQuotas);
                          return (
                            <li key={slot} className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs opacity-75">
                              <div className="flex items-center gap-2.5">
                                <span className="line-through text-slate-500">{formatSlotDisplay(slot, lang)}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  {t("Booking Closed", "Inscrições Fechadas")}
                                </span>
                                <span className="text-slate-400">
                                  {t(`Capacity: ${currentSlotCapacity}`, `Lotação: ${currentSlotCapacity}`)}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  const next = slots.filter((s) => s !== slot);
                                  const nextMap: Record<string, number> = { ...slotQuotas };
                                  delete nextMap[normalizeSlot(slot)];
                                  delete nextMap[slot];
                                  setSlots(next);
                                  setSlotQuotas(nextMap);
                                  void persistSchedule(next, quota, undefined, nextMap);
                                }}
                                className="text-xs font-medium text-rose-700 hover:underline disabled:opacity-40"
                              >
                                {t("Remove from cycle", "Remover do ciclo")}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              <button
                disabled={busy}
                onClick={() => void save()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-sky-700 transition-colors shadow-2xs"
              >
                {busy ? t("Saving…", "A guardar…") : t("Save cycle schedule", "Guardar horário do lote")}
              </button>
              <Link
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline inline-flex items-center gap-1"
                href={`/admin/recruitment/archive?cohortId=${encodeURIComponent(cycleId)}&view=testing`}
              >
                <span>{t("Open testing workspace →", "Abrir área de testes →")}</span>
              </Link>
              <Link
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1"
                href="/admin/recruitment/candidates"
              >
                <span>{t("Open Candidates Roster →", "Abrir Lista de Candidatos →")}</span>
              </Link>
            </div>
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
