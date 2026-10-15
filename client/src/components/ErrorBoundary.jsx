import React from 'react'

// Last line of defence for a rendering failure: shows a recoverable screen instead of a blank white page.
// `resetKey` (the current route) clears the error when the user navigates elsewhere.
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { failed: false, key: props.resetKey }
    }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    static getDerivedStateFromProps(props, state) {
        if (props.resetKey !== state.key) return { failed: false, key: props.resetKey }
        return null
    }

    componentDidCatch(error) {
        // Technical detail goes to the console only; the screen stays plain-language.
        console.error('Render error:', error?.message)
    }

    render() {
        if (!this.state.failed) return this.props.children
        return (
            <div role='alert' className='min-h-screen flex items-center justify-center bg-bg px-6'>
                <div className='max-w-sm text-center'>
                    <h1 className='font-display text-[22px] font-bold text-ink'>Something went wrong</h1>
                    <p className='text-[14px] text-text-secondary mt-2'>This page could not be displayed. You can reload it or go back to the sign-in screen.</p>
                    <div className='mt-5 flex items-center justify-center gap-3'>
                        <button type='button' onClick={() => window.location.reload()} className='min-h-[44px] px-5 rounded-lg bg-accent text-white text-[14px] font-semibold'>Reload</button>
                        <a href='/login' className='min-h-[44px] px-5 inline-flex items-center rounded-lg border border-line text-[14px] font-semibold text-ink'>Sign in</a>
                    </div>
                </div>
            </div>
        )
    }
}

export default ErrorBoundary
