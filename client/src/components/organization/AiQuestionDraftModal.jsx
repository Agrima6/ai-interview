import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Wand2 } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button } from '../ui'
import { useToast } from '../ui/Toast'
import { generateInterviewQuestions } from '../../api/organization/organizationApi'

/** The hiring team describes the interview and how many questions; the AI drafts them; they tick the ones to keep. */
export default function AiQuestionDraftModal({ open, onClose, topics = [], onAdd }) {
  const toast = useToast()
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState('5')
  const [drafts, setDrafts] = useState(null)
  const [picked, setPicked] = useState(new Set())
  const [error, setError] = useState('')

  const n = Number(count)
  const countError = !Number.isInteger(n) || n < 1 || n > 20 ? 'Choose a number from 1 to 20.' : ''
  const promptError = prompt.trim().length < 10 ? 'Describe the role, level and skills (at least 10 characters).' : ''

  const generate = useMutation({
    mutationFn: () => generateInterviewQuestions({ prompt: prompt.trim(), count: n, topics }),
    onSuccess: (r) => { setDrafts(r.questions); setPicked(new Set(r.questions.map((_, i) => i))); setError('') },
    onError: (err) => setError(err.message),
  })
  const close = () => { if (generate.isPending) return; setDrafts(null); setError(''); onClose() }
  const add = () => {
    const chosen = drafts.filter((_, i) => picked.has(i))
    onAdd(chosen)
    toast.success(`${chosen.length} question${chosen.length === 1 ? '' : 's'} added.`)
    setDrafts(null); setPrompt(''); onClose()
  }

  return (
    <Modal open={open} onClose={close} title='Write questions with AI' size='lg'
      footer={drafts
        ? <><Button type='button' variant='secondary' size='sm' onClick={() => setDrafts(null)}>Back</Button><Button type='button' size='sm' disabled={!picked.size} onClick={add}>Add {picked.size} selected</Button></>
        : <><Button type='button' variant='secondary' size='sm' onClick={close}>Cancel</Button><Button type='button' size='sm' disabled={Boolean(promptError) || Boolean(countError) || generate.isPending} onClick={() => generate.mutate()}><Wand2 size={14} /> {generate.isPending ? 'Writing…' : 'Write questions'}</Button></>}>
      {error && <div role='alert' className='mb-4 text-[13px] text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-xl px-3.5 py-2.5'>{error}</div>}
      {!drafts ? (
        <div className='space-y-4'>
          <div>
            <label htmlFor='ai-q-prompt' className='block text-[12.5px] font-semibold text-ink mb-1.5'>What should the interview cover?</label>
            <textarea id='ai-q-prompt' rows={4} maxLength={2000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder='e.g. Backend engineer with 3 years of experience: APIs, databases, debugging production issues. Practical, scenario-based.'
              className='w-full bg-card border-[1.5px] border-line rounded-xl px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent' />
            {prompt && promptError && <p className='text-[12px] text-[var(--color-danger)] mt-1'>{promptError}</p>}
          </div>
          <div className='max-w-[180px]'>
            <label htmlFor='ai-q-count' className='block text-[12.5px] font-semibold text-ink mb-1.5'>How many questions</label>
            <input id='ai-q-count' inputMode='numeric' value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className='w-full bg-card border-[1.5px] border-line rounded-xl px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-accent' />
            {countError && <p className='text-[12px] text-[var(--color-danger)] mt-1'>{countError}</p>}
          </div>
          <p className='text-[12.5px] text-text-secondary'>You review every question before it is added, and can edit it afterwards. The interviewer will ask only the questions you keep.</p>
        </div>
      ) : (
        <div className='space-y-3'>
          <p className='text-[13px] text-text-secondary'>Untick any you do not want.</p>
          <ul className='space-y-2'>
            {drafts.map((q, i) => (
              <li key={i} className='border border-line rounded-xl p-3'>
                <label className='flex gap-3 cursor-pointer'>
                  <input type='checkbox' className='mt-1 w-4 h-4 accent-[var(--color-accent)]' checked={picked.has(i)} onChange={() => setPicked((s) => { const next = new Set(s); next.has(i) ? next.delete(i) : next.add(i); return next })} />
                  <span className='min-w-0'><span className='block text-[13.5px] font-medium text-ink'>{q.text}</span>{q.topic && <span className='block text-[12px] text-text-secondary mt-0.5'>{q.topic}</span>}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
