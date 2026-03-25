/**
 * Endurance Worker -- runs mixed CPU workloads for sustained stress testing.
 * Rotates through matrix multiply, sorting, hashing, and JSON churn to hit
 * different CPU subsystems (FPU, branch predictor, memory bandwidth, GC).
 * Reports ops/sec back to the host every second.
 */

let stopped = false
let buffer: ArrayBuffer | null = null

/** Matrix multiplication -- heavy FPU + cache pressure */
function workMatrix(): number {
  const size = 128
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
  return c[0]
}

/** Sorting -- memory bandwidth + branch prediction stress */
function workSort(): number {
  const arr = new Float64Array(50000)
  for (let i = 0; i < arr.length; i++) arr[i] = Math.random()
  const sorted = Array.from(arr).sort((a, b) => a - b)
  return sorted[0]
}

/** Hashing simulation -- tight integer ops */
function workHash(): number {
  let h = 0x811c9dc5
  for (let i = 0; i < 100000; i++) {
    h ^= i
    h = Math.imul(h, 0x01000193)
  }
  return h
}

/** JSON churn -- string allocation + GC pressure */
function workJsonChurn(): number {
  const data: Record<string, unknown>[] = []
  for (let i = 0; i < 200; i++) {
    data.push({ id: i, value: Math.random(), nested: { a: i, b: [1, 2, 3] } })
  }
  const json = JSON.stringify(data)
  const parsed = JSON.parse(json) as unknown[]
  return parsed.length
}

const WORKLOADS = [workMatrix, workSort, workHash, workJsonChurn]

self.onmessage = (e: MessageEvent) => {
  const { type, memoryMB, durationMs } = e.data as {
    type: 'start' | 'stop'
    memoryMB?: number
    durationMs?: number
  }

  if (type === 'start') {
    stopped = false

    // Allocate memory footprint
    try {
      buffer = new ArrayBuffer((memoryMB ?? 32) * 1024 * 1024)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < view.length; i += 4096) view[i] = 0xFF
    } catch {
      // Memory allocation failed -- continue with CPU-only load
    }

    let ops = 0
    let lastTick = performance.now()
    const startTime = performance.now()

    const loop = () => {
      if (stopped) return
      if (durationMs && performance.now() - startTime >= durationMs) {
        self.postMessage({ type: 'done', ops })
        return
      }

      // Rotate through workload types for variety
      WORKLOADS[ops % WORKLOADS.length]()
      ops++

      const now = performance.now()
      if (now - lastTick >= 1000) {
        self.postMessage({ type: 'tick', ops })
        ops = 0
        lastTick = now
      }

      setTimeout(loop, 0)
    }

    loop()
  }

  if (type === 'stop') {
    stopped = true
    buffer = null
    self.postMessage({ type: 'stopped' })
  }
}
