/**
 * InfoTip — click-triggered popover for test explanations.
 * Designed for touch (Chromebook) — no hover triggers.
 * Uses a portal so the popover is never clipped by parent overflow.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface InfoTipProps {
  text: string
}

export default function InfoTip({ text }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 6, left: rect.left })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()

    function handleClick(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    function handleScroll() {
      updatePosition()
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [open, updatePosition])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 md:w-4 md:h-4 flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors rounded-full"
        aria-label="More info"
      >
        <span className="text-[16px] leading-none select-none">ⓘ</span>
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] w-[calc(100vw-3rem)] max-w-72 bg-[#141414] border border-white/10 rounded-xl shadow-lg p-3 text-xs text-gray-400 leading-relaxed"
          style={{ top: pos.top, left: pos.left, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
        >
          {text.split('\n').map((line, i, arr) => {
            const colonIdx = line.indexOf(':')
            const hasLabel = colonIdx > 0 && colonIdx < 30
            return (
              <span key={i}>
                {hasLabel ? (
                  <><span className="text-gray-200 font-semibold">{line.slice(0, colonIdx)}</span>{line.slice(colonIdx)}</>
                ) : line}
                {i < arr.length - 1 && <br />}
              </span>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
