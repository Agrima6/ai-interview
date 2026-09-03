import React from 'react'
import { motion } from 'motion/react'
import { Clock, Gauge, Sparkles, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MarketingIllustration from './MarketingIllustration'

const MotionDiv = motion.div

const MODES = [
    {
        illustration: 'candidate',
        title: "HR Interview",
        desc: "Behavioral and communication-focused questions that evaluate how you present yourself, handle pressure and articulate your experience.",
        time: "~7 min",
        difficulty: "Adaptive · Easy → Hard",
        aiFeatures: ["Resume parsing", "Voice transcription", "Communication scoring"],
    },
    {
        illustration: 'technical',
        title: "Technical Interview",
        desc: "Role-specific technical questioning grounded in your skills and projects, with difficulty that ramps across five questions.",
        time: "~7 min",
        difficulty: "Adaptive · Easy → Hard",
        aiFeatures: ["Skill-aware questions", "Real-time evaluation", "Correctness scoring"],
    },
]

function InterviewModesSection() {
    const navigate = useNavigate()
    return (
        <div className='grid md:grid-cols-2 gap-6'>
            {MODES.map((mode, i) => {
                return (
                    <MotionDiv
                        key={mode.title}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        onClick={() => navigate('/interview')}
                        className='group cursor-pointer relative bg-card border border-line rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[var(--shadow-lift)]'
                    >
                        <div className='flex items-start justify-between mb-6'>
                            <MarketingIllustration type={mode.illustration} className='h-16 w-24 text-accent transition-transform duration-300 group-hover:scale-[1.03]' />
                            <ArrowUpRight size={18} className='text-text-secondary transition-all duration-300 group-hover:text-ink group-hover:rotate-45' />
                        </div>

                        <h3 className='text-[20px] font-semibold text-ink mb-2.5'>{mode.title}</h3>
                        <p className='text-[14.5px] text-text-secondary leading-relaxed mb-6'>{mode.desc}</p>

                        <div className='flex items-center gap-5 mb-6 text-[13px] text-text-secondary'>
                            <span className='inline-flex items-center gap-1.5'><Clock size={14} className='text-text-secondary' /> {mode.time}</span>
                            <span className='inline-flex items-center gap-1.5'><Gauge size={14} className='text-text-secondary' /> {mode.difficulty}</span>
                        </div>

                        <div className='pt-5 border-t border-line'>
                            <p className='text-[11.5px] font-medium text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5'>
                                <Sparkles size={12} /> AI Features Used
                            </p>
                            <div className='flex flex-wrap gap-2'>
                                {mode.aiFeatures.map((f) => (
                                    <span key={f} className='text-[12.5px] text-text-secondary bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5 rounded-full'>{f}</span>
                                ))}
                            </div>
                        </div>
                    </MotionDiv>
                )
            })}
        </div>
    )
}

export default InterviewModesSection
