import multer from "multer"
import * as onboardingService from "../services/onboarding.service.js"
import { writeFile } from "../utils/localFileStore.js"
import { ok } from "../utils/response.js"
import { ApiError } from "../utils/response.js"

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
        })
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
        writeFile(req.params.id, fileRecord.fileId, req.file.originalname, req.file.buffer)
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
        const result = await onboardingService.submit({
            onboardingId: req.params.id,
            rawToken: tokenFromRequest(req),
            type: req.body.type,
            consent: req.body.consent,
        }, { requestId: req.requestId, correlationId: req.correlationId })
        ok(res, result)
    } catch (error) { next(error) }
}
