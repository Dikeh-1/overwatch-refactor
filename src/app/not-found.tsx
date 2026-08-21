import type { Metadata } from "next";
import GlobalNotFoundContent from "@/components/shared/GlobalNotFoundContent";

export const metadata: Metadata = {
  title: "404 | Overwatch",
  description: "The requested Overwatch page could not be found.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GlobalNotFoundContent />

        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Inter, Arial, sans-serif; background: #0f1117; color: #fff; }
          .not-found-page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            overflow: hidden;
            background:
              radial-gradient(circle at 75% 20%, rgba(56, 189, 248, 0.16), transparent 34%),
              radial-gradient(circle at 10% 80%, rgba(255, 255, 255, 0.08), transparent 28%),
              linear-gradient(135deg, #0f1117 0%, #111827 55%, #07111f 100%);
          }
          .not-found-shell {
            width: min(1100px, 100%);
            display: grid;
            grid-template-columns: 1fr 420px;
            gap: 56px;
            align-items: center;
          }
          .not-found-logo { width: 230px; height: auto; filter: brightness(0) invert(1); margin-bottom: 42px; }
          .not-found-kicker {
            display: inline-flex;
            padding: 8px 14px;
            border: 1px solid rgba(255,255,255,0.28);
            border-radius: 999px;
            color: rgba(255,255,255,0.78);
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-size: 12px;
            font-weight: 700;
          }
          h1 {
            margin: 26px 0 18px;
            font-size: clamp(42px, 8vw, 86px);
            line-height: 0.95;
            letter-spacing: -0.04em;
          }
          .not-found-text {
            max-width: 590px;
            color: rgba(255,255,255,0.72);
            font-size: 18px;
            line-height: 1.75;
          }
          .not-found-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 34px; }
          .not-found-actions a {
            display: inline-flex;
            min-height: 48px;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            padding: 0 22px;
            background: #fff;
            color: #0f1117;
            font-weight: 800;
            text-decoration: none;
            transition: transform 180ms ease, opacity 180ms ease;
          }
          .not-found-actions a:hover { transform: translateY(-2px); }
          .not-found-actions .secondary {
            background: transparent;
            color: #fff;
            border: 1px solid rgba(255,255,255,0.28);
          }
          .not-found-radar {
            position: relative;
            aspect-ratio: 1;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.14);
            background:
              linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px),
              radial-gradient(circle, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 55%, transparent 70%);
            background-size: 42px 42px, 42px 42px, auto;
            box-shadow: 0 0 80px rgba(15, 23, 42, 0.8), inset 0 0 60px rgba(255,255,255,0.04);
          }
          .not-found-radar .code {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            font-size: clamp(72px, 12vw, 140px);
            font-weight: 900;
            color: rgba(255,255,255,0.1);
          }
          .ring, .sweep, .dot { position: absolute; }
          .ring {
            inset: var(--inset);
            border: 1px solid rgba(255,255,255,0.16);
            border-radius: 50%;
          }
          .one { --inset: 14%; }
          .two { --inset: 28%; }
          .three { --inset: 42%; }
          .sweep {
            inset: 0;
            border-radius: 50%;
            background: conic-gradient(from 0deg, rgba(255,255,255,0.22), transparent 22%, transparent);
            animation: sweep 4s linear infinite;
          }
          .dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 0 22px rgba(255,255,255,0.9);
          }
          .a { left: 30%; top: 28%; }
          .b { right: 24%; top: 42%; }
          .c { left: 45%; bottom: 22%; }
          @keyframes sweep { to { transform: rotate(360deg); } }
          @media (max-width: 840px) {
            .not-found-page { place-items: start center; padding-top: 72px; }
            .not-found-shell { grid-template-columns: 1fr; gap: 40px; }
            .not-found-radar { width: min(320px, 88vw); margin: 0 auto; }
            .not-found-logo { width: 210px; margin-bottom: 34px; }
          }
        `}</style>
      </body>
    </html>
  );
}
