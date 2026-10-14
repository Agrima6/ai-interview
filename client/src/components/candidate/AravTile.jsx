import React from 'react'
import { Mic, Volume2, Loader2 } from 'lucide-react'
import interviewerVideo from '../../assets/videos/arav-interviewer.mp4'

/**
 * Arav, the AI interviewer, shown as a looping video of the interviewer like a participant in a video call.
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
                <video className='wm-arav__video' src={interviewerVideo} autoPlay muted loop playsInline aria-hidden='true' />
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
                .wm-arav__ring { width:100%; aspect-ratio:16/10; border-radius:12px; padding:2px; overflow:hidden; background:rgba(255,255,255,.18); transition:box-shadow .3s, background .3s; }
                .wm-arav__video { display:block; width:100%; height:100%; object-fit:cover; border-radius:10px; background:#1f2a37; }
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
                .wm-arav--connecting .wm-arav__video { filter:grayscale(.6) brightness(.8); }

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
