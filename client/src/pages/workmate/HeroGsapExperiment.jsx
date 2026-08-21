import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import ProductMockup from './ProductMockup'

const EYEBROW = 'text-[13px] tracking-[0.16em] uppercase text-accent font-semibold mb-4'

function HeroGsapExperiment() {
    const navigate = useNavigate()

    const jump = (id) => (event) => {
        event.preventDefault()
        navigate(`/#${id}`)
    }

    return (
        <section id='home' className='relative isolate overflow-hidden scroll-mt-20'>
            <div className='pointer-events-none absolute top-[-160px] left-[8%] h-[560px] w-[620px] rounded-full opacity-[0.11] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #c4161f, transparent)' }} />
            <div className='pointer-events-none absolute top-[60px] right-[-160px] h-[380px] w-[380px] rounded-full opacity-[0.10] blur-3xl'
                style={{ background: 'radial-gradient(closest-side, #e0271b, transparent)' }} />

            <div className='relative mx-auto grid max-w-[1280px] items-center gap-10 px-6 pb-14 pt-28 sm:gap-14 sm:pb-20 sm:pt-32 lg:grid-cols-[1fr_1.05fr] lg:px-8'>
                <div>
                    <p className={`${EYEBROW} inline-flex items-center gap-2`}>
                        <span className='h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow' />
                        WorkmateIQ
                    </p>
                    <h1 className='font-display mb-6 text-[42px] font-bold leading-[1.03] tracking-tight text-ink sm:text-[62px]'>
                        Where <span className='gradient-brand-text'>better talent journeys</span> begin.
                    </h1>
                    <p className='mb-9 max-w-lg text-[18px] leading-relaxed text-text-secondary'>
                        One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day.
                    </p>
                    <div className='flex flex-wrap gap-3'>
                        <Button size='lg' className='group' onClick={jump('contact')}>
                            Get Started
                            <ArrowRight size={16} className='transition-transform duration-300 group-hover:translate-x-1' />
                        </Button>
                        <Button size='lg' variant='secondary' onClick={jump('how-it-works')}>Explore WorkmateIQ</Button>
                    </div>
                </div>

                <ProductMockup />
            </div>
        </section>
    )
}

export default HeroGsapExperiment
