"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Search,
  Phone,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
} from "lucide-react";
import { siteContact, getGoogleMapsUrl } from "@/lib/site-config";

type CheckInResult = {
  success: boolean;
  verified?: boolean;
  wrongDay?: boolean;
  disqualified?: boolean;
  notBooked?: boolean;
  error?: string;
  message?: string;
  candidate?: {
    id: string;
    name: string;
    testSlot?: string;
    attendedAt?: string;
    attendanceStatus?: string;
    whatsapp?: string;
    email?: string;
  };
  scheduledSlot?: string;
  candidateName?: string;
  todayDay?: number;
  bookedDay?: number;
};

function CheckInContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || "pt";
  const isPt = locale !== "en";

  const initialId = searchParams.get("id") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);

  const mapsUrl = getGoogleMapsUrl(isPt ? "pt" : "en");

  const performCheckIn = async (lookupId?: string, queryVal?: string) => {
    setLoading(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = { action: "check_in" };
      if (lookupId) payload.id = lookupId;
      if (queryVal) payload.query = queryVal;

      const res = await fetch("/api/careers/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setResult({
          success: true,
          verified: true,
          candidate: data.candidate,
          message: data.message,
        });
      } else {
        setResult({
          success: false,
          error: data.error || (isPt ? "Falha ao validar presença." : "Failed to verify attendance."),
          wrongDay: Boolean(data.wrongDay),
          disqualified: Boolean(data.disqualified),
          notBooked: Boolean(data.notBooked),
          scheduledSlot: data.scheduledSlot,
          candidateName: data.candidateName,
          todayDay: data.todayDay,
          bookedDay: data.bookedDay,
        });
      }
    } catch (err) {
      setResult({
        success: false,
        error: (err as Error).message || (isPt ? "Erro de ligação ao servidor." : "Network error connecting to server."),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId && /^[\da-f-]{36}$/i.test(initialId)) {
      performCheckIn(initialId);
    }
  }, [initialId]);

  return (
    <div className="min-h-screen bg-[#07090e] text-white selection:bg-sky-500 selection:text-white pt-28 sm:pt-36 pb-16 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>{isPt ? "Verificação de Presença no Teste" : "Test Attendance Verification"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isPt ? "Validação de Entrada" : "Test Gate Check-in"}
          </h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto">
            {isPt
              ? "Registo oficial de presença para o teste presencial de recrutamento da Overwatch Moçambique."
              : "Official attendance registration for the in-person recruitment assessment at Overwatch Mozambique."}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-3xl border border-white/10 bg-[#121827] p-10 text-center space-y-4 shadow-xl">
            <RefreshCw className="animate-spin text-sky-400 mx-auto" size={36} />
            <div>
              <h3 className="text-base font-bold text-white">
                {isPt ? "A validar convocatória no sistema…" : "Validating invitation in database…"}
              </h3>
              <p className="text-xs text-white/50 mt-1">
                {isPt ? "A verificar data agendada e horário de hoje." : "Verifying scheduled date and today's roster."}
              </p>
            </div>
          </div>
        )}

        {/* CASE 1: SUCCESSFUL CHECK-IN */}
        {!loading && result?.success && (
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-[#121827] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isPt ? "Entrada Autorizada" : "Access Granted"}
                </span>
                <h2 className="text-2xl font-bold text-white mt-2">
                  {result.candidate?.name}
                </h2>
                <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                  {isPt ? "Presença registada com sucesso na base de dados!" : "Attendance successfully confirmed in live database!"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-white/50">{isPt ? "Turno Marcado" : "Scheduled Slot"}</span>
                <span className="font-bold text-sky-400">{result.candidate?.testSlot}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-white/50">{isPt ? "Horário de Chegada" : "Arrival Timestamp"}</span>
                <span className="font-bold text-white font-mono">
                  {result.candidate?.attendedAt
                    ? new Date(result.candidate.attendedAt).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })
                    : new Date().toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{isPt ? "Local do Teste" : "Test Venue"}</span>
                <span className="font-semibold text-white/90 text-right">{siteContact.address.pt}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200 leading-relaxed">
              <strong>{isPt ? "Instruções de Entrada:" : "Entrance Instructions:"}</strong>
              <p className="mt-1">
                {isPt
                  ? "Por favor mostre esta tela ao rececionista ou agente de segurança no portão. Tenha em mãos o seu documento de identificação original (BI/Passaporte) e uma caneta azul ou preta."
                  : "Please display this screen to the security officer or receptionist at the gate. Ensure you have your original photo ID and a blue or black pen."}
              </p>
            </div>
          </div>
        )}

        {/* CASE 2: WRONG DAY */}
        {!loading && result && !result.success && result.wrongDay && (
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 to-[#121827] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <AlertTriangle size={36} />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isPt ? "Acesso Não Autorizado Para Hoje" : "Access Denied For Today"}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">
                  {result.candidateName || (isPt ? "Candidato(a)" : "Applicant")}
                </h2>
                <p className="text-xs text-amber-300 font-semibold mt-0.5">
                  {isPt ? "Turno Incorrecto / Data Divergente" : "Wrong Scheduled Test Date"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[0.68rem] uppercase font-bold text-amber-300 tracking-wider">
                  {isPt ? "A sua data de teste confirmada é:" : "Your confirmed test date is:"}
                </span>
                <p className="text-base font-bold text-white">
                  {result.scheduledSlot || (isPt ? "Data futura" : "Future date")}
                </p>
              </div>
              <p className="text-amber-100/80 leading-relaxed text-[0.75rem] pt-2 border-t border-amber-500/20">
                {isPt
                  ? "Para respeitar a lotação máxima de 10 candidatas por sessão e a organização das salas técnicas, cada candidato só pode realizar o teste no seu dia agendado. Por favor compareça exclusivamente na sua data marcada."
                  : "To respect the maximum limit of 10 candidates per session and lab capacity, candidates are only admitted on their scheduled date. Please attend on your scheduled day."}
              </p>
            </div>

            <div className="text-center pt-1">
              <a
                href={"https://wa.me/" + siteContact.whatsappNumber}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition-colors"
              >
                <Phone size={13} />
                <span>{isPt ? "Dúvidas? Fale com Recursos Humanos via WhatsApp" : "Questions? Contact HR via WhatsApp"}</span>
              </a>
            </div>
          </div>
        )}

        {/* CASE 3: ERROR / DISQUALIFIED */}
        {!loading && result && !result.success && !result.wrongDay && (
          <div className="rounded-3xl border border-red-500/30 bg-gradient-to-b from-red-950/40 to-[#121827] p-6 sm:p-8 space-y-6 shadow-2xl text-center">
            <div className="h-16 w-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto shadow-lg shadow-red-500/10">
              <XCircle size={36} />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                {isPt ? "Registo Não Encontrado" : "Check-in Failed"}
              </span>
              <h2 className="text-lg font-bold text-white mt-2">
                {isPt ? "Não foi possível validar a presença" : "Could not verify attendance"}
              </h2>
              <p className="text-xs text-red-300/80 mt-1 max-w-sm mx-auto leading-relaxed">
                {result.error}
              </p>
            </div>
          </div>
        )}

        {/* SEARCH CARD (FOR GATE POSTER SCANS WITHOUT ID) */}
        {(!initialId || (result && !result.success)) && (
          <div className="rounded-3xl border border-white/10 bg-[#121827] p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60">
              <Search size={14} className="text-sky-400" />
              <span>{isPt ? "Procurar Candidatura Manualmente" : "Search Candidate Manually"}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              {isPt
                ? "Insira o seu número de telefone WhatsApp ou e-mail registado na candidatura para confirmar a presença."
                : "Enter your registered WhatsApp number or application email to check in."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  performCheckIn(undefined, searchQuery.trim());
                }
              }}
              className="space-y-3"
            >
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isPt ? "Ex: 841234567 ou email@exemplo.com" : "e.g. 841234567 or email@example.com"}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold py-3 shadow-lg shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>{isPt ? "Verificar Presença Agora" : "Check In Now"}</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Venue Info Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/50 space-y-2">
          <div className="flex items-center gap-2 text-white/70 font-semibold">
            <Building size={14} className="text-sky-400" />
            <span>Overwatch Moçambique, Lda.</span>
          </div>
          <p>{siteContact.address.pt}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium hover:underline pt-1"
          >
            <MapPin size={12} />
            <span>{isPt ? "Abrir localização no Google Maps" : "Open venue in Google Maps"}</span>
            <ExternalLink size={10} />
          </a>
        </div>

      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white text-xs">
          <RefreshCw className="animate-spin text-sky-400" size={24} />
        </div>
      }
    >
      <CheckInContent />
    </Suspense>
  );
}