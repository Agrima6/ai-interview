from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(r"D:\cool projects\ai-interview")
WORK = ROOT / "tmp" / "pdfs" / "workmate-premium"
OUTPUT = ROOT / "output" / "pdf" / "Workmate_Cybersecurity_Consultancy_Pitch_Final_7Page.pdf"
LOGO = WORK / "workmate-logo.png"
RENDER_DIR = WORK / "rendered"

W, H = 960, 540
M = 42

RED = HexColor("#A8080D")
DEEP_RED = HexColor("#720509")
BRIGHT_RED = HexColor("#C3141A")
INK = HexColor("#171719")
TEXT = HexColor("#34363A")
MUTED = HexColor("#6D7077")
LINE = HexColor("#D7D5D2")
PALE = HexColor("#F9ECEC")
PALE_2 = HexColor("#F5F3F1")
PALE_BLUE = HexColor("#EEF3F8")
PALE_GREEN = HexColor("#EEF5EF")
GOLD = HexColor("#C88918")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Segoe", r"C:\Windows\Fonts\segoeui.ttf"))
    pdfmetrics.registerFont(TTFont("Segoe-Bold", r"C:\Windows\Fonts\segoeuib.ttf"))


def set_alpha(c: canvas.Canvas, fill: float | None = None, stroke: float | None = None) -> None:
    try:
        if fill is not None:
            c.setFillAlpha(fill)
        if stroke is not None:
            c.setStrokeAlpha(stroke)
    except Exception:
        pass


def text(c: canvas.Canvas, value: str, x: float, y: float, size: float = 10,
         color=TEXT, font: str = "Segoe", align: str = "left") -> None:
    c.setFont(font, size)
    c.setFillColor(color)
    if align == "center":
        c.drawCentredString(x, y, value)
    elif align == "right":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def wrap_lines(value: str, width: float, size: float, font: str) -> list[str]:
    lines: list[str] = []
    for paragraph in value.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        current = ""
        for word in paragraph.split():
            candidate = f"{current} {word}".strip()
            if not current or pdfmetrics.stringWidth(candidate, font, size) <= width:
                current = candidate
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def paragraph(c: canvas.Canvas, value: str, x: float, y: float, width: float,
              size: float = 10, leading: float | None = None, color=TEXT,
              font: str = "Segoe", max_lines: int | None = None) -> float:
    leading = leading or size * 1.35
    lines = wrap_lines(value, width, size, font)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        text(c, line, x, y, size, color, font)
        y -= leading
    return y


def pill(c: canvas.Canvas, value: str, x: float, y: float, w: float,
         fill=PALE, color=RED, border=None, size: float = 8.5) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(border or fill)
    c.roundRect(x, y, w, 24, 12, fill=1, stroke=1)
    text(c, value, x + w / 2, y + 7.5, size, color, "Segoe-Bold", "center")


def card(c: canvas.Canvas, x: float, y: float, w: float, h: float,
         fill=white, stroke=LINE, radius: float = 12) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def draw_shield(c: canvas.Canvas, x: float, y: float, size: float, color=RED, fill=None) -> None:
    p = c.beginPath()
    p.moveTo(x, y + size * 0.5)
    p.lineTo(x + size * 0.38, y + size * 0.36)
    p.lineTo(x + size * 0.34, y - size * 0.12)
    p.curveTo(x + size * 0.27, y - size * 0.35, x + size * 0.12, y - size * 0.48, x, y - size * 0.55)
    p.curveTo(x - size * 0.12, y - size * 0.48, x - size * 0.27, y - size * 0.35, x - size * 0.34, y - size * 0.12)
    p.lineTo(x - size * 0.38, y + size * 0.36)
    p.close()
    c.setStrokeColor(color)
    c.setFillColor(fill or white)
    c.setLineWidth(max(1.2, size * 0.06))
    c.drawPath(p, fill=1 if fill else 0, stroke=1)


def draw_check(c: canvas.Canvas, x: float, y: float, size: float, color=RED) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(max(1.5, size * 0.12))
    c.line(x - size * 0.4, y, x - size * 0.08, y - size * 0.32)
    c.line(x - size * 0.08, y - size * 0.32, x + size * 0.48, y + size * 0.35)


