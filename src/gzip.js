export async function isGzip(file) {
    if (!(file instanceof Blob) || file.size < 10) return false;
    const buf = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    return (buf[0] === 0x1f && buf[1] === 0x8b);
}
export async function gunzip(file) {
    if (file instanceof Blob && await isGzip(file)) {
        const name = file.name.replace(/\.(gz|gzip)$/i,"");
        const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
        return new File([await new Response(stream).blob()], name, {type:"application/octet-stream"});
    }
    return file;
}
export async function gzip(file) {
    if (file instanceof Blob && !(await isGzip(file))) {
        const stream = new Response(file).body.pipeThrough(new CompressionStream("gzip"));
        return new File([await new Response(stream).blob()], file.name+".gz", {type:"application/gzip"});
    }
    return file;
}