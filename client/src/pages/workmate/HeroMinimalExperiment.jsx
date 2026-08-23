import React from 'react'
import { ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import heroWorkmate from '../../assets/workmate/hero-workmate.png'
import './HeroMinimalExperiment.css'

function HeroMinimalExperiment() {
    return (
        <section id='home' className='hero-minimal-area scroll-mt-20 relative overflow-hidden'>
            <div className='hero-minimal-ambient hero-minimal-ambient-left' aria-hidden='true' />
            <div className='hero-minimal-ambient hero-minimal-ambient-right' aria-hidden='true' />

            <div className='relative z-10 mx-auto grid max-w-[1280px] items-center gap-14 px-6 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:grid-cols-[1fr_1.05fr] lg:px-8'>
                <div>
                    <p className='hero-minimal-reveal hero-minimal-reveal-eyebrow mb-4 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-accent'>
                        <span className='h-1.5 w-1.5 rounded-full bg-accent' aria-hidden='true' />
                        WorkmateIQ
                    </p>

                    <h1 className='hero-minimal-reveal hero-minimal-reveal-headline mb-6 font-display text-[42px] font-bold leading-[1.03] tracking-tight text-ink sm:text-[62px]'>
                        Where <span className='hero-minimal-gradient gradient-brand-text'>better talent journeys</span> begin.
                    </h1>

                    <p className='hero-minimal-reveal hero-minimal-reveal-copy mb-9 max-w-lg text-[18px] leading-relaxed text-text-secondary'>
                        One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day.
                    </p>

                    <div className='hero-minimal-reveal hero-minimal-reveal-actions flex flex-wrap gap-3'>
                        <Button as='a' href='/#contact' size='lg' className='hero-minimal-primary group'>
                            Send an Enquiry
                            <ArrowRight size={16} className='hero-minimal-arrow transition-transform duration-200 group-hover:translate-x-1' />
                        </Button>
                        <Button as='a' href='/#how-it-works' size='lg' variant='secondary' className='hero-minimal-secondary'>
                            Explore WorkmateIQ
                        </Button>
                    </div>
                </div>

                <div className='hero-minimal-image-reveal relative'>
                    <div className='hero-minimal-image-shell relative overflow-hidden rounded-[28px] border border-line bg-card'>
                        <img src={heroWorkmate} alt='Organizations, colleges and candidates connected through WorkmateIQ' className='w-full h-auto' />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroMinimalExperiment
