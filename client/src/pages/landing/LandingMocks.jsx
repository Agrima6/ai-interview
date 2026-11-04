// Product-tour screens that the design export did not include as images. They are drawn in code with the same
// tokens as the rest of the page so the "See WorkmateIQ in action" tabs are complete.
const frame = {
    background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', width: '100%',
    boxShadow: '0 40px 80px -40px rgba(90,20,40,.45), 0 0 0 1px rgba(163,18,58,.08)',
}
const bar = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#F6F2F3', borderBottom: '1px solid #EEE4E7' }
const dot = (c) => ({ width: 10, height: 10, borderRadius: '50%', background: c })
const url = { marginLeft: 10, background: '#FFFFFF', border: '1px solid #EEE4E7', borderRadius: 6, fontSize: 11, color: '#7A6870', padding: '3px 10px', flex: '0 1 300px' }

function Chrome({ path }) {
    return (
        <div style={bar} aria-hidden="true">
            <span style={dot('#FF5F57')} /><span style={dot('#FEBC2E')} /><span style={dot('#28C840')} />
            <span style={url}>{path}</span>
        </div>
    )
}

const SKILLS = [['Communication', 85], ['Correctness', 90], ['Problem solving', 84], ['Role fit', 88]]

export function ReportMock() {
    return (
        <div style={frame} role="img" aria-label="Candidate report: overall score 87 out of 100 with skill scores and an AI summary">
            <Chrome path="app.workmateiq.com/reports/ananya-sharma" />
            <div className="report-mock-grid" style={{ padding: 28, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 28, alignItems: 'start' }}>
                <div>
                    <div style={{ fontSize: 12, color: '#7A6870' }}>Candidate report</div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>Ananya Sharma</div>
                    <div style={{ fontSize: 13, color: '#7A6870' }}>Software Engineer · Round 2</div>
                    <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'conic-gradient(#A3123A 0 87%, #F2E6E9 0)', display: 'grid', placeItems: 'center' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                                <div><b style={{ fontSize: 28, color: '#A3123A', letterSpacing: '-0.03em' }}>87</b><div style={{ fontSize: 10, color: '#7A6870', marginTop: -4 }}>/100</div></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#E3F6EE', color: '#0B6B52' }}>Strong match</span>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#FFF4D6', color: '#7A5200' }}>Top 5%</span>
                        </div>
                    </div>
                    <div style={{ marginTop: 22, fontSize: 12.5, lineHeight: 1.6, color: '#5E4E55', background: '#FBF7F8', borderRadius: 12, padding: 14 }}>
                        <b style={{ color: '#1F1417' }}>AI summary</b><br />
                        Clear, structured answers with strong debugging instincts. Profiled the build before changing it — a good sign of method.
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Skill scores</div>
                    {SKILLS.map(([name, v]) => (
                        <div key={name} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{name}</span><b>{v}%</b></div>
                            <div style={{ height: 7, borderRadius: 99, background: '#F2E6E9', marginTop: 5 }}>
                                <div style={{ width: `${v}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#A3123A,#E94B6A)' }} />
                            </div>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                        {['React', 'System design', 'SQL', 'Testing'].map((s) => (
                            <span key={s} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: '#E3F6EE', color: '#0B6B52' }}>✓ {s}</span>
                        ))}
                        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: '#FDE7EC', color: '#A3123A' }}>Missing: Kubernetes</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

const ROWS = [['Ananya Sharma', 'Software Engineer', 91, 96], ['Rohan Verma', 'Software Engineer', 87, 90], ['Sneha Iyer', 'Software Engineer', 85, 88], ['Kabir Mehta', 'Software Engineer', 79, 82]]

export function RankingMock() {
    return (
        <div style={frame} role="img" aria-label="Candidate ranking table with scores and role-fit benchmarks">
            <Chrome path="app.workmateiq.com/drives/software-engineer/rank" />
            <div style={{ padding: 22 }}>
                <div className="ranking-mock-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div><div style={{ fontSize: 12, color: '#7A6870' }}>Software Engineer · Campus drive</div><div style={{ fontSize: 17, fontWeight: 600 }}>Ranked candidates</div></div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', background: '#A3123A', borderRadius: 999, padding: '8px 14px' }}>Shortlist top 3</span>
                </div>
                <div className="ranking-mock-grid ranking-mock-header" style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1.6fr) minmax(0,1fr) 70px', gap: 10, fontSize: 11, color: '#7A6870', padding: '0 8px 8px', letterSpacing: '.04em' }}>
                    <span>#</span><span>CANDIDATE</span><span>ROLE FIT</span><span style={{ textAlign: 'right' }}>SCORE</span>
                </div>
                {ROWS.map(([name, role, score, fit], i) => (
                    <div key={name} className="ranking-mock-grid ranking-mock-row" style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1.6fr) minmax(0,1fr) 70px', gap: 10, alignItems: 'center', padding: '11px 8px', borderTop: '1px solid #F3E8EB', fontSize: 13.5, background: i < 3 ? '#FFFBFC' : '#fff' }}>
                        <b style={{ color: i === 0 ? '#A3123A' : '#7A6870' }}>{i + 1}</b>
                        <span><b style={{ fontWeight: 600 }}>{name}</b><br /><span style={{ fontSize: 12, color: '#7A6870' }}>{role}</span></span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ flex: 1, height: 6, borderRadius: 99, background: '#F2E6E9' }}><span style={{ display: 'block', width: `${fit}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#A3123A,#E94B6A)' }} /></span>
                            <span style={{ fontSize: 12, color: '#5E4E55', width: 32 }}>{fit}%</span>
                        </span>
                        <b style={{ textAlign: 'right' }}>{score}</b>
                    </div>
                ))}
            </div>
        </div>
    )
}
