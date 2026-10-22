import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Metric = { key: string; label: string; value: number; href: string; detail?: string };

/** Shared presentation; every count keeps its own candidate drill-down. */
export function RecruitmentMetricPanel({ highlights, groups }: {
  highlights: Metric[];
  groups: { title: string; metrics: Metric[] }[];
}) {
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {highlights.map((metric, index) => <Link key={metric.key} href={metric.href} scroll={false}
        className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-sky-500 ${index === 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900 shadow-sm"}`}>
        <div className="flex items-start justify-between gap-2"><span className={`text-xs font-medium ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>{metric.label}</span><ArrowUpRight size={16} className="shrink-0 opacity-50 group-hover:opacity-100"/></div>
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{metric.value.toLocaleString()}</p>
        {metric.detail && <p className={`mt-2 text-xs leading-relaxed ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>{metric.detail}</p>}
      </Link>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      {groups.filter(group => group.metrics.length).map(group => <section key={group.title} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 text-sm font-semibold text-slate-900">{group.title}</h2>
        <dl className="divide-y divide-slate-100 px-5">{group.metrics.map(metric => <div key={metric.key}>
          <Link href={metric.href} scroll={false} className="group flex items-center justify-between gap-4 py-3.5 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-500">
            <dt className="text-xs leading-relaxed text-slate-600 group-hover:text-sky-700">{metric.label}</dt>
            <dd className="flex shrink-0 items-center gap-3 text-sm font-semibold tabular-nums">{metric.value.toLocaleString()}<ArrowUpRight size={13} className="text-slate-300 group-hover:text-sky-600"/></dd>
          </Link>
        </div>)}</dl>
      </section>)}
    </div>
  </div>;
}
