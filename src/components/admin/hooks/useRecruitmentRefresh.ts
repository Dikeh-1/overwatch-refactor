"use client";
import { useEffect, useRef } from "react";

/** Refresh visible recruitment views after gate activity on another device. */
export function useRecruitmentRefresh(refresh: (signal: AbortSignal) => void | Promise<void>, enabled = true) {
  const callback = useRef(refresh);
  useEffect(() => { callback.current = refresh; }, [refresh]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let busy = false;
    const run = async () => {
      if (controller.signal.aborted || document.hidden || busy) return;
      busy = true;
      try { await callback.current(controller.signal); }
      catch { /* Each view reports its own loading error. */ }
      finally { busy = false; }
    };
    const tick = () => { void run(); };
    const timer = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [enabled]);
}
