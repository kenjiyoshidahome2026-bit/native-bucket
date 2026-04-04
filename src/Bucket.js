import {fname2mime} from "./fname2mime.js";
import {decodeZIP} from "./decodeZIP.js";
import {encodeZIP} from "./encodeZIP.js";
export class Bucket {
	constructor(directory, options = {}, baseUrl) {
		const globalScope = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null);
		this.url = baseUrl + directory.replace(/\/$/, "") + "/";
		this.log = !options.silent;
		this.event = (typeof CustomEvent === 'undefined)')? null: options.eventTarget || globalScope;
	}
	async _request(path, json = null) {
		const url = this.url + path.replace(/^\//, "");
		const headers = { 'Content-Type': 'application/json' };
		const options = json ? { method: 'POST', headers, body: JSON.stringify(json) } : { method: 'GET' };
		try {
			const res = await fetch(url, options);
			if (!res.ok) return null;
			const result = await res.json();
			return result.data;
		} catch (e) {
			return null;
		}
	}
	_dispatch(type, detail) { this.event && this.event.dispatchEvent(new CustomEvent(type, { detail })); }
	_log(s) { this.log && console.log(s); }
	_conv(v) { if (!v) return null;
		let { Key, Size, LastModified, ETag } = v;
		Key = Key ? Key.split("/").reverse()[0] : undefined;
		ETag = (ETag || "").replace(/"/g, "");
		return { Key, Size, LastModified, ETag };
	}
	async meta(name) {
		const res = await fetch(this.url + name + "?meta=1");
		if (!res || !res.ok) return null;
		const v = await res.json();
		if (!v || !v.data) return null;
		return this._conv(v.data);
	}
	async exist(name) { return !!(await this.meta(name)); }
	async size(name) { const q = await this.meta(name); return q ? q.Size : 0; }
	async etag(name) { const q = await this.meta(name); return q ? q.ETag : null; }
	async list() {
		let allItems = [], continuationToken = null, isTruncated = true;
		while (isTruncated) {
			const res = await this._request("", { action: 'list', continuationToken });
			if (!res) break;
			const items = (res.Contents || []).map(i => ({
				...i, Key: i.Key?.split("/").pop(), ETag: i.ETag?.replace(/"/g, "")
			}));
			allItems = allItems.concat(items);
			isTruncated = res.IsTruncated;
			continuationToken = res.NextContinuationToken;
		}
		return (allItems || []).map(i => this._conv(i));
	}
	async get(name, type = "blob") {
		this._dispatch("LoadStart", {name});
		return new Promise((resolve) => {
			const xhr = new XMLHttpRequest();
			const handleError = () => { this._dispatch("LoadError", name); resolve(null); };
			xhr.open('GET', this.url + name);
			xhr.responseType = "blob";
			xhr.onprogress = (e) => {
				const total = e.lengthComputable ? e.total : 0;
				this._dispatch("LoadProgress", { name, loaded: e.loaded, total });
				this._log(` => ${name}: ${e.loaded.toLocaleString()}${total? " / "+total.toLocaleString():""} bytes`);
			};
			xhr.onload = async () => {
				if (xhr.status !== 200) return handleError();
				let blob = xhr.response;
				this._log(` => total loaded: ${blob.size.toLocaleString()} bytes`);
				const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
				if (blob.size >= 10 && header[0] === 0x1f && header[1] === 0x8b) {
					const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
					blob = await new Response(stream).blob();
				}
				this._log(` => total expanded: ${blob.size.toLocaleString()} bytes`);
				blob = new Blob([blob],{type: fname2mime(name)});
				blob.name = name;
				this._dispatch("LoadEnd", {name, total: blob.size});
				try {
					if (type === "json") resolve(JSON.parse(await blob.text()));
					else if (type === "text") resolve(await blob.text());
					else if (type === "arrayBuffer") resolve(await blob.arrayBuffer());
					else resolve(blob);
				} catch (error) { handleError(); }
			};
			xhr.onerror = handleError;
			xhr.send();
		});
	}
	async put(name, file) { if (name instanceof Blob && name.name) [file, name] = [name, name.name];
		const compressed = ['zip','gz','7z','rar','tar','tgz','pdf','epub',
			'jpg','jpeg','png','gif','webp','mp4','mkv','mov','avi','webm','mp3','ogg','wav','flac'];
		const extension = name.split('.').pop().toLowerCase();
		const compressible = !compressed.includes(extension);
		const targetUrl = this.url + name.replace(/^\//, "");
		const sizeThreshold = 5 * 1024 * 1024; // 5MB単位
		const rawStream = file.stream();
		const reader = (compressible? rawStream.pipeThrough(new CompressionStream('gzip')): rawStream).getReader();
		let headers = { 'X-Action': 'mp-create', 'X-Metadata-Type': file.type || 'application/octet-stream' };
		if (compressible) headers['X-Content-Encoding'] = "gzip";
		const total = `${file.size.toLocaleString()}${compressible? " (compressing)":""}`; 
		const log = len => {
			this._log(` <= ${name}: ${len.toLocaleString()} / ${total} bytes`);
			this._dispatch("SaveProgress", { name, saved: len, total: file.size });
		};
		const createRes = await fetch(targetUrl, { method: 'POST', headers });
		const { uploadId } = await createRes.json();
		const parts = [];
		let partNumber = 1, done = false, buffer = new Uint8Array(0), totalUploaded = 0;
		this._dispatch("SaveStart", {name});
		while (!done) {
			const { value, done: readerDone } = await reader.read();
			if (value) {
				const newBuffer = new Uint8Array(buffer.length + value.length);
				newBuffer.set(buffer);
				newBuffer.set(value, buffer.length);
				buffer = newBuffer;
			}
			done = readerDone;
			while (buffer.length >= sizeThreshold || (done && buffer.length > 0)) {
				const isLast = done && buffer.length <= sizeThreshold;
				const sendSize = isLast ? buffer.length : sizeThreshold;
				const chunkToSend = buffer.slice(0, sendSize);
				buffer = buffer.slice(sendSize); // 残りを次へ
				headers = { 'X-Action': 'mp-upload', 'X-Upload-ID': uploadId, 'X-Part-Number': partNumber.toString() };
				const uploadRes = await fetch(targetUrl, { method: 'POST', headers, body: chunkToSend });
				if (!uploadRes.ok) throw new Error("Part upload failed");
				const { etag } = await uploadRes.json();
				parts.push({ partNumber, etag });
				log(totalUploaded += chunkToSend.length);
				partNumber++;
				if (isLast) break;
			}
		}
		headers = { 'X-Action': 'mp-complete', 'Content-Type': 'application/json' };
		const completeRes = await fetch(targetUrl, { method: 'POST', headers, body: JSON.stringify({ uploadId, parts }) });
		this._dispatch("SaveEnd", { name, total: totalUploaded });
		return completeRes.ok? totalUploaded: 0;
	}
	async del(name) {
		const url = this.url + name.replace(/^\//, "");
		const res = await fetch(url, { method: 'POST', headers: { 'X-Action': 'del' } });
		this._dispatch("Delete", name);
		return res.ok;
	}
	async move(name, newName) {
		const url = this.url + name.replace(/^\//, "");
		try {
			const headers = { 'X-Action': 'copy', 'X-Destination': encodeURIComponent(newName) };
			const res = await fetch(url, { method: 'POST', headers });
			if (res.ok) {
				await this.del(name);
				this._dispatch("Move", name);
				return true;
			}
			return false;
		} catch (e) {
			return false;
		}
	}
	async gets(name, target = null) {
		const blob = await this.get(name.replace(/\.zip/i, "") + ".zip");
		return blob? decodeZIP(blob,target): [];
	}
	async puts(name, files) {
		const blob = await encodeZIP(files);
		return this.put(new File([blob], name, {type:blob.type}));
	}
}