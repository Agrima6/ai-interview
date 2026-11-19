import { BLUE_COLLAR_ROLES } from './blueCollarRoles'
import { PROFESSIONAL_ROLES } from './professionalRoles'

// Which positions belong to which department, so the drive form offers only the roles that fit the department chosen
// first. A department that is not listed here (one an organizer typed in) is offered every role.
const group = (list, prefix) => list.filter((r) => r.value.startsWith(prefix)).map((r) => r.value)
const CA = group(PROFESSIONAL_ROLES, 'CA_')
const LEGAL = group(PROFESSIONAL_ROLES, 'LEGAL_')
const BLUE = ['BLUE_COLLAR', ...BLUE_COLLAR_ROLES.map((r) => r.value)]

export const DEPARTMENT_ROLES = {
  'Engineering': ['SOFTWARE_ENGINEERING', 'DATA_SCIENCE', 'CAMPUS_PLACEMENT'],
  'Core Tech': ['SOFTWARE_ENGINEERING', 'DATA_SCIENCE', 'CAMPUS_PLACEMENT'],
  'Product Management': ['PRODUCT_DESIGN'],
  'Quality Assurance': ['QUALITY_ASSURANCE'],
  'Human Resources': ['HR_OPERATIONS', 'CAMPUS_PLACEMENT'],
  'Finance & Accounts': ['FINANCE_OPERATIONS', ...CA],
  'Legal': LEGAL,
  'Sales & Business Dev': ['SALES_MARKETING'],
  'Marketing': ['SALES_MARKETING'],
  'Customer Success': ['SALES_MARKETING'],
  'Operations': ['FINANCE_OPERATIONS', ...BLUE],
}

/** The roles for a department; every role when the department is custom, none until one is chosen. */
export const rolesForDepartment = (department, allRoles, currentRole = '') => {
  if (!department) return []
  const allowed = DEPARTMENT_ROLES[department]
  if (!allowed) return allRoles
  const list = allRoles.filter((r) => allowed.includes(r.value))
  // An existing drive keeps its saved role visible even if it is outside the usual list for its department.
  const kept = currentRole && !list.some((r) => r.value === currentRole) ? allRoles.find((r) => r.value === currentRole) : null
  return kept ? [...list, kept] : list
}

export const roleFitsDepartment = (department, role, allRoles) => !role || rolesForDepartment(department, allRoles).some((r) => r.value === role)
