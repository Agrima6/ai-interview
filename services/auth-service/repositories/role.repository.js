import Role from "../models/role.model.js"

export const findByNames = (names) => Role.find({ name: { $in: names } })
export const upsertSystemRole = (name, permissions) =>
    Role.findOneAndUpdate({ name }, { name, permissions, system: true }, { upsert: true, new: true })
