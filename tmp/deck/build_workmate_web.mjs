import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = String.raw`D:\cool projects\ai-interview\output`;
const TMP = String.raw`D:\cool projects\ai-interview\tmp\deck\web-build`;
const LOGO_FULL = String.raw`D:\cool projects\ai-interview\tmp\pdfs\extracted-assets\workmate-logo-full.png`;
const LOGO_MARK = String.raw`D:\cool projects\ai-interview\tmp\pdfs\extracted-assets\page-02-image-01-Image21.png`;

const W = 816, H = 1056;
const C = {
  bg: "#F3F2F2",
  ink: "#201E1D",
  body: "#454141",
  gray: "#A6A6A6",
  gray2: "#D7D5D5",
  card: "#EAE8E8",
  red: "#EC3013",
  maroon: "#AE1800",
  deepRed: "#C00000",
  blue: "#D9E4F5",
  gold: "#FFF2CC",
  green: "#E2F0D9",
  peach: "#FCE4D6",
  white: "#FFFFFF",
};

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(TMP, { recursive: true });
await fs.mkdir(path.join(OUT, "assets"), { recursive: true });
const fullLogo = await fs.readFile(LOGO_FULL);
const markLogo = await fs.readFile(LOGO_MARK);
await fs.copyFile(LOGO_FULL, path.join(OUT, "assets", "workmate-logo.png"));
await fs.copyFile(LOGO_MARK, path.join(OUT, "assets", "workmate-mark.png"));

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function rect(slide, x, y, w, h, fill, lineFill = "none", lineWidth = 0, radius = 0, name) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: lineFill, width: lineWidth },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function line(slide, x, y, w, color = C.gray, width = 1, name) {
  return slide.shapes.add({
    geometry: "line",
    name,
    position: { left: x, top: y, width: w, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}

function text(slide, value, x, y, w, h, size, color = C.ink, bold = false, opts = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill ?? "none",
    line: { style: "solid", fill: opts.lineFill ?? "none", width: opts.lineWidth ?? 0 },
    ...(opts.radius ? { borderRadius: opts.radius } : {}),
  });
  box.text = value;
  box.text.style = {
    fontSize: size,
    typeface: opts.typeface ?? "Calibri",
    bold,
    color,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    lineSpacing: opts.lineSpacing ?? 1.08,
    autoFit: "none",
    wrap: "square",
    insets: opts.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return box;
}

function circleLabel(slide, label, x, y, d = 34, fill = C.red, color = C.white, size = 14) {
  const s = slide.shapes.add({
    geometry: "ellipse",
    position: { left: x, top: y, width: d, height: d },
    fill,
    line: { style: "solid", fill, width: 0 },
  });
  s.text = label;
  s.text.style = {
    fontSize: size, typeface: "Calibri", bold: true, color,
    alignment: "center", verticalAlignment: "middle",
    insets: { top: 0, right: 0, bottom: 0, left: 0 }, autoFit: "none",
  };
  return s;
}

function addHeader(slide, section, pageNo) {
  slide.background.fill = C.bg;
  slide.images.add({ blob: markLogo, contentType: "image/png", alt: "Workmate mark", fit: "contain", position: { left: 72, top: 49, width: 34, height: 34 } });
  text(slide, "WORKMATE CONSULTANCY SERVICES", 120, 55, 390, 24, 12, C.ink, true, { name: "brand-name" });
  text(slide, section, 565, 55, 179, 24, 12, C.maroon, true, { align: "right", name: "section-label" });
  line(slide, 72, 108, 672, C.gray, 1.2, "header-rule");
  line(slide, 72, 966, 672, C.gray, 1.2, "footer-rule");
  text(slide, "Workmate Consultancy Services Pvt. Ltd.", 72, 980, 330, 18, 9.5, "#6B6868", false, { name: "footer-company" });
  text(slide, String(pageNo).padStart(2, "0"), 710, 980, 34, 18, 9.5, "#6B6868", false, { align: "right", name: "page-number" });
}

function addTitle(slide, titleValue, subtitle, titleHeight = 48) {
  text(slide, titleValue, 74, 144, 668, titleHeight, 30, C.ink, true, { name: "slide-title", lineSpacing: 0.98 });
  if (subtitle) text(slide, subtitle, 74, 202, 668, 54, 16, C.body, false, { name: "slide-subtitle", lineSpacing: 1.15 });
}

function addSources(slide, lines) {
  slide.speakerNotes.textFrame.setText(["[Sources]", ...lines].join("\n"));
  slide.speakerNotes.setVisible(false);
}

// 1 - Cover
{
  const slide = deck.slides.add();
  slide.background.fill = C.bg;
  rect(slide, 0, 0, W, 14, C.red, "none", 0, 0, "top-accent");
  slide.images.add({ blob: fullLogo, contentType: "image/png", alt: "Workmate Consultancy Services logo", fit: "contain", position: { left: 90, top: 92, width: 390, height: 122 } });
  const gridX = 686, gridY = 100, d = 10, gap = 7;
  const redCells = new Set([0, 3, 5, 10, 12, 15]);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    rect(slide, gridX + c * (d + gap), gridY + r * (d + gap), d, d, redCells.has(r * 4 + c) ? C.red : C.gray, "none", 0);
  }
  text(slide, "Web Development That\nMoves Business Forward.", 74, 470, 650, 126, 46, C.ink, true, { name: "cover-title", lineSpacing: 0.94 });
  rect(slide, 75, 607, 78, 5, C.maroon);
  text(slide, "Workmate helps organizations strategize, design, build, modernize, secure and scale web platforms around real business goals.", 74, 635, 610, 88, 16, C.body, false, { name: "cover-subtitle", lineSpacing: 1.18 });
  line(slide, 72, 952, 672, C.gray, 1.2);
  text(slide, "www.wcspl.net", 72, 970, 170, 18, 9.5, "#6B6868");
  text(slide, "Strategy  |  Design  |  Engineering  |  Quality  |  Support", 374, 970, 370, 18, 9.5, "#6B6868", false, { align: "right" });
  addSources(slide, [
    "Workmate Consultancy Services Introduction.pdf - visual template, company positioning and web/software service scope.",
    "Workmate_Cybersecurity_Proposal.pptx (3).pdf - consulting tone and secure delivery positioning.",
  ]);
}

// 2 - Business challenge
{
  const slide = deck.slides.add();
  addHeader(slide, "BUSINESS CONTEXT", 2);
  addTitle(slide, "Your Website Is Business Infrastructure", "When the experience, architecture or release process falls behind, the business feels it.");
  text(slide, "CONSTRAINT", 132, 270, 230, 22, 11, C.maroon, true);
  text(slide, "BUSINESS IMPACT", 390, 270, 330, 22, 11, C.maroon, true);
  const rows = [
    ["Legacy technology", "Higher maintenance effort and slower change"],
    ["Poor user journeys", "Lost engagement, trust and conversion"],
    ["Performance bottlenecks", "Abandonment across mobile and low-bandwidth users"],
    ["Fragmented integrations", "Manual work, inconsistent data and brittle operations"],
    ["Rigid architecture", "Slower product launches and limited room to scale"],
  ];
  rows.forEach((row, i) => {
    const y = 310 + i * 120;
    line(slide, 74, y + 100, 668, C.gray2, 1);
    circleLabel(slide, String(i + 1).padStart(2, "0"), 76, y + 12, 38, C.maroon, C.white, 13);
    text(slide, row[0], 132, y + 12, 220, 42, 18, C.ink, true);
    rect(slide, 368, y + 12, 3, 70, C.red);
    text(slide, row[1], 392, y + 12, 325, 70, 15, C.body, false, { lineSpacing: 1.15 });
  });
  addSources(slide, [
    "User-provided brief - stated client web-development challenges and business-impact framing.",
    "Workmate Consultancy Services Introduction.pdf - consulting and custom software positioning.",
  ]);
}

// 3 - End-to-end solution
{
  const slide = deck.slides.add();
  addHeader(slide, "WEB DEVELOPMENT", 3);
  addTitle(slide, "One Partner Across the Web Lifecycle", "Strategy, experience design, engineering and post-launch support stay connected from the start.");
  const cards = [
    ["01", "Strategy & Discovery", "Business goals, requirements, user journeys, system context and a practical delivery roadmap."],
    ["02", "UI/UX Design", "Wireframes, prototypes, responsive interaction patterns and a reusable visual system."],
    ["03", "Frontend Development", "Maintainable interfaces designed for accessibility, performance and consistent behavior."],
    ["04", "Backend & APIs", "Business logic, data services, integrations, authentication and reliable application workflows."],
    ["05", "Cloud & Release", "Scalable deployment, release automation, monitoring and operational readiness."],
    ["06", "Support & Optimization", "Maintenance, issue resolution, enhancements and continuous performance improvement."],
  ];
  const fills = [C.blue, C.gold, C.green, C.peach, C.card, C.blue];
  cards.forEach((card, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 74 + col * 342, y = 278 + row * 205;
    rect(slide, x, y, 326, 178, fills[i], C.gray2, 1, 5);
    text(slide, card[0], x + 18, y + 16, 42, 22, 11, C.red, true);
    text(slide, card[1], x + 18, y + 44, 290, 28, 18, C.ink, true);
    text(slide, card[2], x + 18, y + 84, 288, 74, 13.5, C.body, false, { lineSpacing: 1.18 });
  });
  addSources(slide, [
    "Workmate Consultancy Services Introduction.pdf - Custom Software Development, Cloud Services, DevOps & Quality Engineering, Managed IT Services.",
    "User-provided brief - requested end-to-end web development capability groups.",
  ]);
}

// 4 - Process
{
  const slide = deck.slides.add();
  addHeader(slide, "HOW WE DELIVER", 4);
  addTitle(slide, "A Clear Path From First Workshop to Scale", "Each phase turns uncertainty into an agreed decision, a working release or a measurable next step.");
  const steps = [
    ["01", "Discover", "Align on business objectives, users, current systems, constraints and success measures."],
    ["02", "Design & Architect", "Define the experience, solution architecture, integrations, roadmap and acceptance criteria."],
    ["03", "Build & Integrate", "Develop frontend and backend capabilities in visible increments with transparent progress."],
    ["04", "Test & Launch", "Validate function, responsiveness, performance, compatibility and security before release."],
    ["05", "Sustain & Scale", "Monitor, maintain, optimize and extend the platform as demand and priorities evolve."],
  ];
  line(slide, 93, 312, 0, C.maroon, 3);
  rect(slide, 91, 312, 3, 520, C.maroon);
  steps.forEach((s, i) => {
    const y = 286 + i * 112;
    circleLabel(slide, s[0], 73, y + 18, 40, C.maroon, C.white, 13);
    rect(slide, 133, y, 606, 96, i % 2 ? "#EEECEC" : C.white, C.gray2, 1, 5);
    text(slide, s[1], 153, y + 17, 190, 26, 18, C.ink, true);
    text(slide, s[2], 344, y + 16, 370, 62, 13.5, C.body, false, { lineSpacing: 1.16 });
  });
  rect(slide, 133, 866, 606, 56, C.maroon);
  text(slide, "VISIBLE DELIVERY RHYTHM", 151, 882, 174, 20, 11, C.white, true);
  text(slide, "Named ownership, agreed checkpoints and clear communication throughout.", 332, 879, 382, 30, 13, C.white, false);
  addSources(slide, [
    "Workmate Consultancy Services Introduction.pdf - Discover, Design & Plan, Deliver, Sustain & Scale process pattern.",
    "Workmate_Cybersecurity_Proposal.pptx (3).pdf - structured planning, status updates, quality review and closure discipline.",
    "User-provided reference image - information organization only; visual system follows PDF 1.",
  ]);
}

// 5 - Engineering pillars
{
  const slide = deck.slides.add();
  addHeader(slide, "ENGINEERING QUALITY", 5);
  addTitle(slide, "Built Beyond the Interface", "The visible experience is supported by engineering choices that protect speed, reliability and room to grow.");
  const pillars = [
    ["PERFORMANCE", "Efficient assets, rendering and delivery designed for responsive load and interaction."],
    ["RESPONSIVE EXPERIENCE", "Consistent journeys across desktop, tablet and mobile breakpoints."],
    ["SCALABLE ARCHITECTURE", "Modular components and services that can evolve with traffic and product scope."],
    ["INTEGRATION", "Connections to APIs, cloud services and business platforms where the solution requires them."],
    ["QUALITY ENGINEERING", "Functional, compatibility and regression validation with disciplined release readiness."],
    ["SECURITY", "Secure development practices, access controls, API protection, dependency hygiene and validation."],
  ];
  pillars.forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 74 + col * 342, y = 278 + row * 190;
    rect(slide, x, y, 326, 160, C.white, C.gray2, 1, 5);
    rect(slide, x, y, 7, 160, col ? C.maroon : C.red);
    text(slide, p[0], x + 24, y + 20, 278, 24, 12, C.maroon, true);
    text(slide, p[1], x + 24, y + 56, 278, 82, 13.5, C.body, false, { lineSpacing: 1.18 });
  });
  rect(slide, 74, 862, 668, 68, C.deepRed);
  text(slide, "Quality, performance and security are designed into delivery - not checked at the end.", 96, 881, 624, 34, 15, C.white, true, { align: "center" });
  addSources(slide, [
    "Workmate Consultancy Services Introduction.pdf - DevOps & Quality Engineering, Cloud Services and Cybersecurity & Compliance capability descriptions.",
    "Workmate_Cybersecurity_Proposal.pptx (3).pdf - application/API security, authentication/authorization and validation themes.",
    "User-provided brief - engineering pillars for web delivery.",
  ]);
}

