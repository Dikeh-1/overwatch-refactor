import React from "react";
import CandidateTrainingClient from "./CandidateTrainingClient";

export const dynamic = "force-dynamic";

export default async function TrainingInvitePage(props: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const { id, locale } = await props.params;

  return <CandidateTrainingClient candidateId={id} locale={locale || "pt"} />;
}
