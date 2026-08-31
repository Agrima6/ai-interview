import { TeamMember } from "../models/teamMember.model.js"
import { ApiError } from "../utils/response.js"

const DEFAULT_MEMBERS = [
    {
        name: "Abhinav Verma",
        email: "abc@gmail.com",
        role: "CLIENT_ADMIN",
        roleLabel: "Organization Admin",
        status: "ACTIVE",
        joinedDate: "2026-07-10",
        lastActive: "Just now",
    },
    {
        name: "Siddharth Rao",
        email: "siddharth.r@workmateiq.com",
        role: "RECRUITER",
        roleLabel: "Lead Recruiter",
        status: "ACTIVE",
        joinedDate: "2026-07-28",
        lastActive: "2 hours ago",
    },
]

export const listTeamMembers = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    let members = await TeamMember.find({ tenantId }).sort({ createdAt: -1 })
    if (members.length === 0) {
        // Seed default team records for newly registered client organization
        const seeded = await TeamMember.insertMany(
            DEFAULT_MEMBERS.map((m) => ({ ...m, tenantId }))
        )
        return seeded
    }
    return members
}

export const inviteTeamMember = async (tenantId, { name, email, role }) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")
    if (!email || !role) throw new ApiError(400, "MISSING_FIELDS", "Email and role are required.")

    const existing = await TeamMember.findOne({ tenantId, email: email.toLowerCase().trim() })
    if (existing) throw new ApiError(400, "MEMBER_EXISTS", "A team member with this email already exists.")

    const roleLabels = {
        CLIENT_ADMIN: "Organization Admin",
        RECRUITER: "Lead Recruiter",
        EVALUATOR: "Interview Evaluator",
        HIRING_MANAGER: "Hiring Manager",
    }

    const memberName = name || email.split("@")[0].replace(".", " ")

    const newMember = new TeamMember({
        tenantId,
        name: memberName,
        email: email.toLowerCase().trim(),
        role,
        roleLabel: roleLabels[role] || role,
        status: "PENDING",
        lastActive: "Invitation sent",
    })

    return await newMember.save()
}

export const removeTeamMember = async (tenantId, memberId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    const deleted = await TeamMember.findOneAndDelete({ _id: memberId, tenantId })
    if (!deleted) throw new ApiError(404, "MEMBER_NOT_FOUND", "Team member not found.")
    return { success: true, message: "Member access revoked successfully." }
}
