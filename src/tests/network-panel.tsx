/**
 * Network Speed Test panel — compact sidebar version.
 * Uses @cloudflare/speedtest for accurate measurements against Cloudflare's edge.
 */

import { useState, useRef, useCallback } from 'react'
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

function gaugeOffset(mbps: number): number {
  const pct = Math.min(mbps / 500, 1)
  const circumference = 2 * Math.PI * 45
  return circumference - circumference * pct
}

function bpsToMbps(bps: number): number {
  return Math.round((bps / 1_000_000) * 10) / 10
}

export default function NetworkPanel({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<SpeedResult>({
    latencyMs: null, jitterMs: null,
    downloadMbps: null, uploadMbps: null,
  })
  const [error, setError] = useState<string | null>(null)
  const engineRef = useRef<SpeedTest | null>(null)

  const start = useCallback(() => {
    setResult({ latencyMs: null, jitterMs: null, downloadMbps: null, uploadMbps: null })
    setError(null)
    setPhase('running')

    const engine = new SpeedTest({ autoStart: false, measurements: MEASUREMENTS })
    engineRef.current = engine

    engine.onResultsChange = () => {
      const s = engine.results.getSummary()
      setResult({
        downloadMbps: s.download ? bpsToMbps(s.download) : null,
        uploadMbps: s.upload ? bpsToMbps(s.upload) : null,
        latencyMs: s.latency ? Math.round(s.latency) : null,
        jitterMs: s.jitter ? Math.round(s.jitter * 10) / 10 : null,
      })
    }

    engine.onFinish = () => {
      const s = engine.results.getSummary()
      const dl = s.download ? bpsToMbps(s.download) : 0
      const ul = s.upload ? bpsToMbps(s.upload) : 0
      const lat = s.latency ? Math.round(s.latency) : 0
      const jit = s.jitter ? Math.round(s.jitter * 10) / 10 : 0

      setResult({ downloadMbps: dl, uploadMbps: ul, latencyMs: lat, jitterMs: jit })
      setPhase('done')
      onResult?.('Network Speed', 'pass',
        `Down: ${dl} Mbps | Up: ${ul} Mbps | Ping: ${lat}ms | Jitter: ${jit}ms`)
      engineRef.current = null
    }

    engine.onError = (err) => {
      setError(String(err))
      setPhase('done')
      onResult?.('Network Speed', 'fail', String(err))
      engineRef.current = null
    }

    engine.play()
  }, [onResult])

  const hasDownload = result.downloadMbps != null
  const canStart = phase === 'idle'
  const canRetest = phase === 'done'

  const handleGaugeClick = () => {
    if (canStart) start()
    else if (canRetest) { setPhase('idle'); setResult({ latencyMs: null, jitterMs: null, downloadMbps: null, uploadMbps: null }); setError(null) }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Clickable gauge — primary download speed */}
      <div
        className={`relative w-28 h-28 ${canStart || canRetest ? 'cursor-pointer' : ''}`}
        onClick={handleGaugeClick}
      >
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={hasDownload ? '#40E0D0' : 'rgba(255,255,255,0.08)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={hasDownload ? gaugeOffset(result.downloadMbps!) : 2 * Math.PI * 45}
            className="transition-all duration-1000"
            style={hasDownload ? { filter: 'drop-shadow(0 0 10px rgba(64,224,208,0.8))' } : undefined}
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
              <span className="text-[9px] text-gray-500 font-medium uppercase tracking-widest">Download</span>
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

      {/* Stats grid below gauge */}
      {(result.uploadMbps != null || result.latencyMs != null || result.jitterMs != null) && (
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
      )}

      {/* Retest link after results */}
      {canRetest && hasDownload && (
        <button
          onClick={() => { setPhase('idle'); setResult({ latencyMs: null, jitterMs: null, downloadMbps: null, uploadMbps: null }); setError(null) }}
          className="text-[10px] font-mono text-gray-500 hover:text-[#40E0D0] transition-colors"
        >
          Retest
        </button>
      )}
    </div>
  )
}
