"use client";

import { useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronRight,
  ClipboardList,
  ScanSearch,
  ShieldCheck,
  Siren,
  UserRoundCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SolutionService = {
  id: string;
  title: string;
  summary: string;
  description: string;
  bulletsTitle?: string;
  bullets?: string[];
  outro?: string;
};

type SolutionsExplorerProps = {
  services: SolutionService[];
  detailsLabel: string;
  includedLabel: string;
};

const serviceIcons = [
  BrainCircuit,
  ScanSearch,
  ShieldCheck,
  UserRoundCog,
  ClipboardList,
  Siren,
];

export default function SolutionsExplorer({
  services,
  detailsLabel,
  includedLabel,
}: SolutionsExplorerProps) {
  const [activeId, setActiveId] = useState(services[0]?.id ?? "");
  const activeIndex = Math.max(
    0,
    services.findIndex((service) => service.id === activeId),
  );
  const activeService = services[activeIndex];

  if (!activeService) return null;

  const ActiveIcon = serviceIcons[activeIndex] ?? ShieldCheck;
  const description = activeService.description.split("\n\n").filter(Boolean);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:gap-8">
      <div
        className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1"
        role="tablist"
        aria-label={detailsLabel}
      >
        {services.map((service, index) => {
          const Icon = serviceIcons[index] ?? ShieldCheck;
          const isActive = service.id === activeService.id;

          return (
            <button
              key={service.id}
              type="button"
              role="tab"
              id={`solution-tab-${service.id}`}
              aria-selected={isActive}
              aria-controls={`solution-panel-${service.id}`}
              onClick={() => setActiveId(service.id)}
              className={cn(
                "group flex min-h-16 touch-manipulation items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b7b51]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4",
                isActive
                  ? "-translate-y-0.5 border-[#a8875d]/45 bg-[#a8875d]/10 shadow-[0_14px_34px_rgba(86,63,34,0.12)] dark:border-[#d9bd8e]/30 dark:bg-[#d9bd8e]/[0.09]"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-[#a8875d]/35 hover:bg-[#a8875d]/[0.04]",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  isActive
                    ? "border-[#9b7b51]/20 bg-[#8b6b42] text-white shadow-sm dark:bg-[#dfc69d] dark:text-[#17130e]"
                    : "border-border bg-background text-muted group-hover:text-foreground",
                )}
              >
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground sm:text-[0.95rem]">
                  {service.title}
                </span>
              </span>
              <ChevronRight
                size={17}
                className={cn(
                  "hidden shrink-0 text-muted transition-transform lg:block",
                  isActive && "translate-x-0.5 text-[#8b6b42] dark:text-[#dfc69d]",
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div className="relative min-w-0 pb-3 pl-0 pt-1 sm:pb-4 lg:pl-3">
        <div className="absolute inset-x-4 bottom-0 top-5 rounded-[1.8rem] border border-[#a8875d]/15 bg-[#a8875d]/[0.045] lg:left-7" />
        <article
          key={activeService.id}
          id={`solution-panel-${activeService.id}`}
          role="tabpanel"
          aria-labelledby={`solution-tab-${activeService.id}`}
          className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_28px_70px_rgba(43,31,17,0.13)] sm:p-7 lg:min-h-[560px] lg:p-9 dark:shadow-[0_28px_80px_rgba(0,0,0,0.28)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(203,170,116,0.14),transparent_34%)] dark:bg-[radial-gradient(circle_at_100%_0%,rgba(226,199,154,0.11),transparent_36%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 border-b border-border/75 pb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#8b6b42] dark:text-[#dfc69d]">
                  {detailsLabel}
                </p>
                <h3 className="mt-2 max-w-2xl text-balance text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                  {activeService.title}
                </h3>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#9b7b51]/20 bg-[#9b7b51]/10 text-[#8b6b42] shadow-sm dark:bg-[#dfc69d]/10 dark:text-[#dfc69d]">
                <ActiveIcon size={23} aria-hidden="true" />
              </span>
            </div>

            <div className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-muted sm:text-base">
              {description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {activeService.bullets?.length ? (
              <div className="mt-7 rounded-2xl border border-border/80 bg-background/65 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">
                  {activeService.bulletsTitle || includedLabel}
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {activeService.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-sm font-medium leading-relaxed text-foreground/82"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8b6b42] text-white dark:bg-[#dfc69d] dark:text-[#17130e]">
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {activeService.outro ? (
              <p className="mt-6 border-l-2 border-[#a8875d] pl-4 text-sm font-semibold leading-relaxed text-foreground sm:text-base">
                {activeService.outro}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
