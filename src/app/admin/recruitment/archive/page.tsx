"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ArchiveVaultView from "@/components/admin/recruitment/ArchiveVaultView";

export default function ArchivePage() {
  const router = useRouter();

  return (
    <ArchiveVaultView
      onBackToActive={() => router.push("/admin/recruitment")}
    />
  );
}
