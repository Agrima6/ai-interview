import React from 'react'
import { INTERVIEW_LANGUAGES } from '../../constants/interviewLanguages'

/**
 * Which languages the AI interviewer may use. "Starts in" is the default; the chips are what candidates can pick on the
 * join screen (none ticked = all of them); the switch decides whether they may change language mid-interview.
 * The interviewer itself is limited to the same choices, so what HR sets here is exactly what happens.
 */
export default function InterviewLanguageSettings({ value, onChange }) {
  const policy = value
  const allowed = policy.allowed
  const offered = allowed.length ? allowed : INTERVIEW_LANGUAGES.map((l) => l.value)
  const set = (patch) => onChange({ ...policy, ...patch })

  const toggle = (code) => {
    const next = offered.includes(code) ? offered.filter((c) => c !== code) : [...offered, code]
    if (!next.length) return                                    // at least one language must stay on
    const everything = next.length === INTERVIEW_LANGUAGES.length
    set({ allowed: everything ? [] : next, defaultLanguage: next.includes(policy.defaultLanguage) ? policy.defaultLanguage : next[0] })
  }

  return (
    <div className="rounded-xl border border-line p-4 space-y-3">
      <div>
        <p className="text-[13px] font-semibold text-ink">Interview language</p>
        <p className="text-[12px] text-text-secondary">The AI interviewer speaks and listens in these languages only.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Languages candidates can choose">
        {INTERVIEW_LANGUAGES.map((lang) => {
          const on = offered.includes(lang.value)
          return (
            <button key={lang.value} type="button" aria-pressed={on} onClick={() => toggle(lang.value)}
              className={`min-h-[34px] px-3 rounded-full border text-[12.5px] font-medium transition-colors ${on ? 'border-accent bg-accent/10 text-accent' : 'border-line text-text-secondary hover:border-accent/40'}`}>
              {on ? '✓ ' : ''}{lang.label}
            </button>
          )
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 items-end">
        <label className="block text-[12.5px] font-semibold text-ink">Starts in
          <select value={policy.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-[13.5px] font-normal text-ink">
            {INTERVIEW_LANGUAGES.filter((l) => offered.includes(l.value)).map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-[13px] text-ink cursor-pointer pb-2">
          <input type="checkbox" className="w-4 h-4 accent-[var(--color-primary)]" checked={policy.allowSwitch} onChange={(e) => set({ allowSwitch: e.target.checked })} />
          Candidate can switch language during the interview
        </label>
      </div>
    </div>
  )
}
