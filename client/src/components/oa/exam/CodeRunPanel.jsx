import React, { useState } from 'react'
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react'
import { examApi } from '../../../api/oaApi'
import Button from '../../Button'

const VERDICTS = { WRONG_ANSWER: 'Wrong answer', COMPILE_ERROR: 'Did not compile', RUNTIME_ERROR: 'Crashed while running', TIME_LIMIT: 'Took too long', ERROR: 'Could not run' }

const Block = ({ label, children, tone }) => (
    <div className='min-w-0'>
        <div className='text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1'>{label}</div>
        <pre className={`font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-words rounded-lg px-3 py-2 max-h-40 overflow-auto select-text ${tone === 'bad' ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'bg-surface-muted text-ink'}`}>{children === '' ? <span className='text-text-secondary'>(empty)</span> : children}</pre>
    </div>
)

/**
 * "Run" for a coding question, like a coding practice site: the code runs against the sample test cases and each one
 * shows its input, the expected output, your output and a pass or fail. Hidden test cases are only run after submitting.
 * `runnable` is the list of languages this server can run; it is empty when no code runner is set up.
 */
export default function CodeRunPanel({ question: q, language, code, runnable = [] }) {
    const [running, setRunning] = useState(false)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [shown, setShown] = useState(0)
    const [custom, setCustom] = useState('')
    const [useCustom, setUseCustom] = useState(false)
    const canRun = runnable.includes(language)
    const hasSamples = (q.sampleCases || []).length > 0

    const run = async () => {
        if (running) return
        setRunning(true); setError('')
        try {
            const body = { questionId: q.id, language, code, ...(useCustom || !hasSamples ? { customInput: custom } : {}) }
            const r = await examApi.runCode(body)
            setData(r); setShown(0)
        } catch (err) { setData(null); setError(err.message) } finally { setRunning(false) }
    }

    if (!runnable.length) return <p className='text-[12px] text-text-secondary mt-2'>Running code is not available for this test. Your code is saved as you type and your organizer will review it.</p>
    const current = data?.results?.[shown]
    const custMode = data?.custom
    const compileFailed = data?.results?.some((r) => r.verdict === 'COMPILE_ERROR')

    return (
        <div className='mt-3 rounded-2xl border border-line bg-card overflow-hidden' aria-label='Run your code'>
            <div className='flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line'>
                <Button size='sm' onClick={run} disabled={running || !canRun || !String(code).trim()} title={canRun ? undefined : 'This language cannot be run here'}>
                    {running ? <Loader2 size={14} className='animate-spin' /> : <Play size={14} className='fill-current' />} {running ? 'Running…' : useCustom || !hasSamples ? 'Run with my input' : 'Run sample tests'}
                </Button>
                {hasSamples && (
                    <button type='button' onClick={() => { setUseCustom((v) => !v); setData(null); setError('') }} className='text-[12.5px] font-semibold text-accent hover:underline'>{useCustom ? 'Use the sample tests' : 'Try my own input'}</button>
                )}
                {!canRun && <span className='text-[12px] text-text-secondary'>This language cannot be run here. Your code is still saved.</span>}
                {data && !custMode && (
                    <span role='status' className={`ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold ${data.passed === data.total ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                        {data.passed === data.total ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {compileFailed ? 'Did not compile' : `${data.passed} of ${data.total} sample test${data.total === 1 ? '' : 's'} passed`}
                    </span>
                )}
            </div>

            {(useCustom || !hasSamples) && (
                <div className='px-4 pt-3'>
                    <label htmlFor={`custom-${q.id}`} className='block text-[12px] font-semibold text-ink mb-1'>Your input (what the program reads)</label>
                    <textarea id={`custom-${q.id}`} rows={3} maxLength={5000} value={custom} onChange={(e) => setCustom(e.target.value)} spellCheck={false} className='w-full font-mono text-[12.5px] bg-card border border-line rounded-lg px-3 py-2 outline-none focus:border-accent select-text' />
                </div>
            )}

            {error && <p role='alert' className='px-4 py-3 text-[13px] text-[var(--color-danger)]'>{error}</p>}

            {data && (
                <div className='p-4 space-y-3'>
                    {!custMode && data.results.length > 1 && (
                        <div role='tablist' aria-label='Sample test cases' className='flex flex-wrap gap-1.5'>
                            {data.results.map((r, i) => (
                                <button key={i} role='tab' aria-selected={shown === i} onClick={() => setShown(i)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border ${shown === i ? 'border-ink bg-ink text-white' : 'border-line text-text-secondary hover:border-accent/40'}`}>
                                    {r.passed ? <CheckCircle2 size={13} className={shown === i ? '' : 'text-[var(--color-success)]'} /> : <XCircle size={13} className={shown === i ? '' : 'text-[var(--color-danger)]'} />} Case {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                    {current && (
                        <div className='grid gap-3 sm:grid-cols-2'>
                            {!custMode && <p className={`sm:col-span-2 text-[13px] font-bold ${current.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{current.passed ? 'Passed' : VERDICTS[current.verdict] || 'Failed'}{current.timeMs !== null && current.timeMs !== undefined ? <span className='font-normal text-text-secondary'> · {current.timeMs} ms</span> : null}</p>}
                            {custMode && current.verdict !== 'OK' && <p className='sm:col-span-2 text-[13px] font-bold text-[var(--color-danger)]'>{VERDICTS[current.verdict] || 'Failed'}</p>}
                            <Block label='Input'>{current.input}</Block>
                            {!custMode && <Block label='Expected output'>{current.expected}</Block>}
                            <div className='sm:col-span-2'><Block label='Your output' tone={current.passed === false && current.verdict !== 'WRONG_ANSWER' ? 'bad' : undefined}>{current.output}</Block></div>
                            {current.error && <div className='sm:col-span-2'><Block label={current.verdict === 'COMPILE_ERROR' ? 'Compiler message' : 'Error'} tone='bad'>{current.error}</Block></div>}
                        </div>
                    )}
                    <p className='text-[11.5px] text-text-secondary'>Your final score also counts test cases you cannot see. Trailing spaces and blank lines at the end are ignored.</p>
                </div>
            )}
        </div>
    )
}
