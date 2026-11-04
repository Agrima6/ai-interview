import React from 'react'
import { Plus, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

const BARS = [0.5, 0.8, 0.4, 0.9, 0.6, 1, 0.7, 0.45, 0.85, 0.55]

/**
 * Dark hero banner: copy + CTAs on the left, an animated "live interview"
 * card on the right (orbit ring, waveform, floating score chips). Purely
 * decorative, so the mock is aria-hidden and every animation stops under
 * prefers-reduced-motion.
 */
function DashboardHero({ onCreate, onViewAll }) {
    return (
        <section className='ui-rise relative overflow-hidden rounded-[24px] bg-[var(--color-navy)] text-white p-6 sm:p-8 min-h-[260px] flex items-center'>
            <div aria-hidden='true' className='absolute inset-0 opacity-[0.18]' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 75% 50%, black, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at 75% 50%, black, transparent 70%)' }} />
            <div className='relative grid w-full gap-8 md:grid-cols-[1.15fr_1fr] items-center'>
                <div className='min-w-0'>
                    <span className='inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-cyan)]/15 text-[#ffb08a] px-3 py-1 text-[11px] font-bold tracking-[0.08em]'>
                        <Sparkles size={12} /> AI INTERVIEWS
                    </span>
                    <h2 className='mt-4 text-[24px] sm:text-[30px] font-bold leading-[1.1] tracking-[-0.025em]'>
                        Find the right talent, <span className='text-[#aab6ff]'>faster.</span>
                    </h2>
                    <p className='mt-3 max-w-md text-[14px] leading-relaxed text-[#c3c9ee]'>
                        Create interview drives, assess candidates, and make data-driven hiring decisions — all in one place.
                    </p>
                    <div className='mt-6 flex flex-wrap gap-3'>
                        <button onClick={onCreate} className='ui-shine inline-flex items-center gap-2.5 h-11 px-5 rounded-[14px] bg-accent text-white text-[14px] font-bold transition-transform hover:-translate-y-0.5 shadow-[0_14px_28px_-12px_var(--color-accent)]'>
                            <Plus size={18} /> Create Interview Drive
                        </button>
                        <button onClick={onViewAll} className='inline-flex items-center gap-2 h-11 px-5 rounded-[14px] border border-white/25 bg-white/5 text-[14px] font-semibold transition-all hover:-translate-y-0.5 hover:bg-white/15'>
                            View All Drives <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                <div aria-hidden='true' className='relative hidden md:flex items-center justify-center h-[240px]'>
                    <div className='absolute w-[250px] h-[250px] rounded-full border border-dashed border-white/20 animate-[spin_24s_linear_infinite]'>
                        <span className='absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-[var(--color-accent-cyan)]' />
                    </div>
                    <div className='ui-float relative w-[250px] rounded-[18px] bg-white text-ink p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]'>
                        <div className='flex items-center gap-3'>
                            <span className='relative w-9 h-9 rounded-full bg-accent text-white text-[12px] font-bold flex items-center justify-center'>
                                <span className='ui-ping absolute inset-0 rounded-full bg-accent/50' /><span className='relative'>AI</span>
                            </span>
                            <div className='flex flex-col leading-tight'>
                                <span className='text-[13px] font-bold'>Live interview</span>
                                <span className='text-[11.5px] text-text-secondary'>Question 3 of 8</span>
                            </div>
                            <span className='ml-auto w-2 h-2 rounded-full bg-[var(--color-danger)] animate-pulse' />
                        </div>
                        <div className='mt-4 flex items-end gap-1 h-10'>
                            {BARS.map((h, i) => (
                                <span key={i} className='flex-1 rounded-sm bg-accent origin-bottom animate-[wave_1.1s_ease-in-out_infinite]' style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms`, opacity: 0.45 + h * 0.55 }} />
                            ))}
                        </div>
                        <div className='mt-3 h-1.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden'><div className='h-full w-[38%] rounded-full bg-accent' /></div>
                    </div>
                    <span className='ui-float absolute top-3 right-2 rounded-full bg-[var(--color-accent-cyan)] px-3 py-1.5 text-[12px] font-bold shadow-lg' style={{ animationDelay: '-1.5s' }}>Score 86</span>
                    <span className='ui-float absolute bottom-3 left-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#067a55] shadow-lg' style={{ animationDelay: '-3s' }}>
                        <CheckCircle2 size={13} /> Shortlisted
                    </span>
                </div>
            </div>
        </section>
    )
}

export default DashboardHero
