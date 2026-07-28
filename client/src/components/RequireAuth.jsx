import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'

function RequireAuth({ children }) {
    const { userData } = useSelector((state) => state.user)
    const location = useLocation()

    if (!userData) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />
    }

    return children
}

export default RequireAuth
