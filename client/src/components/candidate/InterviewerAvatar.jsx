import React from 'react'

/**
 * The AI interviewer's face: a friendly robot drawn in SVG (no image files), whose behaviour tells the
 * candidate what is happening without reading text.
 *
 *   connecting - waking up: dim eyes, slow antenna blink
 *   listening  - attentive: eyes open and blinking, head tilts slightly, ear lights glow softly
 *   thinking   - eyes drift up and side to side, antenna ball pulses (candidate finished, AI is working)
 *   speaking   - mouth opens and closes, head bobs, sound arcs ripple, antenna flashes
 *
 * Motion is CSS-only and switched off for people who prefer reduced motion. The state is also announced
 * to screen readers, so colour and animation are never the only signal.
 */
const LABEL = {
    connecting: 'AI interviewer is getting ready',
    listening: 'AI interviewer is listening to you',
    thinking: 'AI interviewer is thinking',
    speaking: 'AI interviewer is speaking',
}

export default function InterviewerAvatar({ state = 'listening', size = 220 }) {
    const s = LABEL[state] ? state : 'listening'
    return (
        <div className={`wm-bot wm-bot--${s}`} role='img' aria-label={LABEL[s]} style={{ width: size, height: size }}>
            <svg viewBox='0 0 240 240' width='100%' height='100%' aria-hidden='true'>
                <defs>
                    <linearGradient id='wmBotHead' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0' stopColor='#f4f6fa' />
                        <stop offset='1' stopColor='#cfd6e2' />
                    </linearGradient>
                    <linearGradient id='wmBotFace' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0' stopColor='#1b2233' />
                        <stop offset='1' stopColor='#0e1320' />
                    </linearGradient>
                    <radialGradient id='wmBotGlow' cx='50%' cy='50%' r='50%'>
                        <stop offset='0' stopColor='var(--color-accent, #c4161f)' stopOpacity='0.35' />
                        <stop offset='1' stopColor='var(--color-accent, #c4161f)' stopOpacity='0' />
                    </radialGradient>
                </defs>

                {/* soft glow behind the robot */}
                <circle className='wm-bot__glow' cx='120' cy='128' r='108' fill='url(#wmBotGlow)' />

                {/* sound arcs - visible only while speaking */}
                <g className='wm-bot__arcs' fill='none' stroke='var(--color-accent, #c4161f)' strokeLinecap='round' strokeWidth='5'>
                    <path className='wm-bot__arc wm-bot__arc--1' d='M 30 112 Q 18 128 30 144' />
                    <path className='wm-bot__arc wm-bot__arc--2' d='M 16 100 Q -4 128 16 156' />
                    <path className='wm-bot__arc wm-bot__arc--1' d='M 210 112 Q 222 128 210 144' />
                    <path className='wm-bot__arc wm-bot__arc--2' d='M 224 100 Q 244 128 224 156' />
                </g>

                {/* body + head move together */}
                <g className='wm-bot__body'>
                    {/* shoulders */}
                    <path d='M 62 232 Q 62 190 120 186 Q 178 190 178 232 Z' fill='#e3e8f1' />
                    <rect x='104' y='176' width='32' height='16' rx='6' fill='#b9c2d3' />
                    <circle cx='120' cy='214' r='7' fill='var(--color-accent, #c4161f)' className='wm-bot__badge' />

                    <g className='wm-bot__head'>
                        {/* antenna */}
                        <line x1='120' y1='44' x2='120' y2='64' stroke='#9aa5b8' strokeWidth='5' strokeLinecap='round' />
                        <circle className='wm-bot__antenna' cx='120' cy='38' r='9' fill='var(--color-accent, #c4161f)' />

                        {/* ears */}
                        <rect className='wm-bot__ear' x='36' y='104' width='20' height='44' rx='10' fill='#b9c2d3' />
                        <rect className='wm-bot__ear' x='184' y='104' width='20' height='44' rx='10' fill='#b9c2d3' />
                        <rect className='wm-bot__ear-light' x='42' y='116' width='8' height='20' rx='4' fill='var(--color-accent, #c4161f)' />
                        <rect className='wm-bot__ear-light' x='190' y='116' width='8' height='20' rx='4' fill='var(--color-accent, #c4161f)' />

                        {/* head + screen face */}
                        <rect x='52' y='62' width='136' height='116' rx='38' fill='url(#wmBotHead)' />
                        <rect x='66' y='78' width='108' height='84' rx='26' fill='url(#wmBotFace)' />

                        {/* cheeks */}
                        <ellipse cx='84' cy='132' rx='9' ry='5.5' fill='var(--color-accent, #c4161f)' opacity='0.35' />
                        <ellipse cx='156' cy='132' rx='9' ry='5.5' fill='var(--color-accent, #c4161f)' opacity='0.35' />

                        {/* eyes */}
                        <g className='wm-bot__eyes'>
                            <g className='wm-bot__eye'>
                                <rect x='88' y='100' width='18' height='26' rx='9' fill='#7fe7ff' />
                                <circle className='wm-bot__shine' cx='93' cy='107' r='3.2' fill='#fff' />
                            </g>
                            <g className='wm-bot__eye'>
                                <rect x='134' y='100' width='18' height='26' rx='9' fill='#7fe7ff' />
                                <circle className='wm-bot__shine' cx='139' cy='107' r='3.2' fill='#fff' />
                            </g>
                        </g>

                        {/* mouth: a smile that opens while speaking */}
                        <g className='wm-bot__mouth'>
                            <path className='wm-bot__smile' d='M 104 140 Q 120 154 136 140' fill='none' stroke='#7fe7ff' strokeWidth='5' strokeLinecap='round' />
                            <ellipse className='wm-bot__talk' cx='120' cy='144' rx='14' ry='9' fill='#7fe7ff' />
                        </g>

                        {/* thinking dots */}
                        <g className='wm-bot__dots' fill='#fff'>
                            <circle cx='108' cy='146' r='3' />
                            <circle cx='120' cy='146' r='3' />
                            <circle cx='132' cy='146' r='3' />
                        </g>
                    </g>
                </g>
            </svg>

            <style>{`
                .wm-bot { position: relative; }
                .wm-bot svg { overflow: visible; }
                .wm-bot__head, .wm-bot__body, .wm-bot__eye, .wm-bot__eyes, .wm-bot__mouth { transform-box: fill-box; }
                .wm-bot__head { transform-origin: 50% 90%; }
                .wm-bot__body { transform-origin: 50% 100%; }
                .wm-bot__eye { transform-origin: 50% 50%; }

                /* default (listening) */
                .wm-bot__talk, .wm-bot__dots, .wm-bot__arcs { opacity: 0; }
                .wm-bot__smile { opacity: 1; }
                .wm-bot__glow { opacity: .55; }
                .wm-bot__ear-light { opacity: .45; }
                .wm-bot--listening .wm-bot__head { animation: wmTilt 5s ease-in-out infinite; }
                .wm-bot--listening .wm-bot__eye { animation: wmBlink 4.2s infinite; }
                .wm-bot--listening .wm-bot__ear-light { animation: wmEar 1.8s ease-in-out infinite; }
                .wm-bot--listening .wm-bot__body { animation: wmBreathe 4s ease-in-out infinite; }

                /* connecting */
                .wm-bot--connecting .wm-bot__eye { transform: scaleY(.25); }
                .wm-bot--connecting .wm-bot__antenna { animation: wmAntenna 1.6s ease-in-out infinite; }
                .wm-bot--connecting .wm-bot__glow { opacity: .25; }
                .wm-bot--connecting .wm-bot__ear-light { opacity: .2; }

                /* thinking */
                .wm-bot--thinking .wm-bot__smile { opacity: 0; }
                .wm-bot--thinking .wm-bot__dots { opacity: 1; }
                .wm-bot--thinking .wm-bot__dots circle { animation: wmDot 1.1s ease-in-out infinite; }
                .wm-bot--thinking .wm-bot__dots circle:nth-child(2) { animation-delay: .18s; }
                .wm-bot--thinking .wm-bot__dots circle:nth-child(3) { animation-delay: .36s; }
                .wm-bot--thinking .wm-bot__eyes { animation: wmLook 2.6s ease-in-out infinite; }
                .wm-bot--thinking .wm-bot__antenna { animation: wmAntenna .9s ease-in-out infinite; }
                .wm-bot--thinking .wm-bot__head { animation: wmTilt 3s ease-in-out infinite; }

                /* speaking */
                .wm-bot--speaking .wm-bot__smile { opacity: 0; }
                .wm-bot--speaking .wm-bot__talk { opacity: 1; transform-box: fill-box; transform-origin: 50% 40%; animation: wmTalk .42s ease-in-out infinite; }
                .wm-bot--speaking .wm-bot__arcs { opacity: 1; }
                .wm-bot--speaking .wm-bot__arc { animation: wmArc 1.1s ease-out infinite; }
                .wm-bot--speaking .wm-bot__arc--2 { animation-delay: .25s; }
                .wm-bot--speaking .wm-bot__head { animation: wmBob .84s ease-in-out infinite; }
                .wm-bot--speaking .wm-bot__eye { animation: wmBlink 3.4s infinite; }
                .wm-bot--speaking .wm-bot__antenna { animation: wmAntenna .6s ease-in-out infinite; }
                .wm-bot--speaking .wm-bot__ear-light { opacity: 1; animation: wmEar .5s ease-in-out infinite; }
                .wm-bot--speaking .wm-bot__glow { opacity: .9; animation: wmGlow 1.2s ease-in-out infinite; }

                @keyframes wmBlink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.08); } }
                @keyframes wmTilt { 0%, 100% { transform: rotate(0deg); } 30% { transform: rotate(-3deg); } 65% { transform: rotate(2.5deg); } }
                @keyframes wmBreathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
                @keyframes wmBob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(-1.5deg); } }
                @keyframes wmTalk { 0%, 100% { transform: scaleY(.25) scaleX(.8); } 50% { transform: scaleY(1) scaleX(1); } }
                @keyframes wmEar { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
                @keyframes wmAntenna { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.8); } }
                @keyframes wmDot { 0%, 100% { opacity: .25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-5px); } }
                @keyframes wmLook { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-7px, -6px); } 70% { transform: translate(7px, -6px); } }
                @keyframes wmArc { 0% { opacity: 0; } 30% { opacity: .95; } 100% { opacity: 0; } }
                @keyframes wmGlow { 0%, 100% { opacity: .6; } 50% { opacity: 1; } }

                @media (prefers-reduced-motion: reduce) {
                    .wm-bot *, .wm-bot *::before, .wm-bot *::after { animation: none !important; }
                    .wm-bot--speaking .wm-bot__talk { transform: scaleY(.7); }
                }
            `}</style>
        </div>
    )
}
