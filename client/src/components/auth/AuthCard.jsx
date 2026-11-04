import React from 'react'

function AuthCard({ children, className = '' }) {
    return (
        <div className={`w-full max-w-[440px] bg-white border border-gray-100 rounded-[28px] border-[#EAD7DB] p-8 md:p-10 shadow-[0_40px_80px_-56px_rgba(35,9,15,0.45)] ${className}`}>
            {children}
        </div>
    )
}

export default AuthCard
