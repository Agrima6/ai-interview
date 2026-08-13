// Shared helpers for the "years of experience" fields (Step1SetUp's own
// experience input, and AdminPanel's assignedExperience). Both used to be
// unconstrained free-text inputs, so someone could type letters, emoji,
// anything - these keep the underlying value numeric while still storing/
// displaying a friendly string like "3 years" or "Fresher" (0 years).
export const MAX_YEARS = 50

// Pulls a leading integer out of a stored string like "3 years" (or a
// resume-extraction result like "2+ years of experience") so an <input
// type="number"> can be pre-filled from it. Returns "" if nothing usable found.
export const parseYears = (str) => {
    const match = String(str || "").match(/\d+/)
    if (!match) return ""
    return String(Math.max(0, Math.min(MAX_YEARS, parseInt(match[0], 10))))
}

// Clamps raw <input type="number"> text to an integer in [0, MAX_YEARS].
// Returns "" for empty/invalid input rather than throwing, so it's safe to
// call directly from an onChange handler.
export const clampYears = (raw) => {
    if (raw === "" || raw === null || raw === undefined) return ""
    const n = Math.floor(Number(raw))
    if (Number.isNaN(n)) return ""
    return String(Math.max(0, Math.min(MAX_YEARS, n)))
}

// Formats a clamped numeric-years string into the human-readable form sent
// to the AI/stored on the record.
export const formatYears = (years) => {
    if (years === "" || years === null || years === undefined) return ""
    const n = Number(years)
    if (n === 0) return "Fresher (0 years)"
    return `${n} year${n === 1 ? "" : "s"}`
}
