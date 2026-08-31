import React, { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Select } from '../ui'

const toDateOnly = (d) => d.toISOString().slice(0, 10)

const startOfDay = (d) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c }
const endOfDay = (d) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c }
const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c }

// Every option resolves to a concrete { from, to } (ISO instants) at the
// moment it's chosen - "custom" is the only one that doesn't resolve here,
// it just switches the UI to the two date inputs below.
const PRESETS = [
    { key: '', label: 'All time' },
    { key: 'today', label: 'Today', resolve: () => { const now = new Date(); return [startOfDay(now), endOfDay(now)] } },
    { key: 'yesterday', label: 'Yesterday', resolve: () => { const y = addDays(new Date(), -1); return [startOfDay(y), endOfDay(y)] } },
    { key: '7d', label: 'Last 7 Days', resolve: () => [startOfDay(addDays(new Date(), -6)), endOfDay(new Date())] },
    { key: '30d', label: 'Last 30 Days', resolve: () => [startOfDay(addDays(new Date(), -29)), endOfDay(new Date())] },
    { key: 'thisMonth', label: 'This Month', resolve: () => { const now = new Date(); return [startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), endOfDay(now)] } },
    { key: 'lastMonth', label: 'Last Month', resolve: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 0); return [startOfDay(start), endOfDay(end)] } },
    { key: 'custom', label: 'Custom Range' },
]

/**
 * Shared date-range filter with the usual presets, plus a custom from/to
 * pair. `value` is { preset, from, to } where from/to are ISO instants (or
 * null for "All time"); `onChange` receives the same shape. Reused by the
 * Dashboard and the Clients table so date filtering behaves identically in
 * both places.
 */
function DateRangeFilter({ value, onChange, className = '' }) {
    const { preset = '', from = null, to = null } = value || {}
    const [customOpen, setCustomOpen] = useState(preset === 'custom')

    const handlePresetChange = (key) => {
        if (key === 'custom') {
            setCustomOpen(true)
            onChange({ preset: 'custom', from, to })
            return
        }
        setCustomOpen(false)
        const option = PRESETS.find((p) => p.key === key)
        if (!option || !option.resolve) {
            onChange({ preset: '', from: null, to: null })
            return
        }
        const [resolvedFrom, resolvedTo] = option.resolve()
        onChange({ preset: key, from: resolvedFrom.toISOString(), to: resolvedTo.toISOString() })
    }

    const handleCustomChange = (field, raw) => {
        if (!raw) { onChange({ preset: 'custom', from, to: field === 'to' ? null : to, [field]: null }); return }
        const date = field === 'from' ? startOfDay(new Date(raw)) : endOfDay(new Date(raw))
        onChange({ preset: 'custom', from: field === 'from' ? date.toISOString() : from, to: field === 'to' ? date.toISOString() : to })
    }

    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            <Select value={preset} onChange={(e) => handlePresetChange(e.target.value)} wrapperClassName='w-[170px]' aria-label='Date range'>
                {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
            {customOpen && (
                <div className='flex items-center gap-2 text-[13px] text-text-secondary'>
                    <Calendar size={14} className='shrink-0' />
                    <input
                        type='date'
                        value={from ? toDateOnly(new Date(from)) : ''}
                        onChange={(e) => handleCustomChange('from', e.target.value)}
                        max={to ? toDateOnly(new Date(to)) : undefined}
                        className='bg-card border border-line rounded-xl px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                        aria-label='From date'
                    />
                    <span>to</span>
                    <input
                        type='date'
                        value={to ? toDateOnly(new Date(to)) : ''}
                        onChange={(e) => handleCustomChange('to', e.target.value)}
                        min={from ? toDateOnly(new Date(from)) : undefined}
                        className='bg-card border border-line rounded-xl px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15'
                        aria-label='To date'
                    />
                </div>
            )}
        </div>
    )
}

export default DateRangeFilter
