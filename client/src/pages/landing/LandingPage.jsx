import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './landing-fonts.css'
import './landing.css'
import { IMG, VIDEO } from './landingAssets'
import { ReportMock, RankingMock } from './LandingMocks'
import { submitPlatformEnquiry } from '../../api/enquiriesApi'

// The redesigned WorkmateIQ front page. The layout, copy, motion and colours come from the design export
// ("WorkmateIQ Redesign"); the data below drives its interactive parts (product tour, step cards, audience
// accordion and enquiry form). Styling lives in landing.css, scoped to .wiq-landing.

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@workmateiq.com'
const TAB_INTERVAL_MS = 6000

const CAPABILITIES = ['AI interviews', 'Live proctoring', 'Resume-informed questions', 'Role benchmarks', 'Candidate ranking',
    'Exportable reports', 'Placement readiness', 'Personal feedback', 'HR & technical modes']
const VALUES = ['Fairness', 'Transparency', 'Security', 'Better hiring experience']

const TOUR = [
    { title: 'Live interview', head: "A lifelike AI interviewer, on the candidate's schedule.", body: 'Timed, role-specific questions with a real-time transcript and live integrity checks.',
        points: ['Voice AI interviewer', 'Countdown per question', 'Camera, mic and tab monitoring'], img: IMG.photoLive, alt: 'A candidate taking a live AI interview on a laptop', w: '560px', r: '20px' },
    { title: 'Candidate report', head: 'Every answer, scored and explained.', body: 'Multi-dimensional scoring, résumé claim checks and an AI summary in one shareable report.',
        points: ['Skill radar and per-skill scores', 'Matched and missing skills', 'One-click PDF export'], Mock: ReportMock },
    { title: 'Hiring dashboard', head: 'Your whole pipeline at a glance.', body: 'Drives, funnels and score trends for every role you hire for.',
        points: ['Invite-to-shortlist funnel', 'Weekly score trends', 'Recent candidate activity'], img: IMG.screenDashboard, alt: 'Organization dashboard screen', w: '100%', r: '16px' },
    { title: 'Shortlist & rank', head: 'Rank candidates against the role.', body: 'Compare side by side and benchmark against what the role really needs.',
        points: ['Role-based benchmarks', 'Side-by-side comparison', 'Shortlist in a click'], Mock: RankingMock, w: '78%' },
    { title: 'Candidate app', head: 'Practice anywhere, track progress.', body: 'Students and job seekers practise HR and technical mocks and watch their scores grow.',
        points: ['HR and technical mocks', 'Progress over time', 'Interviews assigned by your college'], img: IMG.appPhone, alt: 'Candidate mobile app', w: '320px', r: '0' },
]

const items = (rows) => rows.map((x, k) => ({ t: x[0], v: x[1] || '', w: x[2] || '0%', hasBar: !!x[2], img: x[3] || '', hasImg: !!x[3], d: `${(0.3 + k * 0.6).toFixed(1)}s` }))

const STEPS = [
    { n: '01', t: 'Design the interview once.', d: 'Create role-specific templates with structured rounds, question sources, time limits and the competencies you care about.',
        img: IMG.photoHrDesk, alt: 'Recruiter setting up an interview template', chip: 'Template saved · 3 rounds', dot: '#E94B6A',
        bg: '#FFFFFF', bd: '#F3E8EB', nBg: '#A3123A', nFg: '#FFFFFF', ovTitle: 'Building template · Software Engineer',
        items: items([['Round 1 · HR screen', '5 Qs'], ['Round 2 · Technical', '8 Qs'], ['Round 3 · Problem solving', '3 Qs']]) },
    { n: '02', t: 'Candidates interview on their own time.', d: 'Invite by link and track every candidate from sent to completed. A lifelike AI interviewer asks timed questions while live checks keep it fair.',
        isVideo: true, video: VIDEO.interview, alt: 'Candidate taking an interview at home', chip: 'Integrity monitoring active', dot: '#0F8A6B',
        bg: '#FFF4F1', bd: '#F8E3DE', nBg: '#1F1417', nFg: '#FFFFFF', ovTitle: '', items: [] },
    { n: '03', t: 'See the real potential behind each answer.', d: 'Multi-dimensional scoring, answer-by-answer analysis, communication and speaking insights — with clear strengths and areas to improve.',
        // This photo comes from the design render with its evaluation card already on it, so no live overlay is added.
        img: IMG.stepHiringManager, alt: 'Hiring manager reviewing a candidate report, with evaluation scores', baked: true, chip: '', dot: '#F5B53F',
        bg: '#FFFDF6', bd: '#F6EBCF', nBg: '#F5B53F', nFg: '#1F1417', ovTitle: '', items: [] },
    { n: '04', t: 'Rank candidates. Hire with confidence.', d: 'Compare side by side, benchmark against the role, shortlist in a click and export the report for sign-off.',
        img: IMG.photoRecruiter, alt: 'Final interview conversation', chip: 'Shortlisted · Top 5%', dot: '#A3123A',
        bg: '#FFF1F3', bd: '#F6D9E0', nBg: '#E94B6A', nFg: '#FFFFFF', ovTitle: 'Shortlist · Top candidates',
        items: items([['Ananya Sharma', '91', '', IMG.avatarAnanya], ['Rohan Verma', '87', '', IMG.avatarRohan], ['Sneha Iyer', '85', '', IMG.avatarSneha]]) },
].map((s, i) => ({ ...s, top: `${100 + i * 24}px`, isVideo: !!s.isVideo, isImg: !s.isVideo }))

const AUDIENCES = [
    { tag: 'For organizations', title: 'Evaluate the right talent, faster.', img: IMG.photoRecruiter, alt: 'Recruiter interviewing a candidate', cta: 'Hire with WorkmateIQ',
        points: ['Role-specific templates with structured rounds', 'Invite candidates and track sent → completed', 'Consistent AI interviews with security checks', 'Benchmark and shortlist against the role'] },
    { tag: 'For colleges', title: 'Prepare students for real interview success.', img: IMG.photoCampus, alt: 'College students on campus', cta: 'Set up your campus',
        points: ['Timed, role-specific practice in a real setting', 'Structured AI scores and readiness reports', 'Personal feedback on strengths and gaps', 'Placement drives in one place'] },
    { tag: 'For candidates', title: 'Practice with purpose. Improve with clarity.', img: IMG.photoCandidateLaptop, alt: 'A student practising an interview on a laptop', cta: 'Start practising free',
        points: ['Questions shaped by your résumé and role', 'HR and technical modes with real time limits', 'Feedback on confidence, clarity, correctness', 'Every report saved to track progress'] },
]

const ENQUIRY_KINDS = [
    { id: 'ORGANIZATION', label: 'Company / organization', org: 'Company name' },
    { id: 'COLLEGE', label: 'College / institution', org: 'Institution name' },
    { id: 'CANDIDATE', label: 'Candidate', org: 'College or current company' },
]

const SECURITY = [
    { t: 'Single-person check', d: 'Flags a second face in frame' }, { t: 'Window lock', d: 'Logs every tab or app switch' },
    { t: 'Anti-paste monitor', d: 'Flags pasted AI or notes' }, { t: 'Encrypted storage', d: 'Recordings and reports at rest' },
]

const JOURNEY = [
    { n: '01', t: 'Discover', d: 'See how WorkmateIQ fits your hiring, placement or prep flow.' },
    { n: '02', t: 'Register', d: 'A short form as an organization, college or candidate.' },
    { n: '03', t: 'Onboard', d: 'A personal onboarding flow with the details your role needs.' },
    { n: '04', t: 'Review', d: 'Submissions and requested updates reviewed in one place.' },
    { n: '05', t: 'Begin', d: 'Go straight into interviews, hiring or placement.' },
].map((s, i) => ({ ...s, bg: i === 4 ? 'linear-gradient(135deg,#A3123A,#E94B6A)' : '#FFFFFF', fg: i === 4 ? '#FFFFFF' : '#A3123A' }))

