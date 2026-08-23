import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react'
import {
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react'
import { FaLinkedinIn, FaWhatsapp } from 'react-icons/fa'
import { SiGmail } from 'react-icons/si'
import { NEXA_CONTACTS, NEXA_FAQS } from './interviewFaqConfig'

function NexaAvatar({ size = 21 }) {
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden='true'>
            <path d='M12 2.1v1.5' stroke='#fffafb' strokeWidth='1.4' strokeLinecap='round' />
            <circle cx='12' cy='1.8' r='1' fill='#f6c2c9' />
            <path d='M4.1 10.2H2.8v4h1.3M19.9 10.2h1.3v4h-1.3' stroke='#fffafb' strokeWidth='1.25' strokeLinecap='round' strokeLinejoin='round' />
            <rect x='2.9' y='4.1' width='18.2' height='16.9' rx='6' fill='#fffafb' stroke='#fffafb' strokeWidth='1.1' />
            <rect x='5.2' y='6.6' width='13.6' height='9.7' rx='3.7' fill='#7f0e16' />
            <rect x='7.5' y='9.1' width='2.7' height='3.1' rx='.9' fill='#fffafb' />
            <rect x='13.8' y='9.1' width='2.7' height='3.1' rx='.9' fill='#fffafb' />
            <path d='M9.1 13.6c1.5 1.3 4.3 1.3 5.8 0' stroke='#fffafb' strokeWidth='1.25' strokeLinecap='round' />
            <path d='M8.2 20.9v.7M15.8 20.9v.7' stroke='#fffafb' strokeWidth='1.5' strokeLinecap='round' />
        </svg>
    )
}

function NexaLauncherAvatar({ size = 42 }) {
    return (
        <svg width={size} height={size} viewBox='0 0 48 48' fill='none' aria-hidden='true'>
            <path d='M9 20H5.5v9H9M39 20h3.5v9H39' stroke='#fffafb' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M12 15.5c0-2.5 2-4.5 4.5-4.5h15c2.5 0 4.5 2 4.5 4.5v17c0 3.3-2.7 6-6 6H18c-3.3 0-6-2.7-6-6v-17Z' fill='#fffafb' stroke='#fffafb' strokeWidth='1.5' />
            <rect x='16' y='19' width='16' height='11' rx='4.5' fill='#8f1018' />
            <rect x='19' y='22' width='2.8' height='3.1' rx='1' fill='#fffafb' />
            <rect x='26.2' y='22' width='2.8' height='3.1' rx='1' fill='#fffafb' />
            <path d='M20 27c2.1 1.9 5.9 1.9 8 0' stroke='#fffafb' strokeWidth='1.7' strokeLinecap='round' />
            <path d='M18 38.5v2M30 38.5v2' stroke='#fffafb' strokeWidth='2.2' strokeLinecap='round' />
            <path d='M8.5 16.5h2M37.5 16.5h2' stroke='#f6c2c9' strokeWidth='1.4' strokeLinecap='round' />
        </svg>
    )
}

function ContactCard({ contact, IconComponent }) {
    const ContactIcon = IconComponent

    return (
        <a
            href={contact.href}
            target={contact.external ? '_blank' : undefined}
            rel={contact.external ? 'noreferrer' : undefined}
            className='type-chat-contact group flex h-16 min-w-0 w-full flex-col items-center justify-center overflow-hidden rounded-[14px] border border-[#efd9db] bg-[#fffafa] px-2 py-2 text-center text-[12px] text-accent transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-[#fff1f2] hover:shadow-[0_8px_18px_rgba(127,14,22,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 active:translate-y-0'
        >
            <span className='flex min-w-0 max-w-full items-center justify-center gap-1 whitespace-nowrap'>
                <ContactIcon size={16} className='h-4 w-4 shrink-0' aria-hidden='true' />
                <span className='shrink-0 whitespace-nowrap'>{contact.label}</span>
            </span>
            <span className='mt-1 flex h-3 w-3 items-center justify-center text-accent/55'>
                <ArrowUpRight size={12} className='transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent' aria-hidden='true' />
            </span>
        </a>
    )
}

