import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const source = String.raw`C:\Users\sneha\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\2A179051576900B4B780C37B52E55FB42360DD53\transfers\2026-34\ISO27001_Client_Demo_Enhanced.pptx`;
const out = String.raw`D:\cool projects\ai-interview\tmp\deck\iso-direct`;
await fs.mkdir(out, { recursive: true });
const deck = await PresentationFile.importPptx(await FileBlob.load(source));
const snap = await deck.inspect({kind: "slide,textbox,shape,image,table,chart,notes,layout", maxChars: 200000});
await fs.writeFile(path.join(out, "inspect.ndjson"), snap.ndjson, "utf8");
for (const [i, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1.5 });
  await fs.writeFile(path.join(out, `slide-${String(i + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(out, `slide-${String(i + 1).padStart(2, "0")}.layout.json`), await layout.text(), "utf8");
}
const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(path.join(out, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
console.log(`slides=${deck.slides.items.length}`);
