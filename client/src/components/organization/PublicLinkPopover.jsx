import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Link2, Copy, ExternalLink, Check } from 'lucide-react'

/**
 * Public candidate-link control for a drive card. Opens a small, absolutely
 * positioned popover instead of inserting the URL inline - integration.md
 * section 11: a drive card must never grow/shift the grid when this is
 * clicked. z-[300] matches the popover tier of the shared z-index scale
 * (dropdown 100 / sticky header 200 / popover 300 / drawer 400 / modal 500).
 */
function PublicLinkPopover({ publicLink }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [coords, setCoords] = useState(null)
  const anchorRef = useRef(null)

  const url = publicLink ? `${window.location.origin}/apply/${publicLink}` : ''

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open) {
      const rect = e.currentTarget.getBoundingClientRect()
      setCoords({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 320) })
    }
    setOpen((v) => !v)
  }

  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleOpen = (e) => {
    e.stopPropagation()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!publicLink) {
    return <span className="text-[12px] text-text-secondary font-medium">Public link disabled</span>
  }

  return (
    <span ref={anchorRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 text-accent hover:underline font-semibold text-[12.5px]"
      >
        <Link2 size={13} /> Public Link
      </button>

      {open && coords && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 'var(--z-popover)' }}
            className="w-[300px] bg-card border border-line rounded-xl shadow-[var(--shadow-lift)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[12px] font-semibold text-ink mb-1.5">Public Candidate Link</p>
            <p className="text-[12px] font-mono text-text-secondary break-all bg-black/[0.03] dark:bg-white/[0.05] rounded-lg px-2.5 py-2 mb-3">
              {url}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-line hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
              >
                {copied ? <Check size={13} className="text-[var(--color-success)]" /> : <Copy size={13} />} {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleOpen}
                className="flex-1 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors"
              >
                <ExternalLink size={13} /> Open
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </span>
  )
}

export default PublicLinkPopover
