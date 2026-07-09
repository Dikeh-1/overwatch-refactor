import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-accent/20 mb-4">404</div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{t("title")}</h1>
        <p className="text-muted mb-8">{t("description")}</p>
        <Button href="/">{t("back")}</Button>
      </div>
    </section>
  );
}
