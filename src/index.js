import {Bucket} from "./Bucket.js";
import {Fetch} from "./Fetch.js";
import {Cache} from "./Cache.js";
let BUCKET_URL, PROXY_URL;
function nativeBucket(bucketURL = null, proxyURL = null) {
	const API_BASE = `https://api.ortho-earth.com`;
	BUCKET_URL = bucketURL || `${API_BASE}/bucket/`;
	PROXY_URL = proxyURL || `${API_BASE}/proxy`;
	return {Fetch, Bucket, Cache};
}
(typeof window === 'undefined') || (window.nativeBucket = nativeBucket);
export default nativeBucket;