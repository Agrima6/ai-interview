// Filter option lists for the Drives page. Mirrors the values used by
// CreateDriveModal's step-1 selects (components/organization/
// CreateDriveModal.jsx) so a drive created there is always filterable here -
// duplicated rather than imported because CreateDriveModal is explicitly
// out of scope to modify, even for a pure refactor.
export const ROLE_CATEGORY_OPTIONS = [
  { value: 'SOFTWARE_ENGINEERING', label: 'Software Engineering (SDE / Fullstack)' },
  { value: 'DATA_SCIENCE', label: 'Data Science & Machine Learning' },
  { value: 'PRODUCT_DESIGN', label: 'Product & Design (UI/UX)' },
  { value: 'QUALITY_ASSURANCE', label: 'Quality Assurance & Testing' },
  { value: 'SALES_MARKETING', label: 'Sales & Business Development' },
  { value: 'FINANCE_OPERATIONS', label: 'Finance & Accounts' },
  { value: 'HR_OPERATIONS', label: 'Human Resources & Talent Acquisition' },
  { value: 'CAMPUS_PLACEMENT', label: 'Campus Placement / Graduate Trainee' },
]

export const DEPARTMENT_OPTIONS = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Core Tech', label: 'Core Tech' },
  { value: 'Product Management', label: 'Product Management' },
  { value: 'Quality Assurance', label: 'Quality Assurance' },
  { value: 'Human Resources', label: 'Human Resources' },
  { value: 'Finance & Accounts', label: 'Finance & Accounts' },
  { value: 'Sales & Business Dev', label: 'Sales & Business Dev' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Customer Success', label: 'Customer Success' },
]

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: '0-1 yr (Fresher)', label: '0-1 yr (Fresher / Graduate)' },
  { value: '1-3 yrs (Junior)', label: '1-3 yrs (Junior)' },
  { value: '3-5 yrs (Mid Level)', label: '3-5 yrs (Mid Level)' },
  { value: '5-8 yrs (Senior)', label: '5-8 yrs (Senior)' },
  { value: '8+ yrs (Lead/Manager)', label: '8+ yrs (Lead / Manager)' },
]
