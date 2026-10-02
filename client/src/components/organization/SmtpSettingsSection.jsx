import React, { useState, useEffect } from 'react'
import { Mail, Check, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Card, Button, Input, Select, Skeleton, useToast } from '../ui'
import { getSmtpSettings, updateSmtpSettings, testSmtpConnection } from '../../api/organization/organizationApi'

const ENCRYPTION_OPTIONS = [
  { value: 'TLS', label: 'STARTTLS' },
  { value: 'SSL', label: 'SSL' },
  { value: 'NONE', label: 'None' },
]

function SmtpSettingsSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const [form, setForm] = useState({
    host: '', port: '587', encryption: 'TLS', username: '', password: '', fromName: '', fromEmail: '',
  })
  const [hasPassword, setHasPassword] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [lastTested, setLastTested] = useState(null)

  const fetchSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getSmtpSettings()
      setForm({
        host: data.host || '',
        port: data.port ? String(data.port) : '587',
        encryption: data.encryption || 'TLS',
        username: data.username || '',
        password: '',
        fromName: data.fromName || '',
        fromEmail: data.fromEmail || '',
      })
      setHasPassword(data.hasPassword)
      setConfigured(data.configured)
      setLastTested(data.lastTestedAt ? { at: data.lastTestedAt, status: data.lastTestStatus } : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    setTestResult(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, port: Number(form.port) }
      if (!payload.password) delete payload.password // blank = leave existing password untouched
      const data = await updateSmtpSettings(payload)
      setHasPassword(data.hasPassword)
      setConfigured(data.configured)
      setForm((f) => ({ ...f, password: '' }))
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Sends the in-flight password too, so an admin can test before ever
      // hitting Save - falls back to the already-saved one if left blank.
      const result = await testSmtpConnection({ password: form.password || undefined })
      setTestResult({ status: 'SUCCESS', message: result.message })
      setLastTested({ at: new Date().toISOString(), status: 'SUCCESS' })
    } catch (err) {
      setTestResult({ status: 'FAILED', message: err.message })
      setLastTested({ at: new Date().toISOString(), status: 'FAILED' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-[520px]" />
  }

  if (error) {
    return (
      <Card className="p-10 text-center">
        <AlertCircle size={20} className="text-red-500 mx-auto mb-3" />
        <p className="text-[14px] text-ink font-medium mb-1">Couldn't load SMTP settings</p>
        <p className="text-[13px] text-text-secondary mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchSettings}>Retry</Button>
      </Card>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <form onSubmit={handleSave}>
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-[16px] font-bold text-ink flex items-center gap-2">
                <Mail size={18} className="text-accent" /> SMTP Configuration
              </h2>
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${configured ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-neutral-soft)] text-[var(--color-neutral)]'}`}>
                {configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <p className="text-[13px] text-text-secondary -mt-3">
              Configure your own email sending credentials so candidate invitations, reminders, and results are sent from your organization's mailbox.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="SMTP Host *" placeholder="smtp.yourprovider.com" value={form.host} onChange={(e) => update('host', e.target.value)} required />
              <Input label="SMTP Port *" type="number" placeholder="587" value={form.port} onChange={(e) => update('port', e.target.value)} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Encryption" value={form.encryption} onChange={(e) => update('encryption', e.target.value)} options={ENCRYPTION_OPTIONS} />
              <Input label="SMTP Username *" placeholder="you@yourdomain.com" value={form.username} onChange={(e) => update('username', e.target.value)} required />
            </div>

            <Input
              label="SMTP Password *"
              type="password"
              placeholder={hasPassword ? '•••••••• (leave blank to keep current password)' : 'Enter password'}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              hint={hasPassword ? 'A password is already saved. Leave blank to keep it, or enter a new one to replace it.' : undefined}
            />

            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-line">
              <Input label="From Name" placeholder="Your Organization" value={form.fromName} onChange={(e) => update('fromName', e.target.value)} />
              <Input label="From Email" type="email" placeholder="hiring@yourdomain.com" value={form.fromEmail} onChange={(e) => update('fromEmail', e.target.value)} />
            </div>

            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded-xl text-[13px] ${testResult.status === 'SUCCESS' ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'}`}>
                {testResult.status === 'SUCCESS' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {savedSuccess ? <Check size={14} /> : null} {saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save SMTP Settings'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleTest} disabled={testing || !form.host || !form.username}>
                {testing ? <Loader2 size={14} className="animate-spin" /> : null} {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </Card>
        </form>
      </div>

      <div>
        <Card className="p-6 space-y-4">
          <h3 className="text-[14px] font-bold text-ink">Delivery Status</h3>
          <div className="text-[13px] text-text-secondary space-y-2">
            <p><span className="font-medium text-ink">Status: </span>{configured ? 'Configured' : 'Not yet configured'}</p>
            {lastTested && (
              <p>
                <span className="font-medium text-ink">Last tested: </span>
                {new Date(lastTested.at).toLocaleString()} —{' '}
                <span className={lastTested.status === 'SUCCESS' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                  {lastTested.status === 'SUCCESS' ? 'Successful' : 'Failed'}
                </span>
              </p>
            )}
          </div>
          <p className="text-[12px] text-text-secondary pt-3 border-t border-line leading-relaxed">
            Your SMTP password is encrypted and stored securely on our servers. It is never shown again after saving, and never sent to or stored in your browser.
          </p>
        </Card>
      </div>
    </div>
  )
}

export default SmtpSettingsSection
