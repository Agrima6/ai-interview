import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Mic, RefreshCw } from 'lucide-react'
import AdminShell from '../../components/layout/AdminShell'
import { Badge, Button, Card, ConfirmModal, useToast } from '../../components/ui'
import { getVoiceProviderSetting, saveVoiceProviderSetting } from '../../api/adminSettingsApi'

// Only these two exist. The list is display text; the backend is what enforces the allowlist.
const PROVIDERS = [
    { id: 'sarvam', name: 'Sarvam', blurb: 'Indian-language voices, streaming Bulbul v3.' },
    { id: 'elevenlabs', name: 'ElevenLabs', blurb: 'Natural multilingual voices.' },
]
const nameOf = (id) => PROVIDERS.find((p) => p.id === id)?.name || id

export function VoiceProviderPanel() {
    const toast = useToast()
    const [saved, setSaved] = useState(null)           // what the backend currently has (null until loaded)
    const [selected, setSelected] = useState('')
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [confirmOpen, setConfirmOpen] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setLoadError('')
        try {
            const data = await getVoiceProviderSetting()
            setSaved(data)
            setSelected(data.provider)
        } catch (err) {
            setLoadError(err.message || 'Could not load the voice provider setting.')
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { load() }, [load])

    const configured = useMemo(() => Object.fromEntries((saved?.availableProviders || []).map((p) => [p.id, p.configured])), [saved])
    const changed = Boolean(saved) && selected !== saved.provider
    const selectedConfigured = Boolean(configured[selected])
    const status = !saved ? '' : selectedConfigured ? 'Configured' : 'Missing credentials'

    const save = async () => {
        setSaving(true)
        setSaveError('')
        try {
            // The page shows success only after the backend confirms; on failure the last saved value stays on screen.
            const result = await saveVoiceProviderSetting(selected, saved.version)
            setSaved(result)
            setSelected(result.provider)
            toast.success(`Voice provider updated: new interviews will use ${nameOf(result.provider)}.`)
        } catch (err) {
            setSaveError(err.message || 'The change could not be saved. The previous provider is still active.')
            setSelected(saved.provider)
        } finally {
            setSaving(false)
            setConfirmOpen(false)
        }
    }

    const onSaveClick = () => {
        if (!changed || !selectedConfigured || saving) return
        if (saved.activeSessions > 0) setConfirmOpen(true)     // explain the effect on running interviews first
        else save()
    }

    return (
        <>
            <Card className='p-5 sm:p-6 max-w-3xl'>
                <div className='flex items-start gap-3 mb-5'>
                    <div className='w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0'><Mic size={18} aria-hidden='true' /></div>
                    <div>
                        <h2 className='text-[16px] font-bold text-ink'>Voice AI Provider</h2>
                        <p className='text-[13px] text-text-secondary'>Choose which provider powers new AI interview sessions. An interview keeps the provider it started with, even if you change this later.</p>
                    </div>
                </div>

                {loading ? (
                    <div className='py-10 flex items-center justify-center gap-2 text-text-secondary text-[13px]' role='status'>
                        <Loader2 size={16} className='animate-spin' aria-hidden='true' /> Loading the current setting...
                    </div>
                ) : loadError ? (
                    <div role='alert' className='p-4 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-700 flex items-center gap-3'>
                        <AlertTriangle size={16} className='shrink-0' aria-hidden='true' /> {loadError}
                        <Button size='sm' variant='secondary' className='ml-auto' onClick={load}><RefreshCw size={13} aria-hidden='true' /> Try again</Button>
                    </div>
                ) : (
                    <>
                        <fieldset>
                            <legend className='sr-only'>Voice AI provider</legend>
                            <div className='grid sm:grid-cols-2 gap-3'>
                                {PROVIDERS.map((p) => {
                                    const isSelected = selected === p.id
                                    const ok = Boolean(configured[p.id])
                                    return (
                                        <label key={p.id}
                                            className={`relative flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent/40 ${isSelected ? 'border-accent bg-accent/[0.04]' : 'border-line hover:border-text-secondary/40'}`}>
                                            <input type='radio' name='voice-provider' value={p.id} checked={isSelected} disabled={saving}
                                                onChange={() => { setSelected(p.id); setSaveError('') }} className='sr-only' />
                                            <span className='flex items-center justify-between gap-2'>
                                                <span className='text-[15px] font-bold text-ink'>{p.name}</span>
                                                {isSelected && <CheckCircle2 size={18} className='text-accent' aria-hidden='true' />}
                                            </span>
                                            <span className='text-[12.5px] text-text-secondary'>{p.blurb}</span>
                                            <span><Badge variant={ok ? 'success' : 'warning'}>{ok ? 'Configured' : 'Missing credentials'}</Badge></span>
                                        </label>
                                    )
                                })}
                            </div>
                        </fieldset>

                        <dl className='mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px]'>
                            <div className='flex gap-2'><dt className='text-text-secondary'>Active provider:</dt><dd className='font-semibold text-ink'>{nameOf(saved.provider)}{saved.isDefault ? ' (default)' : ''}</dd></div>
                            <div className='flex gap-2'><dt className='text-text-secondary'>Status:</dt><dd className='font-semibold text-ink'>{status}</dd></div>
                            {saved.updatedAt && (
                                <div className='flex gap-2 sm:col-span-2'><dt className='text-text-secondary'>Last changed:</dt><dd className='text-ink'>{new Date(saved.updatedAt).toLocaleString()} by {saved.updatedBy}</dd></div>
                            )}
                        </dl>

                        {!selectedConfigured && (
                            <div role='alert' className='mt-4 p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-[13px] text-amber-900 flex items-start gap-2'>
                                <AlertTriangle size={16} className='shrink-0 mt-0.5' aria-hidden='true' />
                                <span><b>{nameOf(selected)} can&apos;t be activated.</b> Its credentials are not configured on the server. Ask whoever manages the deployment to add them, then reload this page.</span>
                            </div>
                        )}
                        {saveError && (
                            <div role='alert' className='mt-4 p-3.5 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-700 flex items-start gap-2'>
                                <AlertTriangle size={16} className='shrink-0 mt-0.5' aria-hidden='true' /> <span>{saveError}</span>
                            </div>
                        )}

                        <div className='mt-6 flex items-center justify-end gap-3 flex-wrap'>
                            {changed && <span className='text-[12.5px] text-text-secondary mr-auto'>Unsaved change: {nameOf(saved.provider)} to {nameOf(selected)}</span>}
                            <Button variant='primary' onClick={onSaveClick} disabled={!changed || !selectedConfigured || saving}>
                                {saving ? <><Loader2 size={14} className='animate-spin' aria-hidden='true' /> Saving...</> : 'Save changes'}
                            </Button>
                        </div>
                    </>
                )}
            </Card>

            <ConfirmModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title={`Switch new interviews to ${nameOf(selected)}?`}
                confirmLabel='Switch provider'
                onConfirm={save}
            >
                <p className='text-[13.5px] text-text-secondary leading-relaxed'>
                    {saved?.activeSessions} interview{saved?.activeSessions === 1 ? ' is' : 's are'} in progress right now. They will finish with {nameOf(saved?.provider)}.
                    Only interviews created from now on will use {nameOf(selected)}.
                </p>
            </ConfirmModal>
        </>
    )
}

function VoiceProviderSettings() {
    return (
        <AdminShell>
            <div className='mb-6'>
                <h1 className='font-display text-[22px] font-bold text-ink mb-1'>Settings</h1>
                <p className='text-text-secondary text-[14px]'>Platform-wide options for AI interviews.</p>
            </div>
            <VoiceProviderPanel />
        </AdminShell>
    )
}

export default VoiceProviderSettings
