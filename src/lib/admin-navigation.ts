/** Only local admin destinations may be used as a return target. */
export function isAdminHome(path: string, params: URLSearchParams): boolean {
  return path === "/admin" || path === "/admin/overview" ||
    (path === "/admin/recruitment" && (!params.get("role") || params.get("role") === "all"));
}

export function adminReturnTarget(value: string | null): string | null {
  if (!value || !value.startsWith("/admin") || /[\\\r\n]/.test(value)) return null;
  try {
    const url = new URL(value, "https://admin.invalid");
    return url.origin === "https://admin.invalid" && /^\/admin(?:\/|$)/.test(url.pathname) ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}
export function adminParent(path: string, params: URLSearchParams): string {
  const explicit = adminReturnTarget(params.get("returnTo"));
  if (/\/candidates\/[^/]+$/.test(path)) {
    if (explicit) return explicit;
    if (params.get("cohortId")) return `/admin/recruitment/archive?cohortId=${encodeURIComponent(params.get("cohortId")!)}&view=applications`;
    const copy = new URLSearchParams(params); copy.delete("profileTab"); copy.delete("returnTo");
    return "/admin/recruitment/candidates" + (copy.size ? `?${copy}` : "");
  }
  if (path === "/admin/recruitment/archive" && params.has("cohortId")) {
    if (params.has("view") || params.has("metric")) { const copy = new URLSearchParams(params); copy.delete("view"); copy.delete("metric"); return `${path}?${copy}`; }
    return path;
  }
  if (path.startsWith("/admin/recruitment/")) return "/admin/recruitment";
  if (path !== "/admin" && path !== "/admin/overview") return "/admin";
  return "/";
}
export function adminCommunicationsTarget(path: string, params: URLSearchParams): string {
  const cohort = params.get("cohortId");
  if (cohort) return `/admin/recruitment/archive?cohortId=${encodeURIComponent(cohort)}&view=communications`;
  const role = params.get("role");
  return "/admin/recruitment/communications" + (role && role !== "all" ? `?role=${encodeURIComponent(role)}` : "");
}
export function candidateProfileTarget(id: string, path: string, params: URLSearchParams): string {
  const copy = new URLSearchParams(params); copy.delete("returnTo"); copy.delete("profileTab");
  const origin = path + (copy.size ? `?${copy}` : "");
  copy.set("returnTo", origin);
  return `/admin/recruitment/candidates/${encodeURIComponent(id)}?${copy}`;
}
