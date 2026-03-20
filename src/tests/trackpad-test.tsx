/**
 * Trackpad Test — Tests click, right-click, scroll, and gesture detection.
 * Stitch visual: dark inset card, cyan trail/accents.
 * Layout: vertical action checklist on the left, square-ish canvas on the right.
 */

import { useRef, useEffect, useState, useCallback } from 'react'

interface TrackpadEvent {
  type: string
  time: number
}

const ALL_ACTIONS_MAP: Record<string, string> = {
  'move': 'Move',
  'left-click': 'Left Click',
  'right-click': 'Right Click',
  'middle-click': 'Middle Click',
  'double-click': 'Double Click',
  'scroll-vertical': 'V-Scroll',
  'scroll-horizontal': 'H-Scroll',
}
const ALL_ACTIONS = Object.keys(ALL_ACTIONS_MAP)

export default function TrackpadTest({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailRef = useRef<{ x: number; y: number }[]>([])
  const [events, setEvents] = useState<TrackpadEvent[]>([])
  const [scrollDelta, setScrollDelta] = useState({ x: 0, y: 0 })
  const [buttons, setButtons] = useState({ left: false, right: false, middle: false })
  const [testedActions, setTestedActions] = useState<Set<string>>(new Set())

  const logAction = useCallback((type: string) => {
    setTestedActions((prev) => new Set(prev).add(type))
    setEvents((prev) => [...prev.slice(-19), { type, time: Date.now() }])
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    ctx.scale(dpr, dpr)

    const w = canvas.clientWidth
    const h = canvas.clientHeight

    drawBackground(ctx, w, h)

    const getPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onMove = (e: MouseEvent) => {
      const pos = getPos(e)
      const trail = trailRef.current
      trail.push(pos)
      if (trail.length > 200) trail.shift()

      drawBackground(ctx, w, h)

      if (trail.length > 1) {
        ctx.beginPath()
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let i = 0; i < trail.length; i++) {
          const alpha = i / trail.length
          ctx.strokeStyle = `rgba(64, 224, 208, ${alpha * 0.7})`
          if (i === 0) ctx.moveTo(trail[i].x, trail[i].y)
          else ctx.lineTo(trail[i].x, trail[i].y)
        }
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#40E0D0'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(64, 224, 208, 0.3)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      logAction('move')
    }

    const onDown = (e: MouseEvent) => {
      e.preventDefault()
      const pos = getPos(e)
      let label = 'left-click'
      if (e.button === 1) label = 'middle-click'
      if (e.button === 2) label = 'right-click'

      setButtons((prev) => ({
        ...prev,
        left: e.button === 0 ? true : prev.left,
        middle: e.button === 1 ? true : prev.middle,
        right: e.button === 2 ? true : prev.right,
      }))
      logAction(label)
      drawRipple(ctx, pos.x, pos.y, e.button)
    }

    const onUp = (e: MouseEvent) => {
      setButtons((prev) => ({
        ...prev,
        left: e.button === 0 ? false : prev.left,
        middle: e.button === 1 ? false : prev.middle,
        right: e.button === 2 ? false : prev.right,
      }))
    }

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault()
      logAction('double-click')
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setScrollDelta((prev) => ({
        x: prev.x + e.deltaX,
        y: prev.y + e.deltaY,
      }))
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        logAction('scroll-horizontal')
      } else {
        logAction('scroll-vertical')
      }
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('dblclick', onDblClick)
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('dblclick', onDblClick)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [logAction])

  const testedCount = ALL_ACTIONS.filter((a) => testedActions.has(a)).length

  useEffect(() => {
    if (testedCount > 0) {
      onResult?.('Trackpad', 'pass', `${testedCount}/${ALL_ACTIONS.length} actions tested`)
    }
  }, [testedCount, onResult])

  const reset = () => {
    setTestedActions(new Set())
    setEvents([])
    setScrollDelta({ x: 0, y: 0 })
    trailRef.current = []
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')!
      drawBackground(ctx, canvas.clientWidth, canvas.clientHeight)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">
          Actions tested: <span className="font-mono text-gray-200">{testedCount}</span>
          <span className="text-gray-500">/{ALL_ACTIONS.length}</span>
        </span>
        <button
          onClick={reset}
          className="text-xs px-2 py-1 bg-white/5 text-gray-400 rounded-lg border border-white/10 hover:text-white transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Trackpad area: action list left, compact canvas centered right */}
      <div className="flex gap-3 items-center justify-center">
        {/* Vertical action checklist */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {ALL_ACTIONS.map((action) => (
            <span
              key={action}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-mono rounded-lg border transition-all duration-300 whitespace-nowrap ${
                testedActions.has(action)
                  ? 'border-[#40E0D0]/30 bg-[#40E0D0]/15 text-[#40E0D0] shadow-[0_0_8px_rgba(64,224,208,0.2)]'
                  : 'border-white/10 bg-white/5 text-gray-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                testedActions.has(action) ? 'bg-[#40E0D0] shadow-[0_0_4px_rgba(64,224,208,0.8)]' : 'bg-gray-600'
              }`} />
              {ALL_ACTIONS_MAP[action]}
            </span>
          ))}
        </div>

        {/* Compact centered canvas */}
        <div className="bg-black/50 rounded-2xl border border-white/5 shadow-inner overflow-hidden" style={{ width: '320px' }}>
          <canvas
            ref={canvasRef}
            className="w-full cursor-none block"
            style={{ aspectRatio: '4 / 3' }}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      {/* Live indicators */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <ButtonIndicator label="L" active={buttons.left} />
          <ButtonIndicator label="M" active={buttons.middle} />
          <ButtonIndicator label="R" active={buttons.right} />
        </div>
        <div className="text-gray-500">
          Scroll: <span className="text-gray-300">{Math.round(scrollDelta.x)}</span>
          <span className="text-gray-500 mx-1">×</span>
          <span className="text-gray-300">{Math.round(scrollDelta.y)}</span>
        </div>
        <div className="ml-auto text-gray-500">
          {events.length > 0 && events[events.length - 1].type}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(testedCount / ALL_ACTIONS.length) * 100}%`,
            backgroundColor: '#40E0D0',
            boxShadow: testedCount > 0 ? '0 0 8px rgba(64,224,208,0.6)' : 'none',
          }}
        />
      </div>
    </div>
  )
}

function ButtonIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-mono transition-all ${
        active
          ? 'bg-[#40E0D0]/20 text-[#40E0D0] border border-[#40E0D0]/30 shadow-[0_0_12px_rgba(64,224,208,0.4)]'
          : 'bg-white/5 text-gray-500 border border-white/10'
      }`}
    >
      {label}
    </span>
  )
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 30, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.font = '11px "Geist Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Move cursor here to test trackpad', w / 2, h / 2 + 50)
}

function drawRipple(ctx: CanvasRenderingContext2D, x: number, y: number, button: number) {
  const colors = ['rgba(64, 224, 208, 0.4)', 'rgba(16, 185, 129, 0.4)', 'rgba(239, 68, 68, 0.4)']
  const color = colors[button] ?? colors[0]
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}
