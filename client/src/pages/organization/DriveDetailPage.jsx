import React, { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Download, CheckCircle2, ShieldAlert, Sparkles, Filter, Eye, Check, X, FileSpreadsheet, Lock } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import CreateRoundModal from '../../components/organization/CreateRoundModal'
import { Card, Button, Badge, SearchInput, Tabs, StatCard } from '../../components/ui'

const MOCK_DRIVE_DETAILS = {
  id: 'drive-101',
  title: 'Senior Full Stack Developer Hiring Drive 2026',
  department: 'Engineering',
  roleCategory: 'Software Engineering (SDE / Fullstack)',
  experienceLevel: '3-5 yrs (Mid Level)',
  totalRounds: 2,
  currentRound: 1,
  passingThreshold: 75,
  status: 'ACTIVE',
  publicLink: 'https://workmateiq.com/drive/senior-fullstack-2026',
}

const MOCK_ROUND_1_CANDIDATES = [
  {
    id: 'cand-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@gmail.com',
    phone: '+91-9876543210',
    exp: '4 yrs',
    aiScore: 92,
    malpracticeFlags: 0,
    status: 'SHORTLISTED',
    attemptedDate: '2026-08-22',
  },
  {
    id: 'cand-2',
    name: 'Priya Patel',
    email: 'priya.patel@techcollege.edu',
    phone: '+91-9812345678',
    exp: '3 yrs',
    aiScore: 84,
    malpracticeFlags: 1,
    status: 'SHORTLISTED',
    attemptedDate: '2026-08-24',
  },
  {
    id: 'cand-3',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@yahoo.com',
    phone: '+91-9898989898',
    exp: '5 yrs',
    aiScore: 68,
    malpracticeFlags: 0,
    status: 'COMPLETED',
    attemptedDate: '2026-08-25',
  },
  {
    id: 'cand-4',
    name: 'Ananya Gupta',
    email: 'ananya.gupta@outlook.com',
    phone: '+91-9765432109',
    exp: '4 yrs',
    aiScore: 94,
    malpracticeFlags: 0,
    status: 'SHORTLISTED',
    attemptedDate: '2026-08-21',
  },
  {
    id: 'cand-5',
    name: 'Vikram Singh',
    email: 'vikram.singh@gmail.com',
    phone: '+91-9543210987',
    exp: '2 yrs',
    aiScore: 45,
    malpracticeFlags: 3,
    status: 'REJECTED',
    attemptedDate: '2026-08-26',
  },
  {
    id: 'cand-6',
    name: 'Marcus Wright',
    email: 'marcus@skynet.net',
    phone: '+1-555-0144',
    exp: '5 yrs',
    aiScore: 89,
    malpracticeFlags: 0,
    status: 'SHORTLISTED',
    attemptedDate: '2026-08-27',
  },
]

function DriveDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [drive, setDrive] = useState(MOCK_DRIVE_DETAILS)
  const [activeRoundTab, setActiveRoundTab] = useState('1')
  const [round1Candidates, setRound1Candidates] = useState(MOCK_ROUND_1_CANDIDATES)
  const [round2Candidates, setRound2Candidates] = useState([])

  // Round creation modal state
  const [createRoundModalOpen, setCreateRoundModalOpen] = useState(false)
  const [round1Completed, setRound1Completed] = useState(false)
  const [round2Created, setRound2Created] = useState(false)
  const [round2Details, setRound2Details] = useState(null)

  // Filters state
  const [search, setSearch] = useState('')
  const [scoreFilter, setScoreFilter] = useState('ALL')
  const [flagFilter, setFlagFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const basePath = location.pathname.startsWith('/college')
    ? '/college'
    : location.pathname.startsWith('/candidate')
    ? '/candidate'
    : '/organization'

  const currentCandidates = activeRoundTab === '1' ? round1Candidates : round2Candidates

  const handleStatusChange = (candId, newStatus) => {
    if (activeRoundTab === '1') {
      setRound1Candidates((prev) =>
        prev.map((c) => (c.id === candId ? { ...c, status: newStatus } : c))
      )
    } else {
      setRound2Candidates((prev) =>
        prev.map((c) => (c.id === candId ? { ...c, status: newStatus } : c))
      )
    }
  }

  const handleMarkRoundComplete = () => {
    setRound1Completed(true)
  }

  const handleCreateRound2Submit = (newRound) => {
    setRound2Details(newRound)
    setRound2Created(true)
    setRound2Candidates(newRound.candidates.map((c) => ({ ...c, aiScore: 88, status: 'INVITED' })))
    setDrive((prev) => ({ ...prev, currentRound: 2 }))
    setActiveRoundTab('2')
  }

  const handleExportExcel = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Name,Email,Phone,Experience,AI Score,Malpractice Flags,Status']
        .concat(
          currentCandidates.map(
            (c) => `"${c.name}","${c.email}","${c.phone}","${c.exp}",${c.aiScore},${c.malpracticeFlags},"${c.status}"`
          )
        )
        .join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${drive.title.replace(/[^a-z0-9]+/gi, '_')}_Round_${activeRoundTab}_Results.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredCandidates = currentCandidates.filter((cand) => {
    const matchesSearch =
      cand.name.toLowerCase().includes(search.toLowerCase()) ||
      cand.email.toLowerCase().includes(search.toLowerCase()) ||
      cand.phone.includes(search)

    let matchesScore = true
    if (scoreFilter === 'OVER_90') matchesScore = cand.aiScore >= 90
    else if (scoreFilter === 'QUALIFIED') matchesScore = cand.aiScore >= 75 && cand.aiScore < 90
    else if (scoreFilter === 'BELOW') matchesScore = cand.aiScore < 75

    let matchesFlags = true
    if (flagFilter === 'ZERO') matchesFlags = cand.malpracticeFlags === 0
    else if (flagFilter === 'MINOR') matchesFlags = cand.malpracticeFlags === 1
    else if (flagFilter === 'HIGH') matchesFlags = cand.malpracticeFlags >= 2

    let matchesStatus = true
    if (statusFilter !== 'ALL') matchesStatus = cand.status === statusFilter

    return matchesSearch && matchesScore && matchesFlags && matchesStatus
  })

  const shortlistedList = round1Candidates.filter((c) => c.status === 'SHORTLISTED')

  return (
    <OrganizationLayout
      title={drive.title}
      description={`${drive.roleCategory} • ${drive.department} • Active Round: Round ${drive.currentRound}`}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`${basePath}/drives`)}>
            <ArrowLeft size={14} /> Back to Drives
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Download Excel Report
          </Button>
          {!round1Completed ? (
            <Button size="sm" onClick={handleMarkRoundComplete}>
              <CheckCircle2 size={14} /> Mark Round 1 Complete
            </Button>
          ) : (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setCreateRoundModalOpen(true)}>
              <Plus size={14} /> {round2Created ? 'Re-configure Round 2' : 'Create Round 2 (Managerial)'}
            </Button>
          )}
        </div>
      }
    >
      {/* Metrics Header */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CheckCircle2} label="Evaluated Candidates" value={currentCandidates.length.toString()} />
        <StatCard icon={Sparkles} label="Shortlisted Candidates" value={shortlistedList.length.toString()} trend={{ value: `${Math.round((shortlistedList.length / (round1Candidates.length || 1)) * 100)}% Pass`, direction: 'up' }} />
        <StatCard icon={ShieldAlert} label="Proctoring / Malpractice Flags" value={currentCandidates.filter((c) => c.malpracticeFlags > 0).length.toString()} />
        <StatCard icon={Lock} label="Round 1 Status" value={round1Completed ? 'Completed' : 'In Progress'} />
      </div>

      {/* Rounds Selector Tabs */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-line">
          <Tabs
            tabs={[
              { id: '1', label: 'Round 1: Technical AI Interview' },
              { id: '2', label: round2Created ? `Round 2: ${round2Details?.type || 'Managerial'}` : round1Completed ? 'Round 2: Ready to Create' : 'Round 2 (Locked)' },
            ]}
            value={activeRoundTab}
            onChange={(id) => {
              if (id === '2' && !round2Created) {
                if (round1Completed) setCreateRoundModalOpen(true)
                return
              }
              setActiveRoundTab(id)
            }}
          />

          {/* Search input */}
          <SearchInput
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            className="w-full sm:w-[240px]"
          />
        </div>

        {/* Filter Toolbar */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-line">
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1">AI Score Range</label>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-[13px] bg-card border border-line rounded-lg text-ink"
            >
              <option value="ALL">All Scores</option>
              <option value="OVER_90">Score &gt; 90% (Top Tier)</option>
              <option value="QUALIFIED">75% - 90% (Qualified)</option>
              <option value="BELOW">&lt; 75% (Below Threshold)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1">Malpractice Flags</label>
            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-[13px] bg-card border border-line rounded-lg text-ink"
            >
              <option value="ALL">All Proctoring Logs</option>
              <option value="ZERO">0 Flags (Clean Attempt)</option>
              <option value="MINOR">1 Flag (Minor Warning)</option>
              <option value="HIGH">2+ Flags (Suspicious Activity)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-[13px] bg-card border border-line rounded-lg text-ink"
            >
              <option value="ALL">All Statuses</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="INVITED">Invited</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-[12px] font-semibold uppercase tracking-wider text-text-secondary">
                <th className="pb-3 px-3">Candidate Details</th>
                <th className="pb-3 px-3">Contact info</th>
                <th className="pb-3 px-3">AI Score</th>
                <th className="pb-3 px-3">Proctoring Logs</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Scorecard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[13.5px]">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary">
                    {activeRoundTab === '2' && !round2Created
                      ? 'Round 2 is not launched yet. Click "Create Round 2" to setup.'
                      : 'No candidates found matching the applied filters.'}
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-3">
                      <div className="font-semibold text-ink leading-tight">{cand.name}</div>
                      <div className="text-[12px] text-text-secondary">Exp: {cand.exp}</div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="text-ink text-[12.5px] font-mono">{cand.email}</div>
                      <div className="text-[12px] text-text-secondary font-mono">{cand.phone}</div>
                    </td>
                    <td className="py-4 px-3 font-extrabold text-[15px]">
                      <span className={cand.aiScore >= 80 ? 'text-emerald-600' : cand.aiScore >= 70 ? 'text-amber-600' : 'text-red-600'}>
                        {cand.aiScore}%
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      {cand.malpracticeFlags === 0 ? (
                        <Badge variant="success">0 Flags Clean</Badge>
                      ) : cand.malpracticeFlags === 1 ? (
                        <Badge variant="warning">1 Minor Flag</Badge>
                      ) : (
                        <Badge variant="danger">{cand.malpracticeFlags} Suspicious Flags</Badge>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      <Badge variant={cand.status === 'SHORTLISTED' ? 'success' : cand.status === 'REJECTED' ? 'danger' : 'neutral'}>
                        {cand.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-3 text-right">
                      <Button size="xs" variant="secondary" onClick={() => setSelectedCandidate(cand)}>
                        <Eye size={13} /> Scorecard Report
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        open={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
        onStatusChange={handleStatusChange}
      />

      {/* Full-Screen Create Round Modal */}
      <CreateRoundModal
        open={createRoundModalOpen}
        onClose={() => setCreateRoundModalOpen(false)}
        drive={drive}
        roundNumber={2}
        shortlistedCandidates={shortlistedList}
        onCreateRound={handleCreateRound2Submit}
      />
    </OrganizationLayout>
  )
}

export default DriveDetailPage
