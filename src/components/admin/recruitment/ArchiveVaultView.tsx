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
    const controller = new AbortController();
    fetch("/api/admin/careers/archive", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load archive");
        setEntries(data.archivedCohorts || []);
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
      (!role || role === "all" || e.roleId === role) &&
      `${cycleLabel(e, { en: e.roleTitleEn, pt: e.roleTitlePt }, lang)} ${e.name} ${e.roleTitlePt} ${e.roleTitleEn}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-3">
          <Archive size={24} />
          <h1 className="text-2xl font-bold">
            {t("Archive Vault", "Cofre de Arquivo")}
          </h1>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {t(
            "Closed applications, complete recruitment workspaces. Continue reviewing candidates and managing each stage in its original cycle.",
            "Candidaturas encerradas, áreas de recrutamento completas. Continue a rever candidatos e a gerir cada etapa no lote original.",
          )}
        </p>
        <button onClick={onBackToActive} className="mt-4 text-xs underline">
          {t("Back to active recruitment", "Voltar ao recrutamento activo")}
        </button>
      </header>
      <label className="flex gap-2 items-center rounded-xl border bg-white px-4 py-3">
        <Search size={16} />
        <span className="sr-only">{t("Search cycles", "Pesquisar lotes")}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search recruitment cycles…", "Pesquisar lotes…")}
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
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
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-500"
            >
              <div className="flex justify-between gap-3">
                <h2 className="font-semibold">{cycleLabel(e, { en: e.roleTitleEn, pt: e.roleTitlePt }, lang)}</h2>
                <ArrowUpRight size={18} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {lang === "pt" ? e.roleTitlePt : e.roleTitleEn} ·{" "}
                {e.unassigned
                  ? t("Membership needs review", "Associação por rever")
                  : t("Applications closed", "Candidaturas encerradas")}
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-xs">
                {[
                  [t("Applications", "Candidaturas"), e.metrics.total],
                  [t("Screening assessed", "Avaliados"), e.metrics.screened],
                  [t("Not advancing / archived", "Não avançam / arquivados"), e.metrics.notAdvancing],
                  [t("Booked", "Agendados"), e.metrics.booked],
                  [t("Attended", "Presentes"), e.metrics.attended],
                  [t("Test completed", "Teste realizado"), e.metrics.tested],
                  [t("Results scored", "Com nota"), e.metrics.scored],
                  [t("Next phase", "Próxima fase"), e.metrics.nextPhase],
                  [t("Confirmed", "Confirmados"), e.metrics.confirmed],
                  ...(e.metrics.unresolved ? [[t("Outcome needs review", "Resultado por rever"), e.metrics.unresolved]] : []),
                ].map(([label, count]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold">{count}</dd>
                  </div>
                ))}
              </dl>
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
