/**
 * GPU Stress Test panel — WebGL raymarching with live FPS line chart.
 */

import { useState, useRef, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { startGPUStress } from './gpu-stress'

type Status = 'idle' | 'running' | 'done'

export default function GPUStressPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [fps, setFps] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [fpsHistory, setFpsHistory] = useState<number[]>([])
  const [result, setResult] = useState<{ avg: number; min: number; lost: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(15)

  useEffect(() => {
    return () => { stopRef.current?.() }
  }, [])

  const start = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio

    setStatus('running')
    setFpsHistory([])
    setResult(null)
    setError(null)

    const stop = startGPUStress(canvas, duration, {
      onFPS: (f, e) => {
        setFps(f)
        setElapsed(Math.round(e))
        setFpsHistory((prev) => [...prev, f])
      },
      onDone: (avg, min, lost) => {
        setResult({ avg: Math.round(avg), min, lost })
        setStatus('done')
      },
      onError: (err) => {
        setError(err)
        setStatus('done')
      },
    })
    stopRef.current = stop
  }

  const stop = () => {
    stopRef.current?.()
    setStatus('done')
  }

  const chartData = fpsHistory.map((v, i) => ({ t: i + 1, fps: v }))

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
              </select>
              <button onClick={start} className="px-4 py-1.5 text-xs font-mono bg-accent-primary text-text-on-accent rounded-md hover:bg-accent-hover transition-colors font-medium">
                Start
              </button>
            </>
          )}
          {status === 'running' && (
            <button onClick={stop} className="px-4 py-1.5 text-xs font-mono bg-status-bad text-white rounded-md hover:opacity-90 font-medium">
              Stop
            </button>
          )}
          {status === 'done' && (
            <button onClick={() => { setStatus('idle'); setFpsHistory([]); setResult(null); setError(null) }} className="px-4 py-1.5 text-xs font-mono bg-surface-base text-text-secondary rounded-md border border-border hover:text-text-primary transition-colors">
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {status === 'running' && (
            <>
              <span className="text-text-muted">{elapsed}s</span>
              <span className="text-text-primary">{fps} <span className="text-text-muted">FPS</span></span>
            </>
          )}
          {result && (
            <>
              <span>Avg <span className="text-text-primary">{result.avg}</span> FPS</span>
              <span>Min <span className="text-text-primary">{result.min}</span></span>
              {result.lost && <span className="text-status-bad">Context Lost</span>}
            </>
          )}
          {error && <span className="text-status-bad">{error}</span>}
        </div>
      </div>

      {/* WebGL canvas + FPS line chart */}
      <div className="space-y-3">
        <canvas
          ref={canvasRef}
          className={`w-full h-32 rounded-md border border-border bg-black ${status === 'idle' ? 'opacity-50' : ''}`}
        />
        {chartData.length > 0 && (
          <div className="h-24 bg-surface-base rounded-md border border-border p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, 'dataMax']} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}
                  labelFormatter={(v) => `${v}s`}
                  formatter={(v) => [`${v} FPS`, 'Frame Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="fps"
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
    </div>
  )
}
