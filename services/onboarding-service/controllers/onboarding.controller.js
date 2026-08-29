import multer from "multer"
import * as onboardingService from "../services/onboarding.service.js"
import * as storage from "../utils/storage.js"
import { ok, ApiError } from "@workmateiq/common"
import { verifyCaptcha } from "../utils/captcha.js"

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

export const presignFile = async (req, res, next) => {
    try {
        const { fieldKey, originalName, mimeType, size, type } = req.body
        if (!fieldKey) throw new ApiError(400, "FIELD_KEY_REQUIRED", "fieldKey is required.")
        if (!originalName || !mimeType) {
            throw new ApiError(400, "FILE_DETAILS_REQUIRED", "originalName and mimeType are required.")
        }
        const fileRecord = await onboardingService.registerFileUpload({
            onboardingId: req.params.id,
            rawToken: tokenFromRequest(req),
            type,
            fieldKey,
            fileMeta: { originalName, mimeType, size },
            status: "PENDING",
        })
        const details = await storage.getUploadDetails(req.params.id, fileRecord.fileId, originalName, mimeType)
        ok(res, {
            fileId: fileRecord.fileId,
            uploadUrl: details.uploadUrl,
            method: details.method,
            fieldKey,
            storageProvider: details.storageProvider,
            objectKey: details.objectKey,
            bucket: details.bucket,
        })
    } catch (error) { next(error) }
}

export const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) throw new ApiError(400, "FILE_REQUIRED", "No file provided.")
        const { fieldKey, fileId } = req.body
        if (!fieldKey) throw new ApiError(400, "FIELD_KEY_REQUIRED", "fieldKey is required.")
        if (!fileId) throw new ApiError(400, "FILE_ID_REQUIRED", "fileId is required.")
        const file = await onboardingService.getFileDetails(req.params.id, fileId)
        storage.writeLocalFile(req.params.id, fileId, file.originalName, req.file.buffer)
        const fileRecord = await onboardingService.markFileAvailable(req.params.id, fileId)
        ok(res, fileRecord)
    } catch (error) { next(error) }
}

export const completeFile = async (req, res, next) => {
    try {
        const { fileId } = req.body
        if (!fileId) throw new ApiError(400, "FILE_ID_REQUIRED", "fileId is required.")
        const fileRecord = await onboardingService.markFileAvailable(req.params.id, fileId)
        ok(res, { fileId: fileRecord.fileId, status: "AVAILABLE" })
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

export const viewFile = async (req, res, next) => {
    try {
        const { id, fileId } = req.params
        const file = await onboardingService.getFileDetails(id, fileId)
        const provider = process.env.STORAGE_PROVIDER || "local"
        if (provider === "s3") {
            const downloadUrl = await storage.getDownloadUrl(id, fileId, file.originalName)
            res.redirect(downloadUrl)
        } else {
            res.setHeader("Content-Type", file.mimeType)
            const filePath = storage.getLocalFilePath(id, fileId, file.originalName)
            res.sendFile(filePath)
        }
    } catch (error) { next(error) }
}
