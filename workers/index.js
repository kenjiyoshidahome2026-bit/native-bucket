import { getCorsHeaders } from './cors.js';
import { proxy } from './proxy.js';
import { bucket } from './bucket.js';
export default {
  async fetch(req, env) {
    const h = getCorsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    try {
      const { pathname } = new URL(req.url);
      const res = pathname.startsWith('/bucket') ? await bucket(req, env.MY_BUCKET) :
                  pathname.startsWith('/proxy') ? await proxy(req) :null;
      if (!res) return new Response("Not Found", { status: 404, headers: h });
      const out = new Response(res.body, res);
      h.forEach((v, k) => out.headers.set(k, v));
      return out;
    } catch (e) { return new Response(e.message, { status: 500, headers: h }); }
  }
};