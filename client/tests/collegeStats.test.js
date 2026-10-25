import test from 'node:test'
import assert from 'node:assert/strict'
import { examStats, resultOf, branchBreakdown, overallStats } from '../src/utils/collegeStats.js'

const drive = (students, passingThreshold = 60, status = 'ACTIVE') => ({ status, passingThreshold, rounds: [{ passingThreshold, candidates: students }] })
const s = (status, aiScore, extra = {}) => ({ status, aiScore, ...extra })

test('only completed attempts have a result; the rest are pending, never failed', () => {
    assert.equal(resultOf(s('INVITED', 0), 60), 'PENDING')
    assert.equal(resultOf(s('SCHEDULED', 0), 60), 'PENDING')
    assert.equal(resultOf(s('COMPLETED', 59), 60), 'FAIL')
    assert.equal(resultOf(s('COMPLETED', 60), 60), 'PASS')
})

test('exam stats count pass rate over completed attempts only', () => {
    const d = drive([s('COMPLETED', 80), s('COMPLETED', 40), s('INVITED', 0), s('COMPLETED', 70, { malpracticeFlags: 2 })])
    const st = examStats(d)
    assert.deepEqual([st.enrolled, st.completed, st.pending, st.passed, st.failed], [4, 3, 1, 2, 1])
    assert.equal(st.avgScore, 63)
    assert.equal(st.passRate, 67)
    assert.equal(st.flagged, 1)
})

test('an exam with no completed attempts has no average or pass rate (not zero)', () => {
    const st = examStats(drive([s('INVITED', 0)]))
    assert.equal(st.avgScore, null)
    assert.equal(st.passRate, null)
})

test('branch breakdown groups students and tolerates a missing branch', () => {
    const d = drive([s('COMPLETED', 90, { branch: 'CSE' }), s('COMPLETED', 30, { branch: 'CSE' }), s('INVITED', 0, { branch: 'ECE' }), s('COMPLETED', 70)])
    const rows = Object.fromEntries(branchBreakdown(d).map((r) => [r.branch, r]))
    assert.equal(rows.CSE.avgScore, 60)
    assert.equal(rows.CSE.passRate, 50)
    assert.equal(rows.ECE.avgScore, null)
    assert.equal(rows['Not specified'].passRate, 100)
})

test('overall stats weight the average by completed attempts', () => {
    const o = overallStats([drive([s('COMPLETED', 100)]), drive([s('COMPLETED', 50), s('COMPLETED', 50), s('COMPLETED', 50)])])
    assert.equal(o.completed, 4)
    assert.equal(o.avgScore, 63)
    assert.equal(o.exams, 2)
})

test('a completed attempt still being evaluated (score 0, no report) stays pending', () => {
    assert.equal(resultOf(s('COMPLETED', 0), 60), 'PENDING')
    assert.equal(resultOf(s('COMPLETED', 0, { agentReport: { final_score: 0 } }), 60), 'FAIL')
    assert.equal(examStats(drive([s('COMPLETED', 0)])).completed, 0)
})
