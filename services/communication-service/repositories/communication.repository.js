import Communication from "../models/communication.model.js"

export const create = (data) => Communication.create(data)
export const findById = (id) => Communication.findById(id)
export const updateStatus = (id, patch) => Communication.findByIdAndUpdate(id, patch, { new: true })
export const listByEntity = (entityType, entityId) =>
    Communication.find({ entityType, entityId }).sort({ createdAt: -1 })
