import React from 'react'
import { motion } from 'motion/react'
import { FileUp, BrainCircuit, Mic, LineChart, Download } from 'lucide-react'

const STEPS = [
    { icon: FileUp, title: "Upload Resume", desc: "Drop your PDF resume — optional but recommended." },
    { icon: BrainCircuit, title: "AI Analysis", desc: "We extract your role, skills and project history." },
    { icon: Mic, title: "Voice Interview", desc: "Answer 5 adaptive questions, spoken or typed." },
    { icon: LineChart, title: "AI Evaluation", desc: "Every answer scored on clarity, depth and confidence." },
    { icon: Download, title: "Download Report", desc: "Get a full analytics report as a shareable PDF." },
]

function StepsTimeline() {
    return (
        <div className='relative'>
            <div className='hidden lg:block absolute top-7 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent' />
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4'>
                {STEPS.map((step, i) => {
                    const Icon = step.icon
                    return (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                            className='group relative flex flex-col items-center text-center lg:items-start lg:text-left'
                        >
                            <div className='relative z-10 w-14 h-14 rounded-2xl bg-card border border-line flex items-center justify-center mb-5 shadow-[var(--shadow-soft)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-accent/40 group-hover:shadow-[var(--shadow-lift)]'>
                                <Icon size={20} strokeWidth={1.75} className='text-ink transition-transform duration-300 group-hover:rotate-6 group-hover:text-accent' />
                                <span className='absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center'>{i + 1}</span>
                            </div>
                            <h3 className='text-[15px] font-semibold text-ink mb-1.5'>{step.title}</h3>
                            <p className='text-[13.5px] text-text-secondary leading-relaxed max-w-[200px]'>{step.desc}</p>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}

export default StepsTimeline