export default function LandingPage() {
    const [tab, setTab] = useState(0)
    const [audIndex, setAudIndex] = useState(0)
    const [menuOpen, setMenuOpen] = useState(false)
    const [kind, setKind] = useState('ORGANIZATION')
    const [form, setForm] = useState({ name: '', email: '', org: '', message: '' })
    const [status, setStatus] = useState('idle')   // idle | sending | done | error
    const [error, setError] = useState('')

    // Arriving from another page with a #section in the URL (e.g. the pricing page's "Contact" link).
    useEffect(() => {
        const id = decodeURIComponent(window.location.hash.slice(1))
        if (!id) return
        const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' }), 60)
        return () => clearTimeout(t)
    }, [])

    // The product tour advances by itself every few seconds; choosing a tab restarts the timer.
    useEffect(() => {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (reduce) return undefined
        const timer = setInterval(() => setTab((t) => (t + 1) % TOUR.length), TAB_INTERVAL_MS)
        return () => clearInterval(timer)
    }, [tab])

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
    const onSubmit = async (e) => {
        e.preventDefault()
        if (status === 'sending') return
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
            setStatus('error'); setError('Please add your name, email and a short message.'); return
        }
        setStatus('sending'); setError('')
        const k = ENQUIRY_KINDS.find((x) => x.id === kind)
        try {
            await submitPlatformEnquiry({
                name: form.name.trim(), email: form.email.trim(), type: kind,
                message: `${form.org.trim() ? `${k.org}: ${form.org.trim()}\n\n` : ''}${form.message.trim()}`,
            })
            setStatus('done'); setForm({ name: '', email: '', org: '', message: '' })
        } catch (err) {
            setStatus('error'); setError(err?.message || 'Something went wrong. Please try again.')
        }
    }

    // Values the markup binds to (named as in the design so the markup stays a direct translation of it).
    const marquee = CAPABILITIES.concat(CAPABILITIES)
    const values = VALUES
    const tabs = TOUR.map((t, i) => {
        const on = i === tab
        return { title: t.title, on, sel: on ? 'true' : 'false', bg: on ? '#A3123A' : '#FFFFFF', fg: on ? '#FFFFFF' : '#3A2C31', bd: on ? '#A3123A' : '#EAD9DE', pick: () => setTab(i) }
    })
    const panel = [{ ...TOUR[tab], isLive: !!TOUR[tab].isLive, notLive: !TOUR[tab].isLive }]
    const steps4 = STEPS
    const aud = AUDIENCES.map((a, i) => {
        const open = i === audIndex
        return { ...a, open, flex: open ? 2.4 : 1,
            shade: open ? 'linear-gradient(180deg, rgba(31,20,23,0) 18%, rgba(31,20,23,0.86) 100%)' : 'linear-gradient(180deg, rgba(31,20,23,0.2), rgba(31,20,23,0.82))',
            pick: () => setAudIndex(i) }
    })
    const kinds = ENQUIRY_KINDS.map((o) => {
        const on = o.id === kind
        return { label: o.label, on: on ? 'true' : 'false', bg: on ? '#A3123A' : '#FFFFFF', fg: on ? '#FFFFFF' : '#3A2C31', bd: on ? '#A3123A' : '#EAD9DE', pick: () => setKind(o.id) }
    })
    const orgLabel = ENQUIRY_KINDS.find((o) => o.id === kind).org
    const sec = SECURITY
    const journey = JOURNEY

    return (

<div className="wiq-landing" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#1F1417", background: "#FFFFFF", width: "100%", fontSize: "16px", lineHeight: "1.6", overflowX: "clip", fontWeight: "400" }}>
{/* NAV */}

<header style={{ position: "sticky", top: "0", zIndex: "60", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid #F3E8EB" }}>
<div className="prog" style={{ position: "absolute", left: "0", right: "0", bottom: "-1px", height: "2px", background: "linear-gradient(90deg, #A3123A, #E94B6A, #FF9466)", transformOrigin: "left", transform: "scaleX(0)" }}></div>

<div className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "12px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
<a href="#top" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#1F1417", minHeight: "44px" }}>
<img src={IMG.logo} alt="" style={{ width: "38px", height: "38px", borderRadius: "50%" }} />
<span style={{ fontWeight: "700", fontSize: "20px", letterSpacing: "-0.02em" }}>{"WorkmateIQ"}</span>
</a>

<nav className="navmid" aria-label="Main" style={{ display: "flex", gap: "32px", fontSize: "15px" }}>
<a className="navlink" href="#about">{"About"}</a>

<a className="navlink" href="#product">{"Product"}</a>

<a className="navlink" href="#how">{"How it works"}</a>

<a className="navlink" href="#who">{"Solutions"}</a>

<Link className="navlink" to="/plans">{"Pricing"}</Link>
</nav>

<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
<Link to="/login" className="hidesm" style={{ textDecoration: "none", fontSize: "15px", fontWeight: "500", color: "#1F1417", padding: "11px 14px", minHeight: "44px", display: "inline-flex", alignItems: "center" }}>{"Log in"}</Link>

<Link to="/register" className="btn gb" style={{ textDecoration: "none", fontSize: "15px", fontWeight: "600", padding: "11px 20px", minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "8px", color: "#FFFFFF", borderRadius: "999px" }}>{"Join now "}
<span className="arr">{"→"}</span>
</Link>
<button type="button" className="mbtn" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="wl-mobile-menu" onClick={() => setMenuOpen((o) => !o)}>
<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F1417" strokeWidth="2" strokeLinecap="round">{menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
</button>
</div>
</div>
{menuOpen && (
<nav id="wl-mobile-menu" className="mpanel" aria-label="Mobile">
<a href="#about" onClick={() => setMenuOpen(false)}>{"About"}</a>
<a href="#product" onClick={() => setMenuOpen(false)}>{"Product"}</a>
<a href="#how" onClick={() => setMenuOpen(false)}>{"How it works"}</a>
<a href="#who" onClick={() => setMenuOpen(false)}>{"Solutions"}</a>
<Link to="/plans" onClick={() => setMenuOpen(false)}>{"Pricing"}</Link>
<Link to="/login" onClick={() => setMenuOpen(false)}>{"Log in"}</Link>
</nav>)}
</header>

{/* HERO */}

<section id="top" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #FFF7F5 0%, #FFFFFF 100%)" }}>
<div aria-hidden="true" style={{ position: "absolute", inset: "0", pointerEvents: "none" }}>
<div className="glow g1" style={{ width: "560px", height: "560px", background: "#FFD6DF", right: "-120px", top: "-140px", opacity: ".9" }}></div>

<div className="glow g2" style={{ width: "460px", height: "460px", background: "#FFE3D2", left: "-160px", bottom: "-120px", opacity: ".8" }}></div>

<div className="dots" style={{ position: "absolute", inset: "0" }}></div>
</div>

<div className="pad" style={{ position: "relative", maxWidth: "1320px", margin: "0 auto", padding: "76px 40px 70px", display: "flex", flexWrap: "wrap", gap: "48px", alignItems: "center" }}>
<div style={{ flex: "1 1 500px", minWidth: "0" }}>
<div className="up" style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "5px 14px 5px 5px", borderRadius: "999px", background: "#FFFFFF", border: "1px solid #F3DDE3", fontSize: "13px", fontWeight: "500", color: "#5E4E55", boxShadow: "0 6px 20px -12px rgba(163,18,58,.4)" }}>
<span className="gb" style={{ color: "#fff", borderRadius: "999px", padding: "3px 10px", fontSize: "11.5px", fontWeight: "600" }}>{"New"}</span>
{"Resume-informed AI interview questions"}</div>

<h1 className="h1 up u1" style={{ margin: "24px 0 0", fontWeight: "600", fontSize: "66px", lineHeight: "1.08", letterSpacing: "-0.04em", color: "#1F1417" }}>{"AI interviews that help you hire "}
<span className="rot">
<span className="gt">{"faster."}</span>

<span className="gt">{"fairer."}</span>

<span className="gt">{"smarter."}</span>
</span>
</h1>

<p className="up u2" style={{ margin: "24px 0 0", fontSize: "18px", lineHeight: "1.7", color: "#5E4E55", maxWidth: "540px" }}>{"WorkmateIQ runs secure, proctored AI interviews for organizations, colleges and candidates — then scores, benchmarks and ranks every answer so the right people rise to the top."}</p>

<div className="up u3" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "34px" }}>
<Link to="/register" className="btn gb" style={{ textDecoration: "none", color: "#fff", fontWeight: "600", padding: "15px 26px", borderRadius: "999px", minHeight: "54px", display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px" }}>{"Get started free "}
<span className="arr">{"→"}</span>
</Link>

<a href="#contact" className="ghost" style={{ textDecoration: "none", color: "#1F1417", fontWeight: "600", padding: "15px 24px", borderRadius: "999px", border: "1px solid #E6D3D9", background: "#FFFFFF", minHeight: "54px", display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px" }}>
<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#A3123A">
<path d="M8 5v14l11-7z"></path>
</svg>
{"Book a demo"}</a>
</div>

<div className="up u4" style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "40px", flexWrap: "wrap" }}>
<div style={{ display: "flex" }}>
<img src={IMG.avatar1} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #FFFFFF", objectFit: "cover" }} />
<img src={IMG.avatar2} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #FFFFFF", objectFit: "cover", marginLeft: "-12px" }} />
<img src={IMG.avatar3} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #FFFFFF", objectFit: "cover", marginLeft: "-12px" }} />
<img src={IMG.avatar4} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #FFFFFF", objectFit: "cover", marginLeft: "-12px" }} /></div>

<span style={{ fontSize: "14px", color: "#5E4E55" }}>
<span style={{ color: "#1F1417", fontWeight: "600" }}>{"Built for India's hiring teams "}{"&"}{" campuses"}</span>

<br />{"organizations, colleges and candidates"}</span>
</div>
</div>

{/* stage with real product shot */}

<div className="up u2" style={{ flex: "1.15 1 560px", minWidth: "0", position: "relative", padding: "30px 0 40px" }}>
<div className="tilt" style={{ position: "relative", borderRadius: "18px", overflow: "hidden", boxShadow: "0 50px 100px -40px rgba(90,20,40,0.45), 0 0 0 1px rgba(163,18,58,0.08)" }}>
<div style={{ containerType: "inline-size", width: "100%", background: "#FFFFFF" }}>
<div style={{ height: "3cqw", background: "#F6F2F3", display: "flex", alignItems: "center", gap: ".55cqw", padding: "0 1.1cqw", borderBottom: "1px solid #EEE4E7" }}>
<span style={{ width: ".85cqw", height: ".85cqw", borderRadius: "50%", background: "#FF5F57" }}></span>

<span style={{ width: ".85cqw", height: ".85cqw", borderRadius: "50%", background: "#FEBC2E" }}></span>

<span style={{ width: ".85cqw", height: ".85cqw", borderRadius: "50%", background: "#28C840" }}></span>

<span style={{ marginLeft: "1.2cqw", width: "32cqw", height: "1.95cqw", borderRadius: ".55cqw", background: "#FFFFFF", border: "1px solid #EEE4E7", fontSize: ".85cqw", color: "#7A6870", display: "flex", alignItems: "center", padding: "0 .8cqw" }}>{"app.workmateiq.com/interview/live"}</span>
</div>

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1cqw 1.5cqw", borderBottom: "1px solid #F0E6E9" }}>
<div style={{ display: "flex", alignItems: "center", gap: ".7cqw" }}>
<img src={IMG.logo} alt="" style={{ width: "2.1cqw", height: "2.1cqw", borderRadius: "50%" }} />
<div>
<div style={{ fontWeight: "600", fontSize: "1cqw" }}>{"Software Engineer · Round 2"}</div>

<div style={{ fontSize: ".82cqw", color: "#7A6870" }}>{"Technical · AI interview"}</div>
</div>
</div>

<div style={{ display: "flex", gap: ".55cqw" }}>
<span style={{ fontSize: ".8cqw", fontWeight: "600", padding: ".3cqw .7cqw", borderRadius: "999px", background: "#E3F6EE", color: "#0B6B52", display: "inline-flex", alignItems: "center", gap: ".35cqw" }}>
<span className="pulse" style={{ width: ".5cqw", height: ".5cqw", borderRadius: "50%", background: "#0F8A6B" }}></span>
{"Integrity monitoring active"}</span>

<span style={{ fontSize: ".8cqw", fontWeight: "600", padding: ".3cqw .7cqw", borderRadius: "999px", background: "#FDE7EC", color: "#A3123A", display: "inline-flex", alignItems: "center", gap: ".35cqw" }}>
<span className="pulse" style={{ width: ".5cqw", height: ".5cqw", borderRadius: "50%", background: "#E94B6A" }}></span>
{"REC 12:"}
<span className="lsec"></span>
</span>
</div>
</div>

<div style={{ display: "flex", gap: ".4cqw", padding: ".85cqw 1.5cqw 0" }}>
<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#E94B6A" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#E94B6A" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#A3123A" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>
</div>

<div style={{ display: "flex", gap: "1.25cqw", padding: "1.1cqw 1.5cqw 1.5cqw", background: "#FBF7F8" }}>
<div style={{ flex: "2", minWidth: "0", display: "flex", flexDirection: "column", gap: "1cqw" }}>
<div style={{ position: "relative", borderRadius: "1.25cqw", overflow: "hidden", height: "31cqw", background: "#222" }}>
<video src={VIDEO.interview} autoPlay muted loop playsInline aria-label="AI interviewer speaking" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}></video>

<span style={{ position: "absolute", left: "1cqw", top: "1cqw", fontSize: ".82cqw", fontWeight: "600", padding: ".35cqw .8cqw .35cqw .4cqw", borderRadius: "999px", background: "rgba(255,255,255,0.92)", display: "inline-flex", alignItems: "center", gap: ".5cqw" }}>
<span className="leq" style={{ display: "inline-flex", alignItems: "center", height: "1.5cqw", padding: "0 .45cqw", borderRadius: "999px", background: "#A3123A" }}>
<i></i>

<i></i>

<i></i>

<i></i>
</span>
{"AI interviewer · speaking"}</span>

<div style={{ position: "absolute", left: "1cqw", bottom: "1cqw", maxWidth: "58%", background: "rgba(31,20,23,0.72)", color: "#FFFFFF", borderRadius: ".7cqw", padding: ".5cqw .8cqw", fontSize: ".9cqw" }}>
<div className="lcap">{"\"Tell me about a time you solved a complex problem.\""}</div>
</div>

<div style={{ position: "absolute", right: "1cqw", bottom: "1cqw", width: "16cqw", height: "11cqw", borderRadius: "1cqw", overflow: "hidden", border: ".22cqw solid #FFFFFF", boxShadow: "0 12px 30px -10px rgba(0,0,0,.5)" }}>
<img className="lkb" src={IMG.candidatePip} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
<span style={{ position: "absolute", left: ".55cqw", bottom: ".55cqw", fontSize: ".75cqw", fontWeight: "600", padding: ".2cqw .6cqw", borderRadius: "999px", background: "rgba(0,0,0,0.55)", color: "#FFFFFF" }}>{"You"}</span>
</div>
</div>

<div style={{ background: "#FFFFFF", border: "1px solid #F0E6E9", borderRadius: "1.25cqw", padding: "1.1cqw", display: "flex", gap: "1.2cqw", alignItems: "center" }}>
<div className="lring" style={{ width: "5.4cqw", height: "5.4cqw", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
<div style={{ width: "4.3cqw", height: "4.3cqw", borderRadius: "50%", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
<b style={{ fontSize: "1.15cqw", fontWeight: "600" }}>{"02:"}
<span className="lsec"></span>
</b>

<span style={{ fontSize: ".6cqw", color: "#8A7880" }}>{"LEFT"}</span>
</div>
</div>

<div className="lq" style={{ flex: "1", minWidth: "0" }}>
<span>
<span style={{ display: "block", fontSize: ".85cqw", fontWeight: "600", color: "#A3123A" }}>{"Question 3 of 8 · Behavioural"}</span>

<span style={{ display: "block", fontSize: "1.45cqw", fontWeight: "600", marginTop: ".25cqw", letterSpacing: "-.01em" }}>{"Explain a time when you solved a complex problem."}</span>
</span>

<span>
<span style={{ display: "block", fontSize: ".85cqw", fontWeight: "600", color: "#A3123A" }}>{"Question 4 of 8 · Technical"}</span>

<span style={{ display: "block", fontSize: "1.45cqw", fontWeight: "600", marginTop: ".25cqw", letterSpacing: "-.01em" }}>{"How would you design a URL shortener at scale?"}</span>
</span>

<span>
<span style={{ display: "block", fontSize: ".85cqw", fontWeight: "600", color: "#A3123A" }}>{"Question 5 of 8 · Technical"}</span>

<span style={{ display: "block", fontSize: "1.45cqw", fontWeight: "600", marginTop: ".25cqw", letterSpacing: "-.01em" }}>{"What happens when you type a URL and press enter?"}</span>
</span>
</div>
</div>
</div>

<div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1cqw" }}>
<div style={{ flex: "1", background: "#FFFFFF", border: "1px solid #F0E6E9", borderRadius: "1.25cqw", padding: "1.1cqw" }}>
<div style={{ fontWeight: "600", fontSize: "1cqw" }}>{"Real-time dialogue"}</div>

<div style={{ display: "flex", flexDirection: "column", gap: ".7cqw", marginTop: ".85cqw", fontSize: ".9cqw", lineHeight: "1.5" }}>
<div className="lmsg" style={{ background: "#FDE7EC", borderRadius: ".85cqw", padding: ".7cqw .85cqw", maxWidth: "92%" }}>
<b style={{ display: "block", fontSize: ".75cqw", color: "#A3123A", fontWeight: "600" }}>{"AI interviewer"}</b>
{"Explain a time when you solved a complex problem."}</div>

<div className="lmsg lm2" style={{ background: "#F5F1F2", borderRadius: ".85cqw", padding: ".7cqw .85cqw", maxWidth: "92%", alignSelf: "flex-end" }}>
<b style={{ display: "block", fontSize: ".75cqw", color: "#7A6870", fontWeight: "600" }}>{"Ananya"}</b>
{"Our build time doubled, so I profiled each step before changing anything…"}</div>

<div className="lmsg lm3" style={{ background: "#FDE7EC", borderRadius: ".85cqw", padding: ".7cqw .85cqw", maxWidth: "92%" }}>
<b style={{ display: "block", fontSize: ".75cqw", color: "#A3123A", fontWeight: "600" }}>{"AI interviewer"}</b>
{"What did the profiling show you?"}</div>

<div className="ldots" style={{ alignSelf: "flex-end", background: "#F5F1F2", borderRadius: ".85cqw", padding: ".7cqw .9cqw" }}>
<i></i>

<i></i>

<i></i>
</div>
</div>
</div>

<div style={{ background: "#FFFFFF", border: "1px solid #F0E6E9", borderRadius: "1.25cqw", padding: "1.1cqw" }}>
<div style={{ fontWeight: "600", fontSize: "1cqw" }}>{"Live security monitor"}</div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".55cqw", marginTop: ".7cqw", fontSize: ".8cqw", fontWeight: "600", color: "#0B6B52" }}>
<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ Camera active"}</span>

<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ Mic active"}</span>

<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ One person"}</span>

<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ No tab switch"}</span>
</div>
</div>
</div>
</div>
</div>
</div>

<div className="f1 hidesm" style={{ position: "absolute", left: "-36px", bottom: "-6px", width: "170px", filter: "drop-shadow(0 30px 40px rgba(60,10,25,0.35))" }}>
<img src={IMG.appPhone} alt="WorkmateIQ candidate app on a phone" style={{ width: "100%", display: "block" }} /></div>

<div className="f2" style={{ position: "absolute", right: "-14px", top: "0", background: "#FFFFFF", borderRadius: "18px", padding: "14px 16px", width: "220px", boxShadow: "0 24px 50px -20px rgba(90,20,40,0.35)", border: "1px solid #F3E8EB" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
<span style={{ fontSize: "12px", fontWeight: "500", color: "#7A6870" }}>{"Overall score"}</span>

<span style={{ fontWeight: "600", fontSize: "32px", letterSpacing: "-0.03em", lineHeight: "1", color: "#A3123A" }}>
<span className="count"></span>

<span style={{ fontSize: "13px", color: "#7A6870", fontWeight: "500" }}>{"/100"}</span>
</span>
</div>

<div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
<span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "999px", background: "#E3F6EE", color: "#0B6B52" }}>{"Strong"}</span>

<span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "999px", background: "#FFF3DA", color: "#7A5200" }}>{"Top 5%"}</span>
</div>
</div>

<div className="toast hidesm" style={{ position: "absolute", right: "30px", bottom: "0", background: "#FFFFFF", borderRadius: "16px", padding: "10px 14px 10px 10px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 24px 50px -16px rgba(90,20,40,0.4)", border: "1px solid #F3E8EB" }}>
<img src={IMG.avatar2} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
<div>
<div style={{ fontSize: "13px", fontWeight: "600" }}>{"Rohan was shortlisted"}</div>

<div style={{ fontSize: "11.5px", color: "#7A6870" }}>{"Software Engineer · 87/100"}</div>
</div>
</div>
</div>
</div>

<div className="mqwrap" aria-label="Capabilities" style={{ position: "relative", borderTop: "1px solid #F3E8EB", borderBottom: "1px solid #F3E8EB", background: "#FFFFFF", padding: "18px 0", overflow: "hidden" }}>
<div className="mq" style={{ whiteSpace: "nowrap", gap: "0" }}>{(marquee).map((m, __i1) => (<Fragment key={__i1}>
<span style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginRight: "14px", padding: "9px 18px", borderRadius: "999px", background: "#FFF6F4", color: "#4A3A41", fontSize: "15px", fontWeight: "500" }}>
<span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#E94B6A" }}></span>
{m}</span>
</Fragment>))}</div>
</div>
</section>

