import React, { useState, useEffect, useCallback } from 'react'
import { UserPlus, Shield, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react'
import OrganizationLayout from '../../components/organization/OrganizationLayout'
import { Card, Button, Badge, EmptyState, Skeleton, ConfirmModal, useToast } from '../../components/ui'
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

  const activeMembers = team.filter((m) => m.status !== 'PENDING')
  const pendingMembers = team.filter((m) => m.status === 'PENDING')
  const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

  return (
    <OrganizationLayout
      title="Team"
      description="People who create drives, review interviews and make hiring calls."
    >
      <section className="ui-rise relative overflow-hidden rounded-[24px] bg-[var(--color-navy)] text-white p-6 sm:p-8 mb-6 flex flex-col gap-4">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[18px] font-bold">Invite a teammate</h2>
            <p className="text-[14px] text-[#c3c9ee] mt-1">They’ll get an email invitation to join your organization on WorkmateIQ.</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[13px] text-[#c3c9ee]">
            <span className="inline-flex items-center gap-1.5"><Shield size={15} /> {team.length} members</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> {team.filter((t) => t.status === 'ACTIVE').length} active</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {pendingMembers.length} pending</span>
          </div>
        </div>
        <form onSubmit={handleInvite} className="relative flex flex-wrap gap-2.5">
          <label className="flex-[999_1_280px] flex">
            <span className="sr-only">Email address</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              required
              className="ui-field w-full h-[52px] px-4 rounded-[14px] border-[1.5px] border-white/20 bg-white/10 text-white placeholder:text-white/50 outline-none"
            />
          </label>
          <label className="flex-[1_1_220px] flex">
            <span className="sr-only">Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="ui-field w-full h-[52px] px-3.5 rounded-[14px] border-[1.5px] border-white/20 bg-white/10 text-white outline-none"
            >
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value} className="text-ink">{o.label.split(' — ')[0]}</option>)}
            </select>
          </label>
          <button
            type="submit"
            disabled={!inviteEmail.trim() || submitting}
            className="ui-shine h-[52px] px-6 rounded-[14px] bg-accent text-white font-bold text-[15px] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <span className="inline-flex items-center gap-2"><UserPlus size={17} /> {submitting ? 'Sending...' : 'Send invite'}</span>
          </button>
        </form>
        {errorMessage && (
          <p role="alert" className="relative text-[13px] font-semibold text-[#ffb4a9] flex items-center gap-2"><AlertCircle size={15} /> {errorMessage}</p>
        )}
      </section>

      {error ? (
        <Card className="py-12 text-center">
          <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
          <p className="text-[14px] text-ink font-bold mb-1">Couldn't load your team</p>
          <p className="text-[13px] text-text-secondary mb-4">{error}</p>
          <Button variant="secondary" onClick={fetchMembers}>Retry</Button>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[190px] !rounded-[22px]" />)}</div>
      ) : team.length === 0 ? (
        <div className="rounded-[24px] border-[1.5px] border-dashed border-accent/30 bg-card">
          <EmptyState icon={UserPlus} title="No team members yet" description="Invite recruiters, evaluators and hiring managers to collaborate on interview drives." />
        </div>
      ) : (
        <div className="space-y-6">
          {pendingMembers.length > 0 && (
            <section className="ui-rise rounded-[22px] bg-card border border-line p-5">
              <h3 className="text-[16px] font-bold mb-2">Pending invites <span className="text-text-secondary font-semibold">({pendingMembers.length})</span></h3>
              {pendingMembers.map((m) => (
                <div key={m.id} className="ui-row flex flex-wrap items-center gap-3 p-3 rounded-xl">
                  <span className="w-10 h-10 rounded-full bg-[var(--color-surface-muted)] text-text-secondary flex items-center justify-center"><Clock size={16} /></span>
                  <div className="flex-[1_1_200px] min-w-0">
                    <div className="font-bold text-[14px] truncate">{m.email}</div>
                    <div className="text-[12px] text-text-secondary">{m.roleLabel || m.role}</div>
                  </div>
                  <Button size="xs" variant="secondary" onClick={() => setRemoveTarget(m)}>Cancel invite</Button>
                </div>
              ))}
            </section>
          )}

          <section className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {activeMembers.map((member, i) => (
              <article key={member.id} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }} className="ui-rise ui-lift rounded-[22px] bg-card border border-line p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="relative shrink-0 w-[52px] h-[52px] rounded-full bg-[color-mix(in_srgb,var(--color-accent)_12%,white)] text-accent-dark flex items-center justify-center font-bold text-[16px]">
                    {initialsOf(member.name)}
                    <span className="absolute right-0 bottom-0 w-3.5 h-3.5">
                      {member.status === 'ACTIVE' && <span className="ui-ping absolute inset-0 rounded-full bg-[var(--color-success)]" />}
                      <span className={`absolute inset-0 rounded-full border-2 border-white ${member.status === 'ACTIVE' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-neutral)]'}`} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[15px] truncate">{member.name}</div>
                    <div className="text-[12px] text-text-secondary truncate">{member.email}</div>
                  </div>
                  {member.role !== 'CLIENT_ADMIN' && (
                    <button
                      title="Remove access"
                      aria-label={`Remove ${member.name}'s access`}
                      onClick={() => setRemoveTarget(member)}
                      className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#fafbfe] border border-line/60">
                  <Badge variant={ROLE_BADGE[member.role] || 'neutral'}>{member.roleLabel || member.role}</Badge>
                  <span className="text-[12px] text-text-secondary font-semibold">Active {member.lastActive || '—'}</span>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}

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
