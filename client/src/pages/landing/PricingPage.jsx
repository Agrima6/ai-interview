import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import './landing-fonts.css'
import './pricing.css'
import { IMG } from './landingAssets'

// The redesigned public pricing page (design export "WorkmateIQ Redesign" > Pricing). The credit packs and prices are
// the same ones the signed-in purchase page sells (pages/Pricing.jsx); buying a pack still happens there, behind login.

const accent = '#A3123A'
const LIGHT = { bg: '#FFFFFF', fg: '#1C1114', bd: '#EAD7DB', sub: '#5E4F53', chip: '#FFE4E8', tick: accent, btnBg: '#1C1114', btnFg: '#FFFFFF' }
const DARK = { bg: accent, fg: '#FFFFFF', bd: 'rgba(255,255,255,0.22)', sub: '#FBE3E8', chip: 'rgba(255,255,255,0.14)', tick: '#FFFFFF', btnBg: '#FFFFFF', btnFg: '#1F0712' }

const PLANS = [
    { ...LIGHT, name: 'Free', price: '₹0', credits: 100, desc: 'Perfect for beginners starting interview preparation.',
        features: ['100 AI interview credits', 'Basic performance report', 'Voice interview access', 'Limited history tracking'], cta: 'Start free', badge: false, href: '/register' },
    { ...LIGHT, name: 'Starter Pack', price: '₹100', credits: 150, desc: 'Great for focused practice and skill improvement.',
        features: ['150 AI interview credits', 'Detailed feedback', 'Performance analytics', 'Full interview history'], cta: 'Get Starter', badge: false, href: '/pricing' },
    { ...DARK, name: 'Pro Pack', price: '₹500', credits: 650, desc: 'Best value for serious job preparation.',
        features: ['650 AI interview credits', 'Advanced AI feedback', 'Skill trend analysis', 'Priority AI processing'], cta: 'Get Pro', badge: true, href: '/pricing' },
]

const COMPARE = [
    { f: 'AI interview credits', a: '100', b: '150', c: '650' },
    { f: 'Voice interviews', a: 'Yes', b: 'Yes', c: 'Yes' },
    { f: 'Performance report', a: 'Basic', b: 'Detailed', c: 'Detailed + advanced AI' },
    { f: 'Interview history', a: 'Limited', b: 'Full', c: 'Full' },
    { f: 'Performance analytics', a: '—', b: 'Yes', c: 'Yes' },
    { f: 'Skill trend analysis', a: '—', b: '—', c: 'Yes' },
    { f: 'Priority AI processing', a: '—', b: '—', c: 'Yes' },
]

// The first two answers in the design were bracketed placeholders for policy the product team owns. Until that policy is
// written down they point people to the team rather than state anything that may not be true.
const QUESTIONS = [
    ['What is an interview credit?', 'Credits are what you spend to take AI interviews. Each pack above lists how many credits it includes. For how many credits a particular interview uses, please send us an enquiry and the team will confirm.'],
    ['Do credits expire?', 'For details on how long credits stay valid, please send us an enquiry and the team will confirm.'],
    ['Can I switch between HR and technical modes?', 'Yes. Every pack includes both HR and technical interview modes with realistic time limits.'],
    ['How do organizations and colleges pay?', 'Plans for organizations and colleges are sized by drive volume. Send an enquiry and the team will get back to you.'],
]