{/* ABOUT bento */}

<section id="about" className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "120px 40px 100px" }}>
<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", marginBottom: "44px" }}>
<div style={{ maxWidth: "720px" }}>
<p className="rv" style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: "600", letterSpacing: "0.1em", color: "#A3123A" }}>{"ABOUT US"}</p>

<h2 className="h2 rv" style={{ margin: "0", fontWeight: "600", fontSize: "52px", lineHeight: "1.1", letterSpacing: "-0.035em" }}>{"One hub for "}
<span className="gt">{"every side"}</span>
{" of hiring."}</h2>
</div>

<p className="rv" style={{ margin: "0", maxWidth: "420px", color: "#5E4E55", fontSize: "17px" }}>{"Registration, onboarding, interviews, feedback and placement — in one secure place, with transparency for everyone involved."}</p>
</div>

<div className="bento">
<article className="tile s7 r2 rvs" style={{ minHeight: "540px", background: "#F6EEF0" }}>
<img className="cover para" src={IMG.photoRecruiter} alt="Recruiter interviewing a candidate across a desk" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
<div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg, rgba(31,20,23,0) 45%, rgba(31,20,23,0.78) 100%)" }}></div>

<div style={{ position: "absolute", left: "28px", right: "28px", bottom: "28px", color: "#FFFFFF" }}>
<span style={{ display: "inline-flex", padding: "5px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.9)", color: "#A3123A", fontSize: "12px", fontWeight: "600" }}>{"For organizations"}</span>

