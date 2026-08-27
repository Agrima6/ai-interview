from pathlib import Path
import json, re, zipfile

root = Path(r"D:\cool projects\ai-interview")
layout_dir = root / "tmp" / "deck" / "web-build" / "layouts"
errors = []
for file in sorted(layout_dir.glob("*.json")):
    data = json.loads(file.read_text(encoding="utf-8"))
    for e in data.get("elements", []):
        bbox = e.get("bbox")
        if not bbox:
            continue
        x, y, w, h = bbox
        if x < -0.5 or y < -0.5 or x + w > 816.5 or y + h > 1056.5:
            errors.append(f"{file.name}: out of bounds {e.get('name')} {bbox}")

pptx = root / "output" / "Workmate_Web_Development_Services.pptx"
with zipfile.ZipFile(pptx) as zf:
    slides = sorted(n for n in zf.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n))
    if len(slides) != 7:
        errors.append(f"expected 7 slides, found {len(slides)}")
    for name in slides:
        xml = zf.read(name).decode("utf-8")
        for block in re.findall(r"<p:sp>.*?</p:sp>", xml):
            if "<p:ph" in block and not re.search(r"<a:t>\s*[^<\s]", block):
                errors.append(f"{name}: empty placeholder")

print("QA PASS" if not errors else "QA FAIL")
for error in errors:
    print(error)
raise SystemExit(bool(errors))
