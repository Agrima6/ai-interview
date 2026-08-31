import { InterviewDrive } from "../models/interviewDrive.model.js"
import { ApiError } from "../utils/response.js"

export const createDrive = async (tenantId, driveData) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    if (!driveData.title || !driveData.expiryDate) {
        throw new ApiError(400, "MISSING_FIELDS", "Title and expiry date are mandatory.")
    }

    const firstRound = {
        roundNumber: 1,
        title: `Round 1: ${driveData.roundType || "Technical Assessment"}`,
        type: driveData.roundType || "Technical Round",
        status: "ACTIVE",
        expiryDate: driveData.expiryDate,
        passingThreshold: driveData.passingThreshold || 70,
        skillRubrics: driveData.skillRubrics || [],
        questionMode: driveData.questionMode || "PREBUILT",
        questionBankTitle: driveData.questionBankTitle,
        customQuestions: driveData.customQuestionsList || [],
        candidates: driveData.importedCandidateList || [],
    }

    const newDrive = new InterviewDrive({
        ...driveData,
        tenantId,
        currentRound: 1,
        rounds: [firstRound],
    })

    return await newDrive.save()
}

export const listDrives = async (tenantId, filters = {}) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const query = { tenantId }
    if (filters.status && filters.status !== "ALL") query.status = filters.status
    if (filters.search) {
        query.title = { $regex: filters.search, $options: "i" }
    }

    const drives = await InterviewDrive.find(query).sort({ createdAt: -1 })
    return drives
}

export const getDriveById = async (tenantId, driveId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    return drive
}

export const addRoundToDrive = async (tenantId, driveId, roundData) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const drive = await InterviewDrive.findOne({ _id: driveId, tenantId })
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")

    const nextRoundNum = (drive.rounds?.length || 0) + 1

    const newRound = {
        roundNumber: roundData.roundNumber || nextRoundNum,
        title: roundData.title || `Round ${nextRoundNum}: Managerial & System Design`,
        type: roundData.type || "Managerial Round",
        status: "ACTIVE",
        expiryDate: roundData.expiryDate || drive.expiryDate,
        passingThreshold: roundData.passingThreshold || 75,
        skillRubrics: roundData.skillRubrics || [],
        questionMode: roundData.questionMode || "PREBUILT",
        questionBankTitle: roundData.questionBankTitle,
        customQuestions: roundData.customQuestions || [],
        candidates: roundData.candidates || [],
    }

    drive.rounds.push(newRound)
    drive.currentRound = newRound.roundNumber
    if (drive.totalRounds < newRound.roundNumber) {
        drive.totalRounds = newRound.roundNumber
    }

    await drive.save()
    return drive
}

export const updateDriveStatus = async (tenantId, driveId, status) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const drive = await InterviewDrive.findOneAndUpdate(
        { _id: driveId, tenantId },
        { $set: { status } },
        { new: true }
    )
    if (!drive) throw new ApiError(404, "DRIVE_NOT_FOUND", "Interview drive not found.")
    return drive
}
