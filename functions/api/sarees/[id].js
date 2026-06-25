const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
};

function isAdmin(request, env) {
  return request.headers.get('X-Admin-Secret') === env.ADMIN_SECRET;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!isAdmin(request, env)) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  if (request.method === 'PUT') {
    const body = await request.json();
    const { name, type, price, original_price, badge, images, description, collection, wa_message, sort_order } = body;
    if (!name || !type || !price || !images || !images.length) {
      return new Response('Missing required fields', { status: 400, headers: CORS });
    }
    await env.DB.prepare(
      `UPDATE sarees SET
        name=?, type=?, price=?, original_price=?, badge=?,
        image_url=?, images=?, description=?, collection=?,
        wa_message=?, sort_order=?
       WHERE id=?`
    ).bind(
      name, type, Number(price), original_price || null, badge || null,
      images[0], JSON.stringify(images),
      description || '', collection || 'New Arrivals',
      wa_message, sort_order || 0, id
    ).run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('UPDATE sarees SET is_active = 0 WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
