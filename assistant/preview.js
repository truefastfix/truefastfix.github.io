import api, { Session, Guard } from './worker.js';
import { SITE } from './preview-assets.js';
export { Session, Guard };
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/skyfall/')) return api.fetch(request, env, ctx);
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
    const entry = SITE[url.pathname === '/' ? '/index.html' : url.pathname];
    const headers = {'X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com https://api.web3forms.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
    if(url.pathname==='/__qa/mobile') return new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>Skyfall mobile layout check</title><style>body{margin:0;background:#18212d;color:white;font:16px sans-serif}h1{font-size:18px}iframe{display:block;width:390px;height:844px;border:1px solid #789;max-width:100vw}</style><h1>390px responsive layout check</h1><iframe title="Skyfall mobile preview" src="/?qa-embed=1"></iframe>',{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; frame-src 'self'; frame-ancestors 'none'"}});
    if(url.searchParams.get('qa-embed')==='1') headers['Content-Security-Policy']=headers['Content-Security-Policy'].replace("frame-ancestors 'none'","frame-ancestors 'self'");
    if (entry) return new Response(request.method === 'HEAD' ? null : entry.content, {headers:{...headers,'Content-Type':entry.type}});
    if (/^\/assets\/(office-hero\.webp|skyfall-mark\.png|favicon\.png)$/.test(url.pathname)) {
      const upstream = await fetch(`https://raw.githubusercontent.com/truefastfix/truefastfix.github.io/b9a9fdc83183ca510485881c9d340f9e04e2d0ef${url.pathname}`);
      return new Response(request.method === 'HEAD' ? null : upstream.body, {status:upstream.status,headers:{...headers,'Content-Type':url.pathname.endsWith('.webp')?'image/webp':'image/png','Cache-Control':'public,max-age=86400'}});
    }
    return new Response('Not found', {status:404,headers});
  },
  scheduled: api.scheduled
};
