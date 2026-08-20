import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import logo from '../../assets/logo.png'
import Button from '../Button'

function AuthHeader({ currentMode, onSwitchMode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navLinks = [
        { label: 'Home', href: '/#home' },
        { label: 'About', href: '/#about' },
        { label: 'How It Works', href: '/#how-it-works' },
        { label: 'Solutions', href: '/#solutions' },
        { label: 'Pricing', href: '/#pricing' },
        { label: 'Contact', href: '/#contact' }
    ]

    return (
        <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm px-6 py-4">
            <div className="max-w-[1280px] mx-auto flex items-center justify-between">
                {/* Logo & Brand */}
                <div onClick={() => window.location.href = '/'} className="flex items-center gap-2.5 cursor-pointer shrink-0">
                    <img src={logo} alt="WorkmateIQ Logo" className="w-10 h-10 rounded-full shadow-[0_4px_12px_-4px_rgba(196,22,31,0.6)]" />
                    <span className="font-semibold text-[17px] tracking-tight text-[#1a1215]">WorkmateIQ</span>
                </div>

                {/* Navigation links (Desktop) */}
                <nav className="hidden md:flex items-center gap-1.5">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="px-4 py-2 text-[14.5px] font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-50 transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* Actions (Desktop) */}
                <div className="hidden md:flex items-center gap-3.5">
                    <button
                        onClick={() => onSwitchMode('login')}
                        className={`text-[14.5px] font-semibold transition-colors ${
                            currentMode === 'login'
                                ? 'text-accent hover:text-accent-dark'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Login
                    </button>
                    <Button
                        onClick={() => onSwitchMode('register')}
                        variant={currentMode === 'register' ? 'primary' : 'primary'}
                        size="md"
                        className="!px-5 !py-2.5 !text-[13.5px]"
                    >
                        Join Now
                    </Button>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="md:hidden flex items-center gap-3">
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-[73px] left-0 w-full bg-white border-b border-gray-100 shadow-md flex flex-col px-6 py-5 gap-4 animate-in slide-in-from-top duration-200">
                    <nav className="flex flex-col gap-2.5">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-3 py-2 text-[15px] font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="h-px bg-gray-100 w-full my-1" />
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                onSwitchMode('login')
                                setMobileMenuOpen(false)
                            }}
                            className="w-full text-center py-2.5 text-[15px] font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Login
                        </button>
                        <Button
                            onClick={() => {
                                onSwitchMode('register')
                                setMobileMenuOpen(false)
                            }}
                            className="w-full text-[14.5px] py-2.5"
                        >
                            Join Now
                        </Button>
                    </div>
                </div>
            )}
        </header>
    )
}

export default AuthHeader
