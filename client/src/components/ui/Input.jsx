import React, { forwardRef } from 'react'

const fieldBase = 'w-full bg-card border border-line rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-text-secondary/70 outline-none transition-all focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:opacity-50 disabled:cursor-not-allowed'

function Field({ label, error, hint, id, className = '', children }) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className='block text-[13.5px] font-semibold text-ink mb-2'>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className='text-[12px] text-red-500 mt-2'>{error}</p>
      ) : hint ? (
        <p className='text-[12px] text-text-secondary mt-2'>{hint}</p>
      ) : null}
    </div>
  )
}

const Input = forwardRef(function Input(
  { label, error, hint, id, icon: Icon, className = '', wrapperClassName = '', ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} id={id} className={wrapperClassName}>
      <div className='relative'>
        {Icon && <Icon size={16} className='absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />}
        <input
          ref={ref}
          id={id}
          className={`${fieldBase} ${Icon ? 'pl-12' : ''} ${error ? '!border-red-500/60 focus:!ring-red-500/15' : ''} ${className}`}
          {...props}
        />
      </div>
    </Field>
  )
})

export { fieldBase, Field }
export default Input
