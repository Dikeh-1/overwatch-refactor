import { redirect } from "next/navigation";

export default async function LocaleGatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const data = await searchParams;

  const sp = new URLSearchParams();
  sp.set("lang", locale === "en" ? "en" : "pt");

  for (const [key, val] of Object.entries(data)) {
    if (key !== "lang" && typeof val === "string") {
      sp.set(key, val);
    }
  }

  redirect('/gate?' + sp.toString());
}