function ContactActions() {
    const icons = {
        whatsapp: FaWhatsapp,
        gmail: SiGmail,
        linkedin: FaLinkedinIn,
    }

    return (
        <div className='mt-5 grid grid-cols-[1.08fr_1fr_1fr] gap-2.5'>
            {Object.entries(NEXA_CONTACTS).map(([key, contact]) => {
                return <ContactCard key={key} contact={contact} IconComponent={icons[key]} />
            })}
        </div>
    )
}

function ChatbotHeader({ isAnswerView, onBack, onClose }) {
    return (
        <div className='relative flex items-center gap-3 overflow-hidden bg-[linear-gradient(135deg,#b21d2a_0%,#97131e_52%,#7f0e16_100%)] px-5 py-4 text-white'>
            <span className='pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/[0.08] blur-2xl' aria-hidden='true' />
            <span className='pointer-events-none absolute bottom-0 left-0 h-px w-24 bg-white/25' aria-hidden='true' />
            {isAnswerView && (
                <button
                    type='button'
                    onClick={onBack}
                    aria-label='Back to FAQ options'
                    className='-ml-2 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                >
                    <ChevronLeft size={19} strokeWidth={2.2} />
                </button>
            )}
            <div className='relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[radial-gradient(circle_at_35%_28%,#a72a38,#6e1118_72%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_6px_14px_rgba(64,7,12,0.18)]'>
                <NexaAvatar size={30} />
            </div>
            <div className='min-w-0 flex-1'>
                <p className='type-chat-title truncate tracking-[-0.01em]'>Nexa</p>
                <p className='type-chat-status mt-0.5 flex items-center gap-1.5 text-white/75'>
                    <span className='h-1.5 w-1.5 rounded-full bg-[#7ee2a5] shadow-[0_0_0_3px_rgba(126,226,165,0.16)]' aria-hidden='true' />
                    Online now
                </p>
            </div>
            <button
                type='button'
                onClick={onClose}
                aria-label='Close Nexa'
                className='rounded-full p-1.5 text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
            >
                <X size={19} strokeWidth={2.2} />
            </button>
        </div>
    )
}

function FAQOptions({ onSelect }) {
    return (
        <div className='space-y-2.5'>
            {NEXA_FAQS.map((faq) => (
                <button
                    key={faq.id}
                    type='button'
                    onClick={() => onSelect(faq)}
                    className='type-chat-option group flex w-full items-center justify-between gap-3 rounded-[15px] border border-[#efd9db] bg-[#fffdfc] px-4 py-3 text-left leading-snug text-[#7f2026] shadow-[0_3px_12px_rgba(92,18,24,0.025)] transition-all duration-200 hover:translate-x-0.5 hover:border-accent/35 hover:bg-[#fff1f2] hover:shadow-[0_10px_20px_rgba(92,18,24,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 active:translate-x-0'
                >
                    <span>{faq.question}</span>
                    <ChevronRight size={16} className='shrink-0 text-accent/45 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent' aria-hidden='true' />
                </button>
            ))}
        </div>
    )
}

function AnswerView({ faq, onBack }) {
    return (
        <div className='min-h-[360px] space-y-4 sm:min-h-[410px]'>
        <div className='type-chat-option ml-8 rounded-[17px] rounded-tr-md border border-accent/10 bg-accent/[0.07] px-4 py-3 leading-relaxed text-[#7f2026]'>
                {faq.question}
            </div>
            <div className='type-chat-message mr-5 rounded-[18px] rounded-tl-md border border-[#f0e4e4] bg-white px-4 py-4 text-text-secondary shadow-[0_10px_26px_rgba(92,18,24,0.07)]'>
                <p>{faq.answer}</p>
                {faq.showContacts && <ContactActions />}
            </div>
            <button
                type='button'
                onClick={onBack}
                className='type-chat-option inline-flex items-center gap-1.5 px-1 text-accent transition-colors hover:text-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2'
            >
                <ChevronLeft size={15} aria-hidden='true' />
                Back to questions
            </button>
        </div>
    )
}

function NexaChatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedFaq, setSelectedFaq] = useState(null)
    const launcherRef = useRef(null)
    const panelRef = useRef(null)
    const reduceMotion = useReducedMotion()

    useEffect(() => {
        if (!isOpen) return undefined

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setIsOpen(false)
        }
        const handlePointerDown = (event) => {
            if (panelRef.current?.contains(event.target) || launcherRef.current?.contains(event.target)) return
            setIsOpen(false)
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [isOpen])

    const toggleOpen = () => setIsOpen((open) => !open)

    return (
        <div className='fixed bottom-5 right-5 z-[45] sm:bottom-7 sm:right-7'>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <Motion.section
                        ref={panelRef}
                        key='nexa-chatbot-panel'
                        id='nexa-chatbot-panel'
                        initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.97 }}
                        transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                        aria-label='Nexa chatbot'
                        className='absolute bottom-[calc(100%+16px)] right-0 w-[min(380px,calc(100vw-24px))] origin-bottom-right overflow-hidden rounded-[26px] border border-[#ead7d9] bg-[#fffdfc] shadow-[0_30px_82px_-28px_rgba(112,26,34,0.34),0_14px_28px_-18px_rgba(112,26,34,0.2)]'
                    >
                        <ChatbotHeader isAnswerView={Boolean(selectedFaq)} onBack={() => setSelectedFaq(null)} onClose={() => setIsOpen(false)} />
                        <div className='max-h-[min(560px,calc(100dvh-144px))] overflow-y-auto px-4 py-5 sm:px-5'>
                            <AnimatePresence mode='wait' initial={false}>
                                {selectedFaq ? (
                                    <Motion.div
                                        key={selectedFaq.id}
                                        initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                                    >
                                        <AnswerView faq={selectedFaq} onBack={() => setSelectedFaq(null)} />
                                    </Motion.div>
                                ) : (
                                    <Motion.div
                                        key='nexa-faq-options'
                                        initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
                                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                                        className='min-h-[360px] sm:min-h-[410px]'
                                    >
                                        <div className='type-chat-message mb-5 max-w-[310px] rounded-[18px] rounded-tl-[6px] border border-[#f0e4e4] bg-white px-4 py-3.5 text-[#43282b] shadow-[0_10px_26px_rgba(92,18,24,0.07)]'>
                                            <strong className='font-semibold'>Hi! 👋 I&apos;m Nexa, WorkmateIQ&apos;s virtual assistant. What would you like to know?</strong>
                                        </div>
                                        <FAQOptions onSelect={setSelectedFaq} />
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Motion.section>
                )}
            </AnimatePresence>

            <button
                ref={launcherRef}
                type='button'
                onClick={toggleOpen}
                aria-expanded={isOpen}
                aria-controls='nexa-chatbot-panel'
                aria-label={isOpen ? 'Close Nexa' : 'Open Nexa'}
                className='group relative flex h-14 w-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_24%,#d13a48_0%,#bd242b_36%,#8f1018_100%)] text-white shadow-[0_16px_32px_-14px_rgba(127,14,22,0.75),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-[1.07] hover:shadow-[0_20px_38px_-13px_rgba(127,14,22,0.86),0_0_0_7px_rgba(196,22,31,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 active:scale-[0.98] sm:h-16 sm:w-16'
            >
                <span className='absolute inset-1 rounded-full border border-white/20' aria-hidden='true' />
                <span className='pointer-events-none absolute left-3 top-2.5 h-2 w-5 rounded-full bg-white/20 blur-[3px]' aria-hidden='true' />
                <AnimatePresence mode='wait' initial={false}>
                    <Motion.span
                        key={isOpen ? 'close' : 'nexa'}
                        initial={reduceMotion ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.6, rotate: isOpen ? -35 : 35 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={reduceMotion ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.6, rotate: isOpen ? 35 : -35 }}
                        transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                        className='relative'
                    >
                        {isOpen ? <X size={28} strokeWidth={1.8} /> : <NexaLauncherAvatar size={42} />}
                    </Motion.span>
                </AnimatePresence>
                {!isOpen && (
                    <span className='absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-[#fffaf9] bg-[#f1bf4c] shadow-[0_3px_8px_rgba(92,18,24,0.2)]' aria-label='New assistant message'>
                        <span className='motion-safe:animate-ping absolute inset-0 rounded-full bg-[#f1bf4c]/45' aria-hidden='true' />
                    </span>
                )}
            </button>
        </div>
    )
}

export default NexaChatbot
