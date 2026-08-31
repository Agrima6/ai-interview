import React, { useState } from 'react'
import { FileQuestion, Plus, Clock, FileText, Check, Trash2, Edit, Sparkles, Layers, Sliders } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import Modal from '../../components/ui/Modal'
import { Card, Button, Badge, Input, Select, Textarea, StatCard } from '../../components/ui'

const PREDEFINED_QUESTION_SETS = [
  {
    id: 'qs-101',
    title: 'SDE Core Engineering & Problem Solving',
    category: 'Software Engineering',
    questionsCount: 6,
    duration: '20 mins',
    topics: [
      { name: 'DSA & Algorithms', weight: 30 },
      { name: 'DBMS & SQL', weight: 20 },
      { name: 'Operating Systems & CN', weight: 20 },
      { name: 'Java / Tech Stack', weight: 20 },
      { name: 'HR & Communication', weight: 10 },
    ],
    isCustom: false,
    createdAt: '2026-08-10',
  },
  {
    id: 'qs-102',
    title: 'Data Science & Machine Learning Fundamentals',
    category: 'Data Science & Analytics',
    questionsCount: 5,
    duration: '18 mins',
    topics: [
      { name: 'Python & Pandas', weight: 35 },
      { name: 'Statistics & Probability', weight: 25 },
      { name: 'ML Algorithms', weight: 25 },
      { name: 'Behavioral & Project', weight: 15 },
    ],
    isCustom: false,
    createdAt: '2026-08-14',
  },
  {
    id: 'qs-103',
    title: 'Graduate Trainee General Assessment',
    category: 'Campus Placement / Graduate',
    questionsCount: 8,
    duration: '25 mins',
    topics: [
      { name: 'Quantitative Aptitude', weight: 30 },
      { name: 'Logical Reasoning', weight: 30 },
      { name: 'Basic Coding', weight: 25 },
      { name: 'English & HR', weight: 15 },
    ],
    isCustom: false,
    createdAt: '2026-08-18',
  },
]

