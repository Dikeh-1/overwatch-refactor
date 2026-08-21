"use client";

import { useState, FormEvent, useRef } from "react";
import { Send, CheckCircle, AlertCircle, Upload, X, FileText, Loader2 } from "lucide-react";

type FormStatus = "idle" | "submitting" | "success" | "error";

const POSITIONS = [
  "AI Monitoring Operator",
  "Security Operations Manager",
  "Technical Support Specialist",
  "Sales & Business Development",
  "General Application",
];

export default function CareersForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/careers", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const kb = file.size / 1024;
    setFileSize(kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setFileName("");
    setFileSize("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
            <CheckCircle className="text-accent" size={44} />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
        </div>
        <h3 className="text-3xl font-bold text-foreground mb-3">Application Sent!</h3>
        <p className="text-muted text-lg max-w-md mb-8 leading-relaxed">
          Thank you for applying. Our HR team will review your profile and get back to you shortly.
        </p>
        <button
          onClick={() => { setStatus("idle"); setFileName(""); setFileSize(""); }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-all duration-300 cursor-pointer"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row 1: Name + Email */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="group">
          <label htmlFor="cf-name" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Full Name <span className="text-accent">*</span>
          </label>
          <input
            id="cf-name"
            name="name"
            type="text"
            required
            placeholder="e.g. João Machava"
            className="w-full px-4 py-3 rounded-xl bg-primary-darker border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all duration-300"
          />
        </div>
        <div className="group">
          <label htmlFor="cf-email" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Email Address <span className="text-accent">*</span>
          </label>
          <input
            id="cf-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl bg-primary-darker border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all duration-300"
          />
        </div>
      </div>

      {/* Row 2: Phone + Position */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="cf-phone" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Phone Number <span className="text-accent">*</span>
          </label>
          <input
            id="cf-phone"
            name="phone"
            type="tel"
            required
            placeholder="+258 85 000 0000"
            className="w-full px-4 py-3 rounded-xl bg-primary-darker border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all duration-300"
          />
        </div>
        <div>
          <label htmlFor="cf-position" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Position Applying For <span className="text-accent">*</span>
          </label>
          <select
            id="cf-position"
            name="position"
            required
            className="w-full px-4 py-3 rounded-xl bg-primary-darker border border-border text-foreground focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all duration-300 appearance-none cursor-pointer"
          >
            <option value="" className="bg-primary-darker text-foreground">Select a position…</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p} className="bg-primary-darker text-foreground">{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CV Upload */}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Upload CV / Resume <span className="text-accent">*</span>
        </label>
        <input
          ref={fileInputRef}
          id="cf-cv"
          name="cv"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          className="hidden"
        />

        {!fileName ? (
          <label
            htmlFor="cf-cv"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
            className={`flex flex-col items-center justify-center gap-3 w-full py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
              dragOver
                ? "border-accent bg-accent/10 scale-[1.01]"
                : "border-border hover:border-accent/50 hover:bg-primary-darker/50"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Upload className="text-accent" size={22} />
            </div>
            <div className="text-center">
              <p className="text-foreground font-semibold">Drop your CV here or <span className="text-accent">browse</span></p>
              <p className="text-muted text-sm mt-1">PDF, DOC or DOCX — max 5 MB</p>
            </div>
          </label>
        ) : (
          <div className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-accent/8 border border-accent/25">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <FileText className="text-accent" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold truncate">{fileName}</p>
              <p className="text-muted text-sm">{fileSize}</p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="w-8 h-8 rounded-full bg-primary-darker hover:bg-border flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Remove file"
            >
              <X size={16} className="text-muted" />
            </button>
          </div>
        )}
      </div>

      {/* Cover Message */}
      <div>
        <label htmlFor="cf-message" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Cover Message
        </label>
        <textarea
          id="cf-message"
          name="message"
          rows={5}
          placeholder="Tell us about yourself, your experience, and why you'd like to join Overwatch…"
          className="w-full px-4 py-3 rounded-xl bg-primary-darker border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 transition-all duration-300 resize-none"
        />
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/25 text-red-700 dark:text-red-300">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm">Something went wrong. Please try again or email us directly at comercial@overwatchmoz.com</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-accent text-primary-darker font-bold text-base cursor-pointer hover:bg-accent/90 hover:scale-[1.01] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(96,165,250,0.25)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Sending Application…
          </>
        ) : (
          <>
            <Send size={18} />
            Submit Application
          </>
        )}
      </button>
    </form>
  );
}
