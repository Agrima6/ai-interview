import React, { useEffect } from 'react'

function AuthLayout({ children }) {
    useEffect(() => {
        // Enforce light mode on mounting public auth screens
        document.documentElement.classList.remove('dark')
        
        const origColorScheme = document.documentElement.style.colorScheme
        const origBodyBg = document.body.style.background
        
        document.documentElement.style.colorScheme = 'light'
        document.body.style.background = '#ffffff'
        
        return () => {
            // Restore previous styles when exiting auth
            document.documentElement.style.colorScheme = origColorScheme
            document.body.style.background = origBodyBg
        }
    }, [])

    return (
        <div className="min-h-screen bg-white text-[#1a1215] flex flex-col font-sans">
            {children}
        </div>
    )
}

export default AuthLayout
