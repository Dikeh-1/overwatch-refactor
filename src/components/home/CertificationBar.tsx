import Image from "next/image";
import { useTranslations } from "next-intl";
import { IMAGES } from "@/lib/constants";

const certs = [
  { src: IMAGES.cert1, alt: "ISO 9001" },
  { src: IMAGES.cert2, alt: "ISO 22301" },
  { src: IMAGES.cert3, alt: "ISO 27001" },
  { src: IMAGES.cert4, alt: "ISO 27701" },
];

export default function CertificationBar() {
  const t = useTranslations("certification");

  return (
    <section className="py-16 md:py-20 bg-primary-darker/50 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-muted leading-relaxed mb-10">{t("text")}</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {certs.map((cert) => (
            <Image
              key={cert.alt}
              src={cert.src}
              alt={cert.alt}
              width={120}
              height={48}
              className="h-10 w-auto opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
