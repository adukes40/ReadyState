/**
 * Tab Swarm Panel — spawns virtual "browser tabs" at varying intensity levels
 * (Web Workers + memory) to stress test system multitasking.
 * Stitch visual: dark cards, cyan accents, clean stat readout.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type TabType = 'search' | 'docs' | 'interactive' | 'video'

const TAB_TYPES: Record<TabType, { label: string; icon: string; memory: number; color: string; desc: string }> = {
  search:      { label: 'Search',      icon: '🔍', memory: 8,  color: '#10B981', desc: 'Google results' },
  docs:        { label: 'Docs',        icon: '📄', memory: 24, color: '#3B82F6', desc: 'Google Docs / Wikipedia' },
  interactive: { label: 'Interactive', icon: '🎓', memory: 48, color: '#F59E0B', desc: 'Waggle / Canvas LMS' },
  video:       { label: 'Video',       icon: '▶',  memory: 64, color: '#EF4444', desc: 'YouTube / streaming' },
}

interface Preset {
  label: string
  tabs: TabType[]
}

const PRESETS: Preset[] = [
  {
    label: 'Classroom Mix',
    tabs: ['interactive', 'interactive', 'docs', 'docs', 'docs', 'video', 'search', 'search', 'search', 'search'],
  },
  {
    label: 'Testing Day',
    tabs: ['interactive', 'interactive', 'interactive', 'interactive', 'interactive', 'docs', 'search'],
  },
  {
    label: 'Research Mode',
    tabs: ['docs', 'docs', 'docs', 'docs', 'docs', 'docs', 'search', 'search', 'search', 'search', 'search', 'search', 'video'],
  },
  {
    label: 'Video Heavy',
    tabs: ['video', 'video', 'video', 'video', 'docs', 'search', 'search'],
  },
  {
    label: 'Max Stress',
    tabs: ['interactive', 'interactive', 'interactive', 'interactive', 'video', 'video', 'video', 'video', 'docs', 'docs', 'docs', 'docs', 'docs', 'docs', 'search', 'search', 'search', 'search', 'search', 'search'],
  },
]

interface TabInfo {
  id: number
  tabType: TabType
  worker: Worker
  ops: number
}

interface PerfSnapshot {
  time: number
  tabs: number
  latency: number
  fps: number
  heapMB: number
}

interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

function getHeapMB(): number {
  const mem = (performance as any).memory as PerformanceMemory | undefined
  if (mem?.usedJSHeapSize) return Math.round(mem.usedJSHeapSize / (1024 * 1024))
  return 0
}

const TAB_INTERVAL_MS = 1200

export default function TabSwarmPanel({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [snapshots, setSnapshots] = useState<PerfSnapshot[]>([])
  const [currentLatency, setCurrentLatency] = useState(0)
  const [currentFps, setCurrentFps] = useState(0)
  const [peakLatency, setPeakLatency] = useState(0)
  const [presetIdx, setPresetIdx] = useState(0)

  const tabsRef = useRef<TabInfo[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<number>(0)
  const runningRef = useRef(false)
  const nextIdRef = useRef(0)
  const startTimeRef = useRef(0)

  const fpsFrames = useRef(0)
  const fpsLastTime = useRef(0)
  const latestFps = useRef(60)
  const latestLatency = useRef(0)

  const preset = PRESETS[presetIdx]

  // FPS + latency measurement loop
  const measureLoop = useCallback(() => {
    if (!runningRef.current) return

    const now = performance.now()
    fpsFrames.current++

    if (now - fpsLastTime.current >= 500) {
      const elapsed = (now - fpsLastTime.current) / 1000
      latestFps.current = Math.round(fpsFrames.current / elapsed)
      fpsFrames.current = 0
      fpsLastTime.current = now
    }

    const t0 = performance.now()
    rafRef.current = requestAnimationFrame(() => {
      latestLatency.current = Math.round(performance.now() - t0)
      setCurrentLatency(latestLatency.current)
      setCurrentFps(latestFps.current)
      setPeakLatency((prev) => Math.max(prev, latestLatency.current))
      measureLoop()
    })
  }, [])

  const spawnTab = useCallback((tabType: TabType) => {
    const id = nextIdRef.current++
    const worker = new Worker(
      new URL('./tab-swarm.worker.ts', import.meta.url),
      { type: 'module' }
    )

    const tab: TabInfo = { id, tabType, worker, ops: 0 }

    worker.onmessage = (e) => {
      if (e.data.type === 'tick') {
        const updated = tabsRef.current.map((t) =>
          t.id === id ? { ...t, ops: e.data.ops } : t
        )
        tabsRef.current = updated
        setTabs([...updated])
      }
    }

    const cfg = TAB_TYPES[tabType]
    worker.postMessage({ type: 'start', memoryMB: cfg.memory, tabType })

    tabsRef.current = [...tabsRef.current, tab]
    setTabs([...tabsRef.current])
  }, [])

  const start = useCallback(() => {
    setStatus('running')
    setSnapshots([])
    setPeakLatency(0)
    setCurrentLatency(0)
    setCurrentFps(60)
    nextIdRef.current = 0
    tabsRef.current = []
    setTabs([])
    runningRef.current = true
    startTimeRef.current = performance.now()

    fpsFrames.current = 0
    fpsLastTime.current = performance.now()
    latestFps.current = 60
    latestLatency.current = 0

    measureLoop()

    const queue = [...preset.tabs]
    let idx = 0

    intervalRef.current = setInterval(() => {
      if (!runningRef.current || idx >= queue.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setTimeout(() => { if (runningRef.current) stop() }, 5000)
        return
      }
      spawnTab(queue[idx])
      idx++
    }, TAB_INTERVAL_MS)
  }, [preset, spawnTab, measureLoop])

  const stop = useCallback(() => {
    runningRef.current = false
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    tabsRef.current.forEach((tab) => {
      tab.worker.postMessage({ type: 'stop' })
      setTimeout(() => tab.worker.terminate(), 200)
    })
    setStatus('done')
  }, [])

  // Record snapshots every second
  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(() => {
      const elapsed = Math.round((performance.now() - startTimeRef.current) / 1000)
      setSnapshots((prev) => [...prev, {
        time: elapsed,
        tabs: tabsRef.current.length,
        latency: latestLatency.current,
        fps: latestFps.current,
        heapMB: getHeapMB(),
      }])
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runningRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      tabsRef.current.forEach((t) => t.worker.terminate())
    }
  }, [])

  // Report result when done
  useEffect(() => {
    if (status === 'done') {
      if (peakLatency > 150) {
        onResult?.('Tab Swarm', 'warn', `Struggled under load (${peakLatency}ms peak latency)`)
      } else if (peakLatency > 50) {
        onResult?.('Tab Swarm', 'pass', `Moderate degradation (${peakLatency}ms peak latency)`)
      } else {
        onResult?.('Tab Swarm', 'pass', `Handled with ease (${peakLatency}ms peak latency)`)
      }
    }
  }, [status, peakLatency, onResult])

  const tabCount = tabs.length
  const memoryUsed = tabs.reduce((sum, t) => sum + TAB_TYPES[t.tabType].memory, 0)
  const hasMemory = snapshots.some((s) => s.heapMB > 0)

  const typeCounts = tabs.reduce<Record<TabType, number>>((acc, t) => {
    acc[t.tabType] = (acc[t.tabType] || 0) + 1
    return acc
  }, { search: 0, docs: 0, interactive: 0, video: 0 })

  const latencyColor =
    currentLatency < 50 ? 'text-status-good' :
    currentLatency < 150 ? 'text-status-warn' :
    'text-status-bad'

  const fpsColor =
    currentFps >= 50 ? 'text-status-good' :
    currentFps >= 30 ? 'text-status-warn' :
    'text-status-bad'

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={presetIdx}
          onChange={(e) => setPresetIdx(Number(e.target.value))}
          disabled={status === 'running'}
          className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/5 text-gray-200 border border-white/10 outline-none focus:border-[#40E0D0]/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>{p.label} ({p.tabs.length} tabs)</option>
          ))}
        </select>

        {status === 'running' ? (
          <button
            onClick={stop}
            className="px-4 py-2 text-[10px] font-mono bg-status-bad/20 text-status-bad rounded-xl hover:bg-status-bad/30 transition-colors font-bold uppercase tracking-wider border border-status-bad/30"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            className="px-4 py-2 text-[10px] font-mono bg-[#40E0D0]/20 text-[#40E0D0] rounded-xl hover:bg-[#40E0D0]/30 transition-colors font-bold uppercase tracking-wider border border-[#40E0D0]/30 shadow-[0_0_10px_rgba(64,224,208,0.2)]"
          >
            Swarm
          </button>
        )}
      </div>

      {/* Preset breakdown (idle) */}
      {status === 'idle' && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TAB_TYPES) as TabType[]).map((type) => {
            const count = preset.tabs.filter((t) => t === type).length
            if (count === 0) return null
            const cfg = TAB_TYPES[type]
            return (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono rounded-lg border border-white/10 bg-white/5 text-gray-400"
              >
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                {count}× {cfg.label}
                <span className="text-gray-600">({cfg.memory}MB)</span>
              </span>
            )
          })}
          <span className="text-[10px] font-mono text-gray-600 self-center ml-1">
            ~{preset.tabs.reduce((s, t) => s + TAB_TYPES[t].memory, 0)} MB total
          </span>
        </div>
      )}

      {/* Live stats */}
      {(status === 'running' || status === 'done') && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatBox label="Tabs Open" value={String(tabCount)} />
          <StatBox label="Memory" value={`${memoryUsed} MB`} />
          <StatBox label="Frame Rate" value={`${currentFps} fps`} className={fpsColor} />
          <StatBox label="Latency" value={`${currentLatency}ms`} className={latencyColor} />
          <StatBox
            label="Peak Latency"
            value={`${peakLatency}ms`}
            className={peakLatency > 150 ? 'text-status-bad' : peakLatency > 50 ? 'text-status-warn' : 'text-status-good'}
          />
        </div>
      )}

      {/* Tab grid visualization */}
      {(status === 'running' || status === 'done') && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => {
              const cfg = TAB_TYPES[tab.tabType]
              const active = tab.ops > 0
              return (
                <div
                  key={tab.id}
                  className="w-8 h-8 rounded-lg flex flex-col items-center justify-center text-[8px] font-mono transition-all duration-300 leading-none gap-0.5"
                  style={{
                    backgroundColor: active ? `${cfg.color}22` : 'rgba(255,255,255,0.05)',
                    color: active ? cfg.color : 'var(--color-text-muted)',
                    border: '1px solid',
                    borderColor: active ? `${cfg.color}55` : 'rgba(255,255,255,0.1)',
                    boxShadow: active ? `0 0 8px ${cfg.color}20` : 'none',
                  }}
                  title={`${cfg.label}: ${cfg.desc} (${tab.ops} ops/s, ${cfg.memory}MB)`}
                >
                  <span className="text-[10px]">{cfg.icon}</span>
                </div>
              )
            })}
            {status === 'running' && Array.from({ length: Math.max(0, preset.tabs.length - tabCount) }, (_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] animate-pulse" />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {(Object.keys(TAB_TYPES) as TabType[]).map((type) => {
              const count = typeCounts[type]
              if (count === 0) return null
              const cfg = TAB_TYPES[type]
              return (
                <span key={type} className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: cfg.color }} />
                  {cfg.icon} {count} {cfg.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Real-time charts */}
      {snapshots.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartBox label="Thread Latency (ms)" data={snapshots} dataKey="latency" color="#40E0D0" unit="ms" />
          <ChartBox label="Frame Rate (fps)" data={snapshots} dataKey="fps" color="var(--color-status-good)" unit=" fps" />
          {hasMemory && (
            <div className="md:col-span-2">
              <ChartBox label="JS Heap Memory (MB)" data={snapshots} dataKey="heapMB" color="#40E0D0" unit=" MB" />
            </div>
          )}
        </div>
      )}

      {/* Result summary */}
      {status === 'done' && (
        <div className="text-xs font-mono text-gray-400 space-y-1 border-t border-white/5 pt-3">
          <p>
            Ran <span className="text-gray-200 font-medium">{tabCount}</span> virtual tabs
            using <span className="text-gray-200 font-medium">{memoryUsed} MB</span>
            {typeCounts.interactive > 0 && <>, <span style={{ color: TAB_TYPES.interactive.color }}>{typeCounts.interactive} interactive</span></>}
            {typeCounts.video > 0 && <>, <span style={{ color: TAB_TYPES.video.color }}>{typeCounts.video} video</span></>}
            {typeCounts.docs > 0 && <>, <span style={{ color: TAB_TYPES.docs.color }}>{typeCounts.docs} docs</span></>}
            {typeCounts.search > 0 && <>, <span style={{ color: TAB_TYPES.search.color }}>{typeCounts.search} search</span></>}
          </p>
          <p>
            Peak latency:{' '}
            <span className={peakLatency > 150 ? 'text-status-bad' : peakLatency > 50 ? 'text-status-warn' : 'text-status-good'}>
              {peakLatency}ms
            </span>
            {peakLatency > 150 && '. Device struggled under load.'}
            {peakLatency > 50 && peakLatency <= 150 && '. Moderate degradation.'}
            {peakLatency <= 50 && '. Handled the swarm with ease.'}
          </p>
        </div>
      )}
    </div>
  )
}

function ChartBox({ label, data, dataKey, color, unit }: { label: string; data: PerfSnapshot[]; dataKey: keyof PerfSnapshot; color: string; unit: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="h-32 bg-black/50 rounded-xl border border-white/5 p-2 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#5F6578', fontFamily: 'var(--font-mono)' }}
              tickFormatter={(v) => `${v}s`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#5F6578', fontFamily: 'var(--font-mono)' }}
              width={36}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#E8EAED' }}
              labelFormatter={(v) => `${v}s (${data.find(s => s.time === v)?.tabs ?? '?'} tabs)`}
              formatter={(v) => [`${v}${unit}`, label.split(' (')[0]]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StatBox({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-black/50 rounded-xl px-3 py-2 border border-white/5 shadow-inner">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">{label}</div>
      <div className={`text-sm font-mono font-medium mt-0.5 ${className ?? 'text-gray-200'}`}>{value}</div>
    </div>
  )
}
