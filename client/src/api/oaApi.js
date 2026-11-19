import axios from 'axios'
import { GatewayUrl, getAccessToken } from './client'

// The Online Assessment room keeps its own sign-in, separate from the platform's, so the same email can be an
// organization admin, a college admin, a candidate and an OA admin at once. Admin and student tokens live in
// sessionStorage (a refresh mid-exam must not sign the student out) and are cleared when the tab closes.
const KEYS = { admin: 'oa.admin.token', student: 'oa.student.token' }

const read = (role) => { try { return sessionStorage.getItem(KEYS[role]) } catch { return null } }
export const oaTokens = {
    get: read,
    set: (role, token) => { try { sessionStorage.setItem(KEYS[role], token) } catch { /* private mode: the session simply will not survive a reload */ } },
    clear: (role) => { try { sessionStorage.removeItem(KEYS[role]) } catch { /* nothing to clear */ } },
}

// No request may hang forever: a stuck server shows an error with a retry instead of an endless spinner. Uploads and AI drafting override this.
const http = axios.create({ baseURL: `${GatewayUrl}/api/v1/oa`, timeout: 30000 })

const roleFor = (url = '') => {
    if (url.startsWith('/auth/') || url === '/exam/login' || url === '/exam/whoami' || url.startsWith('/exam/brand') || url.startsWith('/exam/place') || url.startsWith('/join/')) return null
    return url.startsWith('/exam/') ? 'student' : 'admin'
}

http.interceptors.request.use((config) => {
    const role = roleFor(config.url)
    const token = role && read(role)
    if (token) config.headers.Authorization = `Bearer ${token}`
    config.__role = role
    return config
})

// A request that stalls (the connection freezes for many seconds, then dies) is abandoned after a few seconds and sent again
// on a fresh connection, which almost always goes straight through. Only reads and token exchanges are repeated, never writes.
const RETRY_AFTER_MS = 8000
const MAX_RETRIES = 2
http.interceptors.response.use((res) => res, (error) => {
    const cfg = error.config
    const stalled = !error.response && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error')
    if (stalled && cfg && (cfg.method === 'get' || cfg.__retry === true) && (cfg.__tries || 0) < MAX_RETRIES) {
        cfg.__tries = (cfg.__tries || 0) + 1
        cfg.timeout = RETRY_AFTER_MS
        return http(cfg)
    }
    const role = error.config?.__role
    if (error.response?.status === 401 && role && read(role)) {
        oaTokens.clear(role)
        // An organizer comes in through the main sign-in, so that is where an expired session goes back to.
        window.location.assign(role === 'admin' ? '/oa/admin' : '/oa/exam?expired=1')
    }
    return Promise.reject(error)
})

const fail = (error) => {
    const envelope = error.response?.data
    const timedOut = error.code === 'ECONNABORTED'
    const wrapped = new Error(envelope?.error?.message || (error.response?.status === 413 ? 'That upload is too large for the server. Record a shorter answer, or ask your organizer to raise the upload limit.' : error.response ? 'Something went wrong. Please try again.' : timedOut ? 'The server is taking too long to answer. Please try again in a moment.' : 'Cannot reach the server. Check your connection.'))
    wrapped.code = envelope?.error?.code || (timedOut ? 'TIMEOUT' : 'NETWORK_ERROR')
    wrapped.status = error.response?.status || 0
    if (envelope?.error?.fields) wrapped.fields = envelope.error.fields
    return wrapped
}

const run = async (promise, { meta = false } = {}) => {
    try {
        const { data } = await promise
        return meta ? { items: data.data, ...data.meta } : data.data
    } catch (error) { throw fail(error) }
}

const get = (url, params) => run(http.get(url, { params, timeout: RETRY_AFTER_MS }))
const list = (url, params) => run(http.get(url, { params, timeout: RETRY_AFTER_MS }), { meta: true })
const post = (url, body) => run(http.post(url, body ?? {}))
const patch = (url, body) => run(http.patch(url, body))
const put = (url, body) => run(http.put(url, body))
const del = (url) => run(http.delete(url))

// Drops empty filter values so URLs and cache keys stay clean.
export const cleanParams = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false))

