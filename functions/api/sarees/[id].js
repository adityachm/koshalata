const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
};

function isAdmin(request, env) {
  return request.headers.get('X-Admin-Secret') === env.ADMIN_SECRET;
}

function parseImgs(json) {
  try { return JSON.parse(json || '[]'); } catch { return []; }
}

async function deleteR2Images(env, urls) {
  for (const url of (urls || [])) {
    if (url && url.startsWith(env.R2_PUBLIC_URL + '/')) {
      const key = url.slice(env.R2_PUBLIC_URL.length + 1);
      try { await env.IMAGES.delete(key); } catch {}
    }
  }
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method === 'GET') {
    const saree = await env.DB.prepare('SELECT * FROM sarees WHERE id = ? AND is_active = 1').bind(id).first();
    if (!saree) return new Response('Not found', { status: 404, headers: CORS });
    const imgs = parseImgs(saree.images);
    if (saree.image_url && !imgs.includes(saree.image_url)) imgs.unshift(saree.image_url);
    return new Response(JSON.stringify({ ...saree, imageList: imgs }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!isAdmin(request, env)) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  if (request.method === 'PUT') {
    const body = await request.json();
    const { name, type, price, original_price, badge, images, description, collection, wa_message, sort_order, is_sold_out } = body;
    if (!name || !type || !price || !images || !images.length) {
      return new Response('Missing required fields', { status: 400, headers: CORS });
    }

    // Fetch current images so we can delete any that were removed
    const old = await env.DB.prepare('SELECT images, image_url FROM sarees WHERE id = ?').bind(id).first();
    const oldImgs = parseImgs(old?.images);
    if (old?.image_url && !oldImgs.includes(old.image_url)) oldImgs.push(old.image_url);
    const removed = oldImgs.filter(u => !images.includes(u));

    await env.DB.prepare(
      `UPDATE sarees SET
        name=?, type=?, price=?, original_price=?, badge=?,
        image_url=?, images=?, description=?, collection=?,
        wa_message=?, sort_order=?, is_sold_out=?
       WHERE id=?`
    ).bind(
      name, type, Number(price), original_price || null, badge || null,
      images[0], JSON.stringify(images),
      description || '', collection || 'New Arrivals',
      wa_message, sort_order || 0, is_sold_out ? 1 : 0, id
    ).run();

    await deleteR2Images(env, removed);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'DELETE') {
    const saree = await env.DB.prepare('SELECT images, image_url FROM sarees WHERE id = ?').bind(id).first();
    const imgs = parseImgs(saree?.images);
    if (saree?.image_url && !imgs.includes(saree.image_url)) imgs.push(saree.image_url);

    await env.DB.prepare('UPDATE sarees SET is_active = 0 WHERE id = ?').bind(id).run();
    await deleteR2Images(env, imgs);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
