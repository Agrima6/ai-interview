import React, { forwardRef } from 'react'
import { fieldBase, Field } from './Input'

const Textarea = forwardRef(function Textarea(
  { label, error, hint, id, className = '', wrapperClassName = '', rows = 4, ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} id={id} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`${fieldBase} resize-y ${error ? '!border-red-500/60 focus:!ring-red-500/15' : ''} ${className}`}
        {...props}
      />
    </Field>
  )
})

export default Textarea