<h3 style={{ margin: "12px 0 6px", fontSize: "30px", fontWeight: "600", letterSpacing: "-0.025em", lineHeight: "1.2" }}>{"Intelligent, efficient hiring — without the guesswork."}</h3>

<p style={{ margin: "0", color: "#F5E6EA", maxWidth: "520px" }}>{"Structured interviews, consistent scores and clear rankings your whole team can stand behind."}</p>
</div>

<div className="f1" style={{ position: "absolute", right: "22px", top: "22px", background: "#FFFFFF", borderRadius: "16px", padding: "10px 14px 10px 10px", display: "flex", gap: "10px", alignItems: "center", boxShadow: "0 20px 40px -18px rgba(0,0,0,0.4)" }}>
<img src={IMG.avatar1} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
<div>
<div style={{ fontSize: "13px", fontWeight: "600" }}>{"Offer accepted"}</div>

<div style={{ fontSize: "11.5px", color: "#7A6870" }}>{"Ananya · Software Engineer"}</div>
</div>
</div>
</article>

<article className="tile s5 rv" style={{ background: "#FFF4F1", padding: "30px", minHeight: "260px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid #F8E3DE" }}>
<div style={{ fontSize: "13px", fontWeight: "600", color: "#A3123A", letterSpacing: "0.08em" }}>{"OUR MISSION"}</div>

<p style={{ margin: "14px 0 0", fontSize: "23px", fontWeight: "500", lineHeight: "1.45", letterSpacing: "-0.01em", color: "#2B1C21" }}>{"Make every interview "}
<span style={{ color: "#A3123A", fontWeight: "600" }}>{"fair, consistent and transparent"}</span>
{" — for the people hiring and the people being hired."}</p>
</article>

<article className="tile s5 rv" style={{ background: "#FFFFFF", border: "1px solid #F3E8EB", padding: "28px", minHeight: "260px" }}>
<div style={{ fontSize: "13px", fontWeight: "600", color: "#A3123A", letterSpacing: "0.08em" }}>{"CONNECTED ECOSYSTEM"}</div>

<div style={{ position: "relative", height: "170px", marginTop: "14px" }}>
<svg aria-hidden="true" viewBox="0 0 400 170" preserveAspectRatio="none" style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }}>
<path className="flow" d="M70 35 C 150 35, 150 85, 200 85" fill="none" stroke="#E94B6A" strokeWidth="2"></path>

<path className="flow" d="M70 135 C 150 135, 150 85, 200 85" fill="none" stroke="#FF9466" strokeWidth="2"></path>

<path className="flow" d="M200 85 C 260 85, 260 85, 330 85" fill="none" stroke="#F5B53F" strokeWidth="2"></path>
</svg>

<span style={{ position: "absolute", left: "0", top: "16px", background: "#FFF1F3", color: "#8A0E33", fontSize: "13px", fontWeight: "600", padding: "7px 12px", borderRadius: "12px" }}>{"Organizations"}</span>

<span style={{ position: "absolute", left: "0", bottom: "16px", background: "#FFF0E8", color: "#8F330A", fontSize: "13px", fontWeight: "600", padding: "7px 12px", borderRadius: "12px" }}>{"Colleges"}</span>

