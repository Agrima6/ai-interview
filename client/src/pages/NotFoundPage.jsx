import React from 'react'
import { Link } from 'react-router-dom'

// Shown for any URL the app has no route for, instead of a blank white page.
function NotFoundPage() {
    return (
        <div className='min-h-screen bg-[#FBF6F4] flex items-center justify-center px-6'>
            <div className='max-w-sm text-center'>
                <p className='text-[13px] font-medium text-accent'>404</p>
                <h1 className='font-display text-[28px] font-medium tracking-tight text-ink mt-1'>Page not found</h1>
                <p className='text-[15px] text-text-secondary mt-2'>The page you are looking for does not exist or has moved.</p>
                <div className='mt-6 flex items-center justify-center gap-3'>
                    <Link to='/' className='min-h-[44px] px-5 inline-flex items-center rounded-[14px] bg-accent text-white text-[14.5px] font-medium'>Go to home</Link>
                    <Link to='/login' className='min-h-[44px] px-5 inline-flex items-center rounded-[14px] border border-line text-[14.5px] font-medium text-ink'>Sign in</Link>
                </div>
            </div>
        </div>
    )
}

export default NotFoundPage
