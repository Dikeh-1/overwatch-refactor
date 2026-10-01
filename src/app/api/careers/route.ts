import { notifyApplication } from "@/lib/careers-email";
import { NextResponse } from "next/server";
import { MAX_CV, type Application } from "@/lib/careers";
import { getRoles, saveApplication } from "@/lib/careers-store";
import { evaluateTechnicalScreening, hasTechnicalScreening } from "@/lib/screening-engine";

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

    if (!(await getRoles()).find((r) => r.id === role)?.open) {
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

      if (!technicalData.currentLocation || !technicalData.yearsCctvExperience || !technicalData.largestProjectDescription) {
        return NextResponse.json({ code: "INVALID" }, { status: 400 });
      }

      // Automatic screening evaluation
      const screening = evaluateTechnicalScreening(role, technicalData);
      const status = screening.passedMandatory ? "shortlisted" : "not_advancing";

      const application: Application = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name,
        email,
        whatsapp,
        role,
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
    // Standard / Operator Role Flow
    // ─────────────────────────────────────────────────────────────────────────
    const values = {
      name,
      email,
      whatsapp,
      role,
      locale,
      grade12: field("grade12") as "yes" | "no",
      sex: field("sex") as "male" | "female",
      ai: field("ai") as "yes" | "no",
      experience: field("experience") as "yes" | "no",
      lastProfession: field("lastProfession"),
      shifts: field("shifts") as "yes" | "no",
      coverLetter,
    };

    if (
      !values.lastProfession ||
      values.lastProfession.length > 200 ||
      !["male", "female"].includes(values.sex) ||
      [values.grade12, values.ai, values.experience, values.shifts].some(
        (v) => !["yes", "no"].includes(v),
      )
    ) {
      return NextResponse.json({ code: "INVALID" }, { status: 400 });
    }

    // Auto criteria check for Operator: Female or Male with CCTV experience are auto-shortlisted
    const meetsCriteria =
      values.sex === "female" ||
      (values.sex === "male" && values.experience === "yes");

    const application: Application = {
      ...values,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
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