export default function PricingPage() {
    const [openIndex, setOpenIndex] = useState(0)
    const [menuOpen, setMenuOpen] = useState(false)
    const plans = PLANS
    const compare = COMPARE
    const faqs = QUESTIONS.map((x, i) => ({
        q: x[0], a: x[1], isOpen: openIndex === i, open: openIndex === i ? 'true' : 'false',
        toggle: () => setOpenIndex(openIndex === i ? -1 : i),
    }))

    return (

<div className="wiq-pricing" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#1C1114", background: "#FBF6F4", width: "100%", fontSize: "16px", lineHeight: "1.55", overflowX: "clip" }}>
<header className="pricing-header" style={{ position: "sticky", top: "0", zIndex: "50", background: "rgba(251,246,244,0.85)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid rgba(176,18,63,0.12)" }}>
<div className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "12px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
<Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#1C1114", minHeight: "44px" }}>
<img src={IMG.logo} alt="" style={{ width: "38px", height: "38px", borderRadius: "50%" }} />
<span style={{ fontWeight: "600", fontSize: "21px", letterSpacing: "-0.02em" }}>{"WorkmateIQ"}</span>
</Link>

<nav className="navlinks" aria-label="Main" style={{ fontSize: "15px", fontWeight: "500" }}>
<Link to="/">{"Home"}</Link>

<a href="/#how">{"How it works"}</a>

<a href="/#who">{"Solutions"}</a>

<Link to="/plans" style={{ color: accent }}>{"Pricing"}</Link>

<a href="/#contact">{"Contact"}</a>
</nav>

<div className="pricing-header-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
<Link to="/login" style={{ textDecoration: "none", fontSize: "15px", fontWeight: "600", padding: "11px 14px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}>{"Log in"}</Link>

<Link to="/register" className="btn" style={{ textDecoration: "none", fontSize: "15px", fontWeight: "600", padding: "11px 18px", minHeight: "44px", display: "inline-flex", alignItems: "center", background: accent, color: "#fff", borderRadius: "999px" }}>{"Join now"}</Link>
<button type="button" className="pricing-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="pricing-mobile-menu" onClick={() => setMenuOpen((open) => !open)}>
<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C1114" strokeWidth="2" strokeLinecap="round">{menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
</button>
</div>
</div>
{menuOpen && <nav id="pricing-mobile-menu" className="pricing-mobile-menu" aria-label="Mobile">
<Link to="/" onClick={() => setMenuOpen(false)}>{"Home"}</Link>
<a href="/#how" onClick={() => setMenuOpen(false)}>{"How it works"}</a>
<a href="/#who" onClick={() => setMenuOpen(false)}>{"Solutions"}</a>
<a href="/#contact" onClick={() => setMenuOpen(false)}>{"Contact"}</a>
<Link to="/login" onClick={() => setMenuOpen(false)}>{"Log in"}</Link>
<Link to="/register" onClick={() => setMenuOpen(false)}>{"Join now"}</Link>
</nav>}
</header>

<section className="pad pricing-intro" style={{ maxWidth: "1320px", margin: "0 auto", padding: "64px 40px 20px", textAlign: "center" }}>
<p className="in" style={{ margin: "0", display: "inline-flex", padding: "7px 14px", borderRadius: "999px", background: "#FFE4E8", color: "#8A0E33", fontSize: "13px", fontWeight: "600", letterSpacing: "0.04em" }}>{"PRICING"}</p>

<h1 className="h1 in i1" style={{ margin: "22px auto 0", fontWeight: "600", fontSize: "68px", lineHeight: "1.02", letterSpacing: "-0.04em", maxWidth: "880px" }}>{"Practice more. Pay only for "}
<span style={{ color: accent }}>{"the interviews you take."}</span>
</h1>

<p className="in i2" style={{ margin: "22px auto 0", fontSize: "18px", color: "#4A3B3F", maxWidth: "600px" }}>{"Interview credits for candidates, with no subscription. Organizations and colleges get a plan built around their drives."}</p>
</section>

<section className="pad pricing-plans" style={{ maxWidth: "1320px", margin: "0 auto", padding: "20px 40px 80px" }}>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", alignItems: "stretch" }}>{(plans).map((p, __i1) => (<Fragment key={__i1}>
<article className="plan in" style={{ position: "relative", borderRadius: "28px", padding: "36px", display: "flex", flexDirection: "column", gap: "18px", background: p.bg, color: p.fg, border: `1px solid ${p.bd}` }}>{(p.badge) && (<>
<span className="shine" style={{ position: "absolute", top: "24px", right: "24px", background: "#FF6F91", color: "#1F0712", fontSize: "12px", fontWeight: "600", padding: "6px 12px", borderRadius: "999px" }}>{"Best value"}</span>
</>)}
<div style={{ fontSize: "15px", fontWeight: "600", color: p.sub }}>{p.name}</div>

<div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
<span style={{ fontSize: "64px", fontWeight: "600", letterSpacing: "-0.04em", lineHeight: "1" }}>{p.price}</span>

<span style={{ fontSize: "15px", color: p.sub }}>{"one-time"}</span>
</div>

<div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "12px", background: p.chip, fontWeight: "600", fontSize: "15px" }}>{p.credits}{" AI interview credits"}</div>

<p style={{ margin: "0", color: p.sub, fontSize: "15px" }}>{p.desc}</p>

<ul style={{ listStyle: "none", margin: "6px 0 0", padding: "18px 0 0", borderTop: `1px solid ${p.bd}`, display: "flex", flexDirection: "column", gap: "12px", fontSize: "15px" }}>{(p.features).map((f, __i2) => (<Fragment key={__i2}>
<li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.tick} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: "2px" }}>
<path d="M5 12l5 5 9-10"></path>
</svg>
{f}</li>
</Fragment>))}</ul>

<Link to={p.href} className="btn" style={{ marginTop: "auto", textDecoration: "none", textAlign: "center", padding: "15px 20px", borderRadius: "999px", fontWeight: "600", minHeight: "52px", display: "flex", alignItems: "center", justifyContent: "center", background: p.btnBg, color: p.btnFg }}>{p.cta}</Link>
</article>
</Fragment>))}</div>
</section>

{/* Org band */}

