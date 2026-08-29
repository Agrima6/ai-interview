export const maskEmail = (email) => {
    if (!email) return "***"
    const [user, domain] = email.split("@")
    if (!domain) return "***"
    const visible = user.slice(0, 2)
    return `${visible}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`
}

export const maskPhone = (phone) => {
    if (!phone) return "***"
    const digits = phone.replace(/\D/g, "")
    return `${"*".repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`
}
