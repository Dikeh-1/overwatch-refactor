import { authenticated, sameOrigin } from "@/lib/careers-auth";
import { getApplication, getApplications, updateApplication } from "@/lib/careers-store";
import { sendRetractionEmail } from "@/lib/careers-email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await authenticated()) || !sameOrigin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const targetStatus = body.targetStatus || "shortlisted";
    const sendApologyEmail = body.sendApologyEmail !== false;
    const restoreAllArchivedWomen = Boolean(body.restoreAllArchivedWomen);
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    const idsToRestore = new Set<string>(
      Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string" && /^[\da-f-]{36}$/i.test(id)) : []
    );

    // If requesting automatic restore of all mistakenly archived female applicants
    if (restoreAllArchivedWomen) {
      const allApps = await getApplications();
      for (const app of allApps) {
        if (app.status === "archived" && app.sex !== "male") {
          idsToRestore.add(app.id);
        }
      }
    }

    if (idsToRestore.size === 0) {
      return Response.json(
        { error: "Nenhuma candidatura identificada para restauração." },
        { status: 400 }
      );
    }

    const results: {
      id: string;
      name: string;
      email: string;
      restoredStatus: string;
      emailSent: boolean;
    }[] = [];

    for (const id of Array.from(idsToRestore)) {
      try {
        const candidate = await getApplication(id);
        if (!candidate) continue;

        const updated = await updateApplication(id, {
          status: targetStatus,
          // Reset slot if cancelled so they can choose fresh next-week slot
          testSlot: undefined,
          testBookedAt: undefined,
        });

        let emailSent = false;
        if (sendApologyEmail) {
          try {
            await sendRetractionEmail({
              application: updated,
              baseUrl: origin,
            });
            emailSent = true;
          } catch (emailErr) {
            console.error(`Failed to send retraction email to ${candidate.email}:`, emailErr);
          }
        }

        results.push({
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          restoredStatus: targetStatus,
          emailSent,
        });

        if (sendApologyEmail) {
          // Rate-limit pacing
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch (err) {
        console.error(`Error restoring candidate ${id}:`, err);
      }
    }

    return Response.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Candidate restore error:", error);
    return Response.json(
      { error: "Erro ao restaurar candidaturas." },
      { status: 500 }
    );
  }
}
