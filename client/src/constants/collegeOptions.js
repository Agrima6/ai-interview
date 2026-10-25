// Choices on the college "Create exam" form. The topic list reuses the shared drive options (driveOptions.js) so an
// exam drive is filterable and reportable exactly like any other drive.
export { ROLE_CATEGORY_OPTIONS as EXAM_TOPIC_OPTIONS } from './driveOptions'

export const BRANCH_OPTIONS = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'MBA / Management',
    'BBA / Commerce',
    'Other / Multiple branches',
].map((value) => ({ value, label: value }))

export const EXAM_TYPE_OPTIONS = [
    { value: 'Technical', label: 'Technical interview' },
    { value: 'HR', label: 'HR interview' },
    { value: 'Behavioral', label: 'Behavioural interview' },
]

export const PROCTORING_OPTIONS = [
    { value: 'VOICE', label: 'Voice only (microphone)' },
    { value: 'VIDEO', label: 'Voice + camera' },
    { value: 'SCREEN', label: 'Voice + camera + screen share (strictest)' },
]

export const DEFAULT_EXAM_RUBRIC = [
    { id: 1, name: 'Domain Knowledge & Technical Competency', weight: 35 },
    { id: 2, name: 'Problem Solving & Analytical Thinking', weight: 25 },
    { id: 3, name: 'Communication & Soft Skills', weight: 25 },
    { id: 4, name: 'Confidence & Clarity', weight: 15 },
]
