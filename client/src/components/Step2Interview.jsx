import React from 'react'
import Timer from './Timer'
import ProctoringCamera from './ProctoringCamera'
import AIInterviewerFigure from './AIInterviewerFigure'
import InterviewIntro from './InterviewIntro'
import { motion, AnimatePresence } from "motion/react"
import { Mic, MicOff, ArrowRight, Radio, Maximize, ShieldAlert } from "lucide-react";
import { useState } from 'react'
import { useRef } from 'react'
import { useEffect } from 'react'
import axios from "axios"
import { ServerUrl } from '../App'

const MAX_VIOLATIONS = 3

// Natural/neural voices (Google's Chrome voices, Windows 11's "Online (Natural)" voices)
// sound far less robotic than legacy desktop voices like "Microsoft Zira Desktop".
const isNaturalVoice = (v) => {
  const n = v.name.toLowerCase();
  return n.includes("natural") || n.includes("online") || n.startsWith("google");
};

const VOICE_NAMES = {
  female: ["zira", "samantha", "aria", "jenny", "google us english", "google uk english female", "female"],
  male: ["david", "mark", "guy", "google uk english male", "male"],
  hindiFemale: ["swara", "kalpana", "lekha", "hindi"],
  hindiMale: ["hemant", "madhur", "ravi"],
};

const pickBestVoice = (voices, names) =>
  voices
    .filter(v => names.some(n => v.name.toLowerCase().includes(n)))
    .sort((a, b) => (isNaturalVoice(b) ? 1 : 0) - (isNaturalVoice(a) ? 1 : 0))[0];

// Finds the best available voice for a specific gender, preferring a Hindi
// voice first when speaking Hinglish since it handles Hindi words far better.
// There's no user-facing gender choice anymore - this just picks whichever
// gender actually has a usable voice installed, trying female first.
const findVoiceForGender = (voices, gender, isHinglish) => {
  if (isHinglish) {
    const hindiNames = gender === "male" ? VOICE_NAMES.hindiMale : VOICE_NAMES.hindiFemale;
    const hindiVoice = pickBestVoice(voices, hindiNames) || voices.find(v => v.lang?.toLowerCase().startsWith("hi"));
    if (hindiVoice) return hindiVoice;
  }
  return pickBestVoice(voices, VOICE_NAMES[gender]) || voices[0];
};

