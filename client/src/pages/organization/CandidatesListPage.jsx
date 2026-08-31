import React, { useState, useEffect, useCallback } from 'react'
import { Eye, Sparkles, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import { Card, Button, Badge, SearchInput, Tabs, StatCard, Skeleton, useToast } from '../../components/ui'
import { listAllCandidates, updateCandidateStatus } from '../../api/organization/organizationApi'

const STATUS_BADGES = {
  SHORTLISTED: 'success',
  COMPLETED: 'purple',
  INVITED: 'neutral',
  REJECTED: 'danger',
}

function CandidatesListPage() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { items, total: totalCount } = await listAllCandidates({
        search: search || undefined,
        status: activeTab === 'ALL' ? undefined : activeTab,
        limit: 100,
      })
      setRows(items || [])
      setTotal(totalCount || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, activeTab])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  const handleStatusChange = async (candidateId, newStatus) => {
    const row = rows.find((r) => r.candidate.id === candidateId)
    if (!row) return
    try {
      await updateCandidateStatus(row.driveId, row.roundNumber, candidateId, newStatus)
      setRows((prev) => prev.map((r) => (r.candidate.id === candidateId ? { ...r, candidate: { ...r.candidate, status: newStatus } } : r)))
      setSelectedCandidate((prev) => (prev ? { ...prev, status: newStatus } : prev))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const evaluated = rows.filter((r) => r.candidate.status !== 'INVITED')
  const shortlisted = rows.filter((r) => r.candidate.status === 'SHORTLISTED')
  const scored = rows.filter((r) => r.candidate.aiScore > 0)
  const avgScore = scored.length ? Math.round(scored.reduce((acc, r) => acc + r.candidate.aiScore, 0) / scored.length) : 0

  return (
    <OrganizationLayout
      title="Candidates & Evaluation"
      description="Review AI scorecards and shortlist top candidates across every drive."
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={UserCheck} label="Evaluated Candidates" value={evaluated.length} trend={{ value: `${shortlisted.length} Shortlisted`, positive: true }} />
        <StatCard icon={Sparkles} label="Average AI Score" value={`${avgScore}%`} />
        <StatCard icon={CheckCircle2} label="Shortlist Rate" value={`${evaluated.length ? Math.round((shortlisted.length / evaluated.length) * 100) : 0}%`} />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <Tabs
            tabs={[
              { id: 'ALL', label: 'All Candidates' },
              { id: 'SHORTLISTED', label: 'Shortlisted' },
              { id: 'COMPLETED', label: 'Evaluated' },
              { id: 'INVITED', label: 'Invited' },
              { id: 'REJECTED', label: 'Rejected' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
          <SearchInput placeholder="Search candidates by name..." value={search} onChange={setSearch} className="w-full sm:w-[260px]" />
        </div>

        {error ? (
          <div className="py-12 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-ink font-medium mb-1">Couldn't load candidates</p>
            <p className="text-[13px] text-text-secondary mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchCandidates}>Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-[12px] font-semibold uppercase tracking-wider text-text-secondary">
                  <th className="pb-3 px-3">Candidate Name</th>
                  <th className="pb-3 px-3">Drive / Round</th>
                  <th className="pb-3 px-3">Attempted Date</th>
                  <th className="pb-3 px-3">AI Score</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[13.5px]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-secondary">
                      No candidates found. Try changing your filters or import candidates into a drive.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const cand = row.candidate
                    return (
                      <tr key={cand.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-3">
                          <div className="font-semibold text-ink leading-tight">{cand.name}</div>
                          <div className="text-[12px] text-text-secondary">{cand.email}</div>
                        </td>
                        <td className="py-4 px-3 font-medium text-ink max-w-[260px] truncate">
                          {row.driveTitle} • {row.roundTitle}
                        </td>
                        <td className="py-4 px-3 text-text-secondary whitespace-nowrap">
                          {cand.attemptedDate ? new Date(cand.attemptedDate).toLocaleDateString() : '—'}
                        </td>
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
                          <Button size="xs" variant="secondary" onClick={() => setSelectedCandidate({ ...cand, driveId: row.driveId, roundNumber: row.roundNumber })}>
                            <Eye size={13} /> View Scorecard
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            {total > rows.length && (
              <p className="text-[12.5px] text-text-secondary text-center pt-4">Showing {rows.length} of {total} candidates.</p>
            )}
          </div>
        )}
      </Card>

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
