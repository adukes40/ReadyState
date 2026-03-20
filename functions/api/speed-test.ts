/**
 * Speed Test Worker — download/upload payload endpoint.
 * GET ?ping=1 → empty response for latency measurement
 * GET ?size=N → random blob of N bytes for download test
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
  const payload = new Uint8Array(clampedSize)
  crypto.getRandomValues(payload)

  return new Response(payload, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  })
}
