/**
 * InfoTip — click-triggered popover for test explanations.
 * Designed for touch (Chromebook) — no hover triggers.
 */

import { useState, useRef, useEffect } from 'react'

interface InfoTipProps {
  text: string
}

export default function InfoTip({ text }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 md:w-4 md:h-4 flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors rounded-full"
        aria-label="More info"
      >
        <span className="text-[16px] leading-none select-none">ⓘ</span>
      </button>
      {open && (
        <div className="absolute top-8 md:top-6 left-0 z-50 w-[calc(100vw-3rem)] max-w-72 bg-[#141414] border border-white/10 rounded-xl shadow-lg p-3 text-xs text-gray-400 leading-relaxed pointer-events-auto"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
