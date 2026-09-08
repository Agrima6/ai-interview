import React, { useState, useEffect, useCallback } from 'react'
import { Eye, Sparkles, CheckCircle2, UserCheck, AlertCircle, ChevronLeft, ChevronRight, Upload, Pencil, Trash2 } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CandidateDetailModal from '../../components/organization/CandidateDetailModal'
import CandidateImportModal from '../../components/organization/CandidateImportModal'
import { Card, Button, Badge, SearchInput, Tabs, StatCard, Skeleton, Select, Input, Modal, ConfirmModal, useToast } from '../../components/ui'
import { listAllCandidates, updateCandidateStatus, updateCandidate, removeCandidate, listInterviewDrives, addCandidatesToDrive } from '../../api/organization/organizationApi'

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
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [drives, setDrives] = useState([])
  const [selectedDriveId, setSelectedDriveId] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', exp: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

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
  }, [search, activeTab, page])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])
  useEffect(() => { setPage(1) }, [search, activeTab])
  useEffect(() => {
    listInterviewDrives({ status: 'ACTIVE' }).then((items) => {
      setDrives(items || [])
      setSelectedDriveId((current) => current || items?.[0]?._id || '')
    }).catch(() => setDrives([]))
  }, [])

  const handleImportComplete = async (candidates) => {
    if (!selectedDriveId) return
    try {
      await addCandidatesToDrive(selectedDriveId, candidates)
      toast.success(`${candidates.length} candidate(s) imported.`)
      setImportModalOpen(false)
      fetchCandidates()
    } catch (err) {
      toast.error(err.message)
    }
  }

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

  const openEdit = (row) => {
    setEditingCandidate(row)
    setEditForm({ name: row.candidate.name || '', email: row.candidate.email || '', phone: row.candidate.phone || '', exp: row.candidate.exp || '' })
  }

  const handleEditSave = async () => {
    if (!editingCandidate) return
    setSavingEdit(true)
    try {
      await updateCandidate(editingCandidate.driveId, editingCandidate.roundNumber, editingCandidate.candidate.id, editForm)
      setRows((prev) => prev.map((row) => row.candidate.id === editingCandidate.candidate.id ? { ...row, candidate: { ...row.candidate, ...editForm } } : row))
      setEditingCandidate(null)
      toast.success('Student details updated.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    try {
      await removeCandidate(removeTarget.driveId, removeTarget.roundNumber, removeTarget.candidate.id)
      setRemoveTarget(null)
      toast.success('Student removed from the drive.')
      fetchCandidates()
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
      action={
        <div className="flex items-center gap-2">
          <Select value={selectedDriveId} onChange={(e) => setSelectedDriveId(e.target.value)} options={[{ value: '', label: 'Select drive' }, ...drives.map((drive) => ({ value: drive._id, label: drive.title }))]} />
          <Button onClick={() => setImportModalOpen(true)} disabled={!selectedDriveId}>
            <Upload size={15} /> Import Candidates
          </Button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={UserCheck} label="Evaluated Candidates" value={evaluated.length}
          trend={{ value: `${shortlisted.length} Shortlisted`, positive: true }}
          helperText="Everyone except still-invited"
          onClick={() => setActiveTab('COMPLETED')}
        />
        <StatCard icon={Sparkles} label="Average AI Score" value={`${avgScore}%`} helperText="Across scored candidates" />
        <StatCard
          icon={CheckCircle2} label="Shortlist Rate" value={`${evaluated.length ? Math.round((shortlisted.length / evaluated.length) * 100) : 0}%`}
          helperText="View shortlisted →"
          onClick={() => setActiveTab('SHORTLISTED')}
        />
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
                  <th className="pb-3 px-3">Student Details</th>
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
                    <td colSpan={7} className="py-12 text-center text-text-secondary">
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
                        <td className="py-4 px-3 text-[12px] text-text-secondary">
                          <div>{cand.phone || 'No phone'}</div>
                          <div>{cand.exp || 'Experience not set'}</div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="xs" variant="secondary" onClick={() => setSelectedCandidate({ ...cand, driveId: row.driveId, roundNumber: row.roundNumber })} title="View scorecard">
                              <Eye size={13} /> View
                            </Button>
                            <button type="button" onClick={() => openEdit(row)} className="p-2 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10" title="Edit student details" aria-label="Edit student details">
                              <Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => setRemoveTarget(row)} className="p-2 rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50" title="Remove student" aria-label="Remove student">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-4 border-t border-line mt-4 pt-4 text-[12.5px] text-text-secondary">
              <span>Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} candidates</span>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading}>
                  <ChevronLeft size={13} /> Previous
                </Button>
                <span className="min-w-16 text-center font-semibold text-ink">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
                <Button size="xs" variant="secondary" onClick={() => setPage((current) => current + 1)} disabled={page >= Math.ceil(total / pageSize) || loading}>
                  Next <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <CandidateDetailModal
        open={Boolean(selectedCandidate)}
        onClose={() => setSelectedCandidate(null)}
        candidate={selectedCandidate}
        onStatusChange={handleStatusChange}
      />
      <CandidateImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
      <Modal open={Boolean(editingCandidate)} onClose={() => setEditingCandidate(null)} title="Edit student details" size="md" footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => setEditingCandidate(null)} disabled={savingEdit}>Cancel</Button>
          <Button size="sm" onClick={handleEditSave} disabled={savingEdit || !editForm.name.trim() || !editForm.email.trim()}>{savingEdit ? 'Saving...' : 'Save changes'}</Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Full name" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label="Email address" type="email" value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <Input label="Experience" value={editForm.exp} onChange={(e) => setEditForm((prev) => ({ ...prev, exp: e.target.value }))} />
          </div>
        </div>
      </Modal>
      <ConfirmModal open={Boolean(removeTarget)} onClose={() => setRemoveTarget(null)} title="Remove student?" confirmLabel="Remove student" danger onConfirm={handleRemove}>
        This removes {removeTarget?.candidate?.name || 'this student'} from the selected drive. Their completed interview data will no longer appear in this candidate roster.
      </ConfirmModal>
    </OrganizationLayout>
  )
}

export default CandidatesListPage
