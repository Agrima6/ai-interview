from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import sys, math

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
files = sorted(src.glob("page-*.png"))
thumb_w = 360
thumbs = []
for f in files:
    im = Image.open(f).convert("RGB")
    h = round(im.height * thumb_w / im.width)
    im = im.resize((thumb_w, h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (thumb_w + 20, h + 48), "white")
    canvas.paste(im, (10, 28))
    ImageDraw.Draw(canvas).text((10, 7), f.stem, fill="black")
    thumbs.append(canvas)
cols = 3 if len(files) <= 8 else 4
rows = math.ceil(len(thumbs) / cols)
cell_w = max(i.width for i in thumbs)
cell_h = max(i.height for i in thumbs)
sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#d9d9d9")
for i, im in enumerate(thumbs):
    sheet.paste(im, ((i % cols) * cell_w, (i // cols) * cell_h))
sheet.save(dst)
