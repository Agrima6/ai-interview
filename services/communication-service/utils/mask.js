export const maskEmail = (email) => {
    const [user, domain] = email.split("@")
    if (!domain) return "***"
    const visible = user.slice(0, 2)
    return `${visible}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`
}

export const maskPhone = (phone) => {
    const digits = phone.replace(/\D/g, "")
    return `${"*".repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`
}
