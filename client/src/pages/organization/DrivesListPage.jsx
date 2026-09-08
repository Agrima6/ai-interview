import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, ListChecks, Users, Trash2, Link2, Sparkles, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CreateDriveModal from '../../components/organization/CreateDriveModal'
import { Card, Button, Badge, SearchInput, Tabs, StatCard, Skeleton, ConfirmModal, useToast } from '../../components/ui'
import { listInterviewDrives, updateDriveStatus } from '../../api/organization/organizationApi'

const STATUS_BADGE = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  COMPLETED: 'purple',
  ARCHIVED: 'neutral',
}

function DrivesListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [drives, setDrives] = useState([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [visibleLinkId, setVisibleLinkId] = useState(null)

  const basePath = location.pathname.startsWith('/college')
    ? '/college'
    : location.pathname.startsWith('/candidate')
    ? '/candidate'
    : location.pathname.startsWith('/organization')
    ? '/organization'
    : '/platform/client'

  const fetchDrives = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const liveDrives = await listInterviewDrives({ search: search || undefined, status: activeTab === 'ALL' ? undefined : activeTab })
      setDrives((liveDrives || []).map((d) => ({
        ...d,
        id: d._id || d.id,
        candidatesCount: d.candidatesCount || d.rounds?.[0]?.candidates?.length || 0,
      })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, activeTab])

  useEffect(() => {
    fetchDrives()
  }, [fetchDrives])

  const handleCreateDrive = () => {
    fetchDrives()
  }

  const handleCopyLink = async (e, link, id) => {
    e.stopPropagation()
    if (!link) {
      toast.error('Public link is not available for this drive.')
      return
    }
    const fullUrl = `${window.location.origin}/apply/${link}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Public link copied to clipboard.')
    } catch (err) {
      toast.error('Could not copy link. Please copy it manually.')
    }
  }

  const handleOpenLink = (e, link) => {
    e.stopPropagation()
    if (!link) return
    window.open(`${window.location.origin}/apply/${link}`, '_blank', 'noopener,noreferrer')
  }

  const runArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      await updateDriveStatus(archiveTarget, 'ARCHIVED')
      toast.success('Drive archived.')
      setArchiveTarget(null)
      fetchDrives()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setArchiving(false)
    }
  }

  const totalDrives = drives.length
  const activeDrives = drives.filter((d) => d.status === 'ACTIVE').length
  const totalCandidates = drives.reduce((acc, d) => acc + (d.candidatesCount || 0), 0)

  return (
    <OrganizationLayout
      title="Interview Drives"
      description="Create, monitor, and manage multi-round AI hiring drives across technical and non-technical role categories."
      action={
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Create New Hiring Drive
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={ListChecks} label="Total Drives" value={totalDrives}
            helperText="All drives, any status"
            onClick={() => setActiveTab('ALL')}
          />
          <StatCard
            icon={Sparkles} label="Active Hiring Drives" value={activeDrives}
            helperText="Currently accepting candidates"
            onClick={() => setActiveTab('ACTIVE')}
          />
          <StatCard
            icon={Users} label="Evaluated Candidates" value={totalCandidates}
            helperText="View full candidate list →"
            onClick={() => navigate(`${basePath}/candidates`)}
          />
        </div>

        <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'ALL', label: 'All Drives' },
              { id: 'ACTIVE', label: 'Active Drives' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'DRAFT', label: 'Drafts' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-full md:w-64">
              <SearchInput placeholder="Search by title or department..." value={search} onChange={setSearch} />
            </div>
          </div>
        </Card>

        {error ? (
          <Card className="p-10 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-ink font-medium mb-1">Couldn't load your drives</p>
            <p className="text-[13px] text-text-secondary mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchDrives}>Retry</Button>
          </Card>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[220px]" />)}
          </div>
        ) : drives.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <ListChecks size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-ink">No interview drives yet</h3>
            <p className="text-[13.5px] text-text-secondary max-w-sm mx-auto">
              Create your first drive to start evaluating candidates.
            </p>
            <div className="pt-2">
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={15} /> Create Interview Drive
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {drives.map((drive) => {
              const driveId = drive._id || drive.id
              return (
                <Card
                  key={driveId}
                  hover
                  className="p-5 flex flex-col justify-between cursor-pointer group border border-line"
                  onClick={() => navigate(`${basePath}/drives/${driveId}`)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant={STATUS_BADGE[drive.status] || 'neutral'}>{drive.status}</Badge>
                        <h3 className="text-[16px] font-bold text-ink group-hover:text-accent transition-colors mt-2.5 line-clamp-1">
                          {drive.title}
                        </h3>
                        <p className="text-[12.5px] text-text-secondary font-medium mt-0.5">
                          {drive.department} • {drive.roleCategory}
                        </p>
                      </div>

                      {drive.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setArchiveTarget(driveId) }}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          title="Archive Drive"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-line text-[12.5px] space-y-1">
                      <div className="flex items-center justify-between text-text-secondary">
                        <span>Target Level:</span>
                        <span className="font-semibold text-ink">{drive.experienceLevel}</span>
                      </div>
                      <div className="flex items-center justify-between text-text-secondary">
                        <span>Passing Threshold:</span>
                        <span className="font-bold text-emerald-600">{drive.passingThreshold}% Pass</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-line space-y-2">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                        <Users size={14} className="text-accent" />
                        <span>{drive.candidatesCount} Candidates</span>
                      </div>

                      {drive.publicLink ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenLink(e, drive.publicLink)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-text-secondary hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            title="Open candidate link in a new tab"
                          >
                            <ExternalLink size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setVisibleLinkId((current) => current === driveId ? null : driveId) }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15 transition-colors font-semibold"
                            title="Show public link"
                          >
                            <Link2 size={12} /> Public Link
                          </button>
                        </div>
                      ) : (
                        <span className="text-text-secondary/60 text-[11.5px] font-medium">No public link</span>
                      )}
                    </div>
                    {visibleLinkId === driveId && drive.publicLink && (
                      <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 p-2">
                        <input readOnly value={`${window.location.origin}/apply/${drive.publicLink}`} className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none" onClick={(e) => e.stopPropagation()} />
                        <button type="button" onClick={(e) => handleCopyLink(e, drive.publicLink, driveId)} className="shrink-0 rounded-md p-1.5 text-accent hover:bg-accent/10" title="Copy public URL">
                          {copiedId === driveId ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <CreateDriveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreateDrive={handleCreateDrive}
      />

      <ConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive this drive?"
        confirmLabel={archiving ? 'Archiving...' : 'Archive drive'}
        danger
        onConfirm={runArchive}
      >
        Archived drives are no longer active but remain visible in your drive history.
      </ConfirmModal>
    </OrganizationLayout>
  )
}

export default DrivesListPage
