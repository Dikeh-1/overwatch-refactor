"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LiveFeedOptions {
  roleId?: string;
  enabled?: boolean;
  onNewCandidate?: (candidate: any) => void;
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

  // Play a soft high-tech radar ping sound using Web Audio API (zero audio files needed)
  const playRadarChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // glide to E6

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let timer: NodeJS.Timeout;

    const checkFeed = async () => {
      try {
        const url = `/api/admin/careers/live-feed?since=${encodeURIComponent(lastTimeRef.current)}${
          roleId !== "all" ? `&roleId=${encodeURIComponent(roleId)}` : ""
        }`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          setIsConnected(false);
          return;
        }

        const data = await res.json();
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

          if (onNewCandidate) {
            onNewCandidate(newest);
          }
          if (onRefreshData) {
            onRefreshData();
          }
        }
        initialMountRef.current = false;
      } catch {
        setIsConnected(false);
      } finally {
        timer = setTimeout(checkFeed, 3500); // Live poll every 3.5 seconds
      }
    };

    checkFeed();

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, roleId, onNewCandidate, onRefreshData, playRadarChime]);

  const dismissAlert = () => setLiveAlert(null);

  return {
    isConnected,
    liveAlert,
    dismissAlert,
  };
}
