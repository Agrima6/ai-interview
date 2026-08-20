import React from 'react'
import { Sparkles, ShieldCheck, Layers } from 'lucide-react'

function AuthBrandPanel({ mode }) {
    const isLogin = mode === 'login'

    const features = [
        {
            icon: Sparkles,
            title: 'Smart Recruitment',
            description: 'Streamline hiring with AI-powered tools.'
        },
        {
            icon: ShieldCheck,
            title: 'Secure & Reliable',
            description: 'Your data is protected with enterprise-grade security.'
        },
        {
            icon: Layers,
            title: 'Everything in One Place',
            description: 'Manage jobs, candidates and interviews from one platform.'
        }
    ]

    // Use login.png for login, and img1.png for registration/forgot password
    const illustrationSrc = isLogin ? '/login.png' : '/img1.png'

    return (
        <div className="w-full lg:w-[48%] bg-gradient-to-br from-[#fff7f7] to-[#fffcfc] p-8 md:p-12 lg:p-16 flex flex-col justify-center items-center border-r border-gray-100 gap-10">
            <div className="space-y-8 max-w-[460px] w-full text-center flex flex-col items-center">
                {/* Title & Description */}
                <div className="space-y-3">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-tight">
                        {isLogin ? 'Welcome back!' : 'Join WorkmateIQ'}
                    </h1>
                    <p className="text-[15.5px] text-gray-600 leading-relaxed max-w-sm mx-auto">
                        {isLogin
                            ? 'Enter your credentials to access your recruitment desk.'
                            : 'Get started with the ultimate AI-driven recruitment and evaluation platform.'}
                    </p>
                </div>

                {/* Feature Highlights */}
                <div className="space-y-5 pt-2 text-left w-full max-w-[380px] mx-auto">
                    {features.map((feature, index) => {
                        const IconComponent = feature.icon
                        return (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100/50">
                                    <IconComponent size={18} className="text-accent" />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-semibold text-[14px] text-gray-900">{feature.title}</h3>
                                    <p className="text-[12.5px] text-gray-500 leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Illustration Image */}
            <div className="flex justify-center w-full max-w-[460px]">
                <img
                    src={illustrationSrc}
                    alt="WorkmateIQ Illustration"
                    className="w-full max-w-[420px] h-auto object-contain rounded-2xl shadow-[0_16px_36px_-12px_rgba(196,22,31,0.18)] border border-white bg-white/50 p-2.5 transition-transform duration-500 hover:scale-[1.02]"
                />
            </div>
        </div>
    )
}

export default AuthBrandPanel
