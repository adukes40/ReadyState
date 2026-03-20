/**
 * Network Speed Test panel — compact sidebar version.
 * Multi-round testing with download (primary), upload, latency, jitter, and packet loss.
 */

import { useState, useEffect } from 'react'

interface SpeedResult {
  latencyMs: number
  jitterMs: number
  packetLoss: number
  downloadMbps: number
  uploadMbps: number
}

type Phase = 'idle' | 'latency' | 'download' | 'upload' | 'done'

const PHASE_LABELS: Record<Phase, string> = {
  idle: '',
  latency: 'Measuring latency…',
  download: 'Testing download…',
  upload: 'Testing upload…',
  done: '',
}

const PING_ROUNDS = 20
const DOWNLOAD_DURATION = 8_000  // ms — keep downloading for 8 seconds
const DOWNLOAD_SIZE = 10_000_000 // 10MB per request
const UPLOAD_DURATION = 6_000    // ms — keep uploading for 6 seconds
const UPLOAD_SIZE = 2_000_000    // 2MB per request
const CONCURRENT_STREAMS = 4     // parallel connections

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

function lossColor(pct: number) {
  if (pct === 0) return 'text-status-good'
  if (pct <= 2) return 'text-status-warn'
  return 'text-status-bad'
}

function gaugeOffset(mbps: number): number {
  const pct = Math.min(mbps / 500, 1)
  const circumference = 2 * Math.PI * 45
  return circumference - circumference * pct
}

function fillRandom(buf: Uint8Array) {
  for (let offset = 0; offset < buf.byteLength; offset += 65536) {
    crypto.getRandomValues(buf.subarray(offset, offset + Math.min(65536, buf.byteLength - offset)))
  }
}

export default function NetworkPanel({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Partial<SpeedResult>>({})
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setResult({})
    setError(null)

    const endpoint = '/api/speed-test'

    try {
      // --- Latency & Jitter (multiple pings) ---
      setPhase('latency')
      const latencies: number[] = []
      let failures = 0

      for (let i = 0; i < PING_ROUNDS; i++) {
        setProgress(`${i + 1}/${PING_ROUNDS}`)
        try {
          const t0 = performance.now()
          await fetch(`${endpoint}?ping=1`, { cache: 'no-store' })
          latencies.push(performance.now() - t0)
        } catch {
          failures++
        }
      }

      const packetLoss = Math.round((failures / PING_ROUNDS) * 100 * 10) / 10
      setResult((r) => ({ ...r, packetLoss }))

      if (latencies.length > 0) {
        const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        // Jitter = mean absolute deviation between consecutive pings
        let jitterSum = 0
        for (let i = 1; i < latencies.length; i++) {
          jitterSum += Math.abs(latencies[i] - latencies[i - 1])
        }
        const jitterMs = latencies.length > 1
          ? Math.round((jitterSum / (latencies.length - 1)) * 10) / 10
          : 0
        setResult((r) => ({ ...r, latencyMs: avgLatency, jitterMs }))
      }

      // --- Download (time-based, parallel streams) ---
      setPhase('download')
      {
        let totalBytes = 0
        const dlStart = performance.now()
        let running = true
        setTimeout(() => { running = false }, DOWNLOAD_DURATION)

        // Each stream fetches continuously until time runs out
        const streamDownload = async () => {
          while (running) {
            try {
              const res = await fetch(`${endpoint}?size=${DOWNLOAD_SIZE}`, { cache: 'no-store' })
              const reader = res.body!.getReader()
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                totalBytes += value.byteLength
                const elapsed = Math.round((performance.now() - dlStart) / 1000)
                setProgress(`${elapsed}s`)
                if (!running) { reader.cancel(); break }
              }
            } catch { /* ignore individual failures */ }
          }
        }

        await Promise.all(Array.from({ length: CONCURRENT_STREAMS }, () => streamDownload()))
        const dlTime = (performance.now() - dlStart) / 1000
        const downloadMbps = Math.round((totalBytes * 8) / (dlTime * 1_000_000) * 10) / 10
        setResult((r) => ({ ...r, downloadMbps }))
      }

      // --- Upload (time-based, parallel streams) ---
      setPhase('upload')
      {
        const payload = new Uint8Array(UPLOAD_SIZE)
        fillRandom(payload)

        let totalBytes = 0
        const ulStart = performance.now()
        let running = true
        setTimeout(() => { running = false }, UPLOAD_DURATION)

        const streamUpload = async () => {
          while (running) {
            try {
              await fetch(endpoint, { method: 'POST', body: payload })
              totalBytes += payload.byteLength
              const elapsed = Math.round((performance.now() - ulStart) / 1000)
              setProgress(`${elapsed}s`)
            } catch { /* ignore individual failures */ }
          }
        }

        await Promise.all(Array.from({ length: CONCURRENT_STREAMS }, () => streamUpload()))
        const ulTime = (performance.now() - ulStart) / 1000
        const uploadMbps = Math.round((totalBytes * 8) / (ulTime * 1_000_000) * 10) / 10
        setResult((r) => ({ ...r, uploadMbps }))
      }

      setPhase('done')
      setProgress('')
    } catch (e) {
      setError(String(e))
      setPhase('done')
      setProgress('')
    }
  }

  useEffect(() => {
    if (phase === 'done') {
      if (error) {
        onResult?.('Network Speed', 'fail', error)
      } else if (result.downloadMbps != null && result.uploadMbps != null && result.latencyMs != null) {
        onResult?.('Network Speed', 'pass',
          `Down: ${result.downloadMbps} Mbps | Up: ${result.uploadMbps} Mbps | Ping: ${result.latencyMs}ms | Jitter: ${result.jitterMs}ms | Loss: ${result.packetLoss}%`)
      }
    }
  }, [phase, error, result.downloadMbps, result.uploadMbps, result.latencyMs, result.jitterMs, result.packetLoss, onResult])

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
              <span className="text-[9px] text-gray-500 font-mono mt-0.5">{progress}</span>
              <div className="w-2 h-2 rounded-full bg-[#40E0D0] animate-pulse-dot mt-1" />
            </>
          )}
          {hasResults && !running && (
            <>
              <span className="text-[9px] text-gray-500 font-medium uppercase tracking-widest">Download</span>
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

      {/* Stats grid below gauge */}
      {Object.keys(result).length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-[10px] px-1">
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
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-gray-500 font-medium tracking-wide">Loss</span>
            <span className={`font-bold font-mono ${result.packetLoss != null ? lossColor(result.packetLoss) : 'text-gray-200'}`}>
              {result.packetLoss != null ? `${result.packetLoss}%` : '—'}
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
