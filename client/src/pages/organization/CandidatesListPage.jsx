import React, { useState, useEffect, useCallback } from 'react'
import { Eye, Sparkles, CheckCircle2, UserCheck, AlertCircle, Users, X } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import { Button, Badge, SearchInput, Tabs, StatCard, Skeleton, Pagination, EmptyState, ConfirmModal, useToast } from '../../components/ui'
import { listAllCandidates, updateCandidateStatus } from '../../api/organization/organizationApi'
import { CANDIDATE_FIELDS } from '../../constants/candidateSchema'

// Name+email render as one combined cell below; every other schema field
// (phone, experience, ...) gets its own column automatically - adding a
// field to candidateSchema.js is enough to have it show up here too.
const EXTRA_CANDIDATE_FIELDS = CANDIDATE_FIELDS.filter((f) => f.key !== 'name' && f.key !== 'email')

const STATUS_BADGES = {
  SHORTLISTED: 'success',
  COMPLETED: 'info',
  INVITED: 'neutral',
  REJECTED: 'danger',
}

function CandidatesListPage() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { items, total: totalCount } = await listAllCandidates({
        search: search || undefined,
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        limit: pageSize,
      })
      setRows(items || [])
      setTotal(totalCount || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, activeTab, page, pageSize])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  // Filters/search/page-size changes always land back on page 1 - a stale
  // page number past the new result count would show an empty page.
  useEffect(() => { setPage(1) }, [search, activeTab, pageSize])
  // A selection only makes sense for the rows currently on screen.
  useEffect(() => { setSelected(new Set()) }, [search, activeTab, page, pageSize])

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

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.candidate.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.candidate.id)))
  const toggleOne = (id) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const runBulk = async (status) => {
    if (bulkBusy) return
    setBulkBusy(true)
    let ok = 0
    for (const id of selected) {
      const row = rows.find((r) => r.candidate.id === id)
      if (!row) continue
      try {
        await updateCandidateStatus(row.driveId, row.roundNumber, id, status)
        ok += 1
      } catch (err) {
        toast.error(`${row.candidate.name}: ${err.message}`)
      }
    }
    if (ok) toast.success(`${ok} candidate${ok === 1 ? '' : 's'} marked ${status.toLowerCase()}.`)
    setSelected(new Set())
    setRejectOpen(false)
    setBulkBusy(false)
    fetchCandidates()
  }

  const evaluated = rows.filter((r) => r.candidate.status !== 'INVITED')
  const shortlisted = rows.filter((r) => r.candidate.status === 'SHORTLISTED')
  const scored = rows.filter((r) => r.candidate.aiScore > 0)
  const avgScore = scored.length ? Math.round(scored.reduce((acc, r) => acc + r.candidate.aiScore, 0) / scored.length) : 0
  const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
  const scoreTone = (n) => (n >= 80 ? 'var(--color-success)' : n >= 65 ? 'var(--color-warning)' : 'var(--color-danger)')

  return (
    <OrganizationLayout
      title="Candidates"
      description="Everyone across your drives, ranked by AI interview score."
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={UserCheck} accent="brand" label="Evaluated (this page)" value={evaluated.length}
          trend={{ value: `${shortlisted.length} shortlisted`, positive: true }}
          helperText="Everyone except still-invited"
          onClick={() => setActiveTab('COMPLETED')}
        />
        <StatCard icon={Sparkles} accent="cyan" label="Average AI score" value={`${avgScore}%`} helperText="Across scored candidates on this page" />
        <StatCard
          icon={CheckCircle2} accent="success" label="Shortlist rate" value={`${evaluated.length ? Math.round((shortlisted.length / evaluated.length) * 100) : 0}%`}
          helperText="View shortlisted →"
          onClick={() => setActiveTab('SHORTLISTED')}
        />
      </div>

      <section className="ui-rise rounded-[22px] bg-card border border-line p-4 flex flex-col gap-3" style={{ animationDelay: '120ms' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-[999_1_280px] min-w-0">
            <SearchInput placeholder="Search name, email or drive…" value={search} onChange={setSearch} />
          </div>
          <Tabs
            tabs={[
              { id: 'ALL', label: 'All' },
              { id: 'SHORTLISTED', label: 'Shortlisted' },
              { id: 'COMPLETED', label: 'Evaluated' },
              { id: 'INVITED', label: 'Invited' },
              { id: 'REJECTED', label: 'Rejected' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
          <span className="text-[13px] font-semibold text-text-secondary">{total} candidate{total === 1 ? '' : 's'}</span>
        </div>

        {error ? (
          <div className="py-12 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-ink font-bold mb-1">Couldn't load candidates</p>
            <p className="text-[13px] text-text-secondary mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchCandidates}>Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 !rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No candidates found" description="Try changing your filters, or import candidates into a drive." />
        ) : (
          <div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left border-collapse">
              <thead>
                <tr className="text-[12px] font-bold tracking-[0.06em] text-text-secondary">
                  <th className="py-2.5 px-3 w-11">
                    <input type="checkbox" aria-label="Select all candidates on this page" checked={allSelected} onChange={toggleAll} className="w-[18px] h-[18px] accent-[var(--color-accent)]" />
                  </th>
                  <th className="py-2.5 px-3">CANDIDATE</th>
                  {EXTRA_CANDIDATE_FIELDS.map((f) => <th key={f.key} className="py-2.5 px-3 uppercase">{f.label}</th>)}
                  <th className="py-2.5 px-3">DRIVE / ROUND</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">AI SCORE</th>
                  <th className="py-2.5 px-3">DATE</th>
                  <th className="py-2.5 px-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cand = row.candidate
                  const isSel = selected.has(cand.id)
                  return (
                    <tr key={cand.id} className={`ui-row border-t border-line ${isSel ? 'bg-accent/[0.05]' : ''}`}>
                      <td className="py-3 px-3">
                        <input type="checkbox" aria-label={`Select ${cand.name}`} checked={isSel} onChange={() => toggleOne(cand.id)} className="w-[18px] h-[18px] accent-[var(--color-accent)]" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-accent-dark flex items-center justify-center font-extrabold text-[13px]">{initialsOf(cand.name)}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-[14px] text-ink leading-tight">{cand.name}</div>
                            <div className="text-[12px] text-text-secondary truncate max-w-[200px]">{cand.email}</div>
                          </div>
                        </div>
                      </td>
                      {EXTRA_CANDIDATE_FIELDS.map((f) => (
                        <td key={f.key} className="py-3 px-3 text-[13px] text-text-secondary whitespace-nowrap">{cand[f.key] || '—'}</td>
                      ))}
                      <td className="py-3 px-3 text-[13px] font-semibold text-ink max-w-[240px] truncate">{row.driveTitle} · {row.roundTitle}</td>
                      <td className="py-3 px-3"><Badge variant={STATUS_BADGES[cand.status] || 'neutral'} dot>{cand.status}</Badge></td>
                      <td className="py-3 px-3">
                        {cand.aiScore > 0 ? (
                          <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-[14px] min-w-[34px] tabular-nums">{cand.aiScore}%</span>
                            <span className="w-16 h-2 rounded-md bg-[var(--color-surface-muted)] overflow-hidden"><span className="block h-full rounded-md" style={{ width: `${Math.min(cand.aiScore, 100)}%`, background: scoreTone(cand.aiScore) }} /></span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-text-secondary">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[13px] text-text-secondary whitespace-nowrap">{cand.attemptedDate ? new Date(cand.attemptedDate).toLocaleDateString() : '—'}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Button size="xs" variant="secondary" onClick={() => setSelectedCandidate({ ...cand, driveId: row.driveId, roundNumber: row.roundNumber })}>
                          <Eye size={13} /> Scorecard
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
            {total > 0 && (
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
            )}
          </div>
        )}
      </section>

      {selected.size > 0 && (
        <div className="ui-pop fixed left-1/2 -translate-x-1/2 bottom-6 z-[var(--z-popover)] flex flex-wrap items-center justify-center gap-2.5 pl-5 pr-2.5 py-2.5 rounded-[18px] bg-[var(--color-navy)] text-white shadow-[0_24px_50px_-20px_rgba(11,18,64,0.8)] max-w-[calc(100%-32px)]">
          <span className="font-bold text-[14px]">{selected.size} selected</span>
          <button type="button" disabled={bulkBusy} onClick={() => runBulk('SHORTLISTED')} className="h-[42px] px-4 rounded-xl bg-accent text-[13px] font-bold disabled:opacity-50">Shortlist</button>
          <button type="button" disabled={bulkBusy} onClick={() => setRejectOpen(true)} className="h-[42px] px-4 rounded-xl border border-white/25 text-[#adb9fb] text-[13px] font-bold disabled:opacity-50">Reject</button>
          <button type="button" aria-label="Clear selection" onClick={() => setSelected(new Set())} className="w-[42px] h-[42px] rounded-xl bg-white/10 flex items-center justify-center"><X size={16} /></button>
        </div>
      )}

      <ConfirmModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${selected.size} candidate${selected.size === 1 ? '' : 's'}?`}
        confirmLabel={bulkBusy ? 'Rejecting...' : 'Reject candidates'}
        danger
        onConfirm={() => runBulk('REJECTED')}
      >
        This marks the selected candidates as rejected. They stay in your records and the status can be changed later.
      </ConfirmModal>

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