// 6 - Engagement models
{
  const slide = deck.slides.add();
  addHeader(slide, "HOW WE ENGAGE", 6);
  addTitle(slide, "Engage the Way Your Team Works", "One specialist, a focused product team, a defined project or ongoing ownership - Workmate adapts to the need.");
  const models = [
    ["01", "Staff Augmentation", "Add skilled professionals to your existing team and delivery rhythm.", "Best when you retain roadmap and day-to-day ownership."],
    ["02", "Dedicated Team", "A focused cross-functional team aligned to your product roadmap.", "Best when continuity, context and delivery capacity matter."],
    ["03", "Project-Based Delivery", "Defined scope, milestones, timeline and delivery accountability.", "Best when the outcome and boundaries can be agreed upfront."],
    ["04", "Managed Services", "Ongoing maintenance, monitoring, support, optimization and enhancement.", "Best when the platform needs dependable post-launch care."],
  ];
  const fills = [C.blue, C.gold, C.green, C.peach];
  models.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 74 + col * 342, y = 286 + row * 292;
    rect(slide, x, y, 326, 266, fills[i], C.gray2, 1, 6);
    circleLabel(slide, m[0], x + 22, y + 22, 38, C.white, i === 0 ? "#123D7A" : i === 1 ? "#C47A00" : i === 2 ? "#2F6B24" : "#D64B00", 13);
    text(slide, m[1], x + 22, y + 78, 282, 34, 20, C.ink, true);
    line(slide, x + 22, y + 122, 72, i === 0 ? "#123D7A" : i === 1 ? "#C47A00" : i === 2 ? "#2F6B24" : "#D64B00", 2);
    text(slide, m[2], x + 22, y + 144, 282, 62, 14, C.body, false, { lineSpacing: 1.18 });
    text(slide, m[3], x + 22, y + 215, 282, 34, 11.5, C.body, true, { lineSpacing: 1.1 });
  });
  addSources(slide, [
    "Workmate Consultancy Services Introduction.pdf - Staff Augmentation, Dedicated Team, Project-Based Delivery and Managed Services models.",
    "User-provided reference image - clean 2x2 information architecture only; visual system follows PDF 1.",
  ]);
}

