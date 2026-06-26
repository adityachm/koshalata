const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
};

function isAdmin(request, env) {
  return request.headers.get('X-Admin-Secret') === env.ADMIN_SECRET;
}

function parseImages(row) {
  let imgs = [];
  try { imgs = JSON.parse(row.images || '[]'); } catch {}
  if (!imgs.length && row.image_url) imgs = [row.image_url];
  return imgs;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM sarees WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC'
    ).all();
    const sarees = results.map(r => ({ ...r, imageList: parseImages(r) }));
    return new Response(JSON.stringify(sarees), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'POST') {
    if (!isAdmin(request, env)) {
      return new Response('Unauthorized', { status: 401, headers: CORS });
    }
    const body = await request.json();
    const { name, type, price, original_price, badge, images, description, collection, wa_message, sort_order, is_sold_out } = body;
    if (!name || !type || !price || !images || !images.length) {
      return new Response('Missing required fields', { status: 400, headers: CORS });
    }
    const waText = wa_message || `Hello Koshalata, I'm interested in the ${name}.`;
    const { meta } = await env.DB.prepare(
      `INSERT INTO sarees (name, type, price, original_price, badge, image_url, images, description, collection, wa_message, sort_order, is_sold_out)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name, type, Number(price), original_price || null, badge || null,
      images[0], JSON.stringify(images),
      description || '', collection || 'New Arrivals',
      waText, sort_order || 0, is_sold_out ? 1 : 0
    ).run();
    return new Response(JSON.stringify({ id: meta.last_row_id }), {
      status: 201,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
