export async function bucket(request, env) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const bucket = env.MY_BUCKET;
    const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-Action, X-Metadata-Type, X-Destination, X-Upload-ID, X-Part-Number, X-Content-Encoding",
		"Access-Control-Expose-Headers": "Content-Length, ETag"
    };
    if (request.method === "OPTIONS") {// CORSのプリフライトリクエストに対応
      	return new Response(null, { headers: corsHeaders });
    }
    // if (request.method === "POST") { // POSTリクエストの場合はOriginチェックを行う
	// 	const origin = request.headers.get("Origin");
	// 	if (!origin||new URL(origin).hostname !== url.hostname) {
	// 		return new Response(JSON.stringify({ error: "Forbidden: Missing Origin header." }), { 
	// 			status: 403,  headers: { ...corsHeaders, "Content-Type": "application/json" } 
	// 		});
	// 	}
    // }
    // --------------------------------------------------
	try {
		if (request.method === "GET") { // ?meta=1 クエリでメタデータのみ取得
			const isMeta = url.searchParams.has("meta");
			const obj = await (isMeta ? bucket.head(path) : bucket.get(path));
			if (!obj) {
				return new Response(JSON.stringify({ data: null }), { status: 404, headers: corsHeaders });
			}
			if (isMeta) {
				const meta = { Key: obj.key, Size: obj.size, LastModified: obj.uploaded,
					ETag: (obj.httpEtag || "").replace(/"/g, ""),
					ContentEncoding: obj.httpMetadata?.contentEncoding || ""};
				return new Response(JSON.stringify({data: meta}), { headers: corsHeaders });
			}
			return new Response(obj.body, {
			headers: {
				...corsHeaders,
				"Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
				"Content-Encoding": obj.httpMetadata?.contentEncoding || "",
				"Content-Length": obj.size,
				"ETag": obj.httpEtag
			}
			});
		}
		if (request.method === "POST") { // X-Actionヘッダーで操作を指定
			const action = request.headers.get("X-Action");
			if (action === "put") { // 小さなファイルを一括でアップロード
				const contentType = request.headers.get("X-Metadata-Type") || "application/octet-stream";
				await bucket.put(path, request.body, { httpMetadata: { contentType } });
				return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
			}
			if (action === "mp-create") { // 大きなファイルを分割してアップロードするための準備
				const contentType = request.headers.get("X-Metadata-Type") || "application/octet-stream";
				const contentEncoding = request.headers.get("X-Content-Encoding");
				const upload = await bucket.createMultipartUpload(path, {
					httpMetadata: { contentType, contentEncoding }
			});
			return new Response(JSON.stringify({ uploadId: upload.uploadId }), { headers: corsHeaders });
		}
		if (action === "mp-upload") {// X-Upload-ID と X-Part-Number ヘッダーでアップロードするパートを指定
			const uploadId = request.headers.get("X-Upload-ID");
			const partNumber = parseInt(request.headers.get("X-Part-Number"));
			const upload = bucket.resumeMultipartUpload(path, uploadId);
			const part = await upload.uploadPart(partNumber, request.body);
			return new Response(JSON.stringify({ etag: part.etag }), { headers: corsHeaders });
		}
		if (action === "mp-complete") { // アップロードIDと全パートの情報を送信してマルチパートアップロードを完了
			const body = await request.json();
			const { uploadId, parts } = body;
			const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);
			const upload = bucket.resumeMultipartUpload(path, uploadId);
			await upload.complete(sortedParts);
			return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
		}
		if (action === "del") { // 単一ファイルの削除
			await bucket.delete(path);
			return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
		}
		if (action === "copy") { // X-Destination ヘッダーでコピー先のファイル名を指定
			const destName = decodeURIComponent(request.headers.get("X-Destination"));
			const obj = await bucket.get(path);
			if (!obj) throw new Error("Source not found");
			const p = path.split("/");
			p[p.length - 1] = destName;
			await bucket.put(p.join("/"), obj.body, { httpMetadata: obj.httpMetadata });
			return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
		}
		try { // パスをプレフィックスとして、オプションで continuationToken を受け取る
			const body = await request.json();
			if (body.action === "list") {
				const opt = { prefix: path || undefined, cursor: body.continuationToken || undefined };
				const list = await bucket.list(opt);
				return new Response(JSON.stringify({
				data: {
					Contents: (list.objects || []).map(o => ({ 
						Key: o.key, 
						Size: o.size, 
						LastModified: o.uploaded,
						ETag: (o.httpEtag || "").replace(/"/g, "") 
					})),
					IsTruncated: list.truncated,
					NextContinuationToken: list.cursor || null
				}
				}), { headers: corsHeaders });
			}
		} catch (e) {}
	}
	} catch (e) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
	}
	return new Response("Not Found or Method Not Allowed", { status: 405, headers: corsHeaders });
}