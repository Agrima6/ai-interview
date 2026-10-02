import React from 'react'

// Small on-brand decorative graphic for the dashboard hero banner - uses
// var(--color-accent) so it re-themes with the organization's own brand
// color instead of being a fixed-color stock illustration. Kept modest in
// size (not a full-bleed hero graphic) per the "avoid oversized decorative
// illustrations" guidance, while still giving the banner some visual
// warmth like the reference design.
function DashboardHeroIllustration({ className = '' }) {
    return (
        <svg viewBox="0 0 220 160" className={className} role="presentation" aria-hidden="true">
            {/* Calendar card, back layer */}
            <rect x="18" y="46" width="82" height="82" rx="14" fill="var(--color-card)" stroke="var(--color-line)" />
            <rect x="18" y="46" width="82" height="22" rx="14" fill="var(--color-accent)" opacity="0.9" />
            <rect x="18" y="60" width="82" height="8" fill="var(--color-accent)" opacity="0.9" />
            {[0, 1, 2].map((row) =>
                [0, 1, 2, 3].map((col) => (
                    <rect
                        key={`${row}-${col}`}
                        x={30 + col * 16}
                        y={84 + row * 14}
                        width="10"
                        height="8"
                        rx="2"
                        fill={row === 1 && col === 2 ? 'var(--color-accent)' : 'var(--color-line)'}
                    />
                ))
            )}

            {/* Checklist document card, front layer */}
            <rect x="92" y="16" width="96" height="122" rx="16" fill="var(--color-card)" stroke="var(--color-line)" strokeWidth="1.5" />
            <circle cx="140" cy="46" r="14" fill="var(--color-accent)" opacity="0.12" />
            <circle cx="140" cy="46" r="14" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            <path d="M134 46l4 4 8-8" stroke="var(--color-accent)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                    <rect x="106" y={70 + i * 18} width="12" height="12" rx="3" fill={i < 2 ? 'var(--color-success)' : 'var(--color-line)'} opacity={i < 2 ? 0.9 : 1} />
                    {i < 2 && <path d={`M109 ${76 + i * 18}l2 2 4-4`} stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                    <rect x="124" y={73 + i * 18} width={i % 2 === 0 ? 52 : 40} height="6" rx="3" fill="var(--color-line)" />
                </g>
            ))}

            {/* Floating accent dot */}
            <circle cx="200" cy="30" r="6" fill="var(--color-accent-cyan)" opacity="0.7" />
            <circle cx="14" cy="24" r="4" fill="var(--color-accent)" opacity="0.5" />
        </svg>
    )
}

export default DashboardHeroIllustration
