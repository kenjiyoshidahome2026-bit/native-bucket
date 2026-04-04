# native-bucket.js (v1.0.0)

A high-performance bridge between **Cloudflare Edge (R2/Workers)** and **Browser Storage (IndexedDB)**. Optimized for handling heavy binary datasets (GIS, archives, large assets) with zero-latency interaction.

[![Cloudflare Workers](https://img.shields.io/badge/Powered_by-Cloudflare_Workers-F38020?logo=cloudflare-workers&logoColor=white)](https://workers.cloudflare.com/)
[![Vite](https://img.shields.io/badge/Build_with-Vite-646CFF?logo=vite&logoColor=white)](<https://vitejs.dev/>)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Size](https://img.shields.io/badge/Size-6.6KB-brightgreen.svg)

---

## 🏗 System Architecture

![Architecture](etc/architecture.png)
*Orchestration of data flow across Remote Servers, Edge Proxies, R2 Buckets, and Local Persistent Cache.*

---

## 🎮 Live Demo

Experience the zero-latency data flow and surgical ZIP extraction in action:
**[👉 View Live Demo](https://kenjiyoshidahome2026-bit.github.io/native-bucket/demo/)**

---

## 🚀 Server-Side Setup (Cloudflare Workers)

### 1. Configuration (`wrangler.toml`)

Deploy the backend to handle R2 operations and Proxy requests. The `index.js` automatically manages CORS for you.

```toml
name = "native-bucket-api"
main = "index.js"
compatibility_date = "2026-04-01"

[[r2_buckets]]
# [DO NOT CHANGE] Internal binding for the library
binding = "MY_BUCKET"
# [REQUIRED] Your actual R2 bucket name
bucket_name = "my-r2-storage"

[vars]
# [WHITELIST] Comma-separated domains (Suffix matching supported)
# Example: "ortho-earth.com,localhost:5173" allows all subdomains of ortho-earth.
ALLOWED_DOMAINS = "ortho-earth.com,localhost:5173"
```

### 2. Deployment

```bash
cd workers
npx wrangler deploy
```

---

## 🛠 Client-Side Setup

### Option A: ESM (Modern Bundlers)

```javascript
import nativeBucket from './src/index.js';
```

### Option B: CDN / Global Script (The Easiest Way)

The library automatically attaches to `window.nativeBucket` (or `self.nativeBucket`) for non-ESM or direct HTML environments.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kenjiyoshidahome2026-bit/native-bucket@latest/src/index.js"></script>
<script>
  window.addEventListener('load', () => { // Access via global nativeBucket after page load
    const { Fetch, Bucket, Cache } = nativeBucket("https://your-worker.dev/");
    ...
   });
</script>
```

---

## 📖 Detailed API Reference

### Initialization

Register your Worker endpoint to unlock the three core modules.

```javascript
const { Fetch, Bucket, Cache } = nativeBucket("https://your-worker.workers.dev/");
```

### 🌐 `Fetch(url, options)`

A smart proxy that bypasses CORS and can surgically extract specific files from remote ZIP archives.

| Parameter | Type | Description |
| :--- | :---: | :--- |
| `type` | String | Output format: `"file"` (Default), `"blob"`, `"json"`, `"text"`. |
| `cors` | Boolean | true/false: pre-flight check widthout this parameter |
| `target` | String | Path inside the ZIP to extract a specific file. |
| `encoding` | String | encoding (default:`"utf8"`) |
| `silent` | Boolean | if true then no progress log |
| `eventTarget` | dom | target of event (default: window or self[webWorker]) |

```javascript
// get en entire renote zip file
const zip = await Fetch("https://server.com/data.zip");
console.log(`Received: ${zip.name} (${zip.size} bytes)`);

// Extract a file from remote ZIP as JSON widthout pre-flight.
const json = await Fetch("https://server.com/data.zip", { target: "layers/japan.geojson" ,cords:true, type:"json"});
console.log(`Received: `, json);
```

### 🪣 `Bucket(directory, options)`

High-level interface for Cloudflare R2. Features automatic Gzip detection and parallelized Multipart uploads for files >5MB.

| Parameter | Type | Description |
| :--- | :---: | :--- |
| `silent` | Boolean | if true then no progress log |
| `eventTarget` | dom | target of event (default: window or self[webWorker]) |

```javascript
const storage = await Bucket("v1/geodata");
const file = new File(["This is a file"], "test.txt", {type:"text/plain"});

// Upload a File object (Auto-handles multipart if large)
await storage.put(file);

// Download as a File object (Auto-decompressed if Gzipped)
const file = await storage.get("test.txt");

// get meta information from the File. (size, ETag etc.)
const meta = await storage.meta("test.txt");

// Rename file
await storage.move("test.txt", "text.old.txt");

// delete file
await del.move("text.old.txt");

// List items in the directory
const files = await storage.list();

// read a zip file as a files
const strage.gets("name");

// put a zip file from fileArray
const strage.puts(fileArray);
```

### ⚡ `Cache(name)`

A persistent Key-Value file store powered by IndexedDB. Perfect for instant subsequent loads with **n-ms network latency**.

```javascript
// open the database with "dbName/TblName"
const local = await Cache("assets/v1");

// List names in database
const list = await local();

// Load the File object instantly (Getter)
const file = await local("tile_01");

// Save a File locally (Setter)
await local(file); // or await save(file.name, file)
```

---

## 🔒 Security: Suffix-Matching Whitelist

Access is strictly enforced via the `ALLOWED_DOMAINS` whitelist in `wrangler.toml`.

- **`ortho-earth.com`** matches `ortho-earth.com`, `www.ortho-earth.com`, `dev.ortho-earth.com`, etc.
- **`localhost:5173`** allows access from your local dev-server.

---

## 📄 License

(c) 2026 Kenji Yoshida. Released under the **MIT License**.
