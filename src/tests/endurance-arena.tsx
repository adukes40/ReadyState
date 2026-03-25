/**
 * Endurance Arena -- runs inside the popup window.
 * Receives config from the opener via postMessage, spawns stress workloads
 * (DOM animation, canvas particles, synthetic video, CPU workers, memory),
 * and reports real-time metrics back to the control panel.
 */

import { useEffect, useRef, useState } from 'react'

export interface ArenaConfig {
  dom: number
  canvas: number
  video: number
  workers: number
  memory: number
  durationSec: number
}

export default function EnduranceArena() {
  const [config, setConfig] = useState<ArenaConfig | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [status, setStatus] = useState<'waiting' | 'running' | 'done'>('waiting')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workersRef = useRef<Worker[]>([])
  const domContainerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const buffersRef = useRef<ArrayBuffer[]>([])
  const animFrameRef = useRef(0)
  const runningRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Listen for config from opener
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'endurance-config') {
        setConfig(e.data.config as ArenaConfig)
      }
      if (e.data?.type === 'endurance-stop') {
        doCleanup()
        setStatus('done')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  function doCleanup() {
    runningRef.current = false
    cancelAnimationFrame(animFrameRef.current)
    workersRef.current.forEach(w => {
      w.postMessage({ type: 'stop' })
      setTimeout(() => w.terminate(), 200)
    })
    workersRef.current = []
    buffersRef.current = []
    videoContainerRef.current?.querySelectorAll('video').forEach(v => {
      const vid = v as HTMLVideoElement
      vid.pause()
      vid.srcObject = null
    })
    cleanupRef.current?.()
  }

  // Start workloads when config arrives
  useEffect(() => {
    if (!config || status !== 'waiting') return
    setStatus('running')
    runningRef.current = true
    const startTime = performance.now()

    // -- DOM Stress --
    if (config.dom > 0 && domContainerRef.current) {
      const container = domContainerRef.current
      const count = config.dom * 50
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div')
        el.style.cssText = `
          position: absolute;
          width: ${8 + Math.random() * 24}px;
          height: ${8 + Math.random() * 24}px;
          background: hsl(${Math.random() * 360}, 70%, 50%);
          border-radius: ${Math.random() > 0.5 ? '50%' : '4px'};
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          transition: transform 0.1s;
        `
        container.appendChild(el)
      }
      const animateDom = () => {
        if (!runningRef.current) return
        const els = container.children
        const t = performance.now() * 0.001
        for (let i = 0; i < els.length; i++) {
          const el = els[i] as HTMLElement
          el.style.transform = `translate(${Math.sin(t + i) * 20}px, ${Math.cos(t + i * 0.7) * 20}px) rotate(${t * 50 + i}deg)`
          el.style.background = `hsl(${(t * 60 + i * 3) % 360}, 70%, 50%)`
        }
        requestAnimationFrame(animateDom)
      }
      requestAnimationFrame(animateDom)
    }

    // -- Canvas Stress --
    if (config.canvas > 0 && canvasRef.current) {
      const cvs = canvasRef.current
      const ctx = cvs.getContext('2d')!
      const w = cvs.width = window.innerWidth
      const h = cvs.height = window.innerHeight
      const particleCount = config.canvas * 200
      const particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        r: 2 + Math.random() * 6,
        hue: Math.random() * 360,
      }))

      const animateCanvas = () => {
        if (!runningRef.current) return
        ctx.fillStyle = 'rgba(10,10,10,0.1)'
        ctx.fillRect(0, 0, w, h)
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
          p.hue = (p.hue + 0.5) % 360
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `hsl(${p.hue}, 80%, 60%)`
          ctx.fill()
        }
        animFrameRef.current = requestAnimationFrame(animateCanvas)
      }
      requestAnimationFrame(animateCanvas)
    }

    // -- Video Stress (synthetic canvas-fed streams) --
    if (config.video > 0 && videoContainerRef.current) {
      for (let i = 0; i < config.video; i++) {
        const video = document.createElement('video')
        video.width = 160
        video.height = 90
        video.muted = true
        video.loop = true
        video.autoplay = true

        // Generate synthetic video via canvas captureStream
        const vc = document.createElement('canvas')
        vc.width = 320
        vc.height = 180
        const vctx = vc.getContext('2d')!
        const stream = vc.captureStream(30)
        video.srcObject = stream
        video.play().catch(() => {})
        videoContainerRef.current.appendChild(video)

        const animateVideo = () => {
          if (!runningRef.current) return
          const t = performance.now() * 0.001
          vctx.fillStyle = `hsl(${(t * 40 + i * 60) % 360}, 60%, 20%)`
          vctx.fillRect(0, 0, 320, 180)
          for (let j = 0; j < 20; j++) {
            vctx.fillStyle = `hsl(${(t * 80 + j * 30) % 360}, 80%, 50%)`
            vctx.fillRect(
              Math.sin(t + j) * 100 + 160,
              Math.cos(t * 1.3 + j) * 60 + 90,
              20 + Math.sin(t + j) * 10,
              20 + Math.cos(t + j) * 10,
            )
          }
          requestAnimationFrame(animateVideo)
        }
        requestAnimationFrame(animateVideo)
      }
    }

    // -- Worker Stress --
    for (let i = 0; i < config.workers; i++) {
      const worker = new Worker(
        new URL('./endurance.worker.ts', import.meta.url),
        { type: 'module' },
      )
      worker.postMessage({
        type: 'start',
        memoryMB: 32,
        durationMs: config.durationSec * 1000,
      })
      workersRef.current.push(worker)
    }

    // -- Memory Stress (64MB chunks) --
    for (let i = 0; i < config.memory; i++) {
      try {
        const buf = new ArrayBuffer(64 * 1024 * 1024)
        const view = new Uint8Array(buf)
        for (let j = 0; j < view.length; j += 4096) view[j] = 0xAB
        buffersRef.current.push(buf)
      } catch {
        break
      }
    }

    // -- Metrics reporting to opener --
    const metricsInterval = setInterval(() => {
      if (!runningRef.current) return
      const sec = Math.floor((performance.now() - startTime) / 1000)
      setElapsed(sec)

      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      window.opener?.postMessage({
        type: 'endurance-metrics',
        elapsed: sec,
        heapMB: mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : 0,
        domNodes: document.querySelectorAll('*').length,
        workers: workersRef.current.length,
        memoryChunks: buffersRef.current.length,
      }, '*')
    }, 1000)

    // -- Duration timer --
    const durationTimeout = setTimeout(() => {
      doCleanup()
      setStatus('done')
      window.opener?.postMessage({ type: 'endurance-complete' }, '*')
    }, config.durationSec * 1000)

    cleanupRef.current = () => {
      clearInterval(metricsInterval)
      clearTimeout(durationTimeout)
    }

    return () => {
      clearInterval(metricsInterval)
      clearTimeout(durationTimeout)
    }
  }, [config, status])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a0a' }}>
      {status === 'waiting' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: '#40E0D0', fontFamily: 'monospace', fontSize: 16,
        }}>
          Waiting for test configuration...
        </div>
      )}

      {status === 'done' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8, zIndex: 100, background: 'rgba(10,10,10,0.95)',
        }}>
          <div style={{ fontSize: 24, color: '#40E0D0', fontFamily: 'monospace' }}>Test Complete</div>
          <div style={{ color: '#888', fontFamily: 'monospace' }}>
            Ran for {elapsed}s -- you can close this window
          </div>
        </div>
      )}

      {/* DOM stress container */}
      <div
        ref={domContainerRef}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
      />

      {/* Canvas stress layer */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Video stress container */}
      <div
        ref={videoContainerRef}
        style={{
          position: 'absolute', bottom: 0, left: 0,
          display: 'flex', flexWrap: 'wrap', gap: 2, opacity: 0.3,
        }}
      />

      {/* Timer overlay */}
      {status === 'running' && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(64,224,208,0.3)',
          borderRadius: 12, padding: '12px 20px',
          fontFamily: 'monospace', fontSize: 14, color: '#40E0D0', zIndex: 50,
        }}>
          {elapsed}s / {config?.durationSec ?? 0}s
        </div>
      )}
    </div>
  )
}
