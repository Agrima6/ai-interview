// Languages an interview can be conducted in. Must match the interviewer's languages (workmate-iq-agent languages.py);
// the client keeps the same list in client/src/constants/interviewLanguages.js and a test keeps the two identical.
export const INTERVIEW_LANGUAGES = [
    ["en", "English", "English"],
    ["hi", "Hindi", "हिंदी"],
    ["hinglish", "Hinglish", "Hinglish"],
    ["pa", "Punjabi", "ਪੰਜਾਬੀ"],
    ["ta", "Tamil", "தமிழ்"],
    ["te", "Telugu", "తెలుగు"],
    ["bn", "Bengali", "বাংলা"],
    ["mr", "Marathi", "मराठी"],
    ["gu", "Gujarati", "ગુજરાતી"],
    ["kn", "Kannada", "ಕನ್ನಡ"],
    ["ml", "Malayalam", "മലയാളം"],
].map(([value, label, native]) => ({ value, label, native }))

export const INTERVIEW_LANGUAGE_CODES = INTERVIEW_LANGUAGES.map((l) => l.value)

export const isInterviewLanguage = (code) => INTERVIEW_LANGUAGE_CODES.includes(code)

export const normalizeInterviewLanguage = (code, fallback = "en") => (isInterviewLanguage(code) ? code : fallback)
