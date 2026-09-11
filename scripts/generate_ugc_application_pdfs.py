from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
PUBLIC_DOCS_DIR = ROOT / "public" / "portfolio" / "docs"

RESUME_PATH = OUTPUT_DIR / "Ebube-Michael-UGC-Video-Editor-Resume.pdf"
COVER_LETTER_PATH = OUTPUT_DIR / "Ebube-Michael-Dialed-In-Cover-Letter.pdf"
PUBLIC_RESUME_PATH = PUBLIC_DOCS_DIR / RESUME_PATH.name
PUBLIC_COVER_LETTER_PATH = PUBLIC_DOCS_DIR / COVER_LETTER_PATH.name

PORTFOLIO_DISPLAY = "mejforge.com/portfolio"
PORTFOLIO_URL = "https://mejforge.com/portfolio"
EMAIL_DISPLAY = "ebubemichael033@gmail.com"
EMAIL_URL = f"mailto:{EMAIL_DISPLAY}"
PHONE_DISPLAY = "(+234) 704-607-8162"
PHONE_URL = "tel:+2347046078162"
LINKEDIN_DISPLAY = "linkedin.com/in/ebube-michael-7911b1366"
LINKEDIN_URL = "https://www.linkedin.com/in/ebube-michael-7911b1366/"
BEHANCE_DISPLAY = "behance.net/ebubemichael"
BEHANCE_URL = "https://www.behance.net/ebubemichael"

INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#4b5563")
RULE = colors.HexColor("#cbd5e1")


def linked(label, url):
    return (
        f'<link href="{escape(url)}">'
        f'<font color="#1d4f91">{escape(label)}</font>'
        "</link>"
    )


def styles():
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "Name",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=22,
            textColor=INK,
            spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.2,
            leading=12.5,
            textColor=INK,
            spaceAfter=5,
        ),
        "contact": ParagraphStyle(
            "Contact",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=11.2,
            textColor=MUTED,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.8,
            leading=13,
            textColor=INK,
            spaceBefore=11,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=13.8,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=5,
        ),
        "body_tight": ParagraphStyle(
            "BodyTight",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.35,
            leading=12.8,
            textColor=INK,
            alignment=TA_LEFT,
        ),
        "role": ParagraphStyle(
            "Role",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.2,
            leading=12.5,
            textColor=INK,
        ),
        "date": ParagraphStyle(
            "Date",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=11.4,
            textColor=MUTED,
            alignment=TA_RIGHT,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=11.6,
            textColor=MUTED,
            spaceAfter=4,
        ),
        "skill_label": ParagraphStyle(
            "SkillLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.25,
            leading=12.2,
            textColor=INK,
        ),
        "skill_body": ParagraphStyle(
            "SkillBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.25,
            leading=12.2,
            textColor=INK,
        ),
        "letter_body": ParagraphStyle(
            "LetterBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.3,
            leading=15.2,
            textColor=INK,
            spaceAfter=11,
        ),
        "letter_meta": ParagraphStyle(
            "LetterMeta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=INK,
        ),
        "letter_subject": ParagraphStyle(
            "LetterSubject",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.1,
            leading=13.2,
            textColor=INK,
        ),
    }


def header(style):
    return [
        Paragraph("Ebube Junior Michael", style["name"]),
        Paragraph(
            "UGC Video Editor | Short-Form Ads | Social Media Creative Producer",
            style["title"],
        ),
        Paragraph(
            " | ".join(
                [
                    linked(PHONE_DISPLAY, PHONE_URL),
                    linked(EMAIL_DISPLAY, EMAIL_URL),
                    "Abuja, FCT, Nigeria",
                ]
            ),
            style["contact"],
        ),
        Paragraph(
            " | ".join(
                [
                    linked(PORTFOLIO_DISPLAY, PORTFOLIO_URL),
                    linked(LINKEDIN_DISPLAY, LINKEDIN_URL),
                    linked(BEHANCE_DISPLAY, BEHANCE_URL),
                ]
            ),
            style["contact"],
        ),
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=0.75, color=RULE, spaceAfter=9),
    ]


def section_title(text, style):
    return [
        Paragraph(text.upper(), style["section"]),
        HRFlowable(width="100%", thickness=0.45, color=RULE, spaceAfter=6),
    ]


def bullet_list(items, style):
    rows = [["-", Paragraph(item, style["body_tight"])] for item in items]
    table = Table(rows, colWidths=[0.32 * cm, None], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (0, -1), 8.7),
                ("TEXTCOLOR", (0, 0), (0, -1), INK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), 0),
                ("RIGHTPADDING", (1, 0), (1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1.4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4),
            ]
        )
    )
    return table