export const oaApi = {
    // sign-in
    register: (body) => post('/auth/register', body),
    login: async (body) => { const r = await post('/auth/login', body); oaTokens.set('admin', r.token); return r.account },
    logout: () => oaTokens.clear('admin'),
    /** Trade the platform sign-in for an Online Assessment session: an organization admin never signs in twice. */
    orgSession: async () => {
        const platformToken = getAccessToken()
        if (!platformToken) { const e = new Error('Sign in to continue.'); e.code = 'UNAUTHENTICATED'; throw e }
        const r = await run(http.post('/auth/org-session', {}, { __retry: true, timeout: RETRY_AFTER_MS, headers: { Authorization: `Bearer ${platformToken}` } }))
        oaTokens.set('admin', r.token)
        return r.account
    },
    me: () => get('/me'),
    aiStatus: () => get('/ai/status'),

    // drives: one hiring drive holds Round 1, Round 2, ...
    listDrives: (params) => list('/drives', cleanParams(params)),
    createDrive: (body) => post('/drives', body),
    getDrive: (id) => get(`/drives/${id}`),
    updateDrive: (id, body) => patch(`/drives/${id}`, body),
    addRound: (id, body) => post(`/drives/${id}/rounds`, body),
    dashboard: () => get('/dashboard'),

    // assessments
    listAssessments: (params) => list('/assessments', cleanParams(params)),
    createAssessment: (body) => post('/assessments', body),
    getAssessment: (id) => get(`/assessments/${id}`),
    updateAssessment: (id, body) => patch(`/assessments/${id}`, body),
    publish: (id) => post(`/assessments/${id}/publish`),
    unpublish: (id) => post(`/assessments/${id}/unpublish`),
    archive: (id) => post(`/assessments/${id}/archive`),
    nextRound: (id, body) => post(`/assessments/${id}/next-round`, body),

    // questions
    addQuestions: (id, body) => post(`/assessments/${id}/questions`, body),
    generateQuestions: (id, body) => run(http.post(`/assessments/${id}/questions/generate`, body ?? {}, { timeout: 120000 })),
    updateQuestion: (id, qid, body) => patch(`/assessments/${id}/questions/${qid}`, body),
    deleteQuestion: (id, qid) => del(`/assessments/${id}/questions/${qid}`),

    // students
    listStudents: (id, params) => list(`/assessments/${id}/students`, cleanParams(params)),
    addStudents: (id, students) => post(`/assessments/${id}/students`, { students }),
    removeStudent: (id, sid) => del(`/assessments/${id}/students/${sid}`),
    invite: (id, body) => post(`/assessments/${id}/students/invite`, body),
    decideStudents: (id, body) => post(`/assessments/${id}/students/decide`, body),
    setRegistration: (id, body) => put(`/assessments/${id}/registration`, body),

    // monitoring + results
    live: (id) => get(`/assessments/${id}/live`),
    results: (id, params) => list(`/assessments/${id}/results`, cleanParams(params)),
    attempt: (id, attemptId) => get(`/assessments/${id}/attempts/${attemptId}`),
    grade: (id, attemptId, grades) => put(`/assessments/${id}/attempts/${attemptId}/grades`, { grades }),
    decide: (id, attemptId, decision) => put(`/assessments/${id}/attempts/${attemptId}/decision`, { decision }),
    exportResults: async (id, params) => {
        try {
            const res = await http.get(`/assessments/${id}/results/export`, { params: cleanParams(params), responseType: 'blob' })
            const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || 'results.csv'
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url; a.download = name; a.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (error) { throw fail(error) }
    },
}

export const joinApi = {
    info: (token) => get(`/join/${encodeURIComponent(token)}`),
    register: (token, body) => post(`/join/${encodeURIComponent(token)}`, body),
}

export const examApi = {
    login: async (body) => { const r = await post('/exam/login', body); oaTokens.set('student', r.token) },
    logout: () => oaTokens.clear('student'),
    whoami: () => get('/exam/whoami'),
    brand: (assessmentId) => get(`/exam/brand?a=${encodeURIComponent(assessmentId)}`),
    place: (lat, lng) => get(`/exam/place?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
    session: () => get('/exam/session'),
    bookSlot: (slotId) => put('/exam/slot', { slotId }),
    start: (environment) => post('/exam/start', { environment }),
    paper: () => get('/exam/paper'),
    saveAnswers: (answers) => put('/exam/answers', { answers }),
    runCode: (body) => run(http.post('/exam/run', body, { timeout: 90000 })),
    uploadVideo: (questionId, blob, durationSec, onProgress) => {
        const form = new FormData()
        form.append('video', blob, 'answer.webm')
        form.append('durationSec', String(Math.round(durationSec)))
        return run(http.post(`/exam/video/${questionId}`, form, { timeout: 0, onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0) }))
    },
    heartbeat: (snapshot) => post('/exam/heartbeat', { snapshot }),
    violation: (body) => post('/exam/violation', body),
    submit: () => post('/exam/submit'),
}

/** An organization signed in to WorkmateIQ trades that sign-in for an Online Assessment session the first time it is needed. */
export const ensureOaSession = async () => { if (!oaTokens.get('admin')) await oaApi.orgSession() }
