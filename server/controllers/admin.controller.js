import User from "../models/user.model.js"
import Organization from "../models/organization.model.js"
import Interview from "../models/interview.model.js"

// admin -> always their own org; superadmin -> whichever org they ask for via ?organizationId=
const resolveOrgId = (req) => {
    if (req.user.role === "admin") return req.user.organizationId
    return req.query.organizationId || null
}

export const addEmployee = async (req, res) => {
    try {
        const organizationId = resolveOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        let { name, email, department, assignedRole, assignedExperience, assignedMode, assignedContext } = req.body
        name = name?.trim()
        email = email?.trim().toLowerCase()
        if (!name || !email) return res.status(400).json({ message: "name and email are required" })

        const assignedFields = {
            department: department?.trim() || null,
            assignedRole: assignedRole?.trim() || null,
            assignedExperience: assignedExperience?.trim() || null,
            assignedMode: assignedMode?.trim() || null,
            assignedContext: assignedContext?.trim() || null,
        }

        const existing = await User.findOne({ email })
        if (existing) {
            if (existing.role === "superadmin") {
                return res.status(409).json({ message: "That email belongs to a Super Admin and can't be reused" })
            }
            if (existing.role === "admin" || (existing.organizationId && String(existing.organizationId) !== String(organizationId))) {
                return res.status(409).json({ message: "That email already belongs to a different organization or an admin account" })
            }
        }

        // Reuses the account if this email already exists as an org-less employee
        // (e.g. it signed up on its own) instead of blocking on a conflict.
        const employee = await User.findOneAndUpdate(
            { email },
            {
                $set: { role: "employee", organizationId, ...assignedFields },
                $setOnInsert: { name, email },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        return res.status(201).json(employee)
    } catch (error) {
        return res.status(500).json({ message: `failed to add employee ${error}` })
    }
}

export const listEmployees = async (req, res) => {
    try {
        const organizationId = resolveOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const employees = await User.find({ organizationId, role: "employee" })
            .select("name email credits active createdAt department assignedRole assignedExperience assignedMode assignedContext")
            .sort({ createdAt: -1 })

        const stats = await Interview.aggregate([
            { $match: { userId: { $in: employees.map((e) => e._id) } } },
            { $group: {
                _id: "$userId",
                interviewCount: { $sum: 1 },
                avgScore: { $avg: "$finalScore" },
                lastActive: { $max: "$createdAt" },
            } },
        ])
        const statsMap = new Map(stats.map((s) => [String(s._id), s]))

        const result = employees.map((e) => {
            const s = statsMap.get(String(e._id))
            return {
                _id: e._id,
                name: e.name,
                email: e.email,
                credits: e.credits,
                active: e.active,
                createdAt: e.createdAt,
                department: e.department,
                assignedRole: e.assignedRole,
                assignedExperience: e.assignedExperience,
                assignedMode: e.assignedMode,
                assignedContext: e.assignedContext,
                interviewCount: s?.interviewCount || 0,
                avgScore: s ? Number((s.avgScore || 0).toFixed(1)) : 0,
                lastActive: s?.lastActive || null,
            }
        })
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ message: `failed to list employees ${error}` })
    }
}

export const getEmployeeInterviews = async (req, res) => {
    try {
        const organizationId = resolveOrgId(req)
        const employee = await User.findOne({ _id: req.params.id, organizationId, role: "employee" })
        if (!employee) return res.status(404).json({ message: "Employee not found" })

        const interviews = await Interview.find({ userId: employee._id })
            .sort({ createdAt: -1 })
            .select("role experience mode finalScore status createdAt")

        return res.json({ employee: { name: employee.name, email: employee.email }, interviews })
    } catch (error) {
        return res.status(500).json({ message: `failed to get employee interviews ${error}` })
    }
}

export const updateEmployee = async (req, res) => {
    try {
        const organizationId = resolveOrgId(req)
        const { credits, active, department, assignedRole, assignedExperience, assignedMode, assignedContext } = req.body
        const update = {}
        if (typeof credits === "number") update.credits = credits
        if (typeof active === "boolean") update.active = active
        if (department !== undefined) update.department = department?.trim() || null
        if (assignedRole !== undefined) update.assignedRole = assignedRole?.trim() || null
        if (assignedExperience !== undefined) update.assignedExperience = assignedExperience?.trim() || null
        if (assignedMode !== undefined) update.assignedMode = assignedMode?.trim() || null
        if (assignedContext !== undefined) update.assignedContext = assignedContext?.trim() || null

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "Nothing to update" })
        }

        const employee = await User.findOneAndUpdate(
            { _id: req.params.id, organizationId, role: "employee" },
            update,
            { new: true }
        )
        if (!employee) return res.status(404).json({ message: "Employee not found" })
        return res.json(employee)
    } catch (error) {
        return res.status(500).json({ message: `failed to update employee ${error}` })
    }
}

