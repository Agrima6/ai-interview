import Template from "../models/template.model.js"

export const findPublished = (channel, eventType) => Template.findOne({ channel, eventType, status: "PUBLISHED" }).sort({ version: -1 })
export const upsertPublished = (channel, eventType, data) =>
    Template.findOneAndUpdate({ channel, eventType }, { channel, eventType, status: "PUBLISHED", ...data }, { upsert: true, new: true })
