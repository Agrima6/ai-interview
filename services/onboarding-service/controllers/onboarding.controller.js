import multer from "multer"
import * as onboardingService from "../services/onboarding.service.js"
import { writeFile } from "../utils/localFileStore.js"
import { getObjectStream } from "../config/s3Client.js"
import { ok } from "../utils/response.js"
import { ApiError } from "../utils/response.js"
import { verifyCaptcha } from "../utils/captcha.js"
import { verifyFileSignature } from "../utils/signedFileUrl.js"

// Client-reported Content-Type only (no magic-byte sniffing) - not a strong
// guarantee, but at least rejects the obviously-wrong-category uploads that
// a totally open fileFilter would let through.
const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(new ApiError(400, "UNSUPPORTED_FILE_TYPE", "Unsupported file type. Upload a PDF, Word document, or image."))
        }
        cb(null, true)
    },
})
export const uploadMiddleware = upload.single("file")

const tokenFromRequest = (req) => req.headers["x-onboarding-token"] || req.body?.token

export const getByToken = async (req, res, next) => {
    try {
        const { type, token } = req.params
        const result = await onboardingService.getByToken(type, token, {
            requestId: req.requestId,
            correlationId: req.correlationId,
        })
        ok(res, result)
    } catch (error) { next(error) }
}

export const autosave = async (req, res, next) => {
    try {
        const { data, currentStep, type } = req.body
        const result = await onboardingService.autosave({
            onboardingId: req.params.id,
            rawToken: tokenFromRequest(req),
            type,
            data,
            currentStep,
        }, { requestId: req.requestId, correlationId: req.correlationId })
        ok(res, result)
    } catch (error) { next(error) }
}

// Simplified local-disk stand-in for a presigned-S3 upload: the "presign"
// step just returns a fileId to upload against; the browser then posts the
// bytes straight to this service instead of straight to S3.
export const presignFile = async (req, res, next) => {
    try {
        ok(res, {
            uploadUrl: `/api/v1/onboardings/${req.params.id}/files/upload`,
            method: "POST",
            fieldKey: req.body.fieldKey,
        })
    } catch (error) { next(error) }
}

export const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) throw new ApiError(400, "FILE_REQUIRED", "No file provided.")
        const { fieldKey } = req.body
        if (!fieldKey) throw new ApiError(400, "FIELD_KEY_REQUIRED", "fieldKey is required.")
        const fileRecord = await onboardingService.registerFileUpload({
            onboardingId: req.params.id,
            rawToken: tokenFromRequest(req),
            type: req.body.type,
            fieldKey,
            fileMeta: { originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size },
        })
        try {
            await writeFile(req.params.id, fileRecord.fileId, req.file.originalname, req.file.buffer, req.file.mimetype)
        } catch (storageErr) {
            console.error("[onboarding-service] file storage write failed:", storageErr?.name || storageErr?.message)
            await onboardingService.discardFileRecord({ onboardingId: req.params.id, fileId: fileRecord.fileId }).catch(() => {})
            throw new ApiError(502, "FILE_STORAGE_UNAVAILABLE", "We couldn't store the file right now. Please try again in a moment.")
        }
        ok(res, fileRecord)
    } catch (error) { next(error) }
}

export const completeFile = async (req, res, next) => {
    try {
        ok(res, { fileId: req.body.fileId, status: "AVAILABLE" })
    } catch (error) { next(error) }
}

export const submit = async (req, res, next) => {
    try {
        const { captchaToken, captchaAnswer } = req.body
        verifyCaptcha(captchaToken, captchaAnswer)

        const result = await onboardingService.submit({
            onboardingId: req.params.id,
            rawToken: tokenFromRequest(req),
            type: req.body.type,
            consent: req.body.consent,
        }, { requestId: req.requestId, correlationId: req.correlationId })
        ok(res, result)
    } catch (error) { next(error) }
}

// Candidate/organization side: proves ownership with the onboarding token, gets a one-hour link.
export const fileLink = async (req, res, next) => {
    try {
        ok(res, await onboardingService.issueFileLink({
            onboardingId: req.params.id, fileId: req.params.fileId, rawToken: tokenFromRequest(req), type: req.body?.type,
        }))
    } catch (error) { next(error) }
}

export const viewFile = async (req, res, next) => {
    try {
        const { id, fileId } = req.params
        // The file is private: only a link issued by the authenticated API (see issueFileLink) opens it.
        if (!verifyFileSignature(id, fileId, req.query.exp, req.query.sig)) {
            throw new ApiError(403, "FILE_LINK_INVALID", "This file link is invalid or has expired. Reload the page to get a new one.")
        }
        const file = await onboardingService.getFileDetails(id, fileId)
        const object = await getObjectStream(file.key).catch((err) => {
            if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
                throw new ApiError(404, "FILE_NOT_FOUND", "This file could not be found.")
            }
            // Storage down / unreachable: say so plainly instead of a generic 500.
            console.error("[onboarding-service] file storage read failed:", err?.name || err?.message)
            throw new ApiError(502, "FILE_STORAGE_UNAVAILABLE", "File storage is not reachable right now. Please try again shortly.")
        })
        const contentType = object.contentType || file.mimeType || "application/octet-stream"
        // inline for previews (<img>, PDF viewer), attachment when ?download=1. The filename is sanitised for the
        // plain header and sent again in RFC 5987 form so non-ASCII names survive.
        const name = String(file.originalName || "file").replace(/[\r\n"\\]/g, "_")
        const ascii = name.replace(/[^\x20-\x7E]/g, "_")
        const disposition = req.query.download === "1" ? "attachment" : "inline"
        res.setHeader("Content-Type", contentType)
        res.setHeader("Content-Disposition", `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`)
        res.setHeader("X-Content-Type-Options", "nosniff")
        res.setHeader("Cache-Control", "private, max-age=300")
        object.stream.on("error", (err) => {
            // A stream that dies midway must end the response rather than leave the browser spinning.
            if (!res.headersSent) return next(err)
            res.destroy(err)
        })
        object.stream.pipe(res)
    } catch (error) { next(error) }
}

