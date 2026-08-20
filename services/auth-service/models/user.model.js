import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, trim: true },
    emailNormalized: { type: String, required: true, unique: true, index: true },
    // match/required run against `null` too via ToString coercion, so a plain
    // `match` here would reject the legitimate "no phone on file" default -
    // validate only fires the regex check when a phone was actually given.
    phone: {
        type: String,
        default: null,
        trim: true,
        validate: {
            validator: (v) => v == null || /^[0-9+()\-\s]{7,20}$/.test(v),
            message: "Invalid phone number",
        },
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    roles: [{ type: String }],
    permissionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
}, { timestamps: true })

userSchema.index({ tenantId: 1, status: 1 })

export default mongoose.model("User", userSchema)
