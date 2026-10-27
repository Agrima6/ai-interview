// Server-side rules for a person's name and phone number. The frontend mirrors them for instant feedback
// (client/src/utils/personInput.js) but this is the authority: every entry point (public apply form, recruiter
// roster, CSV import) goes through normalizeCandidate, which calls these.

const NAME_MIN = 2
const NAME_MAX = 100

// Letters of any script (Devanagari, Tamil, Latin with accents, CJK ...), combining marks, and the punctuation real
// names use: space, apostrophe, hyphen, full stop. Digits, "@", "/", ":", "<", ">", "_" etc. are not names.
const NAME_CHARS = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u
const REPEATED_PUNCTUATION = /([ .'’-])\1/
const URLISH = /(https?:|www\.|\.[a-z]{2,}\/|\.(com|net|org|io|in|co)\b)/i

export const validatePersonName = (raw) => {
    const name = String(raw ?? "").normalize("NFC").replace(/\s+/g, " ").trim()
    if (name.length < NAME_MIN) return { ok: false, message: "Enter your full name." }
    if (name.length > NAME_MAX) return { ok: false, message: `Name must be at most ${NAME_MAX} characters.` }
    if (URLISH.test(name)) return { ok: false, message: "Name cannot contain a web address." }
    if (/[<>{}[\]\\/|^~`$%*=+;:@#&?!"_()\d]/.test(name)) return { ok: false, message: "Name can contain only letters, spaces, apostrophes, hyphens and full stops." }
    if (!NAME_CHARS.test(name) || REPEATED_PUNCTUATION.test(name)) return { ok: false, message: "Enter a valid name (letters, spaces, apostrophes, hyphens and full stops only)." }
    if ((name.match(/\p{L}/gu) || []).length < NAME_MIN) return { ok: false, message: "Enter your full name." }
    return { ok: true, value: name }
}

/**
 * Accepts what people actually type for an Indian mobile (+91 98765 43210, 098765-43210, 9876543210) and stores the
 * bare 10 digits. An explicit international number (+<country code> ...) is accepted in E.164 length (8-15 digits)
 * and stored as "+<digits>". Letters, URLs and any other characters are rejected.
 */
export const normalizePhone = (raw) => {
    const text = String(raw ?? "").trim()
    if (!text) return { ok: true, value: "" }
    if (!/^\+?[\d\s\-().]+$/.test(text)) return { ok: false, message: "Mobile number can contain only digits, spaces, + and -." }
    const international = text.startsWith("+")
    let digits = text.replace(/\D/g, "")
    if (international && !digits.startsWith("91")) {
        return digits.length >= 8 && digits.length <= 15
            ? { ok: true, value: `+${digits}` }
            : { ok: false, message: "Enter the number with its country code (8 to 15 digits)." }
    }
    if (international || (digits.length === 12 && digits.startsWith("91"))) digits = digits.slice(2)
    else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
    if (!/^\d{10}$/.test(digits)) return { ok: false, message: "Mobile number must contain exactly 10 digits." }
    if (/^(\d)\1{9}$/.test(digits)) return { ok: false, message: "Enter a valid mobile number." }
    return { ok: true, value: digits }
}
