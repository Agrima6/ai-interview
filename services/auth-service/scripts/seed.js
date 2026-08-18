import "dotenv/config"
import bcrypt from "bcryptjs"
import connectDb from "../config/connectDb.js"
import * as roleRepo from "../repositories/role.repository.js"
import * as userRepo from "../repositories/user.repository.js"

const run = async () => {
    await connectDb()

    await roleRepo.upsertSystemRole("SUPER_ADMIN", [
        "DASHBOARD_READ", "DASHBOARD_ACTIVITY_READ", "DASHBOARD_ANALYTICS_READ",
        "CLIENT_READ", "CLIENT_UPDATE", "CLIENT_APPROVE", "CLIENT_REJECT", "CLIENT_REQUEST_CHANGES",
        "FORM_READ", "FORM_WRITE", "FORM_PUBLISH",
        "ONBOARDING_READ", "ONBOARDING_REVIEW", "ONBOARDING_APPROVE", "ONBOARDING_REJECT",
        "ENQUIRY_READ", "ENQUIRY_UPDATE", "ENQUIRY_CALL",
        "COMMUNICATION_READ", "COMMUNICATION_RETRY",
        "AUDIT_READ", "USER_READ", "USER_UPDATE", "SETTINGS_WRITE",
    ])
    await roleRepo.upsertSystemRole("REVIEWER", [
        "DASHBOARD_READ", "DASHBOARD_ACTIVITY_READ",
        "ONBOARDING_READ", "ONBOARDING_REVIEW", "ONBOARDING_APPROVE", "ONBOARDING_REJECT",
        "CLIENT_READ",
    ])
    await roleRepo.upsertSystemRole("CLIENT_ADMIN", ["CLIENT_SELF_READ"])

    const email = process.argv[2] || "admin@workmateiq.local"
    const password = process.argv[3] || "Agrima123"

    const existing = await userRepo.findByEmail(email)
    if (existing) {
        console.log(`User ${email} already exists - skipping.`)
    } else {
        const passwordHash = await bcrypt.hash(password, 10)
        await userRepo.create({
            email,
            displayName: "Workmate Admin",
            passwordHash,
            roles: ["SUPER_ADMIN"],
        })
        console.log(`Seeded roles + admin user.\n  email: ${email}\n  password: ${password}`)
    }

    process.exit(0)
}

run().catch((err) => { console.error(err); process.exit(1) })
