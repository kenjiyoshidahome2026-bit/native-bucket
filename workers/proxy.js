export async function proxy(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const mode = url.searchParams.get('mode');
    // 1. プリフライト（OPTIONS）リクエストへの回答
    if (request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': '*',
				'Access-Control-Max-Age': '86400',
			},
		});
    }
    if (!targetUrl) {
		return new Response('Error: Provide "url" parameter.', { 
			status: 400, 
			headers: { 'Access-Control-Allow-Origin': '*' } 
		});
    }
    try {
		// 2. 診断モード（mode=check）
		if (mode === 'check') {
			// HEADリクエストでヘッダー情報のみ取得
			const checkRes = await fetch(targetUrl, { method: 'HEAD' });
			const hasCors = checkRes.headers.has('access-control-allow-origin');
			const exists = checkRes.status >= 200 && checkRes.status < 300;
			// Rangeリクエスト対応の判定
			// Accept-Ranges: bytes がある、もしくは一部のサーバーではContent-Rangeを返す
			const acceptRanges = checkRes.headers.get('accept-ranges');
			const supportsRange = acceptRanges === 'bytes';
			return new Response(JSON.stringify({
				exists: exists,
				corsSafe: hasCors,
				supportsRange: supportsRange,
				status: checkRes.status,
				contentType: checkRes.headers.get('content-type'),
				contentLength: checkRes.headers.get('content-length'),
				mustUseProxy: !hasCors,
				url: targetUrl
			}), { headers: { 'Content-Type': 'application/json','Access-Control-Allow-Origin': '*' }});
		}
		// 3. 通常のプロキシ処理（Rangeヘッダーなどをそのまま転送）
		const response = await fetch(targetUrl, {
			method: request.method,
			headers: request.headers, // ブラウザからのRangeヘッダーもここに引き継がれる
			body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
		});
		const newHeaders = new Headers(response.headers);
		newHeaders.set('Access-Control-Allow-Origin', '*');
		newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		newHeaders.set('Access-Control-Allow-Headers', '*');
		newHeaders.set('Access-Control-Expose-Headers', '*');
		return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders});
    } catch (e) {
		const headers ={ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
		return new Response(JSON.stringify({ exists: false, error: e.message }), { status: 500, headers});
	}
};