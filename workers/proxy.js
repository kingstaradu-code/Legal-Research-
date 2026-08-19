addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

const ALLOW_ORIGINS = []; // e.g. ['https://kingstaradu-code.github.io'] to restrict

async function handle(req) {
  const url = new URL(req.url);
  if (url.pathname !== '/proxy') return new Response('Not found', { status: 404 });

  const target = url.searchParams.get('url');
  if (!target) return new Response('Missing url param', { status: 400 });

  // Optional origin check
  // const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  // if (ALLOW_ORIGINS.length && !ALLOW_ORIGINS.some(o => origin.startsWith(o))) return new Response('Forbidden', { status: 403 });

  try {
    const res = await fetch(target, { method: 'GET', redirect: 'follow' });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      const headers = new Headers(res.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(await res.arrayBuffer(), { status: res.status, headers });
    }

    let text = await res.text();

    // Remove scripts for safety
    text = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

    // Build base for resolving relative URLs
    let base = target;
    try {
      const u = new URL(target);
      base = u.origin + u.pathname.replace(/\/[^\/]*$/, '/');
    } catch (e) { base = target; }

    // Rewrite href/src attributes to proxy through this worker
    text = text.replace(/(href|src)=(["'])((?!https?:|data:|mailto:|#)[^"'>]+)\2/gi, (m, attr, q, link) => {
      try {
        const absolute = new URL(link, base).toString();
        const proxied = new URL('/proxy', url.origin).toString() + '?url=' + encodeURIComponent(absolute);
        return `${attr}=${q}${proxied}${q}`;
      } catch (e) {
        return m;
      }
    });

    // Also rewrite absolute links to route through proxy so navigation stays inside
    text = text.replace(/(href|src)=(["'])(https?:[^"']+)\2/gi, (m, attr, q, link) => {
      const proxied = new URL('/proxy', url.origin).toString() + '?url=' + encodeURIComponent(link);
      return `${attr}=${q}${proxied}${q}`;
    });

    // Insert banner after <body>
    const banner = `<div style="font-family:IBM Plex Mono,monospace;padding:8px;background:#f3efe8;border-bottom:1px solid #ddd;font-size:12px;color:#333;">Proxied view — source: <a href="${escapeHtml(target)}" target="_blank" rel="noopener">${escapeHtml(target)}</a></div>`;
    text = text.replace(/<body([^>]*)>/i, match => `${match}${banner}`);

    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    headers.set('X-Proxy-By', 'Legal-Research- Proxy');

    return new Response(text, { status: 200, headers });
  } catch (err) {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response('Fetch error: ' + String(err.message), { status: 502, headers });
  }
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
