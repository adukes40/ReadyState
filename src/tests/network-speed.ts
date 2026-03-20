/**
 * Network Speed Test — XHR blob download/upload to Cloudflare Worker endpoint.
 * Measures download Mbps, upload Mbps, and latency ms.
 */

export interface SpeedResult {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
}

export async function runSpeedTest(endpoint: string): Promise<SpeedResult> {
  // Latency — small fetch round-trip
  const latencyStart = performance.now()
  await fetch(`${endpoint}?ping=1`, { cache: 'no-store' })
  const latencyMs = performance.now() - latencyStart

  // Download — fetch a blob payload
  const dlStart = performance.now()
  const dlRes = await fetch(`${endpoint}?size=5000000`, { cache: 'no-store' })
  const dlBlob = await dlRes.blob()
  const dlTime = (performance.now() - dlStart) / 1000
  const downloadMbps = (dlBlob.size * 8) / (dlTime * 1_000_000)

  // Upload — POST a blob
  const uploadData = new Uint8Array(2_000_000)
  crypto.getRandomValues(uploadData)
  const ulStart = performance.now()
  await fetch(endpoint, { method: 'POST', body: uploadData, cache: 'no-store' })
  const ulTime = (performance.now() - ulStart) / 1000
  const uploadMbps = (uploadData.byteLength * 8) / (ulTime * 1_000_000)

  return { downloadMbps, uploadMbps, latencyMs }
}
