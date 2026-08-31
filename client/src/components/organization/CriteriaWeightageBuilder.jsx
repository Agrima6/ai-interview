import React from 'react'
import { Plus, Sliders, Trash2 } from 'lucide-react'
import { Button } from '../ui'

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

  return (
    <div className="p-6 rounded-2xl border border-line bg-card space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-[16px] font-bold text-ink flex items-center gap-2">
            <Sliders size={18} className="text-accent" /> {title}
          </h4>
          {description && <p className="text-[13px] text-text-secondary mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[14px] font-bold px-3 py-1 rounded-full border ${totalWeight === 100 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
            Total: {totalWeight}% {totalWeight !== 100 && '(Adjust to 100%)'}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={onAddCriteria}>
            <Plus size={14} /> Add Custom Criteria
          </Button>
        </div>
      </div>

      {/* Editable criteria list */}
      <div className="space-y-3">
        {skillWeightages.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-4 bg-black/[0.02] dark:bg-white/[0.03] p-4 rounded-xl border border-line">
            <div className="flex-1">
              <label className="block text-[11.5px] font-bold text-text-secondary uppercase mb-1">Criteria #{idx + 1} Name</label>
              <input
                type="text"
                value={item.name}
                onChange={(e) => onCriteriaNameChange(idx, e.target.value)}
                placeholder="e.g. Sales Negotiation, Financial Modeling, DSA..."
                className="w-full px-3 py-2 text-[13.5px] font-semibold text-ink bg-card border border-line rounded-lg focus:border-accent"
              />
            </div>
            <div className="w-28">
              <label className="block text-[11.5px] font-bold text-text-secondary uppercase mb-1">Weight (%)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={item.weight}
                  onChange={(e) => onCriteriaWeightChange(idx, e.target.value)}
                  className="w-full px-3 py-2 text-[13.5px] font-bold text-accent bg-card border border-line rounded-lg text-right"
                />
                <span className="text-[13px] font-bold text-text-secondary">%</span>
              </div>
            </div>
            {skillWeightages.length > 1 && (
              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => onRemoveCriteria(idx)}
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
  )
}

export default CriteriaWeightageBuilder