function Step2Interview({ interviewData, onFinish }) {
  const { interviewId, questions, userName, language = "English", sessionMode = "real", roundLabel = null } = interviewData;
  const isHinglish = language === "Hinglish";
  const isPractice = sessionMode === "practice";
  const [answerRecorded, setAnswerRecorded] = useState(false);
  // True until the cinematic AI-interviewer intro finishes greeting the candidate.
  const [showIntro, setShowIntro] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);
  const recognitionRef = useRef(null);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(
    questions[0]?.timeLimit || 60
  );
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [micSupported, setMicSupported] = useState(true);

  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationMessage, setViolationMessage] = useState("");
  const [terminated, setTerminated] = useState(false);
  const terminatedRef = useRef(false);
  const fullscreenEnteredRef = useRef(false);
  const violationCooldownRef = useRef(false);

  const [audioLevel, setAudioLevel] = useState(0);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const audioDataRef = useRef(null);
  const audioRafRef = useRef(null);

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const currentQuestion = questions[currentIndex];

  // Taps the candidate's own mic (already captured for proctoring) with a
  // Web Audio AnalyserNode so the AI figure's "listening" state can react to
  // real mic volume instead of just sitting there.
  const handleStream = (stream) => {
    streamRef.current = stream;
    if (analyserRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!analyserRef.current || !audioDataRef.current) return;
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        const avg = audioDataRef.current.reduce((a, b) => a + b, 0) / audioDataRef.current.length;
        setAudioLevel(Math.min(1, avg / 90));
        audioRafRef.current = requestAnimationFrame(loop);
      };
      audioRafRef.current = requestAnimationFrame(loop);
    } catch (error) {
      console.log("Audio analyser unavailable:", error);
    }
  };

  // Records the candidate's own camera+mic for the current question only,
  // so the report can play back exactly what they said/did for that answer.
  const startRecording = () => {
    if (!streamRef.current || typeof MediaRecorder === "undefined") return;
    try {
      recordedChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch (error) {
      console.log("Recording unavailable:", error);
    }
  };

  // Stops the in-progress recording (if any) and uploads it against the
  // given question index. Resolves once the upload attempt is done (or
  // immediately if nothing was recording) so callers can await it before
  // moving to the next question.
  const stopRecordingAndUpload = (questionIndex) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return Promise.resolve();

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        mediaRecorderRef.current = null;
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        recordedChunksRef.current = [];
        if (blob.size > 0 && interviewId) {
          try {
            const form = new FormData();
            form.append("recording", blob, `q${questionIndex}.webm`);
            form.append("interviewId", interviewId);
            form.append("questionIndex", questionIndex);
            await axios.post(ServerUrl + "/api/interview/recording", form, {
              withCredentials: true,
              headers: { "Content-Type": "multipart/form-data" },
            });
          } catch (error) {
            console.log("Recording upload failed:", error);
          }
        }
        resolve();
      };
      try { recorder.stop(); } catch { resolve(); }
    });
  };

  const registerViolation = (reason) => {
    if (violationCooldownRef.current || terminatedRef.current) return;
    violationCooldownRef.current = true;
    setTimeout(() => { violationCooldownRef.current = false }, 1500);

    setViolationCount((prev) => {
      const next = prev + 1;
      if (next >= MAX_VIOLATIONS) {
        terminatedRef.current = true;
        setViolationMessage(`${reason}. That was your ${next}${next === 1 ? "st" : next === 2 ? "nd" : "rd"} and final warning — ending the interview now.`);
        setTerminated(true);
      } else {
        setViolationMessage(`Warning ${next}/${MAX_VIOLATIONS}: ${reason}. One more and the interview will end automatically.`);
      }
      return next;
    });
  };

  const enterFullscreenAndStart = async () => {
    if (!agreedToTerms) return;
    try {
      if (document.documentElement.requestFullscreen) {
        // Some embedded/sandboxed contexts silently disallow fullscreen and
        // leave this promise pending forever instead of rejecting it - race
        // it against a timeout so "Start" never gets permanently stuck.
        await Promise.race([
          document.documentElement.requestFullscreen(),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      }
    } catch (error) {
      console.log(error);
    }
    setProctoringStarted(true);
  };


  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      const gender = findVoiceForGender(voices, "female", isHinglish) ? "female" : "male";
      setSelectedVoice(findVoiceForGender(voices, gender, isHinglish));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

  }, [isHinglish])


  /* ---------------- SPEAK FUNCTION ---------------- */
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      // Add natural pauses after commas and periods
      const humanText = text
        .replace(/,/g, ", ... ")
        .replace(/\./g, ". ... ");

      const utterance = new SpeechSynthesisUtterance(humanText);

      utterance.voice = selectedVoice;

      // Human-like pacing
      utterance.rate = 0.92;     // slightly slower than normal
      utterance.pitch = 1.05;    // small warmth
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        stopMic()
      };


      utterance.onend = () => {
        setIsAIPlaying(false);

        if (isMicOn) {
          startMic();
        }
        setTimeout(() => {
          setSubtitle("");
          resolve();
        }, 300);
      };


      setSubtitle(text);

      window.speechSynthesis.speak(utterance);
    });
  };


  useEffect(() => {
    if (!selectedVoice || !proctoringStarted || showIntro) {
      return;
    }
    const askQuestion = async () => {
      if (!currentQuestion) return;
      await new Promise(r => setTimeout(r, 800));

      // If last question (hard level)
      if (currentIndex === questions.length - 1) {
        await speakText(isHinglish ? "Chaliye, yeh thoda challenging ho sakta hai." : "Alright, this one might be a bit more challenging.");
      }

      await speakText(currentQuestion.question);

      startRecording();

      if (isMicOn) {
        startMic();
      }
    }

    askQuestion()


  }, [selectedVoice, showIntro, currentIndex, proctoringStarted])



  useEffect(() => {
    if (showIntro) return;
    if (!currentQuestion) return;
    if (!proctoringStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0;
        }
        return prev - 1

      })
    }, 1000);

    return () => clearInterval(timer)

  }, [showIntro, currentIndex])

  useEffect(() => {
  if (!showIntro && currentQuestion) {
    setTimeLeft(currentQuestion.timeLimit || 60);
  }
}, [currentIndex]);


  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      setMicSupported(false);
      setIsMicOn(false);
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    // "en-IN" (Indian English) keeps transcripts in Latin script even for mixed-in Hindi
    // words, which stays consistent with how questions/feedback are displayed. "hi-IN" would
    // transcribe in Devanagari instead, which would look inconsistent with the rest of the UI.
    recognition.lang = isHinglish ? "en-IN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript;

      setAnswer((prev) => prev + " " + transcript);
    };

    recognitionRef.current = recognition;

  }, []);


  const startMic = () => {
    if (recognitionRef.current && !isAIPlaying) {
      try {
        recognitionRef.current.start();
      } catch { }
    }
  };

  const stopMic = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
    } else {
      startMic();
    }
    setIsMicOn(!isMicOn);
  };


  const submitAnswer = async () => {
    if (isSubmitting) return;
    stopMic()
    setIsSubmitting(true)
    await stopRecordingAndUpload(currentIndex)

    try {
      const result = await axios.post(ServerUrl + "/api/interview/submit-answer", {
        interviewId,
        questionIndex: currentIndex,
        answer,
        timeTaken:
          currentQuestion.timeLimit - timeLeft,
      } , {withCredentials:true})

      if (isPractice) {
        setFeedback(result.data.feedback)
        speakText(result.data.feedback)
      } else {
        // Real mode: don't reveal per-answer feedback - just confirm the
        // answer was recorded. Full feedback only shows up in the final report.
        setAnswerRecorded(true)
      }
      setIsSubmitting(false)
    } catch (error) {
console.log(error)
setIsSubmitting(false)
    }
  }

  const handleNext =async () => {
    setAnswer("");
    setFeedback("");
    setAnswerRecorded(false);

    if (currentIndex + 1 >= questions.length) {
      finishInterview();
      return;
    }

    await speakText(isHinglish ? "Chaliye, agle question par chalte hain." : "Alright, let's move to the next question.");

    setCurrentIndex(currentIndex + 1);
    setTimeout(() => {
      if (isMicOn) startMic();
    }, 500);


  }

  const finishInterview = async () => {
    stopMic()
    setIsMicOn(false)
    await stopRecordingAndUpload(currentIndex)
    try {
      const result = await axios.post(ServerUrl+ "/api/interview/finish" , { interviewId} , {withCredentials:true})

      console.log(result.data)
      onFinish(result.data)
    } catch (error) {
      console.log(error)
    }
  }


   useEffect(() => {
    if (showIntro) return;
    if (!currentQuestion) return;

    if (timeLeft === 0 && !isSubmitting && !feedback && !answerRecorded) {
      submitAnswer()
    }
  }, [timeLeft]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      }

      window.speechSynthesis.cancel();

      cancelAnimationFrame(audioRafRef.current);
      audioCtxRef.current?.close().catch(() => {});

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!proctoringStarted) return;

    const handleVisibility = () => {
      if (document.hidden) {
        registerViolation("You switched away from this tab");
      }
    };

    const handleBlur = () => {
      if (document.hidden) return; // already counted by visibilitychange
      registerViolation("You switched to another window");
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        fullscreenEnteredRef.current = true;
        return;
      }
      if (fullscreenEnteredRef.current) {
        registerViolation("You exited fullscreen mode");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [proctoringStarted]);

  useEffect(() => {
    if (!terminated) return;
    stopMic();
    window.speechSynthesis.cancel();
    const t = setTimeout(() => {
      finishInterview();
    }, 2500);
    return () => clearTimeout(t);
  }, [terminated]);

  useEffect(() => {
    if (!violationMessage || terminated) return;
    const t = setTimeout(() => setViolationMessage(""), 4000);
    return () => clearTimeout(t);
  }, [violationMessage, terminated]);


  if (!proctoringStarted) {
    return (
      <div className='min-h-screen bg-bg bg-noise flex items-center justify-center p-4 sm:p-6'>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='w-full max-w-lg bg-card border border-line rounded-3xl shadow-[var(--shadow-lift)] overflow-hidden'>

          <div className='relative bg-[#120f10] p-8 text-white text-center bg-noise'>
            <div className='absolute top-[-80px] left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-[radial-gradient(closest-side,rgba(196,22,31,0.35),transparent)] blur-2xl' />
            <div className='relative w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center mx-auto mb-5'>
              <ShieldAlert size={24} />
            </div>
            <h2 className='relative text-[21px] font-semibold'>This is a proctored interview</h2>
            <p className='relative text-white/50 text-[13px] mt-1.5'>Please read carefully before you begin</p>
          </div>

          <div className='p-8'>
            <ul className='text-[13.5px] text-text-secondary text-left space-y-3 mb-6 leading-relaxed'>
              {[
                "The interview runs in fullscreen.",
                "Copy and paste are disabled on the answer box.",
                "Your camera stays on - no face, more than one face, or looking away from the screen counts as a violation.",
                "Switching tabs, windows, or exiting fullscreen also counts as a violation.",
                "After 3 violations, the interview ends automatically.",
                "Your answers (audio/video) are recorded and included in your report.",
              ].map((rule, i) => (
                <li key={i} className='flex items-start gap-2.5'>
                  <span className='mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0' />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <label className='flex items-start gap-3 mb-6 p-4 bg-bg border border-line rounded-2xl cursor-pointer select-none'>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className='mt-0.5 w-4 h-4 accent-[color:var(--color-accent)] shrink-0'
              />
              <span className='text-[13px] text-text-secondary leading-relaxed'>
                I have read and agree to the proctoring terms above, and consent to being recorded (camera, microphone, and answer video) for the duration of this interview.
              </span>
            </label>

            <motion.button
              whileTap={agreedToTerms ? { scale: 0.97 } : {}}
              onClick={enterFullscreenAndStart}
              disabled={!agreedToTerms}
              className='w-full bg-accent hover:bg-accent-dark text-white py-3.5 rounded-2xl shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all duration-300 font-medium flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-soft)]'>
              <Maximize size={16} /> Enter Fullscreen & Start
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (showIntro) {
    // Proctoring (camera/violations) intentionally doesn't start until the
    // real interview UI mounts below - there's nowhere to surface a
    // violation warning during this cinematic, so running face-detection
    // against it could silently end the interview before it even begins.
    return (
      <InterviewIntro
        candidateName={userName}
        isHinglish={isHinglish}
        speakText={selectedVoice ? speakText : null}
        onComplete={() => setShowIntro(false)}
      />
    )
  }

  return (
    <div className='min-h-screen bg-bg bg-noise flex items-center justify-center p-4 sm:p-6'>
      <AnimatePresence>
        {violationMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-auto px-5 py-3.5 rounded-2xl shadow-[var(--shadow-lift)] text-[13.5px] font-medium flex items-center gap-2.5 ${terminated ? "bg-red-600 text-white" : "bg-ink text-bg"}`}>
            <ShieldAlert size={16} className='shrink-0' />
            {violationMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className='w-full max-w-[1400px] min-h-[80vh] bg-card rounded-3xl border border-line shadow-[var(--shadow-lift)] flex flex-col lg:flex-row overflow-hidden'>

        {/* AI interviewer + camera section */}
        <div className='w-full lg:w-[35%] bg-bg flex flex-col items-center p-6 space-y-5 border-r border-line'>
          <div className='relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden border border-line shadow-[var(--shadow-soft)]'>
            <AIInterviewerFigure
              state={isAIPlaying ? "speaking" : isSubmitting ? "thinking" : (isMicOn && !isAIPlaying) ? "listening" : "idle"}
              formProgress={1}
              audioLevel={audioLevel}
              className='w-full h-full'
            />
            {isAIPlaying && (
              <div className='absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full'>
                <Radio size={11} className='text-accent animate-pulse' /> AI Speaking
              </div>
            )}
          </div>

          {/* your camera - proctoring */}
          <ProctoringCamera
            active={proctoringStarted}
            onViolation={registerViolation}
            onStream={handleStream}
            className="w-full max-w-md h-48 sm:h-56"
          />

          {/* subtitle */}
          {subtitle && (
            <div className='w-full max-w-md bg-card border border-line rounded-xl p-4 shadow-[var(--shadow-soft)]'>
              <p className='text-text-secondary text-[13.5px] sm:text-[14.5px] font-medium text-center leading-relaxed'>{subtitle}</p>
            </div>
          )}


          {/* timer Area */}
          <div className='w-full max-w-md bg-card border border-line rounded-2xl shadow-[var(--shadow-soft)] p-6 space-y-5'>
            <div className='flex justify-between items-center'>
              <span className='text-[13px] text-text-secondary'>
                Interview Status
              </span>
            </div>

            <div className="h-px bg-line"></div>

            <div className='flex justify-center'>

              <Timer timeLeft={timeLeft} totalTime={currentQuestion?.timeLimit} />
            </div>

            <div className="h-px bg-line"></div>

            <div className='grid grid-cols-2 gap-6 text-center'>
              <div>
                <span className='text-[22px] font-bold text-ink'>{currentIndex + 1}</span>
                <span className='text-[11.5px] text-text-secondary block'>Current Question</span>
              </div>

              <div>
                <span className='text-[22px] font-bold text-ink'>{questions.length}</span>
                <span className='text-[11.5px] text-text-secondary block'>Total Questions</span>
              </div>
            </div>


          </div>
        </div>

        {/* Text section */}

        <div className='flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative'>
          <div className='flex flex-wrap items-center gap-3 mb-6'>
            <h2 className='text-[19px] sm:text-[22px] font-semibold text-ink'>
              AI Smart Interview
            </h2>
            {roundLabel && (
              <span className='bg-accent/10 text-accent px-3 py-1 rounded-full text-[12px] font-medium'>{roundLabel}</span>
            )}
            <span className={`px-3 py-1 rounded-full text-[11.5px] font-medium ${isPractice ? "bg-success/10 text-success" : "bg-black/[0.06] dark:bg-white/10 text-text-secondary"}`}>
              {isPractice ? "Practice Mode" : "Real Mode"}
            </span>
          </div>


          <div
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            className='relative mb-6 bg-bg p-4 sm:p-6 rounded-2xl border border-line select-none'>
            <p className='text-[12px] sm:text-[13px] text-text-secondary mb-2'>
              Question {currentIndex + 1} of {questions.length}
            </p>

            <div className='text-[15px] sm:text-[17px] font-semibold text-ink leading-relaxed'>{currentQuestion?.question}</div>
          </div>
          <textarea
            placeholder="Type your answer here..."
            onChange={(e) => setAnswer(e.target.value)}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            value={answer}
            className="flex-1 bg-black/[0.02] dark:bg-white/[0.03] p-4 sm:p-6 rounded-2xl resize-none outline-none border border-line focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors text-ink text-[14.5px]" />

          {!micSupported && (
            <p className='text-[12.5px] text-text-secondary mt-3'>
              Voice input isn't supported in this browser. Type your answer below, or switch to Chrome/Edge for voice input.
            </p>
          )}

         {!feedback && !answerRecorded ? ( <div className='flex items-center gap-4 mt-6'>
            <motion.button
              onClick={toggleMic}
              disabled={!micSupported}
              whileTap={{ scale: 0.9 }}
              className='w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-accent text-white shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:bg-accent-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed'>
              {isMicOn ? <Mic size={19} /> : <MicOff size={19}/>}
            </motion.button>

            <motion.button
            onClick={submitAnswer}
            disabled={isSubmitting}
              whileTap={{ scale: 0.97 }}
              className='flex-1 bg-accent text-white py-3 sm:py-4 rounded-2xl shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:bg-accent-dark hover:-translate-y-0.5 transition-all duration-300 font-medium disabled:bg-gray-400 disabled:translate-y-0 disabled:shadow-none'>
              {isSubmitting?"Submitting...":"Submit Answer"}

            </motion.button>

          </div>):(
            <motion.div
             initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            className='mt-6 bg-success/[0.06] border border-success/20 p-5 rounded-2xl'>
              {isPractice ? (
                <p className='text-success font-medium mb-4 text-[14.5px] leading-relaxed'>{feedback}</p>
              ) : (
                <p className='text-success font-medium mb-4 text-[14.5px] leading-relaxed'>
                  Answer recorded. You'll see feedback for every question together in your final report.
                </p>
              )}

              <button
              onClick={handleNext}

               className='w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-1.5 font-medium'>
                Next Question <ArrowRight size={16}/>
              </button>

            </motion.div>
          )}
        </div>
      </div>

    </div>
  )
}

export default Step2Interview