def draw_icon(c: canvas.Canvas, kind: str, x: float, y: float, size: float = 26, color=RED) -> None:
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.7)
    r = size / 2
    if kind == "shield":
        draw_shield(c, x, y, size, color)
    elif kind == "server":
        for dy in (r * 0.6, 0, -r * 0.6):
            c.roundRect(x - r, y + dy - r * 0.18, size, r * 0.36, 3, fill=0, stroke=1)
            c.circle(x - r * 0.65, y + dy, 1.5, fill=1, stroke=0)
    elif kind == "code":
        c.roundRect(x - r, y - r * 0.72, size, size * 0.72, 4, fill=0, stroke=1)
        c.line(x - r, y + r * 0.34, x + r, y + r * 0.34)
        text(c, "</>", x, y - 4, size * 0.44, color, "Segoe-Bold", "center")
    elif kind == "wifi":
        for scale in (1.0, 0.68, 0.38):
            rr = r * scale
            c.arc(x - rr, y - rr * 0.35, x + rr, y + rr * 1.0, 35, 110)
        c.circle(x, y - r * 0.35, 2.2, fill=1, stroke=0)
    elif kind == "people":
        c.circle(x - r * 0.28, y + r * 0.25, r * 0.25, fill=0, stroke=1)
        c.circle(x + r * 0.32, y + r * 0.15, r * 0.2, fill=0, stroke=1)
        c.arc(x - r * 0.75, y - r * 0.65, x + r * 0.2, y + r * 0.05, 10, 160)
        c.arc(x, y - r * 0.6, x + r * 0.78, y - r * 0.02, 10, 160)
    elif kind == "govern":
        c.circle(x, y, r * 0.9, fill=0, stroke=1)
        c.line(x - r * 0.45, y - r * 0.4, x - r * 0.45, y + r * 0.12)
        c.line(x, y - r * 0.4, x, y + r * 0.45)
        c.line(x + r * 0.45, y - r * 0.4, x + r * 0.45, y - r * 0.05)
    elif kind == "target":
        c.circle(x, y, r * 0.95, fill=0, stroke=1)
        c.circle(x, y, r * 0.55, fill=0, stroke=1)
        c.circle(x, y, r * 0.14, fill=1, stroke=0)
        c.line(x + r * 0.25, y + r * 0.25, x + r * 1.05, y + r * 1.05)
    elif kind == "search":
        c.circle(x - r * 0.18, y + r * 0.18, r * 0.62, fill=0, stroke=1)
        c.line(x + r * 0.25, y - r * 0.25, x + r * 0.88, y - r * 0.88)
    elif kind == "document":
        c.rect(x - r * 0.65, y - r, r * 1.3, size, fill=0, stroke=1)
        for dy in (r * 0.45, r * 0.05, -r * 0.35):
            c.line(x - r * 0.38, y + dy, x + r * 0.38, y + dy)
    elif kind == "lock":
        c.roundRect(x - r * 0.7, y - r * 0.45, r * 1.4, r * 1.05, 4, fill=0, stroke=1)
        c.arc(x - r * 0.48, y + r * 0.05, x + r * 0.48, y + r * 1.1, 0, 180)
    elif kind == "check":
        c.circle(x, y, r * 0.95, fill=0, stroke=1)
        draw_check(c, x, y, r * 0.9, color)
    elif kind == "chart":
        c.line(x - r, y - r, x - r, y + r)
        c.line(x - r, y - r, x + r, y - r)
        c.setLineWidth(3)
        c.line(x - r * 0.65, y - r * 0.6, x - r * 0.65, y - r * 0.05)
        c.line(x, y - r * 0.6, x, y + r * 0.35)
        c.line(x + r * 0.65, y - r * 0.6, x + r * 0.65, y + r * 0.75)
    else:
        c.circle(x, y, r * 0.85, fill=0, stroke=1)


def logo(c: canvas.Canvas, x: float = M, y: float = 469, w: float = 190) -> None:
    with Image.open(LOGO) as im:
        ratio = im.height / im.width
    c.drawImage(ImageReader(str(LOGO)), x, y, width=w, height=w * ratio, mask="auto")


def header(c: canvas.Canvas, page: int, section: str) -> None:
    logo(c, M, 482, 180)
    text(c, f"{page:02d}  |  {section.upper()}", W - M, 505, 8.5, RED, "Segoe-Bold", "right")
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.line(M, 474, W - M, 474)


