/**
 * Speed Test Worker — download/upload payload endpoint.
 * GET ?ping=1 → empty response for latency measurement
 * GET ?size=N → streamed blob of N bytes for download test
 * POST → accept upload payload, return byte count
 */

export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url)

  // CORS preflight for upload POST
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method === 'POST') {
    const body = await request.arrayBuffer()
    return new Response(JSON.stringify({ bytes: body.byteLength }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  if (url.searchParams.has('ping')) {
    return new Response('', {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  const size = parseInt(url.searchParams.get('size') ?? '1000000', 10)
  const clampedSize = Math.min(size, 10_000_000) // Cap at 10MB

  // Use a small pre-generated chunk repeated via a stream.
  // This avoids the slow crypto.getRandomValues loop on the edge.
  const CHUNK_SIZE = 16384
  const chunk = new Uint8Array(CHUNK_SIZE)
  crypto.getRandomValues(chunk)

  let bytesSent = 0
  const stream = new ReadableStream({
    pull(controller) {
      const remaining = clampedSize - bytesSent
      if (remaining <= 0) {
        controller.close()
        return
      }
      const toSend = Math.min(CHUNK_SIZE, remaining)
      controller.enqueue(toSend === CHUNK_SIZE ? chunk : chunk.slice(0, toSend))
      bytesSent += toSend
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(clampedSize),
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}
