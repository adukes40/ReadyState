/**
 * Network Speed Test panel — compact sidebar version.
 * Uses @cloudflare/speedtest for accurate measurements against Cloudflare's edge.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import SpeedTest from '@cloudflare/speedtest'

interface SpeedResult {
  latencyMs: number | null
  jitterMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  downLoadedLatencyMs: number | null
  downLoadedJitterMs: number | null
  upLoadedLatencyMs: number | null
  upLoadedJitterMs: number | null
  score: string | null
}

// Default measurements from @cloudflare/speedtest minus packetLoss (requires TURN server)
const MEASUREMENTS = [
  { type: 'latency' as const, numPackets: 1 },
  { type: 'download' as const, bytes: 1e5, count: 1, bypassMinDuration: true },
  { type: 'latency' as const, numPackets: 20 },
  { type: 'download' as const, bytes: 1e5, count: 9 },
  { type: 'download' as const, bytes: 1e6, count: 8 },
  { type: 'upload' as const, bytes: 1e5, count: 8 },
  { type: 'upload' as const, bytes: 1e6, count: 6 },
  { type: 'download' as const, bytes: 1e7, count: 6 },
  { type: 'upload' as const, bytes: 1e7, count: 4 },
  { type: 'download' as const, bytes: 2.5e7, count: 4 },
  { type: 'upload' as const, bytes: 2.5e7, count: 4 },
  { type: 'download' as const, bytes: 1e8, count: 3 },
  { type: 'upload' as const, bytes: 5e7, count: 3 },
  { type: 'download' as const, bytes: 2.5e8, count: 2 },
]

// Total individual requests across all measurement steps
const TOTAL_REQUESTS = MEASUREMENTS.reduce((sum, m) => {
  if (m.type === 'latency') return sum + (m.numPackets ?? 1)
  return sum + (m.count ?? 1)
}, 0)

function formatBytes(bytes: number): string {
  if (bytes >= 1e8) return `${bytes / 1e6}MB`
  if (bytes >= 1e6) return `${bytes / 1e6}MB`
  return `${bytes / 1e3}KB`
}

// Build cumulative request thresholds per step for mapping changeCount to current step
const STEP_LABELS: { threshold: number; label: string }[] = []
let cumulative = 0
for (const m of MEASUREMENTS) {
  const requests = m.type === 'latency' ? (m.numPackets ?? 1) : ((m as { count: number }).count ?? 1)
  cumulative += requests
  if (m.type === 'latency') {
    STEP_LABELS.push({ threshold: cumulative, label: `Latency - ${(m as { numPackets: number }).numPackets} packets` })
  } else {
    const bytes = (m as { bytes: number }).bytes
    const count = (m as { count: number }).count
    STEP_LABELS.push({ threshold: cumulative, label: `${m.type === 'download' ? 'Download' : 'Upload'} - ${formatBytes(bytes)} x${count}` })
  }
}

function getCurrentStepLabel(changeCount: number): string {
  for (const step of STEP_LABELS) {
    if (changeCount <= step.threshold) return step.label
  }
  return STEP_LABELS[STEP_LABELS.length - 1].label
}

type Phase = 'idle' | 'running' | 'done'

function latencyColor(ms: number) {
  if (ms <= 50) return 'text-status-good'
  if (ms <= 150) return 'text-status-warn'
  return 'text-status-bad'
}

function jitterColor(ms: number) {
  if (ms <= 5) return 'text-status-good'
  if (ms <= 20) return 'text-status-warn'
  return 'text-status-bad'
}

function speedColor(mbps: number) {
  if (mbps >= 25) return 'text-status-good'
  if (mbps >= 5) return 'text-status-warn'
  return 'text-status-bad'
}

const CIRCUMFERENCE = 2 * Math.PI * 45

function bpsToMbps(bps: number): number {
  return Math.round((bps / 1_000_000) * 10) / 10
}

export default function NetworkPanel({ onResult, networkInfo }: {
  onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void
  networkInfo?: { mac: string; ip: string | null }
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<SpeedResult>({
    latencyMs: null, jitterMs: null,
    downloadMbps: null, uploadMbps: null,
    downLoadedLatencyMs: null, downLoadedJitterMs: null,
    upLoadedLatencyMs: null, upLoadedJitterMs: null,
    score: null,
  })
  const [ringProgress, setRingProgress] = useState(0) // 0 to 1
  const [error, setError] = useState<string | null>(null)
  const [stepLabel, setStepLabel] = useState<string | null>(null)
  const engineRef = useRef<SpeedTest | null>(null)
  const changeCountRef = useRef(0)

  // Smooth the ring with CSS transition — but also interpolate between
  // measurement events with a timer so the ring doesn't stall.
  const interpolationRef = useRef<number | null>(null)
  const targetProgressRef = useRef(0)
  const currentProgressRef = useRef(0)

  const startInterpolation = useCallback(() => {
    if (interpolationRef.current != null) return
    const tick = () => {
      const target = targetProgressRef.current
      const current = currentProgressRef.current
      if (current < target) {
        // Ease toward target
        const next = current + (target - current) * 0.08
        currentProgressRef.current = next
        setRingProgress(next)
      }
      interpolationRef.current = requestAnimationFrame(tick)
    }
    interpolationRef.current = requestAnimationFrame(tick)
  }, [])

  const stopInterpolation = useCallback(() => {
    if (interpolationRef.current != null) {
      cancelAnimationFrame(interpolationRef.current)
      interpolationRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopInterpolation()
  }, [stopInterpolation])

  const emptyResult: SpeedResult = { latencyMs: null, jitterMs: null, downloadMbps: null, uploadMbps: null, downLoadedLatencyMs: null, downLoadedJitterMs: null, upLoadedLatencyMs: null, upLoadedJitterMs: null, score: null }

  const start = useCallback(() => {
    setResult(emptyResult)
    setError(null)
    setPhase('running')
    setRingProgress(0)
    changeCountRef.current = 0
    targetProgressRef.current = 0
    currentProgressRef.current = 0

    const engine = new SpeedTest({ autoStart: false, measurements: MEASUREMENTS })
    engineRef.current = engine

    startInterpolation()

    engine.onResultsChange = () => {
      changeCountRef.current++
      const pct = Math.min(changeCountRef.current / TOTAL_REQUESTS, 0.95)
      targetProgressRef.current = pct
      setStepLabel(getCurrentStepLabel(changeCountRef.current))

      const s = engine.results.getSummary()
      setResult({
        downloadMbps: s.download ? bpsToMbps(s.download) : null,
        uploadMbps: s.upload ? bpsToMbps(s.upload) : null,
        latencyMs: s.latency ? Math.round(s.latency) : null,
        jitterMs: s.jitter ? Math.round(s.jitter * 10) / 10 : null,
        downLoadedLatencyMs: s.downLoadedLatency ? Math.round(s.downLoadedLatency) : null,
        downLoadedJitterMs: s.downLoadedJitter ? Math.round(s.downLoadedJitter * 10) / 10 : null,
        upLoadedLatencyMs: s.upLoadedLatency ? Math.round(s.upLoadedLatency) : null,
        upLoadedJitterMs: s.upLoadedJitter ? Math.round(s.upLoadedJitter * 10) / 10 : null,
        score: null,
      })
    }

    engine.onFinish = () => {
      stopInterpolation()
      const s = engine.results.getSummary()
      const dl = s.download ? bpsToMbps(s.download) : 0
      const ul = s.upload ? bpsToMbps(s.upload) : 0
      const lat = s.latency ? Math.round(s.latency) : 0
      const jit = s.jitter ? Math.round(s.jitter * 10) / 10 : 0
      const dlLat = s.downLoadedLatency ? Math.round(s.downLoadedLatency) : 0
      const dlJit = s.downLoadedJitter ? Math.round(s.downLoadedJitter * 10) / 10 : 0
      const ulLat = s.upLoadedLatency ? Math.round(s.upLoadedLatency) : 0
      const ulJit = s.upLoadedJitter ? Math.round(s.upLoadedJitter * 10) / 10 : 0

      const scores = engine.results.getScores()
      const overall = scores?.streaming?.classificationName
        ?? scores?.gaming?.classificationName
        ?? null
      const scoreLabel = overall ? overall.charAt(0).toUpperCase() + overall.slice(1) : null

      setResult({ downloadMbps: dl, uploadMbps: ul, latencyMs: lat, jitterMs: jit, downLoadedLatencyMs: dlLat, downLoadedJitterMs: dlJit, upLoadedLatencyMs: ulLat, upLoadedJitterMs: ulJit, score: scoreLabel })
      setStepLabel(null)
      setRingProgress(1)
      setPhase('done')
      onResult?.('Network Speed', 'pass',
        `Down: ${dl} Mbps | Up: ${ul} Mbps | Ping: ${lat}ms | Jitter: ${jit}ms`)
      engineRef.current = null
    }

    engine.onError = (err) => {
      stopInterpolation()
      setStepLabel(null)
      setError(String(err))
      setPhase('done')
      onResult?.('Network Speed', 'fail', String(err))
      engineRef.current = null
    }

    engine.play()
  }, [onResult, startInterpolation, stopInterpolation])

  const hasDownload = result.downloadMbps != null
  const canStart = phase === 'idle'
  const canRetest = phase === 'done'

  const handleGaugeClick = () => {
    if (canStart) start()
    else if (canRetest) {
      setPhase('idle')
      setResult(emptyResult)
      setRingProgress(0)
      setError(null)
    }
  }

  const dashOffset = CIRCUMFERENCE - CIRCUMFERENCE * ringProgress
  const ringColor = ringProgress > 0 ? '#40E0D0' : 'rgba(255,255,255,0.08)'

  const scoreColor = (s: string) => {
    if (s === 'Great' || s === 'Good') return 'text-status-good'
    if (s === 'Average') return 'text-status-warn'
    return 'text-status-bad'
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-4">
      {/* Gauge — left side */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div
          className={`relative w-24 h-24 ${canStart || canRetest ? 'cursor-pointer' : ''}`}
          onClick={handleGaugeClick}
        >
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              className={phase === 'done' ? 'transition-all duration-700' : ''}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'running' && !hasDownload && (
              <>
                <span className="text-[10px] text-gray-400 font-medium">Testing...</span>
                <div className="w-2 h-2 rounded-full bg-[#40E0D0] animate-pulse-dot mt-1" />
              </>
            )}
            {hasDownload && (
              <>
                <span className="text-[8px] text-gray-500 font-medium uppercase tracking-tight">Down</span>
                <span className="text-2xl font-bold font-mono font-tabular tracking-tight text-white">{result.downloadMbps}</span>
                <span className="text-[10px] text-gray-400 font-medium">Mbps</span>
              </>
            )}
            {canStart && !hasDownload && (
              <span className="text-[10px] text-[#40E0D0] font-medium text-center leading-tight hover:text-white transition-colors">Click to<br/>Test</span>
            )}
          </div>
        </div>
        {error && <span className="text-[10px] font-mono text-status-bad text-center max-w-24">{error}</span>}
        {canRetest && hasDownload && (
          <button
            onClick={() => { setPhase('idle'); setResult(emptyResult); setRingProgress(0); setError(null) }}
            className="text-[10px] font-mono text-gray-500 hover:text-[#40E0D0] transition-colors"
          >
            Retest
          </button>
        )}
      </div>

      {/* Stats grid — right side, fills remaining space */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-2 flex-1 text-[10px]">
        <StatCell label="Upload" value={result.uploadMbps != null ? `${result.uploadMbps} Mbps` : null} colorClass={result.uploadMbps != null ? speedColor(result.uploadMbps) : undefined} />
        <StatCell label="Latency" value={result.latencyMs != null ? `${result.latencyMs}ms` : null} colorClass={result.latencyMs != null ? latencyColor(result.latencyMs) : undefined} />
        <StatCell label="Jitter" value={result.jitterMs != null ? `${result.jitterMs}ms` : null} colorClass={result.jitterMs != null ? jitterColor(result.jitterMs) : undefined} />
        <StatCell label="Score" value={result.score} colorClass={result.score ? scoreColor(result.score) : undefined} />
        <StatCell label="DL Latency" value={result.downLoadedLatencyMs != null ? `${result.downLoadedLatencyMs}ms` : null} colorClass={result.downLoadedLatencyMs != null ? latencyColor(result.downLoadedLatencyMs) : undefined} />
        <StatCell label="DL Jitter" value={result.downLoadedJitterMs != null ? `${result.downLoadedJitterMs}ms` : null} colorClass={result.downLoadedJitterMs != null ? jitterColor(result.downLoadedJitterMs) : undefined} />
        <StatCell label="UL Latency" value={result.upLoadedLatencyMs != null ? `${result.upLoadedLatencyMs}ms` : null} colorClass={result.upLoadedLatencyMs != null ? latencyColor(result.upLoadedLatencyMs) : undefined} />
        <StatCell label="UL Jitter" value={result.upLoadedJitterMs != null ? `${result.upLoadedJitterMs}ms` : null} colorClass={result.upLoadedJitterMs != null ? jitterColor(result.upLoadedJitterMs) : undefined} />
      </div>
      </div>

      {/* Current test step — shown during run */}
      {phase === 'running' && stepLabel && (
        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-[#40E0D0] animate-pulse-dot flex-shrink-0" />
          {stepLabel}
        </div>
      )}
      {phase === 'done' && !error && (
        <div className="text-[10px] text-gray-600 font-mono mt-1">Test complete - {MEASUREMENTS.length} steps finished</div>
      )}
      {networkInfo && phase === 'done' && !error && (
        <div className="text-[10px] text-gray-600 font-mono mt-1">
          Interface: {networkInfo.mac}{networkInfo.ip ? ` / ${networkInfo.ip}` : ''}
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value, colorClass }: { label: string; value: string | null; colorClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-gray-500 font-medium tracking-wide">{label}</span>
      <span className={`font-bold font-mono ${colorClass ?? 'text-gray-600'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}
