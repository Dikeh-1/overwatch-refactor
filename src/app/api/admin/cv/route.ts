import { authenticated } from "@/lib/careers-auth";
import { getApplications, getCV } from "@/lib/careers-store";

export async function GET(request: Request) {
  if (!(await authenticated())) return new Response(null, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const inline = url.searchParams.get("inline") === "1";

  try {
    const application = (await getApplications()).find((a) => a.id === id);
    if (!application) return new Response(null, { status: 404 });

    const disposition = inline ? "inline" : "attachment";

    return new Response(new Uint8Array(await getCV(application.id)), {
      headers: {
        "Content-Type": application.cvType || "application/pdf",
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(application.cvName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
