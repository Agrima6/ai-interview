import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi, askAiJson } from "../services/ai.service.js";
import { buildReport } from "../services/rulesEngine.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";
import { RECORDINGS_DIR } from "../middlewares/recordingUpload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Standard (non-embedded) font metrics - without this, pdf.js falls back to
// guessed glyph widths for PDFs that don't embed their fonts (e.g. most
// resumes exported from Word/Google Docs/Canva), which can corrupt or drop
// text during extraction.
const standardFontDataUrl = path.join(__dirname, "../node_modules/pdfjs-dist/standard_fonts") + path.sep

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }
    const filepath = req.file.path

    const fileBuffer = await fs.promises.readFile(filepath)
    const uint8Array = new Uint8Array(fileBuffer)

    const pdf = await pdfjsLib.getDocument({ data: uint8Array, standardFontDataUrl }).promise;

    let resumeText = "";

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const pageText = content.items.map(item => item.str).join(" ");
      resumeText += pageText + "\n";
    }


    resumeText = resumeText
      .replace(/\s+/g, " ")
      .trim();

    if (resumeText.length < 30) {
      fs.unlinkSync(filepath)
      return res.status(422).json({
        message: "Couldn't extract readable text from this PDF. It may be a scanned or image-based resume - try a text-based PDF export, or skip upload and fill the fields in manually."
      });
    }

    const messages = [
      {
        role: "system",
        content: `
Extract structured data from resume.

Return strictly JSON:

{
  "role": "string",
  "experience": "string",
  "projects": ["project1", "project2"],
  "skills": ["skill1", "skill2"]
}
`
      },
      {
        role: "user",
        content: resumeText
      }
    ];


    const parsed = await askAiJson(messages)

    fs.unlinkSync(filepath)


    res.json({
      role: parsed.role,
      experience: parsed.experience,
      projects: parsed.projects,
      skills: parsed.skills,
      resumeText
    });

  } catch (error) {
    console.error(error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({ message: error.message });
  }
};


export const generateQuestion = async (req, res) => {
  try {
    let { role, experience, mode, language, resumeText, projects, skills } = req.body

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    // If an Admin assigned this employee a specific interview, that always wins
    // over whatever the client sent - the client can't bypass it by editing the
    // request, and a stale/cached UI can't drift from what was actually assigned.
    role = (user.assignedRole || role)?.trim();
    experience = (user.assignedExperience || experience)?.trim();
    mode = (user.assignedMode || mode)?.trim();
    language = language?.trim() === "Hinglish" ? "Hinglish" : "English";
    const context = user.assignedContext?.trim() || null;

    if (!role || !experience || !mode) {
      return res.status(400).json({ message: "Role, Experience and Mode are required." })
    }

    if (user.credits < 50) {
      return res.status(400).json({
        message: "Not enough credits. Minimum 50 required."
      });
    }

    const projectText = Array.isArray(projects) && projects.length
      ? projects.join(", ")
      : "None";

    const skillsText = Array.isArray(skills) && skills.length
      ? skills.join(", ")
      : "None";

    const safeResume = resumeText?.trim() || "None";

    const userPrompt = `
    Role:${role}
    Experience:${experience}
    InterviewMode:${mode}
    Projects:${projectText}
    Skills:${skillsText},
    Resume:${safeResume}
    ${context ? `HiringCompanyContext:${context}` : ""}
    `;

    if (!userPrompt.trim()) {
      return res.status(400).json({
        message: "Prompt content is empty."
      });
    }

    const messages = [

      {
        role: "system",
        content: `
You are a real human interviewer conducting a professional interview.

${language === "Hinglish"
  ? "Speak in natural Hinglish (a casual mix of Hindi and English, written in Roman/Latin script only — no Devanagari), the way Indian interviewers actually talk in offices, as if you are directly talking to the candidate."
  : "Speak in simple, natural English as if you are directly talking to the candidate."}

Generate exactly 5 interview questions.

Strict Rules:
- Each question must contain between 15 and 25 words.
- Each question must be a single complete sentence.
- Do NOT number them.
- Do NOT add explanations.
- Do NOT add extra text before or after.
- One question per line only.
- Keep language simple and conversational.
- Questions must feel practical and realistic.
${language === "Hinglish"
  ? "- EVERY SINGLE one of the 5 questions must be in Hinglish, with no exceptions — including questions 3, 4, and 5. Do NOT drift into pure English for the later or harder questions."
  : ""}

Difficulty progression:
Question 1 → easy  
Question 2 → easy  
Question 3 → medium  
Question 4 → medium  
Question 5 → hard  

Make questions based on the candidate’s role, experience,interviewMode, projects, skills, and resume details.
${context ? "If HiringCompanyContext is provided, prioritize it - it's the specific focus areas and job description the hiring company wants tested." : ""}
`
      }
      ,
      {
        role: "user",
        content: userPrompt
      }
    ];


    const aiResponse = await askAi(messages)

    if (!aiResponse || !aiResponse.trim()) {
           
      return res.status(500).json({
        message: "AI returned empty response."
      });

    }

    const questionsArray = aiResponse
      .split("\n")
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .slice(0, 5);

    if (questionsArray.length === 0) {
      
      return res.status(500).json({
        message: "AI failed to generate questions."
      });
    }

    user.credits -= 50;
    await user.save();

    const interview = await Interview.create({
      userId: user._id,
      role,
      experience,
      mode,
      language,
      resumeText: safeResume,
      department: user.department || null,
      context,
      questions: questionsArray.map((q, index) => ({
        question: q,
        difficulty: ["easy", "easy", "medium", "medium", "hard"][index],
        timeLimit: [60, 60, 90, 90, 120][index],
      }))
    })

    res.json({
      interviewId: interview._id,
      creditsLeft: user.credits,
      userName: user.name,
      language: interview.language,
      questions: interview.questions
    });
  } catch (error) {
    return res.status(500).json({message:`failed to create interview ${error}`})
  }
}


