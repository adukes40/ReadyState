/**
 * Touchscreen Test — Canvas finger trail + zone coverage + multi-touch.
 * Three modes: freeform draw, zone coverage (4x6 grid), multi-touch verification.
 * Canvas touch handlers use passive: false to prevent page scroll.
 */

import { useRef, useEffect, useState } from 'react'

type TouchMode = 'freeform' | 'zones' | 'multitouch'

const ZONE_COLS = 6
const ZONE_ROWS = 4
const TOUCH_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6']

export default function TouchTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<TouchMode>('freeform')
  const [coveredZones, setCoveredZones] = useState<Set<number>>(new Set())
  const [maxSimultaneous, setMaxSimultaneous] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    ctx.fillStyle = '#1A2235'
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)

    if (mode === 'zones') drawZoneGrid(ctx, canvas.clientWidth, canvas.clientHeight, new Set())

    const paths = new Map<number, { x: number; y: number; color: string }>()

    const getPos = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect()
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      setMaxSimultaneous((prev) => Math.max(prev, e.touches.length))
      for (const touch of Array.from(e.changedTouches)) {
        const pos = getPos(touch)
        paths.set(touch.identifier, { ...pos, color: TOUCH_COLORS[touch.identifier % TOUCH_COLORS.length] })
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      for (const touch of Array.from(e.changedTouches)) {
        const prev = paths.get(touch.identifier)
        const pos = getPos(touch)
        if (prev && mode === 'freeform') {
          ctx.beginPath()
          ctx.strokeStyle = prev.color
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.moveTo(prev.x, prev.y)
          ctx.quadraticCurveTo(prev.x, prev.y, pos.x, pos.y)
          ctx.stroke()
        }
        if (mode === 'zones') {
          const zoneCol = Math.floor((pos.x / canvas.clientWidth) * ZONE_COLS)
          const zoneRow = Math.floor((pos.y / canvas.clientHeight) * ZONE_ROWS)
          const zoneIdx = zoneRow * ZONE_COLS + zoneCol
          setCoveredZones((prev) => {
            const next = new Set(prev)
            next.add(zoneIdx)
            drawZoneGrid(ctx, canvas.clientWidth, canvas.clientHeight, next)
            return next
          })
        }
        paths.set(touch.identifier, { ...pos, color: prev?.color ?? TOUCH_COLORS[0] })
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      for (const touch of Array.from(e.changedTouches)) {
        paths.delete(touch.identifier)
      }
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [mode])

  const totalZones = ZONE_COLS * ZONE_ROWS
  const coveragePct = Math.round((coveredZones.size / totalZones) * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['freeform', 'zones', 'multitouch'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setCoveredZones(new Set()); setMaxSimultaneous(0) }}
            className={`text-xs px-3 py-1.5 rounded ${mode === m ? 'bg-accent-primary text-text-on-accent' : 'bg-surface-base text-text-secondary border border-border'}`}
          >
            {m}
          </button>
        ))}
        <span className="ml-auto text-xs font-mono text-text-secondary">
          {mode === 'zones' && `Coverage: ${coveragePct}%`}
          {mode === 'multitouch' && `Max simultaneous: ${maxSimultaneous} / ${navigator.maxTouchPoints}`}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-48 sm:h-64 rounded border border-border cursor-crosshair touch-none"
      />
    </div>
  )
}

function drawZoneGrid(ctx: CanvasRenderingContext2D, w: number, h: number, covered: Set<number>) {
  ctx.fillStyle = '#1A2235'
  ctx.fillRect(0, 0, w, h)

  const cellW = w / ZONE_COLS
  const cellH = h / ZONE_ROWS

  for (let r = 0; r < ZONE_ROWS; r++) {
    for (let c = 0; c < ZONE_COLS; c++) {
      const idx = r * ZONE_COLS + c
      ctx.fillStyle = covered.has(idx) ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.05)'
      ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2)
      ctx.strokeStyle = '#2A2A2E'
      ctx.strokeRect(c * cellW, r * cellH, cellW, cellH)
    }
  }
}
