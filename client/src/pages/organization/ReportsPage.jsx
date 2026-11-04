import React, { useState, useEffect, useCallback } from 'react'
import { ListChecks, Sparkles, Users, CheckCircle2, Star, AlertCircle, Download } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import FunnelChart from '../../components/charts/FunnelChart'
import { Card, Button, Badge, SearchInput, Select, Skeleton, SkeletonText, Pagination, EmptyState, useToast } from '../../components/ui'
import { getOrganizationReport, getOrganizationReportSummary, listAllCandidates, exportCandidatesCsv } from '../../api/organization/organizationApi'
import { toMetricsViewModel, toTrendsViewModel } from '../../api/organization/dashboardViewModel'

const STATUS_BADGE = { SHORTLISTED: 'success', COMPLETED: 'info', INVITED: 'neutral', REJECTED: 'danger' }
const PIE_COLORS = ['var(--color-accent)', 'var(--color-info)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-neutral)', 'var(--color-accent-cyan)']
const chartTooltipStyle = { borderRadius: 12, border: '1px solid var(--color-line)', fontSize: 13, background: 'var(--color-card)', color: 'var(--color-ink)' }
const axisTick = { fontSize: 12, fill: 'var(--color-text-secondary)' }

function ReportsPage() {
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState(null)
  const [loadingReport, setLoadingReport] = useState(true)
  const [reportError, setReportError] = useState('')

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [loadingRows, setLoadingRows] = useState(true)
  const [rowsError, setRowsError] = useState('')
  const [exporting, setExporting] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoadingReport(true)
    setReportError('')
    try {
      const [summaryRaw, trendsRaw] = await Promise.all([getOrganizationReportSummary(), getOrganizationReport('30d')])
      setSummary(toMetricsViewModel(summaryRaw))
      setTrends(toTrendsViewModel(trendsRaw))
    } catch (err) {
      setReportError(err.message)
    } finally {
      setLoadingReport(false)
    }
  }, [])

  useEffect(() => { fetchReport() }, [fetchReport])

  const activeFilters = { search: search || undefined, status: statusFilter || undefined, department: departmentFilter || undefined }

  const fetchRows = useCallback(async () => {
    setLoadingRows(true)
    setRowsError('')
    try {
      const { items, total: totalCount } = await listAllCandidates({ ...activeFilters, page, limit: pageSize })
      setRows(items || [])
      setTotal(totalCount || 0)
    } catch (err) {
      setRowsError(err.message)
    } finally {
      setLoadingRows(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, departmentFilter, page, pageSize])

  useEffect(() => { fetchRows() }, [fetchRows])
  useEffect(() => { setPage(1) }, [search, statusFilter, departmentFilter, pageSize])

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportCandidatesCsv(activeFilters)
      toast.success('Export downloaded.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExporting(false)
    }
  }

  const departmentOptions = [...new Set((trends?.departmentBreakdown || []).map((d) => d.department))]
    .map((d) => ({ value: d, label: d }))

  return (
    <OrganizationLayout
      title="Reports"
      description="Hiring analytics and a filterable, exportable candidate report across every drive."
      action={
        <Button variant="secondary" onClick={handleExport} disabled={exporting} className="h-12">
          <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      }
    >
      {reportError ? (
        <Card className="p-10 text-center mb-6">
          <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
          <p className="text-[14px] text-ink font-medium mb-1">Couldn't load report data</p>
          <p className="text-[13px] text-text-secondary mb-4">{reportError}</p>
          <Button variant="secondary" onClick={fetchReport}>Retry</Button>
        </Card>
      ) : loadingReport ? (
        <div className="space-y-6 mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[130px] !rounded-[20px]" />)}
          </div>
          <div className="grid lg:grid-cols-2 gap-6"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        </div>
      ) : (
        <div className="space-y-6 mb-6">
          <div className="ui-rise grid grid-cols-2 lg:grid-cols-5 gap-px overflow-hidden rounded-[22px] bg-white/10 bg-[var(--color-navy)]">
            <StatTile icon={ListChecks} label="Total drives" value={summary?.totalDrives?.value} />
            <StatTile icon={Sparkles} label="Active drives" value={summary?.activeDrives?.value} />
            <StatTile icon={Users} label="Total candidates" value={summary?.totalCandidates?.value} />
            <StatTile icon={CheckCircle2} label="Interviews done" value={summary?.interviewsDone?.value} />
            <StatTile icon={Star} label="Average score" value={summary?.averageScore?.value != null ? `${summary.averageScore.value}%` : '—'} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-[18px] font-extrabold text-ink mb-6">Interview funnel</h3>
              <FunnelChart stages={trends?.pipeline || []} />
            </Card>

            <Card className="p-6">
              <h3 className="text-[18px] font-extrabold text-ink mb-2">Department wise hiring</h3>
              {!trends?.departmentBreakdown?.length ? (
                <p className="text-[13.5px] text-text-secondary py-10 text-center">No candidate data yet.</p>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={trends.departmentBreakdown} dataKey="count" nameKey="department" innerRadius={45} outerRadius={70} paddingAngle={2}>
                          {trends.departmentBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {trends.departmentBreakdown.slice(0, 6).map((d, i) => (
                      <div key={d.department} className="flex items-center justify-between text-[13px] gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-ink truncate">{d.department}</span>
                        </span>
                        <span className="text-text-secondary font-medium shrink-0">{d.count} ({d.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-[18px] font-extrabold text-ink mb-6">Score distribution</h3>
            <div className="h-56">
              {!trends?.scoreDistribution?.length ? (
                <p className="text-[13.5px] text-text-secondary text-center pt-16">No scored candidates yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                    <XAxis dataKey="bucket" tick={axisTick} axisLine={{ stroke: 'var(--color-line)' }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" fill="var(--color-accent)" radius={[10, 10, 0, 0]} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-[18px] font-extrabold text-ink">Candidate report</h3>
          <p className="text-[13px] text-text-secondary">Filter, then use Export CSV above to download exactly the candidates you're looking at.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <SearchInput placeholder="Search candidates..." value={search} onChange={setSearch} className="w-full sm:w-[260px]" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="All statuses" wrapperClassName="w-full sm:w-[180px]"
            options={[{ value: 'INVITED', label: 'Invited' }, { value: 'SHORTLISTED', label: 'Shortlisted' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'REJECTED', label: 'Rejected' }]} />
          <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} placeholder="All departments" wrapperClassName="w-full sm:w-[200px]" options={departmentOptions} />
        </div>

        {rowsError ? (
          <div className="py-12 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[13px] text-text-secondary mb-4">{rowsError}</p>
            <Button variant="secondary" onClick={fetchRows}>Retry</Button>
          </div>
        ) : loadingRows ? (
          <SkeletonText lines={6} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No candidates match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  <th className="pb-3 px-3">Candidate</th>
                  <th className="pb-3 px-3">Drive / Round</th>
                  <th className="pb-3 px-3">Attempted</th>
                  <th className="pb-3 px-3">Score</th>
                  <th className="pb-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[13.5px]">
                {rows.map((row) => (
                  <tr key={row.candidate.id} className="ui-row">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-ink leading-tight">{row.candidate.name}</div>
                      <div className="text-[12px] text-text-secondary">{row.candidate.email}</div>
                    </td>
                    <td className="py-3.5 px-3 text-ink max-w-[240px] truncate">{row.driveTitle} • {row.roundTitle}</td>
                    <td className="py-3.5 px-3 text-text-secondary whitespace-nowrap">{row.candidate.attemptedDate ? new Date(row.candidate.attemptedDate).toLocaleDateString() : '—'}</td>
                    <td className="py-3.5 px-3 font-bold">{row.candidate.aiScore > 0 ? `${row.candidate.aiScore}%` : <span className="text-text-secondary font-normal">Pending</span>}</td>
                    <td className="py-3.5 px-3"><Badge variant={STATUS_BADGE[row.candidate.status] || 'neutral'}>{row.candidate.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        )}
      </Card>
    </OrganizationLayout>
  )
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-[var(--color-navy)] p-5 flex flex-col gap-3 text-white">
      <span className="w-10 h-10 rounded-[12px] bg-white/10 text-[#aab6ff] flex items-center justify-center">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-[28px] font-extrabold tracking-[-0.02em] leading-none tabular-nums">{value ?? '—'}</p>
        <p className="text-[12.5px] font-semibold text-[#c3c9ee] mt-1.5">{label}</p>
      </div>
    </div>
  )
}

export default ReportsPage
