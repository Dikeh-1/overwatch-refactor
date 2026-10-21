"use client";
import Link from "next/link";
import type { CareerCohort } from "@/lib/careers-models";
import { useAdminLanguage } from "../shell/AdminLanguageContext";

export function HistoricalTestEvidence({ cohorts }: { cohorts: CareerCohort[] }) {
  const { t } = useAdminLanguage();
  return <>{cohorts.filter(c => c.historicalTestResults).map(c => {
    const evidence = c.historicalTestResults!;
    const unlinked = evidence.results.filter(r => !r.applicationId).length;
    return <details key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold">{t("Documented test results", "Resultados documentados")} · {evidence.results.length} {t("test takers", "participantes")}{unlinked ? ` · ${unlinked} ${t("without a linked application", "sem candidatura associada")}` : ""}</summary>
      <p className="my-3 text-xs text-slate-500">{t("The grading document proves test completion. Bookings are counted separately. Unlinked names contribute to documented test totals, but do not create applicants or receive guessed identities.", "O documento comprova a realização dos testes. Os agendamentos são contados separadamente. Nomes sem associação contam nos testes documentados, sem criar candidaturas nem presumir identidades.")} <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline text-sky-700">{t("Open source document", "Abrir documento de origem")}</a></p>
      <ul className="max-h-80 overflow-auto divide-y divide-slate-100">{evidence.results.map(r => <li key={r.sourceName} className="flex justify-between gap-3 py-2"><span>{r.applicationId ? <Link className="text-sky-700 underline" href={`/admin/recruitment/candidates/${r.applicationId}`}>{r.sourceName}</Link> : <>{r.sourceName} <span className="text-xs text-slate-500">({t("document record", "registo do documento")})</span></>}</span><span>{r.score}/100</span></li>)}</ul>
    </details>;
  })}</>;
}
