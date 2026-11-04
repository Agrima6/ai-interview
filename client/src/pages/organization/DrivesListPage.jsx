import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Plus, ListChecks, Users, Trash2, Sparkles, AlertCircle, SlidersHorizontal, X, Download, LayoutGrid, List, Archive } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CreateDriveModal from '../../components/organization/CreateDriveModal'
import PublicLinkPopover from '../../components/organization/PublicLinkPopover'
import { Card, Button, Badge, SearchInput, Tabs, EmptyState, Skeleton, ConfirmModal, Select, Tooltip, Drawer, Pagination, useToast } from '../../components/ui'
import { listInterviewDrives, updateDriveStatus, exportDrivesCsv } from '../../api/organization/organizationApi'
import { formatEnumLabel } from '../../utils/formatEnumLabel'
import { ROLE_CATEGORY_OPTIONS, DEPARTMENT_OPTIONS, EXPERIENCE_LEVEL_OPTIONS } from '../../constants/driveOptions'

const STATUS_BADGE = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  COMPLETED: 'info',
  CLOSED: 'warning',
  ARCHIVED: 'danger',
}

const EMPTY_FILTERS = { department: '', roleCategory: '', experienceLevel: '', createdFrom: '', createdTo: '' }

const initialsOf = (title = '') => title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

function DrivesListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [drives, setDrives] = useState([])
  const [total, setTotal] = useState(0)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [view, setView] = useState('grid')
  const [activeTab, setActiveTab] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [exporting, setExporting] = useState(false)

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

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportDrivesCsv({ search: search || undefined, status: activeTab === 'ALL' ? undefined : activeTab, ...filters })
      toast.success('Export downloaded.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExporting(false)
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
      description="Every hiring drive, its progress and who is reviewing it."
      action={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="ui-shine inline-flex items-center gap-2.5 h-[50px] px-[22px] rounded-[14px] bg-accent text-white text-[15px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_var(--color-accent)]"
        >
          <Plus size={18} /> Create Interview Drive
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ListChecks, label: 'Total drives', value: total, tab: 'ALL', tint: 'bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-accent' },
            { icon: Sparkles, label: 'Active drives', value: activeDrivesCount, tab: 'ACTIVE', tint: 'bg-[var(--color-success-soft)] text-[var(--color-success)]' },
            { icon: Users, label: 'Candidates on this page', value: totalCandidates, nav: `${basePath}/candidates`, tint: 'bg-[color-mix(in_srgb,var(--color-accent-cyan)_14%,white)] text-[var(--color-accent-cyan)]' },
          ].map((m, i) => (
            <button
              key={m.label}
              type="button"
              onClick={() => (m.nav ? navigate(m.nav) : setActiveTab(m.tab))}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`ui-rise ui-lift text-left flex items-center gap-4 p-[18px] rounded-[20px] bg-card border-[1.5px] ${m.tab && activeTab === m.tab ? 'border-accent' : 'border-line'}`}
            >
              <span className={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center ${m.tint}`}><m.icon size={20} strokeWidth={1.8} /></span>
              <span className="flex flex-col">
                <span className="text-[28px] font-extrabold tracking-[-0.02em] tabular-nums leading-none">{m.value}</span>
                <span className="text-[13px] font-semibold text-text-secondary mt-1">{m.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="ui-rise flex flex-wrap items-center gap-3" style={{ animationDelay: '200ms' }}>
          <div className="flex-[999_1_300px] min-w-0">
            <SearchInput placeholder="Search drives by name or department…" value={search} onChange={setSearch} />
          </div>
          <Tabs
            tabs={[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CLOSED', label: 'Closed' },
              { id: 'DRAFT', label: 'Drafts' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
          <div role="group" aria-label="View" className="flex p-[5px] rounded-[14px] bg-[#e9ebf6]">
            {[{ id: 'grid', icon: LayoutGrid, label: 'Grid view' }, { id: 'list', icon: List, label: 'List view' }].map((v) => (
              <button
                key={v.id}
                type="button"
                aria-label={v.label}
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={`w-11 h-[38px] rounded-[10px] flex items-center justify-center transition-colors ${view === v.id ? 'bg-card shadow-[0_4px_12px_-6px_rgba(13,18,51,0.35)] text-ink' : 'text-text-secondary hover:text-ink'}`}
              >
                <v.icon size={18} />
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={openFilterDrawer} className="h-12 shrink-0 !px-4">
            <SlidersHorizontal size={15} /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
          <Button variant="secondary" onClick={handleExport} disabled={exporting} className="h-12 shrink-0 !px-4">
            <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {filterChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterChips.map((chip) => (
              <span key={chip.key} className="ui-pop inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-accent/10 text-accent-dark text-[12.5px] font-bold">
                {chip.label}
                <button type="button" onClick={() => { clearOneFilter(chip.key); if (chip.clearsAlso) clearOneFilter(chip.clearsAlso) }} aria-label={`Clear filter: ${chip.label}`} className="hover:bg-accent/20 rounded-full p-0.5">
                  <X size={12} />
                </button>
              </span>
            ))}
            <button type="button" onClick={resetFilters} className="text-[12.5px] font-bold text-text-secondary hover:text-ink underline">
              Clear all
            </button>
          </div>
        )}

        {error ? (
          <Card className="p-10 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-ink font-bold mb-1">Couldn't load your drives</p>
            <p className="text-[13px] text-text-secondary mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchDrives}>Retry</Button>
          </Card>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[250px] !rounded-[22px]" />)}
          </div>
        ) : drives.length === 0 ? (
          <div className="ui-pop rounded-[24px] border-[1.5px] border-dashed border-accent/30 bg-card">
            <EmptyState
              icon={ListChecks}
              title={activeFilterCount > 0 || search ? 'No drives match' : 'No interview drives yet'}
              description={activeFilterCount > 0 || search ? 'Try another status, filter or search term.' : 'Create your first drive to start evaluating candidates with AI interviews.'}
              actionLabel={activeFilterCount > 0 || search ? 'Clear filters' : 'Create Interview Drive'}
              onAction={() => (activeFilterCount > 0 || search ? (setSearch(''), resetFilters()) : setModalOpen(true))}
            />
          </div>
        ) : (
          <>
          {view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
            {drives.map((drive, i) => {
              const driveId = drive._id || drive.id
              const tone = STATUS_BADGE[drive.status] || 'neutral'
              return (
                <article
                  key={driveId}
                  onClick={() => navigate(`${basePath}/drives/${driveId}`)}
                  style={{ animationDelay: `${80 + Math.min(i, 8) * 60}ms` }}
                  className="ui-rise ui-lift group cursor-pointer flex flex-col gap-[18px] p-[22px] rounded-[22px] bg-card border border-line"
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-[46px] h-[46px] rounded-[14px] bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-accent-dark flex items-center justify-center font-extrabold text-[14px]">
                      {initialsOf(drive.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-extrabold leading-snug text-ink line-clamp-2 group-hover:text-accent transition-colors">{drive.title}</h3>
                      <p className="text-[13px] text-text-secondary mt-0.5 line-clamp-1">
                        {formatEnumLabel(drive.department)} · {formatEnumLabel(drive.roleCategory)}
                      </p>
                    </div>
                    {drive.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setArchiveTarget(driveId) }}
                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
                        title="Archive drive"
                        aria-label={`Archive ${drive.title}`}
                      >
                        <Archive size={17} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                    <div><div className="text-[12px] font-semibold text-text-secondary">Candidates</div><div className="text-[20px] font-extrabold tabular-nums">{drive.candidatesCount}</div></div>
                    <div><div className="text-[12px] font-semibold text-text-secondary">Passing score</div><div className="text-[20px] font-extrabold tabular-nums text-[var(--color-success)]">{drive.passingThreshold}%</div></div>
                    <div><div className="text-[12px] font-semibold text-text-secondary">Target level</div><div className="text-[14px] font-bold pt-1">{drive.experienceLevel || '—'}</div></div>
                    <div>
                      <div className="text-[12px] font-semibold text-text-secondary">Created</div>
                      <Tooltip content={drive.createdAt ? new Date(drive.createdAt).toLocaleString() : ''}>
                        <div className="text-[14px] font-bold pt-1">{formatDate(drive.createdAt)}</div>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3.5 border-t border-line">
                    <Badge variant={tone} pulse={drive.status === 'ACTIVE'} dot={drive.status !== 'ACTIVE'}>{formatEnumLabel(drive.status)}</Badge>
                    <PublicLinkPopover publicLink={drive.publicLink} />
                  </div>
                </article>
              )
            })}
          </div>
          ) : (
          <section className="ui-fade rounded-[22px] bg-card border border-line p-2.5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="text-[12px] font-bold tracking-[0.06em] text-text-secondary">
                  <th className="px-3.5 py-3">DRIVE</th><th className="px-3.5 py-3">STATUS</th><th className="px-3.5 py-3">CANDIDATES</th>
                  <th className="px-3.5 py-3">PASS</th><th className="px-3.5 py-3">CREATED</th><th className="px-3.5 py-3">LINK</th>
                </tr>
              </thead>
              <tbody>
                {drives.map((drive) => {
                  const driveId = drive._id || drive.id
                  return (
                    <tr key={driveId} onClick={() => navigate(`${basePath}/drives/${driveId}`)} className="ui-row cursor-pointer border-t border-line">
                      <td className="px-3.5 py-3.5">
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 w-[38px] h-[38px] rounded-xl bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] text-accent-dark flex items-center justify-center font-extrabold text-[12px]">{initialsOf(drive.title)}</span>
                          <span className="min-w-0">
                            <span className="block font-bold text-[14px] truncate max-w-[280px]">{drive.title}</span>
                            <span className="text-[12px] text-text-secondary">{formatEnumLabel(drive.department)} · {formatEnumLabel(drive.roleCategory)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5"><Badge variant={STATUS_BADGE[drive.status] || 'neutral'} dot>{formatEnumLabel(drive.status)}</Badge></td>
                      <td className="px-3.5 py-3.5 font-extrabold tabular-nums">{drive.candidatesCount}</td>
                      <td className="px-3.5 py-3.5 font-bold">{drive.passingThreshold}%</td>
                      <td className="px-3.5 py-3.5 text-[13px] text-text-secondary whitespace-nowrap">{formatDate(drive.createdAt)}</td>
                      <td className="px-3.5 py-3.5" onClick={(e) => e.stopPropagation()}><PublicLinkPopover publicLink={drive.publicLink} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
          )}

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
                className="ui-field w-full bg-card border-[1.5px] border-line rounded-[14px] px-3 py-2.5 text-[13px] text-ink outline-none"
              />
              <input
                type="date"
                value={draftFilters.createdTo}
                onChange={(e) => setDraftFilters((f) => ({ ...f, createdTo: e.target.value }))}
                className="ui-field w-full bg-card border-[1.5px] border-line rounded-[14px] px-3 py-2.5 text-[13px] text-ink outline-none"
              />
            </div>
          </div>
        </div>
      </Drawer>
    </OrganizationLayout>
  )
}

export default DrivesListPage
