"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import PhoneInput from "react-phone-input-2";
import phoneLocalePt from "react-phone-input-2/lang/pt.json";
import "react-phone-input-2/lib/style.css";
import { getGoogleMapsUrl, getSiteAddress, siteContact } from "@/lib/site-config";

type FormStatus = "idle" | "submitting" | "success" | "error";

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-border bg-background/70 px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted/55 focus:border-foreground/35 focus:bg-background focus:ring-4 focus:ring-foreground/[0.055]";

export default function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [phoneValue, setPhoneValue] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: phoneValue,
          message: data.message,
          locale,
        }),
      });

      if (response.ok) {
        setStatus("success");
        form.reset();
        setPhoneValue("");
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const contactItems = [
    {
      label: t("details.email"),
      value: siteContact.email,
      href: `mailto:${siteContact.email}`,
      icon: Mail,
      external: false,
    },
    {
      label: t("details.phone"),
      value: siteContact.phone,
      href: `tel:${siteContact.phoneHref}`,
      icon: Phone,
      external: false,
    },
    {
      label: t("details.location"),
      value: getSiteAddress(locale),
      href: getGoogleMapsUrl(locale),
      icon: MapPin,
      external: true,
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_28px_90px_rgba(2,6,23,0.12)] lg:grid-cols-[0.82fr_1.18fr]">
      <aside className="dark relative overflow-hidden bg-[#111722] p-6 text-white sm:p-8 lg:p-10">
        <div className="absolute inset-0 tech-grid opacity-25" />
        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-white/45">
            {t("form.detailsEyebrow")}
          </p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">
            {t("form.detailsTitle")}
          </h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/62 sm:text-base">
            {t("form.detailsDescription")}
          </p>

          <div className="mt-8 space-y-3">
            {contactItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="group flex min-h-16 items-start gap-3 rounded-2xl border border-white/[0.085] bg-white/[0.04] p-3.5 transition-[border-color,background-color] hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white/75">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[0.62rem] font-bold uppercase tracking-[0.15em] text-white/38">
                      {item.label}
                    </span>
                    <span className="mt-1 flex items-start gap-1.5 break-words text-sm font-semibold leading-relaxed text-white/82">
                      {item.value}
                      {item.external ? (
                        <ExternalLink size={13} className="mt-1 shrink-0 text-white/38" aria-hidden="true" />
                      ) : null}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="p-6 sm:p-8 lg:p-10">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-muted">
            {t("form.messageEyebrow")}
          </p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {t("form.messageTitle")}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t("form.messageDescription")}
          </p>
        </div>

        {status === "success" ? (
          <div className="mt-8 flex min-h-40 items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={21} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium leading-relaxed">{t("form.success")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block text-xs font-semibold text-foreground/75">
                  {t("form.name")}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  autoComplete="name"
                  className={fieldClassName}
                  placeholder={t("form.namePlaceholder")}
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-semibold text-foreground/75">
                  {t("form.email")}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  className={fieldClassName}
                  placeholder={t("form.emailPlaceholder")}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-xs font-semibold text-foreground/75">
                {t("form.phone")}
              </label>
              <div className="[&_.react-tel-input]:!w-full [&_.react-tel-input_.form-control]:!h-12 [&_.react-tel-input_.form-control]:!w-full [&_.react-tel-input_.form-control]:!rounded-xl [&_.react-tel-input_.form-control]:!border-border [&_.react-tel-input_.form-control]:!bg-background/70 [&_.react-tel-input_.form-control]:!pl-[50px] [&_.react-tel-input_.form-control]:!text-sm [&_.react-tel-input_.form-control]:!text-foreground [&_.react-tel-input_.form-control]:!shadow-none [&_.react-tel-input_.form-control:focus]:!border-foreground/35 [&_.react-tel-input_.flag-dropdown]:!rounded-l-xl [&_.react-tel-input_.flag-dropdown]:!border-border [&_.react-tel-input_.flag-dropdown]:!bg-transparent [&_.react-tel-input_.selected-flag]:!rounded-l-xl [&_.react-tel-input_.selected-flag]:!bg-transparent [&_.react-tel-input_.country-list]:!border-border [&_.react-tel-input_.country-list]:!bg-card [&_.react-tel-input_.country-list]:!text-foreground [&_.react-tel-input_.country-list_.country.highlight]:!bg-primary-darker [&_.react-tel-input_.country-list_.country:hover]:!bg-primary-darker [&_.react-tel-input_.search]:!bg-card [&_.react-tel-input_.search-box]:!border-border [&_.react-tel-input_.search-box]:!bg-background [&_.react-tel-input_.search-box]:!text-foreground">
                <PhoneInput
                  country="mz"
                  value={phoneValue}
                  onChange={(phone) => setPhoneValue(phone)}
                  enableSearch
                  disableSearchIcon
                  disableCountryCode
                  localization={locale === "pt" ? phoneLocalePt : undefined}
                  inputProps={{
                    id: "phone",
                    name: "phone",
                    required: true,
                    autoComplete: "tel",
                    "aria-label": t("form.phone"),
                    placeholder: t("form.phonePlaceholder"),
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-xs font-semibold text-foreground/75">
                {t("form.message")}
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className={`${fieldClassName} min-h-36 resize-y py-3.5`}
                placeholder={t("form.messagePlaceholder")}
              />
            </div>

            {status === "error" ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-700 dark:text-red-300">
                <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium leading-relaxed">{t("form.error")}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background shadow-sm transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-foreground/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-4 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
            >
              {status === "submitting" ? t("form.submitting") : t("form.submit")}
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
