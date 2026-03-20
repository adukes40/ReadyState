/**
 * CPU Stress Test — Web Worker
 * Runs matrix multiply loops to stress CPU cores.
 * Posts throughput metrics back to main thread every second.
 * Detects thermal throttling via throughput drop over time.
 */

interface StressMessage {
  type: 'start' | 'stop'
  duration?: number // seconds
}

interface StressResult {
  type: 'tick' | 'done'
  opsPerSecond: number
  elapsed: number
  throughputHistory: number[]
}

let running = false

self.onmessage = (e: MessageEvent<StressMessage>) => {
  if (e.data.type === 'start') {
    running = true
    runStress(e.data.duration ?? 60)
  } else {
    running = false
  }
}

function runStress(durationSec: number) {
  const history: number[] = []
  const startTime = performance.now()
  let lastTick = startTime
  let ops = 0

  function matrixMultiply() {
    const size = 64
    const a = new Float64Array(size * size)
    const b = new Float64Array(size * size)
    const c = new Float64Array(size * size)
    for (let i = 0; i < a.length; i++) { a[i] = Math.random(); b[i] = Math.random() }
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let sum = 0
        for (let k = 0; k < size; k++) sum += a[i * size + k] * b[k * size + j]
        c[i * size + j] = sum
      }
    }
    return c[0] // prevent dead code elimination
  }

  function loop() {
    if (!running) return

    const now = performance.now()
    const elapsed = (now - startTime) / 1000

    if (elapsed >= durationSec) {
      self.postMessage({ type: 'done', opsPerSecond: ops, elapsed, throughputHistory: history } satisfies StressResult)
      running = false
      return
    }

    matrixMultiply()
    ops++

    if (now - lastTick >= 1000) {
      const opsThisTick = ops
      history.push(opsThisTick)
      self.postMessage({ type: 'tick', opsPerSecond: opsThisTick, elapsed, throughputHistory: history } satisfies StressResult)
      ops = 0
      lastTick = now
    }

    // Yield briefly to allow message handling
    setTimeout(loop, 0)
  }

  loop()
}
