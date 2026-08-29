import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import AuthInput from './AuthInput'

const AuthPasswordInput = forwardRef(function AuthPasswordInput(props, ref) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <AuthInput
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            rightElement={
                <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all select-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            }
            {...props}
        />
    )
})

export default AuthPasswordInput
