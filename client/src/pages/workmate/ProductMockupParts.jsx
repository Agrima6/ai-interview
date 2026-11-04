import React from 'react'

export function ConnectorLayer() {
    return (
        <svg
            className='mockup-background-layer absolute inset-0 z-0 h-full w-full overflow-visible pointer-events-none'
            viewBox='0 0 620 560'
            fill='none'
            aria-hidden='true'
        >
            <path className='mockup-connector-path' d='M112 151C153 154 156 183 190 204' stroke='#3451f5' strokeOpacity='0.32' strokeWidth='1.2' strokeLinecap='round' />
            <path className='mockup-connector-path' d='M506 166C476 169 474 192 443 211' stroke='#3451f5' strokeOpacity='0.32' strokeWidth='1.2' strokeLinecap='round' />
            <path className='mockup-connector-path' d='M473 59C454 77 426 95 393 117' stroke='#2238c9' strokeOpacity='0.26' strokeWidth='1.1' strokeLinecap='round' />
            <path className='mockup-connector-path' d='M91 489C126 465 156 417 194 360' stroke='#2238c9' strokeOpacity='0.22' strokeWidth='1.1' strokeLinecap='round' />
            <path className='mockup-connector-path' d='M532 488C505 456 475 412 431 359' stroke='#2238c9' strokeOpacity='0.22' strokeWidth='1.1' strokeLinecap='round' />
            <circle className='mockup-connector-node' cx='190' cy='204' r='3' fill='#3451f5' fillOpacity='0.42' />
            <circle className='mockup-connector-node' cx='443' cy='211' r='3' fill='#3451f5' fillOpacity='0.42' />
            <circle className='mockup-connector-node' cx='393' cy='117' r='2.5' fill='#2238c9' fillOpacity='0.34' />
            <circle className='mockup-connector-node' cx='194' cy='360' r='2.5' fill='#2238c9' fillOpacity='0.34' />
            <circle className='mockup-connector-node' cx='431' cy='359' r='2.5' fill='#2238c9' fillOpacity='0.34' />
        </svg>
    )
}

export function LaptopMockup() {
    return (
        <div className='mockup-device relative mx-auto w-full max-w-[500px]'>
            <div className='mockup-screen overflow-hidden rounded-[22px] border border-[#d7daea] bg-white shadow-[0_28px_70px_-34px_rgba(20, 30, 90,0.46)]'>
                <div className='flex h-9 items-center gap-1.5 border-b border-[#e4e6f1] bg-[#fafbff] px-4'>
                    <span className='h-2 w-2 rounded-full bg-[#b7bee8]' />
                    <span className='h-2 w-2 rounded-full bg-[#d7dbf1]' />
                    <span className='h-2 w-2 rounded-full bg-[#e7e9f5]' />
                    <div className='ml-4 h-4 flex-1 rounded-full bg-[#eef0f8]' />
                </div>

                <div className='mockup-dashboard p-4 sm:p-5'>
                    <div className='mb-5 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-[#3451f5] text-[9px] font-bold text-white'>WQ</div>
                            <div>
                                <p className='font-display text-[11px] font-bold text-[#171924]'>WorkMate IQ</p>
                                <p className='text-[8px] text-[#7b7e92]'>Talent workspace</p>
                            </div>
                        </div>
                        <span className='rounded-full bg-[#f0f2fd] px-2.5 py-1 text-[8px] font-semibold text-[#152ba7]'>Live review</span>
                    </div>

                    <div className='mb-4 flex items-end justify-between'>
                        <div>
                            <p className='text-[9px] font-medium text-[#7b7e92]'>Mock Interview</p>
                            <p className='font-display text-[17px] font-bold tracking-tight text-[#171924]'>Candidate review</p>
                        </div>
                        <div className='text-right'>
                            <p className='text-[8px] text-[#7b7e92]'>Progress</p>
                            <p className='text-[15px] font-bold text-[#3451f5]'>72%</p>
                        </div>
                    </div>

                    <div className='mb-4 grid grid-cols-[0.9fr_1.1fr] gap-3'>
                        <div className='rounded-xl border border-[#e2e4f0] bg-[#fafbff] p-3'>
                            <div className='mb-3 flex items-center gap-2'>
                                <div className='h-6 w-6 rounded-full bg-[#d8dcf3]' />
                                <div>
                                    <div className='h-1.5 w-16 rounded-full bg-[#d6d9e8]' />
                                    <div className='mt-1.5 h-1 w-10 rounded-full bg-[#e5e7f1]' />
                                </div>
                            </div>
                            <p className='text-[8px] font-semibold text-[#5b5e6d]'>Interview signals</p>
                            <div className='mt-2 space-y-1.5'>
                                <div className='flex items-center justify-between text-[7px] text-[#7b7e92]'><span>Confidence</span><span className='font-semibold text-[#3451f5]'>High</span></div>
                                <div className='h-1 rounded-full bg-[#e5e7f3]'><div className='h-1 w-[78%] rounded-full bg-[#7987d9]' /></div>
                                <div className='flex items-center justify-between text-[7px] text-[#7b7e92]'><span>Clarity</span><span className='font-semibold text-[#3451f5]'>Strong</span></div>
                                <div className='h-1 rounded-full bg-[#e5e7f3]'><div className='h-1 w-[86%] rounded-full bg-[#3451f5]' /></div>
                            </div>
                        </div>
                        <div className='rounded-xl border border-[#e2e4f0] bg-white p-3'>
                            <div className='mb-1 flex items-center justify-between'>
                                <p className='text-[8px] font-semibold text-[#5b5e6d]'>Journey analytics</p>
                                <span className='text-[7px] text-[#7b7e92]'>This week</span>
                            </div>
                            <svg viewBox='0 0 190 72' className='h-[72px] w-full' aria-hidden='true'>
                                <path d='M4 58C24 55 27 42 47 45S69 51 84 35S105 42 123 26S150 28 186 10' fill='none' stroke='#3451f5' strokeWidth='2.5' strokeLinecap='round' />
                                <path d='M4 64H186' stroke='#e3e5f2' strokeWidth='1' />
                                <circle cx='123' cy='26' r='3.5' fill='#fff' stroke='#3451f5' strokeWidth='2' />
                            </svg>
                        </div>
                    </div>

                    <div className='flex items-center justify-between rounded-xl bg-[#f3f4fa] px-3 py-2.5'>
                        <div className='flex items-center gap-2'>
                            <span className='h-1.5 w-1.5 rounded-full bg-[#36a269]' />
                            <span className='text-[8px] font-medium text-[#5b5e6d]'>Analysis ready</span>
                        </div>
                        <span className='text-[8px] font-semibold text-[#3451f5]'>View report →</span>
                    </div>
                </div>
            </div>
            <div className='mx-auto mt-2 h-3 w-[88%] rounded-b-[12px] border border-t-0 border-[#c9ccdf] bg-[#e1e3f0] shadow-[0_12px_20px_-15px_rgba(20, 30, 90,0.42)]' />
            <div className='mx-auto h-1.5 w-[42%] rounded-full bg-[#bcc0d9]' />
        </div>
    )
}

