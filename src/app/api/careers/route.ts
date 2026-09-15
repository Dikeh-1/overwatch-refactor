import { notifyApplication } from "@/lib/careers-email";
import { NextResponse } from "next/server";
import { MAX_CV, type Application } from "@/lib/careers";
import { getRoles, saveApplication } from "@/lib/careers-store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > MAX_CV + 40000)
      return NextResponse.json({ code: "FILE_INVALID" }, { status: 413 });
    const data = await request.formData();
    const field = (key: string) =>
      typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";
    const values = {
      name: field("name"),
      email: field("email"),
      whatsapp: field("whatsapp"),
      role: field("role"),
      locale: field("locale"),
      grade12: field("grade12"),
      sex: field("sex"),
      ai: field("ai"),
      experience: field("experience"),
      lastProfession: field("lastProfession"),
      shifts: field("shifts"),
      coverLetter: field("coverLetter").slice(0, 3000),
    };
    if (
      !values.name ||
      values.name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ||
      values.email.length > 254 ||
      !/^\+?[\d ()-]{7,25}$/.test(values.whatsapp) ||
      !values.lastProfession ||
      values.lastProfession.length > 200 ||
      !["en", "pt"].includes(values.locale) ||
      !["male", "female"].includes(values.sex) ||
      [values.grade12, values.ai, values.experience, values.shifts].some(
        (v) => !["yes", "no"].includes(v),
      )
    )
      return NextResponse.json({ code: "INVALID" }, { status: 400 });
    if (!(await getRoles()).find((r) => r.id === values.role)?.open)
      return NextResponse.json({ code: "ROLE_CLOSED" }, { status: 409 });
    const cv = data.get("cv");
    if (!(cv instanceof File) || cv.size === 0 || cv.size > MAX_CV)
      return NextResponse.json({ code: "FILE_INVALID" }, { status: 400 });
    const buffer = Buffer.from(await cv.arrayBuffer());
    const extension = cv.name.split(".").pop()?.toLowerCase();
    const valid =
      extension === "pdf"
        ? buffer.subarray(0, 5).toString() === "%PDF-"
        : extension === "doc"
          ? buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1"
          : extension === "docx" &&
            buffer.subarray(0, 4).toString("hex") === "504b0304";
    if (!valid)
      return NextResponse.json({ code: "FILE_INVALID" }, { status: 400 });
    // Auto criteria check: Female candidates or Male candidates with CCTV experience are auto-shortlisted
    const meetsCriteria =
      values.sex === "female" ||
      (values.sex === "male" && values.experience === "yes");

    const application = {
      ...values,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: meetsCriteria ? "shortlisted" : "new",
      cvName: cv.name.replace(/[\r\n/\\]/g, "_").slice(0, 180),
      cvSize: cv.size,
      cvType:
        extension === "pdf"
          ? "application/pdf"
          : extension === "doc"
            ? "application/msword"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    } as Application;
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
