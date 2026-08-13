import Organization from "../models/organization.model.js"

// Every signed-in user gets a personal workspace the first time they touch
// the Conduct-Interview area - no admin/superadmin setup required. A
// superadmin can still target another org explicitly via ?organizationId=.
export const resolveConductOrgId = async (req) => {
    if (req.user.role === "superadmin") {
        const requested = req.query.organizationId || req.body?.organizationId
        if (requested) return requested
    }

    if (req.user.organizationId) return req.user.organizationId

    const org = await Organization.create({
        name: `${req.user.name}'s Workspace`,
        createdBy: req.user._id,
    })
    req.user.organizationId = org._id
    await req.user.save()
    return org._id
}
