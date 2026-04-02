import {Bucket} from "./Bucket.js";
import {Fetch} from "./Fetch.js";
import {Cache} from "./Cache.js";
let BUCKET_URL, PROXY_URL;
function nativeBucket(apiUrl = null) {
	const API_BASE = apiUrl ||`https://api.ortho-earth.com`;
	BUCKET_URL = `${API_BASE}/bucket/`;
	PROXY_URL = `${API_BASE}/proxy/`;
	return {Fetch, Bucket, Cache};
}
(typeof window === 'undefined') || (window.nativeBucket = nativeBucket);
export default nativeBucket;