// Pure result maths for college exam drives, shared by the dashboard, the exam list and the exam detail page so the
// numbers can never disagree between screens. A student only has a result once the attempt is completed: an
// unattempted or in-progress student is "pending", never counted as a fail.
export const passMarkOf = (drive) => drive?.rounds?.[0]?.passingThreshold || drive?.passingThreshold || 70

export const studentsOf = (drive) => (drive?.rounds?.[0]?.candidates || [])

// A finished attempt only has a result once its score is in: the status flips to COMPLETED the moment the student
// ends the interview, but the evaluation arrives a little later. Until then the student is still "pending".
export const hasResult = (student) => student?.status === 'COMPLETED' && (Number(student.aiScore) > 0 || Boolean(student.agentReport))

export const resultOf = (student, passMark) => {
    if (!hasResult(student)) return 'PENDING'
    return Number(student.aiScore) >= passMark ? 'PASS' : 'FAIL'
}

export const examStats = (drive) => {
    const passMark = passMarkOf(drive)
    const students = studentsOf(drive)
    const done = students.filter(hasResult)
    const passed = done.filter((s) => Number(s.aiScore) >= passMark)
    const avg = done.length ? Math.round(done.reduce((sum, s) => sum + (Number(s.aiScore) || 0), 0) / done.length) : null
    return {
        enrolled: students.length,
        completed: done.length,
        pending: students.length - done.length,
        passed: passed.length,
        failed: done.length - passed.length,
        avgScore: avg,
        passRate: done.length ? Math.round((passed.length / done.length) * 100) : null,
        flagged: students.filter((s) => (s.malpracticeFlags || 0) > 0).length,
        passMark,
    }
}

export const branchBreakdown = (drive) => {
    const passMark = passMarkOf(drive)
    const byBranch = new Map()
    for (const s of studentsOf(drive)) {
        const key = s.branch || 'Not specified'
        const row = byBranch.get(key) || { branch: key, enrolled: 0, completed: 0, passed: 0, scoreSum: 0 }
        row.enrolled += 1
        if (hasResult(s)) {
            row.completed += 1
            row.scoreSum += Number(s.aiScore) || 0
            if (Number(s.aiScore) >= passMark) row.passed += 1
        }
        byBranch.set(key, row)
    }
    return [...byBranch.values()]
        .map((r) => ({ ...r, avgScore: r.completed ? Math.round(r.scoreSum / r.completed) : null, passRate: r.completed ? Math.round((r.passed / r.completed) * 100) : null }))
        .sort((a, b) => b.enrolled - a.enrolled)
}

// Totals across many drives (dashboard / results overview).
export const overallStats = (drives) => {
    const per = drives.map(examStats)
    const completed = per.reduce((n, s) => n + s.completed, 0)
    const passed = per.reduce((n, s) => n + s.passed, 0)
    const weightedScore = per.reduce((n, s) => n + (s.avgScore || 0) * s.completed, 0)
    return {
        exams: drives.length,
        activeExams: drives.filter((d) => d.status === 'ACTIVE').length,
        enrolled: per.reduce((n, s) => n + s.enrolled, 0),
        completed,
        avgScore: completed ? Math.round(weightedScore / completed) : null,
        passRate: completed ? Math.round((passed / completed) * 100) : null,
        flagged: per.reduce((n, s) => n + s.flagged, 0),
    }
}
