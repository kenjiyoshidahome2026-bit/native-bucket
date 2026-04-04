import { Bucket as _Bucket } from "./Bucket.js";
import { Fetch as _Fetch } from "./Fetch.js";
import { Cache } from "./Cache.js";
function nativeBucket(apiUrl = null) {
    const API_BASE = apiUrl || `https://api.ortho-earth.com`;
    return {
        Fetch: (url, opt = {}) => _Fetch(`${API_BASE}/proxy/`, url, opt),
        Bucket: (dir, opts = {}) => _Bucket(`${API_BASE}/bucket/`, dir, opts),
        Cache
    };
}

const target = (typeof window === 'undefined') ? (typeof self === 'undefined') ? null : self : window;
if (target) target.nativeBucket = nativeBucket;
export default nativeBucket;