import React from 'react'
import maleVideo from "../assets/videos/male-ai.mp4"
import femaleVideo from "../assets/videos/female-ai.mp4"
import Timer from './Timer'
import ProctoringCamera from './ProctoringCamera'
import { motion, AnimatePresence } from "motion/react"
import { Mic, MicOff, ArrowRight, Radio, Maximize, ShieldAlert, ArrowLeftRight } from "lucide-react";
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
const findVoiceForGender = (voices, gender, isHinglish) => {
  if (isHinglish) {
    const hindiNames = gender === "male" ? VOICE_NAMES.hindiMale : VOICE_NAMES.hindiFemale;
    const hindiVoice = pickBestVoice(voices, hindiNames) || voices.find(v => v.lang?.toLowerCase().startsWith("hi"));
    if (hindiVoice) return hindiVoice;
  }
  return pickBestVoice(voices, VOICE_NAMES[gender]) || voices[0];
};

function Step2Interview({ interviewData, onFinish }) {
  const { interviewId, questions, userName, language = "English", voicePreference = "auto", sessionMode = "real", roundLabel = null } = interviewData;
  const isHinglish = language === "Hinglish";
  const isPractice = sessionMode === "practice";
  const [answerRecorded, setAnswerRecorded] = useState(false);
  const [isIntroPhase, setIsIntroPhase] = useState(true);

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
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");
  const [micSupported, setMicSupported] = useState(true);

  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationMessage, setViolationMessage] = useState("");
  const [terminated, setTerminated] = useState(false);
  const terminatedRef = useRef(false);
  const fullscreenEnteredRef = useRef(false);
  const violationCooldownRef = useRef(false);


  const videoRef = useRef(null);

  const currentQuestion = questions[currentIndex];

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

      // An explicit preference from setup always wins; "auto" falls back to
      // whichever gender actually has a usable voice installed, trying
      // female first (matches the previous default behavior).
      const gender = voicePreference === "male" || voicePreference === "female"
        ? voicePreference
        : (findVoiceForGender(voices, "female", isHinglish) ? "female" : "male");

      setSelectedVoice(findVoiceForGender(voices, gender, isHinglish));
      setVoiceGender(gender);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

  }, [isHinglish, voicePreference])

  const switchVoiceGender = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    const nextGender = voiceGender === "male" ? "female" : "male";
    setSelectedVoice(findVoiceForGender(voices, nextGender, isHinglish));
    setVoiceGender(nextGender);
  };

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;


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
        videoRef.current?.play();
      };


      utterance.onend = () => {
        videoRef.current?.pause();
        videoRef.current.currentTime = 0;
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
    if (!selectedVoice || !proctoringStarted) {
      return;
    }
    const runIntro = async () => {
      if (isIntroPhase) {
        await speakText(
          isHinglish
            ? `Hi ${userName}, aapse milke accha laga. Hope aap confident aur ready feel kar rahe ho.`
            : `Hi ${userName}, it's great to meet you today. I hope you're feeling confident and ready.`
        );

        await speakText(
          isHinglish
            ? "Main aapse kuch questions puchunga. Bas naturally answer dena, apna time lena. Chaliye shuru karte hain."
            : "I'll ask you a few questions. Just answer naturally, and take your time. Let's begin."
        );

        setIsIntroPhase(false)
      } else if (currentQuestion) {
        await new Promise(r => setTimeout(r, 800));

        // If last question (hard level)
        if (currentIndex === questions.length - 1) {
          await speakText(isHinglish ? "Chaliye, yeh thoda challenging ho sakta hai." : "Alright, this one might be a bit more challenging.");
        }

        await speakText(currentQuestion.question);

        if (isMicOn) {
          startMic();
        }
      }

    }

    runIntro()


  }, [selectedVoice, isIntroPhase, currentIndex, proctoringStarted])



  useEffect(() => {
    if (isIntroPhase) return;
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

  }, [isIntroPhase, currentIndex])

  useEffect(() => {
  if (!isIntroPhase && currentQuestion) {
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
    try {
      const result = await axios.post(ServerUrl+ "/api/interview/finish" , { interviewId} , {withCredentials:true})

      console.log(result.data)
      onFinish(result.data)
    } catch (error) {
      console.log(error)
    }
  }


   useEffect(() => {
    if (isIntroPhase) return;
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
          className='w-full max-w-md bg-card border border-line rounded-3xl shadow-[var(--shadow-lift)] p-8 text-center'>
          <div className='w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center mx-auto mb-5'>
            <ShieldAlert size={22} />
          </div>
          <h2 className='text-[20px] font-semibold text-ink mb-3'>This is a proctored interview</h2>
          <ul className='text-[13.5px] text-text-secondary text-left space-y-2 mb-7 leading-relaxed'>
            <li>&bull; The interview runs in fullscreen.</li>
            <li>&bull; Copy and paste are disabled on the answer box.</li>
            <li>&bull; Your camera stays on - no face, more than one face, or looking away from the screen counts as a violation.</li>
            <li>&bull; Switching tabs, windows, or exiting fullscreen also counts as a violation.</li>
            <li>&bull; After 3 violations, the interview ends automatically.</li>
          </ul>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={enterFullscreenAndStart}
            className='w-full bg-accent hover:bg-accent-dark text-white py-3.5 rounded-2xl shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all duration-300 font-medium flex items-center justify-center gap-2'>
            <Maximize size={16} /> Enter Fullscreen & Start
          </motion.button>
        </motion.div>
      </div>
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

        {/* video section */}
        <div className='w-full lg:w-[35%] bg-bg flex flex-col items-center p-6 space-y-5 border-r border-line'>
          <div className='relative w-full max-w-md rounded-2xl overflow-hidden border border-line shadow-[var(--shadow-soft)]'>
            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover"
            />
            {isAIPlaying && (
              <div className='absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full'>
                <Radio size={11} className='text-accent animate-pulse' /> AI Speaking
              </div>
            )}
            <button
              onClick={switchVoiceGender}
              title={`Switch to ${voiceGender === "male" ? "female" : "male"} voice`}
              className='absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[11.5px] font-medium px-2.5 py-1 rounded-full hover:bg-black/85 transition-colors'>
              <ArrowLeftRight size={11} /> {voiceGender === "male" ? "Male" : "Female"}
            </button>
          </div>

          {/* your camera - proctoring */}
          <ProctoringCamera
            active={proctoringStarted}
            onViolation={registerViolation}
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


          {!isIntroPhase && (<div
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            className='relative mb-6 bg-bg p-4 sm:p-6 rounded-2xl border border-line select-none'>
            <p className='text-[12px] sm:text-[13px] text-text-secondary mb-2'>
              Question {currentIndex + 1} of {questions.length}
            </p>

            <div className='text-[15px] sm:text-[17px] font-semibold text-ink leading-relaxed'>{currentQuestion?.question}</div>
          </div>)
          }
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
