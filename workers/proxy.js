/**
 * workers/proxy.js
 * * 機能:
 * 1. CORS回避プロキシ
 * 2. ヘッダーのクレンジング (1バイト取得バグの防止)
 * 3. ターゲットの生存・Range・CORS対応状況の事前チェック
 */
export async function proxy(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const mode = url.searchParams.get('mode');

    // ターゲットサーバーに送っても安全・有益なヘッダーのホワイトリスト
    const SAFE_HEADERS = [
        'accept', 
        'accept-encoding', 
        'accept-language', 
        'content-type', 
        'range', 
        'cache-control',
        'if-modified-since',
        'if-none-match'
    ];

    // 1. CORSのプリフライト(OPTIONS)リクエストへの即答
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
        // 2. 事前チェックモード (mode=check)
        if (mode === 'check') {
            const checkRes = await fetch(targetUrl, { method: 'HEAD' });
            const hasCors = checkRes.headers.has('access-control-allow-origin');
            const exists = checkRes.status >= 200 && checkRes.status < 300;
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

        // 3. プロキシ転送実行
        // 🚀 ブラウザからのヘッダーを掃除して、ターゲットサーバーを混乱させないようにする
        const filteredHeaders = new Headers();
        for (const [key, value] of request.headers.entries()) {
            if (SAFE_HEADERS.includes(key.toLowerCase())) {
                filteredHeaders.set(key, value);
            }
        }
        
        // プロフェッショナルなリクエストとして User-Agent を偽装せず明示
        filteredHeaders.set('User-Agent', 'nativeBucket-Proxy/1.1');

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: filteredHeaders,
            body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : null,
        });

        // 4. レスポンスヘッダーの再構築 (ブラウザでCORSエラーにならないように)
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        newHeaders.set('Access-Control-Allow-Headers', '*');
        newHeaders.set('Access-Control-Expose-Headers', '*');

        return new Response(response.body, { 
            status: response.status, 
            statusText: response.statusText, 
            headers: newHeaders
        });

    } catch (e) {
        const headers ={ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
        return new Response(JSON.stringify({ exists: false, error: e.message }), { status: 500, headers});
    }
};