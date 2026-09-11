"use client";

import { useSyncExternalStore } from "react";

type NavigatorWithDeviceHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function isConstrainedDevice() {
  if (typeof window === "undefined") return false;

  const navigatorWithDeviceHints = navigator as NavigatorWithDeviceHints;

  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigatorWithDeviceHints.connection?.saveData === true
  );
}

const subscribe = () => () => undefined;
const getServerSnapshot = () => false;

export function useConstrainedDevice() {
  return useSyncExternalStore(subscribe, isConstrainedDevice, getServerSnapshot);
}
