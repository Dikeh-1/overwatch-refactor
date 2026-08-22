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
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigatorWithDeviceHints.connection?.saveData === true ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    (navigatorWithDeviceHints.deviceMemory !== undefined &&
      navigatorWithDeviceHints.deviceMemory <= 4)
  );
}

const subscribe = () => () => undefined;
const getServerSnapshot = () => false;

export function useConstrainedDevice() {
  return useSyncExternalStore(subscribe, isConstrainedDevice, getServerSnapshot);
}
