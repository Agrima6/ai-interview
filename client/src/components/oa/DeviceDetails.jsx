import React from 'react'
import { ExternalLink } from 'lucide-react'

const coordinates = (env) => (typeof env.latitude === 'number' && typeof env.longitude === 'number' ? `${env.latitude.toFixed(5)}, ${env.longitude.toFixed(5)}` : null)

/**
 * Where and on what a candidate is sitting the test: IP address, the place (a name, not numbers), browser, operating
 * system and device. The same block is shown to the candidate before they sign in and to the organizer in the report.
 * `env` is the environment object ({ place, latitude, longitude, browser, os, device, screen, timezone }). The exact
 * coordinates stay one hover or one map click away.
 */
export default function DeviceDetails({ ip, env = {}, pending = {}, dense = false, mapLink = false, className = '' }) {
    const exact = coordinates(env)
    const location = env.place || (exact ? (pending.place ? 'Finding the place name…' : 'Shared (place name unavailable)') : pending.location ? 'Checking…' : 'Not shared')
    const rows = [
        ['IP address', ip || (pending.ip ? 'Checking…' : 'Not recorded'), false],
        ['Location', location, true, exact ? `Exact position: ${exact}` : undefined],
        ['Browser', env.browser || '—', false],
        ['Operating system', env.os || env.platform || '—', false],
        ['Device', env.device || '—', false],
        ...(env.screen ? [['Screen', `${env.screen}${env.screenCount > 1 ? ` · ${env.screenCount} screens` : ''}`, false]] : []),
        ...(env.timezone ? [['Time zone', env.timezone, false]] : []),
    ]
    return (
        <div className={className}>
            <dl className={`grid ${dense ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-x-4 gap-y-2.5`}>
                {rows.map(([label, value, wide, hint]) => (
                    <div key={label} className={`min-w-0 ${wide ? (dense ? 'col-span-2 sm:col-span-2' : 'col-span-2') : ''}`}>
                        <dt className='text-[11px] font-semibold uppercase tracking-wide text-text-secondary'>{label}</dt>
                        <dd className='text-[13px] font-medium text-ink break-words' title={hint}>{value}</dd>
                    </div>
                ))}
            </dl>
            {mapLink && exact && (
                <a href={`https://www.google.com/maps?q=${env.latitude},${env.longitude}`} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent mt-3'>
                    View on a map <ExternalLink size={12} />
                </a>
            )}
        </div>
    )
}
