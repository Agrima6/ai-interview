import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Traps Tab/Shift+Tab inside `containerRef` while `active` is true, moves
 * focus into the container on open, and restores it to whatever was
 * focused beforehand on close - integration.md section 46 ("focus trapped
 * inside modal"). Shared by Modal and Drawer rather than each
 * implementing its own version.
 */
export function useFocusTrap(containerRef, active) {
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!active) return
    previouslyFocused.current = document.activeElement

    // Wait a tick so the portal content has actually mounted before we
    // look for something inside it to focus.
    const id = requestAnimationFrame(() => {
      const first = containerRef.current?.querySelector(FOCUSABLE_SELECTOR)
      first ? first.focus() : containerRef.current?.focus()
    })

    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || !containerRef.current) return
      const focusable = Array.from(containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [active, containerRef])
}
