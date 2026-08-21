import React, { forwardRef } from 'react'

const AuthInput = forwardRef(function AuthInput(
    { label, error, hint, id, icon: Icon, rightElement, className = '', wrapperClassName = '', ...props },
    ref
) {
    return (
        <div className={`w-full ${wrapperClassName}`}>
            {label && (
                <label htmlFor={id} className="block text-[13.5px] font-semibold text-gray-700 mb-2">
                    {label}
                </label>
            )}
            {/* rightElement (e.g. the password show/hide button) is positioned
                relative to THIS wrapper, not the outer one - it stays
                correctly centered on the input regardless of whether a
                label is present or how tall it is. */}
            <div className="relative">
                {Icon && (
                    <Icon
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                )}
                <input
                    ref={ref}
                    id={id}
                    className={`w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-[14.5px] text-gray-900 placeholder:text-gray-400/80 outline-none transition-all duration-200 focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:opacity-50 disabled:cursor-not-allowed ${
                        Icon ? 'pl-11' : ''
                    } ${rightElement ? 'pr-11' : ''} ${error ? '!border-red-500 focus:!ring-red-500/10' : ''} ${className}`}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {rightElement}
                    </div>
                )}
            </div>
            {error ? (
                <p className="text-[12.5px] text-red-600 mt-2 font-medium leading-none animate-in fade-in duration-150">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[12px] text-gray-500 mt-2 leading-none">{hint}</p>
            ) : null}
        </div>
    )
})

export default AuthInput
