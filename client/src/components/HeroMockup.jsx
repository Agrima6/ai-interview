import React from 'react'
import { motion } from 'motion/react'
import { Radio } from 'lucide-react'

const INTERVIEW_GIF = "https://assets-v2.lottiefiles.com/a/4ab59f98-1171-11ee-ae84-4701bf3b3b9e/MuEl9pAZMr.gif"

function HeroMockup() {
    return (
        <div className='relative w-full max-w-[460px] mx-auto lg:mx-0'>
            {/* background glow */}
            <div className='absolute -inset-10 bg-[radial-gradient(closest-side,rgba(224,39,27,0.16),transparent)] blur-2xl -z-10' />

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

                <img
                    src={INTERVIEW_GIF}
                    alt="AI interviewer animation"
                    className='w-full h-auto object-contain'
                />
            </motion.div>
        </div>
    )
}

export default HeroMockup
