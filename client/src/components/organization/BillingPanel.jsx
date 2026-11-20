import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Receipt } from 'lucide-react'
import { getOwnBilling } from '../../api/orgBillingApi'
import { Skeleton } from '../ui'
import { inr, num, presetRange, shownKinds, usesLabel } from '../../pages/billing/billingFormat'

// Only the prices for what this organization created.
const rateText = (o) => { const k = shownKinds(o.uses); return [k.combo && o.comboRate > 0 && inr(o.comboRate), k.oa && inr(o.oaRate), k.ai && inr(o.aiRate)].filter(Boolean).join(' / ') || 'Not set' }

/** This month's billing on the dashboard: who was billed, the rates, and the total. The detail is on the Billing page. */
export default function BillingPanel({ basePath }) {
    const range = presetRange('thisMonth')
    const { data, isLoading, isError } = useQuery({ queryKey: ['billing', 'own', 'summary', range.from, range.to], queryFn: () => getOwnBilling(range), staleTime: 60 * 1000, retry: false })
    if (isError) return null
    const o = data?.organization
    const quiet = o && o.billableUnits === 0 && o.registered === 0

    return (
        <section aria-label='Billing this month' className='mb-6 border border-line rounded-2xl bg-card overflow-hidden'>
            <div className='flex items-center justify-between gap-3 px-5 py-4 border-b border-line'>
                <div className='flex items-center gap-2.5'><span className='w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center' aria-hidden='true'><Receipt size={17} /></span>
                    <div><h2 className='text-[15px] font-bold text-ink'>Billing this month</h2><p className='text-[12.5px] text-text-secondary'>Billed once a candidate has given the interview</p></div></div>
                <Link to={`${basePath}/billing`} className='inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline'>View details <ArrowRight size={14} aria-hidden='true' /></Link>
            </div>
            {isLoading ? <div className='p-5'><Skeleton className='h-16 w-full rounded-xl' /></div> : quiet ? (
                <p className='px-5 py-6 text-[13.5px] text-text-secondary'>No candidates registered or interviewed yet this month, so there is nothing to bill.</p>
            ) : (
                <div className='grid grid-cols-2 lg:grid-cols-5 divide-line lg:divide-x'>
                    {[['Registered', num(o.registered), 'this month'], ['Gave the interview', num(o.gaveOfRegistered), `${num(o.conversionPercent)}% of registered`], ['Billable', num(o.billableUnits), o.unit === 'INTERVIEW' ? 'interview rounds' : 'candidates'], ['Rate', o.rateMissing ? 'Not set' : rateText(o), usesLabel(o.uses) || 'per candidate'], ['Total payable', inr(o.total), `incl. ${o.gstPercent}% GST`]].map(([label, value, hint], i) => (
                        <div key={label} className={`px-4 py-3.5 min-w-0 ${i === 4 ? 'col-span-2 lg:col-span-1 bg-ink text-white' : ''}`}>
                            <p className={`text-[12px] font-semibold ${i === 4 ? 'text-white/70' : 'text-text-secondary'}`}>{label}</p>
                            <p className='font-display text-[20px] leading-tight font-bold tabular-nums break-words'>{value}</p>
                            <p className={`text-[11.5px] ${i === 4 ? 'text-white/60' : 'text-text-secondary'}`}>{hint}</p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
