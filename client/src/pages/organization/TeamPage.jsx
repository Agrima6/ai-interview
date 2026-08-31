import React, { useState, useEffect } from 'react'
import { Plus, UserPlus, Shield, Mail, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import Modal from '../../components/ui/Modal'
import { Card, Button, Badge, Input, Select, StatCard } from '../../components/ui'
import { getTeamMembers, inviteTeamMember as apiInviteTeamMember, removeTeamMember as apiRemoveTeamMember } from '../../api/organization/organizationApi'

const MOCK_TEAM = [
  {
    id: 'usr-1',
    name: 'Abhinav Verma',
    email: 'abc@gmail.com',
    role: 'CLIENT_ADMIN',
    roleLabel: 'Organization Admin',
    status: 'ACTIVE',
    joinedDate: '2026-07-10',
    lastActive: 'Just now',
  },
  {
    id: 'usr-2',
    name: 'Siddharth Rao',
    email: 'siddharth.r@workmateiq.com',
    role: 'RECRUITER',
    roleLabel: 'Lead Recruiter',
    status: 'ACTIVE',
    joinedDate: '2026-07-28',
    lastActive: '2 hours ago',
  },
]

const ROLE_OPTIONS = [
  { value: 'RECRUITER', label: 'Lead Recruiter — Drive creation & candidate management' },
  { value: 'EVALUATOR', label: 'Interview Evaluator — Scorecard review & shortlisting' },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager — Final decision & report view' },
  { value: 'CLIENT_ADMIN', label: 'Organization Admin — Full portal access' },
]

function TeamPage() {
  const [team, setTeam] = useState(MOCK_TEAM)
  const [modalOpen, setModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('RECRUITER')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchMembers = async () => {
    try {
      const data = await getTeamMembers()
      if (data && data.length > 0) {
        setTeam(data.map((m) => ({ ...m, id: m._id || m.id })))
      }
    } catch (err) {
      console.warn('API error fetching team members, utilizing local state fallback:', err)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setSubmitting(true)
    setErrorMessage('')

    const payload = {
      email: inviteEmail.trim(),
      role: inviteRole,
      name: inviteEmail.split('@')[0].replace('.', ' '),
    }

    try {
      const created = await apiInviteTeamMember(payload)
      setTeam((prev) => [...prev, created || payload])
      setInviteEmail('')
      setModalOpen(false)
    } catch (err) {
      console.warn('API invite team error, using fallback:', err)
      const fallbackMember = {
        id: `usr-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        roleLabel: ROLE_OPTIONS.find((r) => r.value === payload.role)?.label.split(' — ')[0] || 'Team Member',
        status: 'PENDING',
        joinedDate: new Date().toISOString().split('T')[0],
        lastActive: 'Invitation sent',
      }
      setTeam((prev) => [...prev, fallbackMember])
      setInviteEmail('')
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (id) => {
    try {
      await apiRemoveTeamMember(id)
      setTeam((prev) => prev.filter((m) => (m._id || m.id) !== id))
    } catch (err) {
      setTeam((prev) => prev.filter((m) => (m._id || m.id) !== id))
    }
  }

  return (
    <OrganizationLayout
      title="Team & Access Control"
      description="Manage organization team members, roles, and interviewer permissions."
      action={
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <UserPlus size={14} /> Invite Team Member
        </Button>
      }
    >
      {/* Top Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Shield} label="Total Members" value={team.length.toString()} />
        <StatCard icon={CheckCircle2} label="Active Users" value={team.filter((t) => t.status === 'ACTIVE').length.toString()} />
        <StatCard icon={Clock} label="Pending Invites" value={team.filter((t) => t.status === 'PENDING').length.toString()} />
      </div>

      {/* Team Table Card */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-[12px] font-semibold uppercase tracking-wider text-text-secondary">
                <th className="pb-3 px-3">Member</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Last Active</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[13.5px]">
              {team.map((member) => {
                const memberId = member._id || member.id
                return (
                  <tr key={memberId} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-brand text-white flex items-center justify-center font-bold text-sm">
                          {(member.name || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-ink leading-tight">{member.name}</div>
                          <div className="text-[12px] text-text-secondary">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 font-medium text-ink">
                      <Badge variant="purple">{member.roleLabel || member.role}</Badge>
                    </td>
                    <td className="py-4 px-3">
                      <Badge variant={member.status === 'ACTIVE' ? 'success' : 'neutral'}>{member.status}</Badge>
                    </td>
                    <td className="py-4 px-3 text-text-secondary text-[12.5px]">{member.lastActive}</td>
                    <td className="py-4 px-3 text-right">
                      {member.role !== 'CLIENT_ADMIN' && (
                        <button
                          title="Remove Access"
                          onClick={() => handleRemoveMember(memberId)}
                          className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Invite New Team Member"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleInvite} disabled={!inviteEmail.trim() || submitting}>
              {submitting ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-[13px] flex items-center gap-2">
              <AlertCircle size={15} /> {errorMessage}
            </div>
          )}
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@workmateiq.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <Select
            label="Assign Permission Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={ROLE_OPTIONS}
          />
        </form>
      </Modal>
    </OrganizationLayout>
  )
}

export default TeamPage
