import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

function RequireRole({ roles, children }) {
    const { userData } = useSelector((state) => state.user)

    if (!userData || !roles.includes(userData.role)) {
        return <Navigate to="/" replace />
    }

    return children
}

export default RequireRole
