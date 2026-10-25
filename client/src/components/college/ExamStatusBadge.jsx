import React from 'react'
import { Badge } from '../ui'

// Exam status: Active = green, Draft = grey, Completed (closed) = blue, Archived = red - the same colours as hiring drives.
const VARIANT = { ACTIVE: 'success', DRAFT: 'neutral', COMPLETED: 'info', ARCHIVED: 'danger' }
const LABEL = { ACTIVE: 'Open', DRAFT: 'Draft', COMPLETED: 'Closed', ARCHIVED: 'Archived' }

export function ExamStatusBadge({ status }) {
    return <Badge variant={VARIANT[status] || 'neutral'}>{LABEL[status] || status}</Badge>
}

const RESULT_VARIANT = { PASS: 'success', FAIL: 'danger', PENDING: 'neutral' }

export function ResultBadge({ result }) {
    return <Badge variant={RESULT_VARIANT[result] || 'neutral'}>{result}</Badge>
}
