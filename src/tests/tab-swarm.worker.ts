/**
 * Tab Swarm Worker — simulates a browser tab at varying intensity levels.
 * Each instance does CPU work + holds a memory buffer sized to the tab type.
 * Reports ops/sec back to the main thread every second.
 */

export type TabType = 'search' | 'docs' | 'interactive' | 'video'

let stopped = false
let buffer: ArrayBuffer | null = null

// ── Workload simulators ──────────────────────────────────────

/** Search: light JSON ops, small footprint */
function workSearch(): number {
  const data: Record<string, number> = {}
  for (let i = 0; i < 100; i++) {
    data[`q_${i}`] = Math.random()
  }
  const json = JSON.stringify(data)
  return JSON.parse(json).q_0 ?? 0
}

/** Docs: moderate string processing, simulates text editing / Wikipedia rendering */
function workDocs(): number {
  let text = ''
  for (let i = 0; i < 200; i++) {
    text += `paragraph ${i} with some content that needs layout. `
  }
  // Simulate text search / replace operations
  const words = text.split(' ')
  let count = 0
  for (const w of words) {
    if (w.length > 5) count++
  }
  // Simulate formatting passes
  text.toUpperCase()
  text.replace(/paragraph/g, 'section')
  return count
}

/** Interactive: heavy DOM-like tree manipulation (Waggle, Canvas LMS, Google Classroom) */
function workInteractive(): number {
  // Build a simulated component tree
  const nodes: { id: number; children: number[]; value: number; dirty: boolean }[] = []
  for (let i = 0; i < 300; i++) {
    nodes.push({
      id: i,
      children: i > 0 ? [Math.floor(Math.random() * i)] : [],
      value: Math.random() * 1000,
      dirty: Math.random() > 0.5,
    })
  }

  // Simulate reconciliation / diffing pass
  let updates = 0
  for (const node of nodes) {
    if (node.dirty) {
      node.value = Math.sqrt(node.value) * Math.PI
      for (const childId of node.children) {
        nodes[childId].dirty = true
      }
      updates++
    }
  }

  // Simulate serialization (state sync)
  JSON.stringify(nodes.slice(0, 50))

  // Simulate animation frame calculations
  for (let i = 0; i < 100; i++) {
    Math.sin(i * 0.1) * Math.cos(i * 0.2)
  }

  return updates
}

/** Video: sustained buffer processing, simulates decode + render pipeline */
function workVideo(): number {
  // Simulate frame decode: process a "frame buffer" of pixel data
  const frameSize = 1920 * 1080 * 4 // RGBA
  const frame = new Uint8Array(Math.min(frameSize, 65536)) // Use smaller chunk, process multiple times

  // Simulate color space conversion (YUV → RGB approximation)
  let processed = 0
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < frame.length; i += 4) {
      frame[i] = (frame[i] * 298 + 128) >> 8       // R
      frame[i + 1] = (frame[i + 1] * 516 + 128) >> 8 // G
      frame[i + 2] = (frame[i + 2] * 409 + 128) >> 8 // B
      processed++
    }
  }

  // Simulate audio buffer interleaving
  const audioSamples = new Float32Array(4096)
  for (let i = 0; i < audioSamples.length; i++) {
    audioSamples[i] = Math.sin(i * 0.01) * 0.5
  }

  return processed
}

const WORK_FN: Record<TabType, () => number> = {
  search: workSearch,
  docs: workDocs,
  interactive: workInteractive,
  video: workVideo,
}

// Delay between iterations — lighter tabs yield more often
const YIELD_MS: Record<TabType, number> = {
  search: 50,
  docs: 10,
  interactive: 2,
  video: 0,
}

// ── Message handler ──────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const { type, memoryMB, tabType } = e.data as {
    type: 'start' | 'stop'
    memoryMB?: number
    tabType?: TabType
  }

  if (type === 'start') {
    stopped = false
    const workFn = WORK_FN[tabType ?? 'docs']
    const yieldMs = YIELD_MS[tabType ?? 'docs']

    // Allocate memory to simulate tab footprint
    try {
      buffer = new ArrayBuffer((memoryMB ?? 32) * 1024 * 1024)
      const view = new Uint8Array(buffer)
      // Touch every page to force physical allocation
      for (let i = 0; i < view.length; i += 4096) {
        view[i] = 0xFF
      }
    } catch {
      // Memory allocation failed — continue with CPU-only load
    }

    let ops = 0
    let lastTick = performance.now()

    const loop = () => {
      if (stopped) return

      workFn()
      ops++

      const now = performance.now()
      if (now - lastTick >= 1000) {
        self.postMessage({ type: 'tick', ops })
        ops = 0
        lastTick = now
      }

      setTimeout(loop, yieldMs)
    }

    loop()
  }

  if (type === 'stop') {
    stopped = true
    buffer = null
    self.postMessage({ type: 'stopped' })
  }
}
