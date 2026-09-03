from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from pypdf import PdfReader
import pypdfium2 as pdfium

root = Path(r"D:\cool projects\ai-interview")
source_dir = root / "tmp" / "deck" / "web-build" / "renders"
render_dir = root / "tmp" / "pdfs" / "final-web-render"
pdf_path = root / "output" / "pdf" / "Workmate_Web_Development_Services.pdf"
render_dir.mkdir(parents=True, exist_ok=True)

reader = PdfReader(pdf_path)
assert len(reader.pages) == 7
for p in reader.pages:
    assert round(float(p.mediabox.width), 3) == 612
    assert round(float(p.mediabox.height), 3) == 792

doc = pdfium.PdfDocument(pdf_path)
for i in range(len(doc)):
    rendered = doc[i].render(scale=8/3).to_pil().convert("RGB")
    target = render_dir / f"page-{i + 1:02}.png"
    rendered.save(target)
    source = Image.open(source_dir / f"page-{i + 1:02}.png").convert("RGB")
    assert rendered.size == source.size, (rendered.size, source.size)
    rms = sum(ImageStat.Stat(ImageChops.difference(rendered, source)).rms) / 3
    print(f"page {i + 1}: rms={rms:.3f}")
    assert rms < 6.0
print("PDF QA PASS")
