// Single source of truth for the placeholders a communication template may use and for the templates every
// organization starts with. `defaultKey` is the stable identity of a default: initialization is keyed on it, so
// running it again (or on an account that already has templates) never duplicates or overwrites anything.

export const TEMPLATE_VARIABLE_KEYS = [
    "candidate_name", "drive_title", "company_name", "interview_link", "expiry_date",
    "round_number", "round_title", "interview_date",
]

const SIGN_OFF = "Best regards,\n{company_name} Hiring Team"

const roundInvitation = (n) => ({
    defaultKey: `EMAIL_ROUND_${n}_INVITATION`,
    name: `Round ${n} Interview Invitation`,
    type: "EMAIL",
    purpose: "INVITATION",
    roundNumber: n,
    subject: `Round ${n} of your interview for {drive_title} at {company_name}`,
    body: `Hello {candidate_name},\n\nCongratulations on moving forward. You have been invited to Round ${n} ({round_title}) of the interview for {drive_title} at {company_name}.\n\nYour interview time: {interview_date}\nPlease complete this round before {expiry_date}.\n\nSign in to your candidate portal to confirm your slot and start the interview: {interview_link}\nYour resume is already on file, so there is nothing to upload again.\n\n${SIGN_OFF}`,
})

export const DEFAULT_TEMPLATES = [
    {
        defaultKey: "EMAIL_INVITATION", legacyName: "Candidate AI Interview Invitation",
        name: "Candidate AI Interview Invitation", type: "EMAIL", purpose: "INVITATION", roundNumber: 1,
        subject: "You have been invited to attempt the AI Interview for {drive_title} at {company_name}",
        body: `Hello {candidate_name},\n\nWe are pleased to invite you to take the AI-powered video interview for the position of {drive_title} at {company_name}.\n\nPlease use the link below to start your interview before {expiry_date}:\n\n{interview_link}\n\nBest regards,\n{company_name} Hiring Team`,
    },
    {
        defaultKey: "EMAIL_REMINDER", legacyName: "Interview Reminder Notification",
        name: "Interview Reminder Notification", type: "EMAIL", purpose: "REMINDER",
        subject: "Reminder: Your AI Interview for {drive_title} expires soon",
        body: `Hi {candidate_name},\n\nThis is a friendly reminder that your AI video interview for {drive_title} expires on {expiry_date}.\n\nAccess your interview here: {interview_link}\n\nGood luck!`,
    },
    {
        defaultKey: "EMAIL_SELECTION", legacyName: "Shortlisted Candidate Next Round Email",
        name: "Shortlisted Candidate Next Round Email", type: "EMAIL", purpose: "CONGRATULATIONS",
        subject: "You're moving forward with {company_name}",
        body: `Hi {candidate_name},\n\nThank you for completing your interview for {drive_title}. We're pleased to let you know that our hiring team would like to take you to the next round.\n\nNext step: sign in to your candidate portal at {interview_link} and choose a time for your next interview. Your resume is already on file, so there is nothing to upload again. Your interview is not booked until you choose a time.\n\n${SIGN_OFF}`,
    },
    {
        defaultKey: "EMAIL_REJECTION", legacyName: "Application Not Progressing",
        name: "Application Not Progressing", type: "EMAIL", purpose: "REJECTION",
        subject: "Update on Your Application",
        body: `Hi {candidate_name},\n\nThank you for taking the time to participate in the hiring process for {drive_title} at {company_name}.\n\nAfter careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate your interest in {company_name} and the time and effort you invested in the process. We wish you all the best in your future endeavors.\n\n${SIGN_OFF}`,
    },
    roundInvitation(2),
    roundInvitation(3),
    {
        defaultKey: "WHATSAPP_INVITATION", legacyName: "WhatsApp Interview Invitation",
        name: "WhatsApp Interview Invitation", type: "WHATSAPP", purpose: "INVITATION", roundNumber: 1,
        body: "Hi {candidate_name}! You've been invited to the AI interview for *{drive_title}* at {company_name}. Complete it before {expiry_date}: {interview_link}",
    },
    {
        defaultKey: "WHATSAPP_ROUND_2_INVITATION",
        name: "WhatsApp Round 2 Invitation", type: "WHATSAPP", purpose: "INVITATION", roundNumber: 2,
        body: "Hi {candidate_name}, you're through to Round 2 for *{drive_title}* at {company_name}. Confirm your slot and interview before {expiry_date}: {interview_link}",
    },
    {
        defaultKey: "WHATSAPP_REMINDER", legacyName: "WhatsApp Interview Reminder",
        name: "WhatsApp Interview Reminder", type: "WHATSAPP", purpose: "REMINDER",
        body: "Hi {candidate_name}, just a reminder - your AI interview for *{drive_title}* expires on {expiry_date}. Attempt it here: {interview_link}",
    },
    {
        defaultKey: "WHATSAPP_SELECTION",
        name: "WhatsApp Selection Message", type: "WHATSAPP", purpose: "CONGRATULATIONS",
        body: "Hi {candidate_name}, congratulations! You're moving forward for *{drive_title}* at {company_name}. Choose your next interview slot here: {interview_link}",
    },
    {
        defaultKey: "WHATSAPP_REJECTION",
        name: "WhatsApp Application Update", type: "WHATSAPP", purpose: "REJECTION",
        body: "Hi {candidate_name}, thank you for your time with {company_name} for *{drive_title}*. We won't be moving forward with your application at this time. We wish you the very best.",
    },
    {
        defaultKey: "CALL_FOLLOW_UP", legacyName: "Recruiter Follow-up Call Script",
        name: "Recruiter Follow-up Call Script", type: "CALL", purpose: "FOLLOW_UP",
        body: "Greet {candidate_name} and confirm they're speaking with {company_name} regarding the {drive_title} role.\n\n1. Confirm they completed the AI interview.\n2. Ask if they have questions about the role or next steps.\n3. Share expected timeline for {drive_title} feedback.\n4. Thank them for their time and confirm best contact number/email.",
    },
]
