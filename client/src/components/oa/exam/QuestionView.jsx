import React from 'react'
import { languageLabel } from '../oaLanguages'
import VideoAnswer from './VideoAnswer'
import CodeRunPanel from './CodeRunPanel'

const words = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0)

// One question, one answer control. `value` is what the server stores: option ids, text, or { code, language }.
export default function QuestionView({ question: q, value, onChange, runnable = [] }) {
    const areaClass = 'w-full bg-card border-[1.5px] border-line rounded-xl px-4 py-3 text-[15px] text-ink outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/15 select-text'

    if (q.type === 'MCQ' || q.type === 'MSQ') {
        const chosen = Array.isArray(value) ? value : []
        const toggle = (id) => onChange(q.type === 'MCQ' ? [id] : chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id])
        return (
            <fieldset>
                <legend className='sr-only'>Answer options</legend>
                <p className='text-[12.5px] text-text-secondary mb-3'>{q.type === 'MCQ' ? 'Choose one answer.' : 'Choose all that apply.'}{q.negativeMarks > 0 && ` A wrong answer loses ${q.negativeMarks}.`}</p>
                <div className='space-y-2.5'>
                    {q.options.map((o, i) => {
                        const on = chosen.includes(o.id)
                        return (
                            <label key={o.id} className={`flex items-start gap-3 rounded-xl border-[1.5px] px-4 py-3 cursor-pointer transition-colors ${on ? 'border-accent bg-accent/5' : 'border-line hover:border-accent/40'}`}>
                                <input type={q.type === 'MCQ' ? 'radio' : 'checkbox'} name={`q-${q.id}`} checked={on} onChange={() => toggle(o.id)} className='mt-1 w-4 h-4 accent-[var(--color-accent)] shrink-0' />
                                <span className='text-[15px] text-ink'><span className='font-semibold text-text-secondary mr-2'>{String.fromCharCode(65 + i)}.</span>{o.text}</span>
                            </label>
                        )
                    })}
                </div>
                {chosen.length > 0 && <button type='button' onClick={() => onChange([])} className='mt-3 text-[12.5px] font-semibold text-text-secondary hover:text-ink'>Clear my answer</button>}
            </fieldset>
        )
    }

    if (q.type === 'CODING') {
        const languages = q.codeLanguages?.length ? q.codeLanguages : ['javascript']
        const starterFor = (lang) => q.starterCodes?.[lang] ?? (lang === languages[0] ? q.starterCode : '') ?? ''
        const v = value && typeof value === 'object' && !Array.isArray(value) ? value : null
        const language = v?.language && languages.includes(v.language) ? v.language : languages[0]
        const code = v ? v.code ?? '' : starterFor(language)
        // Switching language swaps the starter snippet in, but only while the candidate has not written their own code.
        const switchTo = (next) => {
            const untouched = !code.trim() || Object.values({ ...q.starterCodes, '': q.starterCode }).some((s) => s && s === code)
            onChange({ code: untouched ? starterFor(next) : code, language: next })
        }
        return (
            <div>
                {q.sampleCases?.length > 0 && (
                    <div className='mb-4 grid sm:grid-cols-2 gap-3'>
                        {q.sampleCases.map((c, i) => (
                            <div key={i} className='rounded-xl border border-line bg-surface-muted p-3 text-[12.5px] font-mono'>
                                <div className='font-sans font-semibold text-text-secondary mb-1'>Example {i + 1}</div>
                                <div><span className='text-text-secondary'>Input: </span><span className='whitespace-pre-wrap'>{c.input}</span></div>
                                <div><span className='text-text-secondary'>Output: </span><span className='whitespace-pre-wrap'>{c.expected}</span></div>
                            </div>
                        ))}
                    </div>
                )}
                <div className='flex items-center justify-between mb-2 gap-3'>
                    <label htmlFor={`lang-${q.id}`} className='text-[13px] font-semibold text-ink'>Language</label>
                    <select id={`lang-${q.id}`} className='bg-card border border-line rounded-lg px-3 py-1.5 text-[13px] min-w-[150px]' value={language} onChange={(e) => switchTo(e.target.value)}>
                        {languages.map((l) => <option key={l} value={l}>{languageLabel(l)}</option>)}
                    </select>
                </div>
                <textarea aria-label='Your code' spellCheck={false} autoCapitalize='off' autoCorrect='off' rows={16} maxLength={50000} value={code}
                    onChange={(e) => onChange({ code: e.target.value, language })}
                    onKeyDown={(e) => {
                        if (e.key === 'Tab') {            // an editor, not a form: Tab indents instead of leaving the box
                            e.preventDefault()
                            const t = e.target; const s = t.selectionStart
                            onChange({ code: `${code.slice(0, s)}    ${code.slice(t.selectionEnd)}`, language })
                            requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 4 })
                        }
                    }}
                    className='w-full rounded-xl px-4 py-3 font-mono text-[13.5px] leading-relaxed select-text outline-none transition-all bg-[#1a1215] text-[#f4eaea] border-[1.5px] border-[#3a2a2e] caret-white focus:border-accent focus:ring-4 focus:ring-accent/20' />
                <CodeRunPanel question={q} language={language} code={code} runnable={runnable} />
                <p className='text-[12px] text-text-secondary mt-2'>Your code is saved as you type.{runnable.length ? ' When you submit, every test case is run to score it.' : ' It is read and marked by your organizer.'}</p>
            </div>
        )
    }

    if (q.type === 'VIDEO') return <VideoAnswer question={q} value={value} onChange={onChange} />

    const text = typeof value === 'string' ? value : ''
    const max = q.type === 'SHORT' ? 3000 : 20000
    return (
        <div>
            <textarea aria-label='Your answer' rows={q.type === 'SHORT' ? 5 : 12} maxLength={max} value={text} onChange={(e) => onChange(e.target.value)} placeholder='Type your answer here' className={areaClass} />
            <p className='text-[12px] text-text-secondary mt-1.5'>{words(text)} word{words(text) === 1 ? '' : 's'}</p>
        </div>
    )
}
