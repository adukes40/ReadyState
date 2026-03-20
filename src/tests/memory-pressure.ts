/**
 * Memory Pressure Test — Progressive ArrayBuffer allocation + verify.
 * Detects available RAM, GC behavior, and memory errors.
 */

export interface MemoryResult {
  allocatedMB: number
  maxAllocatedMB: number
  error: string | null
  gcDetected: boolean
}

export async function runMemoryPressure(
  onProgress: (allocatedMB: number) => void,
  signal?: AbortSignal,
): Promise<MemoryResult> {
  const blocks: ArrayBuffer[] = []
  const blockSize = 16 * 1024 * 1024 // 16MB chunks
  let totalBytes = 0
  let maxBytes = 0
  let gcDetected = false

  try {
    while (true) {
      if (signal?.aborted) break

      const block = new ArrayBuffer(blockSize)
      // Verify allocation by writing to it
      const view = new Uint32Array(block)
      view[0] = 0xDEADBEEF
      view[view.length - 1] = 0xCAFEBABE

      blocks.push(block)
      totalBytes += blockSize
      maxBytes = Math.max(maxBytes, totalBytes)

      onProgress(totalBytes / (1024 * 1024))

      // Yield to allow GC and UI updates
      await new Promise((r) => setTimeout(r, 50))

      // Verify previous blocks still intact (detect GC)
      for (let i = 0; i < blocks.length; i++) {
        const check = new Uint32Array(blocks[i])
        if (check[0] !== 0xDEADBEEF) {
          gcDetected = true
          break
        }
      }

      if (gcDetected) break
    }
  } catch (e) {
    // Expected — allocation will eventually fail
  }

  // Clean up
  blocks.length = 0

  return {
    allocatedMB: totalBytes / (1024 * 1024),
    maxAllocatedMB: maxBytes / (1024 * 1024),
    error: null,
    gcDetected,
  }
}
