// Chartered Accountant and legal job profiles for the drive form's "Position / role" list. Mirrors
// services/client-service/utils/professionalRoles.js; a test keeps both lists identical.
export const PROFESSIONAL_ROLES = [
  { value: 'CA_ARTICLE_ASSISTANT', label: 'Chartered Accountant - Articled Assistant / CA Intern' },
  { value: 'CA_AUDIT', label: 'Chartered Accountant - Statutory & Internal Auditor' },
  { value: 'CA_TAXATION', label: 'Chartered Accountant - Direct & Indirect Tax (Income Tax / GST)' },
  { value: 'CA_FINANCIAL_REPORTING', label: 'Chartered Accountant - Financial Reporting & Controller' },
  { value: 'CA_CORPORATE_FINANCE', label: 'Chartered Accountant - Corporate Finance / FP&A' },
  { value: 'CA_FORENSIC_RISK', label: 'Chartered Accountant - Forensic, Risk & Compliance' },
  { value: 'LEGAL_CORPORATE', label: 'Legal - Corporate & Commercial Lawyer' },
  { value: 'LEGAL_LITIGATION', label: 'Legal - Litigation Lawyer / Advocate' },
  { value: 'LEGAL_CRIMINAL', label: 'Legal - Criminal Lawyer' },
  { value: 'LEGAL_IP', label: 'Legal - Intellectual Property (IP) Lawyer' },
  { value: 'LEGAL_LABOUR_EMPLOYMENT', label: 'Legal - Labour & Employment Lawyer' },
  { value: 'LEGAL_TAX', label: 'Legal - Tax Lawyer' },
  { value: 'LEGAL_REAL_ESTATE', label: 'Legal - Property & Real Estate Lawyer' },
  { value: 'LEGAL_FAMILY', label: 'Legal - Family & Matrimonial Lawyer' },
  { value: 'LEGAL_CYBER_PRIVACY', label: 'Legal - Cyber, Technology & Data Privacy Lawyer' },
  { value: 'LEGAL_BANKING_FINANCE', label: 'Legal - Banking, Finance & Insolvency Lawyer' },
  { value: 'LEGAL_ARBITRATION', label: 'Legal - Arbitration & Dispute Resolution Lawyer' },
  { value: 'LEGAL_IN_HOUSE_COUNSEL', label: 'Legal - In-house Counsel / Legal Manager' },
  { value: 'LEGAL_COMPLIANCE', label: 'Legal - Compliance Officer' },
  { value: 'LEGAL_COMPANY_SECRETARY', label: 'Legal - Company Secretary' },
  { value: 'LEGAL_PARALEGAL', label: 'Legal - Paralegal / Legal Associate' },
]

export const isProfessionalCategory = (roleCategory) => PROFESSIONAL_ROLES.some((role) => role.value === roleCategory)

// Categories of the built-in question sets written for these roles.
export const PROFESSIONAL_BANK_CATEGORIES = ['CHARTERED_ACCOUNTANT', 'LEGAL']
