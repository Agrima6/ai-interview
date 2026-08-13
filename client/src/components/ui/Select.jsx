import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { fieldBase, Field } from './Input'

// Plain native <select> styled to match the design system - keeps full
// accessibility/keyboard support for free. For a custom combobox see
// RoleCombobox.jsx which already exists in components/.
const Select = forwardRef(function Select(
  { label, error, hint, id, className = '', wrapperClassName = '', children, ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} id={id} className={wrapperClassName}>
      <div className='relative'>
        <select
          ref={ref}
          id={id}
          className={`${fieldBase} appearance-none pr-10 ${error ? '!border-red-500/60 focus:!ring-red-500/15' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={15} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />
      </div>
    </Field>
  )
})

export default Select
