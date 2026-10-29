"use client";

import React from "react";
import Image from "next/image";
import { Inter } from "next/font/google";
import { parseSlotComponents, formatSlotDisplay } from "@/lib/careers";
import { siteContact } from "@/lib/site-config";

const inter = Inter({ subsets: ["latin"], display: "swap" });

/**
 * Shared shell for every candidate-facing recruitment page
 * (test booking, training booking, next-phase confirmation).
 *
 * Palette is strictly the Overwatch brand: ink #1a1a2e on white / #f6f7f9,
 * neutral greys for secondary text and hairline borders. No accent colours.
 */
export function PortalShell({
  isPt,
  label,
  children,
}: {
  isPt: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} portal-root min-h-screen bg-[#f6f7f9] text-[#1a1a2e] antialiased`}>
      <style>{`
        /* Standalone page: hide public-site navigation, footer and floating helpers */
        header:not(.portal-header) { display: none !important; }
        footer:not(.portal-footer) { display: none !important; }
        [class*="ZohoChatbot"], [id*="zoho"], [id*="zsiq"], [class*="zsiq"] { display: none !important; }
        [class*="ScrollToTop"] { display: none !important; }
        [class*="LaunchExperience"] { display: none !important; }
        main { padding-top: 0 !important; margin-top: 0 !important; }
        body { background: #f6f7f9 !important; }

        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: #ffffff !important; color: #1a1a2e !important; }
          .no-print, header, footer, iframe, .fixed,
          [id^="zsiq"], [class*="zsiq"], [id*="zoho"] { display: none !important; }
          .portal-root { background: #ffffff !important; min-height: 0 !important; }
          .portal-body { padding: 0 !important; max-width: none !important; }
          .print-slip { border: 1px solid #d4d6dc !important; box-shadow: none !important; page-break-inside: avoid !important; break-inside: avoid !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="portal-header no-print border-b border-[#e6e7eb] bg-white">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between px-5">
          <Image src="/logo.png" alt="Overwatch" width={132} height={20} className="h-[18px] w-auto" priority />
          <span className="text-[13px] font-medium text-[#6b6f7b]">
            {label || (isPt ? "Recrutamento" : "Recruitment")}
          </span>
        </div>
      </div>

      <div className="portal-body mx-auto max-w-[720px] px-5 pb-16 pt-8 sm:pt-12">{children}</div>

      <div className="portal-footer no-print border-t border-[#e6e7eb] bg-white">
        <div className="mx-auto flex max-w-[720px] flex-col gap-1 px-5 py-6 text-[13px] text-[#6b6f7b] sm:flex-row sm:items-center sm:justify-between">
          <span>Overwatch Moçambique, Lda.</span>
          <a href={`mailto:${siteContact.email}`} className="hover:text-[#1a1a2e]">
            {siteContact.email}
          </a>
        </div>
      </div>
    </div>
  );
}

/** Page heading: small overline, name/title, supporting line. */
export function PortalHeading({
  overline,
  title,
  meta,
}: {
  overline: string;
  title: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <p className="text-[13px] font-medium text-[#6b6f7b]">{overline}</p>
      <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">{title}</h1>
      {meta && <div className="mt-2 text-[15px] text-[#4a4e5a]">{meta}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#e6e7eb] bg-white ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[15px] font-semibold">{children}</h2>;
}

/** Label / value pair used in slips and info blocks. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#8a8e99]">{label}</dt>
      <dd className="mt-1 text-[15px] leading-relaxed text-[#1a1a2e]">{children}</dd>
    </div>
  );
}

/** Plain list with thin dashes — no icons. */
export function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
          <span className="mt-[11px] h-px w-3 shrink-0 bg-[#9a9ea8]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Neutral notice: ink rule on the left, no colour fills. */
export function Notice({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e6e7eb] border-l-[3px] border-l-[#1a1a2e] bg-white px-4 py-3.5">
      {title && <p className="text-[14px] font-semibold">{title}</p>}
      <div className={`text-[14px] leading-relaxed text-[#4a4e5a] ${title ? "mt-1" : ""}`}>{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1a1a2e] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#2d2d44] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d4d6dc] bg-white px-5 text-[14px] font-medium text-[#1a1a2e] transition-colors hover:border-[#1a1a2e] ${className}`}
    />
  );
}

/** Selectable option row (radio semantics). */
export function OptionRow({
  selected,
  disabled,
  onSelect,
  title,
  subtitle,
  aside,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-lg border bg-white px-4 py-4 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed border-[#eceef1] bg-[#fafafb]"
          : selected
            ? "border-[#1a1a2e] shadow-[inset_0_0_0_1px_#1a1a2e]"
            : "border-[#e6e7eb] hover:border-[#9a9ea8]"
      }`}
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
          disabled ? "border-[#d4d6dc]" : selected ? "border-[#1a1a2e]" : "border-[#b8bbc3]"
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${disabled ? "text-[#9a9ea8] line-through" : ""}`}>{title}</span>
        {subtitle && <span className={`mt-0.5 block text-[13px] ${disabled ? "text-[#b0b3bb]" : "text-[#6b6f7b]"}`}>{subtitle}</span>}
      </span>
      {aside && <span className={`shrink-0 text-[13px] ${disabled ? "text-[#9a9ea8]" : "text-[#6b6f7b]"}`}>{aside}</span>}
    </button>
  );
}

export function StatusTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#1a1a2e] px-2.5 py-1 text-[12px] font-medium text-white">
      {children}
    </span>
  );
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Split a slot into a human date line and a time line. */
export function splitSlot(slot: string | null | undefined, isPt: boolean): { date: string; time: string } {
  if (!slot) return { date: "", time: "" };
  const p = parseSlotComponents(slot);
  if (!p) return { date: formatSlotDisplay(slot, isPt), time: "" };
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  const date = new Intl.DateTimeFormat(isPt ? "pt-PT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  const hh = String(p.hour).padStart(2, "0");
  const mm = String(p.minute).padStart(2, "0");
  return {
    date: capitalize(date),
    time: isPt ? `${hh}h${mm} · Hora de Maputo` : `${hh}:${mm} · Maputo time`,
  };
}
