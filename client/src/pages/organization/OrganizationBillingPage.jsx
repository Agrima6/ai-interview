import React from 'react'
import { useSearchParams } from 'react-router-dom'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { OrgPanel } from '../billing/BillingOrgDrawer'
import { PERIOD_PRESETS, istToday, presetRange } from '../billing/billingFormat'
import { downloadOwnBillingCsv, getOwnBilling, listOwnBillingLines } from '../../api/orgBillingApi'

// The organization reads only itself: the server ignores any other organization, so the key here is just a label.
const OWN_SOURCE = {
    ns: 'own',
    getOrganization: (_key, params) => getOwnBilling(params),
    listLines: (_key, params) => listOwnBillingLines(params),
    download: (_key, params) => downloadOwnBillingCsv(params),
    save: async () => { throw new Error('Rates are set by your account manager.') },
}

/** What the organization is billed for candidates who were emailed an invitation, by drive and by candidate. Read-only. */
export default function OrganizationBillingPage() {
    const [params, setParams] = useSearchParams()
    const preset = params.get('preset') || (params.get('from') ? 'custom' : 'thisMonth')
    const range = preset === 'custom' ? { from: params.get('from') || presetRange('thisMonth').from, to: params.get('to') || istToday() } : presetRange(preset)
    const update = (patch) => setParams((prev) => { const next = new URLSearchParams(prev); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); return next }, { replace: true })

    return (
        <OrganizationLayout title='Billing' description='What you are billed when invitations are sent, by drive and by candidate.'>
            <div className='max-w-[1100px]'>
                <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4'>
                    <div role='tablist' aria-label='Period' className='flex flex-wrap gap-1'>
                        {PERIOD_PRESETS.map((p) => (
                            <button key={p.id} role='tab' aria-selected={preset === p.id} onClick={() => update({ preset: p.id === 'thisMonth' ? '' : p.id, from: '', to: '' })}
                                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${preset === p.id ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>{p.label}</button>
                        ))}
                        <button role='tab' aria-selected={preset === 'custom'} onClick={() => update({ preset: 'custom', from: range.from, to: range.to })}
                            className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${preset === 'custom' ? 'bg-ink text-white' : 'text-text-secondary hover:bg-black/[0.04]'}`}>Custom</button>
                    </div>
                    {preset === 'custom' && (
                        <div className='flex items-center gap-1.5 text-[13px]'>
                            <label className='sr-only' htmlFor='ob-from'>From</label><input id='ob-from' type='date' max={range.to} value={range.from} onChange={(e) => e.target.value && update({ preset: 'custom', from: e.target.value })} className='bg-card border border-line rounded-lg px-2.5 py-1.5 text-[13px]' />
                            <span className='text-text-secondary'>to</span>
                            <label className='sr-only' htmlFor='ob-to'>To</label><input id='ob-to' type='date' min={range.from} max={istToday()} value={range.to} onChange={(e) => e.target.value && update({ preset: 'custom', to: e.target.value })} className='bg-card border border-line rounded-lg px-2.5 py-1.5 text-[13px]' />
                        </div>
                    )}
                </div>
                <p className='text-[12.5px] text-text-secondary mb-5'>A candidate is billed when their invitation email is sent, whether or not they sit it. Candidates who only registered are not billed. Amounts are in Indian rupees and Indian time (IST).</p>
                <OrgPanel orgKey='own' period={range} product='' source={OWN_SOURCE} readOnly />
            </div>
        </OrganizationLayout>
    )
}
