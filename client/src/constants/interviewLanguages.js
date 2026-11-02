// Languages an interview can be conducted in (the interviewer speaks and listens in the one chosen, and the candidate can
// ask for another mid-interview). Mirrors services/client-service/utils/interviewLanguages.js; a test keeps both identical.
export const INTERVIEW_LANGUAGES = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'hi', label: 'Hindi', native: 'हिंदी' },
  { value: 'hinglish', label: 'Hinglish', native: 'Hinglish' },
  { value: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { value: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { value: 'te', label: 'Telugu', native: 'తెలుగు' },
  { value: 'bn', label: 'Bengali', native: 'বাংলা' },
  { value: 'mr', label: 'Marathi', native: 'मराठी' },
  { value: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { value: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { value: 'ml', label: 'Malayalam', native: 'മലയാളം' },
]

export const interviewLanguageLabel = (code) => INTERVIEW_LANGUAGES.find((l) => l.value === code)?.label || 'English'
