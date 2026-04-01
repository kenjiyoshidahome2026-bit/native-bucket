import {Bucket} from "./Bucket.js";
import {Fetch} from "./Fetch.js";
import {Cache} from "./Cache.js";
function nativeBucket(BUCKET_URL, PROXY_URL) {
	const API_BASE = `https://api.ortho-earth.com`;
	BUCKET_URL = BUCKET_URL || `${API_BASE}/bucket/`;
	PROXY_URL = PROXY_URL || `${API_BASE}/proxy`;
	return {Fetch, Bucket, Cache};
}
(typeof window === 'undefined') || (window.nativeBucket = nativeBucket);
export default nativeBucket;