import Registration from "../models/registration.model.js"

export const create = (data) => Registration.create(data)
export const updateStatus = (id, status) => Registration.findByIdAndUpdate(id, { status }, { new: true })
