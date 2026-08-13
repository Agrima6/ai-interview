import React from 'react'
import { motion } from 'motion/react'
import { Radio, Mic, Sparkles } from 'lucide-react'

const WAVE_BARS = [6, 14, 9, 20, 12, 24, 10, 18, 8, 15, 11, 22, 7]

const CHAT = [
    { from: 'ai', text: "Tell me about a time you handled a tight deadline." },
    { from: 'user', text: "At my last internship I shipped a feature two days early by…" },
]

/**
 * A polished, fully code-drawn "live interview" product mockup — no stock
 * photography/video, no gif. Built to read like a real screenshot: a
 * video-call-style frame with an animated avatar orb + live waveform on
 * one side, and a transcript/chat panel on the other.
 */
function HeroMockup() {
    return (
        <div className='relative w-full max-w-[460px] mx-auto lg:mx-0'>
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className='relative animate-float'
            >
                <div className='flex items-center gap-2 mb-4'>
                    <span className='w-2 h-2 rounded-full bg-accent animate-pulse' />
                    <span className='text-[13px] font-medium text-ink'>Live AI Interview</span>
                    <span className='ml-auto inline-flex items-center gap-1 text-[11px] text-text-secondary bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1 rounded-full'>
                        <Radio size={10} /> In progress
                    </span>
                </div>

                <div className='relative rounded-[28px] border border-line bg-card shadow-[var(--shadow-lift)] overflow-hidden'>
                    {/* video-call top bar */}
                    <div className='flex items-center gap-2 px-4 py-3 border-b border-line bg-black/[0.02] dark:bg-white/[0.03]'>
                        <span className='w-2.5 h-2.5 rounded-full bg-red-400/70' />
                        <span className='w-2.5 h-2.5 rounded-full bg-amber-400/70' />
                        <span className='w-2.5 h-2.5 rounded-full bg-[var(--color-accent-cyan)]/70' />
                        <span className='ml-3 text-[11.5px] text-text-secondary'>Technical Round · Question 3 / 5</span>
                    </div>

                    {/* AI presence panel */}
                    <div className='relative px-6 pt-8 pb-6 flex flex-col items-center gradient-brand'>
                        <div className='absolute inset-0 bg-noise opacity-40' />
                        <motion.div
                            animate={{ scale: [1, 1.06, 1] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                            className='relative w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center ring-4 ring-white/25'
                        >
                            <Sparkles size={22} className='text-white' />
                        </motion.div>
                        <p className='relative text-white text-[13px] font-medium mt-3'>AI Interviewer</p>

                        {/* live waveform */}
                        <div className='relative flex items-end gap-[3px] h-8 mt-4'>
                            {WAVE_BARS.map((h, i) => (
                                <motion.span
                                    key={i}
                                    className='w-[3px] rounded-full bg-white/80'
                                    animate={{ height: [h * 0.4, h, h * 0.4] }}
                                    transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
                                    style={{ height: h }}
                                />
                            ))}
                        </div>
                        <span className='relative inline-flex items-center gap-1.5 text-[11px] text-white/80 mt-3'>
                            <Mic size={11} /> Listening…
                        </span>
                    </div>

                    {/* transcript / chat bubbles */}
                    <div className='px-5 py-5 space-y-3 bg-card'>
                        {CHAT.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
                                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed ${msg.from === 'user'
                                        ? 'bg-accent text-white rounded-br-sm'
                                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-ink rounded-bl-sm'
                                    }`}>
                                    {msg.text}
                                </div>
                            </motion.div>
                        ))}

                        {/* typing indicator */}
                        <div className='flex items-center gap-1 pl-1'>
                            {[0, 1, 2].map((i) => (
                                <motion.span
                                    key={i}
                                    className='w-1.5 h-1.5 rounded-full bg-text-secondary/50'
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* score preview footer */}
                    <div className='flex items-center justify-between px-5 py-3.5 border-t border-line bg-black/[0.02] dark:bg-white/[0.03]'>
                        <span className='text-[11.5px] text-text-secondary'>Live confidence score</span>
                        <span className='text-[13px] font-semibold gradient-brand-text'>8.4 / 10</span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default HeroMockup
