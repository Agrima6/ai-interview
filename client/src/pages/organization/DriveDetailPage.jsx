import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle2, ShieldAlert, Sparkles, Eye, FileSpreadsheet, AlertCircle, Link2, Copy, Check, ExternalLink, Upload, Pencil } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import CreateDriveModal from '../../components/organization/CreateDriveModal'
import CreateRoundModal from '../../components/organization/CreateRoundModal'
import CandidateImportModal from '../../components/organization/CandidateImportModal'
import { Card, Button, Badge, SearchInput, StatCard, Skeleton, useToast } from '../../components/ui'
import { getInterviewDriveById, updateDriveStatus, updateRoundStatus, updateCandidateStatus, addCandidatesToDrive } from '../../api/organization/organizationApi'

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
  const [editingRound, setEditingRound] = useState(null)
  const [candidateImportOpen, setCandidateImportOpen] = useState(false)
  const [candidateImporting, setCandidateImporting] = useState(false)
  const [activatingRound, setActivatingRound] = useState(false)

  const [search, setSearch] = useState('')
  const [scoreFilter, setScoreFilter] = useState('ALL')
  const [flagFilter, setFlagFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

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

  const rounds = Array.from(new Map((drive?.rounds || []).map((round) => [Number(round.roundNumber), round])).values())
  const activeRoundNumber = rounds.find((round) => drive?.status !== 'DRAFT' && round.status === 'ACTIVE')?.roundNumber || 1
  const currentRound = rounds.find((r) => String(r.roundNumber) === activeRoundTab)
  const currentRoundStatus = currentRound?.status || 'DRAFT'
  const previousRound = currentRound ? rounds.find((r) => r.roundNumber === currentRound.roundNumber - 1) : null
  const previousRoundReady = Boolean(drive?.status !== 'DRAFT' && previousRound && previousRound.status === 'COMPLETED')
  const roundNeedsPreviousActivation = Boolean(currentRound && previousRound && !previousRoundReady)
  const currentCandidates = currentRound?.candidates || []
  const round1 = rounds.find((r) => r.roundNumber === 1)
  const shortlistedList = (round1?.candidates || []).filter((c) => c.status === 'SHORTLISTED')
  const nextRoundNumber = rounds.length + 1
  const previousRoundForCreate = rounds.find((round) => round.roundNumber === nextRoundNumber - 1)
  const shortlistedCandidatesForCreate = (previousRoundForCreate?.candidates || []).filter((candidate) => candidate.status === 'SHORTLISTED')

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

  const handleRoundStatusChange = async (status = 'ACTIVE') => {
    if (!currentRound) return
    if (drive.status === 'ARCHIVED') {
      toast.error('Archived drives cannot update rounds.')
      return
    }
    if (roundNeedsPreviousActivation) {
      toast.error(`Complete Round ${previousRound.roundNumber} before activating Round ${currentRound.roundNumber}.`)
      return
    }
    setActivatingRound(true)
    try {
      const updated = await updateRoundStatus(id, currentRound.roundNumber, status)
      setDrive(updated)
      toast.success(`Round ${currentRound.roundNumber} marked as ${status.toLowerCase()}.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActivatingRound(false)
    }
  }

  const handleCreateRound2Submit = (updatedDrive) => {
    setDrive(updatedDrive)
    setActiveRoundTab(String(updatedDrive.rounds[updatedDrive.rounds.length - 1].roundNumber))
    setEditingRound(null)
  }

  const handleCandidateImport = async (candidates) => {
    if (!currentRound) return
    setCandidateImporting(true)
    try {
      const updated = await addCandidatesToDrive(id, candidates, currentRound.roundNumber)
      setDrive(updated)
      setCandidateImportOpen(false)
      toast.success('New unique candidates were added. Existing email or phone records were skipped.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCandidateImporting(false)
    }
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
      description={`${drive.roleCategory} • ${drive.department} • Selected Round: Round ${currentRound?.roundNumber || activeRoundNumber} • ${currentRoundStatus}`}
      action={
        <div className="interview-actions flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => navigate(`${basePath}/drives`)}>
            <ArrowLeft size={14} /> Back to Drives
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Download Excel Report
          </Button>
          {drive.status === 'ACTIVE' && currentRound?.status === 'ACTIVE' ? (
            <Button variant="secondary" size="sm" onClick={() => handleRoundStatusChange('COMPLETED')} disabled={activatingRound}>
              <CheckCircle2 size={14} /> Complete Round {currentRound.roundNumber}
            </Button>
          ) : null}
          {drive.status === 'ACTIVE' ? (
            <Button size="sm" onClick={() => handleDriveStatusChange('COMPLETED')}>
              <CheckCircle2 size={14} /> Close Drive
            </Button>
          ) : null}
          {drive.status !== 'ARCHIVED' && currentRound && (currentRound.status === 'DRAFT' || currentRound.status === 'PENDING') ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditingRound(currentRound)}>
                <Pencil size={14} /> Edit Draft Round
              </Button>
              <Button size="sm" onClick={() => handleRoundStatusChange('ACTIVE')} disabled={activatingRound || roundNeedsPreviousActivation} title={roundNeedsPreviousActivation ? `Complete Round ${previousRound.roundNumber} first` : undefined}>
                <CheckCircle2 size={14} /> {activatingRound ? 'Activating...' : `Activate Round ${currentRound.roundNumber}`}
              </Button>
            </>
          ) : null}
          {drive.status !== 'ARCHIVED' && <Button variant="secondary" size="sm" onClick={() => setCandidateImportOpen(true)} disabled={candidateImporting || drive.status === 'DRAFT' || currentRound?.status !== 'ACTIVE'}>
            <Upload size={14} /> Add Candidates
          </Button>}
          {drive.status !== 'ARCHIVED' && <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setCreateRoundModalOpen(true)} disabled={rounds.length >= Math.min(Number(drive.totalRounds) || 1, 4)}>
            <Plus size={14} /> Create Round {rounds.length + 1}
          </Button>}
        </div>
      }
    >
      <div className="interview-page">
      <div className="interview-summary-grid grid sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={CheckCircle2} label="Evaluated Candidates" value={currentCandidates.length}
          helperText="This round, all statuses"
          onClick={() => setStatusFilter('ALL')}
        />
        <StatCard
          icon={Sparkles} label="Shortlisted Candidates" value={shortlistedList.length}
          helperText="View shortlisted →"
          onClick={() => setStatusFilter('SHORTLISTED')}
        />
        <StatCard
          icon={ShieldAlert} label="Proctoring / Malpractice Flags" value={currentCandidates.filter((c) => c.malpracticeFlags > 0).length}
          helperText="Candidates with any flag"
        />
        <StatCard icon={CheckCircle2} label={`Round ${currentRound?.roundNumber || activeRoundNumber} Status`} value={currentRoundStatus} helperText={`Drive ${drive.status} • Round ${currentRound?.roundNumber || activeRoundNumber} of ${drive.totalRounds}`} />
      </div>

      {drive.publicLink && (
        <Card className="interview-public-link p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Link2 size={20} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-ink">Public Apply Link</h3>
                <p className="text-[12.5px] text-text-secondary mt-0.5">
                  Share this link with candidates, post it on job boards, or embed it in Google Forms / career pages.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.open(`${window.location.origin}/apply/${drive.publicLink}`, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[13px] font-semibold text-text-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ExternalLink size={14} /> Open
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/apply/${drive.publicLink}`)
                    setCopiedLink(true)
                    toast.success('Public link copied to clipboard.')
                    setTimeout(() => setCopiedLink(false), 2000)
                  } catch {
                    toast.error('Could not copy link. Please copy it manually.')
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-[13px] font-semibold hover:bg-accent-dark transition-colors"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-line bg-black/2 dark:bg-white/4 p-3 flex items-center gap-2">
            <Link2 size={15} className="text-accent shrink-0" />
            <input
              readOnly
              value={`${window.location.origin}/apply/${drive.publicLink}`}
              className="flex-1 bg-transparent text-[12.5px] font-mono text-ink outline-none truncate"
            />
          </div>
        </Card>
      )}

      <Card className="interview-panel p-4 sm:p-6">
        {drive.status !== 'ARCHIVED' && roundNeedsPreviousActivation && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[12px] font-semibold text-amber-700">
            <AlertCircle size={16} /> Complete Round {previousRound.roundNumber} before activating or inviting candidates to Round {currentRound.roundNumber}.
          </div>
        )}
        <div className="interview-toolbar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-line">
          <div className="interview-round-tabs">
            <div className="hidden md:flex items-center gap-1 overflow-x-auto">
              {rounds.map((round) => {
                const roundId = String(round.roundNumber)
                const isSelected = roundId === activeRoundTab
                return (
                  <button
                    key={roundId}
                    type="button"
                    onClick={() => setActiveRoundTab(roundId)}
                    className={`interview-round-button ${isSelected ? 'is-selected' : ''}`}
                  >
                    <span>Round {round.roundNumber}</span>
                    <small>{round.type} · {round.status || 'DRAFT'}</small>
                  </button>
                )
              })}
            </div>
            <label className="interview-round-select-wrap md:hidden">
              <span>Viewing</span>
              <select value={activeRoundTab} onChange={(event) => setActiveRoundTab(event.target.value)}>
                {rounds.map((round) => (
                  <option key={round.roundNumber} value={round.roundNumber}>
                    Round {round.roundNumber} - {round.type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <SearchInput placeholder="Search name, email, phone..." value={search} onChange={setSearch} className="interview-search w-full sm:w-60" />
        </div>

        <div className="interview-filters grid sm:grid-cols-3 gap-3 mb-6 p-3 sm:p-4 rounded-xl bg-black/2 dark:bg-white/3 border border-line">
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

        <div className="interview-mobile-candidates">
          {filteredCandidates.length === 0 ? (
            <div className="py-10 text-center text-text-secondary">
              {currentCandidates.length === 0 ? 'No candidates in this round yet.' : 'No candidates found matching the applied filters.'}
            </div>
          ) : filteredCandidates.map((cand) => (
            <article key={cand.id} className="interview-candidate-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-ink">{cand.name}</h3>
                  <p className="mt-0.5 text-[12px] text-text-secondary">{cand.exp} experience</p>
                </div>
                <span className={`text-[17px] font-extrabold ${cand.aiScore >= 80 ? 'text-emerald-600' : cand.aiScore >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {cand.aiScore}%
                </span>
              </div>
              <div className="interview-candidate-meta">
                <span>{cand.email}</span>
                <span>{cand.phone}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {cand.malpracticeFlags === 0 ? <Badge variant="success">0 Flags Clean</Badge> : cand.malpracticeFlags === 1 ? <Badge variant="warning">1 Minor Flag</Badge> : <Badge variant="danger">{cand.malpracticeFlags} Suspicious Flags</Badge>}
                <Button size="xs" variant="secondary" onClick={() => setSelectedCandidate(cand)}><Eye size={13} /> Scorecard</Button>
              </div>
            </article>
          ))}
        </div>

        <div className="interview-table-wrap overflow-x-auto">
          <table className="interview-table w-full text-left border-collapse">
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
                  <td colSpan={6} className="py-10 text-center text-text-secondary">
                    {currentCandidates.length === 0 ? 'No candidates in this round yet.' : 'No candidates found matching the applied filters.'}
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-black/1.5 dark:hover:bg-white/2 transition-colors">
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
                        <Badge variant={drive.status === 'DRAFT' || currentRound?.status === 'DRAFT' || currentRound?.status === 'PENDING' ? 'warning' : cand.status === 'SHORTLISTED' ? 'success' : cand.status === 'REJECTED' ? 'danger' : 'neutral'}>
                          {drive.status === 'DRAFT' || currentRound?.status === 'DRAFT' || currentRound?.status === 'PENDING' ? 'DRAFT' : cand.status}
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
      </div>

      <CandidateDetailModal
        open={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
        onStatusChange={handleCandidateStatusChange}
      />

      {editingRound?.roundNumber === 1 ? (
        <CreateDriveModal
          key={`edit-drive-${editingRound.roundNumber}`}
          open={createRoundModalOpen || Boolean(editingRound)}
          onClose={() => { setCreateRoundModalOpen(false); setEditingRound(null) }}
          driveId={id}
          editDrive={drive}
          onCreateDrive={(updatedDrive) => { setDrive(updatedDrive); setEditingRound(null) }}
        />
      ) : (
        <CreateRoundModal
          key={editingRound ? `edit-round-${editingRound.roundNumber}` : `create-round-${rounds.length + 1}`}
          open={createRoundModalOpen || Boolean(editingRound)}
          onClose={() => { setCreateRoundModalOpen(false); setEditingRound(null) }}
          driveId={id}
          roundNumber={editingRound?.roundNumber || nextRoundNumber}
          shortlistedCandidates={editingRound ? shortlistedList : shortlistedCandidatesForCreate}
          previousRound={rounds.find((round) => round.roundNumber === (editingRound?.roundNumber || nextRoundNumber) - 1)}
          driveContext={drive}
          inheritedCommunication={drive.communicationSettings}
          existingRound={editingRound}
          onCreateRound={handleCreateRound2Submit}
        />
      )}

      <CandidateImportModal
        open={candidateImportOpen}
        onClose={() => setCandidateImportOpen(false)}
        onImportComplete={handleCandidateImport}
      />
    </OrganizationLayout>
  )
}

export default DriveDetailPage
