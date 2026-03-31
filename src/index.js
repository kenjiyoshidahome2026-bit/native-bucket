import {Bucket} from "./Bucket.js";
import {Fetch} from "./Fetch.js";
import {Cache} from "./Cache.js";
function nativeBucket(BUCKET_URL, PROXY_URL) {
	BUCKET_URL = BUCKET_URL || `https://bucket.ortho-earth.com/`;
	PROXY_URL = PROXY_URL || `https://proxy.ortho-earth.com/`;
	return {Fetch,Bucket,Cache};
}
(typeof window === 'undefined') || (window.nativeBucket = nativeBucket);
export default nativeBucket;