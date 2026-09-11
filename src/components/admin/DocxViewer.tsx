"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface DocxViewerProps {
  url: string;
  className?: string;
}

export default function DocxViewer({ url, className = "" }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDocx() {
      try {
        const { renderAsync } = await import("docx-preview");
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Could not fetch document (${res.status})`);
        const blob = await res.blob();

        if (!active || !containerRef.current) return;
        containerRef.current.innerHTML = "";

        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx-rendered",
          inWrapper: false,
          ignoreWidth: true,
          ignoreHeight: false,
          breakPages: true,
          useBase64URL: true,
        });

        if (active) {
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError((err as Error)?.message || "Could not render Word document preview");
          setLoading(false);
        }
      }
    }

    loadDocx();
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div className={`relative w-full h-80 sm:h-96 overflow-y-auto bg-[#181d28] p-3 sm:p-5 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs text-white gap-2.5 z-10">
          <Loader2 className="animate-spin text-white/80" size={24} />
          <span className="text-xs text-white/70 font-medium">Rendering Word Document…</span>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-white/80 gap-3">
          <div className="rounded-full bg-amber-500/10 p-3 text-amber-400">
            <AlertCircle size={22} />
          </div>
          <p className="text-xs font-semibold text-white/90">{error}</p>
          <p className="text-[0.7rem] text-white/50 max-w-xs">
            The file can still be opened directly on your computer using the Download button below.
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="docx-page-container mx-auto max-w-2xl bg-white text-gray-900 rounded-lg p-6 sm:p-8 shadow-xl min-h-full leading-relaxed"
        />
      )}
    </div>
  );
}
