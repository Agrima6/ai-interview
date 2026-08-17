import "dotenv/config"
import bcrypt from "bcryptjs"
import connectDb from "../config/connectDb.js"
import * as userRepo from "../repositories/user.repository.js"

// One-off utility: reset an existing seeded user's password.
// Usage: node scripts/setPassword.js <email> <newPassword>
const run = async () => {
    const [email, newPassword] = process.argv.slice(2)
    if (!email || !newPassword) {
        console.error("Usage: node scripts/setPassword.js <email> <newPassword>")
        process.exit(1)
    }

    await connectDb()
    const user = await userRepo.findByEmail(email)
    if (!user) {
        console.error(`No user found for ${email}`)
        process.exit(1)
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10)
    await user.save()
    console.log(`Password updated for ${email}`)
    process.exit(0)
}

run().catch((err) => { console.error(err); process.exit(1) })
