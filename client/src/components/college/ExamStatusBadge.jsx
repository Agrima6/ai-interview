import React from 'react'
import { Badge } from '../ui'

// Exam status: Active = green, Draft = grey, Completed = blue, Closed early = amber, Archived = red - the same colours as hiring drives.
const VARIANT = { ACTIVE: 'success', DRAFT: 'neutral', COMPLETED: 'info', CLOSED: 'warning', ARCHIVED: 'danger' }
const LABEL = { ACTIVE: 'Open', DRAFT: 'Draft', COMPLETED: 'Completed', CLOSED: 'Closed', ARCHIVED: 'Archived' }

export function ExamStatusBadge({ status }) {
    return <Badge variant={VARIANT[status] || 'neutral'}>{LABEL[status] || status}</Badge>
}

const RESULT_VARIANT = { PASS: 'success', FAIL: 'danger', PENDING: 'neutral' }

export function ResultBadge({ result }) {
    return <Badge variant={RESULT_VARIANT[result] || 'neutral'}>{result}</Badge>
}
