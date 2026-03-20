/**
 * CPU Stress Test panel — spawns Web Worker, shows live ops/sec line chart.
 */

import { useState, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Status = 'idle' | 'running' | 'done'

export default function CPUStressPanel() {
  const [status, setStatus] = useState<Status>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [opsPerSec, setOpsPerSec] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [duration, setDuration] = useState(15)
  const workerRef = useRef<Worker | null>(null)

  const start = useCallback(() => {
    const worker = new Worker(new URL('./cpu-stress.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setStatus('running')
    setHistory([])
    setOpsPerSec(0)
    setElapsed(0)

    worker.onmessage = (e) => {
      const data = e.data
      if (data.type === 'tick') {
        setOpsPerSec(data.opsPerSecond)
        setElapsed(Math.round(data.elapsed))
        setHistory(data.throughputHistory)
      }
      if (data.type === 'done') {
        setStatus('done')
        setElapsed(duration)
        setHistory(data.throughputHistory)
        worker.terminate()
      }
    }

    worker.postMessage({ type: 'start', duration })
  }, [duration])

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ type: 'stop' })
    workerRef.current?.terminate()
    setStatus('done')
  }, [])

  const avg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0
  const throttled = history.length > 4 && history[history.length - 1] < history[0] * 0.8

  const chartData = history.map((v, i) => ({ t: i + 1, ops: v }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'idle' && (
            <>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="px-2 py-1 text-xs font-mono rounded-md bg-surface-input text-text-primary border border-border outline-none cursor-pointer"
              >
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
              <button onClick={start} className="px-4 py-1.5 text-xs font-mono bg-accent-primary text-text-on-accent rounded-md hover:bg-accent-hover transition-colors font-medium">
                Start
              </button>
            </>
          )}
          {status === 'running' && (
            <button onClick={stop} className="px-4 py-1.5 text-xs font-mono bg-status-bad text-white rounded-md hover:opacity-90 transition-opacity font-medium">
              Stop
            </button>
          )}
          {status === 'done' && (
            <button onClick={() => { setStatus('idle'); setHistory([]); setOpsPerSec(0) }} className="px-4 py-1.5 text-xs font-mono bg-surface-base text-text-secondary rounded-md border border-border hover:text-text-primary transition-colors">
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {status !== 'idle' && (
            <>
              <span className="text-text-muted">{elapsed}s</span>
              <span className="text-text-primary">{opsPerSec} <span className="text-text-muted">ops/s</span></span>
              {history.length > 0 && <span className="text-text-muted">avg {avg}</span>}
              {throttled && <span className="text-status-warn">Throttling detected</span>}
            </>
          )}
        </div>
      </div>

      {/* Recharts line chart */}
      {chartData.length > 0 && (
        <div className="h-24 bg-surface-base rounded-md border border-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
                labelFormatter={(v) => `${v}s`}
                formatter={(v) => [`${v} ops/s`, 'Throughput']}
              />
              <Line
                type="monotone"
                dataKey="ops"
                stroke="var(--color-accent-primary)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