def role_block(role, company, period, bullets, style):
    header_table = Table(
        [[Paragraph(role, style["role"]), Paragraph(period, style["date"])]],
        colWidths=[12.4 * cm, 5.0 * cm],
        hAlign="LEFT",
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    return KeepTogether(
        [
            header_table,
            Paragraph(company, style["meta"]),
            bullet_list(bullets, style),
            Spacer(1, 6),
        ]
    )


def skill_rows(rows, style):
    table_rows = [
        [Paragraph(label, style["skill_label"]), Paragraph(body, style["skill_body"])]
        for label, body in rows
    ]
    table = Table(table_rows, colWidths=[4.2 * cm, None], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), 10),
                ("RIGHTPADDING", (1, 0), (1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(
        A4[0] - doc.rightMargin,
        0.72 * cm,
        f"Ebube Junior Michael | Page {doc.page}",
    )
    canvas.restoreState()


def build_resume(style):
    doc = SimpleDocTemplate(
        str(RESUME_PATH),
        pagesize=A4,
        rightMargin=1.75 * cm,
        leftMargin=1.75 * cm,
        topMargin=1.25 * cm,
        bottomMargin=1.25 * cm,
        title="Ebube Michael - UGC Video Editor Resume",
        author="Ebube Junior Michael",
    )

    story = [
        *header(style),
        *section_title("Professional Summary", style),
        Paragraph(
            "Short-form video editor and social media manager with 3+ years of experience creating UGC-style ads, Reels, campaign graphics, captions, scripts, and AI-assisted creative assets. Current Social Media Manager for OverwatchMoz, producing daily social content for a security technology brand focused on intelligent CCTV monitoring and virtual guarding.",
            style["body"],
        ),
        Paragraph(
            "Strong fit for Dialed In's creative production needs: hook-led editing, mobile-first captions, UGC ad structure, quick revision cycles, simple graphics, localized messaging, and AI-supported video concept development.",
            style["body"],
        ),
        *section_title("Core Competencies", style),
        skill_rows(
            [
                (
                    "Short-form video",
                    "TikTok, Instagram Reels, Facebook Reels, YouTube Shorts, ad cutdowns, captions, pacing, transitions, sound cues, and CTA polish.",
                ),
                (
                    "UGC ad production",
                    "Hook writing, problem/solution framing, founder or creator-style angles, creative variants, and testing-ready exports.",
                ),
                (
                    "AI creative workflow",
                    "Storyline development, image generation, generative video concepts, visual enhancement, prompt iteration, and rapid campaign ideation.",
                ),
                (
                    "Social creative",
                    "Campaign messaging, simple graphics, carousels, English/Portuguese localization, brand consistency, and publishing support.",
                ),
            ],
            style,
        ),
        *section_title("Professional Experience", style),
        role_block(
            "Social Media Manager",
            "OverwatchMoz - Full-time, Remote",
            "Mar 2026 - Present",
            [
                "Manage and develop social media content for a security technology company focused on intelligent CCTV monitoring and virtual guarding.",
                "Plan and create LinkedIn, Instagram, and Facebook content, including branded graphics, carousels, Reels, and short-form video campaigns.",
                "Develop content concepts, scripts, captions, campaign messaging, and Portuguese localized content for the Mozambican market.",
                "Use ChatGPT, Google Flow, Gemini, Higgsfield AI, CapCut, and Magnific Space to build storylines, generated visuals, video concepts, and campaign assets.",
                "Collaborate with management to translate security services and technical concepts into clear customer-facing content.",
            ],
            style,
        ),
        role_block(
            "Social Media Content Manager & Visual Designer",
            "Wamina | In partnership with Global Security Maputo - Remote",
            "Oct 2025 - Present",
            [
                "Produce monthly social assets and campaign visuals aligned to audience segments, brand voice, and performance goals.",
                "Create Overwatch video concepts, UGC-style ad assets, captioned edits, and localized variants for awareness and acquisition.",
            ],
            style,
        ),
        PageBreak(),
        *header(style),
        *section_title("Professional Experience Continued", style),
        role_block(
            "Graphic Design Specialist & Content Creator",
            "Freelance - Remote",
            "Aug 2022 - Present",
            [
                "Delivered 50+ digital and print pieces, including campaign graphics, social media kits, promotional creatives, brand identity systems, and video assets.",
                "Edited short-form videos and motion graphics using CapCut and Canva, shaping clips around openings, pacing, captions, and clear calls to action.",
            ],
            style,
        ),
        *section_title("Relevant Tools", style),
        skill_rows(
            [
                (
                    "AI storyline + images",
                    "ChatGPT for storyline development, hook ideation, script structure, prompt planning, and image generation.",
                ),
                (
                    "Generative video",
                    "Google Flow, Gemini, and Higgsfield AI for scene exploration, motion tests, visual concepts, and creative variations.",
                ),
                (
                    "Editing + design",
                    "CapCut, Canva, Premiere Pro, After Effects, and Magnific Space, formerly known as Freepik AI.",
                ),
                (
                    "Workflow",
                    "Meta Business Suite, Notion, Slack, content calendars, revision tracking, and organized creative handoff.",
                ),
            ],
            style,
        ),
        *section_title("Selected Creative Strengths", style),
        bullet_list(
            [
                "Builds creative around the first three seconds, with clear hooks, subtitle rhythm, and platform-native pacing.",
                "Creates multiple ad versions for different hooks, CTAs, languages, concepts, and audience angles.",
                "Balances AI-generated concepts with practical editing choices so final assets feel clear, usable, and brand-aligned.",
                "Maintains consistent visual standards across short-form videos, graphics, social posts, and campaign materials.",
            ],
            style,
        ),
        *section_title("Education + Certification", style),
        Paragraph(
            "B.Sc. Computer Science, University of the People - Expected 2029",
            style["body"],
        ),
        Paragraph(
            "B.Sc. Cybersecurity, Miva Open University - Expected 2029",
            style["body"],
        ),
        Paragraph("Graphic Design Essentials, Canva - 2025", style["body"]),
        *section_title("Links", style),
        Paragraph(
            f"Portfolio: {linked(PORTFOLIO_DISPLAY, PORTFOLIO_URL)}",
            style["body"],
        ),
        Paragraph(
            f"LinkedIn: {linked(LINKEDIN_DISPLAY, LINKEDIN_URL)}",
            style["body"],
        ),
        Paragraph(f"Behance: {linked(BEHANCE_DISPLAY, BEHANCE_URL)}", style["body"]),
    ]

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)


def build_cover_letter(style):
    doc = SimpleDocTemplate(
        str(COVER_LETTER_PATH),
        pagesize=A4,
        rightMargin=1.75 * cm,
        leftMargin=1.75 * cm,
        topMargin=1.35 * cm,
        bottomMargin=1.35 * cm,
        title="Ebube Michael - Dialed In Cover Letter",
        author="Ebube Junior Michael",
    )

    story = [
        *header(style),
        Paragraph("August 31, 2026", style["letter_meta"]),
        Spacer(1, 12),
        Paragraph("Dialed In Hiring Team", style["letter_meta"]),
        Paragraph(
            "Re: Video Editor UGC Ads, Short-Form Videos, Creative Graphics",
            style["letter_subject"],
        ),
        Spacer(1, 13),
        Paragraph("Dear Dialed In Hiring Team,", style["letter_body"]),
        Paragraph(
            "I am applying for the Video Editor role because the work you described matches the creative production I want to focus on: short-form ads, UGC-style edits, AI-assisted visuals, captions, graphics, fast feedback, and testing different hooks and concepts.",
            style["letter_body"],
        ),
        Paragraph(
            "In my current full-time remote role as Social Media Manager for OverwatchMoz, I create content for a security technology brand focused on intelligent CCTV monitoring and virtual guarding. My work includes Reels, short-form video campaigns, branded graphics, carousels, scripts, captions, Portuguese localized content, and campaign messaging.",
            style["letter_body"],
        ),
        Paragraph(
            "My AI production workflow is practical and role-relevant. I use ChatGPT for storyline development and image generation, then use Google Flow, Gemini, Higgsfield AI, CapCut, and Magnific Space for generative video, visual concepts, enhancement, final edits, and ad variations.",
            style["letter_body"],
        ),
        Paragraph(
            "I can bring Dialed In a dependable creative workflow: hook options, fast rough cuts, clean caption passes, simple graphics, organized revisions, and multiple exports for testing.",
            style["letter_body"],
        ),
        Paragraph(
            f"Thank you for reviewing my application. My role-specific portfolio is at {linked(PORTFOLIO_DISPLAY, PORTFOLIO_URL)}, with additional profile links in the header.",
            style["letter_body"],
        ),
        Spacer(1, 3),
        Paragraph("Sincerely,", style["letter_body"]),
        Paragraph("Ebube Junior Michael", style["letter_body"]),
    ]

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)


def copy_public():
    PUBLIC_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_RESUME_PATH.write_bytes(RESUME_PATH.read_bytes())
    PUBLIC_COVER_LETTER_PATH.write_bytes(COVER_LETTER_PATH.read_bytes())


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    style = styles()
    build_resume(style)
    build_cover_letter(style)
    copy_public()
    print(RESUME_PATH)
    print(COVER_LETTER_PATH)
    print(PUBLIC_RESUME_PATH)
    print(PUBLIC_COVER_LETTER_PATH)


if __name__ == "__main__":
    main()
