"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LiveFeedOptions {
  roleId?: string;
  enabled?: boolean;
  onNewCandidate?: (candidate: { id: string; name: string; role: string; createdAt: string }) => void;
  onRefreshData?: () => void;
}

export function useLiveRecruitmentFeed({
  roleId = "all",
  enabled = true,
  onNewCandidate,
  onRefreshData,
}: LiveFeedOptions = {}) {
  const [isConnected, setIsConnected] = useState(true);
  const [liveAlert, setLiveAlert] = useState<{
    id: string;
    name: string;
    role: string;
    timestamp: string;
  } | null>(null);

  const lastTimeRef = useRef<string>(new Date().toISOString());
  const initialMountRef = useRef<boolean>(true);

  const callbacks = useRef({ onNewCandidate, onRefreshData });
  useEffect(() => { callbacks.current = { onNewCandidate, onRefreshData }; }, [onNewCandidate, onRefreshData]);

  // Radar chime disabled for quiet, disturbance-free admin experience
  const playRadarChime = useCallback(() => {
    // No-op
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let timer: NodeJS.Timeout;
    let stopped = false;
    let inFlight = false;
    const controller = new AbortController();

    const checkFeed = async () => {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const url = `/api/admin/careers/live-feed?since=${encodeURIComponent(lastTimeRef.current)}${
          roleId !== "all" ? `&roleId=${encodeURIComponent(roleId)}` : ""
        }`;
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) {
          setIsConnected(false);
          return;
        }

        const data = await res.json();
        if (stopped) return;
        setIsConnected(true);

        if (data.serverTime) {
          lastTimeRef.current = data.serverTime;
        }

        // Only trigger alerts after initial page load
        if (!initialMountRef.current && data.recentApplications?.length > 0) {
          const newest = data.recentApplications[0];
          setLiveAlert({
            id: newest.id,
            name: newest.name,
            role: newest.role,
            timestamp: newest.createdAt,
          });

          playRadarChime();

          callbacks.current.onNewCandidate?.(newest);
          callbacks.current.onRefreshData?.();
        }
        initialMountRef.current = false;
      } catch {
        if (!stopped) setIsConnected(false);
      } finally {
        inFlight = false;
        const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
        // CRITICAL FOR SUPABASE EGRESS: Only schedule next poll if tab is active/visible.
        // When tab is hidden/backgrounded, do not poll. Visibility change listener will instantly resume on tab focus.
        if (isVisible && !stopped) {
          timer = setTimeout(checkFeed, 30000);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        clearTimeout(timer);
        checkFeed();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    checkFeed();

    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [enabled, roleId, playRadarChime]);

  const dismissAlert = () => setLiveAlert(null);

  return {
    isConnected,
    liveAlert,
    dismissAlert,
  };
}