<span className="node" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "62px", height: "62px", borderRadius: "50%", background: "#FFFFFF", border: "1px solid #F3DDE3", display: "flex", alignItems: "center", justifyContent: "center" }}>
<img src={IMG.logo} alt="" style={{ width: "50px", height: "50px", borderRadius: "50%" }} /></span>

<span style={{ position: "absolute", right: "0", top: "50%", transform: "translateY(-50%)", background: "#FFF6E3", color: "#7A5200", fontSize: "13px", fontWeight: "600", padding: "7px 12px", borderRadius: "12px" }}>{"Candidates"}</span>
</div>
</article>

<article className="tile s4 rv" style={{ minHeight: "320px", background: "#F6EEF0" }}>
<img className="cover" src={IMG.photoCampus} alt="College students walking on campus" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
<div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg, rgba(31,20,23,0) 45%, rgba(31,20,23,0.75) 100%)" }}></div>

<div style={{ position: "absolute", left: "22px", right: "22px", bottom: "20px", color: "#FFFFFF" }}>
<div style={{ fontSize: "12px", fontWeight: "600", color: "#FFD58A" }}>{"For colleges"}</div>

<div style={{ fontSize: "20px", fontWeight: "600", lineHeight: "1.3", marginTop: "4px" }}>{"Better preparation and career connections."}</div>
</div>
</article>

<article className="tile s4 rv" style={{ minHeight: "320px", background: "#F6EEF0" }}>
<img className="cover" src={IMG.photoCandidateLaptop} alt="Student practising an interview on a laptop" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
<div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg, rgba(31,20,23,0) 45%, rgba(31,20,23,0.75) 100%)" }}></div>

<div style={{ position: "absolute", left: "22px", right: "22px", bottom: "20px", color: "#FFFFFF" }}>
<div style={{ fontSize: "12px", fontWeight: "600", color: "#FFB8C8" }}>{"For candidates"}</div>

<div style={{ fontSize: "20px", fontWeight: "600", lineHeight: "1.3", marginTop: "4px" }}>{"Skill improvement and personal feedback."}</div>
</div>
</article>

<article className="tile s4 rv" style={{ background: "linear-gradient(150deg, #FFF1F3, #FFE7DC)", border: "1px solid #F8DCD9", padding: "26px", minHeight: "320px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", color: "#A3123A" }}>{"WHAT WE STAND FOR"}</div>

<ul style={{ listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}>{(values).map((v, __i1) => (<Fragment key={__i1}>
<li style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.8)", borderRadius: "14px", padding: "11px 14px", fontWeight: "500" }}>
<span className="gb" style={{ width: "24px", height: "24px", borderRadius: "50%", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>{"✓"}</span>
{v}</li>
</Fragment>))}</ul>
</article>
</div>
</section>

{/* PRODUCT TOUR (generated platform images) */}

<section id="product" style={{ background: "linear-gradient(180deg, #FFF7F5, #FFFFFF)", borderTop: "1px solid #F3E8EB" }}>
<div className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "110px 40px" }}>
<div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto" }}>
<p className="rv" style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: "600", letterSpacing: "0.1em", color: "#A3123A" }}>{"INSIDE THE PLATFORM"}</p>

<h2 className="h2 rv" style={{ margin: "0", fontWeight: "600", fontSize: "52px", lineHeight: "1.1", letterSpacing: "-0.035em" }}>{"See WorkmateIQ "}
<span className="gt">{"in action."}</span>
</h2>
</div>

<div role="tablist" aria-label="Product screens" className="rv" style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginTop: "36px" }}>{(tabs).map((t, __i1) => (<Fragment key={__i1}>
<button type="button" role="tab" aria-selected={t.sel} onClick={t.pick} style={{ position: "relative", overflow: "hidden", fontFamily: "inherit", fontSize: "14.5px", fontWeight: "500", padding: "0 20px", minHeight: "46px", borderRadius: "999px", cursor: "pointer", border: `1px solid ${t.bd}`, background: t.bg, color: t.fg, transition: "all .35s ease" }}>{t.title}{(t.on) && (<>
<span className="tprog" style={{ position: "absolute", left: "0", bottom: "0", height: "3px", width: "100%", background: "rgba(255,255,255,0.6)" }}></span>
</>)}</button>
</Fragment>))}</div>

