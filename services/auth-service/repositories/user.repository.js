import User from "../models/user.model.js"

const normalize = (email) => email.trim().toLowerCase()

export const findByEmail = (email) => User.findOne({ emailNormalized: normalize(email) })
export const findById = (id) => User.findById(id)
export const create = (data) => User.create({ ...data, emailNormalized: normalize(data.email) })
export const touchLastLogin = (id) => User.findByIdAndUpdate(id, { lastLoginAt: new Date() })
