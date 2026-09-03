import React from 'react'
import { Select } from '../ui'

/**
 * Shared "Registration Type" dropdown - one implementation reused by every
 * page that needs to filter by registration type (Dashboard, Clients, ...)
 * instead of each page re-declaring its own option list.
 *
 * `options` is the actual list of {key,label} the caller has for its
 * domain (e.g. the 3 registration types from GET /api/v1/registration-types
 * for the Dashboard, vs. the Client model's 2-value type enum for the
 * Clients page) - these are NOT the same set, so this component never
 * hard-codes them itself.
 */
function RegistrationTypeFilter({ value, onChange, options, allLabel = 'All Registrations', className = '', wrapperClassName = '' }) {
    return (
        <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            wrapperClassName={wrapperClassName}
            className={className}
            aria-label='Registration type'
        >
            <option value=''>{allLabel}</option>
            {options.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
        </Select>
    )
}

export default RegistrationTypeFilter
