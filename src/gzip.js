export async function isGzip(file) {
    if (!(file instanceof Blob) || file.size < 10) return false;
    const buf = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    return (buf[0] === 0x1f && buf[1] === 0x8b);
}
export async function gunzip(file) {
    if (!(file instanceof Blob) || !(await isGzip(file))) return file;
    const name = file.name.replace(/\.(gz|gzip)$/i, "");
    const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
    try { const blob = await new Response(stream).blob();
        return new File([blob], name, { type: "application/octet-stream" });
    } catch (e) {
        console.error("解凍エラー: メモリ不足の可能性があります", e);
        throw e;
    }
}
export async function gzip(file) { cponsole.log("gzip");
    if (!(file instanceof Blob) || (await isGzip(file))) return file;
    const stream = file.stream().pipeThrough(new CompressionStream("gzip"));
    try { const blob = await new Response(stream).blob();
        return new File([blob], file.name + ".gz", { type: "application/gzip" });
    } catch (e) {
        console.error("圧縮エラー: メモリ不足の可能性があります", e);
        throw e;
    }
}