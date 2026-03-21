/**
 * Memory Pressure Test panel — progressive allocation with radial gauge.
 * Stitch visual: dark card, cyan gauge, clean stat readout.
 */

import { useState, useRef, useEffect } from 'react'
import { runMemoryPressure } from './memory-pressure'
import type { MemoryResult } from './memory-pressure'
import Gauge from '../components/gauge'

type Status = 'idle' | 'running' | 'done'

export default function MemoryPanel({ onResult }: { onResult?: (name: string, status: 'pass' | 'fail' | 'warn' | 'skipped' | 'not run', detail: string) => void }) {
  const [status, setStatus] = useState<Status>('idle')
  const [allocated, setAllocated] = useState(0)
  const [result, setResult] = useState<MemoryResult | null>(null)
  const runningRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)

  const start = async () => {
    setStatus('running')
    setAllocated(0)
    setResult(null)
    runningRef.current = true
    const controller = new AbortController()
    abortRef.current = controller

    const res = await runMemoryPressure((mb) => {
      if (runningRef.current) setAllocated(mb)
    }, controller.signal)
    setResult(res)
    setStatus('done')
  }

  const stop = () => {
    abortRef.current?.abort()
    runningRef.current = false
  }

  useEffect(() => {
    if (status === 'done' && result) {
      const gcNote = result.gcDetected ? ', GC detected' : ''
      onResult?.('Memory Pressure', 'pass', `Allocated ${Math.round(allocated)} MB, peak ${Math.round(result.maxAllocatedMB)} MB${gcNote}`)
    }
  }, [status, result, allocated, onResult])

  const deviceRAM = (navigator as any).deviceMemory as number | undefined
  const maxMB = deviceRAM ? deviceRAM * 1024 : 4096
  const pct = Math.min((allocated / maxMB) * 100, 100)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {status === 'idle' && (
            <>
              <button onClick={start} className="px-4 py-2 text-[10px] font-mono bg-[#40E0D0]/20 text-[#40E0D0] rounded-xl hover:bg-[#40E0D0]/30 transition-colors font-bold uppercase tracking-wider border border-[#40E0D0]/30 shadow-[0_0_10px_rgba(64,224,208,0.2)]">
                Start
              </button>
              <span className="text-xs text-gray-500 hidden sm:inline">Allocates memory in 16 MB chunks until the browser limit is reached.</span>
            </>
          )}
          {status === 'running' && (
            <>
              <button onClick={stop} className="px-4 py-2 text-[10px] font-mono bg-status-bad/20 text-status-bad rounded-xl hover:bg-status-bad/30 transition-colors font-bold uppercase tracking-wider border border-status-bad/30">
                Stop
              </button>
              <span className="text-xs font-mono text-gray-500">Allocating...</span>
            </>
          )}
          {status === 'done' && (
            <button onClick={() => { setStatus('idle'); setResult(null); setAllocated(0) }} className="px-4 py-2 text-[10px] font-mono bg-white/5 text-gray-300 rounded-xl border border-white/10 hover:bg-white/10 transition-colors font-medium">
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {deviceRAM && <span className="text-gray-500">Device: {deviceRAM} GB</span>}
          {status !== 'idle' && (
            <span className="text-gray-200">{Math.round(allocated)} <span className="text-gray-500">MB allocated</span></span>
          )}
          {result?.gcDetected && <span className="text-status-warn">GC detected</span>}
        </div>
      </div>

      {/* Gauge display */}
      {status !== 'idle' && (
        <div className="flex items-center gap-4">
          <Gauge value={pct} max={100} size={80} label="RAM %" />
          <div className="text-xs font-mono text-gray-500 space-y-1">
            <div>{Math.round(allocated)} / {Math.round(maxMB)} MB</div>
            {result && <div>Peak: {Math.round(result.maxAllocatedMB)} MB</div>}
          </div>
        </div>
      )}
    </div>
  )
}
