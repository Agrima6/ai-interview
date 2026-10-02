import test from 'node:test'
import assert from 'node:assert/strict'
import {
    STATUS, FULL_REQUIREMENTS, normalizeRequirements, classifyMediaError, isTrackLive, verifyStream, readiness, describeMissing,
} from '../src/utils/mediaPermissions.js'

const track = (readyState = 'live', settings = {}) => ({ readyState, getSettings: () => settings })
const stream = ({ video = [], audio = [] } = {}) => ({ getTracks: () => [...video, ...audio], getVideoTracks: () => video, getAudioTracks: () => audio })

test('requirements come from configuration; the microphone is always required', () => {
    assert.deepEqual(normalizeRequirements({ microphone: false, camera: false, screen: false }), { microphone: true, camera: false, screen: false })
    assert.deepEqual(normalizeRequirements({ microphone: true, camera: true, screen: false }), { microphone: true, camera: true, screen: false })
})

test('unreadable configuration fails closed: everything is required', () => {
    for (const bad of [undefined, null, 'x', 5]) assert.deepEqual(normalizeRequirements(bad), FULL_REQUIREMENTS)
})

test('continue is only possible when EVERY required resource is ready, and optional ones are not needed', () => {
    const voiceOnly = { microphone: true, camera: false, screen: false }
    assert.equal(readiness(voiceOnly, { microphone: STATUS.READY }).canContinue, true)             // camera/screen not requested
    assert.equal(readiness(voiceOnly, { microphone: STATUS.BLOCKED }).canContinue, false)
    const full = FULL_REQUIREMENTS
    assert.deepEqual(readiness(full, { microphone: STATUS.READY, camera: STATUS.READY, screen: STATUS.CANCELLED }).missing, ['screen'])
    assert.equal(readiness(full, { microphone: STATUS.READY, camera: STATUS.READY, screen: STATUS.READY }).canContinue, true)
    assert.equal(readiness(full, {}).canContinue, false)
})

test('a cancelled screen-share picker is not the same as a blocked device, and blocked cameras get a recovery path', () => {
    assert.equal(classifyMediaError('screen', { name: 'NotAllowedError' }).status, STATUS.CANCELLED)
    assert.match(classifyMediaError('screen', { name: 'NotAllowedError' }).recovery, /Share screen/)
    const cam = classifyMediaError('camera', { name: 'NotAllowedError' })
    assert.equal(cam.status, STATUS.BLOCKED); assert.match(cam.recovery, /lock icon/)
    assert.equal(classifyMediaError('microphone', { name: 'NotFoundError' }).status, STATUS.UNAVAILABLE)
    assert.match(classifyMediaError('camera', { name: 'NotReadableError' }).message, /another app/)
    assert.equal(classifyMediaError('camera', new Error('weird')).status, STATUS.UNAVAILABLE)      // unknown errors still get guidance
})

test('"granted" is not proof: only a live stream is ready', () => {
    assert.equal(isTrackLive(track('live')), true)
    assert.equal(isTrackLive(track('ended')), false)
    assert.equal(verifyStream('camera', stream({ video: [track('live')] })).ok, true)
    assert.equal(verifyStream('camera', stream({ video: [track('ended')] })).status, STATUS.ENDED)     // permission granted, device gone
    assert.equal(verifyStream('microphone', stream({ video: [track('live')] })).ok, false)             // wrong kind of track
    assert.equal(verifyStream('camera', null).ok, false)
})

test('sharing a tab or a window does not count as sharing the screen', () => {
    assert.equal(verifyStream('screen', stream({ video: [track('live', { displaySurface: 'monitor' })] })).ok, true)
    assert.equal(verifyStream('screen', stream({ video: [track('live', { displaySurface: 'window' })] })).status, STATUS.WRONG_SURFACE)
    assert.equal(verifyStream('screen', stream({ video: [track('live', { displaySurface: 'browser' })] })).status, STATUS.WRONG_SURFACE)
    assert.equal(verifyStream('screen', stream({ video: [track('live', {})] })).ok, true)               // browser doesn't report a surface
    assert.equal(verifyStream('screen', stream({ video: [track('ended', { displaySurface: 'monitor' })] })).status, STATUS.ENDED)
})

test('the "still needed" line reads naturally', () => {
    assert.equal(describeMissing(['screen']), 'screen')
    assert.equal(describeMissing(['camera', 'screen']), 'camera and screen')
    assert.equal(describeMissing(['microphone', 'camera', 'screen']), 'microphone, camera and screen')
    assert.equal(describeMissing([]), '')
})
