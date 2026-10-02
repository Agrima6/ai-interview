// What a candidate must share for an interview, decided by the interview's configuration - never hard-coded
// in the browser. Only what is listed here is ever requested from the candidate.
//
//   VOICE  - microphone only
//   VIDEO  - microphone + camera
//   SCREEN - microphone + camera + screen (the default, and the safe value for anything unrecognised)
export const INTERVIEW_MODES = ["VOICE", "VIDEO", "SCREEN"]
export const DEFAULT_INTERVIEW_MODE = "SCREEN"

/** A valid mode, or undefined when the value is missing/invalid (so a round can inherit its drive's mode). */
export const normalizeInterviewMode = (value) => {
    const mode = String(value || "").trim().toUpperCase()
    return INTERVIEW_MODES.includes(mode) ? mode : undefined
}

/** round mode -> drive mode -> default */
export const resolveInterviewMode = (round, drive) =>
    normalizeInterviewMode(round?.interviewMode) || normalizeInterviewMode(drive?.interviewMode) || DEFAULT_INTERVIEW_MODE

export const permissionsForMode = (mode) => {
    const resolved = normalizeInterviewMode(mode) || DEFAULT_INTERVIEW_MODE
    return {
        microphone: true,                        // the interviewer is a voice conversation: always needed
        camera: resolved === "VIDEO" || resolved === "SCREEN",
        screen: resolved === "SCREEN",
    }
}
