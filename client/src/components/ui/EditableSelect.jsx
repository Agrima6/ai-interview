import React, { forwardRef, useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { fieldBase, Field } from './Input'

// EditableSelect: a styled <select> that doubles as a free-text input.
// When the user picks "__custom__" we swap to a text input on the same line
// so they can type any string the dropdown didn't cover (per product spec:
// role / department / interview type / round type all allow ad-hoc values).
const EditableSelect = forwardRef(function EditableSelect(
  { label, error, hint, id, className = '', wrapperClassName = '', options, value, onChange, customOptionLabel = '+ Add custom…', placeholder = 'Type your own…' },
  ref
) {
  const isCustom = value && !options.some((opt) => (opt.value ?? opt) === value)
  const [editingCustom, setEditingCustom] = useState(isCustom)
  const inputRef = useRef(null)

  useEffect(() => {
    // Re-sync editing mode when value changes from outside (e.g. a reset)
    const nowIsCustom = value && !options.some((opt) => (opt.value ?? opt) === value)
    setEditingCustom(Boolean(nowIsCustom))
  }, [value, options])

  useEffect(() => {
    if (editingCustom) {
      inputRef.current?.focus()
    }
  }, [editingCustom])

  const handleSelectChange = (e) => {
    const v = e.target.value
    if (v === '__custom__') {
      setEditingCustom(true)
      onChange?.({ target: { value: '' } })
    } else {
      setEditingCustom(false)
      onChange?.(e)
    }
  }

  const handleInputChange = (e) => {
    onChange?.(e)
  }

  const handleClear = () => {
    setEditingCustom(false)
    onChange?.({ target: { value: '' } })
  }

  return (
    <Field label={label} error={error} hint={hint} id={id} className={wrapperClassName}>
      <div className='relative'>
        {editingCustom ? (
          <>
            <input
              ref={inputRef}
              id={id}
              type='text'
              value={value || ''}
              onChange={handleInputChange}
              placeholder={placeholder}
              className={`${fieldBase} pr-9 ${error ? '!border-red-500/60 focus:!ring-red-500/15' : ''} ${className}`}
            />
            <button
              type='button'
              onClick={handleClear}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-ink p-0.5'
              title='Pick from list'
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <select
              ref={ref}
              id={id}
              value={value || ''}
              onChange={handleSelectChange}
              className={`${fieldBase} appearance-none pr-10 ${error ? '!border-red-500/60 focus:!ring-red-500/15' : ''} ${className}`}
            >
              <option value='' disabled>
                {placeholder}
              </option>
              {options.map((opt) => {
                const v = opt.value ?? opt
                return (
                  <option key={v} value={v} className='bg-card text-ink'>
                    {opt.label ?? opt}
                  </option>
                )
              })}
              <option value='__custom__' className='bg-accent/10 text-accent font-semibold'>
                {customOptionLabel}
              </option>
            </select>
            <ChevronDown size={15} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none' />
          </>
        )}
      </div>
    </Field>
  )
})

export default EditableSelect
