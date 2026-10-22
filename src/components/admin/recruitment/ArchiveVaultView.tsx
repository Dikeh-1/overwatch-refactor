"use client";
import { useRecruitmentRefresh } from "../hooks/useRecruitmentRefresh";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, ArrowUpRight, Search } from "lucide-react";
import { useAdminLanguage } from "../shell/AdminLanguageContext";
import RecruitmentWorkspace from "./RecruitmentWorkspace";
import { cycleLabel } from "@/lib/careers-cycle-label";
import type { CareerCohort } from "@/lib/careers-models";
import { sameRole } from "@/lib/careers-workflow";
import type { recruitmentMetrics } from "@/lib/careers-workflow";

type Entry = CareerCohort & {
  roleTitlePt: string;
  roleTitleEn: string;
  metrics: ReturnType<typeof recruitmentMetrics>;
};
export default function ArchiveVaultView({
  onBackToActive,
}: {
  onBackToActive: () => void;
}) {
  const params = useSearchParams();
  const cohortId = params.get("cohortId");
  const role = params.get("role");
  const { t, lang } = useAdminLanguage();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useRecruitmentRefresh(() => setRetry(n => n + 1), !cohortId);
  useEffect(() => {
    if (cohortId) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    fetch("/api/admin/careers/archive", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load archive");
        if (!controller.signal.aborted) setEntries(data.archivedCohorts || []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry, cohortId]);
  if (cohortId)
    return <RecruitmentWorkspace key={cohortId} cohortId={cohortId} />;
  const visible = [...entries].sort((a, b) => (b.closedAt || b.openedAt || "").localeCompare(a.closedAt || a.openedAt || "")).filter(
    (e) =>
      (!role || role === "all" || sameRole(e.roleId, role)) &&
      `${cycleLabel(e, { en: e.roleTitleEn, pt: e.roleTitlePt }, lang)} ${e.name} ${e.roleTitlePt} ${e.roleTitleEn}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-sm sm:p-8">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">{t("Recruitment history", "Histórico de recrutamento")}</p>
        <div className="flex items-center gap-3">
          <Archive size={24} />
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Archive Vault", "Cofre de Arquivo")}
          </h1>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          {t(
            "Closed applications, complete recruitment workspaces. Continue reviewing candidates and managing each stage in its original cycle.",
            "Candidaturas encerradas, áreas de recrutamento completas. Continue a rever candidatos e a gerir cada etapa no lote original.",
          )}
        </p>
        <button onClick={onBackToActive} className="mt-5 inline-flex rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-white/10">
          {t("Recruitment overview", "Visão geral do recrutamento")}
        </button>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight">{t("All recruitment cycles", "Todos os lotes")}</h2><p className="mt-1 text-xs text-slate-500">{visible.length} {t("cycles · select one to open its workspace", "lotes · seleccione um para abrir")}</p></div>
      <label className="flex gap-2 items-center rounded-xl border bg-white px-4 py-3">
        <Search size={16} />
        <span className="sr-only">{t("Search cycles", "Pesquisar lotes")}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search recruitment cycles…", "Pesquisar lotes…")}
          className="w-full bg-transparent text-sm outline-none"
        />
      </label></div>
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 p-4">
          {error}{" "}
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              setRetry((n) => n + 1);
            }}
            className="underline"
          >
            {t("Retry", "Tentar novamente")}
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">{t("Loading cycles…", "A carregar lotes…")}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {visible.map((e) => (
            <Link
              key={e.id}
              href={`/admin/recruitment/archive?cohortId=${encodeURIComponent(e.id)}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md sm:p-6"
            >
              <div className="flex justify-between gap-3">
                <h2 className="font-semibold">{cycleLabel(e, { en: e.roleTitleEn, pt: e.roleTitlePt }, lang)}</h2>
                <ArrowUpRight size={18} className="shrink-0 text-slate-400 group-hover:text-sky-600" />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {lang === "pt" ? e.roleTitlePt : e.roleTitleEn} ·{" "}
                {e.unassigned
                  ? t("Membership needs review", "Associação por rever")
                  : t("Applications closed", "Candidaturas encerradas")}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-slate-100 pt-5 text-xs sm:grid-cols-3">
                {[
                  [t("Applications", "Candidaturas"), e.metrics.total],
                  [t("Not advancing / archived", "Não avançam / arquivados"), e.metrics.notAdvancing],
                  [t("Booked", "Agendados"), e.metrics.booked],
                  [t("Test completed", "Teste realizado"), e.metrics.tested],
                  [t("Next phase", "Próxima fase"), e.metrics.nextPhase],
                  [t("Confirmed", "Confirmados"), e.metrics.confirmed],
                  ...(e.metrics.unresolved ? [[t("Outcome needs review", "Resultado por rever"), e.metrics.unresolved]] : []),
                ].map(([label, count]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold">{count}</dd>
                  </div>
                ))}
              </dl><p className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold text-sky-700">{t("Open recruitment workspace", "Abrir área de recrutamento")} →</p>
            </Link>
          ))}
        </div>
      )}
      {!loading && !error && !visible.length && (
        <p className="p-6 text-center text-sm text-slate-500">
          {t(
            "No closed recruitment cycles match.",
            "Nenhum lote encerrado encontrado.",
          )}
        </p>
      )}
    </div>
  );
}
