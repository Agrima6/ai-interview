import React, { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import Button from '../../components/Button'
import heroWorkmate from '../../assets/workmate/hero-workmate.png'
import './HeroHoverExperiment.css'

function HeroHoverExperiment() {
    const areaRef = useRef(null)
    const textRef = useRef(null)
    const imageRef = useRef(null)
    const neutralWordsRef = useRef([])
    const frameRef = useRef(0)
    const pointerRef = useRef({ x: 0, y: 0, imageX: 0, imageY: 0, active: false })

    useEffect(() => {
        const area = areaRef.current
        const text = textRef.current
        const image = imageRef.current
        if (!area || !text || !image) return undefined

        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

        const paintPointer = () => {
            const { x, y, imageX, imageY, active } = pointerRef.current
            area.style.setProperty('--hover-x', `${x}px`)
            area.style.setProperty('--hover-y', `${y}px`)
            area.style.setProperty('--background-shift-x', `${(x / area.clientWidth - 0.5) * 18}px`)
            area.style.setProperty('--image-x', `${imageX}px`)
            area.style.setProperty('--image-y', `${imageY}px`)
            area.classList.toggle('hero-hover-pointer-active', active)

            neutralWordsRef.current.forEach((word) => {
                if (!word) return
                const bounds = word.getBoundingClientRect()
                const distanceX = x + area.getBoundingClientRect().left - (bounds.left + bounds.width / 2)
                const distanceY = y + area.getBoundingClientRect().top - (bounds.top + bounds.height / 2)
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)
                const influence = Math.max(0, 1 - distance / 260)
                word.style.setProperty('--word-shift-x', `${Math.max(-1, Math.min(1, distanceX / 90)) * influence}px`)
                word.style.setProperty('--word-shift-y', `${-2 * influence}px`)
                word.style.setProperty('--word-opacity', `${0.9 + influence * 0.1}`)
            })
            frameRef.current = 0
        }

        const onMove = (event) => {
            if (motionQuery.matches) return
            const areaBounds = area.getBoundingClientRect()
            const textBounds = text.getBoundingClientRect()
            const imageBounds = image.getBoundingClientRect()
            const x = event.clientX - areaBounds.left
            const y = event.clientY - areaBounds.top
            const insideImage = event.clientX >= imageBounds.left && event.clientX <= imageBounds.right && event.clientY >= imageBounds.top && event.clientY <= imageBounds.bottom
            const imagePx = insideImage ? ((event.clientX - imageBounds.left) / imageBounds.width - 0.5) * 3 : 0
            const imagePy = insideImage ? ((event.clientY - imageBounds.top) / imageBounds.height - 0.5) * 3 : 0

            pointerRef.current = {
                x,
                y,
                imageX: imagePx,
                imageY: imagePy,
                active: x >= 0 && y >= 0 && x <= areaBounds.width && y <= areaBounds.height,
            }
            area.style.setProperty('--gradient-shift', `${((event.clientX - textBounds.left) / textBounds.width - 0.5) * 18}px`)
            if (!frameRef.current) frameRef.current = window.requestAnimationFrame(paintPointer)
        }

        const onLeave = () => {
            pointerRef.current = { x: 0, y: 0, imageX: 0, imageY: 0, active: false }
            area.style.setProperty('--gradient-shift', '0px')
            if (!frameRef.current) frameRef.current = window.requestAnimationFrame(paintPointer)
        }

        area.addEventListener('mousemove', onMove, { passive: true })
        area.addEventListener('mouseleave', onLeave, { passive: true })

        return () => {
            area.removeEventListener('mousemove', onMove)
            area.removeEventListener('mouseleave', onLeave)
            if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
        }
    }, [])

    return (
        <section ref={areaRef} id='home' className='hero-hover-area scroll-mt-20 relative overflow-hidden'>
            <div className='hero-hover-ambient hero-hover-ambient-left' aria-hidden='true' />
            <div className='hero-hover-ambient hero-hover-ambient-right' aria-hidden='true' />

            <div className='relative z-10 mx-auto grid max-w-[1280px] items-center gap-14 px-6 pb-16 pt-24 sm:pb-20 sm:pt-28 lg:grid-cols-[1fr_1.05fr] lg:px-8'>
                <div ref={textRef} className='hero-hover-text-area'>
                    <p className='hero-hover-entrance hero-hover-label mb-4 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-accent'>
                        <span className='h-1.5 w-1.5 rounded-full bg-accent transition-transform duration-200 group-hover:scale-125' aria-hidden='true' />
                        WorkmateIQ
                    </p>

                    <h1 className='hero-hover-entrance hero-hover-headline mb-6 font-display text-[42px] font-bold leading-[1.03] tracking-tight text-ink sm:text-[62px]'>
                        <span ref={(node) => { neutralWordsRef.current[0] = node }} className='hero-hover-neutral-word'>Where</span>{' '}
                        <span className='hero-hover-gradient-wrap'>
                            <span className='hero-hover-gradient'>better talent journeys</span>
                        </span>{' '}
                        <span ref={(node) => { neutralWordsRef.current[1] = node }} className='hero-hover-neutral-word'>begin.</span>
                    </h1>

                    <p className='hero-hover-entrance hero-hover-copy mb-9 max-w-lg text-[18px] leading-relaxed text-text-secondary'>
                        One intelligent platform for hiring, onboarding and connecting people with opportunity — from first interaction to first day.
                    </p>

                    <div className='hero-hover-entrance hero-hover-actions flex flex-wrap gap-3'>
                        <Button as='a' href='/#contact' size='lg' className='hero-hover-primary group'>
                            Send an Enquiry
                            <ArrowRight size={16} className='hero-hover-arrow transition-transform duration-200 group-hover:translate-x-1' />
                        </Button>
                        <Button as='a' href='/#how-it-works' size='lg' variant='secondary' className='hero-hover-secondary'>
                            Explore WorkmateIQ
                        </Button>
                    </div>
                </div>

                <div className='hero-hover-image-reveal hero-hover-entrance relative'>
                    <div ref={imageRef} className='hero-hover-image-shell relative overflow-hidden rounded-[28px] border border-line bg-card'>
                        <img src={heroWorkmate} alt='Organizations, colleges and candidates connected through WorkmateIQ' className='w-full h-auto' />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroHoverExperiment
