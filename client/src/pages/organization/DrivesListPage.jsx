import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, ListChecks, Users, Trash2, Sparkles, AlertCircle, SlidersHorizontal, X } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CreateDriveModal from '../../components/organization/CreateDriveModal'
import PublicLinkPopover from '../../components/organization/PublicLinkPopover'
import { Card, Button, Badge, SearchInput, Tabs, StatCard, Skeleton, ConfirmModal, Select, Tooltip, Drawer, Pagination, useToast } from '../../components/ui'
import { listInterviewDrives, updateDriveStatus } from '../../api/organization/organizationApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'
import { ROLE_CATEGORY_OPTIONS, DEPARTMENT_OPTIONS, EXPERIENCE_LEVEL_OPTIONS } from '../../constants/driveOptions'

const STATUS_BADGE = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  COMPLETED: 'info',
  ARCHIVED: 'danger',
}

const EMPTY_FILTERS = { department: '', roleCategory: '', experienceLevel: '', createdFrom: '', createdTo: '' }

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

function DrivesListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [drives, setDrives] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const activeFilterCount = Object.values(filters).filter(Boolean).length

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
      const { items, total: totalCount } = await listInterviewDrives({
        search: search || undefined,
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        pageSize,
        ...filters,
      })
      setDrives((items || []).map((d) => ({
        ...d,
        id: d._id || d.id,
        candidatesCount: d.candidatesCount || d.rounds?.[0]?.candidates?.length || 0,
      })))
      setTotal(totalCount || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, activeTab, page, pageSize, filters])

  useEffect(() => { fetchDrives() }, [fetchDrives])

  // Any change to what's being asked for should land back on page 1 - a
  // stale page number past the new (usually smaller) result count would
  // just show an empty page instead of the first matches.
  useEffect(() => { setPage(1) }, [search, activeTab, pageSize, filters])

  const handleCreateDrive = () => {
    fetchDrives()
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

  const openFilterDrawer = () => {
    setDraftFilters(filters)
    setFilterDrawerOpen(true)
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setFilterDrawerOpen(false)
  }

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setFilterDrawerOpen(false)
  }

  const clearOneFilter = (key) => setFilters((prev) => ({ ...prev, [key]: '' }))

  const filterChips = useMemo(() => {
    const chips = []
    if (filters.department) chips.push({ key: 'department', label: `Department: ${filters.department}` })
    if (filters.roleCategory) chips.push({ key: 'roleCategory', label: `Role: ${formatEnumLabel(filters.roleCategory)}` })
    if (filters.experienceLevel) chips.push({ key: 'experienceLevel', label: `Experience: ${filters.experienceLevel}` })
    if (filters.createdFrom || filters.createdTo) chips.push({ key: 'createdFrom', label: `Created: ${filters.createdFrom || '…'} – ${filters.createdTo || '…'}`, clearsAlso: 'createdTo' })
    return chips
  }, [filters])

  // Server-computed totals shown in the KPI row, so "Total Drives" reflects
  // the whole tenant, not just the current filtered/paginated page.
  const activeDrivesCount = activeTab === 'ACTIVE' ? total : drives.filter((d) => d.status === 'ACTIVE').length
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
            icon={ListChecks} label="Total Drives" value={total}
            helperText="All drives, any status"
            onClick={() => setActiveTab('ALL')}
          />
          <StatCard
            icon={Sparkles} label="Active Hiring Drives" value={activeDrivesCount}
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
            <Button variant="secondary" size="sm" onClick={openFilterDrawer} className="shrink-0">
              <SlidersHorizontal size={14} /> Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </Button>
          </div>
        </Card>

        {filterChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterChips.map((chip) => (
              <span key={chip.key} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-accent/10 text-accent text-[12.5px] font-medium">
                {chip.label}
                <button type="button" onClick={() => { clearOneFilter(chip.key); if (chip.clearsAlso) clearOneFilter(chip.clearsAlso) }} className="hover:bg-accent/20 rounded-full p-0.5">
                  <X size={12} />
                </button>
              </span>
            ))}
            <button type="button" onClick={resetFilters} className="text-[12.5px] font-medium text-text-secondary hover:text-ink underline">
              Clear all
            </button>
          </div>
        )}

        {error ? (
          <Card className="p-10 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-ink font-medium mb-1">Couldn't load your drives</p>
            <p className="text-[13px] text-text-secondary mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchDrives}>Retry</Button>
          </Card>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[240px]" />)}
          </div>
        ) : drives.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <ListChecks size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-ink">
              {activeFilterCount > 0 || search ? 'No drives match your filters' : 'No interview drives yet'}
            </h3>
            <p className="text-[13.5px] text-text-secondary max-w-sm mx-auto">
              {activeFilterCount > 0 || search ? 'Try adjusting or clearing your filters.' : 'Create your first drive to start evaluating candidates.'}
            </p>
            <div className="pt-2">
              {activeFilterCount > 0 || search ? (
                <Button variant="secondary" onClick={() => { setSearch(''); resetFilters() }}>Clear filters</Button>
              ) : (
                <Button onClick={() => setModalOpen(true)}><Plus size={15} /> Create Interview Drive</Button>
              )}
            </div>
          </Card>
        ) : (
          <>
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
                          {formatEnumLabel(drive.department)} • {formatEnumLabel(drive.roleCategory)}
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

                    <div className="flex items-center justify-between text-[11.5px] text-text-secondary">
                      <Tooltip content={drive.createdAt ? new Date(drive.createdAt).toLocaleString() : ''}>
                        <span>Created {formatDate(drive.createdAt)}</span>
                      </Tooltip>
                      <Tooltip content={drive.updatedAt ? new Date(drive.updatedAt).toLocaleString() : ''}>
                        <span>Updated {formatDate(drive.updatedAt)}</span>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-line flex items-center justify-between text-[12.5px]">
                    <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                      <Users size={14} className="text-accent" />
                      <span>{drive.candidatesCount} Candidates</span>
                    </div>

                    <PublicLinkPopover publicLink={drive.publicLink} />
                  </div>
                </Card>
              )
            })}
          </div>

          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </>
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

      <Drawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title="Filter Drives"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={resetFilters}>Reset</Button>
            <Button size="sm" onClick={applyFilters}>Apply Filters</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select
            label="Department"
            value={draftFilters.department}
            onChange={(e) => setDraftFilters((f) => ({ ...f, department: e.target.value }))}
            placeholder="All departments"
            options={DEPARTMENT_OPTIONS}
          />
          <Select
            label="Role Category"
            value={draftFilters.roleCategory}
            onChange={(e) => setDraftFilters((f) => ({ ...f, roleCategory: e.target.value }))}
            placeholder="All roles"
            options={ROLE_CATEGORY_OPTIONS}
          />
          <Select
            label="Experience"
            value={draftFilters.experienceLevel}
            onChange={(e) => setDraftFilters((f) => ({ ...f, experienceLevel: e.target.value }))}
            placeholder="All experience levels"
            options={EXPERIENCE_LEVEL_OPTIONS}
          />
          <div>
            <label className="block text-[13.5px] font-semibold text-ink mb-2">Created date</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={draftFilters.createdFrom}
                onChange={(e) => setDraftFilters((f) => ({ ...f, createdFrom: e.target.value }))}
                className="w-full bg-card border border-line rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
              />
              <input
                type="date"
                value={draftFilters.createdTo}
                onChange={(e) => setDraftFilters((f) => ({ ...f, createdTo: e.target.value }))}
                className="w-full bg-card border border-line rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
              />
            </div>
          </div>
        </div>
      </Drawer>
    </OrganizationLayout>
  )
}

export default DrivesListPage
