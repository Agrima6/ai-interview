// Records a MediaStream and uploads it WHILE the interview runs, in small ordered chunks.
//
//  - Every chunk has a number; uploads are sequential and retried, so a flaky connection delays chunks, it does
//    not lose them, and a repeated upload is harmless (the server de-duplicates by recording id + number).
//  - state tells the truth about what has reached the server: nothing here ever says "saved" for a chunk the
//    server has not acknowledged.
//  - stop() asks the server to finalize and returns what the SERVER reports (COMPLETED / INCOMPLETE / FAILED),
//    or { status: 'PENDING' } if the server could not be reached in time. It never invents success.

const TIMESLICE_MS = 2000
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]
const DRAIN_TIMEOUT_MS = 20000

export const pickMimeType = (hasVideo = true) => {
    if (typeof MediaRecorder === 'undefined') return null
    const candidates = hasVideo
        ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
        : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || null
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`)

export class ChunkedRecorder {
    /**
     * @param {object} opts
     * @param {MediaStream} opts.stream
     * @param {(args:{recordingId:string,index:number,blob:Blob,mimeType:string})=>Promise<unknown>} opts.uploadChunk
     * @param {(args:{recordingId:string,totalParts:number,reason:string})=>Promise<object>} opts.finalize
     * @param {(state:{status:string,captured:number,uploaded:number,pending:number})=>void} [opts.onState]
     */
    constructor({ stream, uploadChunk, finalize, onState, hasVideo = true }) {
        this.stream = stream
        this.uploadChunk = uploadChunk
        this.finalize = finalize
        this.onState = onState || (() => {})
        this.mimeType = pickMimeType(hasVideo)
        this.recordingId = newId()
        this.queue = []
        this.captured = 0
        this.uploaded = 0
        this.status = 'idle'            // idle | recording | degraded | stopped | error
        this.recorder = null
        this.pumping = null
        this.stopped = false
    }

    emit() {
        this.onState({ status: this.status, captured: this.captured, uploaded: this.uploaded, pending: this.captured - this.uploaded })
    }

    start() {
        if (!this.mimeType) { this.status = 'error'; this.emit(); return false }
        try {
            this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType, videoBitsPerSecond: 600_000, audioBitsPerSecond: 64_000 })
        } catch {
            this.status = 'error'; this.emit(); return false
        }
        this.recorder.ondataavailable = (event) => {
            if (!event.data || event.data.size === 0) return
            this.queue.push({ index: this.captured, blob: event.data })
            this.captured += 1
            this.pump()
            this.emit()
        }
        this.recorder.onerror = () => { this.status = 'error'; this.emit() }
        this.recorder.start(TIMESLICE_MS)
        this.status = 'recording'
        this.emit()
        return true
    }

    // One chunk at a time, in order. A failing chunk is retried with backoff and keeps its place in the queue.
    pump() {
        if (this.pumping) return this.pumping
        this.pumping = (async () => {
            let attempt = 0
            while (this.queue.length) {
                const next = this.queue[0]
                try {
                    await this.uploadChunk({ recordingId: this.recordingId, index: next.index, blob: next.blob, mimeType: this.mimeType })
                    this.queue.shift()
                    this.uploaded += 1
                    attempt = 0
                    if (this.status === 'degraded') this.status = 'recording'
                    this.emit()
                } catch (err) {
                    // A rejection from the server (4xx) will never succeed on retry; drop out and let finalize report the gap.
                    if (err?.status >= 400 && err?.status < 500 && err?.status !== 408 && err?.status !== 429) {
                        this.queue.shift()
                        this.status = 'degraded'
                        this.emit()
                        continue
                    }
                    this.status = 'degraded'
                    this.emit()
                    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]
                    attempt += 1
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    if (this.stopped && attempt > RETRY_DELAYS_MS.length) break      // stop() has its own deadline
                }
            }
        })().finally(() => { this.pumping = null })
        return this.pumping
    }

    async stop(reason = 'ENDED') {
        this.stopped = true
        if (this.recorder && this.recorder.state !== 'inactive') {
            await new Promise((resolve) => { this.recorder.onstop = resolve; this.recorder.stop() })
        }
        // Let the queue drain, but never hold the candidate's "finish" forever.
        await Promise.race([
            (async () => { while (this.queue.length) { await this.pump(); if (this.queue.length) await new Promise((r) => setTimeout(r, 500)) } })(),
            new Promise((resolve) => setTimeout(resolve, DRAIN_TIMEOUT_MS)),
        ])
        if (this.captured === 0) { this.status = 'stopped'; this.emit(); return { status: 'NONE' } }
        try {
            const result = await this.finalize({ recordingId: this.recordingId, totalParts: this.captured, reason: this.queue.length ? 'INTERRUPTED' : reason })
            this.status = 'stopped'
            this.emit()
            return result
        } catch {
            this.status = 'stopped'
            this.emit()
            return { status: 'PENDING' }        // the server closes out an abandoned capture itself, as INCOMPLETE
        }
    }
}

// Mixes the candidate's microphone and the interviewer's voice into one audio track so the recording contains
// BOTH sides of the conversation. (Recording only the camera stream, as before, produced a silent video.)
export const createRecordingMixer = (videoTrack) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const context = AudioCtx ? new AudioCtx() : null
    const destination = context ? context.createMediaStreamDestination() : null
    context?.resume?.().catch(() => {})
    const sources = new Map()
    const addAudioTrack = (mediaStreamTrack) => {
        if (!context || !mediaStreamTrack || sources.has(mediaStreamTrack.id)) return
        try {
            const source = context.createMediaStreamSource(new MediaStream([mediaStreamTrack]))
            const gain = context.createGain()
            gain.gain.value = 0.8                    // headroom: two voices summed must not clip
            source.connect(gain)
            gain.connect(destination)
            sources.set(mediaStreamTrack.id, source)
        } catch { /* a track that cannot be mixed is skipped, the rest still record */ }
    }
    const stream = new MediaStream([...(videoTrack ? [videoTrack] : []), ...(destination ? destination.stream.getAudioTracks() : [])])
    const close = () => { try { sources.forEach((s) => s.disconnect()); context?.close() } catch { /* already closed */ } }
    return { stream, addAudioTrack, close, hasAudio: Boolean(destination) }
}
