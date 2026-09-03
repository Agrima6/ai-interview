const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
}

function Dot({ cx, cy, r = 2.5, opacity = 1 }) {
    return <circle cx={cx} cy={cy} r={r} fill='var(--color-accent)' opacity={opacity} />
}

function MarketingIllustration({ type = 'intelligence', className = 'h-14 w-20' }) {
    return (
        <svg viewBox='0 0 96 72' className={`shrink-0 ${className}`} aria-hidden='true'>
            <g {...common}>
                {type === 'intelligence' && <>
                    <path d='M48 17v38M29 36h38M34 22l28 28M62 22 34 50' opacity='.22' />
                    <circle cx='48' cy='36' r='12' fill='var(--color-accent)' opacity='.10' />
                    <path d='M43 35c2-5 8-5 10-1 4-1 6 4 3 7 1 4-4 6-7 3-4 3-9 0-8-4-3-2-1-6 2-5Z' />
                    <path d='M45 32v8M51 31v9M42 36h12' opacity='.7' />
                    <Dot cx='27' cy='19' r='2' /><Dot cx='69' cy='18' r='2' /><Dot cx='25' cy='54' r='2' /><Dot cx='72' cy='53' r='2' />
                    <path d='M14 61h17M65 61h17' opacity='.35' />
                </>}

                {type === 'fairness' && <>
                    <path d='M48 15v39M27 24h42M35 24 27 39h16L35 24ZM61 24l-8 15h16l-8-15Z' />
                    <path d='M39 54h18M34 58h28' />
                    <circle cx='27' cy='17' r='5' fill='var(--color-accent)' opacity='.10' /><circle cx='69' cy='17' r='5' fill='var(--color-accent)' opacity='.10' />
                    <path d='M24 17h6M66 17h6' opacity='.7' />
                    <Dot cx='16' cy='43' r='2' /><Dot cx='80' cy='43' r='2' />
                    <path d='M16 47v7M80 47v7M12 54h8M76 54h8' opacity='.55' />
                </>}

                {type === 'speed' && <>
                    <path d='M12 49h18c6 0 6-25 14-25h15' opacity='.55' />
                    <path d='m57 18 8 6-8 6M65 24h18' />
                    <Dot cx='17' cy='49' r='3' /><Dot cx='38' cy='40' r='3' /><Dot cx='55' cy='24' r='3' />
                    <circle cx='23' cy='20' r='8' fill='var(--color-accent)' opacity='.08' />
                    <path d='M23 16v5l3 2' />
                    <path d='M15 61h66' opacity='.28' />
                </>}

                {type === 'security' && <>
                    <path d='M28 15 48 9l20 6v17c0 14-9 23-20 29-11-6-20-15-20-29V15Z' fill='var(--color-accent)' opacity='.08' />
                    <path d='m39 35 6 6 13-14' strokeWidth='2.5' />
                    <rect x='62' y='28' width='21' height='26' rx='3' fill='var(--color-card)' />
                    <path d='M67 35h11M67 41h9M67 47h7' opacity='.5' />
                    <path d='M69 28v-4a4 4 0 0 1 8 0v4' />
                    <Dot cx='17' cy='25' r='2' /><path d='M17 31v9M13 35h8' opacity='.5' />
                </>}

                {type === 'analytics' && <>
                    <path d='M14 57h68M19 57V20' opacity='.45' />
                    <rect x='27' y='42' width='8' height='15' rx='2' fill='var(--color-accent)' opacity='.28' />
                    <rect x='42' y='33' width='8' height='24' rx='2' fill='var(--color-accent)' opacity='.48' />
                    <rect x='57' y='24' width='8' height='33' rx='2' fill='var(--color-accent)' opacity='.72' />
                    <path d='m24 36 13-8 11 4 17-16' /><path d='m59 16h6v6' />
                    <Dot cx='37' cy='28' r='2' /><Dot cx='48' cy='32' r='2' /><Dot cx='65' cy='16' r='2' />
                </>}

                {type === 'organization' && <>
                    <rect x='28' y='19' width='28' height='39' rx='3' fill='var(--color-accent)' opacity='.08' />
                    <path d='M36 58V29h12v29M32 36h-9v22M52 35h9v23M35 35h2M43 35h2M35 42h2M43 42h2M35 49h2M43 49h2' />
                    <path d='M16 58h67' opacity='.45' /><Dot cx='18' cy='20' r='2' /><Dot cx='77' cy='26' r='2' />
                </>}

                {type === 'college' && <>
                    <path d='m17 28 31-14 31 14-31 14-31-14Z' fill='var(--color-accent)' opacity='.12' />
                    <path d='M28 34v14c8 7 32 7 40 0V34M79 29v18' />
                    <circle cx='79' cy='50' r='4' /><path d='M79 54v7M74 61h10' />
                    <Dot cx='18' cy='52' r='2' /><Dot cx='31' cy='61' r='2' /><Dot cx='65' cy='61' r='2' />
                </>}

                {type === 'candidate' && <>
                    <circle cx='43' cy='25' r='10' fill='var(--color-accent)' opacity='.12' />
                    <circle cx='43' cy='24' r='5' /><path d='M31 48c1-9 6-14 12-14s11 5 12 14v8H31v-8Z' />
                    <path d='M61 23h17M61 31h12M61 39h15' opacity='.55' /><Dot cx='72' cy='53' r='3' />
                    <path d='M61 53h8' />
                </>}

                {type === 'resume' && <>
                    <path d='M25 10h31l15 15v38H25V10Z' fill='var(--color-accent)' opacity='.07' />
                    <path d='M56 10v16h15M34 34h27M34 42h22M34 50h15' />
                    <circle cx='39' cy='22' r='5' /><path d='M34 29c1-4 9-4 10 0' />
                    <Dot cx='80' cy='17' r='2' /><path d='M78 23h5' opacity='.5' />
                </>}

                {type === 'voice' && <>
                    <rect x='39' y='12' width='18' height='31' rx='9' fill='var(--color-accent)' opacity='.10' />
                    <rect x='44' y='17' width='8' height='18' rx='4' />
                    <path d='M34 30c0 10 6 16 14 16s14-6 14-16M48 46v10M41 56h14' />
                    <path d='M24 25v14M18 29v6M72 25v14M78 29v6' opacity='.55' />
                    <Dot cx='12' cy='36' r='2' /><Dot cx='84' cy='36' r='2' />
                </>}

                {type === 'technical' && <>
                    <rect x='18' y='16' width='60' height='39' rx='5' fill='var(--color-accent)' opacity='.07' />
                    <path d='m31 29-7 7 7 7M65 29l7 7-7 7M48 26l-5 20' strokeWidth='2' />
                    <Dot cx='18' cy='12' r='2' /><Dot cx='78' cy='12' r='2' /><Dot cx='12' cy='60' r='2' /><Dot cx='84' cy='60' r='2' />
                    <path d='M25 61h46' opacity='.45' />
                </>}

                {type === 'report' && <>
                    <path d='M25 10h31l15 15v38H25V10Z' fill='var(--color-accent)' opacity='.07' />
                    <path d='M56 10v16h15M34 50V35M44 50V29M54 50V39M64 50V23' />
                    <path d='M31 55h39' opacity='.4' /><Dot cx='78' cy='17' r='2' /><Dot cx='18' cy='57' r='2' />
                </>}

                {type === 'history' && <>
                    <path d='M25 29a23 23 0 1 1-1 15' /><path d='m23 20 1 10 10-2' />
                    <path d='M48 26v12l8 5' /><circle cx='48' cy='38' r='19' fill='var(--color-accent)' opacity='.07' />
                    <Dot cx='72' cy='18' r='2' /><Dot cx='78' cy='55' r='2' />
                </>}
            </g>
        </svg>
    )
}

export default MarketingIllustration
