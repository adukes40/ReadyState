/**
 * Display Test Screen — Fullscreen solid-color canvas for dead pixel detection.
 * Uses the Fullscreen API to cover the entire physical screen.
 * Click/tap or press any key to cycle through colors.
 * Press Escape to exit.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { runDisplayTest } from './display-test'

interface DisplayTestScreenProps {
  onComplete: () => void
  onExit: () => void
}

export default function DisplayTestScreen({ onComplete, onExit }: DisplayTestScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const testRef = useRef<ReturnType<typeof runDisplayTest> | null>(null)
  const [colorIndex, setColorIndex] = useState(0)
  const [totalColors, setTotalColors] = useState(0)
  const [currentColor, setCurrentColor] = useState('#FF0000')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const exitTest = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    onExit()
  }, [onExit])

  const completeTest = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const test = runDisplayTest(canvas, (color, index, total) => {
      setCurrentColor(color)
      setColorIndex(index)
      setTotalColors(total)
    })
    testRef.current = test
    setTotalColors(8)

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = test.getCurrentColor()
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Request fullscreen on mount
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.requestFullscreen().then(() => {
      setIsFullscreen(true)
    }).catch(() => {
      // Fullscreen denied — still works as a fixed overlay
    })

    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (!document.fullscreenElement) {
        // Resize canvas when exiting fullscreen
        const canvas = canvasRef.current
        if (canvas && testRef.current) {
          canvas.width = window.innerWidth
          canvas.height = window.innerHeight
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = testRef.current.getCurrentColor()
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
      }
    }

    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const advance = useCallback(() => {
    if (!testRef.current) return
    const hasMore = testRef.current.next()
    if (!hasMore) completeTest()
  }, [completeTest])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitTest()
        return
      }
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, exitTest])

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const el = containerRef.current
    if (!el) return

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }, [])

  const isDark = currentColor === '#000000' || currentColor === '#0000FF'
  const controlColor = isDark ? 'text-white/80' : 'text-black/80'
  const controlBg = isDark ? 'bg-white/15' : 'bg-black/30'

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 cursor-pointer"
      onClick={advance}
      onTouchEnd={(e) => { e.preventDefault(); advance() }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Bottom controls */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-sm ${controlBg} ${controlColor}`}>
        <span className="text-sm font-mono">
          {colorIndex + 1} / {totalColors}
        </span>
        <span className="text-xs">
          Click or press any key &middot; Esc to exit
        </span>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className={`ml-1 p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/20' : 'hover:bg-black/20'}`}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 01-2 2H3" />
              <path d="M21 8h-3a2 2 0 01-2-2V3" />
              <path d="M3 16h3a2 2 0 012 2v3" />
              <path d="M16 21v-3a2 2 0 012-2h3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 00-2 2v3" />
              <path d="M21 8V5a2 2 0 00-2-2h-3" />
              <path d="M3 16v3a2 2 0 002 2h3" />
              <path d="M16 21h3a2 2 0 002-2v-3" />
            </svg>
          )}
        </button>
      </div>

      {/* Exit button — top right */}
      <button
        onClick={(e) => { e.stopPropagation(); exitTest() }}
        className={`absolute top-4 right-4 p-2 rounded-lg backdrop-blur-sm transition-colors ${controlBg} ${controlColor} ${isDark ? 'hover:bg-white/20' : 'hover:bg-black/30'}`}
        title="Exit display test"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
