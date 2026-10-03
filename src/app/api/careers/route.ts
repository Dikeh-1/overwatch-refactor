import { notifyApplication } from "@/lib/careers-email";
import { NextResponse } from "next/server";
import { MAX_CV, type Application } from "@/lib/careers";
import { getRoles, saveApplication } from "@/lib/careers-store";
import { evaluateTechnicalScreening, hasTechnicalScreening } from "@/lib/screening-engine";
import { getRoleDefinitions } from "@/lib/careers-campaign-store";
import { evaluateApplicationWithRules } from "@/lib/careers-evaluator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > MAX_CV + 40000)
      return NextResponse.json({ code: "FILE_INVALID" }, { status: 413 });

    const data = await request.formData();
    const field = (key: string) =>
      typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";

    const role = field("role");
    const name = field("name");
    const email = field("email");
    const whatsapp = field("whatsapp");
    const locale = (field("locale") || "pt") as "en" | "pt";
    const coverLetter = field("coverLetter").slice(0, 3000);

    // Basic shared validation
    if (
      !name ||
      name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !/^\+?[\d ()-]{7,25}$/.test(whatsapp) ||
      !["en", "pt"].includes(locale)
    ) {
      return NextResponse.json({ code: "INVALID" }, { status: 400 });
    }

    const currentRoles = await getRoles();
    const matchedRole = currentRoles.find(
      (r) =>
        r.id === role ||
        (role === "cctv" && r.id === "cctv_operator") ||
        (role === "cctv_operator" && r.id === "cctv"),
    );
    if (!matchedRole?.open) {
      return NextResponse.json({ code: "ROLE_CLOSED" }, { status: 409 });
    }

    const cv = data.get("cv");
    if (!(cv instanceof File) || cv.size === 0 || cv.size > MAX_CV) {
      return NextResponse.json({ code: "FILE_INVALID" }, { status: 400 });
    }
    const buffer = Buffer.from(await cv.arrayBuffer());
    const extension = cv.name.split(".").pop()?.toLowerCase();
    const valid =
      extension === "pdf"
        ? buffer.subarray(0, 5).toString() === "%PDF-"
        : extension === "doc"
          ? buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1"
          : extension === "docx" &&
            buffer.subarray(0, 4).toString("hex") === "504b0304";
    if (!valid) {
      return NextResponse.json({ code: "FILE_INVALID" }, { status: 400 });
    }

    const cvType =
      extension === "pdf"
        ? "application/pdf"
        : extension === "doc"
          ? "application/msword"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const cvName = cv.name.replace(/[\r\n/\\]/g, "_").slice(0, 180);

    // ─────────────────────────────────────────────────────────────────────────
    // Technical / Specialist Roles Screening Flow (e.g. CCTV Technical Manager)
    // ─────────────────────────────────────────────────────────────────────────
    if (hasTechnicalScreening(role)) {
      const technicalData = {
        currentLocation: field("currentLocation"),
        yearsCctvExperience: field("yearsCctvExperience"),
        ipCctv: field("ipCctv") as "yes" | "no",
        analogueCctv: field("analogueCctv") as "yes" | "no",
        hikvision: field("hikvision") as "yes" | "no",
        dahua: field("dahua") as "yes" | "no",
        nvrDvr: field("nvrDvr") as "yes" | "no",
        networking: field("networking") as "yes" | "no",
        structuredCabling: field("structuredCabling") as "yes" | "no",
        electricalUps: field("electricalUps") as "yes" | "no",
        troubleshooting: field("troubleshooting") as "yes" | "no",
        supervision: field("supervision") as "yes" | "no",
        drivingLicence: field("drivingLicence") as "yes" | "no",
        aiAnalytics: field("aiAnalytics") as "yes" | "no",
        remoteMonitoring: field("remoteMonitoring") as "yes" | "no",
        boqScopes: field("boqScopes") as "yes" | "no",
        startDate: field("startDate"),
        salaryExpectation: field("salaryExpectation"),
        largestProjectDescription: field("largestProjectDescription").slice(0, 4000),
      };

      if (
        !technicalData.currentLocation ||
        !technicalData.yearsCctvExperience ||
        !technicalData.salaryExpectation ||
        !technicalData.largestProjectDescription
      ) {
        return NextResponse.json({ code: "INVALID" }, { status: 400 });
      }

      const roleDefs = await getRoleDefinitions().catch(() => []);
      const currentRoleDef = roleDefs.find((r) => r.id === role);
      const activeCohortId = currentRoleDef?.activeCohortId || undefined;

      // Automatic screening evaluation (dynamic custom rules override default)
      let screening = evaluateTechnicalScreening(role, technicalData);
      if (currentRoleDef?.screeningRules && currentRoleDef.screeningRules.length > 0) {
        screening = evaluateApplicationWithRules(
          { ...technicalData, coverLetter },
          currentRoleDef.screeningRules,
        );
      }
      const status = screening.passedMandatory ? "shortlisted" : "not_advancing";

      const application: Application = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name,
        email,
        whatsapp,
        role,
        cohortId: activeCohortId,
        locale,
        coverLetter,
        status,
        ...technicalData,
        technicalData,
        screeningResult: screening,
        cvName,
        cvSize: cv.size,
        cvType,
      };

      await saveApplication(application, buffer);
      try {
        await notifyApplication(application, buffer);
      } catch (emailErr) {
        console.error("notifyApplication background delivery error:", emailErr);
      }

      return NextResponse.json({ success: true, id: application.id });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dynamic Role Screening Flow (Powered by Role Form Builder & Database)
    // ─────────────────────────────────────────────────────────────────────────
    const roleDefs = await getRoleDefinitions().catch(() => []);
    const currentRoleDef = roleDefs.find(
      (r) =>
        r.id === role ||
        (role === "cctv" && r.id === "cctv_operator") ||
        (role === "cctv_operator" && r.id === "cctv"),
    );
    const activeCohortId = currentRoleDef?.activeCohortId || undefined;

    // Collect all submitted fields from FormData
    const dynamicAnswers: Record<string, any> = {};
    for (const [key, val] of data.entries()) {
      if (key !== "cv" && typeof val === "string") {
        dynamicAnswers[key] = val.trim();
      }
    }
    if (dynamicAnswers.dynamicFields) {
      try {
        const parsed = JSON.parse(dynamicAnswers.dynamicFields);
        Object.assign(dynamicAnswers, parsed);
      } catch {}
    }

    if (currentRoleDef?.screeningRules && currentRoleDef.screeningRules.length > 0) {
      // Validate mandatory rules dynamically
      for (const rule of currentRoleDef.screeningRules) {
        if (rule.mandatory) {
          const val = dynamicAnswers[rule.field];
          if (val === undefined || val === null || val === "") {
            return NextResponse.json(
              { code: "INVALID", field: rule.field, message: `Missing required field: ${rule.labelEn}` },
              { status: 400 },
            );
          }
        }
      }

      // Evaluate application against dynamic screening rules
      const customScreening = evaluateApplicationWithRules(
        { ...dynamicAnswers, coverLetter },
        currentRoleDef.screeningRules,
      );
      const status = customScreening.passedMandatory ? "shortlisted" : "not_advancing";

      const application: Application = {
        ...dynamicAnswers,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name,
        email,
        whatsapp,
        role,
        cohortId: activeCohortId,
        locale,
        coverLetter,
        status,
        screeningResult: customScreening,
        customFields: dynamicAnswers,
        cvName,
        cvSize: cv.size,
        cvType,
      };

      await saveApplication(application, buffer);
      try {
        await notifyApplication(application, buffer);
      } catch (emailErr) {
        console.error("notifyApplication background delivery error:", emailErr);
      }

      return NextResponse.json({ success: true, id: application.id });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Legacy / Fallback Standard Flow
    // ─────────────────────────────────────────────────────────────────────────
    const values = {
      name,
      email,
      whatsapp,
      role,
      locale,
      grade12: (field("grade12") || "yes") as "yes" | "no",
      sex: (field("sex") || "female") as "male" | "female",
      ai: (field("ai") || "yes") as "yes" | "no",
      experience: (field("experience") || "yes") as "yes" | "no",
      lastProfession: field("lastProfession") || "Applicant",
      shifts: (field("shifts") || "yes") as "yes" | "no",
      coverLetter,
    };

    // Auto criteria check for Operator: Female or Male with CCTV experience are auto-shortlisted
    let meetsCriteria =
      values.sex === "female" ||
      (values.sex === "male" && values.experience === "yes");

    const application: Application = {
      ...values,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      cohortId: activeCohortId,
      status: meetsCriteria ? "shortlisted" : "new",
      cvName,
      cvSize: cv.size,
      cvType,
    };

    await saveApplication(application, buffer);
    try {
      await notifyApplication(application, buffer);
    } catch (emailErr) {
      console.error("notifyApplication background delivery error:", emailErr);
    }

    return NextResponse.json({ success: true, id: application.id });
  } catch (error) {
    const closed = error instanceof Error && error.message === "ROLE_CLOSED";
    return NextResponse.json(
      { code: closed ? "ROLE_CLOSED" : "UNAVAILABLE" },
      { status: closed ? 409 : 503 },
    );
  }
}
