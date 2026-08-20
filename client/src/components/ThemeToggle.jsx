import React, { useEffect } from 'react'

function ThemeToggle() {
    useEffect(() => {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
    }, [])

    return null
}

export default ThemeToggle
