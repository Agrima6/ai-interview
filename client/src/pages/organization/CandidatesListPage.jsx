import React, { useState } from 'react'
import { Search, Eye, Filter, Download, Sparkles, CheckCircle2, Clock, XCircle, UserCheck } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import { Card, Button, Badge, SearchInput, Tabs, StatCard } from '../../components/ui'

const MOCK_CANDIDATES = [
  {
    id: 'cand-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@gmail.com',
    driveTitle: 'Senior Full Stack Developer Hiring Drive 2026',
    appliedDate: '2026-08-22',
    aiScore: 88,
    status: 'SHORTLISTED',
  },
  {
    id: 'cand-2',
    name: 'Priya Patel',
    email: 'priya.patel@techcollege.edu',
    driveTitle: 'Campus Graduate Trainee Screening — Batch A',
    appliedDate: '2026-08-24',
    aiScore: 82,
    status: 'SHORTLISTED',
  },
  {
    id: 'cand-3',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@yahoo.com',
    driveTitle: 'Senior Full Stack Developer Hiring Drive 2026',
    appliedDate: '2026-08-25',
    aiScore: 68,
    status: 'COMPLETED',
  },
  {
    id: 'cand-4',
    name: 'Ananya Gupta',
    email: 'ananya.gupta@outlook.com',
    driveTitle: 'Data Science & Machine Learning Evaluation',
    appliedDate: '2026-08-21',
    aiScore: 91,
    status: 'SHORTLISTED',
  },
  {
    id: 'cand-5',
    name: 'Vikram Singh',
    email: 'vikram.singh@gmail.com',
    driveTitle: 'Campus Graduate Trainee Screening — Batch A',
    appliedDate: '2026-08-26',
    aiScore: 45,
    status: 'REJECTED',
  },
  {
    id: 'cand-6',
    name: 'Neha Verma',
    email: 'neha.verma@college.edu',
    driveTitle: 'Campus Graduate Trainee Screening — Batch A',
    appliedDate: '2026-08-28',
    aiScore: 0,
    status: 'IN_PROGRESS',
  },
]

const STATUS_BADGES = {
  SHORTLISTED: 'success',
  COMPLETED: 'purple',
  IN_PROGRESS: 'neutral',
  REJECTED: 'danger',
}

function CandidatesListPage() {
  const [candidates, setCandidates] = useState(MOCK_CANDIDATES)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const handleStatusChange = (candidateId, newStatus) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    )
  }

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.driveTitle.toLowerCase().includes(search.toLowerCase())

    if (activeTab === 'ALL') return matchesSearch
    return matchesSearch && c.status === activeTab
  })

  const totalEvaluated = candidates.filter((c) => c.status !== 'IN_PROGRESS').length
  const totalShortlisted = candidates.filter((c) => c.status === 'SHORTLISTED').length
  const avgScore = Math.round(
    candidates.filter((c) => c.aiScore > 0).reduce((acc, c) => acc + c.aiScore, 0) /
      (candidates.filter((c) => c.aiScore > 0).length || 1)
  )

  return (
    <OrganizationLayout
      title="Candidates & Evaluation"
      description="Review AI scorecards, interview recordings, and shortlist top candidates."
    >
      {/* Top Metrics */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={UserCheck} label="Evaluated Candidates" value={totalEvaluated.toString()} trend={{ value: `${totalShortlisted} Shortlisted`, direction: 'up' }} />
        <StatCard icon={Sparkles} label="Average AI Score" value={`${avgScore}%`} />
        <StatCard icon={CheckCircle2} label="Shortlist Rate" value={`${Math.round((totalShortlisted / (totalEvaluated || 1)) * 100)}%`} />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <Tabs
            tabs={[
              { id: 'ALL', label: 'All Candidates' },
              { id: 'SHORTLISTED', label: 'Shortlisted' },
              { id: 'COMPLETED', label: 'Evaluated' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'REJECTED', label: 'Rejected' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <SearchInput
            placeholder="Search candidates, emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            className="w-full sm:w-[260px]"
          />
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-[12px] font-semibold uppercase tracking-wider text-text-secondary">
                <th className="pb-3 px-3">Candidate Name</th>
                <th className="pb-3 px-3">Drive / Assessment</th>
                <th className="pb-3 px-3">Applied Date</th>
                <th className="pb-3 px-3">AI Score</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[13.5px]">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary">
                    No candidates match the selected tab/search query.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-3">
                      <div className="font-semibold text-ink leading-tight">{cand.name}</div>
                      <div className="text-[12px] text-text-secondary">{cand.email}</div>
                    </td>
                    <td className="py-4 px-3 font-medium text-ink max-w-[260px] truncate">
                      {cand.driveTitle}
                    </td>
                    <td className="py-4 px-3 text-text-secondary whitespace-nowrap">{cand.appliedDate}</td>
                    <td className="py-4 px-3 font-bold">
                      {cand.aiScore > 0 ? (
                        <span className={cand.aiScore >= 80 ? 'text-emerald-600' : cand.aiScore >= 65 ? 'text-amber-600' : 'text-red-600'}>
                          {cand.aiScore}%
                        </span>
                      ) : (
                        <span className="text-text-secondary font-normal">Pending</span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      <Badge variant={STATUS_BADGES[cand.status] || 'neutral'}>{cand.status}</Badge>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setSelectedCandidate(cand)}
                      >
                        <Eye size={13} /> View Scorecard
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <CandidateDetailModal
        open={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
        onStatusChange={handleStatusChange}
      />
    </OrganizationLayout>
  )
}

export default CandidatesListPage
