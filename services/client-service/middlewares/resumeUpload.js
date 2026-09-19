import multer from "multer"

const ALLOWED_MIMETYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

// Buffered in memory (not written to local disk) so it can go straight to
// S3/MinIO - plan.md #33/#11: object storage, not the app server's own
// filesystem, is the durable home for uploaded files.
// A candidate's resume is a small document, not a video - 8MB comfortably
// covers a multi-page PDF/DOCX without allowing arbitrary large uploads on
// this public, unauthenticated endpoint.
export const uploadResume = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
            return cb(new Error("Only PDF or Word documents are accepted for resumes."))
        }
        cb(null, true)
    },
})
