import React from 'react'
import { Loader2 } from 'lucide-react'

function AuthButton({ type = 'submit', variant = 'primary', loading = false, disabled = false, onClick, children, className = '', ...props }) {
    const isPrimary = variant === 'primary'

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 font-semibold text-[14.5px] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-accent/15 select-none ${
                isPrimary
                    ? 'bg-accent text-white hover:bg-accent-dark shadow-[0_4px_14px_-4px_rgba(196,22,31,0.45)] hover:shadow-[0_10px_24px_-6px_rgba(139,14,22,0.4)] disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:pointer-events-none'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 disabled:opacity-50 disabled:pointer-events-none'
            } ${className}`}
            {...props}
        >
            {loading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : (
                children
            )}
        </button>
    )
}

export default AuthButton
