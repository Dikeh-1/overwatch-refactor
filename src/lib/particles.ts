"use client";

import type { ParticlesPluginRegistrar } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export const initParticles: ParticlesPluginRegistrar = async (engine) => {
  await loadSlim(engine);
};