export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken } = req.body

    const interview = await Interview.findById(interviewId)
    const question = interview.questions[questionIndex]

    // If no answer
    if (!answer) {
      question.score = 0;
      question.feedback = "You did not submit an answer.";
      question.answer = "";

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }

    // If time exceeded
    if (timeTaken > question.timeLimit) {
      question.score = 0;
      question.feedback = "Time limit exceeded. Answer not evaluated.";
      question.answer = answer;

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }


    const messages = [
      {
        role: "system",
        content: `
You are a professional human interviewer evaluating a candidate's answer in a real interview.

Evaluate naturally and fairly, like a real person would.

${interview.language === "Hinglish"
  ? "Write the feedback in natural Hinglish (a casual mix of Hindi and English, written in Roman/Latin script only — no Devanagari), the way Indian interviewers actually talk."
  : "Write the feedback in simple, natural English."}

Score the answer in these areas (0 to 10):

1. Confidence – Does the answer sound clear, confident, and well-presented?
2. Communication – Is the language simple, clear, and easy to understand?
3. Correctness – Is the answer accurate, relevant, and complete?

Rules:
- Be realistic and unbiased.
- Do not give random high scores.
- If the answer is weak, score low.
- If the answer is strong and detailed, score high.
- Consider clarity, structure, and relevance.

Calculate:
finalScore = average of confidence, communication, and correctness (rounded to nearest whole number).

Feedback Rules:
- Write natural human feedback.
- 10 to 15 words only.
- Sound like real interview feedback.
- Can suggest improvement if needed.
- Do NOT repeat the question.
- Do NOT explain scoring.
- Keep tone professional and honest.
${interview.language === "Hinglish"
  ? "- The \"feedback\" value MUST be written in Hinglish, no exceptions — never plain English."
  : ""}

Return ONLY valid JSON in this format:

{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback"
}
`
      }
      ,
      {
        role: "user",
        content: `
Question: ${question.question}
Answer: ${answer}
`
      }
    ];


    const parsed = await askAiJson(messages)

    question.answer = answer;
    question.confidence = parsed.confidence;
    question.communication = parsed.communication;
    question.correctness = parsed.correctness;
    question.score = parsed.finalScore;
    question.feedback = parsed.feedback;
    await interview.save();


    return res.status(200).json({feedback :parsed.feedback})
  } catch (error) {
    return res.status(500).json({message:`failed to submit answer ${error}`})

  }
}


