import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'

const port = Number(process.env.PORT ?? 4000)
const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
const maxBodyBytes = 32_000

function writeJson(response: ServerResponse, status: number, body: unknown, requestId: string) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Request-Id', requestId)
  response.end(JSON.stringify(body))
}

function securityHeaders(response: ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  response.setHeader('Access-Control-Allow-Credentials', 'true')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Idempotency-Key')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
}

async function readBody(request: IncomingMessage) {
  let total = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    const data = Buffer.from(chunk)
    total += data.byteLength
    if (total > maxBodyBytes) throw new Error('payload too large')
    chunks.push(data)
  }
  if (total === 0) return null
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

const server = createServer(async (request, response) => {
  const requestId = randomUUID()
  securityHeaders(response)
  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (request.method === 'GET' && url.pathname === '/health') {
    writeJson(response, 200, { status: 'ok', service: 'vyora-api-scaffold' }, requestId)
    return
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/status') {
    writeJson(response, 200, { status: 'scaffold', realtime: 'not-connected', database: 'not-connected' }, requestId)
    return
  }

  // Deliberately fail closed until the authenticated database-backed handlers are installed.
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      try { await readBody(request) } catch {
        writeJson(response, 413, { error: { code: 'invalid_payload', message: 'Request payload is invalid.', requestId } }, requestId)
        return
      }
    }
    writeJson(response, 501, { error: { code: 'not_connected', message: 'This API route is not connected in the local preview.', requestId } }, requestId)
    return
  }

  writeJson(response, 404, { error: { code: 'not_found', message: 'Not found.', requestId } }, requestId)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`VYORA API scaffold listening on 0.0.0.0:${port}`)
})