export function ScoreCard() {
    return (
        <div className='mockup-card-surface rounded-2xl border border-[#d7daea] bg-white/95 p-3.5 shadow-[0_18px_38px_-24px_rgba(20, 30, 90,0.50)] backdrop-blur-sm'>
            <div className='mb-2 flex items-center justify-between gap-6'>
                <div>
                    <p className='text-[9px] font-semibold text-[#5b5e6d]'>AI Feedback</p>
                    <p className='mt-0.5 text-[8px] text-[#8d90a2]'>Overall score</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#7987d9] border-r-[#e2e4f0] text-[17px] font-bold text-[#3451f5]'>85</div>
            </div>
            <div className='grid grid-cols-2 gap-x-3 gap-y-1.5 text-[8px] text-[#7b7e92]'>
                <span>Confidence</span><span className='text-right font-semibold text-[#5b5e6d]'>88</span>
                <span>Communication</span><span className='text-right font-semibold text-[#5b5e6d]'>84</span>
                <span>Content</span><span className='text-right font-semibold text-[#5b5e6d]'>86</span>
            </div>
        </div>
    )
}

export function ProgressCard() {
    const steps = ['Practice', 'Answer', 'Analyze', 'Improve']
    return (
        <div className='mockup-card-surface rounded-2xl border border-[#d7daea] bg-white/95 p-3.5 shadow-[0_18px_38px_-24px_rgba(20, 30, 90,0.50)] backdrop-blur-sm'>
            <p className='mb-3 text-[9px] font-semibold text-[#5b5e6d]'>Interview Progress</p>
            <div className='flex items-start'>
                {steps.map((step, index) => (
                    <React.Fragment key={step}>
                        <div className='flex min-w-0 flex-1 flex-col items-center gap-1'>
                            <span className={`h-2.5 w-2.5 rounded-full border-2 ${index < 3 ? 'border-[#3451f5] bg-[#3451f5]' : 'border-[#bcc0d9] bg-white'}`} />
                            <span className='text-center text-[7px] text-[#7b7e92]'>{step}</span>
                        </div>
                        {index < steps.length - 1 && <span className={`mt-1 h-px flex-1 ${index < 2 ? 'bg-[#7987d9]' : 'bg-[#d7daea]'}`} />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}

export function EcosystemCard({ label, copy, tone = 'light' }) {
    return (
        <div className='mockup-card-surface rounded-xl border border-[#d7daea] bg-white/95 px-3.5 py-3 shadow-[0_15px_32px_-24px_rgba(20, 30, 90,0.48)] backdrop-blur-sm'>
            <div className='flex items-start gap-2.5'>
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${tone === 'strong' ? 'bg-[#3451f5]' : 'bg-[#7987d9]'}`} />
                <div>
                    <p className='text-[9px] font-semibold text-[#5b5e6d]'>{label}</p>
                    <p className='mt-1 text-[8px] text-[#7b7e92]'>{copy}</p>
                </div>
            </div>
        </div>
    )
}