def footer(c: canvas.Canvas, page: int) -> None:
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(M, 27, W - M, 27)
    text(c, "www.wcspl.net", M, 11, 7.5, MUTED)
    text(c, "Cybersecurity  |  VAPT  |  ISO 27001 / ISMS", W / 2, 11, 7.5, MUTED, "Segoe", "center")
    text(c, f"{page:02d}", W - M, 10, 8.5, RED, "Segoe-Bold", "right")


def title_block(c: canvas.Canvas, title_value: str, subtitle: str | None = None) -> float:
    text(c, title_value, M, 432, 29, INK, "Segoe-Bold")
    y = 404
    if subtitle:
        y = paragraph(c, subtitle, M, 402, 730, 11, 15, MUTED) - 5
    return y


def page_cover(c: canvas.Canvas) -> None:
    c.setFillColor(HexColor("#FBFAF8"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Abstract network field.
    c.setFillColor(PALE)
    c.circle(774, 270, 250, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#E3B7B9"))
    c.setLineWidth(1)
    for radius in (72, 126, 184, 238):
        c.circle(774, 270, radius, fill=0, stroke=1)
    nodes = [(702, 342), (839, 358), (873, 248), (718, 195), (808, 143), (654, 260)]
    for i, (x, y) in enumerate(nodes):
        c.setStrokeColor(HexColor("#D78E91"))
        c.line(774, 270, x, y)
        c.setFillColor(RED if i in (1, 4) else white)
        c.circle(x, y, 8 if i in (1, 4) else 6, fill=1, stroke=1)
    c.setFillColor(white)
    c.circle(774, 270, 60, fill=1, stroke=0)
    draw_shield(c, 774, 272, 58, RED)
    draw_check(c, 774, 270, 25, RED)

    logo(c, M, 450, 228)
    text(c, "CYBERSECURITY CONSULTING", M, 390, 10, RED, "Segoe-Bold")
    text(c, "Strengthening Your", M, 342, 37, INK, "Segoe-Bold")
    text(c, "Cybersecurity Posture", M, 297, 37, INK, "Segoe-Bold")
    c.setFillColor(RED)
    c.roundRect(M, 270, 78, 4, 2, fill=1, stroke=0)
    paragraph(c,
              "Identify exposure. Prioritize risk. Remediate vulnerabilities. "
              "Verify closure. Strengthen governance.",
              M, 233, 540, 14, 20, TEXT, "Segoe", 3)

    steps = ["IDENTIFY", "PRIORITIZE", "REMEDIATE", "REVALIDATE", "GOVERN"]
    x = M
    for i, item in enumerate(steps):
        pill(c, item, x, 116, 104, PALE if i != 3 else RED, white if i == 3 else RED)
        x += 116
    text(c, "Professional cybersecurity assessment, VAPT and ISO 27001 / ISMS readiness support", M, 78, 9.5, MUTED)
    text(c, "Workmate Consultancy Services", M, 28, 8.5, MUTED)
    text(c, "01", W - M, 28, 9, RED, "Segoe-Bold", "right")
    c.showPage()


def page_challenge(c: canvas.Canvas) -> None:
    header(c, 2, "The Security Challenge")
    title_block(c, "Exposure rarely lives in one place.",
                "Applications, identities, infrastructure and governance form one connected attack surface.")

    # Left narrative.
    text(c, "THE CLIENT REALITY", M, 352, 9, RED, "Segoe-Bold")
    text(c, "One weakness can become", M, 315, 23, INK, "Segoe-Bold")
    text(c, "a complete attack path.", M, 285, 23, RED, "Segoe-Bold")
    paragraph(c,
              "Misconfigurations, weak access controls, vulnerable components and human error "
              "can combine across domains - turning isolated gaps into operational and business risk.",
              M, 248, 355, 11, 16, TEXT, "Segoe", 6)

    # Attack surface ecosystem.
    cx, cy = 700, 285
    set_alpha(c, fill=0.7, stroke=0.7)
    c.setFillColor(PALE)
    c.circle(cx, cy, 74, fill=1, stroke=0)
    set_alpha(c, fill=1, stroke=1)
    draw_shield(c, cx, cy + 8, 48, RED)
    text(c, "CONNECTED", cx, cy - 24, 8, RED, "Segoe-Bold", "center")
    text(c, "ATTACK SURFACE", cx, cy - 38, 9.5, INK, "Segoe-Bold", "center")
    nodes = [
        (cx, cy + 128, "Applications", "code"),
        (cx + 142, cy + 74, "APIs", "target"),
        (cx + 154, cy - 58, "Infrastructure", "server"),
        (cx + 70, cy - 136, "Perimeter", "shield"),
        (cx - 70, cy - 136, "Wireless", "wifi"),
        (cx - 154, cy - 58, "People", "people"),
        (cx - 142, cy + 74, "Source Code", "document"),
    ]
    for x, y, label_value, kind in nodes:
        c.setStrokeColor(HexColor("#D4B1B3"))
        c.setLineWidth(1)
        c.line(cx, cy, x, y)
        c.setFillColor(white)
        c.setStrokeColor(HexColor("#E1CECF"))
        c.circle(x, y, 35, fill=1, stroke=1)
        draw_icon(c, kind, x, y + 3, 23, RED)
        text(c, label_value, x, y - 51, 8.2, TEXT, "Segoe-Bold", "center")

    # Bottom consequences.
    items = [
        ("01", "Blind spots compound", "Gaps across layers can reinforce one another."),
        ("02", "Risk competes for attention", "Teams need evidence and prioritization - not scanner noise."),
        ("03", "Unverified fixes remain risk", "Remediation only matters when closure is confirmed."),
    ]
    for i, (num, heading, body) in enumerate(items):
        x = M + i * 292
        card(c, x, 55, 276, 78, PALE_2, HexColor("#E7E2DE"), 10)
        text(c, num, x + 17, 105, 9, RED, "Segoe-Bold")
        text(c, heading, x + 49, 103, 11.2, INK, "Segoe-Bold")
        paragraph(c, body, x + 17, 82, 242, 8.5, 11, MUTED, "Segoe", 2)
    footer(c, 2)
    c.showPage()


def page_coverage(c: canvas.Canvas) -> None:
    header(c, 3, "Integrated Security Coverage")
    title_block(c, "What must be strengthened",
                "Security is not one scan. Workmate connects technical testing, human risk and governance into one security posture.")

    center_x, center_y = 480, 252
    c.setFillColor(PALE)
    c.circle(center_x, center_y, 77, fill=1, stroke=0)
    draw_shield(c, center_x, center_y + 13, 45, RED)
    text(c, "INTEGRATED", center_x, center_y - 22, 8.5, RED, "Segoe-Bold", "center")
    text(c, "SECURITY COVERAGE", center_x, center_y - 38, 10, INK, "Segoe-Bold", "center")

    domains = [
        (50, 285, 255, 104, "01", "Infrastructure & Network", "server",
         "Internal VA & PT\nExternal vulnerability assessment & PT"),
        (655, 285, 255, 104, "02", "Application, API & Code", "code",
         "Web and API testing\nAuth, business logic & source-code review"),
        (50, 142, 255, 104, "03", "Perimeter & Wireless", "wifi",
         "Firewall ruleset review\nWi-Fi security and rogue-access testing"),
        (352, 83, 256, 105, "04", "Human Risk", "people",
         "Phishing simulation\nCybersecurity awareness"),
        (655, 142, 255, 104, "05", "Governance & ISMS", "govern",
         "ISO 27001 gap and risk assessment\nControl alignment & readiness support"),
    ]
    for x, y, w, h, num, heading, kind, body in domains:
        # Connector from card to center.
        anchor_x = x + w / 2
        anchor_y = y + h / 2
        c.setStrokeColor(HexColor("#E0BFC1"))
        c.setLineWidth(1.2)
        c.line(center_x, center_y, anchor_x, anchor_y)
    for x, y, w, h, num, heading, kind, body in domains:
        card(c, x, y, w, h, white, HexColor("#DEDAD7"), 12)
        c.setFillColor(PALE)
        c.circle(x + 40, y + h - 36, 24, fill=1, stroke=0)
        draw_icon(c, kind, x + 40, y + h - 36, 25, RED)
        text(c, num, x + 78, y + h - 27, 8.5, RED, "Segoe-Bold")
        text(c, heading, x + 78, y + h - 47, 12.2, INK, "Segoe-Bold")
        paragraph(c, body, x + 18, y + h - 73, w - 36, 8.7, 12, MUTED, "Segoe", 3)

    c.setFillColor(DEEP_RED)
    c.roundRect(M, 48, W - 2 * M, 28, 14, fill=1, stroke=0)
    text(c, "Applications  +  APIs  +  Infrastructure  +  People  +  Governance", W / 2, 57.5, 9.5, white, "Segoe-Bold", "center")
    footer(c, 3)
    c.showPage()


def page_vapt(c: canvas.Canvas) -> None:
    header(c, 4, "Vulnerability Assessment & Penetration Testing")
    title_block(c, "VAPT: from discovery to verified closure",
                "Find the weakness. Validate the risk. Fix what matters. Confirm closure.")

    steps = [
        ("01", "DISCOVER", "Assets, exposure\nand entry points", "search"),
        ("02", "ASSESS", "Automated scanning +\ntargeted manual tests", "target"),
        ("03", "VALIDATE", "Remove false positives;\nconfirm vulnerabilities", "check"),
        ("04", "EXPLOIT SAFELY", "Validate attack paths\nand business impact", "code"),
        ("05", "PRIORITIZE", "CVSS/CVE risk and\nremediation priority", "chart"),
        ("06", "REMEDIATE", "Evidence-backed\nfix guidance", "document"),
        ("07", "REVALIDATE", "Retest corrected\nvulnerabilities", "search"),
        ("08", "CLOSE", "Confirm closure and\nresidual risk", "shield"),
    ]
    start_x, gap = 56, 112
    line_y = 337
    c.setStrokeColor(HexColor("#D6B4B6"))
    c.setLineWidth(2)
    c.line(start_x, line_y, start_x + gap * 7, line_y)
    for i, (num, heading, body, kind) in enumerate(steps):
        x = start_x + i * gap
        c.setFillColor(white)
        c.setStrokeColor(RED)
        c.circle(x, line_y, 27, fill=1, stroke=1)
        draw_icon(c, kind, x, line_y, 24, RED)
        c.setFillColor(RED)
        c.circle(x, line_y + 35, 13, fill=1, stroke=0)
        text(c, num, x, line_y + 31.5, 7.5, white, "Segoe-Bold", "center")
        text(c, heading, x, line_y - 47, 8.6, INK, "Segoe-Bold", "center")
        for j, line in enumerate(body.split("\n")):
            text(c, line, x, line_y - 69 - j * 12, 7.7, MUTED, "Segoe", "center")

    # Method tags.
    tags = [
        ("AUTOMATED + MANUAL", 142),
        ("AUTHENTICATED / UNAUTHENTICATED", 190),
        ("BLACK-BOX / GREY-BOX", 145),
        ("OWASP-ALIGNED", 112),
        ("MANUAL SCANNER VALIDATION", 166),
    ]
    x = M
    for label_value, width in tags:
        pill(c, label_value, x, 195, width, PALE_2, RED, HexColor("#E4DEDA"), 7.8)
        x += width + 9

    # Deliverables strip.
    c.setFillColor(DEEP_RED)
    c.roundRect(M, 53, W - 2 * M, 113, 13, fill=1, stroke=0)
    text(c, "CLIENT DELIVERABLES", M + 24, 137, 9, HexColor("#F4C6C8"), "Segoe-Bold")
    deliverables = [
        ("Executive Summary", "Leadership view of risk and priorities"),
        ("Technical Report", "Evidence, impact and affected assets"),
        ("Remediation Roadmap", "Prioritized, actionable fix guidance"),
        ("Revalidation Results", "Retest evidence and closure status"),
    ]
    for i, (heading, body) in enumerate(deliverables):
        x = M + 24 + i * 214
        if i:
            c.setStrokeColor(HexColor("#B94A4D"))
            c.line(x - 14, 72, x - 14, 138)
        draw_icon(c, "document" if i < 3 else "check", x + 13, 101, 24, white)
        text(c, heading, x + 38, 109, 10.2, white, "Segoe-Bold")
        paragraph(c, body, x + 38, 91, 156, 7.8, 10.5, HexColor("#F4DDDE"), "Segoe", 2)
    text(c, "Methodologies referenced: OWASP  |  NIST  |  CVSS  |  CVE  |  CWE", M, 37, 7.5, MUTED)
    footer(c, 4)
    c.showPage()


def page_iso(c: canvas.Canvas) -> None:
    header(c, 5, "ISO 27001 & ISMS Readiness")
    title_block(c, "From security controls to a working ISMS",
                "Technical controls, governance, people and process - aligned through a risk-based management system.")

    phases = [
        (M, 220, 276, 150, "01", "DISCOVER", "search", PALE_BLUE,
         ["Current-state review", "Gap assessment", "Risk assessment"]),
        (342, 220, 276, 150, "02", "BUILD", "govern", PALE,
         ["Control alignment", "Policies, procedures & ISMS", "Remediation / risk treatment"]),
        (642, 220, 276, 150, "03", "PREPARE & IMPROVE", "check", PALE_GREEN,
         ["Internal audit & management review", "Independent audit readiness", "Continual improvement"]),
    ]
    for i in range(2):
        x1 = phases[i][0] + phases[i][2]
        x2 = phases[i + 1][0]
        c.setStrokeColor(RED)
        c.setLineWidth(1.6)
        c.line(x1 + 5, 295, x2 - 5, 295)
        c.line(x2 - 13, 301, x2 - 5, 295)
        c.line(x2 - 13, 289, x2 - 5, 295)
    for x, y, w, h, num, heading, kind, fill, items in phases:
        card(c, x, y, w, h, fill, HexColor("#DDD7D3"), 14)
        c.setFillColor(white)
        c.circle(x + 42, y + h - 40, 25, fill=1, stroke=0)
        draw_icon(c, kind, x + 42, y + h - 40, 24, RED)
        text(c, num, x + 80, y + h - 29, 8.5, RED, "Segoe-Bold")
        text(c, heading, x + 80, y + h - 50, 13.2, INK, "Segoe-Bold")
        for j, item in enumerate(items):
            yy = y + h - 82 - j * 23
            c.setFillColor(RED)
            c.circle(x + 20, yy + 4, 2.3, fill=1, stroke=0)
            text(c, item, x + 31, yy, 9, TEXT, "Segoe")

    text(c, "ISO 27001:2022 CONTROL GROUPS", M, 190, 9, RED, "Segoe-Bold")
    controls = [
        ("A.5", "Organizational", "37 controls", "govern"),
        ("A.6", "People", "8 controls", "people"),
        ("A.7", "Physical", "14 controls", "lock"),
        ("A.8", "Technological", "34 controls", "code"),
    ]
    for i, (code, heading, count, kind) in enumerate(controls):
        x = M + i * 219
        card(c, x, 92, 205, 78, white, HexColor("#E2DEDB"), 10)
        c.setFillColor(PALE)
        c.circle(x + 35, 131, 22, fill=1, stroke=0)
        draw_icon(c, kind, x + 35, 131, 22, RED)
        text(c, code, x + 68, 144, 10, RED, "Segoe-Bold")
        text(c, heading, x + 68, 125, 10.5, INK, "Segoe-Bold")
        text(c, count, x + 68, 108, 8.2, MUTED)

    c.setFillColor(PALE_2)
    c.roundRect(M, 45, W - 2 * M, 32, 8, fill=1, stroke=0)
    paragraph(c,
              "ISO 27001 certification is awarded by an independent accredited certification body. "
              "Workmate supports gap assessment, ISMS/control implementation, remediation, documentation and certification readiness.",
              M + 16, 64, W - 2 * M - 32, 7.4, 9.2, MUTED, "Segoe", 2)
    footer(c, 5)
    c.showPage()


def page_closure(c: canvas.Canvas) -> None:
    header(c, 6, "Assessment to Verified Closure")
    title_block(c, "Findings are the start - not the finish.",
                "A governed engagement that moves risk from discovery through remediation and verified closure.")

    steps = [
        ("01", "PLAN &\nSCOPE", "target"),
        ("02", "ASSESS", "search"),
        ("03", "VALIDATE\nFINDINGS", "check"),
        ("04", "PRIORITIZE", "chart"),
        ("05", "REPORT", "document"),
        ("06", "GUIDE\nREMEDIATION", "govern"),
        ("07", "REVALIDATE", "search"),
        ("08", "CLOSE", "shield"),
    ]
    x0, gap, y = 62, 118, 333
    c.setStrokeColor(RED)
    c.setLineWidth(2.2)
    c.line(x0, y, x0 + gap * 7, y)
    for i, (num, label_value, kind) in enumerate(steps):
        x = x0 + i * gap
        c.setFillColor(white)
        c.setStrokeColor(RED)
        c.circle(x, y, 28, fill=1, stroke=1)
        draw_icon(c, kind, x, y, 23, RED)
        c.setFillColor(RED)
        c.circle(x, y + 37, 13, fill=1, stroke=0)
        text(c, num, x, y + 33.5, 7.4, white, "Segoe-Bold", "center")
        for j, line in enumerate(label_value.split("\n")):
            text(c, line, x, y - 50 - j * 12, 8.1, INK, "Segoe-Bold", "center")

    # Client visibility lane.
    text(c, "CLIENT VISIBILITY", M, 227, 8.5, RED, "Segoe-Bold")
    c.setFillColor(PALE_2)
    c.roundRect(M, 132, W - 2 * M, 82, 12, fill=1, stroke=0)
    touchpoints = [
        ("Kickoff & agreed scope", "Roles, assets, windows and rules of engagement"),
        ("Status updates", "Progress, risks, blockers and emerging priorities"),
        ("Findings discussion", "Evidence, severity, impact and remediation options"),
        ("Executive walkthrough", "Risk posture, priorities and closure decisions"),
    ]
    for i, (heading, body) in enumerate(touchpoints):
        x = M + 20 + i * 215
        if i:
            c.setStrokeColor(HexColor("#DAD4D0"))
            c.line(x - 15, 146, x - 15, 199)
        text(c, heading, x, 188, 9.6, INK, "Segoe-Bold")
        paragraph(c, body, x, 169, 190, 7.8, 10.5, MUTED, "Segoe", 3)

    # Closure proof.
    c.setFillColor(DEEP_RED)
    c.roundRect(M, 51, W - 2 * M, 62, 12, fill=1, stroke=0)
    draw_icon(c, "check", M + 35, 82, 30, white)
    text(c, "CLOSURE EVIDENCE", M + 65, 90, 9, HexColor("#F3C2C4"), "Segoe-Bold")
    text(c, "Technical report  |  remediation roadmap  |  retest evidence  |  closure register  |  residual-risk status", M + 65, 70, 10.5, white, "Segoe-Bold")
    footer(c, 6)
    c.showPage()


def page_why(c: canvas.Canvas) -> None:
    header(c, 7, "Why Workmate")
    title_block(c, "Technical depth. Clear decisions. Follow-through.",
                "A senior-led security partner focused on evidence, action and measurable closure.")

    differentiators = [
        ("Senior-led engagement", "Senior practitioners stay involved from planning through sign-off.", "people"),
        ("Expert-led testing", "Manual security expertise supported by targeted automation.", "target"),
        ("Peer-reviewed findings", "Evidence and severity are reviewed before reaching your team.", "check"),
        ("Evidence, not scanner noise", "Manual validation keeps teams focused on actionable risk.", "search"),
        ("Closure-focused delivery", "Remediation guidance, retesting and final closure status.", "shield"),
        ("Transparent communication", "Consistent updates and clear stakeholder visibility.", "document"),
    ]
    for i, (heading, body, kind) in enumerate(differentiators):
        col, row = i % 2, i // 2
        x = M + col * 242
        y = 315 - row * 91
        card(c, x, y, 228, 77, white, HexColor("#E1DDDA"), 10)
        c.setFillColor(PALE)
        c.circle(x + 34, y + 39, 21, fill=1, stroke=0)
        draw_icon(c, kind, x + 34, y + 39, 21, RED)
        text(c, heading, x + 67, y + 49, 9.8, INK, "Segoe-Bold")
        paragraph(c, body, x + 67, y + 31, 145, 7.6, 10, MUTED, "Segoe", 3)

    # Business value panel.
    panel_x = 550
    c.setFillColor(DEEP_RED)
    c.roundRect(panel_x, 118, 368, 274, 16, fill=1, stroke=0)
    text(c, "THE VALUE YOU RECEIVE", panel_x + 24, 360, 9, HexColor("#F1BFC1"), "Segoe-Bold")
    text(c, "Security improvement", panel_x + 24, 327, 22, white, "Segoe-Bold")
    text(c, "that teams can act on.", panel_x + 24, 299, 22, white, "Segoe-Bold")
    outcomes = [
        "Reduced attack surface",
        "Prioritized remediation",
        "Verified vulnerability closure",
        "Stronger application, API & infrastructure security",
        "Better cyber-risk visibility",
        "Improved governance & ISO readiness",
    ]
    yy = 262
    for outcome in outcomes:
        c.setFillColor(white)
        c.circle(panel_x + 31, yy + 3, 7.5, fill=0, stroke=1)
        draw_check(c, panel_x + 31, yy + 3, 7, white)
        text(c, outcome, panel_x + 49, yy, 9.2, white, "Segoe-Bold")
        yy -= 27

    # CTA.
    c.setFillColor(PALE)
    c.roundRect(M, 52, W - 2 * M, 57, 12, fill=1, stroke=0)
    text(c, "ASSESS. STRENGTHEN. REVALIDATE.", M + 22, 82, 9, RED, "Segoe-Bold")
    text(c, "Let's strengthen your security posture.", M + 22, 62, 15, INK, "Segoe-Bold")
    text(c, "www.wcspl.net", W - M - 22, 72, 10.5, RED, "Segoe-Bold", "right")
    footer(c, 7)
    c.showPage()


def build_pdf() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("Workmate Cybersecurity Consultancy Pitch")
    c.setAuthor("Workmate Consultancy Services")
    page_cover(c)
    page_challenge(c)
    page_coverage(c)
    page_vapt(c)
    page_iso(c)
    page_closure(c)
    page_why(c)
    c.save()


def render_pdf() -> list[Path]:
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(str(OUTPUT))
    paths: list[Path] = []
    for i in range(len(document)):
        page = document[i]
        image = page.render(scale=2.0).to_pil().convert("RGB")
        path = RENDER_DIR / f"page-{i + 1}.png"
        image.save(path, "PNG", optimize=True)
        paths.append(path)
    return paths


def make_contact_sheet(paths: Iterable[Path]) -> Path:
    paths = list(paths)
    thumb_w, gap, label_h = 420, 22, 28
    thumbs: list[Image.Image] = []
    for path in paths:
        with Image.open(path) as image:
            h = round(thumb_w * image.height / image.width)
            thumbs.append(image.convert("RGB").resize((thumb_w, h), Image.Resampling.LANCZOS))
    cell_h = max(im.height for im in thumbs) + label_h
    rows = (len(thumbs) + 1) // 2
    sheet = Image.new("RGB", (thumb_w * 2 + gap * 3, rows * cell_h + gap * (rows + 1)), "#D9D9D9")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 16)
    for i, image in enumerate(thumbs):
        col, row = i % 2, i // 2
        x = gap + col * (thumb_w + gap)
        y = gap + row * (cell_h + gap)
        draw.text((x, y), f"Page {i + 1}", font=font, fill="#111111")
        sheet.paste(image, (x, y + label_h))
    path = WORK / "contact-sheet.png"
    sheet.save(path, "PNG", optimize=True)
    return path


def validate() -> tuple[int, int]:
    reader = PdfReader(str(OUTPUT))
    assert len(reader.pages) == 7
    for page in reader.pages:
        assert float(page.mediabox.width) == W
        assert float(page.mediabox.height) == H
    extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
    required = [
        "Strengthening Your\nCybersecurity Posture",
        "Exposure rarely lives in one place",
        "What must be strengthened",
        "VAPT: from discovery to verified closure",
        "From security controls to a working ISMS",
        "Findings are the start",
        "WHY WORKMATE",
        "independent accredited certification body",
    ]
    missing = [item for item in required if item not in extracted]
    assert not missing, missing
    return len(reader.pages), len(extracted)


def main() -> None:
    register_fonts()
    assert LOGO.exists(), LOGO
    build_pdf()
    pages, chars = validate()
    renders = render_pdf()
    sheet = make_contact_sheet(renders)
    print(f"OUTPUT={OUTPUT}")
    print(f"PAGES={pages}")
    print(f"EXTRACTED_TEXT_CHARS={chars}")
    print(f"CONTACT_SHEET={sheet}")


if __name__ == "__main__":
    main()
