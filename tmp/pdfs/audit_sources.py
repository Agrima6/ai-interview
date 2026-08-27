from pathlib import Path
import json
import pdfplumber
import pypdfium2 as pdfium

SOURCES = {
    "template": Path(r"C:\Users\sneha\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\2A179051576900B4B780C37B52E55FB42360DD53\transfers\2026-34\Workmate_Consultancy_Services_Introduction.pdf"),
    "cyber": Path(r"C:\Users\sneha\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\2A179051576900B4B780C37B52E55FB42360DD53\transfers\2026-34\Workmate_Cybersecurity_Proposal.pptx (3).pdf"),
}

root = Path(__file__).parent
manifest = {}
for key, source in SOURCES.items():
    out = root / key
    out.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(source)
    with pdfplumber.open(source) as doc:
        manifest[key] = {
            "source": str(source),
            "pages": len(doc.pages),
            "page_sizes_points": [[p.width, p.height] for p in doc.pages],
        }
        texts = []
        for index, page in enumerate(doc.pages, start=1):
            text = page.extract_text(layout=True) or ""
            texts.append(f"\n===== PAGE {index} =====\n{text}")
            bitmap = pdf[index - 1].render(scale=2.0)
            bitmap.to_pil().save(out / f"page-{index:02}.png")
        (out / "text.txt").write_text("\n".join(texts), encoding="utf-8")

(root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(json.dumps(manifest, indent=2))
