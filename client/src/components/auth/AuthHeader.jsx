import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/landing/logo.webp'
// Same header as the redesigned front page (pages/landing/LandingPage.jsx), reusing its scoped styles so the two never drift.
import '../../pages/landing/landing-fonts.css'
import '../../pages/landing/landing.css'

const NAV_LINKS = [
    { label: 'About', href: '/#about' },
    { label: 'Product', href: '/#product' },
    { label: 'How it works', href: '/#how' },
    { label: 'Solutions', href: '/#who' },
]

function AuthHeader({ onSwitchMode }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const close = () => setMenuOpen(false)

    return (
        <div className="wiq-landing" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: '#1F1417', position: 'sticky', top: 0, zIndex: 60 }}>
            <header style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #F3E8EB' }}>
                <div className="pad" style={{ maxWidth: 1320, margin: '0 auto', padding: '12px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1F1417', minHeight: 44 }}>
                        <img src={logo} alt="" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                        <span style={{ fontWeight: 500, fontSize: 20, letterSpacing: '-0.02em' }}>WorkmateIQ</span>
                    </Link>

                    <nav className="navmid" aria-label="Main" style={{ display: 'flex', gap: 32, fontSize: 15 }}>
                        {NAV_LINKS.map((l) => <a key={l.label} className="navlink" href={l.href}>{l.label}</a>)}
                        <Link className="navlink" to="/plans">Pricing</Link>
                    </nav>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button type="button" className="hidesm" onClick={() => onSwitchMode('login')}
                            style={{ background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, color: '#1F1417', padding: '11px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
                            Log in
                        </button>
                        <button type="button" className="btn gb" onClick={() => onSwitchMode('register')}
                            style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, padding: '11px 20px', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8, color: '#FFFFFF', borderRadius: 999 }}>
                            Join now <span className="arr">→</span>
                        </button>
                        <button type="button" className="mbtn" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
                            aria-controls="wl-auth-mobile-menu" onClick={() => setMenuOpen((o) => !o)}>
                            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F1417" strokeWidth="2" strokeLinecap="round">
                                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                            </svg>
                        </button>
                    </div>
                </div>
                {menuOpen && (
                    <nav id="wl-auth-mobile-menu" className="mpanel" aria-label="Mobile">
                        {NAV_LINKS.map((l) => <a key={l.label} href={l.href} onClick={close}>{l.label}</a>)}
                        <Link to="/plans" onClick={close}>Pricing</Link>
                        <a href="/login" onClick={(e) => { e.preventDefault(); close(); onSwitchMode('login') }}>Log in</a>
                        <a href="/register" onClick={(e) => { e.preventDefault(); close(); onSwitchMode('register') }}>Join now</a>
                    </nav>
                )}
            </header>
        </div>
    )
}

export default AuthHeader
