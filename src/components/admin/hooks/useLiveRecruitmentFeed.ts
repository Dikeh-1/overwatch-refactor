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

  // Radar chime disabled for quiet, disturbance-free admin experience
  const playRadarChime = useCallback(() => {
    // No-op
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
