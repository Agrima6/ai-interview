import React from 'react'

function AuthCard({ children, className = '' }) {
    return (
        <div className={`w-full max-w-[440px] bg-white border border-gray-100 rounded-2xl p-8 md:p-10 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.03)] ${className}`}>
            {children}
        </div>
    )
}

export default AuthCard
