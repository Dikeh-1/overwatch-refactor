"use client";

/** Record the export request before handing a file to the browser's download manager. */
export async function recordExportRequest(count: number): Promise<boolean> {
  try {
    const params = new URLSearchParams(window.location.search);
    const response = await fetch("/api/admin/activity", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "export", path: window.location.pathname, roleId: params.get("role"), cohortId: params.get("cohortId"), count }) });
    if (!response.ok) throw Error();
    return true;
  } catch {
    window.alert("The export could not be recorded. Please retry.");
    return false;
  }
}
