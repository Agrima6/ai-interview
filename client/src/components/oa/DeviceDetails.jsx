import React from 'react'
import { ExternalLink } from 'lucide-react'

const coordinate = (n) => (typeof n === 'number' ? n.toFixed(5) : null)

/**
 * Where and on what a candidate is sitting the test: IP address, latitude and longitude, browser, operating system and
 * device. The same block is shown to the candidate before they sign in and to the organizer in the report.
 * `env` is the environment object ({ latitude, longitude, accuracy, browser, os, device, screen, timezone }).
 */
export default function DeviceDetails({ ip, env = {}, pending = {}, dense = false, mapLink = false, className = '' }) {
    const lat = coordinate(env.latitude); const lng = coordinate(env.longitude)
    const rows = [
        ['IP address', ip || (pending.ip ? 'Checking…' : 'Not recorded')],
        ['Latitude', lat ?? (pending.location ? 'Checking…' : 'Not shared')],
        ['Longitude', lng ?? (pending.location ? 'Checking…' : 'Not shared')],
        ['Browser', env.browser || '—'],
        ['Operating system', env.os || env.platform || '—'],
        ['Device', env.device || '—'],
        ...(env.screen ? [['Screen', `${env.screen}${env.screenCount > 1 ? ` · ${env.screenCount} screens` : ''}`]] : []),
        ...(env.timezone ? [['Time zone', env.timezone]] : []),
    ]
    return (
        <div className={className}>
            <dl className={`grid ${dense ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-x-4 gap-y-2.5`}>
                {rows.map(([label, value]) => (
                    <div key={label} className='min-w-0'>
                        <dt className='text-[11px] font-semibold uppercase tracking-wide text-text-secondary'>{label}</dt>
                        <dd className='text-[13px] font-medium text-ink break-words tabular-nums'>{value}</dd>
                    </div>
                ))}
            </dl>
            {mapLink && lat && (
                <a href={`https://www.google.com/maps?q=${env.latitude},${env.longitude}`} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent mt-3'>
                    Open this location in a map <ExternalLink size={12} />
                </a>
            )}
        </div>
    )
}
