import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, ListChecks, Users, CheckCircle2, Copy, Eye, MoreVertical, Trash2, Calendar, Link2, Sparkles } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import CreateDriveModal from '../../components/organization/CreateDriveModal'
import { Card, Button, Badge, SearchInput, Tabs, StatCard } from '../../components/ui'
import { listInterviewDrives } from '../../api/organization/organizationApi'

const MOCK_DRIVES = [
  {
    id: 'drive-101',
    title: 'Senior Full Stack Developer Hiring Drive 2026',
    department: 'Engineering',
    roleCategory: 'Software Engineering',
    experienceLevel: '3-5 years',
    expiryDate: '2026-09-25',
    questionBankTitle: 'Full Stack Web Development (React & Node.js)',
    passingThreshold: 75,
    candidatesCount: 42,
    completedCount: 31,
    status: 'ACTIVE',
    createdAt: '2026-08-15',
    publicLink: 'https://workmateiq.com/drive/senior-fullstack-2026',
  },
  {
    id: 'drive-102',
    title: 'Campus Graduate Trainee Screening — Batch A',
    department: 'Campus Recruitment',
    roleCategory: 'Campus Placement / Graduate',
    experienceLevel: 'Fresher / Graduate',
    expiryDate: '2026-10-10',
    questionBankTitle: 'Core Computer Science & Problem Solving',
    passingThreshold: 65,
    candidatesCount: 128,
    completedCount: 96,
    status: 'ACTIVE',
    createdAt: '2026-08-20',
    publicLink: 'https://workmateiq.com/drive/campus-grad-2026',
  },
  {
    id: 'drive-103',
    title: 'Data Science & Machine Learning Evaluation',
    department: 'Data & Analytics',
    roleCategory: 'Data Science & Analytics',
    experienceLevel: '2-4 years',
    expiryDate: '2026-08-30',
    questionBankTitle: 'Data Structures & System Architecture',
    passingThreshold: 70,
    candidatesCount: 18,
    completedCount: 18,
    status: 'COMPLETED',
    createdAt: '2026-08-01',
    publicLink: 'https://workmateiq.com/drive/data-science-eval',
  },
]

const STATUS_BADGE = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  COMPLETED: 'purple',
}

function DrivesListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [drives, setDrives] = useState(MOCK_DRIVES)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [loading, setLoading] = useState(true)

  const basePath = location.pathname.startsWith('/college')
    ? '/college'
    : location.pathname.startsWith('/candidate')
    ? '/candidate'
    : location.pathname.startsWith('/organization')
    ? '/organization'
    : '/platform/client'

  const fetchDrives = async () => {
    setLoading(true)
    try {
      const liveDrives = await listInterviewDrives({ search, status: activeTab })
      if (liveDrives && liveDrives.length > 0) {
        setDrives(liveDrives.map(d => ({
          ...d,
          id: d._id || d.id,
          candidatesCount: d.candidatesCount || d.importedCandidateList?.length || 0,
          completedCount: d.completedCount || 0,
        })))
      }
    } catch (err) {
      console.warn('API error fetching drives, utilizing local state fallback:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrives()
  }, [activeTab])

  const handleCreateDrive = (newDrive) => {
    setDrives((prev) => [newDrive, ...prev])
    fetchDrives()
  }

  const handleDeleteDrive = (id) => {
    setDrives((prev) => prev.filter((d) => (d._id || d.id) !== id))
  }

  const handleCopyLink = (e, link, id) => {
    e.stopPropagation()
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredDrives = drives.filter((d) => {
    const matchesSearch =
      (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.department || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.roleCategory || '').toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'ALL' || d.status === activeTab
    return matchesSearch && matchesTab
  })

  const totalDrives = drives.length
  const activeDrives = drives.filter((d) => d.status === 'ACTIVE').length
  const totalCandidates = drives.reduce((acc, d) => acc + (d.candidatesCount || 0), 0)

  return (
    <OrganizationLayout
      title="Interview Drives Management"
      description="Create, monitor, and manage multi-round AI hiring drives across technical and non-technical role categories."
      action={
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Create New Hiring Drive
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Analytics Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Drives Created"
            value={totalDrives}
            icon={ListChecks}
            change="+2 this month"
            changeType="positive"
          />
          <StatCard
            title="Active Hiring Drives"
            value={activeDrives}
            icon={Sparkles}
            change="Live AI Screenings"
            changeType="positive"
          />
          <StatCard
            title="Evaluated Candidates"
            value={totalCandidates}
            icon={Users}
            change="Across all drives"
            changeType="neutral"
          />
        </div>

        {/* Filter Toolbar & Action Button */}
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
              <SearchInput
                placeholder="Search by title or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>
            <Button onClick={() => setModalOpen(true)} className="shrink-0">
              <Plus size={15} /> Create Drive
            </Button>
          </div>
        </Card>

        {/* Drives Grid / Roster */}
        {filteredDrives.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <ListChecks size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-ink">No Interview Drives Found</h3>
            <p className="text-[13.5px] text-text-secondary max-w-sm mx-auto">
              No interview drives match your current search criteria. Click below to create a new hiring drive.
            </p>
            <div className="pt-2">
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={15} /> Create Interview Drive
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDrives.map((drive) => {
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

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDrive(driveId)
                        }}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Delete Drive"
                      >
                        <Trash2 size={15} />
                      </button>
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

                  <div className="pt-4 mt-4 border-t border-line flex items-center justify-between text-[12.5px]">
                    <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                      <Users size={14} className="text-accent" />
                      <span>{drive.candidatesCount} Candidates</span>
                    </div>

                    {drive.publicLink && (
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, drive.publicLink, driveId)}
                        className="flex items-center gap-1 text-accent hover:underline font-semibold"
                      >
                        <Link2 size={13} /> {copiedId === driveId ? 'Copied Link!' : 'Public Link'}
                      </button>
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
    </OrganizationLayout>
  )
}

export default DrivesListPage