// 7 - Why Workmate and CTA
{
  const slide = deck.slides.add();
  addHeader(slide, "WHY WORKMATE", 7);
  addTitle(slide, "A Partner From Workshop to What Comes Next", "Business context, technical depth and delivery accountability stay connected through the full lifecycle.");
  const reasons = [
    ["01", "Proficiency-first delivery", "Hands-on specialists focused on the work, not generic resourcing."],
    ["02", "Fixed accountability", "Named ownership, transparent progress and clear delivery commitments."],
    ["03", "Full lifecycle coverage", "Strategy, design, engineering, secure validation and long-term support."],
    ["04", "Flexible engagement", "Capacity and commercial shape aligned to how your team needs to operate."],
  ];
  reasons.forEach((r, i) => {
    const y = 274 + i * 76;
    text(slide, r[0], 76, y + 7, 48, 30, 20, C.maroon, true);
    text(slide, r[1], 136, y + 4, 250, 28, 16, C.ink, true);
    text(slide, r[2], 390, y + 5, 334, 40, 12.5, C.body, false, { lineSpacing: 1.12 });
    line(slide, 74, y + 62, 668, C.gray2, 1);
  });
  rect(slide, 52, 606, 712, 326, C.deepRed);
  text(slide, "Let's Build What's Next.", 94, 666, 600, 48, 31, C.white, true);
  text(slide, "Tell us the business problem. We'll bring the strategy, design, engineering and delivery discipline to turn it into a scalable web experience.", 94, 734, 600, 76, 15.5, C.white, false, { lineSpacing: 1.2 });
  line(slide, 94, 836, 578, "#E67C7C", 1);
  text(slide, "info@wcspl.net", 94, 860, 190, 22, 13, C.white, false);
  text(slide, "+91 8130396263", 310, 860, 180, 22, 13, C.white, false, { align: "center" });
  text(slide, "www.wcspl.net", 520, 860, 170, 22, 13, C.white, false, { align: "right" });
  addSources(slide, [
    "Workmate Consultancy Services Introduction.pdf - verified differentiators and official contact information.",
    "Workmate_Cybersecurity_Proposal.pptx (3).pdf - senior involvement, transparent reporting and long-term partnership positioning.",
  ]);
}

const renderDir = path.join(TMP, "renders");
const layoutDir = path.join(TMP, "layouts");
await fs.mkdir(renderDir, { recursive: true });
await fs.mkdir(layoutDir, { recursive: true });
for (const [i, slide] of deck.slides.items.entries()) {
  const stem = `page-${String(i + 1).padStart(2, "0")}`;
  const png = await deck.export({ slide, format: "png", scale: 2 });
  await fs.writeFile(path.join(renderDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text(), "utf8");
}
const inspection = await deck.inspect({ kind: "slide,textbox,shape,image,notes,layout", maxChars: 250000 });
await fs.writeFile(path.join(TMP, "final-inspect.ndjson"), inspection.ndjson, "utf8");
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(path.join(OUT, "Workmate_Web_Development_Services.pptx"));
console.log(`created ${deck.slides.items.length} slides`);
