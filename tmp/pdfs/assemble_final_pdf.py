from pathlib import Path
import shutil
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

root = Path(r"D:\cool projects\ai-interview")
renders = root / "tmp" / "deck" / "web-build" / "renders"
out = root / "output" / "pdf" / "Workmate_Web_Development_Services.pdf"
out.parent.mkdir(parents=True, exist_ok=True)

c = canvas.Canvas(str(out), pagesize=(612, 792), pageCompression=1)
c.setTitle("Workmate Web Development Services")
c.setAuthor("Workmate Consultancy Services Pvt. Ltd.")
c.setSubject("Client-facing web development services presentation")
for image_path in sorted(renders.glob("page-*.png")):
    c.drawImage(ImageReader(str(image_path)), 0, 0, width=612, height=792, preserveAspectRatio=False, mask="auto")
    c.showPage()
c.save()

shutil.copy2(
    root / "tmp" / "deck" / "build_workmate_web.mjs",
    root / "output" / "Workmate_Web_Development_Services_Source.mjs",
)
print(out)
