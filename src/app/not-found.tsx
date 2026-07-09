import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function GlobalNotFound() {
  const t = await getTranslations({ locale: "en", namespace: "notFound" });

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a1428] text-[#f0f4f8] flex items-center justify-center antialiased">
        <div className="text-center max-w-md px-4">
          <div className="text-8xl font-bold text-[#00e5ff]/20 mb-4">404</div>
          <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
          <p className="text-[#8892a4] mb-8">{t("description")}</p>
          <Link
            href="/en"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#00e5ff] text-[#0a1428] font-semibold hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all"
          >
            {t("back")}
          </Link>
        </div>
      </body>
    </html>
  );
}
