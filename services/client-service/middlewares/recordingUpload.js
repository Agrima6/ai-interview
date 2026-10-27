import multer from "multer"

const ALLOWED_MIMETYPES = new Set(["video/webm", "video/mp4", "video/x-matroska"])

// Buffered in memory (not written to local disk) so it can go straight to
// S3/MinIO - plan.md #11: recordings belong in object storage, not the app
// server's own filesystem.
// A candidate's own interview recording, captured client-side by
// MediaRecorder for the length of the session - a webcam feed at modest
// quality for maybe 15-30 minutes, so 300MB comfortably covers it without
// allowing arbitrary large uploads.
export const uploadRecording = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 300 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
            return cb(new Error("Only WebM or MP4 recordings are accepted."))
        }
        cb(null, true)
    },
})

// One slice of an in-progress recording (see services/recording.service.js). Small, so memory buffering is fine.
// The browser labels slices with the codec ("video/webm;codecs=vp8,opus"), so the base type is what is checked.
export const uploadRecordingChunk = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const base = String(file.mimetype || "").split(";")[0].trim().toLowerCase()
        if (!ALLOWED_MIMETYPES.has(base) && !["audio/webm", "audio/mp4"].includes(base)) {
            return cb(new Error("Only WebM or MP4 recordings are accepted."))
        }
        cb(null, true)
    },
})
