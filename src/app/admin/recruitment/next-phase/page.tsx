"use client";

import { useSearchParams } from "next/navigation";
import RecruitmentWorkspace from "@/components/admin/recruitment/RecruitmentWorkspace";
import React from "react";
import { NextPhaseView } from "@/components/admin/recruitment/NextPhaseView";

export default function NextPhasePage() {
  const role = useSearchParams().get("role");
  return role && role !== "all" ? <RecruitmentWorkspace roleId={role} initialTab="next_phase" /> : <NextPhaseView />;
}