<div style={{ display: "flex", flexWrap: "wrap", gap: "40px", marginTop: "40px", alignItems: "center" }}>{(panel).map((p, __i1) => (<Fragment key={__i1}>
<div className="fadein" style={{ flex: "1 1 320px", minWidth: "0" }}>
<h3 style={{ margin: "0", fontSize: "30px", fontWeight: "600", letterSpacing: "-0.025em", lineHeight: "1.2" }}>{p.head}</h3>

<p style={{ margin: "14px 0 0", color: "#5E4E55", fontSize: "16.5px" }}>{p.body}</p>

<ul style={{ listStyle: "none", margin: "20px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "10px" }}>{(p.points).map((x, __i2) => (<Fragment key={__i2}>
<li style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", color: "#3A2C31" }}>
<span style={{ flex: "none", width: "22px", height: "22px", borderRadius: "50%", background: "#FFF1F3", color: "#A3123A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600", marginTop: "1px" }}>{"✓"}</span>
{x}</li>
</Fragment>))}</ul>
</div>

<div className="lift3d" style={{ flex: "2 1 620px", minWidth: "0", display: "flex", justifyContent: "center" }}>
<div className="shotin" style={{ width: p.w, maxWidth: "100%", borderRadius: p.r, overflow: "hidden", boxShadow: "0 40px 90px -40px rgba(90,20,40,0.45), 0 0 0 1px rgba(163,18,58,0.06)" }}>{(p.isLive) && (<>
<div style={{ containerType: "inline-size", width: "100%", background: "#FFFFFF" }}>
<div style={{ height: "3cqw", background: "#F6F2F3", display: "flex", alignItems: "center", gap: ".55cqw", padding: "0 1.1cqw", borderBottom: "1px solid #EEE4E7" }}>
<span style={{ width: ".85cqw", height: ".85cqw", borderRadius: "50%", background: "#FF5F57" }}></span>

<span style={{ width: ".85cqw", height: ".85cqw", borderRadius: "50%", background: "#FEBC2E" }}></span>

<span style={{ width: ".85cqw", height: ".85cqw", borderRadius: "50%", background: "#28C840" }}></span>

<span style={{ marginLeft: "1.2cqw", width: "32cqw", height: "1.95cqw", borderRadius: ".55cqw", background: "#FFFFFF", border: "1px solid #EEE4E7", fontSize: ".85cqw", color: "#7A6870", display: "flex", alignItems: "center", padding: "0 .8cqw" }}>{"app.workmateiq.com/interview/live"}</span>
</div>

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1cqw 1.5cqw", borderBottom: "1px solid #F0E6E9" }}>
<div style={{ display: "flex", alignItems: "center", gap: ".7cqw" }}>
<img src={IMG.logo} alt="" style={{ width: "2.1cqw", height: "2.1cqw", borderRadius: "50%" }} />
<div>
<div style={{ fontWeight: "600", fontSize: "1cqw" }}>{"Software Engineer · Round 2"}</div>

<div style={{ fontSize: ".82cqw", color: "#7A6870" }}>{"Technical · AI interview"}</div>
</div>
</div>

<div style={{ display: "flex", gap: ".55cqw" }}>
<span style={{ fontSize: ".8cqw", fontWeight: "600", padding: ".3cqw .7cqw", borderRadius: "999px", background: "#E3F6EE", color: "#0B6B52", display: "inline-flex", alignItems: "center", gap: ".35cqw" }}>
<span className="pulse" style={{ width: ".5cqw", height: ".5cqw", borderRadius: "50%", background: "#0F8A6B" }}></span>
{"Integrity monitoring active"}</span>

<span style={{ fontSize: ".8cqw", fontWeight: "600", padding: ".3cqw .7cqw", borderRadius: "999px", background: "#FDE7EC", color: "#A3123A", display: "inline-flex", alignItems: "center", gap: ".35cqw" }}>
<span className="pulse" style={{ width: ".5cqw", height: ".5cqw", borderRadius: "50%", background: "#E94B6A" }}></span>
{"REC 12:"}
<span className="lsec"></span>
</span>
</div>
</div>

<div style={{ display: "flex", gap: ".4cqw", padding: ".85cqw 1.5cqw 0" }}>
<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#E94B6A" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#E94B6A" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#A3123A" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>

<span style={{ flex: "1", height: ".28cqw", borderRadius: "4px", background: "#F2E6E9" }}></span>
</div>

<div style={{ display: "flex", gap: "1.25cqw", padding: "1.1cqw 1.5cqw 1.5cqw", background: "#FBF7F8" }}>
<div style={{ flex: "2", minWidth: "0", display: "flex", flexDirection: "column", gap: "1cqw" }}>
<div style={{ position: "relative", borderRadius: "1.25cqw", overflow: "hidden", height: "31cqw", background: "#222" }}>
<video src={VIDEO.interview} autoPlay muted loop playsInline aria-label="AI interviewer speaking" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}></video>

<span style={{ position: "absolute", left: "1cqw", top: "1cqw", fontSize: ".82cqw", fontWeight: "600", padding: ".35cqw .8cqw .35cqw .4cqw", borderRadius: "999px", background: "rgba(255,255,255,0.92)", display: "inline-flex", alignItems: "center", gap: ".5cqw" }}>
<span className="leq" style={{ display: "inline-flex", alignItems: "center", height: "1.5cqw", padding: "0 .45cqw", borderRadius: "999px", background: "#A3123A" }}>
<i></i>

<i></i>

<i></i>

<i></i>
</span>
{"AI interviewer · speaking"}</span>

<div style={{ position: "absolute", left: "1cqw", bottom: "1cqw", maxWidth: "58%", background: "rgba(31,20,23,0.72)", color: "#FFFFFF", borderRadius: ".7cqw", padding: ".5cqw .8cqw", fontSize: ".9cqw" }}>
<div className="lcap">{"\"Tell me about a time you solved a complex problem.\""}</div>
</div>

<div style={{ position: "absolute", right: "1cqw", bottom: "1cqw", width: "16cqw", height: "11cqw", borderRadius: "1cqw", overflow: "hidden", border: ".22cqw solid #FFFFFF", boxShadow: "0 12px 30px -10px rgba(0,0,0,.5)" }}>
<img className="lkb" src={IMG.candidatePip} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
<span style={{ position: "absolute", left: ".55cqw", bottom: ".55cqw", fontSize: ".75cqw", fontWeight: "600", padding: ".2cqw .6cqw", borderRadius: "999px", background: "rgba(0,0,0,0.55)", color: "#FFFFFF" }}>{"You"}</span>
</div>
</div>

<div style={{ background: "#FFFFFF", border: "1px solid #F0E6E9", borderRadius: "1.25cqw", padding: "1.1cqw", display: "flex", gap: "1.2cqw", alignItems: "center" }}>
<div className="lring" style={{ width: "5.4cqw", height: "5.4cqw", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
<div style={{ width: "4.3cqw", height: "4.3cqw", borderRadius: "50%", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
<b style={{ fontSize: "1.15cqw", fontWeight: "600" }}>{"02:"}
<span className="lsec"></span>
</b>

<span style={{ fontSize: ".6cqw", color: "#8A7880" }}>{"LEFT"}</span>
</div>
</div>

<div className="lq" style={{ flex: "1", minWidth: "0" }}>
<span>
<span style={{ display: "block", fontSize: ".85cqw", fontWeight: "600", color: "#A3123A" }}>{"Question 3 of 8 · Behavioural"}</span>

<span style={{ display: "block", fontSize: "1.45cqw", fontWeight: "600", marginTop: ".25cqw", letterSpacing: "-.01em" }}>{"Explain a time when you solved a complex problem."}</span>
</span>

<span>
<span style={{ display: "block", fontSize: ".85cqw", fontWeight: "600", color: "#A3123A" }}>{"Question 4 of 8 · Technical"}</span>

<span style={{ display: "block", fontSize: "1.45cqw", fontWeight: "600", marginTop: ".25cqw", letterSpacing: "-.01em" }}>{"How would you design a URL shortener at scale?"}</span>
</span>

<span>
<span style={{ display: "block", fontSize: ".85cqw", fontWeight: "600", color: "#A3123A" }}>{"Question 5 of 8 · Technical"}</span>

<span style={{ display: "block", fontSize: "1.45cqw", fontWeight: "600", marginTop: ".25cqw", letterSpacing: "-.01em" }}>{"What happens when you type a URL and press enter?"}</span>
</span>
</div>
</div>
</div>

<div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1cqw" }}>
<div style={{ flex: "1", background: "#FFFFFF", border: "1px solid #F0E6E9", borderRadius: "1.25cqw", padding: "1.1cqw" }}>
<div style={{ fontWeight: "600", fontSize: "1cqw" }}>{"Real-time dialogue"}</div>

<div style={{ display: "flex", flexDirection: "column", gap: ".7cqw", marginTop: ".85cqw", fontSize: ".9cqw", lineHeight: "1.5" }}>
<div className="lmsg" style={{ background: "#FDE7EC", borderRadius: ".85cqw", padding: ".7cqw .85cqw", maxWidth: "92%" }}>
<b style={{ display: "block", fontSize: ".75cqw", color: "#A3123A", fontWeight: "600" }}>{"AI interviewer"}</b>
{"Explain a time when you solved a complex problem."}</div>

<div className="lmsg lm2" style={{ background: "#F5F1F2", borderRadius: ".85cqw", padding: ".7cqw .85cqw", maxWidth: "92%", alignSelf: "flex-end" }}>
<b style={{ display: "block", fontSize: ".75cqw", color: "#7A6870", fontWeight: "600" }}>{"Ananya"}</b>
{"Our build time doubled, so I profiled each step before changing anything…"}</div>

<div className="lmsg lm3" style={{ background: "#FDE7EC", borderRadius: ".85cqw", padding: ".7cqw .85cqw", maxWidth: "92%" }}>
<b style={{ display: "block", fontSize: ".75cqw", color: "#A3123A", fontWeight: "600" }}>{"AI interviewer"}</b>
{"What did the profiling show you?"}</div>

<div className="ldots" style={{ alignSelf: "flex-end", background: "#F5F1F2", borderRadius: ".85cqw", padding: ".7cqw .9cqw" }}>
<i></i>

<i></i>

<i></i>
</div>
</div>
</div>

<div style={{ background: "#FFFFFF", border: "1px solid #F0E6E9", borderRadius: "1.25cqw", padding: "1.1cqw" }}>
<div style={{ fontWeight: "600", fontSize: "1cqw" }}>{"Live security monitor"}</div>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".55cqw", marginTop: ".7cqw", fontSize: ".8cqw", fontWeight: "600", color: "#0B6B52" }}>
<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ Camera active"}</span>

<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ Mic active"}</span>

<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ One person"}</span>

<span style={{ background: "#E3F6EE", borderRadius: ".7cqw", padding: ".55cqw .7cqw" }}>{"✓ No tab switch"}</span>
</div>
</div>
</div>
</div>
</div>
</>)}{(p.notLive) && (<>
{p.Mock ? <p.Mock /> : null}{!p.Mock && <img src={p.img} alt={p.alt} style={{ width: "100%", display: "block" }} />}</>)}</div>
</div>
</Fragment>))}</div>
</div>
</section>

{/* HOW IT WORKS (stacking) */}

<section id="how" className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "110px 40px 110px" }}>
<div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 56px" }}>
<p className="rv" style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: "600", letterSpacing: "0.1em", color: "#A3123A" }}>{"HOW IT WORKS"}</p>

