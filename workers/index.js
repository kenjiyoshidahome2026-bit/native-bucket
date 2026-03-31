import {proxy} from './proxy.js';
import {bucket} from './bucket.js';

export default {
  	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/proxy')) return proxy.fetch(request, env, ctx);
		if (url.pathname.startsWith('/bucket')) return bucket.fetch(request, env, ctx);
		return new Response("Not Found", { status: 404 });
  	}
};