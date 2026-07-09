"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const t = useTranslations("contact");
  const tInfo = useTranslations("contact.info");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [phoneValue, setPhoneValue] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
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
          message: data.message 
        })
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

  return (
    <div className="flex justify-center w-full">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-card rounded-xl overflow-hidden shadow-2xl border border-border/30">
        
        {/* Contact Info - Left Side */}
        <div className="w-full lg:w-5/12 bg-primary-darker p-8 md:p-12 border-r border-border/20 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Details</h2>
            <p className="text-muted/80 text-sm leading-relaxed mb-10">
              Ready to secure your business? Reach out to our team of experts. We are available for consultations, site assessments, and security operations.
            </p>

            <div className="space-y-8">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 rounded-full border border-border/30 bg-primary-dark/50 flex items-center justify-center text-muted shrink-0">
                  <Mail size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-0.5">Email</span>
                  <a
                    href={`mailto:${tInfo("email")}`}
                    className="text-foreground text-sm font-semibold hover:text-accent transition-colors"
                  >
                    {tInfo("email")}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="w-10 h-10 rounded-full border border-border/30 bg-primary-dark/50 flex items-center justify-center text-muted shrink-0">
                  <Phone size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-0.5">Phone</span>
                  <a
                    href={`tel:${tInfo("phone").replace(/\s/g, "")}`}
                    className="text-foreground text-sm font-semibold hover:text-accent transition-colors"
                  >
                    {tInfo("phone")}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="w-10 h-10 rounded-full border border-border/30 bg-primary-dark/50 flex items-center justify-center text-muted shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-0.5">Location</span>
                  <span className="text-foreground text-sm font-semibold">{tInfo("location")}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Contact Form - Right Side */}
        <div className="w-full lg:w-7/12 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-foreground mb-8">Send a Message</h2>
          
          {status === "success" ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 mb-6">
              <CheckCircle size={20} />
              <p className="text-sm font-medium">{t("form.success")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="relative border-b border-border/50 focus-within:border-accent transition-colors pb-1">
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="peer w-full bg-transparent text-sm text-foreground placeholder-transparent focus:outline-none pt-4"
                  placeholder=" "
                />
                <label
                  htmlFor="name"
                  className="absolute left-0 top-0 text-xs font-medium text-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:text-muted/60 peer-focus:top-0 peer-focus:text-xs peer-focus:text-accent pointer-events-none"
                >
                  {t("form.name")}
                </label>
              </div>

              <div className="relative border-b border-border/50 focus-within:border-accent transition-colors pb-1">
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="peer w-full bg-transparent text-sm text-foreground placeholder-transparent focus:outline-none pt-4"
                  placeholder=" "
                />
                <label
                  htmlFor="email"
                  className="absolute left-0 top-0 text-xs font-medium text-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:text-muted/60 peer-focus:top-0 peer-focus:text-xs peer-focus:text-accent pointer-events-none"
                >
                  {t("form.email")}
                </label>
              </div>

              <div className="group relative border-b border-border/50 focus-within:border-accent transition-colors pb-1 pt-4 [&_.react-tel-input_.form-control]:!bg-transparent [&_.react-tel-input_.form-control]:!border-none [&_.react-tel-input_.form-control]:!text-foreground [&_.react-tel-input_.form-control]:!w-full [&_.react-tel-input_.form-control]:!shadow-none [&_.react-tel-input_.form-control]:!pl-[46px] [&_.react-tel-input_.flag-dropdown]:!bg-transparent [&_.react-tel-input_.flag-dropdown]:!border-none [&_.react-tel-input_.selected-flag]:!bg-transparent [&_.react-tel-input_.selected-flag:hover]:!bg-transparent [&_.react-tel-input_.selected-flag:focus]:!bg-transparent [&_.react-tel-input_.selected-flag]:!outline-none [&_.react-tel-input_.selected-flag]:!shadow-none [&_.react-tel-input_.country-list]:!bg-card [&_.react-tel-input_.country-list]:!border-border/50 [&_.react-tel-input_.country-list]:!text-foreground [&_.react-tel-input_.country-list_.country:hover]:!bg-accent/20 [&_.react-tel-input_.country-list_.country.highlight]:!bg-accent/20 [&_.react-tel-input_.search]:!bg-card [&_.react-tel-input_.search-box]:!bg-primary-darker [&_.react-tel-input_.search-box]:!border-border/50 [&_.react-tel-input_.search-box]:!text-foreground">
                <label
                  htmlFor="phone"
                  className="absolute left-0 top-0 text-xs font-medium text-accent pointer-events-none transition-all group-has-[:placeholder-shown]:text-sm group-has-[:placeholder-shown]:top-[22px] group-has-[:placeholder-shown]:left-[46px] group-has-[:placeholder-shown]:text-muted/60 group-focus-within:!top-0 group-focus-within:!text-xs group-focus-within:!left-0 group-focus-within:!text-accent z-10"
                >
                  {t("form.phone")}
                </label>
                <PhoneInput
                  country="mz"
                  value={phoneValue}
                  onChange={(phone) => setPhoneValue(phone)}
                  enableSearch={true}
                  disableSearchIcon={true}
                  disableCountryCode={true}
                  inputProps={{
                    id: "phone",
                    name: "phone",
                    required: true,
                    className: "form-control placeholder-transparent",
                    placeholder: " "
                  }}
                />
              </div>

              <div className="relative border-b border-border/50 focus-within:border-accent transition-colors pb-1">
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={2}
                  className="peer w-full bg-transparent text-sm text-foreground placeholder-transparent focus:outline-none pt-4 resize-y"
                  placeholder=" "
                />
                <label
                  htmlFor="message"
                  className="absolute left-0 top-0 text-xs font-medium text-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:text-muted/60 peer-focus:top-0 peer-focus:text-xs peer-focus:text-accent pointer-events-none"
                >
                  {t("form.message")}
                </label>
              </div>

              {status === "error" && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{t("form.error")}</p>
                </div>
              )}

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={status === "submitting"} 
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-primary-dark rounded-lg text-sm font-bold flex justify-center items-center gap-2 cursor-pointer active:scale-95 hover:scale-[1.02] hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  {status === "submitting" ? t("form.submitting") : t("form.submit")}
                  <Send size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