<h2 className="h2 rv" style={{ margin: "0", fontWeight: "600", fontSize: "52px", lineHeight: "1.1", letterSpacing: "-0.035em" }}>{"From invite to offer, "}
<span className="gt">{"in four steps."}</span>
</h2>
</div>
{(steps4).map((s, __i1) => (<Fragment key={__i1}>
<div className="stack" style={{ top: s.top, marginBottom: "36px", background: s.bg, border: `1px solid ${s.bd}`, borderRadius: "32px", padding: "40px", display: "flex", flexWrap: "wrap", gap: "40px", alignItems: "center", boxShadow: "0 -24px 50px -36px rgba(90,20,40,0.3)", minHeight: "460px" }}>
<div style={{ flex: "1 1 340px", minWidth: "0" }}>
<span style={{ display: "inline-flex", width: "48px", height: "48px", borderRadius: "14px", background: s.nBg, color: s.nFg, fontWeight: "600", fontSize: "18px", alignItems: "center", justifyContent: "center" }}>{s.n}</span>

<h3 style={{ margin: "18px 0 10px", fontWeight: "600", fontSize: "36px", lineHeight: "1.15", letterSpacing: "-0.03em" }}>{s.t}</h3>

<p style={{ margin: "0", color: "#5E4E55", fontSize: "17px" }}>{s.d}</p>
</div>

<div style={{ flex: "1 1 460px", minWidth: "0", position: "relative", borderRadius: "24px", overflow: "hidden", height: "360px" }}>{(s.isVideo) && (<>
<video src={s.video} autoPlay muted loop playsInline aria-label={s.alt} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }}></video>

<span style={{ position: "absolute", left: "16px", top: "16px", fontSize: "12.5px", fontWeight: "600", padding: "5px 12px 5px 6px", borderRadius: "999px", background: "rgba(255,255,255,0.94)", display: "inline-flex", alignItems: "center", gap: "8px" }}>
<span className="leq" style={{ display: "inline-flex", alignItems: "center", height: "22px", padding: "0 7px", borderRadius: "999px", background: "#A3123A" }}>
<i style={{ width: "3px" }}></i>

<i style={{ width: "3px" }}></i>

<i style={{ width: "3px" }}></i>

<i style={{ width: "3px" }}></i>
</span>
{"AI interviewer · speaking"}</span>

<div style={{ position: "absolute", right: "16px", top: "16px", width: "150px", height: "110px", borderRadius: "14px", overflow: "hidden", border: "3px solid #FFFFFF", boxShadow: "0 14px 30px -12px rgba(0,0,0,0.5)" }}>
<img className="lkb" src={IMG.candidatePip} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
<span style={{ position: "absolute", left: "6px", bottom: "6px", fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", background: "rgba(0,0,0,0.55)", color: "#FFFFFF" }}>{"You"}</span>
</div>
</>)}{(s.isImg) && (<>
<img className="kbs" src={s.img} alt={s.alt} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: s.pos }} />
{!s.baked && (<div style={{ position: "absolute", right: "16px", top: "16px", width: "230px", background: "rgba(255,255,255,0.96)", borderRadius: "16px", padding: "14px", boxShadow: "0 20px 40px -18px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", gap: "9px" }}>
<div style={{ fontSize: "12px", fontWeight: "600", color: "#A3123A" }}>{s.ovTitle}</div>
{(s.items).map((it, __i2) => (<Fragment key={__i2}>
<div className="loopin" style={{ animationDelay: it.d }}>
<div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12.5px", fontWeight: "500" }}>
<span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>{(it.hasImg) && (<>
<img src={it.img} alt="" style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }} /></>)}{it.t}</span>

<span style={{ fontWeight: "600" }}>{it.v}</span>
</div>
{(it.hasBar) && (<>
<div style={{ height: "5px", borderRadius: "5px", background: "#F5E9EC", marginTop: "5px", overflow: "hidden" }}>
<div className="loopbar gb" style={{ height: "5px", borderRadius: "5px", width: it.w, animationDelay: it.d }}></div>
</div>
</>)}</div>
</Fragment>))}</div>)}
</>)}
{!s.baked && (<div style={{ position: "absolute", left: "18px", bottom: "18px", background: "rgba(255,255,255,0.95)", borderRadius: "14px", padding: "10px 14px", fontSize: "13.5px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 16px 30px -16px rgba(0,0,0,0.4)" }}>
<span className="pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.dot }}></span>
{s.chip}</div>)}
</div>
</div>
</Fragment>))}</section>

{/* WHO accordion */}

<section id="who" style={{ background: "#FFF7F5", borderTop: "1px solid #F3E8EB", borderBottom: "1px solid #F3E8EB" }}>
<div className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "110px 40px" }}>
<div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 48px" }}>
<p className="rv" style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: "600", letterSpacing: "0.1em", color: "#A3123A" }}>{"WHO IT'S FOR"}</p>

<h2 className="h2 rv" style={{ margin: "0", fontWeight: "600", fontSize: "52px", lineHeight: "1.1", letterSpacing: "-0.035em" }}>{"Built for "}
<span className="gt">{"all three sides"}</span>
{" of the table."}</h2>
</div>

<div className="accrow rv" style={{ display: "flex", gap: "16px", height: "560px" }}>{(aud).map((a, __i1) => (<Fragment key={__i1}>
<article className="acc" tabIndex={0} aria-label={a.tag} onMouseEnter={a.pick} onFocus={a.pick} onClick={a.pick} style={{ flex: `${a.flex} 1 0`, minWidth: "0", position: "relative", borderRadius: "28px", overflow: "hidden", background: "#F6EEF0", cursor: "pointer" }}>
<img src={a.img} alt={a.alt} style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
<div style={{ position: "absolute", inset: "0", background: a.shade, transition: "background .6s ease" }}></div>

<div style={{ position: "absolute", left: "26px", right: "26px", bottom: "26px", color: "#FFFFFF" }}>
<span style={{ display: "inline-flex", padding: "5px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.92)", color: '#A3123A', fontSize: "12px", fontWeight: "600" }}>{a.tag}</span>

<h3 style={{ margin: "12px 0 0", fontSize: "28px", fontWeight: "600", letterSpacing: "-0.025em", lineHeight: "1.2" }}>{a.title}</h3>
{(a.open) && (<>
<div className="fadein">
<ul style={{ listStyle: "none", margin: "14px 0 0", padding: "0", display: "flex", flexDirection: "column", gap: "8px", fontSize: "15px", color: "#FBEFF2", maxWidth: "520px" }}>{(a.points).map((p, __i2) => (<Fragment key={__i2}>
<li style={{ display: "flex", gap: "10px" }}>
<span style={{ color: "#FFD58A" }}>{"✓"}</span>
{p}</li>
</Fragment>))}</ul>

<Link to="/register" className="btn" style={{ marginTop: "18px", textDecoration: "none", background: "#FFFFFF", color: "#1F1417", fontWeight: "600", padding: "12px 22px", borderRadius: "999px", minHeight: "46px", display: "inline-flex", alignItems: "center", gap: "10px" }}>{a.cta}{" "}
<span className="arr">{"→"}</span>
</Link>
</div>
</>)}</div>
</article>
</Fragment>))}</div>
</div>
</section>

{/* SECURITY */}

<section className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "110px 40px" }}>
<div style={{ display: "flex", flexWrap: "wrap", gap: "56px", alignItems: "center" }}>
<div style={{ flex: "1 1 440px", minWidth: "0" }}>
<p className="rv" style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: "600", letterSpacing: "0.1em", color: "#0B6B52" }}>{"ENTERPRISE SECURITY"}</p>

<h2 className="h2 rv" style={{ margin: "0", fontWeight: "600", fontSize: "46px", lineHeight: "1.12", letterSpacing: "-0.035em" }}>{"A score only matters if the interview was "}
<span className="gt">{"honest."}</span>
</h2>

<p className="rv" style={{ margin: "18px 0 0", color: "#5E4E55", fontSize: "17px", maxWidth: "520px" }}>{"Proctoring runs through every session. Data is handled with SOC 2-aligned practices, encrypted storage and controlled access at every layer."}</p>

<div className="rv" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginTop: "26px" }}>{(sec).map((s, __i1) => (<Fragment key={__i1}>
<div style={{ background: "#FFFFFF", border: "1px solid #F3E8EB", borderRadius: "18px", padding: "16px", boxShadow: "0 10px 30px -24px rgba(90,20,40,0.4)" }}>
<div style={{ fontWeight: "600" }}>{s.t}</div>

<div style={{ fontSize: "13.5px", color: "#6B5A61", marginTop: "2px" }}>{s.d}</div>
</div>
</Fragment>))}</div>
</div>

