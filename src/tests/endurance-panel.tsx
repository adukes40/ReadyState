/**
 * Endurance Test Panel -- configurable long-running stress test.
 * Opens a popup window that runs DOM, canvas, video, worker, and memory
 * workloads while the control panel monitors main-thread responsiveness.
 * Stitch visual: dark cards, cyan accents, monospace stats.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ArenaConfig {
  dom: number
  canvas: number
  video: number
  workers: number
  memory: number
  durationSec: number
}

interface PerfSnapshot {
  time: number
  latency: number
  fps: number
  heapMB: number
}

interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

const PRESETS: { label: string; config: Omit<ArenaConfig, 'durationSec'> }[] = [
  { label: 'Light',    config: { dom: 1, canvas: 1, video: 0, workers: 1, memory: 0 } },
  { label: 'Moderate', config: { dom: 3, canvas: 3, video: 1, workers: 2, memory: 1 } },
  { label: 'Heavy',    config: { dom: 5, canvas: 5, video: 2, workers: 4, memory: 3 } },
  { label: 'Torture',  config: { dom: 10, canvas: 10, video: 4, workers: navigator.hardwareConcurrency || 4, memory: 6 } },
]

const DURATIONS = [
  { label: '1 min', sec: 60 },
  { label: '2 min', sec: 120 },
  { label: '3 min', sec: 180 },
  { label: '5 min', sec: 300 },
  { label: '10 min', sec: 600 },
]

const maxCores = navigator.hardwareConcurrency || 4

function getHeapMB(): number {
  const mem = (performance as unknown as { memory?: PerformanceMemory }).memory
  if (mem?.usedJSHeapSize) return Math.round(mem.usedJSHeapSize / (1024 * 1024))
  return 0
}

export default function EndurancePanel({ onResult }: {
  onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void
}) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [config, setConfig] = useState<ArenaConfig>({
    dom: 3, canvas: 3, video: 1, workers: 2, memory: 1, durationSec: 120,
  })
  const [snapshots, setSnapshots] = useState<PerfSnapshot[]>([])
  const [currentLatency, setCurrentLatency] = useState(0)
  const [currentFps, setCurrentFps] = useState(0)
  const [peakLatency, setPeakLatency] = useState(0)
  const [arenaHeapMB, setArenaHeapMB] = useState(0)
  const [, setArenaDomNodes] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [popupBlocked, setPopupBlocked] = useState(false)

  const arenaRef = useRef<Window | null>(null)
  const runningRef = useRef(false)
  const rafRef = useRef(0)
  const startTimeRef = useRef(0)
  const fpsFrames = useRef(0)
  const fpsLastTime = useRef(0)
  const latestFps = useRef(60)
  const latestLatency = useRef(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const applyPreset = useCallback((idx: number) => {
    const p = PRESETS[idx]
    setConfig(prev => ({ ...prev, ...p.config }))
  }, [])

  // FPS + latency measurement on the MAIN thread
  const measureLoop = useCallback(() => {
    if (!runningRef.current) return
    const now = performance.now()
    fpsFrames.current++
    if (now - fpsLastTime.current >= 500) {
      const secs = (now - fpsLastTime.current) / 1000
      latestFps.current = Math.round(fpsFrames.current / secs)
      fpsFrames.current = 0
      fpsLastTime.current = now
    }
    const t0 = performance.now()
    rafRef.current = requestAnimationFrame(() => {
      latestLatency.current = Math.round(performance.now() - t0)
      setCurrentLatency(latestLatency.current)
      setCurrentFps(latestFps.current)
      setPeakLatency(prev => Math.max(prev, latestLatency.current))
      measureLoop()
    })
  }, [])

  // Listen for metrics from arena popup
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'endurance-metrics') {
        setArenaHeapMB(e.data.heapMB ?? 0)
        setArenaDomNodes(e.data.domNodes ?? 0)
        setElapsed(e.data.elapsed ?? 0)
      }
      if (e.data?.type === 'endurance-complete') {
        stop()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Record snapshots every second while running
  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(() => {
      const sec = Math.round((performance.now() - startTimeRef.current) / 1000)
      setSnapshots(prev => [...prev, {
        time: sec,
        latency: latestLatency.current,
        fps: latestFps.current,
        heapMB: getHeapMB(),
      }])
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  const start = useCallback(() => {
    setPopupBlocked(false)

    // Open arena popup -- MUST be in click handler
    const arena = window.open(
      '/endurance-arena.html',
      'endurance-arena',
      'width=800,height=600',
    )

    if (!arena) {
      setPopupBlocked(true)
      return
    }

    arenaRef.current = arena
    setStatus('running')
    setSnapshots([])
    setPeakLatency(0)
    setCurrentLatency(0)
    setCurrentFps(60)
    setArenaHeapMB(0)
    setArenaDomNodes(0)
    setElapsed(0)
    runningRef.current = true
    startTimeRef.current = performance.now()
    fpsFrames.current = 0
    fpsLastTime.current = performance.now()
    latestFps.current = 60
    latestLatency.current = 0

    measureLoop()

    // Wait for arena to load, then send config
    const sendConfig = () => {
      try {
        arena.postMessage({ type: 'endurance-config', config }, '*')
      } catch {
        // Window not ready yet
      }
    }

    // Retry sending config until the arena picks it up
    let sent = false
    const configInterval = setInterval(() => {
      if (sent || !runningRef.current) {
        clearInterval(configInterval)
        return
      }
      try {
        if (arena.document?.readyState === 'complete') {
          sendConfig()
          sent = true
          clearInterval(configInterval)
        }
      } catch {
        // Cross-origin or not ready
        sendConfig()
      }
    }, 200)

    // Also send after a short delay as fallback
    setTimeout(sendConfig, 1000)
    setTimeout(sendConfig, 2000)

    // Poll for arena window closing
    pollRef.current = setInterval(() => {
      if (arena.closed) {
        stop()
      }
    }, 1000)
  }, [config, measureLoop])

  const stop = useCallback(() => {
    runningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    // Tell arena to stop
    try {
      arenaRef.current?.postMessage({ type: 'endurance-stop' }, '*')
    } catch {
      // Arena already closed
    }

    setStatus('done')
  }, [])

  // Report result when done
  useEffect(() => {
    if (status === 'done') {
      const avgFps = snapshots.length > 0
        ? Math.round(snapshots.reduce((s, r) => s + r.fps, 0) / snapshots.length)
        : 0

      if (peakLatency > 150) {
        onResult?.('Endurance', 'warn', `Device struggled: ${peakLatency}ms peak latency, ${avgFps} avg fps over ${elapsed}s`)
      } else if (peakLatency > 50) {
        onResult?.('Endurance', 'pass', `Moderate strain: ${peakLatency}ms peak latency, ${avgFps} avg fps over ${elapsed}s`)
      } else {
        onResult?.('Endurance', 'pass', `Handled well: ${peakLatency}ms peak latency, ${avgFps} avg fps over ${elapsed}s`)
      }
    }
  }, [status, peakLatency, elapsed, snapshots, onResult])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runningRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
      try { arenaRef.current?.close() } catch { /* ignore */ }
    }
  }, [])

  const latencyColor =
    currentLatency < 50 ? 'text-status-good' :
    currentLatency < 150 ? 'text-status-warn' :
    'text-status-bad'

  const fpsColor =
    currentFps >= 50 ? 'text-status-good' :
    currentFps >= 30 ? 'text-status-warn' :
    'text-status-bad'

  const hasMemory = snapshots.some(s => s.heapMB > 0)

  const totalLoad = config.dom * 50 + config.canvas * 200 + config.video + config.workers + config.memory * 64

  return (
    <div className="space-y-4">
      {/* Config controls -- shown when idle */}
      {status === 'idle' && (
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Preset:</span>
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => applyPreset(i)}
                className="px-3 py-1 text-[10px] font-mono rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SliderControl
              label="DOM Elements"
              value={config.dom}
              max={10}
              desc={`${config.dom * 50} animated divs`}
              onChange={v => setConfig(c => ({ ...c, dom: v }))}
            />
            <SliderControl
              label="Canvas Particles"
              value={config.canvas}
              max={10}
              desc={`${config.canvas * 200} particles`}
              onChange={v => setConfig(c => ({ ...c, canvas: v }))}
            />
            <SliderControl
              label="Video Streams"
              value={config.video}
              max={5}
              desc={`${config.video} synthetic streams`}
              onChange={v => setConfig(c => ({ ...c, video: v }))}
            />
            <SliderControl
              label="CPU Workers"
              value={config.workers}
              max={maxCores}
              desc={`${config.workers} of ${maxCores} cores`}
              onChange={v => setConfig(c => ({ ...c, workers: v }))}
            />
            <SliderControl
              label="Memory Blocks"
              value={config.memory}
              max={8}
              desc={`${config.memory * 64} MB allocated`}
              onChange={v => setConfig(c => ({ ...c, memory: v }))}
            />
          </div>

          {/* Duration + Start */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={config.durationSec}
              onChange={e => setConfig(c => ({ ...c, durationSec: Number(e.target.value) }))}
              className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/5 text-gray-200 border border-white/10 outline-none focus:border-[#40E0D0]/50 transition-colors cursor-pointer"
            >
              {DURATIONS.map(d => (
                <option key={d.sec} value={d.sec}>{d.label}</option>
              ))}
            </select>

            <button
              onClick={start}
              className="px-4 py-2 text-[10px] font-mono bg-[#40E0D0]/20 text-[#40E0D0] rounded-xl hover:bg-[#40E0D0]/30 transition-colors font-bold uppercase tracking-wider border border-[#40E0D0]/30 shadow-[0_0_10px_rgba(64,224,208,0.2)]"
            >
              Start Endurance
            </button>

            <span className="text-[10px] font-mono text-gray-600">
              ~{totalLoad} units of load
            </span>
          </div>

          {popupBlocked && (
            <div className="text-xs font-mono text-status-bad bg-status-bad/10 border border-status-bad/20 rounded-lg px-3 py-2">
              Popup was blocked. Please allow popups for this site and try again.
            </div>
          )}
        </div>
      )}

      {/* Running / Done controls */}
      {status === 'running' && (
        <div className="flex items-center gap-3">
          <button
            onClick={stop}
            className="px-4 py-2 text-[10px] font-mono bg-status-bad/20 text-status-bad rounded-xl hover:bg-status-bad/30 transition-colors font-bold uppercase tracking-wider border border-status-bad/30"
          >
            Stop
          </button>
          <div className="text-xs font-mono text-gray-400">
            {elapsed}s / {config.durationSec}s
          </div>
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#40E0D0]/60 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (elapsed / config.durationSec) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {status === 'done' && (
        <button
          onClick={() => { setStatus('idle'); setSnapshots([]) }}
          className="px-4 py-2 text-[10px] font-mono bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition-colors font-bold uppercase tracking-wider border border-white/10"
        >
          Reset
        </button>
      )}

      {/* Live stats */}
      {(status === 'running' || status === 'done') && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatBox label="Duration" value={`${elapsed}s`} />
          <StatBox label="Frame Rate" value={`${currentFps} fps`} className={fpsColor} />
          <StatBox label="Latency" value={`${currentLatency}ms`} className={latencyColor} />
          <StatBox
            label="Peak Latency"
            value={`${peakLatency}ms`}
            className={peakLatency > 150 ? 'text-status-bad' : peakLatency > 50 ? 'text-status-warn' : 'text-status-good'}
          />
          <StatBox label="Arena Heap" value={arenaHeapMB > 0 ? `${arenaHeapMB} MB` : '--'} />
        </div>
      )}

      {/* Charts */}
      {snapshots.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartBox label="Main Thread Latency (ms)" data={snapshots} dataKey="latency" color="#40E0D0" unit="ms" />
          <ChartBox label="Main Thread FPS" data={snapshots} dataKey="fps" color="var(--color-status-good)" unit=" fps" />
          {hasMemory && (
            <div className="md:col-span-2">
              <ChartBox label="JS Heap Memory (MB)" data={snapshots} dataKey="heapMB" color="#40E0D0" unit=" MB" />
            </div>
          )}
        </div>
      )}

      {/* Result summary */}
      {status === 'done' && snapshots.length > 0 && (
        <div className="text-xs font-mono text-gray-400 space-y-1 border-t border-white/5 pt-3">
          <p>
            Ran for <span className="text-gray-200 font-medium">{elapsed}s</span>
            {' '}with{' '}
            <span className="text-gray-200 font-medium">{config.dom * 50}</span> DOM elements,{' '}
            <span className="text-gray-200 font-medium">{config.canvas * 200}</span> particles,{' '}
            <span className="text-gray-200 font-medium">{config.video}</span> video streams,{' '}
            <span className="text-gray-200 font-medium">{config.workers}</span> CPU workers,{' '}
            <span className="text-gray-200 font-medium">{config.memory * 64} MB</span> allocated
          </p>
          <p>
            Avg FPS:{' '}
            <span className={
              (snapshots.reduce((s, r) => s + r.fps, 0) / snapshots.length) >= 50 ? 'text-status-good' :
              (snapshots.reduce((s, r) => s + r.fps, 0) / snapshots.length) >= 30 ? 'text-status-warn' :
              'text-status-bad'
            }>
              {Math.round(snapshots.reduce((s, r) => s + r.fps, 0) / snapshots.length)} fps
            </span>
            {' | '}
            Peak latency:{' '}
            <span className={peakLatency > 150 ? 'text-status-bad' : peakLatency > 50 ? 'text-status-warn' : 'text-status-good'}>
              {peakLatency}ms
            </span>
            {peakLatency > 150 && '. Device struggled under sustained load.'}
            {peakLatency > 50 && peakLatency <= 150 && '. Some degradation under load.'}
            {peakLatency <= 50 && '. Device handled sustained stress well.'}
          </p>
        </div>
      )}
    </div>
  )
}

/* ---- Subcomponents ---- */

function SliderControl({ label, value, max, desc, onChange }: {
  label: string; value: number; max: number; desc: string
  onChange: (v: number) => void
}) {
  return (
    <div className="bg-black/50 rounded-xl px-3 py-2.5 border border-white/5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-gray-600">{desc}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-600 w-4 text-right">0</span>
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none bg-white/10 rounded-full outline-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#40E0D0] [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(64,224,208,0.4)]
            [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#40E0D0] [&::-moz-range-thumb]:border-0"
        />
        <span className="text-[10px] font-mono text-gray-600 w-4">{max}</span>
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

function ChartBox({ label, data, dataKey, color, unit }: {
  label: string; data: PerfSnapshot[]; dataKey: keyof PerfSnapshot; color: string; unit: string
}) {
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
              tickFormatter={v => `${v}s`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#5F6578', fontFamily: 'var(--font-mono)' }}
              width={36}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#141414', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#E8EAED',
              }}
              labelFormatter={v => `${v}s`}
              formatter={v => [`${v}${unit}`, label.split(' (')[0]]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
