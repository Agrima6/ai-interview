import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FileQuestion, Plus, Clock, Check, Trash2, Sparkles, Layers, AlertCircle, ListChecks, ArrowRight } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import Modal from '../../components/ui/Modal'
import { Card, Button, Badge, Input, Select, Textarea, SearchInput, StatCard, Skeleton, EmptyState, Tabs, useToast } from '../../components/ui'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { getQuestionBanks, createQuestionBank, deleteQuestionBank } from '../../api/organization/organizationApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'

const CATEGORY_OPTIONS = [
  { value: 'SOFTWARE_ENGINEERING', label: 'Software Engineering' },
  { value: 'DATA_SCIENCE', label: 'Data Science & Analytics' },
  { value: 'PRODUCT_DESIGN', label: 'Product & Design' },
  { value: 'SALES_MARKETING', label: 'Sales & Marketing' },
  { value: 'HR_OPERATIONS', label: 'HR & Operations' },
  { value: 'CAMPUS_PLACEMENT', label: 'Campus Placement / Graduate' },
  { value: 'CHARTERED_ACCOUNTANT', label: 'Chartered Accountant / Finance' },
  { value: 'LEGAL', label: 'Legal & Law' },
]

function QuestionSetsPage() {
  const toast = useToast()
  const [questionSets, setQuestionSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewSet, setPreviewSet] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [setTitle, setSetTitle] = useState('')
  const [setCategory, setSetCategory] = useState('SOFTWARE_ENGINEERING')
  const [questions, setQuestions] = useState([{ text: '', topic: '', timeLimit: 120 }])

  const fetchSets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const banks = await getQuestionBanks()
      setQuestionSets(banks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSets() }, [fetchSets])

  // Question banks are a small, bounded list per tenant (system defaults +
  // custom sets) - the API returns them all in one call, so search/category
  // narrowing happens client-side rather than adding query params the
  // backend doesn't support yet.
  const filteredSets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return questionSets.filter((set) => {
      if (categoryFilter && set.category !== categoryFilter) return false
      if (q && !set.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [questionSets, search, categoryFilter])

  const categoryTabs = useMemo(() => [...new Set(questionSets.map((s) => s.category).filter(Boolean))], [questionSets])

  const handleAddQuestion = () => setQuestions((prev) => [...prev, { text: '', topic: '', timeLimit: 120 }])
  const handleRemoveQuestion = (idx) => setQuestions((prev) => prev.filter((_, i) => i !== idx))
  const handleQuestionChange = (idx, field, value) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))

  const handleCreateQuestionSet = async (e) => {
    e.preventDefault()
    if (!setTitle.trim()) return
    setSubmitting(true)
    try {
      await createQuestionBank({
        title: setTitle.trim(),
        category: setCategory,
        questionCount: questions.filter((q) => q.text.trim()).length,
        durationMinutes: Math.round(questions.reduce((acc, q) => acc + Number(q.timeLimit || 120), 0) / 60),
        questions: questions.filter((q) => q.text.trim()).map((q, i) => ({ id: `q${Date.now()}-${i}`, text: q.text.trim(), topic: q.topic || 'General', timeLimit: Number(q.timeLimit) || 120 })),
      })
      toast.success('Question set created.')
      setSetTitle('')
      setQuestions([{ text: '', topic: '', timeLimit: 120 }])
      setModalOpen(false)
      fetchSets()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OrganizationLayout
      title="Question Sets"
      description="Reusable question banks your AI interviewer draws from."
      action={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ui-shine inline-flex items-center gap-2 h-11 px-5 rounded-[14px] bg-accent text-white text-[14px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_var(--color-accent)]"
        >
          <Plus size={17} /> New question set
        </button>
      }
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={FileQuestion} accent="brand" label="Available question sets" value={questionSets.length} />
        <StatCard icon={Layers} accent="cyan" label="Pre-built sets" value={questionSets.filter((s) => s.isSystemDefault).length} />
        <StatCard icon={Sparkles} accent="success" label="Custom sets created" value={questionSets.filter((s) => !s.isSystemDefault).length} />
      </div>

      <div className="ui-rise flex flex-wrap items-center gap-3 mb-6" style={{ animationDelay: '120ms' }}>
        <div className="flex-[999_1_280px] min-w-0">
          <SearchInput placeholder="Search question sets…" value={search} onChange={setSearch} />
        </div>
        <Tabs
          tabs={[{ id: '', label: 'All' }, ...categoryTabs.map((c) => ({ id: c, label: formatEnumLabel(c) }))]}
          value={categoryFilter}
          onChange={setCategoryFilter}
          className="max-w-full"
        />
      </div>

      {error ? (
        <Card className="py-12 text-center">
          <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
          <p className="text-[14px] text-ink font-bold mb-1">Couldn't load question sets</p>
          <p className="text-[13px] text-text-secondary mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchSets}>Retry</Button>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[260px] !rounded-[22px]" />)}</div>
      ) : questionSets.length === 0 ? (
        <div className="rounded-[24px] border-[1.5px] border-dashed border-accent/30 bg-card">
          <EmptyState
            icon={FileQuestion}
            title="No question sets yet"
            description="Create your first reusable question set to use it across interview drives."
            actionLabel="Create Question Set"
            onAction={() => setModalOpen(true)}
          />
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="rounded-[24px] border-[1.5px] border-dashed border-accent/30 bg-card"><EmptyState icon={FileQuestion} title="No question sets match" description="Try another category or search term." /></div>
      ) : (
        <section className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4 items-start">
          {filteredSets.map((set, i) => {
            const setId = set._id || set.id
            const topics = [...new Set((set.questions || []).map((q) => q.topic).filter(Boolean))].slice(0, 3)
            return (
              <article
                key={setId}
                style={{ animationDelay: `${60 + Math.min(i, 8) * 55}ms` }}
                className="ui-rise ui-lift flex flex-col gap-4 p-5 rounded-[22px] bg-card border border-line"
              >
                <div className="flex items-start gap-3.5">
                  <span className="shrink-0 w-[46px] h-[46px] rounded-[14px] bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-accent-dark flex items-center justify-center font-bold text-[13px]">
                    {(set.title || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold leading-snug text-ink">{set.title}</h3>
                    </div>
                    <p className="text-[13px] text-text-secondary mt-1">
                      {formatEnumLabel(set.category)} · {set.createdAt ? new Date(set.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Built-in'}
                    </p>
                  </div>
                  {!set.isSystemDefault && (
                    <button type="button" aria-label={`Delete ${set.title}`} onClick={() => setDeleteTarget(set)} className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t) => <span key={t} className="px-2.5 py-1 rounded-[10px] bg-[var(--color-surface-muted)] text-[12px] font-bold text-[#3a4262]">{t}</span>)}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-[#fafbfe] border border-line/60">
                  <div><div className="text-[12px] font-semibold text-text-secondary">Questions</div><div className="text-[18px] font-bold tabular-nums">{set.questionCount}</div></div>
                  <div><div className="text-[12px] font-semibold text-text-secondary">Duration</div><div className="text-[18px] font-bold tabular-nums">{set.durationMinutes}<span className="text-[12px] text-text-secondary font-semibold"> min</span></div></div>
                  <div><div className="text-[12px] font-semibold text-text-secondary">Type</div><div className="pt-1.5"><Badge variant={set.isSystemDefault ? 'neutral' : 'info'}>{set.isSystemDefault ? 'Predefined' : 'Custom'}</Badge></div></div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewSet(set)}
                  className="flex items-center justify-between h-11 px-3.5 rounded-xl border border-line bg-card text-[14px] font-bold text-ink transition-colors hover:bg-accent/[0.06] hover:border-accent"
                >
                  <span className="inline-flex items-center gap-2"><ListChecks size={16} className="text-accent" /> View questions</span>
                  <ArrowRight size={15} />
                </button>
              </article>
            )
          })}
        </section>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this question set?"
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          try {
            await deleteQuestionBank(deleteTarget._id || deleteTarget.id)
            toast.success('Question set deleted.')
            setDeleteTarget(null)
            fetchSets()
          } catch (err) {
            toast.error(err.message)
          }
        }}
      >
        <p className="text-[13.5px] text-text-secondary leading-relaxed">
          "{deleteTarget?.title}" will be removed from your library. Drives that already use it keep their own copy of the questions.
        </p>
      </ConfirmModal>

      <Modal
        open={Boolean(previewSet)}
        onClose={() => setPreviewSet(null)}
        title={previewSet?.title}
        size="lg"
        footer={<Button size="sm" variant="secondary" onClick={() => setPreviewSet(null)}>Close</Button>}
      >
        {previewSet && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 text-[13px] text-text-secondary">
              <span>{previewSet.questionCount} Questions</span>
              <span className="flex items-center gap-1"><Clock size={13} /> {previewSet.durationMinutes} min</span>
              <Badge variant={previewSet.isSystemDefault ? 'neutral' : 'info'}>{previewSet.isSystemDefault ? 'Predefined' : 'Custom'}</Badge>
            </div>

            {[...new Set((previewSet.questions || []).map((q) => q.topic))].map((topic) => (
              <div key={topic}>
                <h4 className="text-[12px] font-semibold uppercase tracking-wide text-text-secondary mb-2">{topic}</h4>
                <ol className="space-y-2 list-decimal list-inside">
                  {(previewSet.questions || []).filter((q) => q.topic === topic).map((q) => (
                    <li key={q.id} className="text-[13.5px] text-ink leading-relaxed">{q.text}</li>
                  ))}
                </ol>
              </div>
            ))}

            {!previewSet.questions?.length && (
              <p className="text-[13.5px] text-text-secondary">No questions have been added to this set yet.</p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Custom Question Set"
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleCreateQuestionSet} disabled={!setTitle.trim() || submitting}>
              <Check size={14} /> {submitting ? 'Saving...' : 'Save Question Set'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateQuestionSet} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Question Set Title" placeholder="e.g. Senior Java SDE Assessment Q3" value={setTitle} onChange={(e) => setSetTitle(e.target.value)} required />
            <Select label="Role Category" value={setCategory} onChange={(e) => setSetCategory(e.target.value)} options={CATEGORY_OPTIONS} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[13.5px] font-bold text-ink">Interview Questions ({questions.length})</h4>
              <Button type="button" size="xs" variant="secondary" onClick={handleAddQuestion}>
                <Plus size={13} /> Add Question
              </Button>
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-line bg-card space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-bold text-accent">Question #{idx + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => handleRemoveQuestion(idx)} aria-label={`Remove question ${idx + 1}`} className="text-text-secondary hover:text-red-600 p-1 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <Textarea placeholder="Enter custom interview question prompt..." rows={2} value={q.text} onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)} />

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Topic (e.g. DSA & Algorithms)" value={q.topic} onChange={(e) => handleQuestionChange(idx, 'topic', e.target.value)} />
                  <Select
                    value={q.timeLimit.toString()}
                    onChange={(e) => handleQuestionChange(idx, 'timeLimit', e.target.value)}
                    options={[
                      { value: '60', label: '1 Minute' },
                      { value: '120', label: '2 Minutes' },
                      { value: '180', label: '3 Minutes' },
                      { value: '300', label: '5 Minutes' },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </OrganizationLayout>
  )
}

export default QuestionSetsPage