<div className="rvs" style={{ flex: "0 1 440px", minWidth: "0", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
<div style={{ position: "relative", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, #FFF1F3, #FFFFFF 70%)", border: "1px solid #F3E8EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
<div aria-hidden="true" className="sweep" style={{ position: "absolute", inset: "0", borderRadius: "50%", background: "conic-gradient(from 0deg, rgba(233,75,106,0.22), transparent 25%)" }}></div>

<div aria-hidden="true" style={{ position: "absolute", inset: "52px", borderRadius: "50%", border: "1px dashed #EBC9D2" }}></div>

<div className="ring" style={{ position: "relative", width: "196px", height: "196px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
<div style={{ width: "164px", height: "164px", borderRadius: "50%", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
<span style={{ fontWeight: "600", fontSize: "48px", letterSpacing: "-0.04em", lineHeight: "1" }}>{"76%"}</span>

<span style={{ fontSize: "12.5px", color: "#7A6870", marginTop: "4px" }}>{"Interview readiness"}</span>
</div>
</div>
</div>

<p style={{ margin: "0", textAlign: "center", fontSize: "14px", color: "#6B5A61", maxWidth: "320px" }}>{"A combined score from communication, problem solving and technical performance — generated instantly."}</p>
</div>
</div>
</section>

{/* JOURNEY */}

<section className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 40px 120px" }}>
<div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 52px" }}>
<p className="rv" style={{ margin: "0 0 14px", fontSize: "13px", fontWeight: "600", letterSpacing: "0.1em", color: "#A3123A" }}>{"THE PLATFORM JOURNEY"}</p>

<h2 className="h2 rv" style={{ margin: "0", fontWeight: "600", fontSize: "46px", lineHeight: "1.12", letterSpacing: "-0.035em" }}>{"From discovery to opportunity."}</h2>
</div>

<div style={{ position: "relative" }}>
<div aria-hidden="true" className="hidesm" style={{ position: "absolute", left: "8%", right: "8%", top: "34px", height: "2px", background: "#F3E8EB" }}>
<div className="line gb" style={{ height: "2px", transformOrigin: "left" }}></div>
</div>

<ol style={{ listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "20px", position: "relative" }}>{(journey).map((s, __i1) => (<Fragment key={__i1}>
<li className="rv" style={{ textAlign: "center", padding: "0 8px" }}>
<span style={{ display: "inline-flex", width: "68px", height: "68px", borderRadius: "50%", alignItems: "center", justifyContent: "center", fontSize: "19px", fontWeight: "600", background: s.bg, color: s.fg, border: "6px solid #FFFFFF", boxShadow: "0 14px 28px -14px rgba(163,18,58,0.5)" }}>{s.n}</span>

<h3 style={{ margin: "16px 0 6px", fontSize: "19px", fontWeight: "600" }}>{s.t}</h3>

<p style={{ margin: "0", fontSize: "14.5px", color: "#6B5A61" }}>{s.d}</p>
</li>
</Fragment>))}</ol>
</div>
</section>

{/* CTA + CONTACT */}

<section id="contact" className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 40px 110px" }}>
<div className="rvs" style={{ position: "relative", overflow: "hidden", borderRadius: "36px", background: "linear-gradient(135deg, #FFF1F3 0%, #FFEDE3 60%, #FFF7E6 100%)", border: "1px solid #F8DCD9", padding: "60px", display: "flex", flexWrap: "wrap", gap: "48px", alignItems: "center" }}>
<div aria-hidden="true" className="glow g1" style={{ width: "420px", height: "420px", background: "#FFC9D5", right: "-120px", top: "-160px", opacity: ".8" }}></div>

<div style={{ position: "relative", flex: "1 1 420px", minWidth: "0" }}>
<h2 className="h2" style={{ margin: "0", fontWeight: "600", fontSize: "54px", lineHeight: "1.08", letterSpacing: "-0.04em" }}>{"Let's build better "}
<span className="gt">{"talent journeys."}</span>
</h2>

<p style={{ margin: "20px 0 0", color: "#5E4E55", fontSize: "18px", maxWidth: "460px" }}>{"Tell us a little about you and we'll set up a walkthrough that fits your hiring, placement or prep flow."}</p>

<div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "28px", background: "rgba(255,255,255,0.75)", borderRadius: "18px", padding: "12px 16px", maxWidth: "380px" }}>
<img src={IMG.photoHrDesk} alt="" style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover" }} />
<div>
<div style={{ fontWeight: "600", fontSize: "14.5px" }}>{"Talk to our team"}</div>

<div style={{ fontSize: "13px", color: "#6B5A61" }}>{SUPPORT_EMAIL}</div>
</div>
</div>
</div>

<form onSubmit={onSubmit} style={{ position: "relative", flex: "1 1 500px", minWidth: "0", background: "#FFFFFF", borderRadius: "28px", padding: "32px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 40px 80px -50px rgba(90,20,40,0.5)" }}>
<fieldset style={{ border: "0", margin: "0", padding: "0" }}>
<legend style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>{"I'm enquiring as"}</legend>

<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{(kinds).map((k, __i1) => (<Fragment key={__i1}>
<button type="button" onClick={k.pick} aria-pressed={k.on} style={{ fontFamily: "inherit", fontSize: "14px", fontWeight: "500", padding: "10px 18px", minHeight: "44px", borderRadius: "999px", cursor: "pointer", border: `1px solid ${k.bd}`, background: k.bg, color: k.fg, transition: "all .3s ease" }}>{k.label}</button>
</Fragment>))}</div>
</fieldset>

<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "500" }}>{"Full name"}
<input name="name" autoComplete="name" value={form.name} onChange={set("name")} required type="text" style={{ fontFamily: "inherit", fontSize: "15px", padding: "12px 16px", border: "1px solid #EAD9DE", borderRadius: "14px", minHeight: "50px", background: "#FFFBFA" }} /></label>

<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "500" }}>{"Email"}
<input name="email" autoComplete="email" value={form.email} onChange={set("email")} required type="email" style={{ fontFamily: "inherit", fontSize: "15px", padding: "12px 16px", border: "1px solid #EAD9DE", borderRadius: "14px", minHeight: "50px", background: "#FFFBFA" }} /></label>
</div>

<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "500" }}>{orgLabel}
<input name="organization" autoComplete="organization" value={form.org} onChange={set("org")} type="text" style={{ fontFamily: "inherit", fontSize: "15px", padding: "12px 16px", border: "1px solid #EAD9DE", borderRadius: "14px", minHeight: "50px", background: "#FFFBFA" }} /></label>

<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "500" }}>{"How can we help?"}
<textarea name="message" rows="3" value={form.message} onChange={set("message")} required style={{ fontFamily: "inherit", fontSize: "15px", padding: "12px 16px", border: "1px solid #EAD9DE", borderRadius: "14px", resize: "vertical", background: "#FFFBFA" }}></textarea>
</label>

<button type="submit" disabled={status === "sending"} className="btn gb" style={{ fontFamily: "inherit", fontSize: "16px", fontWeight: "600", color: "#FFFFFF", border: "0", borderRadius: "999px", padding: "15px 28px", minHeight: "54px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>{status === "sending" ? "Sending… " : "Submit enquiry "}
<span className="arr">{"→"}</span>
</button>
{status === "done" && (<p role="status" style={{ margin: "14px 0 0", fontSize: "14.5px", color: "#0B6B52", fontWeight: 600 }}>{"Thank you — your enquiry has been received. Our team will contact you shortly."}</p>)}
{status === "error" && (<p role="alert" style={{ margin: "14px 0 0", fontSize: "14.5px", color: "#A3123A", fontWeight: 600 }}>{error}</p>)}

</form>
</div>
</section>

{/* FOOTER */}

<footer style={{ background: "#FFF7F5", borderTop: "1px solid #F3E8EB", color: "#5E4E55", overflow: "hidden" }}>
<div className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "64px 40px 0", display: "flex", flexWrap: "wrap", gap: "48px", justifyContent: "space-between" }}>
<div style={{ maxWidth: "340px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
<img src={IMG.logo} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
<span style={{ fontWeight: "700", fontSize: "20px", color: "#1F1417" }}>{"WorkmateIQ"}</span>
</div>

<p style={{ margin: "14px 0 0", fontSize: "14.5px" }}>{"A smarter platform for hiring, onboarding and building stronger professional journeys."}</p>
</div>

<div style={{ display: "flex", gap: "64px", flexWrap: "wrap", fontSize: "14.5px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
<span style={{ fontSize: "12px", fontWeight: "600", color: "#A3123A", marginBottom: "8px", letterSpacing: "0.08em" }}>{"SOLUTIONS"}</span>

<Link to="/register" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"For organizations"}</Link>

<Link to="/register" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"For colleges"}</Link>

<Link to="/register" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"For candidates"}</Link>
</div>

<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
<span style={{ fontSize: "12px", fontWeight: "600", color: "#A3123A", marginBottom: "8px", letterSpacing: "0.08em" }}>{"COMPANY"}</span>

<a href="#about" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"About"}</a>

<Link to="/plans" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"Pricing"}</Link>

<a href="#contact" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"Contact"}</a>
</div>

<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
<span style={{ fontSize: "12px", fontWeight: "600", color: "#A3123A", marginBottom: "8px", letterSpacing: "0.08em" }}>{"GET STARTED"}</span>

<Link to="/register" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"Register"}</Link>

<Link to="/login" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"Log in"}</Link>

<a href="#contact" style={{ color: "#5E4E55", textDecoration: "none", padding: "6px 0" }}>{"Enquiry"}</a>
</div>
</div>
</div>

<div className="pad" style={{ maxWidth: "1320px", margin: "0 auto", padding: "40px 40px 0", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "#7A6870" }}>
<span>{"© 2026 WorkmateIQ. All rights reserved."}</span>

<span>{"Intelligence that hires."}</span>
</div>

<div aria-hidden="true" className="rv" style={{ fontWeight: "700", fontSize: "18vw", lineHeight: "0.8", letterSpacing: "-0.06em", textAlign: "center", marginTop: "28px", whiteSpace: "nowrap", transform: "translateY(12%)", background: "linear-gradient(180deg, #F6D9E0, #FFF7F5)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{"WorkmateIQ"}</div>
</footer>
</div>

    )
}
