import React, { useState } from 'react'
import { ArrowLeft, Download, User, Briefcase, Building2, Calendar, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "motion/react"
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(index === 0);
  const pq = q.perQuestion;

  const radarData = pq ? [
    { metric: "Keywords", value: pq.rubricScores?.keywordCoverage || 0 },
    { metric: "Structure", value: pq.rubricScores?.structureScore || 0 },
    { metric: "Time Mgmt", value: pq.rubricScores?.timeManagementScore || 0 },
    { metric: "Conciseness", value: 10 - (pq.rubricScores?.fillerWordRate || 0) },
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
        <div>
          <p className="text-[11.5px] text-text-secondary">Question {index + 1}</p>
          <p className="font-semibold text-ink text-[14.5px] sm:text-[15px] leading-relaxed mt-1">
            {q.question || "Question not available"}
          </p>
        </div>
        <div className='flex items-center gap-3 shrink-0'>
          <div className='bg-accent/10 text-accent px-3 py-1 rounded-full font-bold text-[12.5px] w-fit'>
            {(pq?.weightedFinalScore ?? q.score ?? 0)}/10
          </div>
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

              {radarData && (
                <div className='h-64'>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="var(--color-line)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10.5, fill: 'var(--color-text-secondary)' }} />
                      <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 12, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
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


  const downloadPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  let currentY = 25;

  // ================= TITLE =================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241);
  doc.text("AI Interview Performance Report", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 5;

  // underline
  doc.setDrawColor(99, 102, 241);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

  currentY += 15;

  // ================= CANDIDATE DETAILS =================
  if (candidate) {
    doc.setFontSize(11);
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
    if (createdAt) {
      doc.text(new Date(createdAt).toLocaleDateString(), pageWidth - margin, currentY, { align: "right" });
    }

    currentY += 16;
  }

  // ================= FINAL SCORE BOX =================
  doc.setFillColor(238, 238, 253);
  doc.roundedRect(margin, currentY, contentWidth, 20, 4, 4, "F");

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Final Score: ${Number(overallScore).toFixed(1)}/10`,
    pageWidth / 2,
    currentY + 12,
    { align: "center" }
  );

  currentY += 30;

  // ================= SKILLS BOX =================
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, currentY, contentWidth, 30, 4, 4, "F");

  doc.setFontSize(12);

  doc.text(`Confidence: ${confidence}`, margin + 10, currentY + 10);
  doc.text(`Communication: ${communication}`, margin + 10, currentY + 18);
  doc.text(`Correctness: ${correctness}`, margin + 10, currentY + 26);

  currentY += 45;

  // ================= RESUME ANALYSIS (deep report only) =================
  if (hasDeepReport && deepReport.resumeAnalysis) {
    if (currentY > 230) { doc.addPage(); currentY = 25; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resume Analysis", margin, currentY);
    currentY += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const matched = (deepReport.resumeAnalysis.matchedSkills || []).join(", ") || "None";
    const missing = (deepReport.resumeAnalysis.missingSkills || []).join(", ") || "None";
    doc.text(doc.splitTextToSize(`Matched Skills: ${matched}`, contentWidth), margin, currentY);
    currentY += doc.splitTextToSize(`Matched Skills: ${matched}`, contentWidth).length * 5 + 3;
    doc.text(doc.splitTextToSize(`Missing Skills: ${missing}`, contentWidth), margin, currentY);
    currentY += doc.splitTextToSize(`Missing Skills: ${missing}`, contentWidth).length * 5 + 3;
    if (deepReport.resumeAnalysis.gapSummary) {
      const gapLines = doc.splitTextToSize(deepReport.resumeAnalysis.gapSummary, contentWidth);
      doc.text(gapLines, margin, currentY);
      currentY += gapLines.length * 5 + 5;
    }
    currentY += 5;
  }

  // ================= RECOMMENDATION / STRENGTHS / FLAWS =================
  if (hasDeepReport) {
    if (currentY > 230) { doc.addPage(); currentY = 25; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Recommendation", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const recLines = doc.splitTextToSize(deepReport.recommendation || "N/A", contentWidth);
    doc.text(recLines, margin, currentY);
    currentY += recLines.length * 5 + 8;

    if (deepReport.overallStrengths?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Overall Strengths", margin, currentY);
      currentY += 6;
      doc.setFont("helvetica", "normal");
      deepReport.overallStrengths.forEach((s) => {
        const lines = doc.splitTextToSize(`- ${s}`, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 5;
      });
      currentY += 5;
    }
    if (deepReport.overallFlaws?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Areas to Improve", margin, currentY);
      currentY += 6;
      doc.setFont("helvetica", "normal");
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
  styles: {
    fontSize: 9,
    cellPadding: 5,
    valign: "top",
  },
  headStyles: {
    fillColor: [99, 102, 241],
    textColor: 255,
    halign: "center",
  },
  columnStyles: {
    0: { cellWidth: 10, halign: "center" }, // index
    1: { cellWidth: 55 }, // question
    2: { cellWidth: 20, halign: "center" }, // score
    3: { cellWidth: "auto" }, // feedback
  },
  alternateRowStyles: {
    fillColor: [249, 250, 251],
  },
});


  doc.save("AI_Interview_Report.pdf");
};

  return (
    <div className='min-h-screen bg-bg bg-noise px-4 sm:px-6 lg:px-10 py-10'>
      <div className='mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-[1280px] mx-auto'>
        <div className='w-full flex items-start gap-4 flex-wrap'>
          <button
            onClick={() => navigate("/history")}
            className='mt-1 w-11 h-11 shrink-0 rounded-full bg-card border border-line shadow-[var(--shadow-soft)] flex items-center justify-center hover:border-black/20 dark:hover:border-white/20 transition-colors'><ArrowLeft size={16} className='text-text-secondary' /></button>

          <div>
            <div className='flex items-center gap-3 flex-wrap mb-2'>
              <p className='text-[13px] font-semibold text-accent tracking-wide uppercase'>Report</p>
              {sessionMode && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${sessionMode === "practice" ? "bg-success/10 text-success" : "bg-black/[0.06] dark:bg-white/10 text-text-secondary"}`}>
                  {sessionMode === "practice" ? "Practice" : "Real"} Session
                </span>
              )}
            </div>
            <h1 className='text-[26px] sm:text-[30px] font-semibold text-ink leading-tight'>
              Interview Analytics Dashboard
            </h1>
            <p className='text-text-secondary mt-2 text-[14.5px]'>
              AI-powered performance insights
            </p>

          </div>
        </div>

        <button onClick={downloadPDF} className='inline-flex items-center gap-2 bg-accent hover:bg-accent-dark hover:-translate-y-0.5 text-white px-6 py-3 rounded-full shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] transition-all duration-300 font-medium text-[14px] text-nowrap'><Download size={15} /> Download PDF</button>
      </div>

      {candidate && (
        <div className='max-w-[1280px] mx-auto mb-8 bg-card border border-line rounded-2xl shadow-[var(--shadow-soft)] p-5 sm:p-6 flex flex-wrap items-center gap-x-8 gap-y-3'>
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

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-[1280px] mx-auto'>

        <div className='space-y-6'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-6 sm:p-8 text-center">

            <h3 className="text-text-secondary mb-5 text-[13.5px]">
              Overall Performance
            </h3>
            <div className='relative w-20 h-20 sm:w-24 sm:h-24 mx-auto'>
              <CircularProgressbar
                value={percentage}
                text={`${Number(score).toFixed(1)}/10`}
                styles={buildStyles({
                  textSize: "16px",
                  pathColor: "#6366f1",
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

          {hasDeepReport && deepReport.resumeAnalysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-card rounded-3xl border border-line shadow-[var(--shadow-soft)] p-6 sm:p-8'>
              <h3 className="text-[15px] font-semibold text-ink mb-5">Resume Analysis</h3>

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
            <h3 className="text-[15px] font-semibold text-ink mb-6">
              Performance Trend
            </h3>

            <div className='h-64 sm:h-72'>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={questionScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }} />
                  <Area type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.15}
                    strokeWidth={2.5} />


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


        </div>
      </div>

    </div>
  )
}

export default Step3Report