<section className="pad rv pricing-org-band" style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 40px 110px" }}>
<div style={{ borderRadius: "32px", overflow: "hidden", display: "flex", flexWrap: "wrap", background: "#1F0712", color: "#FFFFFF" }}>
<div style={{ flex: "1 1 520px", minWidth: "0", padding: "56px", display: "flex", flexDirection: "column", gap: "18px", justifyContent: "center" }}>
<p style={{ margin: "0", fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", color: "#FF6F91" }}>{"ORGANIZATIONS "}{"&"}{" COLLEGES"}</p>

<h2 style={{ margin: "0", fontSize: "46px", fontWeight: "600", lineHeight: "1.05", letterSpacing: "-0.035em" }}>{"Running drives at scale? Let's size a plan together."}</h2>

<p style={{ margin: "0", color: "#E8C9CF", fontSize: "17px" }}>{"Templates, bulk invites, proctoring, benchmarks, team seats and branded candidate links — priced by drive volume."}</p>

<div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
<a href="/#contact" className="btn" style={{ textDecoration: "none", background: "#FFFFFF", color: "#1F0712", fontWeight: "600", padding: "15px 24px", borderRadius: "999px", minHeight: "52px", display: "inline-flex", alignItems: "center" }}>{"Talk to sales"}</a>

<Link to="/register" style={{ textDecoration: "none", color: "#FFFFFF", fontWeight: "600", padding: "15px 24px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.4)", minHeight: "52px", display: "inline-flex", alignItems: "center" }}>{"Register your organization"}</Link>
</div>
</div>

<div style={{ flex: "1 1 420px", minWidth: "0", minHeight: "380px", overflow: "hidden", position: "relative" }}>
<img className="kb" src={IMG.pricingTeam} alt="Hiring team discussing candidates in an office" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} /></div>
</div>
</section>

{/* Compare */}

<section className="pad rv pricing-compare" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px 110px" }}>
<h2 style={{ margin: "0 0 32px", fontSize: "40px", fontWeight: "600", letterSpacing: "-0.03em", textAlign: "center" }}>{"Compare packs"}</h2>

<div style={{ overflowX: "auto", background: "#FFFFFF", border: "1px solid #EAD7DB", borderRadius: "24px" }}>
<table style={{ width: "100%", minWidth: "640px", borderCollapse: "collapse", fontSize: "15px" }}>
<thead>
<tr style={{ textAlign: "left" }}>
<th style={{ padding: "20px 24px", fontWeight: "600", color: "#5E4F53" }}>{"Feature"}</th>

<th style={{ padding: "20px 12px", fontWeight: "600" }}>{"Free"}</th>

<th style={{ padding: "20px 12px", fontWeight: "600" }}>{"Starter"}</th>

<th style={{ padding: "20px 24px 20px 12px", fontWeight: "600", color: accent }}>{"Pro"}</th>
</tr>
</thead>

<tbody>{(compare).map((r, __i1) => (<Fragment key={__i1}>
<tr style={{ borderTop: "1px solid #F1E4E7" }}>
<td style={{ padding: "16px 24px", fontWeight: "600" }}>{r.f}</td>

<td style={{ padding: "16px 12px", color: "#4A3B3F" }}>{r.a}</td>

<td style={{ padding: "16px 12px", color: "#4A3B3F" }}>{r.b}</td>

<td style={{ padding: "16px 24px 16px 12px", fontWeight: "600" }}>{r.c}</td>
</tr>
</Fragment>))}</tbody>
</table>
</div>
</section>

{/* FAQ */}

<section className="pad pricing-faq" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 40px 120px" }}>
<h2 className="rv" style={{ margin: "0 0 28px", fontSize: "40px", fontWeight: "600", letterSpacing: "-0.03em", textAlign: "center" }}>{"Questions, answered"}</h2>

<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{(faqs).map((q, __i1) => (<Fragment key={__i1}>
<div className="rv" style={{ background: "#FFFFFF", border: "1px solid #EAD7DB", borderRadius: "18px", overflow: "hidden" }}>
<button type="button" onClick={q.toggle} aria-expanded={q.open} style={{ width: "100%", fontFamily: "inherit", fontSize: "17px", fontWeight: "600", color: "#1C1114", background: "transparent", border: "0", padding: "22px 24px", minHeight: "64px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", cursor: "pointer", textAlign: "left" }}>{q.q}
<span style={{ flex: "none", width: "32px", height: "32px", borderRadius: "50%", background: "#FFE4E8", color: "#A3123A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "20px", transition: "transform .3s ease", transform: q.rot }}>{"+"}</span>
</button>
{(q.isOpen) && (<>
<p className="in" style={{ margin: "0", padding: "0 24px 22px", color: "#4A3B3F" }}>{q.a}</p>
</>)}</div>
</Fragment>))}</div>
</section>

<footer style={{ background: "#1F0712", color: "#F3D9DE" }}>
<div className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "40px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
<img src={IMG.logo} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
<span style={{ fontWeight: "600", color: "#FFFFFF" }}>{"WorkmateIQ"}</span>
</div>

<span>{"© 2026 WorkmateIQ. All rights reserved."}</span>
</div>
</footer>
</div>

    )
}
