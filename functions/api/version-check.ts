/**
 * Version Check Worker — looks up board version info from KV.
 */

interface Env {
  VERSION_CACHE: KVNamespace
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const board = url.searchParams.get('board')

  if (!board) {
    return new Response(JSON.stringify({ error: 'board parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const cached = await env.VERSION_CACHE.get(`board:${board}`, 'json')
  if (!cached) {
    return new Response(JSON.stringify({ error: 'Board not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  return new Response(JSON.stringify(cached), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
