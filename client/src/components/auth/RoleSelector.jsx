import React, { useEffect, useState } from 'react'
import { getRegistrationTypes } from '../../api/registrationsApi'
import RoleCard from './RoleCard'
import AuthButton from './AuthButton'

function RoleSelector({ selectedRole, onSelectRole, onContinue }) {
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        getRegistrationTypes()
            .then((res) => {
                // Ensure roles are ordered: Organization, College, Candidate
                const order = ['ORGANIZATION', 'COLLEGE', 'CANDIDATE']
                const sorted = (res.types || []).sort((a, b) => {
                    return order.indexOf(a.key) - order.indexOf(b.key)
                })
                setRoles(sorted)
                setLoading(false)
            })
            .catch((err) => {
                setError(err.message || 'Failed to load registration roles.')
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="w-full h-[90px] bg-gray-50 border border-gray-100 rounded-2xl animate-pulse" />
                ))}
                <div className="w-full h-12 bg-gray-50 rounded-xl animate-pulse mt-6" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-6">
                <p className="text-[14px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                    {error}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-[20px] font-bold text-gray-900">Choose how you want to join</h2>
                <p className="text-[14.5px] text-gray-500">Select a role to create your WorkmateIQ account</p>
            </div>

            {/* Role cards list */}
            <div className="space-y-3.5">
                {roles.map((role) => (
                    <RoleCard
                        key={role.key}
                        roleKey={role.key}
                        label={role.label}
                        selected={selectedRole === role.key}
                        onClick={() => onSelectRole(role.key)}
                    />
                ))}
            </div>

            {/* Continue Button */}
            <AuthButton
                type="button"
                disabled={!selectedRole}
                onClick={onContinue}
                className="mt-6"
            >
                Continue
            </AuthButton>
        </div>
    )
}

export default RoleSelector