function QuestionSetsPage() {
  const [questionSets, setQuestionSets] = useState(PREDEFINED_QUESTION_SETS)
  const [modalOpen, setModalOpen] = useState(false)

  // Form states for creating custom question set
  const [setTitle, setSetTitle] = useState('')
  const [setCategory, setSetCategory] = useState('Software Engineering')
  const [questions, setQuestions] = useState([
    { text: 'Explain how indexing improves SQL query performance.', topic: 'DBMS & SQL', timeLimit: 120 },
    { text: 'What is the difference between Process and Thread in OS?', topic: 'Operating Systems & CN', timeLimit: 120 },
    { text: 'Describe a challenging technical project you built recently.', topic: 'Project Tech & Java', timeLimit: 180 },
  ])

  const [topicsWeightage, setTopicsWeightage] = useState([
    { name: 'DSA & Algorithms', weight: 30 },
    { name: 'DBMS & SQL', weight: 20 },
    { name: 'Operating Systems & CN', weight: 20 },
    { name: 'Project Tech & Java', weight: 20 },
    { name: 'HR & Communication', weight: 10 },
  ])

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, { text: '', topic: 'DSA & Algorithms', timeLimit: 120 }])
  }

  const handleRemoveQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleQuestionChange = (idx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    )
  }

  const handleWeightageChange = (idx, weight) => {
    setTopicsWeightage((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, weight: Number(weight) || 0 } : t))
    )
  }

  const handleCreateQuestionSet = (e) => {
    e.preventDefault()
    if (!setTitle.trim()) return

    const newSet = {
      id: `qs-${Date.now()}`,
      title: setTitle,
      category: setCategory,
      questionsCount: questions.length,
      duration: `${Math.round(questions.reduce((acc, q) => acc + Number(q.timeLimit || 120), 0) / 60)} mins`,
      topics: topicsWeightage.filter((t) => t.weight > 0),
      isCustom: true,
      createdAt: new Date().toISOString().split('T')[0],
    }

    setQuestionSets((prev) => [newSet, ...prev])
    setSetTitle('')
    setModalOpen(false)
  }

  return (
    <OrganizationLayout
      title="Question Sets & Skill Rubrics"
      description="Create custom question banks, set skill criteria weightages, and configure AI evaluation parameters."
      action={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Create Custom Question Set
        </Button>
      }
    >
      {/* Top Stat Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={FileQuestion} label="Available Question Sets" value={questionSets.length.toString()} />
        <StatCard icon={Layers} label="Pre-built Sets" value={questionSets.filter((s) => !s.isCustom).length.toString()} />
        <StatCard icon={Sparkles} label="Custom Sets Created" value={questionSets.filter((s) => s.isCustom).length.toString()} />
      </div>

      {/* Question Sets Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questionSets.map((set) => (
          <Card key={set.id} className="p-5 flex flex-col justify-between hover:border-accent/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={set.isCustom ? 'purple' : 'neutral'}>
                  {set.isCustom ? 'Custom Set' : 'Predefined Bank'}
                </Badge>
                <span className="text-[12px] text-text-secondary flex items-center gap-1">
                  <Clock size={12} /> {set.duration}
                </span>
              </div>
              <h3 className="font-display text-[15px] font-bold text-ink mb-1">{set.title}</h3>
              <p className="text-[12.5px] text-text-secondary mb-4">{set.category} • {set.questionsCount} Questions</p>

              {/* Topic Weightages */}
              <div className="space-y-2 pt-3 border-t border-line">
                <div className="text-[12px] font-semibold text-ink">Skill Rubric Weightages:</div>
                <div className="space-y-1.5">
                  {set.topics.map((t) => (
                    <div key={t.name} className="flex items-center justify-between text-[12px]">
                      <span className="text-text-secondary">{t.name}</span>
                      <span className="font-bold text-accent">{t.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-[12px] text-text-secondary">
              <span>Added {set.createdAt}</span>
              <Button size="xs" variant="secondary">
                View Questions
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Custom Question Set Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Custom Question Set & Criteria"
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleCreateQuestionSet} disabled={!setTitle.trim()}>
              <Check size={14} /> Save Question Set
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateQuestionSet} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Question Set Title"
              placeholder="e.g. Senior Java SDE Assessment Q3"
              value={setTitle}
              onChange={(e) => setSetTitle(e.target.value)}
              required
            />
            <Select
              label="Role Category"
              value={setCategory}
              onChange={(e) => setSetCategory(e.target.value)}
              options={[
                { value: 'Software Engineering', label: 'Software Engineering' },
                { value: 'Data Science & Analytics', label: 'Data Science & Analytics' },
                { value: 'Product & Design', label: 'Product & Design' },
                { value: 'Sales & Marketing', label: 'Sales & Marketing' },
                { value: 'Campus Placement / Graduate', label: 'Campus Placement / Graduate' },
              ]}
            />
          </div>

          {/* Skill Weightage Rubric Matrix */}
          <div className="p-4 rounded-xl border border-line bg-black/[0.02] dark:bg-white/[0.04] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-ink flex items-center gap-2">
                <Sliders size={15} className="text-accent" /> Evaluation Criteria Weightages (Must total 100%)
              </h4>
              <span className="text-[12px] font-bold text-accent">
                Total: {topicsWeightage.reduce((a, b) => a + (b.weight || 0), 0)}%
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {topicsWeightage.map((t, idx) => (
                <div key={t.name} className="flex items-center justify-between bg-card p-2.5 rounded-lg border border-line">
                  <span className="text-[12.5px] font-medium text-ink">{t.name}</span>
                  <div className="flex items-center gap-1 w-20">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={t.weight}
                      onChange={(e) => handleWeightageChange(idx, e.target.value)}
                      className="w-14 px-2 py-1 text-[12.5px] font-bold text-accent bg-transparent border border-line rounded text-right"
                    />
                    <span className="text-[12px] text-text-secondary">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Questions Section */}
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
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-text-secondary hover:text-red-600 p-1 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <Textarea
                  placeholder="Enter custom interview question prompt..."
                  rows={2}
                  value={q.text}
                  onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)}
                />

                <div className="grid sm:grid-cols-2 gap-3">
                  <Select
                    label="Target Skill Topic"
                    value={q.topic}
                    onChange={(e) => handleQuestionChange(idx, 'topic', e.target.value)}
                    options={topicsWeightage.map((t) => ({ value: t.name, label: t.name }))}
                  />
                  <Select
                    label="Max Video Response Time"
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
