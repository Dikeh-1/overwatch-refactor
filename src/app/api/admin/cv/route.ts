import { authenticated } from "@/lib/careers-auth";
import { getApplication, getCV } from "@/lib/careers-store";

export async function GET(request: Request) {
  if (!(await authenticated())) return new Response(null, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const isExplicitDownload = url.searchParams.get("download") === "1" || url.searchParams.get("action") === "download";

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing candidate ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const application = await getApplication(id);
    if (!application) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cvData = await getCV(application.id);
    if (!cvData || cvData.length === 0) {
      return new Response(JSON.stringify({ error: "CV document file not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default to inline preview; only use attachment when explicitly requested with ?download=1
    const disposition = isExplicitDownload ? "attachment" : "inline";
    const filename = application.cvName || `cv-${application.name.replace(/\s+/g, "_")}.pdf`;

    let contentType = application.cvType || "application/pdf";
    if (!contentType || contentType === "application/octet-stream") {
      const lower = filename.toLowerCase();
      if (lower.endsWith(".pdf")) contentType = "application/pdf";
      else if (lower.endsWith(".docx")) contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (lower.endsWith(".doc")) contentType = "application/msword";
      else contentType = "application/pdf";
    }

    // Generate deterministic ETag based on applicant ID and document byte length
    const etag = `"${application.id}-${cvData.length}"`;
    const clientIfNoneMatch = request.headers.get("if-none-match");

    if (clientIfNoneMatch && clientIfNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return new Response(new Uint8Array(cvData), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        "ETag": etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("Admin CV fetch error:", err);
    return new Response(JSON.stringify({ error: "Could not retrieve document" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
