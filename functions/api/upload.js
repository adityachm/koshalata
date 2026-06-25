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

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  if (!isAdmin(request, env)) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  const formData = await request.formData();
  const file = formData.get('image');
  if (!file) {
    return new Response('No image provided', { status: 400, headers: CORS });
  }

  const ext = file.name.split('.').pop().toLowerCase();
  const allowed = ['jpg', 'jpeg', 'png', 'webp'];
  if (!allowed.includes(ext)) {
    return new Response('Only JPG, PNG, or WEBP images are allowed', { status: 400, headers: CORS });
  }

  const prefix = ['sarees', 'covers'].includes(formData.get('prefix')) ? formData.get('prefix') : 'sarees';
  const key = `${prefix}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
  return new Response(JSON.stringify({ url: publicUrl }), {
    status: 201,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
