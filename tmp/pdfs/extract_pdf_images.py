from pathlib import Path
from pypdf import PdfReader

source = Path(r"C:\Users\sneha\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\2A179051576900B4B780C37B52E55FB42360DD53\transfers\2026-34\Workmate_Consultancy_Services_Introduction.pdf")
out = Path(__file__).parent / "extracted-assets"
out.mkdir(exist_ok=True)
reader = PdfReader(source)
for page_no, page in enumerate(reader.pages, 1):
    for i, image in enumerate(page.images, 1):
        path = out / f"page-{page_no:02}-image-{i:02}-{image.name}"
        path.write_bytes(image.data)
        print(path, len(image.data))
