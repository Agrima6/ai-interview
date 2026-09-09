import React from 'react'
import { Plus, Sliders, Trash2 } from 'lucide-react'
import { Button } from '../ui'

const CHART_COLORS = ['#c4161f', '#ef6a70', '#f59e0b', '#16a34a', '#7c3aed', '#0f766e']

function CriteriaWeightageBuilder({
  skillWeightages,
  onCriteriaNameChange,
  onCriteriaWeightChange,
  onAddCriteria,
  onRemoveCriteria,
  title = "Evaluation Criteria & Skill Weightage Matrix",
  description = "Customize criteria names tailored to your role. Total weightage must equal 100%."
}) {
  const totalWeight = skillWeightages.reduce((acc, item) => acc + item.weight, 0)

  const chartStops = skillWeightages.reduce((stops, item, index) => {
    const start = skillWeightages.slice(0, index).reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0)
    const end = start + Number(item.weight || 0)
    return [...stops, `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`]
  }, []).join(', ')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-(--shadow-soft) sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="flex items-center gap-2 text-[16px] font-bold text-ink">
            <Sliders size={18} className="text-accent" /> {title}
          </h4>
          {description && <p className="mt-1 text-[12px] text-text-secondary">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${totalWeight === 100 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-amber-500/20 bg-amber-500/10 text-amber-600'}`}>
            Total: {totalWeight}% {totalWeight !== 100 && '(Adjust to 100%)'}
          </span>
          <Button type="button" size="xs" variant="secondary" onClick={onAddCriteria}>
            <Plus size={14} /> Add Custom Criteria
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-(--shadow-soft)">
          <div className="flex items-center justify-center py-3">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(${chartStops || '#e5e7eb 0 100%'})` }}>
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-card text-center"><span className="text-2xl font-bold text-ink">{totalWeight}%</span><span className="text-[10px] text-text-secondary">Total weightage</span></div>
            </div>
          </div>
          <div className="space-y-2 border-t border-line pt-3">
            {skillWeightages.map((item, index) => <div key={item.id} className="flex items-center justify-between gap-2 text-[11px] text-text-secondary"><span className="flex min-w-0 items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate">{item.name}</span></span><span className="font-bold text-ink">{item.weight}%</span></div>)}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-line bg-card p-3 shadow-(--shadow-soft)">
        {skillWeightages.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card text-[11px] font-bold text-text-secondary">{idx + 1}</span>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase text-text-secondary">Criteria name</label>
              <input
                type="text"
                value={item.name}
                onChange={(e) => onCriteriaNameChange(idx, e.target.value)}
                placeholder="e.g. Sales Negotiation, Financial Modeling, DSA..."
                className="w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] font-semibold text-ink focus:border-accent"
              />
            </div>
            <div className="w-24 shrink-0">
              <label className="mb-1 block text-[10px] font-bold uppercase text-text-secondary">Weight (%)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={item.weight}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (isNaN(val) || val < 0) {
                      onCriteriaWeightChange(idx, 0)
                      return
                    }
                    const clamped = Math.min(val, 100)
                    const otherTotal = skillWeightages.reduce((acc, s, i) => acc + (i === idx ? 0 : s.weight), 0)
                    if (otherTotal + clamped > 100) {
                      onCriteriaWeightChange(idx, String(Math.max(0, 100 - otherTotal)))
                      return
                    }
                    onCriteriaWeightChange(idx, String(clamped))
                  }}
                  className="w-full rounded-lg border border-line bg-card px-3 py-2 text-right text-[13px] font-bold text-accent"
                />
                <span className="text-[13px] font-bold text-text-secondary">%</span>
              </div>
            </div>
            {skillWeightages.length > 1 && (
              <div>
                <button
                  type="button"
                  onClick={() => onRemoveCriteria(idx)}
                  aria-label={`Remove criteria ${idx + 1}`}
                  className="p-2 text-text-secondary hover:text-red-600 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}

export default CriteriaWeightageBuilder
