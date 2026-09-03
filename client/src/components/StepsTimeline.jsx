import React from 'react'
import { motion } from 'motion/react'
import MarketingIllustration from './MarketingIllustration'

const MotionDiv = motion.div

const STEPS = [
    { illustration: 'resume', title: "Upload Resume", desc: "Drop your PDF resume — optional but recommended." },
    { illustration: 'intelligence', title: "AI Analysis", desc: "We extract your role, skills and project history." },
    { illustration: 'voice', title: "Voice Interview", desc: "Answer 5 adaptive questions, spoken or typed." },
    { illustration: 'analytics', title: "AI Evaluation", desc: "Every answer scored on clarity, depth and confidence." },
    { illustration: 'report', title: "Download Report", desc: "Get a full analytics report as a shareable PDF." },
]

function StepsTimeline() {
    return (
        <div className='relative'>
            <div className='hidden lg:block absolute top-7 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent' />
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4'>
                {STEPS.map((step, i) => {
                    return (
                        <MotionDiv
                            key={step.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                            className='group relative flex flex-col items-center text-center lg:items-start lg:text-left'
                        >
                            <div className='relative z-10 h-14 w-20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03]'>
                                <MarketingIllustration type={step.illustration} className='h-14 w-20 text-accent' />
                                <span className='absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center'>{i + 1}</span>
                            </div>
                            <h3 className='text-[15px] font-semibold text-ink mb-1.5'>{step.title}</h3>
                            <p className='text-[13.5px] text-text-secondary leading-relaxed max-w-[200px]'>{step.desc}</p>
                        </MotionDiv>
                    )
                })}
            </div>
        </div>
    )
}

export default StepsTimeline