export const getTrends = async (req, res) => {
    try {
        const organizationId = resolveOrgId(req)
        if (!organizationId) return res.status(400).json({ message: "organizationId is required" })

        const employees = await User.find({ organizationId, role: "employee" }).select("_id")
        const employeeIds = employees.map((e) => e._id)

        const totals = await Interview.aggregate([
            { $match: { userId: { $in: employeeIds } } },
            { $group: {
                _id: null,
                totalInterviews: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                avgScore: { $avg: "$finalScore" },
            } },
        ])

        const weekly = await Interview.aggregate([
            { $match: { userId: { $in: employeeIds }, status: "completed" } },
            { $group: {
                _id: { $dateTrunc: { date: "$createdAt", unit: "week" } },
                avgScore: { $avg: "$finalScore" },
                count: { $sum: 1 },
            } },
            { $sort: { _id: 1 } },
            { $limit: 12 },
        ])

        const skillAverages = await Interview.aggregate([
            { $match: { userId: { $in: employeeIds } } },
            { $unwind: "$questions" },
            { $group: {
                _id: null,
                avgConfidence: { $avg: "$questions.confidence" },
                avgCommunication: { $avg: "$questions.communication" },
                avgCorrectness: { $avg: "$questions.correctness" },
            } },
        ])

        const departmentBreakdown = await Interview.aggregate([
            { $match: { userId: { $in: employeeIds } } },
            { $group: {
                _id: { $ifNull: ["$department", "Unassigned"] },
                count: { $sum: 1 },
                avgScore: { $avg: "$finalScore" },
            } },
            { $sort: { count: -1 } },
        ])

        return res.json({
            employeeCount: employeeIds.length,
            totalInterviews: totals[0]?.totalInterviews || 0,
            completedInterviews: totals[0]?.completed || 0,
            avgScore: totals[0] ? Number((totals[0].avgScore || 0).toFixed(1)) : 0,
            skillAverages: skillAverages[0] ? {
                confidence: Number((skillAverages[0].avgConfidence || 0).toFixed(1)),
                communication: Number((skillAverages[0].avgCommunication || 0).toFixed(1)),
                correctness: Number((skillAverages[0].avgCorrectness || 0).toFixed(1)),
            } : { confidence: 0, communication: 0, correctness: 0 },
            weeklyTrend: weekly.map((w) => ({
                week: w._id,
                avgScore: Number((w.avgScore || 0).toFixed(1)),
                count: w.count,
            })),
            departmentBreakdown: departmentBreakdown.map((d) => ({
                department: d._id,
                count: d.count,
                avgScore: Number((d.avgScore || 0).toFixed(1)),
            })),
        })
    } catch (error) {
        return res.status(500).json({ message: `failed to get trends ${error}` })
    }
}

export const createOrganization = async (req, res) => {
    try {
        let { orgName, adminName, adminEmail } = req.body
        orgName = orgName?.trim()
        adminName = adminName?.trim()
        adminEmail = adminEmail?.trim().toLowerCase()
        if (!orgName || !adminName || !adminEmail) {
            return res.status(400).json({ message: "orgName, adminName and adminEmail are required" })
        }

        const existing = await User.findOne({ email: adminEmail })
        if (existing?.role === "superadmin") {
            return res.status(409).json({ message: "That email belongs to a Super Admin and can't be reused" })
        }

        const org = await Organization.create({ name: orgName, createdBy: req.user._id })
        // Reuses the account if this email already exists (e.g. it was an employee
        // somewhere, or signed up on its own) instead of blocking on a conflict —
        // promotes it to admin of this org, keeping its existing name/credits/history.
        const admin = await User.findOneAndUpdate(
            { email: adminEmail },
            {
                $set: { role: "admin", organizationId: org._id },
                $setOnInsert: { name: adminName, email: adminEmail },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )

        return res.status(201).json({ organization: org, admin, reusedExisting: !!existing })
    } catch (error) {
        return res.status(500).json({ message: `failed to create organization ${error}` })
    }
}

export const deleteOrganization = async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id)
        if (!org) return res.status(404).json({ message: "Organization not found" })

        // Demote its admin/employees back to plain, org-less employees instead of
        // deleting their accounts — preserves credits and interview history so they
        // can be reassigned to a different org later if needed.
        await User.updateMany(
            { organizationId: org._id },
            { $set: { organizationId: null, role: "employee" } }
        )
        await Organization.findByIdAndDelete(org._id)

        return res.json({ message: "Organization deleted" })
    } catch (error) {
        return res.status(500).json({ message: `failed to delete organization ${error}` })
    }
}

export const listOrganizations = async (req, res) => {
    try {
        const orgs = await Organization.find().sort({ createdAt: -1 })
        const orgIds = orgs.map((o) => o._id)

        const admins = await User.find({ role: "admin", organizationId: { $in: orgIds } }).select("name email organizationId")
        const adminByOrg = new Map(admins.map((a) => [String(a.organizationId), a]))

        const employeeCounts = await User.aggregate([
            { $match: { role: "employee", organizationId: { $in: orgIds } } },
            { $group: { _id: "$organizationId", count: { $sum: 1 }, ids: { $push: "$_id" } } },
        ])
        const employeeCountMap = new Map(employeeCounts.map((e) => [String(e._id), e.count]))
        const allEmployeeIds = employeeCounts.flatMap((e) => e.ids)

        const interviewStats = await Interview.aggregate([
            { $match: { userId: { $in: allEmployeeIds } } },
            { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            { $group: {
                _id: "$user.organizationId",
                interviewCount: { $sum: 1 },
                avgScore: { $avg: "$finalScore" },
            } },
        ])
        const interviewStatsMap = new Map(interviewStats.map((s) => [String(s._id), s]))

        const result = orgs.map((org) => {
            const admin = adminByOrg.get(String(org._id))
            const stats = interviewStatsMap.get(String(org._id))
            return {
                _id: org._id,
                name: org.name,
                createdAt: org.createdAt,
                admin: admin ? { name: admin.name, email: admin.email } : null,
                employeeCount: employeeCountMap.get(String(org._id)) || 0,
                interviewCount: stats?.interviewCount || 0,
                avgScore: stats ? Number((stats.avgScore || 0).toFixed(1)) : 0,
            }
        })
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ message: `failed to list organizations ${error}` })
    }
}
