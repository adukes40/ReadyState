/**
 * Keyboard Test — Visual keyboard map with layout dropdown.
 * Stitch theme: bg-white/5 untested keys, cyan glow on tested keys.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { LAYOUTS, getTestableKeys } from './keyboard-layouts'
import type { KeyDef, NumpadKey } from './keyboard-layouts'

function detectDefaultLayout(): string {
  const ua = navigator.userAgent
  const uad = (navigator as any).userAgentData
  if (uad?.platform === 'Chrome OS' || /CrOS/.test(ua)) return 'chromebook'
  if (uad?.platform === 'macOS' || /Macintosh|Mac OS X/.test(ua)) return 'macbook'
  return 'laptop'
}

export default function KeyboardTest({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [layoutId, setLayoutId] = useState(detectDefaultLayout)
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [testedKeys, setTestedKeys] = useState<Set<string>>(new Set())

  const layout = LAYOUTS.find((l) => l.id === layoutId)!

  useEffect(() => {
    const isTypingInField = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable
    }

    const onDown = (e: KeyboardEvent) => {
      if (isTypingInField(e)) return
      e.preventDefault()
      setPressedKeys((prev) => new Set(prev).add(e.code))
      setTestedKeys((prev) => new Set(prev).add(e.code))
    }
    const onUp = (e: KeyboardEvent) => {
      if (isTypingInField(e)) return
      e.preventDefault()
      setPressedKeys((prev) => {
        const next = new Set(prev)
        next.delete(e.code)
        return next
      })
    }

    window.addEventListener('keydown', onDown, { capture: true })
    window.addEventListener('keyup', onUp, { capture: true })
    return () => {
      window.removeEventListener('keydown', onDown, { capture: true })
      window.removeEventListener('keyup', onUp, { capture: true })
    }
  }, [])

  const allCodes = useMemo(() => getTestableKeys(layout), [layout])
  const totalKeys = allCodes.length
  const testedCount = allCodes.filter((c) => testedKeys.has(c)).length
  const pct = totalKeys > 0 ? Math.round((testedCount / totalKeys) * 100) : 0

  // Build code-to-label map once per layout
  const codeToLabel = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of layout.rows) {
      for (const k of row.keys) {
        if (!k.code.startsWith('_') && !k.special) {
          map.set(k.code, k.label ?? k.code.replace('Key', '').replace('Digit', ''))
        }
      }
    }
    for (const nk of layout.numpad ?? []) {
      map.set(nk.code, nk.label)
    }
    return map
  }, [layout])

  // Report result only when testedCount actually changes
  const prevTestedCount = useRef(0)
  useEffect(() => {
    if (testedCount > 0 && testedCount !== prevTestedCount.current) {
      prevTestedCount.current = testedCount
      const untestedCodes = allCodes.filter((c) => !testedKeys.has(c))
      const untestedNames = untestedCodes.map(c => codeToLabel.get(c) ?? c).join(', ')
      const detail = untestedCodes.length > 0
        ? `${testedCount}/${totalKeys} keys tested (${pct}%). Keys Not Tested/Working: ${untestedNames}`
        : `${testedCount}/${totalKeys} keys tested (${pct}%)`
      onResult?.('Keyboard', 'pass', detail)
    }
  }, [testedCount, totalKeys, pct, onResult, allCodes, testedKeys, codeToLabel])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={layoutId}
          onChange={(e) => { setLayoutId(e.target.value); setTestedKeys(new Set()); setPressedKeys(new Set()) }}
          className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/5 text-gray-200 border border-white/10 outline-none focus:border-[#40E0D0]/50 transition-colors cursor-pointer"
        >
          {LAYOUTS.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-300 font-mono">
            {testedCount}<span className="text-gray-500">/{totalKeys}</span>
            <span className="text-gray-500 ml-1.5 text-xs">{pct}%</span>
          </span>
          <button
            onClick={() => { setPressedKeys(new Set()); setTestedKeys(new Set()) }}
            className="text-xs px-2.5 py-1 bg-white/5 text-gray-400 rounded-lg hover:text-white border border-white/10 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* OS key warning for Chromebook layout */}
      {layoutId === 'chromebook' && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-status-warn/10 border border-status-warn/20 text-xs text-status-warn font-mono">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Top-row keys (Back, Refresh, Fullscreen, etc.) are handled by ChromeOS and will trigger their actions. Skip those keys - they are marked OS below.</span>
        </div>
      )}

      {/* Keyboard — auto-scales to fit container */}
      <AutoScaleKeyboard layoutId={layoutId}>
        <div className="flex gap-3 justify-center" style={{ direction: 'ltr' }}>
          <div className="space-y-1.5">
            {layout.rows.map((rowDef, ri) => (
              <div key={ri} className="flex gap-1.5 items-end min-w-max">
                {rowDef.keys.map((def, ki) => (
                  <KeyElement key={`${def.code}-${ki}`} def={def} pressedKeys={pressedKeys} testedKeys={testedKeys} />
                ))}
              </div>
            ))}
          </div>

          {layout.numpad && (
            <NumpadGrid keys={layout.numpad} pressedKeys={pressedKeys} testedKeys={testedKeys} />
          )}
        </div>
      </AutoScaleKeyboard>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: '#40E0D0',
            boxShadow: pct > 0 ? '0 0 8px rgba(64,224,208,0.6)' : 'none',
          }}
        />
      </div>
    </div>
  )
}

