export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const testPw = url.searchParams.get('pw');
  return new Response(JSON.stringify({
    hasAdminSecret: !!env.ADMIN_SECRET,
    secretLength: env.ADMIN_SECRET ? env.ADMIN_SECRET.length : 0,
    hasR2Url: !!env.R2_PUBLIC_URL,
    pwMatches: testPw !== null ? (testPw === env.ADMIN_SECRET) : 'not tested',
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
