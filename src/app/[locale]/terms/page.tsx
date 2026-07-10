import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isPortuguese = locale === "pt";

  return {
    title: isPortuguese
      ? "Termos de Serviço | OverWatch Moçambique"
      : "Terms of Service | OverWatch Mozambique",
    description: isPortuguese
      ? "Leia os termos dos serviços da OverWatch Moçambique para monitoramento CCTV, guarda virtual, detecção com IA e operações de segurança."
      : "Read the terms for OverWatch Mozambique CCTV monitoring, virtual guard service, AI threat detection, and security operations.",
    alternates: {
      canonical: `/${locale}/terms`,
      languages: Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/terms`])),
    },
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="py-32 px-4 sm:px-6 lg:px-8 bg-primary-dark min-h-screen text-muted selection:bg-accent/30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Terms of Service</h1>
        <p className="mb-12">Last Updated: July 2026</p>

        <div className="space-y-8 text-lg leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>
              {'By accessing our website and utilizing the services provided by Overwatch Lda ("Overwatch", "we", "us", or "our"), including but not limited to CCTV monitoring, AI threat detection, guarding services, and control room operations, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.'}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Description of Services</h2>
            <p>
              Overwatch provides comprehensive security solutions, including remote site monitoring, AI-powered camera analytics, and operational guarding models. The specific scope, duration, and hardware requirements of the services provided to you will be outlined in your individual Service Level Agreement (SLA) or Master Services Agreement (MSA). 
            </p>
            <p className="mt-4">
              We reserve the right to modify, suspend, or discontinue any aspect of our services at any time with prior notice, subject to the terms of your specific contract.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Client Responsibilities</h2>
            <p>
              As a client, you agree to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Provide accurate and complete information regarding your site layout, current security systems, and operational procedures during our security assessments.</li>
              <li>Ensure that any existing CCTV hardware you wish to integrate meets our minimum technical specifications for AI detection compatibility.</li>
              <li>Maintain reliable power and internet connectivity at your premises to allow our surveillance control room to receive uninterrupted feeds, unless an off-grid solution is explicitly provided by us.</li>
              <li>Comply with all local laws and regulations regarding the use of surveillance equipment and the recording of individuals on your property.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Privacy and Data Handling</h2>
            <p>
              Our processing of video feeds, AI metadata, and personal information is governed by our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>. We act as a data processor in respect of the video footage captured on your premises. You remain the data controller and are responsible for ensuring that you have the lawful basis to record and monitor your site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">5. Limitation of Liability</h2>
            <p>
              While Overwatch utilizes state-of-the-art AI detection and rigorous control room protocols, security systems are inherently subject to limitations (e.g., severe weather obstructing camera views, power grid failures, or network outages). 
            </p>
            <p className="mt-4">
              To the fullest extent permitted by law, Overwatch shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from breaches of security at your premises.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">6. Intellectual Property</h2>
            <p>
              All software, AI models, dashboards, trademarks, and proprietary methodologies used to deliver our services remain the exclusive property of Overwatch. You are granted a limited, non-exclusive, non-transferable license to access our client dashboard for the duration of your contract.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">7. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of Mozambique. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in Maputo.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
