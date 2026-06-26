const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (!isAdmin(request, env)) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  // Collect every URL the DB knows about
  const { results: sarees } = await env.DB.prepare(
    'SELECT image_url, images FROM sarees'
  ).all();

  const { results: settings } = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'hero_image'"
  ).all();

  const referencedUrls = new Set();

  for (const s of sarees) {
    if (s.image_url) referencedUrls.add(s.image_url);
    try {
      const imgs = JSON.parse(s.images || '[]');
      imgs.forEach(u => u && referencedUrls.add(u));
    } catch {}
  }

  for (const s of settings) {
    if (s.value) referencedUrls.add(s.value);
  }

  // List all R2 objects (handle pagination)
  const allKeys = [];
  let listed = await env.IMAGES.list();
  allKeys.push(...listed.objects.map(o => o.key));
  while (listed.truncated) {
    listed = await env.IMAGES.list({ cursor: listed.cursor });
    allKeys.push(...listed.objects.map(o => o.key));
  }

  // Find orphans — keys with no matching DB URL
  const prefix = env.R2_PUBLIC_URL + '/';
  const referencedKeys = new Set(
    [...referencedUrls]
      .filter(u => u && u.startsWith(prefix))
      .map(u => u.slice(prefix.length))
  );

  const toDelete = allKeys.filter(k => !referencedKeys.has(k));

  for (const key of toDelete) {
    try { await env.IMAGES.delete(key); } catch {}
  }

  return new Response(JSON.stringify({ deleted: toDelete.length, keys: toDelete }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
