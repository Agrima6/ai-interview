import React, { useEffect, useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import { getViolationImageUrl } from '../../api/organization/organizationApi'

/**
 * An image behind the HR login (proctoring screenshots). Fetched with the bearer token and shown from an object URL,
 * with explicit loading and "not available" states instead of a broken-image icon. `data:` URLs pass straight through.
 * Clicking it calls `onOpen(url)` so the caller can show it larger.
 */
function AuthImage({ src, alt, label, className = '', onOpen }) {
  const [state, setState] = useState({ status: 'loading', url: '' })

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    if (!src) { setState({ status: 'missing', url: '' }); return undefined }
    if (src.startsWith('data:')) { setState({ status: 'ready', url: src }); return undefined }
    setState({ status: 'loading', url: '' })
    getViolationImageUrl(src)
      .then((url) => { objectUrl = url; if (!cancelled) setState({ status: 'ready', url }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', url: '' }) })
    return () => { cancelled = true; if (objectUrl) window.URL.revokeObjectURL(objectUrl) }
  }, [src])

  const box = `rounded-lg border border-line bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center ${className}`
  if (state.status === 'loading') return <div className={box} role="status" aria-label={`Loading ${alt}`}><Loader2 size={16} className="animate-spin text-text-secondary" /></div>
  if (state.status !== 'ready') {
    return (
      <div className={`${box} flex-col gap-0.5 text-[10.5px] text-text-secondary text-center px-1`} title={state.status === 'error' ? 'This image could not be loaded' : 'Not captured'}>
        <ImageOff size={14} />{state.status === 'error' ? 'Unavailable' : 'Not captured'}
      </div>
    )
  }
  return (
    <button type="button" onClick={() => onOpen?.(state.url, label || alt)} className={`group relative ${className} rounded-lg overflow-hidden border border-line focus:outline-none focus-visible:ring-2 ring-accent`} aria-label={`View ${alt} larger`}>
      <img src={state.url} alt={alt} className="w-full h-full object-cover" />
      {label && <span className="absolute left-0 bottom-0 right-0 text-[10px] font-semibold text-white bg-black/55 px-1.5 py-0.5 text-left">{label}</span>}
    </button>
  )
}

export default AuthImage
