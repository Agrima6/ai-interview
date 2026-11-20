import React, { useState } from 'react'
import { Button } from '../../components/ui'
import { decimalOnly } from '../../components/oa/oaRules'
import { inr } from './billingFormat'

const inputClass = 'w-full bg-card border-[1.5px] border-line rounded-xl px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 tabular-nums'
const text = (v) => (v === null || v === undefined ? '' : String(v))

/**
 * Rates for one client (or the platform default). A box left empty means "use the default", and the placeholder says what
 * that is. `values` are this card's own settings; `defaults` are what an empty box falls back to.
 */
export default function RateForm({ values, defaults, isDefault = false, saving, onSave, error }) {
    const [f, setF] = useState({ aiRate: text(values.aiRate), oaRate: text(values.oaRate), comboRate: text(values.comboRate), gstPercent: text(values.gstPercent), unit: values.unit || '', notes: values.notes || '' })
    const set = (key, filter) => (e) => setF((s) => ({ ...s, [key]: filter ? filter(e.target.value) : e.target.value }))
    const changed = f.aiRate !== text(values.aiRate) || f.oaRate !== text(values.oaRate) || f.comboRate !== text(values.comboRate) || f.gstPercent !== text(values.gstPercent) || f.unit !== (values.unit || '') || f.notes !== (values.notes || '')
    const submit = (e) => {
        e.preventDefault()
        if (!changed || saving) return
        const n = (v) => (v === '' ? null : Number(v))
        onSave({ aiRate: n(f.aiRate), oaRate: n(f.oaRate), comboRate: n(f.comboRate), gstPercent: n(f.gstPercent), unit: f.unit || null, ...(isDefault ? {} : { notes: f.notes.trim() }) })
    }
    const hint = (v, fallback) => (isDefault ? fallback : `Default: ${v === null || v === undefined ? 'not set' : v}`)
    return (
        <form onSubmit={submit} className='space-y-4'>
            <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-3'>
                <div>
                    <label htmlFor='rate-ai' className='block text-[12.5px] font-semibold text-ink mb-1.5'>AI interview, per candidate</label>
                    <div className='relative'><span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[14px]'>₹</span><input id='rate-ai' inputMode='decimal' className={`${inputClass} !pl-8`} value={f.aiRate} onChange={set('aiRate', decimalOnly)} placeholder={hint(defaults.aiRate === null ? null : inr(defaults.aiRate), 'e.g. 100')} /></div>
                </div>
                <div>
                    <label htmlFor='rate-oa' className='block text-[12.5px] font-semibold text-ink mb-1.5'>Online test, per candidate</label>
                    <div className='relative'><span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[14px]'>₹</span><input id='rate-oa' inputMode='decimal' className={`${inputClass} !pl-8`} value={f.oaRate} onChange={set('oaRate', decimalOnly)} placeholder={hint(defaults.oaRate === null ? null : inr(defaults.oaRate), 'e.g. 50')} /></div>
                </div>
                <div>
                    <label htmlFor='rate-combo' className='block text-[12.5px] font-semibold text-ink mb-1.5'>Online test + AI interview, per candidate</label>
                    <div className='relative'><span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[14px]'>₹</span><input id='rate-combo' inputMode='decimal' className={`${inputClass} !pl-8`} value={f.comboRate} onChange={set('comboRate', decimalOnly)} placeholder={hint(defaults.comboRate === null || defaults.comboRate === undefined ? null : inr(defaults.comboRate), 'e.g. 250')} /></div>
                    <p className='text-[11.5px] text-text-secondary mt-1'>For a candidate who gives both the test and its AI interview: billed once at this price instead of the two above. Leave empty to bill them separately.</p>
                </div>
                <div>
                    <label htmlFor='rate-gst' className='block text-[12.5px] font-semibold text-ink mb-1.5'>GST</label>
                    <div className='relative'><input id='rate-gst' inputMode='decimal' className={`${inputClass} !pr-8`} value={f.gstPercent} onChange={set('gstPercent', (v) => decimalOnly(v).slice(0, 5))} placeholder={hint(`${defaults.gstPercent}%`, '18')} /><span className='absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[14px]'>%</span></div>
                </div>
            </div>
            <fieldset>
                <legend className='block text-[12.5px] font-semibold text-ink mb-1.5'>A candidate is billed</legend>
                <div className='flex flex-wrap gap-2'>
                    {[['', isDefault ? 'Once per period (each person once)' : `Use default (${defaults.unit === 'INTERVIEW' ? 'every interview round' : 'each person once'})`], ['CANDIDATE', 'Each person once per period'], ['INTERVIEW', 'Every interview round']].filter(([v]) => !(isDefault && v === '')).map(([v, label]) => (
                        <label key={v || 'default'} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-[1.5px] text-[13px] cursor-pointer ${f.unit === v || (isDefault && v === (f.unit || 'CANDIDATE')) ? 'border-accent bg-accent/[0.05] font-semibold text-ink' : 'border-line text-text-secondary hover:border-accent/40'}`}>
                            <input type='radio' name='unit' className='sr-only' checked={f.unit === v || (isDefault && v === (f.unit || 'CANDIDATE'))} onChange={() => setF((s) => ({ ...s, unit: v }))} />{label}
                        </label>
                    ))}
                </div>
                <p className='text-[12px] text-text-secondary mt-1.5'>"Each person once" bills a candidate one time in the period even if they sat two rounds. "Every interview round" bills each round separately.</p>
            </fieldset>
            {!isDefault && (
                <div>
                    <label htmlFor='rate-notes' className='block text-[12.5px] font-semibold text-ink mb-1.5'>Notes for your records <span className='font-normal text-text-secondary'>(optional)</span></label>
                    <textarea id='rate-notes' rows={2} maxLength={500} className={inputClass} value={f.notes} onChange={set('notes')} placeholder='e.g. Annual plan signed March 2026, 10% volume discount' />
                </div>
            )}
            {error && <p role='alert' className='text-[13px] text-[var(--color-danger)]'>{error}</p>}
            <Button type='submit' size='sm' disabled={!changed || saving}>{saving ? 'Saving…' : isDefault ? 'Save default rates' : 'Save rates for this client'}</Button>
        </form>
    )
}
