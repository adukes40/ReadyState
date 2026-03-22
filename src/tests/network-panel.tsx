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

export default function NetworkPanel({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<SpeedResult>({
    latencyMs: null, jitterMs: null,
    downloadMbps: null, uploadMbps: null,
  })
  const [ringProgress, setRingProgress] = useState(0) // 0 to 1
  const [error, setError] = useState<string | null>(null)
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

  const start = useCallback(() => {
    setResult({ latencyMs: null, jitterMs: null, downloadMbps: null, uploadMbps: null })
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
      // Each onResultsChange roughly corresponds to one completed request.
      // Cap at 95% — the final 5% fills on completion.
      const pct = Math.min(changeCountRef.current / TOTAL_REQUESTS, 0.95)
      targetProgressRef.current = pct

      const s = engine.results.getSummary()
      setResult({
        downloadMbps: s.download ? bpsToMbps(s.download) : null,
        uploadMbps: s.upload ? bpsToMbps(s.upload) : null,
        latencyMs: s.latency ? Math.round(s.latency) : null,
        jitterMs: s.jitter ? Math.round(s.jitter * 10) / 10 : null,
      })
    }

    engine.onFinish = () => {
      stopInterpolation()
      const s = engine.results.getSummary()
      const dl = s.download ? bpsToMbps(s.download) : 0
      const ul = s.upload ? bpsToMbps(s.upload) : 0
      const lat = s.latency ? Math.round(s.latency) : 0
      const jit = s.jitter ? Math.round(s.jitter * 10) / 10 : 0

      setResult({ downloadMbps: dl, uploadMbps: ul, latencyMs: lat, jitterMs: jit })
      setRingProgress(1)
      setPhase('done')
      onResult?.('Network Speed', 'pass',
        `Down: ${dl} Mbps | Up: ${ul} Mbps | Ping: ${lat}ms | Jitter: ${jit}ms`)
      engineRef.current = null
    }

    engine.onError = (err) => {
      stopInterpolation()
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
      setResult({ latencyMs: null, jitterMs: null, downloadMbps: null, uploadMbps: null })
      setRingProgress(0)
      setError(null)
    }
  }

  const dashOffset = CIRCUMFERENCE - CIRCUMFERENCE * ringProgress
  const ringColor = ringProgress > 0 ? '#40E0D0' : 'rgba(255,255,255,0.08)'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Clickable gauge — primary download speed */}
      <div
        className={`relative sidebar-gauge ${canStart || canRetest ? 'cursor-pointer' : ''}`}
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
              <span className="text-[10px] text-gray-400 font-medium">Testing…</span>
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

      {error && <span className="text-[10px] font-mono text-status-bad text-center">{error}</span>}

      {/* Stats grid below gauge — always visible with placeholders */}
        <div className="grid grid-cols-3 gap-x-3 w-full text-[10px] px-1">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 font-medium tracking-wide">Upload</span>
            <span className={`font-bold font-mono ${result.uploadMbps != null ? speedColor(result.uploadMbps) : 'text-gray-200'}`}>
              {result.uploadMbps != null ? `${result.uploadMbps} Mbps` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 font-medium tracking-wide">Latency</span>
            <span className={`font-bold font-mono ${result.latencyMs != null ? latencyColor(result.latencyMs) : 'text-gray-200'}`}>
              {result.latencyMs != null ? `${result.latencyMs}ms` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 font-medium tracking-wide">Jitter</span>
            <span className={`font-bold font-mono ${result.jitterMs != null ? jitterColor(result.jitterMs) : 'text-gray-200'}`}>
              {result.jitterMs != null ? `${result.jitterMs}ms` : '—'}
            </span>
          </div>
        </div>

      {/* Retest link after results */}
      {canRetest && hasDownload && (
        <button
          onClick={() => { setPhase('idle'); setResult({ latencyMs: null, jitterMs: null, downloadMbps: null, uploadMbps: null }); setRingProgress(0); setError(null) }}
          className="text-[10px] font-mono text-gray-500 hover:text-[#40E0D0] transition-colors"
        >
          Retest
        </button>
      )}
    </div>
  )
}
