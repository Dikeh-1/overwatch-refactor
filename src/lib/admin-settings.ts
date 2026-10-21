export const DEFAULT_ADMIN_SETTINGS = { senderName: "Overwatch Recrutamento", replyToEmail: "info@overwatchmoz.com" };
export function validAdminSettings(value: unknown): value is typeof DEFAULT_ADMIN_SETTINGS & { quota: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.senderName === "string" && v.senderName.trim().length > 0 && v.senderName.length <= 120 && !/[\r\n]/.test(v.senderName)
    && typeof v.replyToEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.replyToEmail) && v.replyToEmail.length <= 254
    && Number.isInteger(v.quota) && Number(v.quota) >= 1 && Number(v.quota) <= 200;
}
