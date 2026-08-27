from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat
from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(r"D:\cool projects\ai-interview")
SOURCE_PDF = Path(
    r"C:\Users\sneha\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm"
    r"\LocalState\sessions\2A179051576900B4B780C37B52E55FB42360DD53"
    r"\transfers\2026-34\Workmate_Consultancy_Services_Introduction.pdf"
)
REFERENCES = [
    Path(r"C:\Users\sneha\AppData\Local\Temp\codex-clipboard-76b435dd-3aef-4032-937f-2bd25d96467d.png"),
    Path(r"C:\Users\sneha\AppData\Local\Temp\codex-clipboard-588a4590-dfc7-4089-ae85-042b29080ce1.png"),
    Path(r"C:\Users\sneha\AppData\Local\Temp\codex-clipboard-3bfd189e-4beb-4775-822d-a9fdd2806888.png"),
    Path(r"C:\Users\sneha\AppData\Local\Temp\codex-clipboard-b9e96255-6215-4d5d-94d0-771d8080ffb0.png"),
    Path(r"C:\Users\sneha\AppData\Local\Temp\codex-clipboard-2b1ee89d-d58c-471b-b6b7-bece2348227e.png"),
]
OUTPUT = ROOT / "output" / "pdf" / "Workmate_Cybersecurity_Consultancy_Pitch_Final.pdf"
WORK = ROOT / "tmp" / "pdfs" / "workmate-final"
RENDER_DIR = WORK / "rendered"
PAGE_DPI = 200


def fit_rect(image_size: tuple[int, int], page_size: tuple[float, float]) -> tuple[float, float, float, float]:
    iw, ih = image_size
    pw, ph = page_size
    scale = min(pw / iw, ph / ih)
    w, h = iw * scale, ih * scale
    return (pw - w) / 2, (ph - h) / 2, w, h


def make_reference_pdf(page_size: tuple[float, float]) -> PdfReader:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=page_size, pageCompression=1)
    for ref in REFERENCES:
        with Image.open(ref) as image:
            x, y, w, h = fit_rect(image.size, page_size)
        c.setFillColorRGB(1, 1, 1)
        c.rect(0, 0, page_size[0], page_size[1], fill=1, stroke=0)
        c.drawImage(ImageReader(str(ref)), x, y, width=w, height=h, preserveAspectRatio=True, mask="auto")
        c.showPage()
    c.save()
    buffer.seek(0)
    return PdfReader(buffer)


def build() -> tuple[float, float]:
    source = PdfReader(str(SOURCE_PDF))
    assert len(source.pages) >= 1
    page_size = (float(source.pages[0].mediabox.width), float(source.pages[0].mediabox.height))
    refs_pdf = make_reference_pdf(page_size)

    writer = PdfWriter()
    writer.add_page(source.pages[0])
    for page in refs_pdf.pages:
        writer.add_page(page)
    writer.add_metadata({
        "/Title": "Workmate Cybersecurity Consultancy Pitch",
        "/Author": "Workmate Consultancy Services",
    })
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("wb") as handle:
        writer.write(handle)

    final = PdfReader(str(OUTPUT))
    assert len(final.pages) == 6
    for page in final.pages:
        assert float(page.mediabox.width) == page_size[0]
        assert float(page.mediabox.height) == page_size[1]
    return page_size


def render_pdf(pdf_path: Path, destination: Path, prefix: str) -> list[Path]:
    destination.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(str(pdf_path))
    rendered: list[Path] = []
    for index in range(len(document)):
        page = document[index]
        bitmap = page.render(scale=PAGE_DPI / 72)
        image = bitmap.to_pil().convert("RGB")
        out = destination / f"{prefix}-{index + 1}.png"
        image.save(out, "PNG", optimize=True)
        rendered.append(out)
    return rendered


def verify_page_one(final_render: Path) -> bool:
    original_dir = WORK / "original-page-1"
    original = render_pdf(SOURCE_PDF, original_dir, "original")[0]
    with Image.open(original) as a, Image.open(final_render) as b:
        return ImageChops.difference(a.convert("RGB"), b.convert("RGB")).getbbox() is None


def reference_similarity(final_render: Path, reference: Path) -> float:
    with Image.open(final_render) as rendered, Image.open(reference) as ref:
        rendered = rendered.convert("RGB")
        expected = Image.new("RGB", rendered.size, "white")
        x, y, w, h = fit_rect(ref.size, rendered.size)
        fitted = ref.convert("RGB").resize((round(w), round(h)), Image.Resampling.LANCZOS)
        expected.paste(fitted, (round(x), round(y)))
        difference = ImageChops.difference(rendered, expected)
        mean = sum(ImageStat.Stat(difference).mean) / 3
        return max(0.0, 100.0 * (1.0 - mean / 255.0))


def make_contact_sheet(rendered: list[Path]) -> Path:
    thumb_w = 420
    gap = 24
    label_h = 34
    thumbs: list[Image.Image] = []
    for path in rendered:
        with Image.open(path) as image:
            thumb_h = round(thumb_w * image.height / image.width)
            thumbs.append(image.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS))
    cell_h = max(image.height for image in thumbs) + label_h
    sheet = Image.new("RGB", (thumb_w * 2 + gap * 3, cell_h * 3 + gap * 4), "#dddddd")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=18)
    for i, image in enumerate(thumbs):
        col, row = i % 2, i // 2
        x = gap + col * (thumb_w + gap)
        y = gap + row * (cell_h + gap)
        sheet.paste(image, (x, y + label_h))
        draw.text((x, y + 6), f"Final Page {i + 1}", fill="black", font=font)
    out = WORK / "final-contact-sheet.png"
    sheet.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    page_size = build()
    rendered = render_pdf(OUTPUT, RENDER_DIR, "final")
    page_one_identical = verify_page_one(rendered[0])
    similarities = [reference_similarity(rendered[i + 1], REFERENCES[i]) for i in range(5)]
    contact_sheet = make_contact_sheet(rendered)

    assert page_one_identical, "Rendered Page 1 differs from the original"
    assert min(similarities) >= 98.0, similarities
    print(f"OUTPUT={OUTPUT}")
    print("PAGES=6")
    print(f"PAGE_SIZE={page_size[0]}x{page_size[1]} pt")
    print(f"PAGE_1_PIXEL_IDENTICAL={page_one_identical}")
    for i, score in enumerate(similarities, start=2):
        print(f"PAGE_{i}_REFERENCE_SIMILARITY={score:.3f}%")
    print(f"CONTACT_SHEET={contact_sheet}")


if __name__ == "__main__":
    main()
