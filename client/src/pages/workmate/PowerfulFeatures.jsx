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
        <section className='workmate-shell relative py-10 md:py-10 lg:py-16' aria-labelledby='powerful-features-title'>
            <div className='relative overflow-visible rounded-[28px] border border-line/80 bg-card px-4 pb-5 pt-9 shadow-[0_20px_60px_-42px_rgba(125,39,49,0.45)] md:px-5 md:pb-6 md:pt-10 lg:px-8 lg:pb-9 lg:pt-12'>
                <div className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_18px_-12px_rgba(125,39,49,0.7)] sm:px-6 sm:text-xs' id='powerful-features-title'>
                    Powerful Features
                </div>

                <div className='grid grid-cols-1 divide-y divide-line/80 lg:grid-cols-5 lg:divide-x lg:divide-y-0'>
                    {POWERFUL_FEATURES.map(({ title, description, Icon: FeatureIcon }) => (
                        <article key={title} className='group grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 px-2 py-4 text-left transition-colors duration-[250ms] hover:bg-accent/[0.025] md:gap-x-4 md:px-4 md:py-4 lg:flex lg:flex-col lg:items-center lg:px-6 lg:py-4 lg:text-center'>
                            <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-accent/[0.07] text-accent transition-all duration-[250ms] group-hover:-translate-y-1 group-hover:bg-accent/[0.11] group-hover:text-accent-dark lg:h-11 lg:w-11' aria-hidden='true'>
                                {React.createElement(FeatureIcon, { size: 24, strokeWidth: 1.8, className: 'h-[22px] w-[22px] lg:h-6 lg:w-6' })}
                            </span>
                            <div className='min-w-0 lg:flex lg:flex-col lg:items-center'>
                                <h3 className='type-component-title leading-snug text-ink transition-colors duration-[250ms] group-hover:text-accent lg:mt-4'>{title}</h3>
                                <p className='mt-1.5 max-w-none type-caption leading-relaxed text-text-secondary lg:mt-2 lg:max-w-[220px]'>{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
