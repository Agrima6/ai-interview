import React from 'react'
import { Mic, Volume2, Loader2 } from 'lucide-react'

/**
 * Arav, the AI interviewer, drawn as a friendly cartoon face and shown like a participant in a video call.
 *
 *   state: connecting | listening | thinking | followup | speaking
 *
 * Every state has a text label as well as motion, so colour/animation is never the only signal. Motion is CSS
 * only and is switched off for people who prefer reduced motion.
 */
const LABEL = {
    connecting: 'Joining...',
    listening: 'Listening...',
    thinking: 'Thinking...',
    followup: 'Preparing follow-up...',
    speaking: 'Speaking...',
}
const SR = {
    connecting: 'Arav is joining the interview',
    listening: 'Arav is listening to you',
    thinking: 'Arav is thinking',
    followup: 'Arav is preparing a follow-up question',
    speaking: 'Arav is speaking',
}

function Face({ state }) {
    return (
        <svg viewBox='0 0 120 120' className='w-full h-full' aria-hidden='true'>
            <defs>
                <linearGradient id='aravBg' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0' stopColor='#f6dfe1' />
                    <stop offset='1' stopColor='#e9b9bd' />
                </linearGradient>
            </defs>
            <rect width='120' height='120' fill='url(#aravBg)' />
            {/* shoulders + shirt */}
            <path d='M14 124 Q16 92 60 88 Q104 92 106 124 Z' fill='#2f3b52' />
            <path d='M48 90 L60 104 L72 90 Z' fill='#f4f6fa' />
            <rect x='52' y='78' width='16' height='14' rx='5' fill='#e4b48f' />
            <g className='wm-arav__head'>
                {/* ears */}
                <ellipse cx='30' cy='58' rx='5' ry='7' fill='#e4b48f' />
                <ellipse cx='90' cy='58' rx='5' ry='7' fill='#e4b48f' />
                {/* face */}
                <ellipse cx='60' cy='56' rx='30' ry='33' fill='#f1c7a1' />
                {/* hair */}
                <path d='M28 52 Q24 22 58 20 Q94 18 92 52 Q86 36 70 34 Q50 40 38 36 Q30 42 28 52 Z' fill='#3a2417' />
                <path d='M40 30 Q56 22 74 28 Q60 26 40 30 Z' fill='#5a3a26' />
                {/* brows */}
                <g className='wm-arav__brows' stroke='#3a2417' strokeWidth='3' strokeLinecap='round' fill='none'>
                    <path d='M40 46 Q47 42 54 46' />
                    <path d='M66 46 Q73 42 80 46' />
                </g>
                {/* glasses */}
                <g fill='none' stroke='#27303f' strokeWidth='2.6'>
                    <rect x='36' y='49' width='23' height='17' rx='7' />
                    <rect x='61' y='49' width='23' height='17' rx='7' />
                    <path d='M59 57 H61' />
                </g>
                {/* eyes */}
                <g className='wm-arav__eyes'>
                    <g className='wm-arav__eye'><ellipse cx='47.5' cy='57.5' rx='3.4' ry='4' fill='#1d2230' /><circle cx='48.8' cy='56' r='1.2' fill='#fff' /></g>
                    <g className='wm-arav__eye'><ellipse cx='72.5' cy='57.5' rx='3.4' ry='4' fill='#1d2230' /><circle cx='73.8' cy='56' r='1.2' fill='#fff' /></g>
                </g>
                {/* cheeks */}
                <ellipse cx='40' cy='73' rx='5' ry='3' fill='#e58f8f' opacity='0.45' />
                <ellipse cx='80' cy='73' rx='5' ry='3' fill='#e58f8f' opacity='0.45' />
                {/* mouth: smile that opens while speaking */}
                <path className='wm-arav__smile' d='M50 75 Q60 83 70 75' fill='none' stroke='#8a3b3b' strokeWidth='3' strokeLinecap='round' />
                <ellipse className='wm-arav__talk' cx='60' cy='77' rx='8' ry='5.5' fill='#7a2630' />
                {/* thinking dots */}
                <g className='wm-arav__dots' fill='#8a3b3b'>
                    <circle cx='52' cy='77' r='2' /><circle cx='60' cy='77' r='2' /><circle cx='68' cy='77' r='2' />
                </g>
            </g>
        </svg>
    )
}

function Wave({ active, calm }) {
    return (
        <span className={`wm-arav__wave ${active ? 'wm-arav__wave--on' : ''} ${calm ? 'wm-arav__wave--calm' : ''}`} aria-hidden='true'>
            {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}
        </span>
    )
}

