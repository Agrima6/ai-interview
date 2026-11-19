import React, { useMemo } from 'react'
import { EditableSelect } from '../ui'
import { DEPARTMENT_OPTIONS, EXPERIENCE_LEVEL_OPTIONS, ROLE_CATEGORY_OPTIONS } from '../../constants/driveOptions'
import { rolesForDepartment, roleFitsDepartment } from '../../constants/departmentRoles'

/**
 * The details of a hiring drive that every round shares: department, position and experience. Filled once here; the
 * AI interview's Create Interview form starts from them instead of asking again. Same lists and the same
 * department-then-role order as that form.
 */
export default function DriveDetailsFields({ value, onChange }) {
    const roles = useMemo(() => rolesForDepartment(value.department, ROLE_CATEGORY_OPTIONS, value.roleCategory), [value.department, value.roleCategory])
    const set = (patch) => onChange({ ...value, ...patch })
    return (
        <div className='grid sm:grid-cols-3 gap-3'>
            <EditableSelect label='Department' placeholder='Select or add' options={DEPARTMENT_OPTIONS} value={value.department}
                onChange={(e) => { const department = e.target.value; set({ department, roleCategory: roleFitsDepartment(department, value.roleCategory, ROLE_CATEGORY_OPTIONS) ? value.roleCategory : '' }) }} />
            <EditableSelect label='Position / role' placeholder='Select or add' hint={value.department ? undefined : 'Choose a department first.'} options={roles} value={value.roleCategory} onChange={(e) => set({ roleCategory: e.target.value })} />
            <EditableSelect label='Experience' placeholder='Select or add' options={EXPERIENCE_LEVEL_OPTIONS} value={value.experienceLevel} onChange={(e) => set({ experienceLevel: e.target.value })} />
        </div>
    )
}
