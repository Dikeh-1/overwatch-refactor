"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { adminParent, adminCommunicationsTarget } from "@/lib/admin-navigation";
import { useAdminLanguage } from "./AdminLanguageContext";

export function AdminSectionNavigation() {
  const path = usePathname(), params = useSearchParams(), router = useRouter();
  const { t } = useAdminLanguage();
  return <div className="flex shrink-0 items-center gap-2">
    <button type="button" aria-label={t("Back to previous section", "Voltar à secção anterior")} title={t("Back", "Voltar")} onClick={() => {
      const event = new Event("admin:back", { cancelable: true });
      if (window.dispatchEvent(event)) router.push(adminParent(path, new URLSearchParams(params)));
    }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"><ArrowLeft size={15}/><span className="hidden sm:inline">{t("Back", "Voltar")}</span></button>
    <Link href={adminCommunicationsTarget(path, new URLSearchParams(params))} title={t("Communications", "Comunicações")} aria-label={t("Open communications", "Abrir comunicações")} className="inline-flex items-center gap-1 rounded-md border border-sky-200 px-2 py-1.5 text-xs text-sky-700 hover:bg-sky-50"><Mail size={15}/><span className="hidden md:inline">{t("Communications", "Comunicações")}</span></Link>
  </div>;
}
