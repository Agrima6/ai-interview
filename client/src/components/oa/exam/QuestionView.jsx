import React from 'react'

const LANGUAGE_NAMES = { javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', java: 'Java', cpp: 'C++', c: 'C', go: 'Go', sql: 'SQL' }
const words = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0)

// One question, one answer control. `value` is what the server stores: option ids, text, or { code, language }.
export default function QuestionView({ question: q, value, onChange }) {
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
        const v = value && typeof value === 'object' ? value : { code: q.starterCode || '', language: q.codeLanguages?.[0] }
        const code = value && typeof value === 'object' ? v.code : q.starterCode || ''
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
                <div className='flex items-center justify-between mb-2'>
                    <label htmlFor={`lang-${q.id}`} className='text-[13px] font-semibold text-ink'>Language</label>
                    <select id={`lang-${q.id}`} className='bg-card border border-line rounded-lg px-3 py-1.5 text-[13px]' value={v.language} onChange={(e) => onChange({ code, language: e.target.value })}>
                        {q.codeLanguages.map((l) => <option key={l} value={l}>{LANGUAGE_NAMES[l] || l}</option>)}
                    </select>
                </div>
                <textarea aria-label='Your code' spellCheck={false} autoCapitalize='off' autoCorrect='off' rows={16} maxLength={50000} value={code}
                    onChange={(e) => onChange({ code: e.target.value, language: v.language })}
                    onKeyDown={(e) => {
                        if (e.key === 'Tab') {            // an editor, not a form: Tab indents instead of leaving the box
                            e.preventDefault()
                            const t = e.target; const s = t.selectionStart
                            onChange({ code: `${code.slice(0, s)}    ${code.slice(t.selectionEnd)}`, language: v.language })
                            requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 4 })
                        }
                    }}
                    className={`${areaClass} font-mono text-[13.5px] leading-relaxed bg-[#1a1215] text-[#f4eaea] border-[#3a2a2e]`} />
                <p className='text-[12px] text-text-secondary mt-1.5'>Your code is saved as you type. It is read and marked by your organizer.</p>
            </div>
        )
    }

    const text = typeof value === 'string' ? value : ''
    const max = q.type === 'SHORT' ? 3000 : 20000
    return (
        <div>
            <textarea aria-label='Your answer' rows={q.type === 'SHORT' ? 5 : 12} maxLength={max} value={text} onChange={(e) => onChange(e.target.value)} placeholder='Type your answer here' className={areaClass} />
            <p className='text-[12px] text-text-secondary mt-1.5'>{words(text)} word{words(text) === 1 ? '' : 's'}</p>
        </div>
    )
}
