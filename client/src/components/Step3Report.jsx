import React from 'react'
import { ArrowLeft, Download, User, Briefcase, Building2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from "motion/react"
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

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
  } = report;

  const questionScoreData = questionWiseScore.map((score, index) => ({
    name: `Q${index + 1}`,
    score: score.score || 0
  }))

  const skills = [
    { label: "Confidence", value: confidence },
    { label: "Communication", value: communication },
    { label: "Correctness", value: correctness },
  ];

  let performanceText = "";
  let shortTagline = "";

  if (finalScore >= 8) {
    performanceText = "Ready for job opportunities.";
    shortTagline = "Excellent clarity and structured responses.";
  } else if (finalScore >= 5) {
    performanceText = "Needs minor improvement before interviews.";
    shortTagline = "Good foundation, refine articulation.";
  } else {
    performanceText = "Significant improvement required.";
    shortTagline = "Work on clarity and confidence.";
  }

  const score = finalScore;
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
  doc.setTextColor(224, 39, 27);
  doc.text("AI Interview Performance Report", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 5;

  // underline
  doc.setDrawColor(224, 39, 27);
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
    const metaLine = [candidate.email, candidate.department, role, experience, mode]
      .filter(Boolean)
      .join("   |   ");
    doc.text(metaLine, margin, currentY + 6);
    if (createdAt) {
      doc.text(new Date(createdAt).toLocaleDateString(), pageWidth - margin, currentY, { align: "right" });
    }

    currentY += 16;
  }

  // ================= FINAL SCORE BOX =================
  doc.setFillColor(253, 237, 236);
  doc.roundedRect(margin, currentY, contentWidth, 20, 4, 4, "F");

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Final Score: ${finalScore}/10`,
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

  // ================= ADVICE =================
  let advice = "";

  if (finalScore >= 8) {
    advice =
      "Excellent performance. Maintain confidence and structure. Continue refining clarity and supporting answers with strong real-world examples.";
  } else if (finalScore >= 5) {
    advice =
      "Good foundation shown. Improve clarity and structure. Practice delivering concise, confident answers with stronger supporting examples.";
  } else {
    advice =
      "Significant improvement required. Focus on structured thinking, clarity, and confident delivery. Practice answering aloud regularly.";
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

  // ================= QUESTION TABLE =================
  autoTable(doc, {
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [["#", "Question", "Score", "Feedback"]],
  body: questionWiseScore.map((q, i) => [
    `${i + 1}`,
    q.question,
    `${q.score}/10`,
    q.feedback,
  ]),
  styles: {
    fontSize: 9,
    cellPadding: 5,
    valign: "top",
  },
  headStyles: {
    fillColor: [224, 39, 27],
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
            <p className='text-[13px] font-semibold text-accent tracking-wide uppercase mb-2'>Report</p>
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
                text={`${score}/10`}
                styles={buildStyles({
                  textSize: "18px",
                  pathColor: "#E0271B",
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
                {performanceText}
              </p>
              <p className="text-text-secondary text-[13px] mt-1">
                {shortTagline}
              </p>
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
                    stroke="#E0271B"
                    fill="#E0271B"
                    fillOpacity={0.12}
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
            <div className='space-y-5'>
              {questionWiseScore.map((q, i) => (
                <div key={i} className='bg-bg p-4 sm:p-6 rounded-2xl border border-line'>

                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4'>
                    <div>
                      <p className="text-[11.5px] text-text-secondary">
                        Question {i + 1}
                      </p>

                      <p className="font-semibold text-ink text-[14.5px] sm:text-[15px] leading-relaxed mt-1">
                        {q.question || "Question not available"}
                      </p>
                    </div>


                    <div className='bg-accent/10 text-accent px-3 py-1 rounded-full font-bold text-[12.5px] w-fit shrink-0'>
                      {q.score ?? 0}/10
                    </div>
                  </div>

                  <div className='bg-accent/[0.05] border border-accent/15 p-4 rounded-xl'>
                    <p className='text-[11.5px] text-accent font-semibold mb-1 uppercase tracking-wide'>
                      AI Feedback
                    </p>
                    <p className='text-[13.5px] text-text-secondary leading-relaxed'>

                      {q.feedback && q.feedback.trim() !== ""
                        ? q.feedback
                        : "No feedback available for this question."}
                    </p>
                  </div>

                </div>
              ))}
            </div>

          </motion.div>





        </div>
      </div>

    </div>
  )
}

export default Step3Report
