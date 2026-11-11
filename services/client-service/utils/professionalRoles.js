// Chartered Accountant and legal job profiles HR can pick when creating a drive. A drive's roleCategory is one of these
// "CA_<ROLE>" / "LEGAL_<ROLE>" values. Each has a built-in question set (professionalBanks.js) that is offered first for it.
// The client keeps the same list in client/src/constants/professionalRoles.js (a test keeps the two in step).
const CA_ROLES = [
    ["ARTICLE_ASSISTANT", "Articled Assistant / CA Intern"],
    ["AUDIT", "Statutory & Internal Auditor"],
    ["TAXATION", "Direct & Indirect Tax (Income Tax / GST)"],
    ["FINANCIAL_REPORTING", "Financial Reporting & Controller"],
    ["CORPORATE_FINANCE", "Corporate Finance / FP&A"],
    ["FORENSIC_RISK", "Forensic, Risk & Compliance"],
]

const LEGAL_ROLES = [
    ["CORPORATE", "Corporate & Commercial Lawyer"],
    ["LITIGATION", "Litigation Lawyer / Advocate"],
    ["CRIMINAL", "Criminal Lawyer"],
    ["IP", "Intellectual Property (IP) Lawyer"],
    ["LABOUR_EMPLOYMENT", "Labour & Employment Lawyer"],
    ["TAX", "Tax Lawyer"],
    ["REAL_ESTATE", "Property & Real Estate Lawyer"],
    ["FAMILY", "Family & Matrimonial Lawyer"],
    ["CYBER_PRIVACY", "Cyber, Technology & Data Privacy Lawyer"],
    ["BANKING_FINANCE", "Banking, Finance & Insolvency Lawyer"],
    ["ARBITRATION", "Arbitration & Dispute Resolution Lawyer"],
    ["IN_HOUSE_COUNSEL", "In-house Counsel / Legal Manager"],
    ["COMPLIANCE", "Compliance Officer"],
    ["COMPANY_SECRETARY", "Company Secretary"],
    ["PARALEGAL", "Paralegal / Legal Associate"],
]

export const PROFESSIONAL_ROLES = [
    ...CA_ROLES.map(([key, label]) => ({ value: `CA_${key}`, label: `Chartered Accountant - ${label}` })),
    ...LEGAL_ROLES.map(([key, label]) => ({ value: `LEGAL_${key}`, label: `Legal - ${label}` })),
]

export const isProfessionalRole = (roleCategory) => PROFESSIONAL_ROLES.some((role) => role.value === roleCategory)
