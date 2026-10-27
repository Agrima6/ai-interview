import React, { useCallback, useEffect, useState } from 'react'
import { Video, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button, Badge } from '../ui'
import { getCandidateRecordingManifest, getCandidateRecordingUrl } from '../../api/organization/organizationApi'

// What HR sees for a candidate's recording is what the server has actually STORED (verified when it was assembled),
// never an assumption. Each uninterrupted capture is a segment; a page reload mid-interview makes a second one.
const STATE = {
  COMPLETED: { variant: 'success', label: 'Complete' },
  INCOMPLETE: { variant: 'warning', label: 'Partial' },
  RECORDING: { variant: 'info', label: 'Still recording' },
  FINALIZING: { variant: 'info', label: 'Processing' },
  FAILED: { variant: 'danger', label: 'Failed' },
}

const minutes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

function RecordingPanel({ driveId, roundNumber, candidateId, interviewDone }) {
  const [manifest, setManifest] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(null)           // { id, url }
  const [loadingId, setLoadingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setManifest(await getCandidateRecordingManifest(driveId, roundNumber, candidateId))
    } catch (err) {
      setError(err.message || 'Could not check the recording.')
    } finally {
      setLoading(false)
    }
  }, [driveId, roundNumber, candidateId])

  useEffect(() => { load() }, [load])
  useEffect(() => () => { if (playing?.url) URL.revokeObjectURL(playing.url) }, [playing])

  const play = async (segment) => {
    setLoadingId(segment.recordingId)
    try {
      setPlaying({ id: segment.recordingId, url: await getCandidateRecordingUrl(driveId, roundNumber, candidateId, segment.recordingId) })
    } catch (err) {
      setError(err.message || 'Could not load the recording.')
    } finally {
      setLoadingId(null)
    }
  }

  if (loading && !manifest) return <p className="text-[13px] text-text-secondary">Checking the recording…</p>
  if (error && !manifest) {
    return (
      <div className="flex items-center justify-between gap-3 text-[13px] text-text-secondary">
        <span>{error}</span>
        <Button size="xs" variant="secondary" onClick={load}><RefreshCw size={12} /> Try again</Button>
      </div>
    )
  }
  const segments = manifest?.segments || []
  if (segments.length === 0) {
    // Nothing is stored. Say so plainly rather than hiding the section.
    return interviewDone
      ? <p className="text-[13px] text-text-secondary flex items-center gap-1.5"><AlertTriangle size={14} className="text-[var(--color-warning)]" /> No recording was stored for this interview.</p>
      : <p className="text-[13px] text-text-secondary">No recording yet.</p>
  }

  return (
    <div className="space-y-2.5">
      {segments.map((segment, index) => {
        const state = STATE[segment.status] || { variant: 'neutral', label: segment.status }
        const shown = playing?.id === segment.recordingId
        return (
          <div key={segment.recordingId} className="rounded-xl border border-line bg-card p-3.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[13px] text-ink">
                <span className="font-medium">{segments.length > 1 ? `Part ${index + 1}` : 'Recording'}</span>
                <Badge variant={state.variant}>{state.label}</Badge>
                {segment.bytes > 0 && <span className="text-text-secondary text-[12px]">{minutes(segment.bytes)}</span>}
              </div>
              {segment.playable && !shown && (
                <Button size="xs" variant="secondary" onClick={() => play(segment)} disabled={loadingId === segment.recordingId}>
                  <Video size={13} /> {loadingId === segment.recordingId ? 'Loading...' : 'Watch'}
                </Button>
              )}
              {['RECORDING', 'FINALIZING'].includes(segment.status) && (
                <Button size="xs" variant="secondary" onClick={load}><RefreshCw size={12} /> Refresh</Button>
              )}
            </div>
            {segment.reason && segment.status !== 'COMPLETED' && (
              <p className="text-[12.5px] text-text-secondary mt-1.5">{segment.reason}</p>
            )}
            {shown && <video src={playing.url} controls className="w-full rounded-xl border border-line bg-black max-h-[400px] mt-3" />}
          </div>
        )
      })}
    </div>
  )
}

export default RecordingPanel
