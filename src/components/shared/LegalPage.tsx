import { Link } from "@/i18n/navigation";
import { siteContact } from "@/lib/site-config";

export type LegalItem = {
  label?: string;
  text: string;
};

export type LegalSubsection = {
  title: string;
  items: LegalItem[];
};

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: LegalItem[];
  subsections?: LegalSubsection[];
  linkParagraph?: {
    before: string;
    after: string;
  };
  showEmail?: boolean;
};

type Props = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  privacyLinkLabel?: string;
};

function LegalList({ items }: { items: LegalItem[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-6">
      {items.map((item) => (
        <li key={`${item.label ?? ""}-${item.text}`}>
          {item.label ? <strong className="text-foreground">{item.label} </strong> : null}
          {item.text}
        </li>
      ))}
    </ul>
  );
}

export default function LegalPage({
  title,
  lastUpdated,
  sections,
  privacyLinkLabel,
}: Props) {
  return (
    <main className="min-h-screen bg-primary-dark px-4 py-32 text-muted selection:bg-accent/30 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-balance text-4xl font-bold text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mb-12">{lastUpdated}</p>

        <div className="space-y-8 text-base leading-relaxed sm:text-lg">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-2xl font-bold text-foreground">{section.title}</h2>

              {section.paragraphs?.map((paragraph, index) => (
                <p key={paragraph} className={index > 0 ? "mt-4" : undefined}>
                  {paragraph}
                </p>
              ))}

              {section.subsections?.map((subsection, index) => (
                <div key={subsection.title} className={index > 0 ? "mt-6" : "mt-4"}>
                  <h3 className="font-semibold text-foreground">{subsection.title}</h3>
                  <LegalList items={subsection.items} />
                </div>
              ))}

              {section.items ? <LegalList items={section.items} /> : null}

              {section.linkParagraph && privacyLinkLabel ? (
                <p>
                  {section.linkParagraph.before}{" "}
                  <Link href="/privacy" className="font-semibold text-accent hover:underline">
                    {privacyLinkLabel}
                  </Link>
                  . {section.linkParagraph.after}
                </p>
              ) : null}

              {section.showEmail ? (
                <a
                  href={`mailto:${siteContact.email}`}
                  className="mt-4 inline-flex min-h-11 items-center font-mono font-semibold text-accent underline decoration-accent/25 underline-offset-4 hover:decoration-accent"
                >
                  {siteContact.email}
                </a>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
