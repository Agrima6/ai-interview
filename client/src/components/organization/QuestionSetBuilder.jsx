import React from 'react'
import { Plus, FileText, Trash2 } from 'lucide-react'
import { Button, Select, Textarea } from '../ui'

function QuestionSetBuilder({
  questionMode,
  onQuestionModeChange,
  questionBanks,
  selectedBankId,
  onSelectBankId,
  customQuestions,
  onAddCustomQuestion,
  onRemoveCustomQuestion,
  onCustomQuestionChange,
  skillWeightages,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-line bg-card">
        <div>
          <h4 className="text-[16px] font-bold text-ink flex items-center gap-2">
            <FileText size={18} className="text-accent" /> Interview Questions & Prompts
          </h4>
          <p className="text-[13px] text-text-secondary mt-0.5">
            Select a curated pre-built question bank or write custom questions manually.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-black/4 dark:bg-white/6 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => onQuestionModeChange('PREBUILT')}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
              questionMode === 'PREBUILT' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-ink'
            }`}
          >
            Pre-built Question Bank
          </button>
          <button
            type="button"
            onClick={() => onQuestionModeChange('CUSTOM')}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
              questionMode === 'CUSTOM' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-ink'
            }`}
          >
            Enter Custom Questions Manually
          </button>
        </div>
      </div>

      {questionMode === 'PREBUILT' ? (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2 rounded-2xl border border-line bg-card p-3 shadow-(--shadow-soft)">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">Question banks</p>
            {questionBanks.map((bank) => (
              <button
                type="button"
                key={bank.id}
                onClick={() => onSelectBankId(bank.id)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${selectedBankId === bank.id ? 'border-accent bg-accent/5 shadow-sm' : 'border-transparent hover:border-line hover:bg-bg'}`}
              >
                <span className="flex items-start gap-2 text-[13px] font-bold text-ink"><FileText size={15} className="mt-0.5 shrink-0 text-accent" /> {bank.title}</span>
                <span className="mt-1 block pl-6 text-[11px] text-text-secondary">{bank.questions} questions {bank.duration && `• ${bank.duration}`}</span>
              </button>
            ))}
            {!questionBanks.length && <p className="p-3 text-[12px] text-text-secondary">No question banks available.</p>}
          </div>

          <div className="rounded-2xl border border-line bg-card p-4 shadow-(--shadow-soft)">
            {(() => {
              const selectedBank = questionBanks.find((bank) => bank.id === selectedBankId)
              const questions = selectedBank?.questionList || []
              return (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3"><div><h4 className="text-[15px] font-bold text-ink">{selectedBank?.title || 'Select a question bank'}</h4><p className="mt-1 text-[11px] text-text-secondary">Preselected questions candidates will answer.</p></div><span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">{questions.length || selectedBank?.questions || 0} questions</span></div>
                  <div className="space-y-2">
                    {questions.length ? questions.map((question, index) => <div key={question.id || index} className="flex gap-3 rounded-xl border border-line bg-bg p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-card text-[11px] font-bold text-text-secondary">{index + 1}</span><div><p className="text-[12.5px] font-semibold leading-relaxed text-ink">{question.text || question.question || question.prompt}</p><div className="mt-1 flex gap-2 text-[10px] text-text-secondary"><span>{question.topic || 'General'}</span><span>•</span><span>{question.timeLimit || 120}s response</span></div></div></div>) : <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-line bg-bg px-5 text-center text-[12px] text-text-secondary">Select a question bank to preview its questions.</div>}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      ) : (
        /* Custom Questions Builder */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-ink">Custom Question Prompts ({customQuestions.length})</span>
            <Button type="button" size="sm" variant="secondary" onClick={onAddCustomQuestion}>
              <Plus size={14} /> Add Question Prompt
            </Button>
          </div>

          {customQuestions.map((q, idx) => (
            <div key={q.id} className="p-5 rounded-2xl border border-line bg-card space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-accent">Question Prompt #{idx + 1}</span>
                {customQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveCustomQuestion(idx)}
                    className="text-text-secondary hover:text-red-600 p-1.5 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <Textarea
                placeholder="Type custom question prompt for candidates..."
                rows={2}
                value={q.text}
                onChange={(e) => onCustomQuestionChange(idx, 'text', e.target.value)}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Evaluation Criteria Mapping"
                  value={q.topic}
                  onChange={(e) => onCustomQuestionChange(idx, 'topic', e.target.value)}
                  options={skillWeightages.map((s) => ({ value: s.name, label: s.name }))}
                />
                <Select
                  label="Response Video Time Limit"
                  value={q.timeLimit.toString()}
                  onChange={(e) => onCustomQuestionChange(idx, 'timeLimit', e.target.value)}
                  options={[
                    { value: '60', label: '1 Minute' },
                    { value: '120', label: '2 Minutes' },
                    { value: '180', label: '3 Minutes' },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default QuestionSetBuilder