export default function AravTile({ state = 'listening', className = '' }) {
    const s = LABEL[state] ? state : 'listening'
    return (
        <div className={`wm-arav wm-arav--${s} ${className}`} role='group' aria-label={SR[s]}>
            <div className='wm-arav__ring'>
                <div className='wm-arav__face'><Face state={s} /></div>
            </div>
            <p className='wm-arav__name'>Arav</p>
            <p className='wm-arav__status' aria-live='polite'>
                {s === 'speaking' && <Volume2 size={13} aria-hidden='true' />}
                {s === 'listening' && <Mic size={13} aria-hidden='true' />}
                {(s === 'connecting' || s === 'thinking' || s === 'followup') && <Loader2 size={13} className='wm-arav__spin' aria-hidden='true' />}
                <span>{LABEL[s]}</span>
                {s === 'speaking' && <Wave active />}
                {s === 'listening' && <Wave active calm />}
            </p>

            <style>{`
                .wm-arav { display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 10px 9px; width:100%;
                    background:rgba(24,26,33,.78); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,.12); border-radius:18px;
                    color:#fff; box-shadow:0 8px 24px rgba(0,0,0,.35); }
                .wm-arav__ring { width:min(84px, 46%); aspect-ratio:1; border-radius:9999px; padding:3px; background:rgba(255,255,255,.18); transition:box-shadow .3s, background .3s; }
                .wm-arav__face { width:100%; height:100%; border-radius:9999px; overflow:hidden; background:#e9b9bd; }
                .wm-arav__name { font-size:14px; font-weight:700; line-height:1.1; margin-top:2px; }
                .wm-arav__status { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:rgba(255,255,255,.9); min-height:18px; white-space:nowrap; }
                .wm-arav__spin { animation: wmAravSpin 1s linear infinite; }

                .wm-arav__head, .wm-arav__eye { transform-box: fill-box; transform-origin: 50% 90%; }
                .wm-arav__eye { transform-origin: 50% 50%; }
                .wm-arav__talk, .wm-arav__dots { opacity:0; }
                .wm-arav__eye { animation: wmAravBlink 4.6s infinite; }

                .wm-arav--listening .wm-arav__ring { background:rgba(120,230,170,.55); }
                .wm-arav--listening .wm-arav__head { animation: wmAravNod 5s ease-in-out infinite; }

                .wm-arav--thinking .wm-arav__smile, .wm-arav--followup .wm-arav__smile { opacity:0; }
                .wm-arav--thinking .wm-arav__dots, .wm-arav--followup .wm-arav__dots { opacity:1; }
                .wm-arav--thinking .wm-arav__dots circle, .wm-arav--followup .wm-arav__dots circle { animation: wmAravDot 1.1s ease-in-out infinite; }
                .wm-arav--thinking .wm-arav__dots circle:nth-child(2), .wm-arav--followup .wm-arav__dots circle:nth-child(2) { animation-delay:.18s; }
                .wm-arav--thinking .wm-arav__dots circle:nth-child(3), .wm-arav--followup .wm-arav__dots circle:nth-child(3) { animation-delay:.36s; }
                .wm-arav--thinking .wm-arav__eyes, .wm-arav--followup .wm-arav__eyes { transform-box:fill-box; animation: wmAravLook 2.8s ease-in-out infinite; }

                .wm-arav--speaking { border-color:rgba(196,22,31,.65); box-shadow:0 0 0 2px rgba(196,22,31,.25), 0 8px 28px rgba(196,22,31,.35); }
                .wm-arav--speaking .wm-arav__ring { background:rgba(196,22,31,.8); box-shadow:0 0 16px rgba(196,22,31,.6); }
                .wm-arav--speaking .wm-arav__smile { opacity:0; }
                .wm-arav--speaking .wm-arav__talk { opacity:1; transform-box:fill-box; transform-origin:50% 30%; animation: wmAravTalk .42s ease-in-out infinite; }
                .wm-arav--speaking .wm-arav__head { animation: wmAravBob .85s ease-in-out infinite; }

                .wm-arav--connecting .wm-arav__ring { background:rgba(255,255,255,.12); }
                .wm-arav--connecting .wm-arav__face { filter:grayscale(.6) brightness(.8); }

                .wm-arav__wave { display:inline-flex; align-items:center; gap:2px; height:14px; margin-left:2px; }
                .wm-arav__wave i { display:block; width:3px; height:4px; border-radius:2px; background:#fff; opacity:.9; }
                .wm-arav__wave--on i { animation: wmAravWave .9s ease-in-out infinite; }
                .wm-arav__wave--calm i { animation-duration:1.8s; opacity:.55; }

                @keyframes wmAravBlink { 0%,93%,100% { transform:scaleY(1); } 96% { transform:scaleY(.08); } }
                @keyframes wmAravNod { 0%,100% { transform:rotate(0); } 35% { transform:rotate(-2deg); } 70% { transform:rotate(1.6deg); } }
                @keyframes wmAravBob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-2.5px); } }
                @keyframes wmAravTalk { 0%,100% { transform:scaleY(.25) scaleX(.85); } 50% { transform:scaleY(1) scaleX(1); } }
                @keyframes wmAravDot { 0%,100% { opacity:.3; transform:translateY(0); } 50% { opacity:1; transform:translateY(-3px); } }
                @keyframes wmAravLook { 0%,100% { transform:translate(0,0); } 30% { transform:translate(-3px,-2px); } 70% { transform:translate(3px,-2px); } }
                @keyframes wmAravWave { 0%,100% { height:4px; } 50% { height:13px; } }
                @keyframes wmAravSpin { to { transform:rotate(360deg); } }

                @media (prefers-reduced-motion: reduce) {
                    .wm-arav *, .wm-arav { animation:none !important; transition:none !important; }
                    .wm-arav__wave i { height:8px; }
                }
            `}</style>
        </div>
    )
}
