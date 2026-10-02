import React, { useState, useEffect, useCallback } from 'react'
import { UserPlus, Shield, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import Modal from '../../components/ui/Modal'
import { Card, Button, Badge, Input, Select, StatCard, Skeleton, ConfirmModal, useToast } from '../../components/ui'
import { getTeamMembers, inviteTeamMember as apiInviteTeamMember, removeTeamMember as apiRemoveTeamMember } from '../../api/organization/organizationApi'

const ROLE_OPTIONS = [
  { value: 'RECRUITER', label: 'Lead Recruiter — Drive creation & candidate management' },
  { value: 'EVALUATOR', label: 'Interview Evaluator — Scorecard review & shortlisting' },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager — Final decision & report view' },
  { value: 'CLIENT_ADMIN', label: 'Organization Admin — Full portal access' },
]

const ROLE_BADGE = {
  CLIENT_ADMIN: 'brand',
  RECRUITER: 'info',
  EVALUATOR: 'warning',
  HIRING_MANAGER: 'success',
}

function TeamPage() {
  const toast = useToast()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('RECRUITER')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [removeTarget, setRemoveTarget] = useState(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTeamMembers()
      setTeam((data || []).map((m) => ({ ...m, id: m._id || m.id })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

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
      await apiInviteTeamMember(payload)
      setInviteEmail('')
      setModalOpen(false)
      fetchMembers()
    } catch (err) {
      // Surfaced in the modal, not silently treated as success - an admin
      // must know the invite genuinely wasn't sent.
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const runRemove = async () => {
    if (!removeTarget) return
    try {
      await apiRemoveTeamMember(removeTarget.id)
      setTeam((prev) => prev.filter((m) => m.id !== removeTarget.id))
      toast.success(`${removeTarget.name}'s access has been revoked.`)
      setRemoveTarget(null)
    } catch (err) {
      toast.error(err.message)
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
        {error ? (
          <div className="py-12 text-center">
            <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
            <p className="text-[14px] text-ink font-medium mb-1">Couldn't load your team</p>
            <p className="text-[13px] text-text-secondary mb-4">{error}</p>
            <Button variant="secondary" onClick={fetchMembers}>Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : team.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <UserPlus size={22} />
            </div>
            <h3 className="text-[15px] font-bold text-ink">No team members yet</h3>
            <p className="text-[13.5px] text-text-secondary max-w-sm mx-auto">
              Invite recruiters, evaluators, and hiring managers to collaborate on interview drives.
            </p>
            <div className="pt-2">
              <Button onClick={() => setModalOpen(true)}><UserPlus size={14} /> Invite Team Member</Button>
            </div>
          </div>
        ) : (
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
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
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
                    <Badge variant={ROLE_BADGE[member.role] || 'neutral'}>{member.roleLabel || member.role}</Badge>
                  </td>
                  <td className="py-4 px-3">
                    <Badge variant={member.status === 'ACTIVE' ? 'success' : 'neutral'}>{member.status}</Badge>
                  </td>
                  <td className="py-4 px-3 text-text-secondary text-[12.5px]">{member.lastActive}</td>
                  <td className="py-4 px-3 text-right">
                    {member.role !== 'CLIENT_ADMIN' && (
                      <button
                        title="Remove Access"
                        aria-label={`Remove ${member.name}'s access`}
                        onClick={() => setRemoveTarget(member)}
                        className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
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
            <div className="p-3 rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)] text-[13px] flex items-center gap-2">
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

      <ConfirmModal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={runRemove}
        title="Remove team member?"
        confirmLabel="Remove Access"
        danger
      >
        <p className="text-[13.5px] text-text-secondary">
          {removeTarget?.name} will immediately lose access to this organization's portal. This can't be undone - you'll need to send a new invite to add them back.
        </p>
      </ConfirmModal>
    </OrganizationLayout>
  )
}

export default TeamPage
