import React, { useId, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { decimalOnly, digitsOnly, settlePhone, tidyPhone } from './oaRules'
import { inputClass } from './oaFormat'

const errorRing = '!border-[var(--color-danger)] focus:!border-[var(--color-danger)] focus:!ring-[var(--color-danger)]/15'

// Label, control, then either the error or the hint. The error is announced to screen readers and tied to the input.
export function Field({ label, hint, error, htmlFor, count, className = '', children }) {
    return (
        <div className={className}>
            <div className='flex items-baseline justify-between gap-2 mb-1.5'>
                <label htmlFor={htmlFor} className='block text-[13px] font-semibold text-ink'>{label}</label>
                {count}
            </div>
            {children}
            {error
                ? <p id={`${htmlFor}-error`} role='alert' className='oa-error-in flex items-start gap-1 text-[12px] text-[var(--color-danger)] mt-1.5'><AlertCircle size={13} className='mt-px shrink-0' />{error}</p>
                : hint ? <p id={`${htmlFor}-hint`} className='text-[12px] text-text-secondary mt-1.5'>{hint}</p> : null}
        </div>
    )
}

/** "37 / 140" counter that turns red as the limit is reached. */
export const Counter = ({ value, max }) => {
    const n = String(value ?? '').length
    return <span className={`text-[11.5px] tabular-nums ${n > max ? 'text-[var(--color-danger)] font-semibold' : n > max * 0.9 ? 'text-[var(--color-warning)]' : 'text-text-secondary'}`}>{n} / {max}</span>
}

/**
 * A number box that cannot hold letters, signs or a stray "e", and says what is wrong as you type once you have
 * touched it. `value` and `onChange` are strings; the parent decides what is valid and passes `error`.
 */
export function NumberField({ label, hint, error, value, onChange, max, decimals = false, suffix, width = '', disabled, forceError = false, className = '', ...rest }) {
    const id = useId()
    const [touched, setTouched] = useState(false)
    const shown = touched || forceError ? error : ''
    const digits = max !== undefined ? String(max).length + (decimals ? 3 : 0) : 6
    return (
        <Field label={label} hint={hint} error={shown} htmlFor={id} className={className}>
            <div className={`relative ${width}`}>
                <input id={id} inputMode={decimals ? 'decimal' : 'numeric'} autoComplete='off' disabled={disabled} value={value ?? ''} aria-invalid={Boolean(shown)} aria-describedby={shown ? `${id}-error` : hint ? `${id}-hint` : undefined}
                    onChange={(e) => onChange(decimals ? decimalOnly(e.target.value) : digitsOnly(e.target.value, digits))}
                    onBlur={() => setTouched(true)}
                    className={`${inputClass} ${suffix ? 'pr-16' : ''} ${shown ? errorRing : ''}`} {...rest} />
                {suffix && <span className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-text-secondary'>{suffix}</span>}
            </div>
        </Field>
    )
}

/** Exactly ten digits: other characters are dropped as they are typed, and a pasted "+91 98765 43210" is tidied up. */
export function PhoneField({ label = 'Mobile number', hint, error, value, onChange, forceError = false, className = '', ...rest }) {
    const id = useId()
    const [touched, setTouched] = useState(false)
    const shown = touched || forceError ? error : ''
    return (
        <Field label={label} hint={hint} error={shown} htmlFor={id} className={className}>
            <input id={id} type='tel' inputMode='numeric' autoComplete='tel-national' value={value ?? ''} placeholder='10-digit number' aria-invalid={Boolean(shown)} aria-describedby={shown ? `${id}-error` : hint ? `${id}-hint` : undefined}
                onChange={(e) => onChange(tidyPhone(e.target.value))} onBlur={() => { setTouched(true); onChange(settlePhone(value)) }}
                className={`${inputClass} tabular-nums ${shown ? errorRing : ''}`} {...rest} />
        </Field>
    )
}

/**
 * Text input or textarea with a live character counter and an error that shows once touched. `filter` (one of
 * FILTERS in oaRules) drops characters the field may not hold as they are typed or pasted.
 */
export function TextField({ label, hint, error, value, onChange, max, filter, textarea = false, rows = 3, forceError = false, className = '', ...rest }) {
    const id = useId()
    const [touched, setTouched] = useState(false)
    const shown = touched || forceError ? error : ''
    const Control = textarea ? 'textarea' : 'input'
    return (
        <Field label={label} hint={hint} error={shown} htmlFor={id} className={className} count={max ? <Counter value={value} max={max} /> : null}>
            <Control id={id} rows={textarea ? rows : undefined} value={value ?? ''} aria-invalid={Boolean(shown)} aria-describedby={shown ? `${id}-error` : hint ? `${id}-hint` : undefined}
                onChange={(e) => onChange(filter ? filter(e.target.value, max) : e.target.value)} onBlur={() => setTouched(true)} maxLength={max}
                className={`${inputClass} ${shown ? errorRing : ''}`} {...rest} />
        </Field>
    )
}
