// Mirrors services/client-service/utils/personInput.js so the form can explain a problem before submitting.
// The server re-checks everything; this copy is for instant feedback only.
const URLISH = /(https?:|www\.|\.[a-z]{2,}\/|\.(com|net|org|io|in|co)\b)/i

export const validatePersonName = (raw) => {
  const name = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim()
  if (name.length < 2) return 'Enter your full name.'
  if (name.length > 100) return 'Name must be at most 100 characters.'
  if (URLISH.test(name)) return 'Name cannot contain a web address.'
  if (/[<>{}[\]\\/|^~`$%*=+;:@#&?!"_()\d]/.test(name)) return 'Name can contain only letters, spaces, apostrophes, hyphens and full stops.'
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(name) || /([ .'’-])\1/.test(name)) return 'Enter a valid name (letters, spaces, apostrophes, hyphens and full stops only).'
  if ((name.match(/\p{L}/gu) || []).length < 2) return 'Enter your full name.'
  return null
}

/** Returns an error message, or null when the number is acceptable. Empty is allowed (phone is optional). */
export const validatePhone = (raw) => {
  const text = String(raw ?? '').trim()
  if (!text) return null
  if (!/^\+?[\d\s\-().]+$/.test(text)) return 'Mobile number can contain only digits, spaces, + and -.'
  let digits = text.replace(/\D/g, '')
  if (text.startsWith('+') && !digits.startsWith('91')) {
    return digits.length >= 8 && digits.length <= 15 ? null : 'Enter the number with its country code (8 to 15 digits).'
  }
  if (text.startsWith('+') || (digits.length === 12 && digits.startsWith('91'))) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (!/^\d{10}$/.test(digits)) return 'Mobile number must contain exactly 10 digits.'
  if (/^(\d)\1{9}$/.test(digits)) return 'Enter a valid mobile number.'
  return null
}

export const validateExperience = (raw) => {
  const text = String(raw ?? '').trim()
  if (!text) return null
  if (!/^\d+(\.\d+)?(\s*(years?|yrs?))?$/i.test(text)) return 'Enter experience in years, e.g. 3 or 2.5.'
  const years = Number(text.match(/^\d+(?:\.\d+)?/)[0])
  return years > 0 && years <= 70 ? null : 'Experience must be greater than 0 and no more than 70 years.'
}
