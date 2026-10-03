"use client";

export interface CelebrationDetail {
  title?: string;
  subtitle?: string;
  candidateName?: string;
  roleName?: string;
  variant?: "shortlisted" | "next_phase" | "hired" | "custom";
  autoCloseMs?: number;
}

/**
 * Triggers the official Overwatch celebratory confetti animation across the admin portal.
 * Can be called whenever an applicant is shortlisted, moved to next phase, hired, or when
 * celebratory / moving forward cohort emails are dispatched.
 */
export function triggerCelebration(detail: CelebrationDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("overwatch-celebrate", {
        detail: {
          variant: "next_phase",
          autoCloseMs: 6000,
          ...detail,
        },
      })
    );
  }
}