export const finishInterview = async (req,res) => {
  try {
    const {interviewId} = req.body
    const interview = await Interview.findById(interviewId)
    if(!interview){
      return res.status(400).json({message:"failed to find Interview"})
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const finalScore = totalQuestions
      ? totalScore / totalQuestions
      : 0;

    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;

    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;

    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

    interview.finalScore = finalScore;
    interview.status = "completed";

    // Deterministic rubric + AI-score report, built on top of the AI scoring
    // that already happened per-question in submitAnswer. Best-effort: a
    // failure here shouldn't block the candidate from finishing the interview.
    try {
      interview.report = buildReport(interview, interview.resumeText || "");
    } catch (reportError) {
      console.error("failed to build interview report:", reportError);
    }

    await interview.save();

    return res.status(200).json({
       interviewId: interview._id,
       finalScore: Number(finalScore.toFixed(1)),
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionWiseScore: interview.questions.map((q, i) => ({
        question: q.question,
        answer: q.answer || "",
        score: q.score || 0,
        feedback: q.feedback || "",
        confidence: q.confidence || 0,
        communication: q.communication || 0,
        correctness: q.correctness || 0,
        recordingUrl: q.recordingFile ? `/api/interview/recording/${interview._id}/${i}` : null,
      })),
      report: interview.report || null,
      sessionMode: interview.sessionMode,
      templateId: interview.templateId,
      roundIndex: interview.roundIndex,
    })
  } catch (error) {
    return res.status(500).json({message:`failed to finish Interview ${error}`})
  }
}


export const getMyInterviews = async (req,res) => {
  try {
    const interviews = await Interview.find({userId:req.userId})
    .sort({ createdAt: -1 })
    .select("role experience mode finalScore status createdAt sessionMode templateId roundIndex");

    return res.status(200).json(interviews)

  } catch (error) {
     return res.status(500).json({message:`failed to find currentUser Interview ${error}`})
  }
}

export const getInterviewReport = async (req,res) => {
  try {
    const interview = await Interview.findById(req.params.id)

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const candidate = await User.findById(interview.userId).select("name email department organizationId")

    const isOwner = String(interview.userId) === String(req.userId)
    if (!isOwner) {
      // Not the candidate themselves - only that candidate's own org Admin, or
      // a Super Admin, may view it (prevents any signed-in user from reading
      // someone else's report just by guessing/sharing an interview id).
      if (req.user.role === "superadmin") {
        // allowed
      } else if (req.user.role === "admin") {
        if (!candidate || String(candidate.organizationId) !== String(req.user.organizationId)) {
          return res.status(403).json({ message: "You don't have permission to view this report." })
        }
      } else {
        return res.status(403).json({ message: "You don't have permission to view this report." })
      }
    }

    const totalQuestions = interview.questions.length;

    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });
    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;

    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;

    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

       return res.json({
      candidate: candidate ? { name: candidate.name, email: candidate.email, department: candidate.department } : null,
      role: interview.role,
      experience: interview.experience,
      mode: interview.mode,
      createdAt: interview.createdAt,
      finalScore: interview.finalScore,
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionWiseScore: interview.questions.map((q, i) => ({
        ...q.toObject(),
        recordingUrl: q.recordingFile ? `/api/interview/recording/${interview._id}/${i}` : null,
      })),
      report: interview.report || null,
      sessionMode: interview.sessionMode,
      templateId: interview.templateId,
      roundIndex: interview.roundIndex,
      status: interview.status,
    });

  } catch (error) {
    return res.status(500).json({message:`failed to find currentUser Interview report ${error}`})
  }
}

// Stores the candidate's per-question audio/video answer recording. The
// actual file goes to disk (see recordingUpload.js) - only its generated
// filename is persisted on the question, never a public URL, so access is
// always mediated by getRecording's ownership check below.
export const uploadRecording = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Recording file required" })

    const { interviewId, questionIndex } = req.body
    const index = Number(questionIndex)

    const interview = await Interview.findById(interviewId)
    if (!interview) {
      fs.unlinkSync(req.file.path)
      return res.status(404).json({ message: "Interview not found" })
    }
    if (String(interview.userId) !== String(req.userId)) {
      fs.unlinkSync(req.file.path)
      return res.status(403).json({ message: "You don't have permission to modify this interview" })
    }
    const question = interview.questions[index]
    if (!question) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ message: "Invalid question index" })
    }

    // Replacing an earlier recording for the same question (e.g. a retry) -
    // clean up the old file so uploads/recordings doesn't grow unbounded.
    if (question.recordingFile) {
      const oldPath = path.join(RECORDINGS_DIR, question.recordingFile)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    question.recordingFile = req.file.filename
    await interview.save()

    return res.status(201).json({ recordingUrl: `/api/interview/recording/${interview._id}/${index}` })
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    return res.status(500).json({ message: `failed to upload recording ${error}` })
  }
}

// Streams a recording back only to the interview's own candidate, or an
// admin/superadmin permitted to view that candidate's report (mirrors
// getInterviewReport's access rule) - recordings are never served statically.
export const getRecording = async (req, res) => {
  try {
    const { interviewId, questionIndex } = req.params
    const interview = await Interview.findById(interviewId)
    if (!interview) return res.status(404).json({ message: "Interview not found" })

    const isOwner = String(interview.userId) === String(req.userId)
    if (!isOwner) {
      if (req.user.role === "superadmin") {
        // allowed
      } else if (req.user.role === "admin") {
        const candidate = await User.findById(interview.userId).select("organizationId")
        if (!candidate || String(candidate.organizationId) !== String(req.user.organizationId)) {
          return res.status(403).json({ message: "You don't have permission to view this recording." })
        }
      } else {
        return res.status(403).json({ message: "You don't have permission to view this recording." })
      }
    }

    const question = interview.questions[Number(questionIndex)]
    if (!question?.recordingFile) return res.status(404).json({ message: "No recording for this question" })

    const filePath = path.join(RECORDINGS_DIR, question.recordingFile)
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Recording file is no longer available" })

    return res.sendFile(filePath)
  } catch (error) {
    return res.status(500).json({ message: `failed to get recording ${error}` })
  }
}




