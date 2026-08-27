from collections import Counter
import json
import pdfplumber

source = r"C:\Users\sneha\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\2A179051576900B4B780C37B52E55FB42360DD53\transfers\2026-34\Workmate_Consultancy_Services_Introduction.pdf"
with pdfplumber.open(source) as doc:
    for i, page in enumerate(doc.pages, 1):
        styles = Counter(
            (c.get("fontname"), round(c.get("size", 0), 1), str(c.get("non_stroking_color")))
            for c in page.chars
        )
        print(f"PAGE {i} {page.width}x{page.height}")
        for style, count in styles.most_common(20):
            print(f"{count:5} {style}")
        words = page.extract_words(extra_attrs=["fontname", "size"])
        for term in ["WORKMATE", "What", "Our", "Why", "Let's", "SERVICES", "ENGAGE"]:
            hits = [w for w in words if term.lower() in w["text"].lower()]
            if hits:
                print(term, json.dumps(hits[:3], ensure_ascii=False))
        print("LINES", json.dumps(page.lines[:20], default=str))
        print("RECTS", json.dumps(page.rects[:20], default=str))
