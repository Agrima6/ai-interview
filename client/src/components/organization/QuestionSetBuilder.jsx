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

        <div className="flex items-center gap-2 p-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-line">
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
        <div className="grid sm:grid-cols-2 gap-4">
          {questionBanks.map((bank) => (
            <div
              key={bank.id}
              onClick={() => onSelectBankId(bank.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedBankId === bank.id
                  ? 'border-accent bg-accent/5 ring-2 ring-accent/20 shadow-sm'
                  : 'border-line hover:border-black/20 bg-card'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-[14.5px] text-ink flex items-center gap-2">
                  <FileText size={16} className="text-accent" /> {bank.title}
                </span>
              </div>
              <div className="text-[13px] text-text-secondary font-medium">
                {bank.questions} Questions • Estimated {bank.duration}
              </div>
            </div>
          ))}
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
