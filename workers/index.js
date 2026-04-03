import {proxy} from './proxy.js';
import {bucket} from './bucket.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname.startsWith('/proxy')) return proxy(request, env, ctx);
        if (url.pathname.startsWith('/bucket')) return bucket(request, env);
        
        return new Response("Not Found", { status: 404 });
    }
};