/**
 * Network Speed Test panel — compact sidebar version.
 * Clickable circular gauge, stats below.
 */

import { useState, useEffect } from 'react'

interface SpeedResult {
  latencyMs: number
  downloadMbps: number
  uploadMbps: number
}

type Phase = 'idle' | 'latency' | 'download' | 'upload' | 'done'

const PHASE_LABELS: Record<Phase, string> = {
  idle: '',
  latency: 'Latency…',
  download: 'Download…',
  upload: 'Upload…',
  done: '',
}

function latencyColor(ms: number) {
  if (ms <= 50) return 'text-status-good'
  if (ms <= 150) return 'text-status-warn'
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

export default function NetworkPanel({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Partial<SpeedResult>>({})
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setResult({})
    setError(null)

    const endpoint = '/api/speed-test'

    try {
      setPhase('latency')
      const latStart = performance.now()
      await fetch(`${endpoint}?ping=1`, { cache: 'no-store' })
      const latencyMs = Math.round(performance.now() - latStart)
      setResult((r) => ({ ...r, latencyMs }))

      setPhase('download')
      const dlStart = performance.now()
      const dlRes = await fetch(`${endpoint}?size=5000000`, { cache: 'no-store' })
      const dlBlob = await dlRes.blob()
      const dlTime = (performance.now() - dlStart) / 1000
      const downloadMbps = Math.round((dlBlob.size * 8) / (dlTime * 1_000_000) * 10) / 10
      setResult((r) => ({ ...r, downloadMbps }))

      setPhase('upload')
      const payload = new Uint8Array(2_000_000)
      for (let offset = 0; offset < payload.byteLength; offset += 65536) {
        crypto.getRandomValues(payload.subarray(offset, offset + Math.min(65536, payload.byteLength - offset)))
      }
      const ulStart = performance.now()
      await fetch(endpoint, { method: 'POST', body: payload })
      const ulTime = (performance.now() - ulStart) / 1000
      const uploadMbps = Math.round((payload.byteLength * 8) / (ulTime * 1_000_000) * 10) / 10
      setResult((r) => ({ ...r, uploadMbps }))

      setPhase('done')
    } catch (e) {
      setError(String(e))
      setPhase('done')
    }
  }

  useEffect(() => {
    if (phase === 'done') {
      if (error) {
        onResult?.('Network Speed', 'fail', error)
      } else if (result.downloadMbps != null && result.uploadMbps != null && result.latencyMs != null) {
        onResult?.('Network Speed', 'pass', `Down: ${result.downloadMbps} Mbps, Up: ${result.uploadMbps} Mbps, Latency: ${result.latencyMs}ms`)
      }
    }
  }, [phase, error, result.downloadMbps, result.uploadMbps, result.latencyMs, onResult])

  const running = phase !== 'idle' && phase !== 'done'
  const hasResults = result.downloadMbps != null
  const canStart = phase === 'idle' && !hasResults
  const canRetest = phase === 'done'

  const handleGaugeClick = () => {
    if (canStart) start()
    else if (canRetest) { setPhase('idle'); setResult({}); setError(null) }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Clickable gauge */}
      <div
        className={`relative w-28 h-28 ${canStart || canRetest ? 'cursor-pointer' : ''}`}
        onClick={handleGaugeClick}
      >
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={hasResults ? '#40E0D0' : 'rgba(255,255,255,0.08)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={hasResults ? gaugeOffset(result.downloadMbps!) : 2 * Math.PI * 45}
            className="transition-all duration-1000"
            style={hasResults ? { filter: 'drop-shadow(0 0 10px rgba(64,224,208,0.8))' } : undefined}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {running && (
            <>
              <span className="text-[10px] text-gray-400 font-medium">{PHASE_LABELS[phase]}</span>
              <div className="w-2 h-2 rounded-full bg-[#40E0D0] animate-pulse-dot mt-1" />
            </>
          )}
          {hasResults && (
            <>
              <span className="text-2xl font-bold font-mono font-tabular tracking-tight text-white">{result.downloadMbps}</span>
              <span className="text-[10px] text-gray-400 font-medium">Mbps</span>
            </>
          )}
          {canStart && (
            <span className="text-[10px] text-[#40E0D0] font-medium text-center leading-tight hover:text-white transition-colors">Click to<br/>Test</span>
          )}
          {canRetest && !hasResults && (
            <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">Click to<br/>Retest</span>
          )}
        </div>
      </div>

      {error && <span className="text-[10px] font-mono text-status-bad text-center">{error}</span>}

      {/* Stats below gauge */}
      {Object.keys(result).length > 0 && (
        <div className="flex justify-between w-full text-[10px] px-1">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 font-medium tracking-wide">Upload</span>
            <span className={`font-bold font-mono ${result.uploadMbps != null ? speedColor(result.uploadMbps) : 'text-gray-200'}`}>
              {result.uploadMbps != null ? `${result.uploadMbps}` : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 font-medium tracking-wide">Latency</span>
            <span className={`font-bold font-mono ${result.latencyMs != null ? latencyColor(result.latencyMs) : 'text-gray-200'}`}>
              {result.latencyMs != null ? `${result.latencyMs}ms` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Retest link after results */}
      {canRetest && hasResults && (
        <button
          onClick={() => { setPhase('idle'); setResult({}); setError(null) }}
          className="text-[10px] font-mono text-gray-500 hover:text-[#40E0D0] transition-colors"
        >
          Retest
        </button>
      )}
    </div>
  )
}
