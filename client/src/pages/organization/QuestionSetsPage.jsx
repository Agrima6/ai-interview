import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FileQuestion, Plus, Clock, Check, Trash2, Sparkles, Layers, AlertCircle, ListChecks } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import Modal from '../../components/ui/Modal'
import { Card, Button, Badge, Input, Select, Textarea, SearchInput, StatCard, Skeleton, EmptyState, useToast } from '../../components/ui'
import { getQuestionBanks, createQuestionBank } from '../../api/organization/organizationApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'

const CATEGORY_OPTIONS = [
  { value: 'SOFTWARE_ENGINEERING', label: 'Software Engineering' },
  { value: 'DATA_SCIENCE', label: 'Data Science & Analytics' },
  { value: 'PRODUCT_DESIGN', label: 'Product & Design' },
  { value: 'SALES_MARKETING', label: 'Sales & Marketing' },
  { value: 'HR_OPERATIONS', label: 'HR & Operations' },
  { value: 'CAMPUS_PLACEMENT', label: 'Campus Placement / Graduate' },
]

function QuestionSetsPage() {
  const toast = useToast()
  const [questionSets, setQuestionSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewSet, setPreviewSet] = useState(null)

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
      title="Question Sets & Skill Rubrics"
      description="Create custom question banks and reuse pre-built assessment sets across your interview drives."
      action={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Create Custom Question Set
        </Button>
      }
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={FileQuestion} label="Available Question Sets" value={questionSets.length} />
        <StatCard icon={Layers} label="Pre-built Sets" value={questionSets.filter((s) => s.isSystemDefault).length} />
        <StatCard icon={Sparkles} label="Custom Sets Created" value={questionSets.filter((s) => !s.isSystemDefault).length} />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <SearchInput placeholder="Search question sets..." value={search} onChange={setSearch} className="w-full sm:w-[280px]" />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="All categories"
            options={CATEGORY_OPTIONS}
            wrapperClassName="w-full sm:w-[220px]"
          />
        </div>

        {error ? (
          <div className="py-12 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-ink font-medium mb-1">Couldn't load question sets</p>
            <p className="text-[13px] text-text-secondary mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchSets}>Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : questionSets.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="No question sets yet"
            description="Create your first reusable question set to use it across interview drives."
            actionLabel="Create Question Set"
            onAction={() => setModalOpen(true)}
          />
        ) : filteredSets.length === 0 ? (
          <EmptyState icon={FileQuestion} title="No question sets match your filters" />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-[12px] font-semibold uppercase tracking-wider text-text-secondary">
                  <th className="pb-3 px-3">Name</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Questions</th>
                  <th className="pb-3 px-3">Duration</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Created</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[13.5px]">
                {filteredSets.map((set) => {
                  const setId = set._id || set.id
                  return (
                    <tr key={setId} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-3 font-semibold text-ink max-w-[280px] truncate">{set.title}</td>
                      <td className="py-4 px-3 text-text-secondary whitespace-nowrap">{formatEnumLabel(set.category)}</td>
                      <td className="py-4 px-3 text-text-secondary">{set.questionCount}</td>
                      <td className="py-4 px-3 text-text-secondary whitespace-nowrap">
                        <span className="inline-flex items-center gap-1"><Clock size={12} /> {set.durationMinutes} min</span>
                      </td>
                      <td className="py-4 px-3">
                        <Badge variant={set.isSystemDefault ? 'neutral' : 'info'}>{set.isSystemDefault ? 'Predefined' : 'Custom'}</Badge>
                      </td>
                      <td className="py-4 px-3 text-text-secondary whitespace-nowrap">
                        {set.createdAt ? new Date(set.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 px-3 text-right whitespace-nowrap">
                        <Button size="xs" variant="secondary" onClick={() => setPreviewSet(set)}>
                          <ListChecks size={13} /> View Questions
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
                    <button type="button" onClick={() => handleRemoveQuestion(idx)} className="text-text-secondary hover:text-red-600 p-1 rounded transition-colors">
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
