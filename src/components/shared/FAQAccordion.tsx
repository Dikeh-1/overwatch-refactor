"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FAQItem = {
  question: string;
  answer: string;
};

type QuickFilter = {
  label: string;
  query: string;
};

type FAQAccordionProps = {
  limit?: number;
  searchable?: boolean;
};

export default function FAQAccordion({ limit, searchable = false }: FAQAccordionProps) {
  const t = useTranslations("faq");
  const allItems = t.raw("items") as FAQItem[];
  const quickFilters = searchable ? (t.raw("quickFilters") as QuickFilter[]) : [];
  const items = limit ? allItems.slice(0, limit) : allItems;
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const accordionId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const visibleItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (!normalizedQuery) return true;
      const searchableText = `${item.question} ${item.answer}`.toLocaleLowerCase();
      const words: string[] = searchableText.match(/[\p{L}\p{N}]+/gu) ?? [];
      return searchTerms.every((term) =>
        term.length <= 2 ? words.includes(term) : searchableText.includes(term),
      );
    });

  return (
    <div>
      {searchable && (
        <div className="mb-5 rounded-[1.35rem] border border-border bg-card p-3 shadow-[0_16px_42px_rgba(2,6,23,0.075)] sm:mb-6 sm:p-4">
          <div className="relative">
            <label htmlFor={`${accordionId}-search`} className="sr-only">
              {t("searchLabel")}
            </label>
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              id={`${accordionId}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-h-14 w-full appearance-none rounded-2xl border border-border bg-background py-3 pl-12 pr-12 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted/75 focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                aria-label={t("clearSearch")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOpenQuestion(null);
              }}
              className={cn(
                "min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35",
                !normalizedQuery
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {t("allQuestions")}
            </button>
            {quickFilters.map((filter) => {
              const isActive = normalizedQuery === filter.query.toLocaleLowerCase();
              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => {
                    setQuery(filter.query);
                    setOpenQuestion(null);
                  }}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted hover:border-foreground/20 hover:text-foreground",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-muted">
            <span>{t("resultsLabel", { count: visibleItems.length })}</span>
            <span className="h-px flex-1 bg-border/75" aria-hidden="true" />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.map(({ item, index }) => {
          const isOpen = openQuestion === item.question;
          const triggerId = `${accordionId}-trigger-${index}`;
          const panelId = `${accordionId}-panel-${index}`;

          return (
            <div
              key={item.question}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_0_rgba(255,255,255,0.05),0_8px_24px_rgba(2,6,23,0.05)] transition-[transform,border-color,box-shadow] duration-300",
                isOpen
                  ? "-translate-y-0.5 border-foreground/25 shadow-[0_1px_0_rgba(255,255,255,0.08),0_18px_44px_rgba(2,6,23,0.12)]"
                  : "border-border hover:-translate-y-0.5 hover:border-foreground/20",
              )}
            >
              <button
                id={triggerId}
                type="button"
                className="flex min-h-[76px] w-full touch-manipulation items-center gap-3 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/35 sm:gap-4 sm:px-5"
                onClick={() => setOpenQuestion(isOpen ? null : item.question)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold tabular-nums transition-colors",
                    isOpen
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted group-hover:border-foreground/25 group-hover:text-foreground",
                  )}
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 pr-1 text-[0.95rem] font-semibold leading-snug text-foreground sm:text-base">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted transition-[transform,color,border-color] duration-300",
                    isOpen && "rotate-180 border-foreground/25 text-foreground",
                  )}
                  aria-hidden="true"
                >
                  <ChevronDown size={18} />
                </span>
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                aria-hidden={!isOpen}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border/70 px-4 pb-5 pt-4 sm:ml-[3.25rem] sm:px-5 sm:pb-6">
                    <div className="mb-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-foreground">
                      <ShieldCheck size={14} aria-hidden="true" />
                      {t("answerLabel")}
                    </div>
                    <p className="text-[0.95rem] leading-relaxed text-muted sm:text-base">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {visibleItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center shadow-sm sm:px-8">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted">
              <Search size={20} aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{t("noResultsTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              {t("noResultsDescription")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
