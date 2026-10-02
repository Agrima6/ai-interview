import mongoose from "mongoose"

const TeamMemberSchema = new mongoose.Schema(
    {
        tenantId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: {
            type: String,
            enum: ["CLIENT_ADMIN", "RECRUITER", "EVALUATOR", "HIRING_MANAGER"],
            default: "RECRUITER",
        },
        roleLabel: { type: String },
        status: { type: String, enum: ["ACTIVE", "PENDING", "REVOKED"], default: "PENDING" },
        joinedDate: { type: Date, default: Date.now },
        lastActive: { type: String, default: "Invitation sent" },
    },
    { timestamps: true }
)

TeamMemberSchema.index({ tenantId: 1, email: 1 }, { unique: true })

export const TeamMember = mongoose.model("TeamMember", TeamMemberSchema)
