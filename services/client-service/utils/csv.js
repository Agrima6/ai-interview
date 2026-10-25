// Cells that start with = + @ (or - followed by a non-digit) or a tab/CR are executed as formulas when the file is
// opened in Excel/Sheets. Names and roll numbers are typed by people, so prefix such cells with an apostrophe.
export const csvEscape = (value) => {
    let str = String(value ?? "")
    if (/^[=+@\t\r]/.test(str) || /^-(?!\d)/.test(str)) str = `'${str}`
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}
