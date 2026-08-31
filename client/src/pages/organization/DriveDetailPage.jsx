import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle2, ShieldAlert, Sparkles, Eye, FileSpreadsheet, AlertCircle } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import CreateRoundModal from '../../components/organization/CreateRoundModal'
import { Card, Button, Badge, SearchInput, Tabs, StatCard, Skeleton, useToast } from '../../components/ui'
import { getInterviewDriveById, updateDriveStatus, updateCandidateStatus } from '../../api/organization/organizationApi'

function DriveDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeRoundTab, setActiveRoundTab] = useState('1')
  const [createRoundModalOpen, setCreateRoundModalOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [scoreFilter, setScoreFilter] = useState('ALL')
  const [flagFilter, setFlagFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const basePath = location.pathname.startsWith('/college')
    ? '/college'
    : location.pathname.startsWith('/candidate')
    ? '/candidate'
    : location.pathname.startsWith('/organization')
    ? '/organization'
    : '/platform/client'

  const fetchDrive = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getInterviewDriveById(id)
      setDrive(data)
      setActiveRoundTab((prev) => (data.rounds?.some((r) => String(r.roundNumber) === prev) ? prev : String(data.rounds?.[0]?.roundNumber || 1)))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchDrive() }, [fetchDrive])

  const rounds = drive?.rounds || []
  const currentRound = rounds.find((r) => String(r.roundNumber) === activeRoundTab)
  const currentCandidates = currentRound?.candidates || []
  const round1 = rounds.find((r) => r.roundNumber === 1)
  const shortlistedList = (round1?.candidates || []).filter((c) => c.status === 'SHORTLISTED')

  const handleCandidateStatusChange = async (candId, newStatus) => {
    if (!currentRound) return
    try {
      const updated = await updateCandidateStatus(id, currentRound.roundNumber, candId, newStatus)
      setDrive(updated)
      setSelectedCandidate((prev) => (prev ? { ...prev, status: newStatus } : prev))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDriveStatusChange = async (status) => {
    try {
      const updated = await updateDriveStatus(id, status)
      setDrive(updated)
      toast.success(`Drive marked as ${status.toLowerCase()}.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleCreateRound2Submit = (updatedDrive) => {
    setDrive(updatedDrive)
    setActiveRoundTab(String(updatedDrive.rounds[updatedDrive.rounds.length - 1].roundNumber))
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
    link.setAttribute('download', `${(drive?.title || 'drive').replace(/[^a-z0-9]+/gi, '_')}_Round_${activeRoundTab}_Results.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredCandidates = currentCandidates.filter((cand) => {
    const matchesSearch =
      cand.name.toLowerCase().includes(search.toLowerCase()) ||
      cand.email.toLowerCase().includes(search.toLowerCase()) ||
      (cand.phone || '').includes(search)

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

  if (loading) {
    return (
      <OrganizationLayout title="Loading drive..." description=" ">
        <div className="space-y-6">
          <div className="grid sm:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
          <Skeleton className="h-96" />
        </div>
      </OrganizationLayout>
    )
  }

  if (error || !drive) {
    return (
      <OrganizationLayout title="Interview Drive" description=" ">
        <Card className="p-10 text-center">
          <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
          <p className="text-[14px] text-ink font-medium mb-1">Couldn't load this drive</p>
          <p className="text-[13px] text-text-secondary mb-4">{error || 'Drive not found.'}</p>
          <Button variant="secondary" onClick={() => navigate(`${basePath}/drives`)}>Back to Drives</Button>
        </Card>
      </OrganizationLayout>
    )
  }

  return (
    <OrganizationLayout
      title={drive.title}
      description={`${drive.roleCategory} • ${drive.department} • Active Round: Round ${drive.currentRound}`}
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => navigate(`${basePath}/drives`)}>
            <ArrowLeft size={14} /> Back to Drives
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Download Excel Report
          </Button>
          {drive.status === 'ACTIVE' ? (
            <Button size="sm" onClick={() => handleDriveStatusChange('COMPLETED')}>
              <CheckCircle2 size={14} /> Mark Drive Complete
            </Button>
          ) : null}
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setCreateRoundModalOpen(true)}>
            <Plus size={14} /> Create Round {rounds.length + 1}
          </Button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CheckCircle2} label="Evaluated Candidates" value={currentCandidates.length} />
        <StatCard icon={Sparkles} label="Shortlisted Candidates" value={shortlistedList.length} />
        <StatCard icon={ShieldAlert} label="Proctoring / Malpractice Flags" value={currentCandidates.filter((c) => c.malpracticeFlags > 0).length} />
        <StatCard icon={CheckCircle2} label="Drive Status" value={drive.status} />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-line">
          <Tabs
            tabs={rounds.map((r) => ({ id: String(r.roundNumber), label: `Round ${r.roundNumber}: ${r.type}` }))}
            value={activeRoundTab}
            onChange={setActiveRoundTab}
          />
          <SearchInput placeholder="Search name, email, phone..." value={search} onChange={setSearch} className="w-full sm:w-[240px]" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-line">
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1">AI Score Range</label>
            <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)} className="w-full px-3 py-1.5 text-[13px] bg-card border border-line rounded-lg text-ink">
              <option value="ALL">All Scores</option>
              <option value="OVER_90">Score &gt; 90% (Top Tier)</option>
              <option value="QUALIFIED">75% - 90% (Qualified)</option>
              <option value="BELOW">&lt; 75% (Below Threshold)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1">Malpractice Flags</label>
            <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)} className="w-full px-3 py-1.5 text-[13px] bg-card border border-line rounded-lg text-ink">
              <option value="ALL">All Proctoring Logs</option>
              <option value="ZERO">0 Flags (Clean Attempt)</option>
              <option value="MINOR">1 Flag (Minor Warning)</option>
              <option value="HIGH">2+ Flags (Suspicious Activity)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-text-secondary mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-1.5 text-[13px] bg-card border border-line rounded-lg text-ink">
              <option value="ALL">All Statuses</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="INVITED">Invited</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

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
                    {currentCandidates.length === 0 ? 'No candidates in this round yet.' : 'No candidates found matching the applied filters.'}
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

      <CandidateDetailModal
        open={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
        onStatusChange={handleCandidateStatusChange}
      />

      <CreateRoundModal
        open={createRoundModalOpen}
        onClose={() => setCreateRoundModalOpen(false)}
        driveId={id}
        roundNumber={rounds.length + 1}
        shortlistedCandidates={shortlistedList}
        onCreateRound={handleCreateRound2Submit}
      />
    </OrganizationLayout>
  )
}

export default DriveDetailPage
