import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import AIInterviewerFigure from './AIInterviewerFigure'

const FORM_DURATION_MS = 2600

// Full-screen cinematic that plays once, right after the candidate enters
// the proctored session: a point of light resolves into the AI interviewer
// (AIInterviewerFigure), then it greets the candidate by name (spoken via
// the same TTS pipeline used in the interview itself) before handing off.
function InterviewIntro({ candidateName, isHinglish, speakText, onComplete }) {
    const [formProgress, setFormProgress] = useState(0)
    const [phase, setPhase] = useState('forming') // forming -> greeting -> done
    const [line, setLine] = useState('')
    const cancelledRef = useRef(false)

    useEffect(() => {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

        if (reduceMotion) {
            setFormProgress(1)
        } else {
            const start = performance.now()
            let raf
            const tick = (now) => {
                const p = Math.min(1, (now - start) / FORM_DURATION_MS)
                setFormProgress(p)
                if (p < 1 && !cancelledRef.current) raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
            return () => cancelAnimationFrame(raf)
        }
    }, [])

    useEffect(() => {
        if (formProgress < 1 || phase !== 'forming') return
        cancelledRef.current = false

        const lines = isHinglish
            ? [
                `Hi ${candidateName || 'there'}.`,
                'Welcome to your interview.',
                'Main aapse kuch questions puchunga - hope aap ready feel kar rahe ho.',
                "Chaliye, shuru karte hain.",
            ]
            : [
                `Hi ${candidateName || 'there'}.`,
                'Welcome to your interview.',
                "I hope you're doing well today.",
                "Let's begin.",
            ]

        const run = async () => {
            setPhase('greeting')
            for (const text of lines) {
                if (cancelledRef.current) return
                setLine(text)
                if (typeof speakText === 'function') {
                    await speakText(text)
                } else {
                    await new Promise((r) => setTimeout(r, 1400))
                }
            }
            if (cancelledRef.current) return
            setLine('')
            setPhase('done')
            await new Promise((r) => setTimeout(r, 500))
            if (!cancelledRef.current) onComplete?.()
        }
        run()

        return () => { cancelledRef.current = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formProgress, phase])

    return (
        <div className='fixed inset-0 z-[200] bg-[#0a0507] flex items-center justify-center overflow-hidden'>
            <AIInterviewerFigure
                state={phase === 'greeting' && line ? 'speaking' : 'idle'}
                formProgress={formProgress}
                className='absolute inset-0'
            />

            <AnimatePresence mode='wait'>
                {line && (
                    <motion.p
                        key={line}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.4 }}
                        className='absolute bottom-[14%] left-1/2 -translate-x-1/2 w-[90%] max-w-lg text-center text-white text-[19px] sm:text-[22px] font-medium leading-relaxed px-4'>
                        {line}
                    </motion.p>
                )}
            </AnimatePresence>

            {formProgress < 1 && (
                <p className='absolute bottom-[8%] left-1/2 -translate-x-1/2 text-white/40 text-[12px] tracking-wide uppercase'>
                    Initializing interviewer...
                </p>
            )}
        </div>
    )
}

export default InterviewIntro
