import React from 'react'
import { Globe, Mail, MessageCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import logo from '../assets/logo.png'

const COLUMNS = [
    {
        title: "Product",
        links: ["Features", "Interview Modes", "Pricing", "History"],
    },
    {
        title: "Resources",
        links: ["Interview Guides", "Resume Tips", "Blog", "Help Center"],
    },
    {
        title: "Company",
        links: ["About", "Careers", "Contact"],
    },
    {
        title: "Legal",
        links: ["Privacy Policy", "Terms of Service", "Refund Policy"],
    },
]

function Footer() {
    const navigate = useNavigate()
    return (
        <footer className='bg-card border-t border-line text-ink'>
            <div className='max-w-[1280px] mx-auto px-6 pt-20 pb-10'>

                <div className='grid grid-cols-1 lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-12 pb-16 border-b border-line'>

                    <div>
                        <div className='flex items-center gap-2.5 mb-5'>
                            <img src={logo} alt="WorkMate IQ" className='w-11 h-11 rounded-full' />
                            <span className='font-semibold text-[17px] tracking-tight'>WorkMate IQ</span>
                        </div>
                        <p className='text-text-secondary text-[14px] leading-relaxed max-w-[280px] mb-6'>
                            AI-powered interview preparation platform built to improve communication, technical depth, and confidence.
                        </p>
                        <div className='flex items-center gap-3'>
                            {[Globe, Mail, MessageCircle].map((Icon, i) => (
                                <a key={i} href="#" onClick={(e) => e.preventDefault()}
                                    className='w-9 h-9 rounded-full border border-line flex items-center justify-center text-text-secondary hover:text-ink hover:border-accent/40 transition-colors'>
                                    <Icon size={15} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {COLUMNS.map((col) => (
                        <div key={col.title}>
                            <h4 className='text-[13px] font-semibold text-text-secondary uppercase tracking-wider mb-5'>{col.title}</h4>
                            <ul className='space-y-3.5'>
                                {col.links.map((link) => (
                                    <li key={link}>
                                        <a href="#" onClick={(e) => e.preventDefault()} className='text-[14px] text-text-secondary hover:text-ink transition-colors'>
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className='grid md:grid-cols-2 gap-6 py-10 border-b border-line'>
                    <div>
                        <h4 className='text-[17px] font-semibold mb-1.5'>Stay ahead of your next interview</h4>
                        <p className='text-text-secondary text-[14px]'>Product updates and interview prep tips, once in a while.</p>
                    </div>
                    <form onSubmit={(e) => e.preventDefault()} className='flex items-center gap-2 w-full md:justify-end'>
                        <input type="email" placeholder="you@email.com" required
                            className='bg-bg border border-line rounded-full px-5 py-3 text-[14px] text-ink placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors w-full md:w-64' />
                        <Button variant="primary" size="md" className="!px-5 !py-3 shrink-0" type="submit">
                            <ArrowRight size={16} />
                        </Button>
                    </form>
                </div>

                <div className='pt-8 flex flex-col sm:flex-row justify-between items-center gap-4'>
                    <p className='text-text-secondary/70 text-[13px]'>© {new Date().getFullYear()} WorkMate IQ. All rights reserved.</p>
                    <button onClick={() => navigate('/interview')} className='text-[13px] text-text-secondary hover:text-ink transition-colors'>
                        Start your first interview →
                    </button>
                </div>
            </div>
        </footer>
    )
}

export default Footer
