import React from 'react'
import {
    Activity,
    Camera,
    CircleCheck,
    Clock3,
    Info,
    MessageCircle,
    Mic,
    PhoneOff,
    ShieldCheck,
    Sparkles,
} from 'lucide-react'
import candidateImage from '../../assets/workmate/interview-candidate.png'
import './InterviewPreview.css'

const securityChecks = [
    'No Window Switch',
    'Camera Active',
    'One Person Detected',
    'Mic Active',
]

const scoreCards = [
    ['Answer Quality', '88%', 88],
    ['Communication', '85%', 85],
    ['Speaking Skills', '82%', 82],
]

const controls = [
    ['Microphone', Mic],
    ['Camera', Camera],
    ['AI controls', Sparkles],
    ['Chat', MessageCircle],
    ['End interview', PhoneOff],
]

function InterviewControls() {
    return (
        <div className='interview-preview-controls' aria-label='Interview controls'>
            {controls.map(([label, IconComponent], index) => {
                const ControlIcon = IconComponent
                return (
                    <span key={label} className={`interview-preview-control ${index === controls.length - 1 ? 'is-end' : ''}`} title={label}>
                        <ControlIcon size={14} strokeWidth={2} aria-hidden='true' />
                    </span>
                )
            })}
        </div>
    )
}

function VideoPanel() {
    return (
        <div className='interview-preview-video'>
            <div className='interview-preview-recording'>
                <span className='interview-preview-recording-dot' />
                Recording
            </div>
            <img src={candidateImage} alt='Candidate in a WorkmateIQ AI interview' className='interview-preview-candidate' />
            <InterviewControls />
        </div>
    )
}

function QuestionPanel() {
    return (
        <div className='interview-preview-question'>
            <div className='interview-preview-panel-heading'>
                <span className='interview-preview-activity'><Activity size={13} aria-hidden='true' /></span>
                <div>
                    <p>Interview in Progress</p>
                    <span><i /> Live</span>
                </div>
            </div>
            <div className='interview-preview-divider' />
            <p className='interview-preview-question-label'>Question 3/8</p>
            <p className='interview-preview-question-copy'>Explain a time when you solved a complex problem.</p>
            <div className='interview-preview-timer'>
                <Clock3 size={17} aria-hidden='true' />
                <div>
                    <strong>02:45</strong>
                    <span>Time remaining</span>
                </div>
            </div>
        </div>
    )
}

function SecurityMonitor() {
    return (
        <div className='interview-preview-security'>
            <div className='interview-preview-security-heading'>
                <ShieldCheck size={14} aria-hidden='true' />
                <span>Live Security Monitor</span>
            </div>
            <div className='interview-preview-security-list'>
                {securityChecks.map((check) => (
                    <div key={check} className='interview-preview-security-row'>
                        <CircleCheck size={11} aria-hidden='true' />
                        <span>{check}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ScoreCard({ title, score, progress }) {
    return (
        <div className='interview-preview-score-card'>
            <div className='interview-preview-score-heading'>
                <span>{title}</span>
                <Info size={11} aria-hidden='true' />
            </div>
            <strong>{score}</strong>
            <span className='interview-preview-progress'><i style={{ width: `${progress}%` }} /></span>
        </div>
    )
}

function OverallScoreCard() {
    return (
        <div className='interview-preview-score-card interview-preview-overall'>
            <div className='interview-preview-score-heading'>
                <span>Overall Score</span>
                <Info size={11} aria-hidden='true' />
            </div>
            <strong>87<span>/100</span></strong>
            <svg viewBox='0 0 150 32' role='img' aria-label='Overall score trend rising'>
                <polyline points='2,27 20,28 37,20 53,24 70,14 86,19 104,21 120,11 136,14 148,3' />
                <circle cx='148' cy='3' r='2.5' />
            </svg>
        </div>
    )
}

function InterviewPreview() {
    return (
        <section className='interview-preview' aria-label='AI interview preview'>
            <div className='interview-preview-browser'>
                <div className='interview-preview-browser-bar' aria-hidden='true'>
                    <span /><span /><span />
                </div>
                <div className='interview-preview-main'>
                    <VideoPanel />
                    <aside className='interview-preview-sidebar'>
                        <QuestionPanel />
                        <SecurityMonitor />
                    </aside>
                </div>
                <div className='interview-preview-scores'>
                    {scoreCards.map(([title, score, progress]) => <ScoreCard key={title} title={title} score={score} progress={progress} />)}
                    <OverallScoreCard />
                </div>
            </div>
        </section>
    )
}

export default InterviewPreview