function AutoScaleKeyboard({ layoutId, children }: { layoutId: string; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  const recalc = useCallback(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    // Reset to measure natural size
    inner.style.transform = 'none'
    inner.style.height = ''
    inner.style.width = 'max-content'

    // Use getBoundingClientRect for accurate measurement
    const naturalW = inner.getBoundingClientRect().width
    const naturalH = inner.getBoundingClientRect().height
    // Available width = outer content area (subtract padding)
    const outerStyle = getComputedStyle(outer)
    const padL = parseFloat(outerStyle.paddingLeft)
    const padR = parseFloat(outerStyle.paddingRight)
    const availableW = outer.clientWidth - padL - padR

    const s = naturalW > availableW ? availableW / naturalW : 1

    inner.style.width = ''
    if (s < 1) {
      inner.style.transform = `scale(${s})`
      inner.style.height = `${naturalH * s}px`
      inner.style.width = `${naturalW}px`
      // Center via margin
      const gap = availableW - naturalW * s
      inner.style.marginLeft = `${gap / 2}px`
    } else {
      inner.style.transform = ''
      inner.style.height = ''
      inner.style.width = ''
      inner.style.marginLeft = ''
    }
  }, [])

  useEffect(() => {
    // Small delay to ensure layout is settled after mount/layout change
    requestAnimationFrame(recalc)
    const ro = new ResizeObserver(recalc)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [recalc, layoutId])

  return (
    <div ref={outerRef} className="bg-black/50 rounded-2xl p-3 md:p-5 border border-white/5 shadow-inner overflow-hidden">
      <div
        ref={innerRef}
        style={{ transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  )
}

function keyClasses(pressed: boolean, tested: boolean): string {
  if (pressed) return 'bg-[#40E0D0]/20 text-[#40E0D0] border border-[#40E0D0]/50 shadow-[0_0_15px_rgba(64,224,208,0.4)] scale-105'
  if (tested) return 'bg-[#40E0D0]/15 text-[#40E0D0] border border-[#40E0D0]/30'
  return 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'
}

function KeyElement({ def, pressedKeys, testedKeys }: { def: KeyDef; pressedKeys: Set<string>; testedKeys: Set<string> }) {
  if (def.code === '_gap') return <div className={def.w ?? 'w-3'} />

  if (def.special === 'arrow-cluster') return <ArrowCluster pressedKeys={pressedKeys} testedKeys={testedKeys} />

  if (def.osReserved) {
    return (
      <div
        className={`
          flex flex-col items-center justify-center text-[9px] font-bold font-mono rounded-lg h-9 select-none
          ${def.grow ? 'flex-1 min-w-9' : (def.w ?? 'w-9')}
          bg-white/3 text-gray-700 border border-white/5
        `}
        title="OS-controlled key - cannot be captured by browser"
      >
        <span>{def.label ?? def.code}</span>
        <span className="text-[7px] text-gray-700 leading-none">OS</span>
      </div>
    )
  }

  if (def.special === 'trackpoint') {
    return (
      <div className={`${def.w ?? 'w-4'} h-9 flex items-center justify-center`}>
        <div className="w-3.5 h-3.5 rounded-full bg-[#E22B2B] shadow-[0_0_6px_rgba(226,43,43,0.4)] border border-[#C41E1E]" />
      </div>
    )
  }

  if (def.special?.startsWith('trackpoint-btn')) {
    return (
      <div className={`${def.w} h-3.5 rounded-sm bg-white/5 hover:bg-white/10 ${
        def.special === 'trackpoint-btn-middle' ? 'border-x border-white/10' : ''
      } transition-colors`} />
    )
  }

  return (
    <div
      className={`
        flex items-center justify-center text-[11px] font-bold font-mono rounded-lg h-9 select-none
        transition-all duration-300
        ${def.grow ? 'flex-1 min-w-9' : (def.w ?? 'w-9')}
        ${keyClasses(pressedKeys.has(def.code), testedKeys.has(def.code))}
      `}
    >
      {def.label ?? def.code.replace('Key', '').replace('Digit', '')}
    </div>
  )
}

function NumpadGrid({ keys, pressedKeys, testedKeys }: { keys: NumpadKey[]; pressedKeys: Set<string>; testedKeys: Set<string> }) {
  return (
    <div className="grid gap-1.5 self-start" style={{ gridTemplateColumns: 'repeat(4, 2.25rem)', gridAutoRows: '2.25rem' }}>
      {keys.map((nk) => (
        <div
          key={nk.code}
          className={`
            flex items-center justify-center text-[11px] font-bold font-mono rounded-lg select-none
            transition-all duration-300
            ${keyClasses(pressedKeys.has(nk.code), testedKeys.has(nk.code))}
          `}
          style={{
            gridColumn: nk.colSpan ? `span ${nk.colSpan}` : undefined,
            gridRow: nk.rowSpan ? `span ${nk.rowSpan}` : undefined,
          }}
        >
          {nk.label}
        </div>
      ))}
    </div>
  )
}

function ArrowCluster({ pressedKeys, testedKeys }: { pressedKeys: Set<string>; testedKeys: Set<string> }) {
  const arrowKey = (code: string, label: string) => (
    <div className={`flex items-center justify-center text-[11px] font-bold font-mono rounded-lg select-none transition-all duration-300 w-full h-full ${keyClasses(pressedKeys.has(code), testedKeys.has(code))}`}>
      {label}
    </div>
  )

  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-1.5" style={{ width: '6.25rem', height: '2.5rem' }}>
      <div />
      {arrowKey('ArrowUp', '↑')}
      <div />
      {arrowKey('ArrowLeft', '←')}
      {arrowKey('ArrowDown', '↓')}
      {arrowKey('ArrowRight', '→')}
    </div>
  )
}
