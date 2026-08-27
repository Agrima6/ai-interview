import React from 'react'
import { ChartNoAxesCombined, ClipboardCheck, FileChartColumn, Settings2, ShieldEllipsis } from 'lucide-react'

const POWERFUL_FEATURES = [
    {
        title: 'Advanced Security',
        description: 'Secure data handling, protected access and reliable enterprise-grade safeguards.',
        Icon: ShieldEllipsis,
    },
    {
        title: 'AI Evaluation',
        description: 'Evaluate answer quality, communication, problem solving and speaking skills.',
        Icon: ClipboardCheck,
    },
    {
        title: 'Benchmark & Rank',
        description: 'Compare candidates against role-specific benchmarks and generate clear rankings.',
        Icon: ChartNoAxesCombined,
    },
    {
        title: 'Detailed Reports',
        description: 'Get detailed scores, strengths and improvement insights for better decisions.',
        Icon: FileChartColumn,
    },
    {
        title: 'Customizable',
        description: 'Create role specific interview flows tailored to your requirements and competencies.',
        Icon: Settings2,
    },
]

export default function PowerfulFeatures() {
    return (
        <section className='workmate-shell relative py-12 sm:py-14 lg:py-16' aria-labelledby='powerful-features-title'>
            <div className='relative overflow-visible rounded-[28px] border border-line/80 bg-card px-4 pb-7 pt-10 shadow-[0_20px_60px_-42px_rgba(125,39,49,0.45)] sm:px-6 sm:pb-8 sm:pt-12 lg:px-8 lg:pb-9'>
                <div className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_18px_-12px_rgba(125,39,49,0.7)] sm:px-6 sm:text-xs' id='powerful-features-title'>
                    Powerful Features
                </div>

                <div className='grid grid-cols-1 divide-y divide-line/80 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x lg:divide-y-0'>
                    {POWERFUL_FEATURES.map(({ title, description, Icon: FeatureIcon }, index) => (
                        <article key={title} className={`group flex min-w-0 flex-col items-center px-4 py-6 text-center transition-colors duration-[250ms] hover:bg-accent/[0.025] sm:px-5 sm:py-5 lg:px-6 lg:py-4 ${index > 0 ? 'sm:border-l sm:border-line/80 lg:border-l-0' : ''}`}>
                            <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-accent/[0.07] text-accent transition-all duration-[250ms] group-hover:-translate-y-1 group-hover:bg-accent/[0.11] group-hover:text-accent-dark' aria-hidden='true'>
                                {React.createElement(FeatureIcon, { size: 24, strokeWidth: 1.8 })}
                            </span>
                            <h3 className='mt-4 type-component-title leading-snug text-ink transition-colors duration-[250ms] group-hover:text-accent'>{title}</h3>
                            <p className='mt-2 max-w-[220px] type-caption leading-relaxed text-text-secondary'>{description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
