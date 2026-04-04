import { Bucket as _Bucket } from "./Bucket.js";
import { Fetch as _Fetch } from "./Fetch.js";
import { Cache } from "./Cache.js";

function nativeBucket(apiUrl = null) {
    const API_BASE = apiUrl || `https://api.ortho-earth.com`;
    const BUCKET_URL = `${API_BASE}/bucket/`;
    const PROXY_URL = `${API_BASE}/proxy/`;

    return {
        // FetchとBucketにURLを「閉じ込めて」から返す
        Fetch: (url, opt = {}) => _Fetch(url, opt, PROXY_URL),
        Bucket: (dir, opts = {}) => _Bucket(dir, opts, BUCKET_URL),
        Cache
    };
}

const target = (typeof window === 'undefined') ? (typeof self === 'undefined') ? null : self : window;
if (target) target.nativeBucket = nativeBucket;

export default nativeBucket;