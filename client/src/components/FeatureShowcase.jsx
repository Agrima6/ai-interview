import React from 'react'
import { motion } from 'motion/react'
import { BarChart3, FileText, FileDown, History } from 'lucide-react'

const FEATURES = [
    {
        icon: BarChart3,
        eyebrow: "Answer Evaluation",
        title: "Every answer scored like a real interviewer would.",
        desc: "Our AI grades confidence, communication and correctness on a 10-point scale for each response — with short, honest feedback you can actually act on.",
        image: "evalImg",
    },
    {
        icon: FileText,
        eyebrow: "Resume Intelligence",
        title: "Questions built around your actual experience.",
        desc: "Upload your resume and we extract your role, skills and projects — so the interview asks about what you've actually built, not generic trivia.",
        image: "resumeImg",
    },
    {
        icon: FileDown,
        eyebrow: "Reporting",
        title: "A polished report you can take with you.",
        desc: "Every session ends with a downloadable PDF — score breakdown, strengths, and a clear path to improvement, ready to share or revisit.",
        image: "pdfImg",
    },
    {
        icon: History,
        eyebrow: "Progress Tracking",
        title: "Watch your interview skills compound over time.",
        desc: "Every attempt is saved to your history with full analytics, so you can track score trends across roles, modes and sessions.",
        image: "analyticsImg",
    },
]

function FeatureShowcase({ images }) {
    return (
        <div className='space-y-28 lg:space-y-36'>
            {FEATURES.map((f, i) => {
                const Icon = f.icon
                const reversed = i % 2 === 1
                return (
                    <motion.div
                        key={f.title}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.6 }}
                        className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}
                    >
                        <div className='relative'>
                            <div className='absolute -inset-6 bg-[radial-gradient(closest-side,rgba(99,102,241,0.10),transparent)] -z-10' />
                            <div className='rounded-2xl border border-line bg-card shadow-[var(--shadow-soft)] p-3 hover:shadow-[var(--shadow-lift)] transition-shadow duration-300'>
                                <img src={images[f.image]} alt={f.title} className='w-full h-auto object-contain max-h-[280px] mx-auto' />
                            </div>
                        </div>

                        <div>
                            <div className='inline-flex items-center gap-2 text-[12.5px] font-medium text-accent bg-accent/10 px-3 py-1.5 rounded-full mb-5'>
                                <Icon size={14} />
                                {f.eyebrow}
                            </div>
                            <h3 className='text-[28px] sm:text-[32px] font-semibold text-ink leading-[1.2] mb-4 text-balance'>{f.title}</h3>
                            <p className='text-[16px] text-text-secondary leading-relaxed max-w-md'>{f.desc}</p>
                        </div>
                    </motion.div>
                )
            })}
        </div>
    )
}

export default FeatureShowcase
