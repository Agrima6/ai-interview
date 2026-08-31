import React, { useState, useEffect, useCallback } from 'react'
import { FileQuestion, Plus, Clock, Check, Trash2, Sparkles, Layers, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import Modal from '../../components/ui/Modal'
import { Card, Button, Badge, Input, Select, Textarea, StatCard, Skeleton, useToast } from '../../components/ui'
import { getQuestionBanks, createQuestionBank } from '../../api/organization/organizationApi'

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
  const [expandedId, setExpandedId] = useState(null)

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

      {error ? (
        <Card className="p-10 text-center">
          <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
          <p className="text-[14px] text-ink font-medium mb-1">Couldn't load question sets</p>
          <p className="text-[13px] text-text-secondary mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchSets}>Retry</Button>
        </Card>
      ) : loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[220px]" />)}
        </div>
      ) : questionSets.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[14px] text-ink font-medium">No question sets yet.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionSets.map((set) => {
            const setId = set._id || set.id
            const isExpanded = expandedId === setId
            const topics = [...new Set((set.questions || []).map((q) => q.topic))]
            return (
              <Card key={setId} className="p-5 flex flex-col justify-between hover:border-accent/40 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={set.isSystemDefault ? 'neutral' : 'purple'}>
                      {set.isSystemDefault ? 'Predefined Bank' : 'Custom Set'}
                    </Badge>
                    <span className="text-[12px] text-text-secondary flex items-center gap-1">
                      <Clock size={12} /> {set.durationMinutes} mins
                    </span>
                  </div>
                  <h3 className="font-display text-[15px] font-bold text-ink mb-1">{set.title}</h3>
                  <p className="text-[12.5px] text-text-secondary mb-4">{set.category?.replace(/_/g, ' ')} • {set.questionCount} Questions</p>

                  {topics.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-line">
                      <div className="text-[12px] font-semibold text-ink">Topics covered:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {topics.map((t) => <Badge key={t} variant="neutral">{t}</Badge>)}
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-line space-y-2">
                      {(set.questions || []).map((q) => (
                        <p key={q.id} className="text-[12.5px] text-text-secondary">• {q.text}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-[12px] text-text-secondary">
                  <span>{set.createdAt ? new Date(set.createdAt).toLocaleDateString() : ''}</span>
                  <Button size="xs" variant="secondary" onClick={() => setExpandedId(isExpanded ? null : setId)}>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {isExpanded ? 'Hide' : 'View'} Questions
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

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
