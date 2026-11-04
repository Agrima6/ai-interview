import React, { useState } from 'react'
import { ArrowLeft, Download, User, Briefcase, Building2, Calendar, ChevronDown, CheckCircle2, XCircle, Award, Target, FileText, TrendingUp, Sparkles, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "motion/react"
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ServerUrl } from '../App'
import logo from '../assets/logo.png'

const BRAND_RED = "#c4161f"
const BRAND_RED_DARK = "#8b0e16"

const scoreTone = (v) => (v >= 7.5 ? "text-success" : v >= 5 ? "text-amber-500" : "text-red-500")
const scoreBg = (v) => (v >= 7.5 ? "bg-success/10" : v >= 5 ? "bg-amber-500/10" : "bg-red-500/10")

function ScorePill({ value }) {
  return (
    <div className={`px-3 py-1 rounded-full font-bold text-[12.5px] w-fit ${scoreBg(value)} ${scoreTone(value)}`}>
      {Number(value ?? 0).toFixed(1)}/10
    </div>
  )
}

function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(index === 0);
  const pq = q.perQuestion;
  const finalScore = pq?.weightedFinalScore ?? q.score ?? 0;

  const radarData = pq ? [
    { metric: "Keywords", value: pq.rubricScores?.keywordCoverage || 0 },
    { metric: "Structure", value: pq.rubricScores?.structureScore || 0 },
    { metric: "Time Mgmt", value: pq.rubricScores?.timeManagementScore || 0 },
    { metric: "Conciseness", value: pq.rubricScores?.fillerWordRate || 0 },
    { metric: "Length Fit", value: pq.rubricScores?.lengthAppropriateness || 0 },
    { metric: "Correctness", value: pq.aiScore?.correctness || 0 },
    { metric: "Communication", value: pq.aiScore?.communication || 0 },
    { metric: "Confidence", value: pq.aiScore?.confidence || 0 },
  ] : null;

  return (
    <div className='bg-bg rounded-2xl border border-line overflow-hidden'>
      <button
        onClick={() => setOpen(!open)}
        className='w-full flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 p-4 sm:p-6 text-left'>
        <div className='flex items-start gap-3'>
          <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11.5px] font-bold ${scoreBg(finalScore)} ${scoreTone(finalScore)}`}>{index + 1}</span>
          <p className="font-semibold text-ink text-[14.5px] sm:text-[15px] leading-relaxed">
            {q.question || "Question not available"}
          </p>
        </div>
        <div className='flex items-center gap-3 shrink-0 pl-10 sm:pl-0'>
          <ScorePill value={finalScore} />
          <ChevronDown size={16} className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className='overflow-hidden'>
            <div className='px-4 sm:px-6 pb-6 space-y-4'>
              {q.answer && (
                <div className='bg-card border border-line p-4 rounded-xl'>
                  <p className='text-[11.5px] text-text-secondary font-semibold mb-1 uppercase tracking-wide'>Candidate's Answer</p>
                  <p className='text-[13.5px] text-ink leading-relaxed'>{q.answer}</p>
                </div>
              )}

              {q.recordingUrl && (
                <div className='bg-card border border-line p-4 rounded-xl'>
                  <p className='text-[11.5px] text-text-secondary font-semibold mb-2 uppercase tracking-wide'>Answer Recording</p>
                  <video controls preload="metadata" className='w-full max-h-72 rounded-lg bg-black' src={`${ServerUrl}${q.recordingUrl}`} />
                </div>
              )}

              {radarData && (
                <div className='grid sm:grid-cols-2 gap-4 items-center'>
                  <div className='h-56'>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="70%">
                        <PolarGrid stroke="var(--color-line)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="value" stroke={BRAND_RED} fill={BRAND_RED} fillOpacity={0.35} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 12, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className='space-y-2'>
                    {radarData.map((r) => (
                      <div key={r.metric}>
                        <div className='flex justify-between text-[11.5px] mb-1'>
                          <span className='text-text-secondary'>{r.metric}</span>
                          <span className='font-semibold text-ink'>{r.value.toFixed(1)}</span>
                        </div>
                        <div className='bg-black/[0.06] dark:bg-white/[0.08] h-1.5 rounded-full overflow-hidden'>
                          <div className='h-full rounded-full' style={{ width: `${r.value * 10}%`, backgroundColor: BRAND_RED }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.feedback && (
                <div className='bg-accent/[0.05] border border-accent/15 p-4 rounded-xl'>
                  <p className='text-[11.5px] text-accent font-semibold mb-1 uppercase tracking-wide'>AI Feedback</p>
                  <p className='text-[13.5px] text-text-secondary leading-relaxed'>{q.feedback}</p>
                </div>
              )}

              {pq && (pq.strengths?.length > 0 || pq.flaws?.length > 0) && (
                <div className='grid sm:grid-cols-2 gap-4'>
                  {pq.strengths?.length > 0 && (
                    <div>
                      <p className='text-[11.5px] font-semibold text-success mb-2 uppercase tracking-wide flex items-center gap-1.5'><CheckCircle2 size={12} /> Strengths</p>
                      <ul className='space-y-1'>
                        {pq.strengths.map((s, i) => <li key={i} className='text-[12.5px] text-text-secondary leading-relaxed'>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {pq.flaws?.length > 0 && (
                    <div>
                      <p className='text-[11.5px] font-semibold text-red-500 mb-2 uppercase tracking-wide flex items-center gap-1.5'><XCircle size={12} /> Areas to Improve</p>
                      <ul className='space-y-1'>
                        {pq.flaws.map((s, i) => <li key={i} className='text-[12.5px] text-text-secondary leading-relaxed'>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Loads an <img>-able asset (a Vite-bundled import URL) and returns it as a
// base64 data URL so jsPDF's addImage can embed it - jsPDF can't take a
// plain file URL directly.
const toDataUrl = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    resolve(canvas.toDataURL("image/png"));
  };
  img.onerror = reject;
  img.src = url;
});

function Step3Report({ report }) {
  if (!report) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-secondary text-[15px]">Loading Report...</p>
      </div>
    );
  }
  const navigate = useNavigate()
  const {
    candidate = null,
    role = "",
    experience = "",
    mode = "",
    createdAt = null,
    finalScore = 0,
    confidence = 0,
    communication = 0,
    correctness = 0,
    questionWiseScore = [],
    report: deepReport = null,
    sessionMode = null,
  } = report;

  const hasDeepReport = Boolean(deepReport);
  const overallScore = hasDeepReport ? (deepReport.finalWeightedScore ?? finalScore) : finalScore;

  const questionScoreData = questionWiseScore.map((score, index) => ({
    name: `Q${index + 1}`,
    score: (hasDeepReport ? deepReport.perQuestion?.[index]?.weightedFinalScore : score.score) || 0
  }))

  const mergedQuestions = questionWiseScore.map((q, i) => ({
    ...q,
    perQuestion: hasDeepReport ? deepReport.perQuestion?.find((p) => p.questionIndex === i) : null,
  }))

  const skills = [
    { label: "Confidence", value: confidence },
    { label: "Communication", value: communication },
    { label: "Correctness", value: correctness },
  ];

  // Aggregate rubric+AI radar across every question - a single at-a-glance
  // "skill fingerprint" for the whole interview, not just one answer.
  const aggregateRadar = hasDeepReport && deepReport.perQuestion?.length ? (() => {
    const n = deepReport.perQuestion.length;
    const sum = (key, group) => deepReport.perQuestion.reduce((acc, p) => acc + (p[group]?.[key] || 0), 0) / n;
    return [
      { metric: "Keywords", value: sum("keywordCoverage", "rubricScores") },
      { metric: "Structure", value: sum("structureScore", "rubricScores") },
      { metric: "Time Mgmt", value: sum("timeManagementScore", "rubricScores") },
      { metric: "Conciseness", value: sum("fillerWordRate", "rubricScores") },
      { metric: "Length Fit", value: sum("lengthAppropriateness", "rubricScores") },
      { metric: "Correctness", value: sum("correctness", "aiScore") },
      { metric: "Communication", value: sum("communication", "aiScore") },
      { metric: "Confidence", value: sum("confidence", "aiScore") },
    ];
  })() : null;

  // Resume skill-match donut - how much of the resume's skill set actually
  // showed up in the candidate's answers.
  const resumeMatch = hasDeepReport && deepReport.resumeAnalysis ? (() => {
    const matched = deepReport.resumeAnalysis.matchedSkills?.length || 0;
    const missing = deepReport.resumeAnalysis.missingSkills?.length || 0;
    const total = matched + missing;
    if (total === 0) return null;
    return {
      matched, missing, total,
      pct: Math.round((matched / total) * 100),
      data: [{ name: "Matched", value: matched }, { name: "Missing", value: missing }],
    };
  })() : null;

  let performanceText = "";
  let shortTagline = "";

  if (overallScore >= 8) {
    performanceText = "Ready for job opportunities.";
    shortTagline = "Excellent clarity and structured responses.";
  } else if (overallScore >= 5) {
    performanceText = "Needs minor improvement before interviews.";
    shortTagline = "Good foundation, refine articulation.";
  } else {
    performanceText = "Significant improvement required.";
    shortTagline = "Work on clarity and confidence.";
  }

  const score = overallScore;
  const percentage = (score / 10) * 100;

  const downloadPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let currentY = 18;

    // ================= BRANDED HEADER =================
    try {
      const logoData = await toDataUrl(logo);
      doc.addImage(logoData, "PNG", margin, currentY - 6, 14, 14);
    } catch { /* logo embed is best-effort - report still generates without it */ }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(196, 22, 31);
    doc.text("WorkMate IQ", margin + 18, currentY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Interview Performance Report", margin + 18, currentY + 5);

    if (createdAt) {
      doc.setFontSize(9);
      doc.text(new Date(createdAt).toLocaleDateString(), pageWidth - margin, currentY, { align: "right" });
    }

    currentY += 12;
    doc.setDrawColor(196, 22, 31);
    doc.setLineWidth(0.6);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 12;

    // ================= CANDIDATE DETAILS =================
    if (candidate) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(candidate.name || "Candidate", margin, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(90, 90, 90);
      const metaLine = [candidate.email, candidate.department, role, experience, mode, sessionMode]
        .filter(Boolean)
        .join("   |   ");
      doc.text(metaLine, margin, currentY + 6);

      currentY += 16;
    }

    // ================= FINAL SCORE + RECOMMENDATION =================
    doc.setFillColor(250, 226, 226);
    doc.roundedRect(margin, currentY, contentWidth, 24, 4, 4, "F");

    doc.setFontSize(16);
    doc.setTextColor(139, 14, 22);
    doc.setFont("helvetica", "bold");
    doc.text(`${Number(overallScore).toFixed(1)}/10`, margin + 10, currentY + 15);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const recText = hasDeepReport ? (deepReport.recommendation || "") : performanceText;
    const recLines = doc.splitTextToSize(recText, contentWidth - 55);
    doc.text(recLines, margin + 45, currentY + 10);

    currentY += 34;

    // ================= SKILLS BOX =================
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, currentY, contentWidth, 26, 4, 4, "F");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Confidence: ${confidence}/10`, margin + 10, currentY + 10);
    doc.text(`Communication: ${communication}/10`, margin + 10, currentY + 17);
    doc.text(`Correctness: ${correctness}/10`, margin + 10, currentY + 24);

    currentY += 38;

    // ================= RESUME ANALYSIS =================
    if (hasDeepReport && deepReport.resumeAnalysis) {
      if (currentY > 230) { doc.addPage(); currentY = 25; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Resume Analysis", margin, currentY);
      currentY += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const matched = (deepReport.resumeAnalysis.matchedSkills || []).join(", ") || "None";
      const missing = (deepReport.resumeAnalysis.missingSkills || []).join(", ") || "None";
      const matchedLines = doc.splitTextToSize(`Matched Skills: ${matched}`, contentWidth);
      doc.text(matchedLines, margin, currentY);
      currentY += matchedLines.length * 5 + 3;
      const missingLines = doc.splitTextToSize(`Missing Skills: ${missing}`, contentWidth);
      doc.text(missingLines, margin, currentY);
      currentY += missingLines.length * 5 + 3;
      if (deepReport.resumeAnalysis.gapSummary) {
        const gapLines = doc.splitTextToSize(deepReport.resumeAnalysis.gapSummary, contentWidth);
        doc.text(gapLines, margin, currentY);
        currentY += gapLines.length * 5 + 5;
      }
      currentY += 5;
    }

    // ================= STRENGTHS / FLAWS =================
    if (hasDeepReport) {
      if (currentY > 230) { doc.addPage(); currentY = 25; }
      if (deepReport.overallStrengths?.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(22, 163, 74);
        doc.text("Overall Strengths", margin, currentY);
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(60, 60, 60);
        deepReport.overallStrengths.forEach((s) => {
          const lines = doc.splitTextToSize(`- ${s}`, contentWidth);
          doc.text(lines, margin, currentY);
          currentY += lines.length * 5;
        });
        currentY += 5;
      }
      if (deepReport.overallFlaws?.length) {
        if (currentY > 250) { doc.addPage(); currentY = 25; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        doc.text("Areas to Improve", margin, currentY);
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(60, 60, 60);
        deepReport.overallFlaws.forEach((s) => {
          const lines = doc.splitTextToSize(`- ${s}`, contentWidth);
          doc.text(lines, margin, currentY);
          currentY += lines.length * 5;
        });
        currentY += 5;
      }
    } else {
      let advice = "";
      if (overallScore >= 8) {
        advice = "Excellent performance. Maintain confidence and structure. Continue refining clarity and supporting answers with strong real-world examples.";
      } else if (overallScore >= 5) {
        advice = "Good foundation shown. Improve clarity and structure. Practice delivering concise, confident answers with stronger supporting examples.";
      } else {
        advice = "Significant improvement required. Focus on structured thinking, clarity, and confident delivery. Practice answering aloud regularly.";
      }

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220);
      doc.roundedRect(margin, currentY, contentWidth, 35, 4, 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Professional Advice", margin + 10, currentY + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const splitAdvice = doc.splitTextToSize(advice, contentWidth - 20);
      doc.text(splitAdvice, margin + 10, currentY + 20);
      currentY += 50;
    }

    // ================= QUESTION TABLE =================
    if (currentY > 250) { doc.addPage(); currentY = 25; }
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["#", "Question", "Score", "Feedback"]],
      body: questionWiseScore.map((q, i) => [
        `${i + 1}`,
        q.question,
        `${hasDeepReport ? (deepReport.perQuestion?.[i]?.weightedFinalScore ?? q.score) : q.score}/10`,
        q.feedback,
      ]),
      styles: { fontSize: 9, cellPadding: 5, valign: "top" },
      headStyles: { fillColor: [196, 22, 31], textColor: 255, halign: "center" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 55 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didDrawPage: () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by WorkMate IQ - AI-powered interview intelligence", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      },
    });

    doc.save("WorkMateIQ_Interview_Report.pdf");
  };

  return (
    <div className='min-h-screen bg-bg bg-noise px-4 sm:px-6 lg:px-10 py-10'>
      {/* Branded header */}
      <div className='mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-[1280px] mx-auto'>
        <div className='w-full flex items-start gap-4 flex-wrap'>
          <button
            onClick={() => navigate("/history")}
            className='mt-1 w-11 h-11 shrink-0 rounded-full bg-card border border-line shadow-[var(--shadow-soft)] flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 transition-colors'><ArrowLeft size={16} className='text-text-secondary' /></button>

          <div className='flex items-center gap-3'>
            <img src={logo} alt="WorkMate IQ" className='w-11 h-11 rounded-full shadow-[0_4px_12px_-4px_rgba(196,22,31,0.5)]' />
            <div>
              <div className='flex items-center gap-3 flex-wrap mb-1'>
                <p className='text-[12.5px] font-bold text-accent tracking-wide uppercase'>WorkMate IQ</p>
                {sessionMode && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${sessionMode === "practice" ? "bg-success/10 text-success" : "bg-black/[0.06] dark:bg-white/10 text-text-secondary"}`}>
                    {sessionMode === "practice" ? "Practice" : "Real"} Session
                  </span>
                )}
              </div>
              <h1 className='text-[24px] sm:text-[28px] font-semibold text-ink leading-tight'>
                Interview Performance Report
              </h1>
            </div>
          </div>
        </div>

        <button onClick={downloadPDF} className='inline-flex items-center gap-2 bg-accent hover:bg-accent-dark hover:-translate-y-0.5 text-white px-6 py-3 rounded-full shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] transition-all duration-300 font-medium text-[14px] text-nowrap shrink-0'><Download size={15} /> Download PDF</button>
      </div>

      {candidate && (
        <div className='max-w-[1280px] mx-auto mb-6 bg-card border border-line rounded-2xl shadow-[var(--shadow-soft)] p-5 sm:p-6 flex flex-wrap items-center gap-x-8 gap-y-3'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-[14px] shrink-0'>
              {candidate.name?.slice(0, 1).toUpperCase() || <User size={15} />}
            </div>
            <div>
              <p className='text-[14.5px] font-semibold text-ink'>{candidate.name}</p>
              <p className='text-[12.5px] text-text-secondary'>{candidate.email}</p>
            </div>
          </div>

          {candidate.department && (
            <div className='flex items-center gap-2 text-[13px] text-text-secondary'>
              <Building2 size={14} className='text-accent' /> {candidate.department}
            </div>
          )}

          {role && (
            <div className='flex items-center gap-2 text-[13px] text-text-secondary'>
              <Briefcase size={14} className='text-accent' /> {role}{experience ? ` · ${experience}` : ""}{mode ? ` · ${mode}` : ""}
            </div>
          )}

          {createdAt && (
            <div className='flex items-center gap-2 text-[13px] text-text-secondary ml-auto'>
              <Calendar size={14} className='text-accent' /> {new Date(createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Hero stat strip - quick infographic row */}
      <div className='max-w-[1280px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6'>
        {[
          { icon: Gauge, label: "Overall Score", value: `${Number(score).toFixed(1)}/10` },
          { icon: FileText, label: "Questions", value: questionWiseScore.length },
          { icon: Target, label: "Skill Match", value: resumeMatch ? `${resumeMatch.pct}%` : "—" },
          { icon: Award, label: "Verdict", value: overallScore >= 7.5 ? "Strong" : overallScore >= 5 ? "Mixed" : "Below Bar" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className='bg-card border border-line rounded-2xl shadow-[var(--shadow-soft)] p-4 flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0'><s.icon size={16} /></div>
            <div className='min-w-0'>
              <p className='text-[11px] text-text-secondary truncate'>{s.label}</p>
              <p className='text-[16px] font-bold text-ink truncate'>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-[1280px] mx-auto'>

        <div className='space-y-6'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-6 sm:p-8 text-center">

            <h3 className="text-text-secondary mb-5 text-[13.5px]">
              Overall Performance
            </h3>
            <div className='relative w-24 h-24 sm:w-28 sm:h-28 mx-auto'>
              <CircularProgressbar
                value={percentage}
                text={`${Number(score).toFixed(1)}/10`}
                styles={buildStyles({
                  textSize: "16px",
                  pathColor: BRAND_RED,
                  textColor: "var(--color-ink)",
                  trailColor: "var(--color-line)",
                })}
              />
            </div>

            <p className="text-text-secondary mt-3 text-[12.5px]">
              Out of 10
            </p>

            <div className="mt-5 pt-5 border-t border-line">
              <p className="font-semibold text-ink text-[14.5px]">
                {hasDeepReport && deepReport.recommendation ? deepReport.recommendation : performanceText}
              </p>
              {!hasDeepReport && (
                <p className="text-text-secondary text-[13px] mt-1">
                  {shortTagline}
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-6 sm:p-8'>
            <h3 className="text-[15px] font-semibold text-ink mb-6">
              Skill Evaluation
            </h3>

            <div className='space-y-5'>
              {
                skills.map((s, i) => (
                  <div key={i}>
                    <div className='flex justify-between mb-2 text-[13.5px]'>

                      <span className='text-text-secondary'>{s.label}</span>
                      <span className='font-semibold text-ink'>{s.value}</span>
                    </div>

                    <div className='bg-black/[0.06] dark:bg-white/[0.08] h-1.5 sm:h-2 rounded-full overflow-hidden'>
                      <div className='bg-accent h-full rounded-full transition-all duration-700'
                        style={{ width: `${s.value * 10}%` }}

                      ></div>

                    </div>


                  </div>
                ))
              }
            </div>

          </motion.div>

          {aggregateRadar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-6 sm:p-8'>
              <h3 className="text-[15px] font-semibold text-ink mb-2 flex items-center gap-2"><Sparkles size={15} className='text-accent' /> Skill Fingerprint</h3>
              <p className='text-[12px] text-text-secondary mb-4'>Averaged across every question</p>
              <div className='h-56'>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={aggregateRadar} outerRadius="72%">
                    <PolarGrid stroke="var(--color-line)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar name="Average" dataKey="value" stroke={BRAND_RED} fill={BRAND_RED} fillOpacity={0.35} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 12, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {hasDeepReport && deepReport.resumeAnalysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-6 sm:p-8'>
              <h3 className="text-[15px] font-semibold text-ink mb-5">Resume Analysis</h3>

              {resumeMatch && (
                <div className='flex items-center gap-5 mb-5 pb-5 border-b border-line'>
                  <div className='relative w-16 h-16 shrink-0'>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={resumeMatch.data} dataKey="value" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none">
                          <Cell fill={BRAND_RED} />
                          <Cell fill="var(--color-line)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className='absolute inset-0 flex items-center justify-center text-[13px] font-bold text-ink'>{resumeMatch.pct}%</div>
                  </div>
                  <div>
                    <p className='text-[13.5px] font-semibold text-ink'>{resumeMatch.matched} of {resumeMatch.total} skills demonstrated</p>
                    <p className='text-[12px] text-text-secondary mt-0.5'>Based on resume-listed skills referenced during answers</p>
                  </div>
                </div>
              )}

              {deepReport.resumeAnalysis.matchedSkills?.length > 0 && (
                <div className='mb-4'>
                  <p className='text-[12px] text-text-secondary mb-2'>Matched Skills</p>
                  <div className='flex flex-wrap gap-1.5'>
                    {deepReport.resumeAnalysis.matchedSkills.map((s, i) => (
                      <span key={i} className='bg-success/10 text-success px-2.5 py-1 rounded-full text-[11.5px] font-medium'>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {deepReport.resumeAnalysis.missingSkills?.length > 0 && (
                <div className='mb-4'>
                  <p className='text-[12px] text-text-secondary mb-2'>Missing Skills</p>
                  <div className='flex flex-wrap gap-1.5'>
                    {deepReport.resumeAnalysis.missingSkills.map((s, i) => (
                      <span key={i} className='bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full text-[11.5px] font-medium'>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {deepReport.resumeAnalysis.gapSummary && (
                <p className='text-[12.5px] text-text-secondary leading-relaxed pt-3 border-t border-line'>
                  {deepReport.resumeAnalysis.gapSummary}
                </p>
              )}
            </motion.div>
          )}


        </div>

        <div className='lg:col-span-2 space-y-6'>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-5 sm:p-8'>
            <h3 className="text-[15px] font-semibold text-ink mb-6 flex items-center gap-2"><TrendingUp size={15} className='text-accent' /> Performance Trend</h3>

            <div className='h-64 sm:h-72'>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={questionScoreData}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BRAND_RED} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={BRAND_RED} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                  <Area type="monotone"
                    dataKey="score"
                    stroke={BRAND_RED}
                    fill="url(#trendFill)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: BRAND_RED, strokeWidth: 0 }} />


                </AreaChart>

              </ResponsiveContainer>


            </div>


          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-5 sm:p-8'>
            <h3 className="text-[15px] font-semibold text-ink mb-6">
              Question Breakdown
            </h3>
            <div className='space-y-4'>
              {mergedQuestions.map((q, i) => (
                <QuestionCard key={i} q={q} index={i} />
              ))}
            </div>

          </motion.div>

          {hasDeepReport && (deepReport.overallStrengths?.length > 0 || deepReport.overallFlaws?.length > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-5 sm:p-8 grid sm:grid-cols-2 gap-6'>
              {deepReport.overallStrengths?.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-semibold text-success mb-4 flex items-center gap-2"><CheckCircle2 size={15} /> Overall Strengths</h3>
                  <ul className='space-y-2'>
                    {deepReport.overallStrengths.map((s, i) => (
                      <li key={i} className='text-[13.5px] text-text-secondary leading-relaxed'>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {deepReport.overallFlaws?.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-semibold text-red-500 mb-4 flex items-center gap-2"><XCircle size={15} /> Overall Areas to Improve</h3>
                  <ul className='space-y-2'>
                    {deepReport.overallFlaws.map((s, i) => (
                      <li key={i} className='text-[13.5px] text-text-secondary leading-relaxed'>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          <p className='text-center text-[11.5px] text-text-secondary pt-2 pb-6'>
            Generated by <span className='font-semibold text-accent'>WorkMate IQ</span> · AI-powered interview intelligence
          </p>

        </div>
      </div>

    </div>
  )
}

export default Step3Report
