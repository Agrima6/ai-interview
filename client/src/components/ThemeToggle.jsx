import React, { useEffect, useState } from 'react'
import { motion } from "motion/react"
import { Sun, Moon } from "lucide-react"

const getInitialTheme = () => {
    if (typeof window === "undefined") return "light"
    const saved = localStorage.getItem("theme")
    if (saved === "dark" || saved === "light") return saved
    // Dark is the primary/default aesthetic; only fall back to light if the
    // user's OS explicitly prefers it.
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

function ThemeToggle({ className = "" }) {
    const [theme, setTheme] = useState(getInitialTheme)

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark")
        localStorage.setItem("theme", theme)
    }, [theme])

    const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

    return (
        <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className={`w-9 h-9 rounded-full border border-line flex items-center justify-center text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors ${className}`}>
            <motion.span
                key={theme}
                initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className='flex'
            >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </motion.span>
        </button>
    )
}

export default ThemeToggle
