import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import multer from "multer"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const RECORDINGS_DIR = path.join(__dirname, "..", "uploads", "recordings")

if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, RECORDINGS_DIR),
    filename: (req, file, cb) => {
        const ext = file.mimetype === "video/mp4" ? "mp4" : "webm"
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`)
    },
})

// Per-question answer recordings are short (one interview question's worth
// of audio/video, typically well under a minute) - 25MB comfortably covers
// that at webm/opus+vp8 bitrates without allowing arbitrary large uploads.
export const uploadRecording = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("video/") && !file.mimetype.startsWith("audio/")) {
            return cb(new Error("Only audio/video recordings are accepted."))
        }
        cb(null, true)
    },
})
