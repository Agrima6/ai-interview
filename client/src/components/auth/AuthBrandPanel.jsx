import React from 'react'
import { Sparkles, ShieldCheck, Layers } from 'lucide-react'

const FEATURES = [
    { icon: Sparkles, title: 'Smart recruitment', description: 'Streamline hiring with AI-powered tools.' },
    { icon: ShieldCheck, title: 'Secure & reliable', description: 'Your data is protected with enterprise-grade security.' },
    { icon: Layers, title: 'Everything in one place', description: 'Manage jobs, candidates and interviews from one platform.' },
]

function AuthBrandPanel({ mode }) {
    const isLogin = mode === 'login'
    // login.png for sign-in, img1.png for registration
    const illustrationSrc = isLogin ? '/login.png' : '/img1.png'

    return (
        <div className="w-full lg:w-[48%] lg:h-full lg:overflow-hidden bg-gradient-to-br from-[#FFF5F2] to-white p-8 md:p-12 lg:px-16 lg:py-8 flex flex-col justify-center border-r border-[#F3E8EB]">
            <div className="max-w-[520px] w-full mx-auto space-y-6 lg:space-y-5">
                <div className="space-y-4">
                    {!isLogin && (
                        <span className="inline-flex px-3.5 py-1.5 rounded-full bg-white border border-[#F3DDE3] text-[13px] font-medium text-accent">
                            Free to get started
                        </span>
                    )}
                    <h1 className="font-display text-[36px] md:text-[44px] font-medium tracking-tight text-ink leading-[1.1]">
                        {isLogin ? 'Welcome back' : 'Join WorkmateIQ'}
                    </h1>
                    <p className="text-[16px] font-normal text-text-secondary leading-relaxed max-w-md">
                        {isLogin
                            ? 'Enter your credentials to access your recruitment desk.'
                            : "Get started with the AI-driven recruitment and evaluation platform built for India's hiring teams and campuses."}
                    </p>
                </div>

                <ul className="space-y-4">
                    {FEATURES.map((feature) => {
                        const Icon = feature.icon
                        const { title, description } = feature
                        return (
                        <li key={title} className="flex gap-4 items-start">
                            <span className="w-[42px] h-[42px] rounded-xl bg-white border border-[#F3DDE3] flex items-center justify-center shrink-0 text-accent">
                                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-[15px] font-medium text-ink">{title}</span>
                                <span className="block text-[14px] font-normal text-text-secondary leading-relaxed">{description}</span>
                            </span>
                        </li>
                        )
                    })}
                </ul>

                <img
                    src={illustrationSrc}
                    alt=""
                    className="w-full max-w-[460px] max-h-[22vh] h-auto object-contain rounded-[26px] border border-white bg-white/60 p-2.5 shadow-[0_40px_70px_-44px_rgba(90,20,40,0.5)]"
                />
            </div>
        </div>
    )
}

export default AuthBrandPanel
