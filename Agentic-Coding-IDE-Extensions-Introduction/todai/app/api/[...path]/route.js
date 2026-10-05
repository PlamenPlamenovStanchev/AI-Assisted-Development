import { queryDB } from '../../../lib/database.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request, context) {
  try {
    const { path } = await context.params;
    const [resource, id] = path;
    const method = request.method;
    if (path.length > 2) return Response.json({ error: 'Not found.' }, { status: 404 });
    const url = new URL(request.url);
    if (method !== 'GET') {
      const origin = request.headers.get('origin');
      // Next may normalize request.url to localhost. The Host header retains
      // the actual browser-facing loopback host (localhost or 127.0.0.1).
      const expectedOrigin = `${url.protocol}//${request.headers.get('host')}`;
      if ((origin && origin !== expectedOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 });
      if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'Send JSON data.' }, { status: 415 });
    }
    let body = {};
    if (method !== 'GET') {
      // Stream with a cap, rather than allocating an unbounded request body.
      const reader = request.body?.getReader(); const chunks = []; let length = 0;
      if (reader) while (true) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > 32768) { await reader.cancel(); return Response.json({ error: 'Request is too large.' }, { status: 413 }); } chunks.push(Buffer.from(value)); }
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }); }
      if (!body || Array.isArray(body) || typeof body !== 'object') return Response.json({ error: 'Invalid request.' }, { status: 400 });
    }
    let action;
    if (method === 'GET' && !id && ['dashboard', 'export'].includes(resource)) action = resource;
    else if (method === 'POST' && resource === 'demo' && !id) action = 'demo';
    else if (['tasks', 'projects', 'goals'].includes(resource)) {
      const operation = method === 'GET' && resource === 'tasks' ? (id ? 'get' : 'list') : method === 'POST' && !id ? 'create' : method === 'PATCH' && id ? 'update' : method === 'DELETE' && id ? 'delete' : null;
      if (operation) action = `${resource}.${operation}`;
    }
    if (!action) return Response.json({ error: 'Not found.' }, { status: 404 });
    const result = await queryDB(action, { id, body, query: Object.fromEntries(url.searchParams) });
    const headers = { 'Cache-Control': 'no-store' };
    if (action === 'export') headers['Content-Disposition'] = 'attachment; filename="todai-export.json"';
    return Response.json(result, { status: method === 'POST' && action !== 'demo' ? 201 : 200, headers });
  } catch (error) {
    if (!error.status) console.error(error);
    return Response.json({ error: error.status ? error.message : 'Something went wrong while saving. Please try again.' }, { status: error.status || 500 });
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
