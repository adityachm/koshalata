const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
};

function isAdmin(request, env) {
  return request.headers.get('X-Admin-Secret') === env.ADMIN_SECRET;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    results.forEach(r => { obj[r.key] = r.value; });
    return new Response(JSON.stringify(obj), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'PUT') {
    if (!isAdmin(request, env)) return new Response('Unauthorized', { status: 401, headers: CORS });
    const { key, value } = await request.json();
    if (!key || value === undefined) return new Response('Bad request', { status: 400, headers: CORS });

    // If replacing hero_image, delete the old file from R2
    if (key === 'hero_image') {
      const old = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
      if (old?.value && old.value.startsWith(env.R2_PUBLIC_URL + '/')) {
        const oldKey = old.value.slice(env.R2_PUBLIC_URL.length + 1);
        try { await env.IMAGES.delete(oldKey); } catch {}
      }
    }

    await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .bind(key, value).run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
