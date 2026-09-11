"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import {
  ArrowUpRight,
  LayoutDashboard,
  Users,
  LockKeyhole,
  UnlockKeyhole,
  Search,
  Download,
  X,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  ArrowRight,
  RefreshCw,
  FileText,
  Phone,
  ExternalLink,
  Eye,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import TechGrid from "@/components/ui/TechGrid";
import LazyVideo from "@/components/ui/LazyVideo";
import DocxViewer from "@/components/admin/DocxViewer";
import { IMAGES } from "@/lib/constants";
import { type Application, type Role, stages } from "@/lib/careers";
import "./admin.css";

const stageLabels: Record<string, string> = {
  new: "New",
  reviewing: "In review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Not selected",
};

export default function AdminPage() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [view, setView] = useState<"applications" | "roles">("applications");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/careers", { cache: "no-store" });
      if (r.status === 401) {
        setAuth(false);
        return;
      }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(
          d.details || d.error || "Could not load applications. Please check connection.",
        );
      }
      const d = await r.json();
      setApplications(d.applications || []);
      setRoles(d.roles || []);
      setUpdated(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAuth(d.authenticated))
      .catch(() => {
        setAuth(false);
        setError("Could not connect to session service.");
      });
  }, []);

  useEffect(() => {
    if (!auth) return;
    const initial = setTimeout(load, 0);
    const timer = setInterval(load, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [auth, load]);

  useEffect(() => {
    if (!selected) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [selected]);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get("password"),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Login failed");
      setAuth(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function change(data: object) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Change could not be saved.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const roleLabel = (id: string) =>
    roles.find((r) => r.id === id)?.en ||
    roles.find((r) => r.id === id)?.pt ||
    id;

  const filtered = applications.filter(
    (a) =>
      (stageFilter === "all" || a.status === stageFilter) &&
      (roleFilter === "all" || a.role === roleFilter) &&
      `${a.name} ${a.email} ${a.whatsapp} ${a.lastProfession} ${a.coverLetter || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  function exportCSV() {
    if (!applications.length) return;
    const keys: (keyof Application)[] = [
      "id",
      "createdAt",
      "name",
      "email",
      "whatsapp",
      "role",
      "status",
      "grade12",
      "sex",
      "ai",
      "experience",
      "lastProfession",
      "shifts",
      "coverLetter",
      "locale",
      "cvName",
      "cvSize",
    ];
    const cell = (v: unknown) =>
      `"${String(v ?? "")
        .replace(/^[=+\-@\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const csvContent =
      "\uFEFF" +
      [
        keys.join(","),
        ...filtered.map((a) => keys.map((k) => cell(a[k])).join(",")),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overwatch-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Loading State
  if (auth === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#090d16] text-white">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <RefreshCw className="animate-spin text-white/80" size={20} />
          <span>Connecting to Overwatch recruitment workspace…</span>
        </div>
      </main>
    );
  }

  // Unauthenticated Login Screen
  if (!auth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#090d16] text-white relative isolate overflow-hidden px-4 py-12">
        {/* Soft Background Video */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <LazyVideo
            className="h-full w-full object-cover mix-blend-luminosity"
            poster={IMAGES.videoPoster}
            rootMargin="700px"
            src={IMAGES.videoSrc}
          />
        </div>
        {/* Soft dark dimming overlay to keep it soft, not too bright, matching Overwatch theme */}
        <div className="absolute inset-0 bg-[#090d16]/80 z-0 pointer-events-none" />
        <TechGrid className="absolute inset-0 opacity-35 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.03),transparent_40%)] pointer-events-none z-0" />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#121827]/95 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <div className="text-center pb-6 border-b border-white/10">
            <div className="flex justify-center mb-4">
              {/* Crisp Light Logo */}
              <Logo size="md" variant="light" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-white/80">
              <ShieldCheck size={13} />
              Talent Operations Portal
            </span>
            <h1 className="mt-3 text-xl font-bold text-white tracking-tight">
              Recruitment Workspace
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Sign in with your administrator key to review applications and manage role availability.
            </p>
          </div>

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-left">
              <span className="text-xs font-semibold text-white/80">
                Admin password
              </span>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter private administrator password"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15 transition-colors"
                />
              </div>
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#090d16] shadow-lg shadow-black/30 transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {busy ? <RefreshCw className="animate-spin" size={16} /> : null}
              <span>{busy ? "Authenticating…" : "Enter Workspace"}</span>
              {!busy && <ArrowRight size={16} />}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs text-white/50">
              <span className="flex items-center gap-1">
                <LockKeyhole size={12} /> Confidential access
              </span>
              <Link
                href="/en/careers"
                target="_blank"
                className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                View Careers Page <ExternalLink size={12} />
              </Link>
            </div>
          </form>
        </div>
      </main>
    );
  }

  const current = selected
    ? applications.find((a) => a.id === selected.id) || selected
    : null;

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col lg:flex-row relative isolate overflow-x-hidden">
      <TechGrid className="fixed inset-0 opacity-25 pointer-events-none" />

      {/* ─── SIDEBAR (STICKY NAVIGATION WITH CRISP LIGHT LOGO) ────── */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0e1320]/95 p-5 lg:p-6 flex flex-col z-20 backdrop-blur-md lg:sticky lg:top-0 lg:h-screen">
        {/* Brand Header with Light Logo */}
        <div className="pb-6 border-b border-white/10">
          <Link href="/admin" className="block">
            <Logo size="sm" variant="light" />
          </Link>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-white/60">
              Recruitment Portal
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-6 space-y-1.5">
          <button
            onClick={() => setView("applications")}
            className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all cursor-pointer ${
              view === "applications"
                ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard size={17} />
              <span>Applications</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                view === "applications"
                  ? "bg-white/25 text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {applications.length}
            </span>
          </button>

          <button
            onClick={() => setView("roles")}
            className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all cursor-pointer ${
              view === "roles"
                ? "bg-white/[0.1] text-white border border-white/20 shadow-sm"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal size={17} />
              <span>Manage Roles</span>
            </div>
            <span className="text-[0.65rem] font-mono text-emerald-400">
              {roles.filter((r) => r.open).length} open
            </span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
          <a
            href="/en/careers"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white/70 hover:text-white hover:border-white/25 transition-all"
          >
            <span>View live careers page</span>
            <ArrowUpRight size={14} />
          </a>

          <button
            onClick={async () => {
              try {
                await fetch("/api/admin/session", { method: "DELETE" });
                setAuth(false);
                setApplications([]);
                setSelected(null);
              } catch {
                setError("Sign out failed");
              }
            }}
            className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────────────────── */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
              <span>Overwatch</span>
              <span>/</span>
              <span className="text-white/90 capitalize">
                {view === "roles" ? "Manage Roles" : "Candidate Applications"}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {view === "roles"
                ? "Role Availability"
                : "Recruitment Pipeline"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void load()}
              aria-label="Refresh data"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              <span>{updated ? `Updated ${updated}` : "Refresh"}</span>
            </button>

            {view === "applications" && (
              <button
                onClick={exportCSV}
                disabled={!filtered.length}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#090d16] shadow-sm hover:bg-white/90 disabled:opacity-50 cursor-pointer transition-transform hover:-translate-y-0.5"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-400"
          >
            {error}
          </div>
        )}

        {/* ─── STATS CARDS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>Total Applicants</span>
              <Users size={16} className="text-white/70" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-white">
              {applications.length}
            </strong>
            <span className="text-[0.7rem] text-white/40">All registered candidates</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>Pending Review</span>
              <LayoutDashboard size={16} className="text-amber-400" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-amber-400">
              {applications.filter((a) => a.status === "new").length}
            </strong>
            <span className="text-[0.7rem] text-white/40">Requires initial screening</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>Shortlisted</span>
              <ShieldCheck size={16} className="text-emerald-400" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-emerald-400">
              {
                applications.filter((a) =>
                  ["shortlisted", "interview"].includes(a.status),
                ).length
              }
            </strong>
            <span className="text-[0.7rem] text-white/40">Moving to interviews</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121827]/90 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
              <span>Open Roles</span>
              <UnlockKeyhole size={16} className="text-white/70" />
            </div>
            <strong className="mt-2 block text-2xl sm:text-3xl font-bold text-white">
              {roles.filter((r) => r.open).length}
            </strong>
            <span className="text-[0.7rem] text-white/40">Of {roles.length} total roles</span>
          </div>
        </div>

        {/* ─── TAB 1: MANAGE ROLES VIEW ─────────────────────────────── */}
        {view === "roles" ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">
                  Public Role Availability
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  Toggle roles open or closed. Locked roles will show a padlock icon on the careers page and prevent submissions.
                </p>
              </div>

              <div className="space-y-3">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                          r.open
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-white/10 bg-white/[0.05] text-white/50"
                        }`}
                      >
                        {r.open ? (
                          <UnlockKeyhole size={19} />
                        ) : (
                          <LockKeyhole size={19} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {r.en}
                        </h3>
                        <p className="text-xs text-white/50">{r.pt}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`text-xs font-semibold ${
                          r.open ? "text-emerald-400" : "text-white/40"
                        }`}
                      >
                        {r.open ? "Accepting applications" : "Locked / Closed"}
                      </span>

                      {/* Toggle Switch */}
                      <button
                        role="switch"
                        aria-checked={r.open}
                        disabled={busy}
                        onClick={() =>
                          void change({
                            kind: "role",
                            id: r.id,
                            open: !r.open,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          r.open ? "bg-emerald-600" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            r.open ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-white/15 bg-white/[0.04] p-4 text-xs text-white/80">
                <span className="font-semibold text-white">Live synchronization:</span>{" "}
                Changes save instantly to database and sync to the live careers page within seconds.
              </div>
            </div>
          </section>
        ) : (
          /* ─── TAB 2: APPLICATIONS PIPELINE VIEW ──────────────────── */
          <section className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#121827]/95 p-4 shadow-sm">
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  aria-label="Search candidates"
                  placeholder="Search name, email, WhatsApp, profession, cover letter…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none transition-colors"
                />
              </div>

              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#121827] px-3 py-2 text-xs text-white focus:border-white/40 focus:outline-none cursor-pointer"
              >
                <option value="all">All roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.en}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by stage"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#121827] px-3 py-2 text-xs text-white focus:border-white/40 focus:outline-none cursor-pointer"
              >
                <option value="all">All stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {stageLabels[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Candidate Table */}
            <div className="rounded-2xl border border-white/10 bg-[#121827]/95 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/60 uppercase font-semibold text-[0.68rem] tracking-wider">
                      <th className="px-4 py-3.5">Candidate</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">WhatsApp</th>
                      <th className="px-4 py-3.5">Cover Letter</th>
                      <th className="px-4 py-3.5">12th Grade</th>
                      <th className="px-4 py-3.5">Sex</th>
                      <th className="px-4 py-3.5">AI User</th>
                      <th className="px-4 py-3.5">CCTV Exp.</th>
                      <th className="px-4 py-3.5">Last Profession</th>
                      <th className="px-4 py-3.5">2D/2N Shifts</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">CV</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((a) => (
                      <tr
                        key={a.id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        {/* Candidate Name & Email */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => setSelected(a)}
                            className="flex items-center gap-2.5 text-left cursor-pointer group"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15 text-white font-bold text-xs">
                              {a.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </span>
                            <div>
                              <strong className="block text-white font-medium group-hover:text-white/80 transition-colors">
                                {a.name}
                              </strong>
                              <span className="text-[0.68rem] text-white/40">
                                {a.email}
                              </span>
                            </div>
                          </button>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3 whitespace-nowrap text-white/80">
                          {roleLabel(a.role)}
                        </td>

                        {/* Stage Selector Dropdown */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            aria-label={`Stage for ${a.name}`}
                            value={a.status}
                            disabled={busy}
                            onChange={(e) =>
                              void change({
                                kind: "status",
                                id: a.id,
                                status: e.target.value,
                              })
                            }
                            className={`rounded-lg border px-2.5 py-1 text-[0.7rem] font-semibold bg-[#121827] focus:outline-none cursor-pointer ${
                              a.status === "hired"
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                : a.status === "shortlisted" ||
                                    a.status === "interview"
                                  ? "border-white/30 text-white bg-white/10"
                                  : a.status === "rejected"
                                    ? "border-red-500/30 text-red-400 bg-red-500/10"
                                    : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                            }`}
                          >
                            {stages.map((s) => (
                              <option key={s} value={s}>
                                {stageLabels[s]}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* WhatsApp */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <a
                            href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <Phone size={12} />
                            <span>{a.whatsapp}</span>
                          </a>
                        </td>

                        {/* Cover Letter Preview */}
                        <td className="px-4 py-3 max-w-[160px] truncate text-white/60">
                          {a.coverLetter ? (
                            <button
                              type="button"
                              onClick={() => setSelected(a)}
                              className="text-left truncate hover:text-white hover:underline cursor-pointer"
                            >
                              {a.coverLetter}
                            </button>
                          ) : (
                            <span className="text-white/30 italic">None</span>
                          )}
                        </td>

                        {/* Grade 12 */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.grade12 === "yes" ? (
                            <span className="text-emerald-400">Yes</span>
                          ) : (
                            <span className="text-white/40">No</span>
                          )}
                        </td>

                        {/* Sex */}
                        <td className="px-4 py-3 whitespace-nowrap capitalize text-white/70">
                          {a.sex}
                        </td>

                        {/* Uses AI */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.ai === "yes" ? (
                            <span className="text-emerald-400 font-medium">Yes</span>
                          ) : (
                            <span className="text-white/40">No</span>
                          )}
                        </td>

                        {/* CCTV Experience */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.experience === "yes" ? (
                            <span className="text-emerald-400 font-medium">Yes</span>
                          ) : (
                            <span className="text-white/40">No</span>
                          )}
                        </td>

                        {/* Last Profession */}
                        <td className="px-4 py-3 max-w-[140px] truncate text-white/80">
                          {a.lastProfession}
                        </td>

                        {/* Shifts */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.shifts === "yes" ? (
                            <span className="text-emerald-400 font-medium">Available</span>
                          ) : (
                            <span className="text-red-400">No</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-white/50">
                          {new Date(a.createdAt).toLocaleDateString("en-GB")}
                        </td>

                        {/* CV View & Download */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`/api/admin/cv?id=${a.id}&inline=1`}
                              target="_blank"
                              rel="noreferrer"
                              title="View attached CV"
                              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-2 py-1 text-[0.7rem] font-medium text-white hover:bg-white/[0.1] hover:border-white/30 transition-colors"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </a>
                            <a
                              href={`/api/admin/cv?id=${a.id}`}
                              title="Download CV"
                              className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.05] p-1 text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors"
                            >
                              <Download size={12} />
                            </a>
                          </div>
                        </td>

                        {/* View Button */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelected(a)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[0.7rem] font-semibold text-white hover:bg-white/15 transition-all cursor-pointer"
                          >
                            <span>Profile</span>
                            <ArrowUpRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty state */}
              {!filtered.length && (
                <div className="py-16 text-center">
                  <Users size={32} className="mx-auto text-white/30 mb-3" />
                  <h3 className="text-sm font-semibold text-white">
                    {applications.length
                      ? "No matching candidates"
                      : "No applications submitted yet"}
                  </h3>
                  <p className="mt-1 text-xs text-white/50">
                    {applications.length
                      ? "Try adjusting your search query or filters."
                      : "New candidate submissions from the careers page will appear here instantly."}
                  </p>
                </div>
              )}

              {/* Table Footer */}
              <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-4 py-3 text-[0.7rem] text-white/50">
                <span>
                  Showing {filtered.length} of {applications.length} applications
                </span>
                <span className="hidden sm:inline">
                  Scroll table horizontally for full candidate answers →
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── CANDIDATE PROFILE MODAL DRAWER ─────────────────────────── */}
      {current && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-full bg-[#0e1320] border-l border-white/10 p-6 sm:p-8 overflow-y-auto space-y-6 shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <div>
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-white/60">
                  Candidate Profile
                </span>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {current.name}
                </h2>
                <p className="text-xs text-white/60">
                  {roleLabel(current.role)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white/70 hover:bg-white/[0.1] hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stage Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">
                Recruitment Stage:
              </label>
              <select
                value={current.status}
                disabled={busy}
                onChange={(e) =>
                  void change({
                    kind: "status",
                    id: current.id,
                    status: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/15 bg-[#121827] px-3.5 py-2.5 text-xs font-semibold text-white focus:border-white/40 focus:outline-none cursor-pointer"
              >
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {stageLabels[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Cover Letter Section (Highlighted Card) */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/90">
                <FileText size={15} />
                <span>Cover Letter / Carta de Apresentação</span>
              </div>
              <p className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap">
                {current.coverLetter || (
                  <span className="italic text-white/40">
                    No cover letter was submitted with this application.
                  </span>
                )}
              </p>
            </div>

            {/* Candidate Answers Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
                Application Answers
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">Email</span>
                  <a
                    href={`mailto:${current.email}`}
                    className="mt-1 font-semibold text-white hover:underline truncate block"
                  >
                    {current.email}
                  </a>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">WhatsApp</span>
                  <a
                    href={`https://wa.me/${current.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Phone size={12} />
                    <span>{current.whatsapp}</span>
                  </a>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">12th Grade</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.grade12 === "yes" ? "Completed" : "Not completed"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">Sex</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.sex}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">Uses Artificial Intelligence</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.ai === "yes" ? "Yes" : "No"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">CCTV / Security Experience</span>
                  <strong className="mt-1 block text-white capitalize">
                    {current.experience === "yes" ? "Yes" : "No"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 col-span-2">
                  <span className="text-white/40 block text-[0.68rem]">Last Profession</span>
                  <strong className="mt-1 block text-white">
                    {current.lastProfession}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 col-span-2">
                  <span className="text-white/40 block text-[0.68rem]">Shift Rotation (2D / 2N / 2 Off)</span>
                  <strong className="mt-1 block text-white">
                    {current.shifts === "yes"
                      ? "Available for 2 days, 2 nights, 2 off"
                      : "Not available"}
                  </strong>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">Submitted Date</span>
                  <span className="mt-1 block text-white/70">
                    {new Date(current.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <span className="text-white/40 block text-[0.68rem]">Language</span>
                  <span className="mt-1 block text-white/70 uppercase">
                    {current.locale}
                  </span>
                </div>
              </div>
            </div>

            {/* Attached CV Section with Embedded Document Viewer */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                  <FileText size={15} className="text-emerald-400" />
                  <span>Curriculum Vitae (CV) Anexo</span>
                </h3>
                <span className="text-[0.68rem] text-white/50">
                  {Math.round(current.cvSize / 1024)} KB · {current.cvType.includes("pdf") ? "PDF" : "Document"}
                </span>
              </div>

              {/* Embedded Document Frame (for PDFs and Word documents) */}
              {current.cvType === "application/pdf" || current.cvName.toLowerCase().endsWith(".pdf") ? (
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] border-b border-white/10 text-xs">
                    <span className="text-white/80 font-medium truncate max-w-[220px]">
                      {current.cvName}
                    </span>
                    <a
                      href={`/api/admin/cv?id=${current.id}&inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Full screen</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <iframe
                    src={`/api/admin/cv?id=${current.id}&inline=1`}
                    title={`CV - ${current.name}`}
                    className="w-full h-80 sm:h-96 border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-black/60 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] border-b border-white/10 text-xs">
                    <span className="text-white/80 font-medium truncate max-w-[220px]">
                      {current.cvName}
                    </span>
                    <span className="text-[0.68rem] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Word Document Preview
                    </span>
                  </div>
                  <DocxViewer
                    url={`/api/admin/cv?id=${current.id}&inline=1`}
                  />
                </div>
              )}

              {/* Action Buttons: View in New Tab & Download */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href={`/api/admin/cv?id=${current.id}&inline=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Eye size={14} />
                  <span>Open in Tab</span>
                  <ExternalLink size={12} className="opacity-60" />
                </a>

                <a
                  href={`/api/admin/cv?id=${current.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#090d16] shadow-md hover:bg-white/90 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download CV</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
