export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const bucket = env.MY_BUCKET;

    // CORSヘッダーの設定
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Action, X-Metadata-Type, X-Destination, X-Upload-ID, X-Part-Number, X-Content-Encoding",
      "Access-Control-Expose-Headers": "Content-Length, ETag"
    };

    // プリフライトリクエストの処理
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- 【追加】POSTリクエスト時のドメイン（Origin）制限 ---
    if (request.method === "POST") {
      const origin = request.headers.get("Origin");
      if (origin) {
        const originHost = new URL(origin).hostname;
        // Worker自身のホスト名と一致しない場合は403エラー
        if (originHost !== url.hostname) {
          return new Response(JSON.stringify({ error: "Forbidden: Cross-origin POST is not allowed." }), { 
            status: 403, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }
      } else {
        // Originヘッダーがない場合（直接アクセス等）も、セキュリティ上ブロックするのが安全
        return new Response(JSON.stringify({ error: "Forbidden: Missing Origin header." }), { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }
    // --------------------------------------------------

    try {
      // --- GET: ファイル取得 & メタデータ取得 ---
      if (request.method === "GET") {
        const isMeta = url.searchParams.has("meta");
        const obj = await (isMeta ? bucket.head(path) : bucket.get(path));

        if (!obj) {
          return new Response(JSON.stringify({ data: null }), { status: 404, headers: corsHeaders });
        }

        if (isMeta) {
          return new Response(JSON.stringify({
            data: {
              Key: obj.key,
              Size: obj.size,
              LastModified: obj.uploaded,
              ETag: (obj.httpEtag || "").replace(/"/g, ""),
              ContentEncoding: obj.httpMetadata?.contentEncoding
            }
          }), { headers: corsHeaders });
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

      // --- POST: 操作系 ---
      if (request.method === "POST") {
        const action = request.headers.get("X-Action");

        // 1. 通常のアップロード (put)
        if (action === "put") {
          const contentType = request.headers.get("X-Metadata-Type") || "application/octet-stream";
          await bucket.put(path, request.body, { httpMetadata: { contentType } });
          return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
        }

        // 2. マルチパート開始 (mp-create)
        if (action === "mp-create") {
          const contentType = request.headers.get("X-Metadata-Type") || "application/octet-stream";
          const contentEncoding = request.headers.get("X-Content-Encoding");
          const upload = await bucket.createMultipartUpload(path, {
            httpMetadata: { contentType, contentEncoding }
          });
          return new Response(JSON.stringify({ uploadId: upload.uploadId }), { headers: corsHeaders });
        }

        // 3. 各パーツのアップロード (mp-upload)
        if (action === "mp-upload") {
          const uploadId = request.headers.get("X-Upload-ID");
          const partNumber = parseInt(request.headers.get("X-Part-Number"));
          const upload = bucket.resumeMultipartUpload(path, uploadId);
          const part = await upload.uploadPart(partNumber, request.body);
          return new Response(JSON.stringify({ etag: part.etag }), { headers: corsHeaders });
        }

        // 4. マルチパート完了 (mp-complete)
        if (action === "mp-complete") {
          const body = await request.json();
          const { uploadId, parts } = body;
          const sortedParts = parts.sort((a, b) => a.partNumber - b.partNumber);
          const upload = bucket.resumeMultipartUpload(path, uploadId);
          await upload.complete(sortedParts);
          return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
        }

        // 5. 削除 (del)
        if (action === "del") {
          await bucket.delete(path);
          return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
        }

        // 6. コピー (copy)
        if (action === "copy") {
          const destName = decodeURIComponent(request.headers.get("X-Destination"));
          const obj = await bucket.get(path);
          if (!obj) throw new Error("Source not found");
          const p = path.split("/");
          p[p.length - 1] = destName;
          await bucket.put(p.join("/"), obj.body, { httpMetadata: obj.httpMetadata });
          return new Response(JSON.stringify({ data: "ok" }), { headers: corsHeaders });
        }

        // 7. 一覧取得 (list)
        try {
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
};