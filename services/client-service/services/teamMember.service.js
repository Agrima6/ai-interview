import { TeamMember } from "../models/teamMember.model.js"
import { ApiError } from "../utils/response.js"
import { requireValidObjectId } from "../utils/validateId.js"

export const listTeamMembers = async (tenantId) => {
    if (!tenantId) throw new ApiError(403, "TENANT_REQUIRED", "Tenant context is missing.")

    // No auto-seeded fake members here (a previous version wrote
    // fabricated names/emails - "Abhinav Verma", "Siddharth Rao" - into
    // real tenants' team rosters, which is exactly the "fake data
    // masquerading as real" problem this audit exists to catch). A new
    // organization genuinely starts with zero invited team members.
    return TeamMember.find({ tenantId }).sort({ createdAt: -1 })
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
    requireValidObjectId(memberId, "MEMBER_NOT_FOUND", "Team member not found.")

    const deleted = await TeamMember.findOneAndDelete({ _id: memberId, tenantId })
    if (!deleted) throw new ApiError(404, "MEMBER_NOT_FOUND", "Team member not found.")
    return { success: true, message: "Member access revoked successfully." }
}
