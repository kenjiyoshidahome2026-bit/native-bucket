# nativeBucket.js

A lightweight, high-performance web storage and utility library.  
**Extremely small footprint (~6.6KB Gzipped) with zero external dependencies.**

## 🚀 Key Features

* **Zero Dependencies**: Pure JavaScript implementation, no external bloat.
* **Ultra Lightweight**: Optimized for CDN distribution and fast loading.
* **All-in-One Utility**:
    * **Fetch**: Smart proxy handling, automatic Gzip decompression, and direct ZIP entry extraction.
    * **Bucket**: R2/S3 compatible storage operations including listing, multipart uploads, and moving files.
    * **Cache**: High-speed browser-side file caching using IndexedDB.
    * **ZIP Support**: Built-in high-performance compression and decompression.

## [🚀 Live Demo (Performance Story)](https://kenjiyoshidahome2026-bit.github.io/native-bucket/demo/)

## 🏗 System Architecture
![Architecture](etc/architecture.png)

## 📦 Quick Start (CDN)

Simply include the library via a single script tag in your HTML:

```html
<script src="https://api.ortho-earth.com/native-bucket.js"></script>
<script>
  // Initialize with your custom API endpoints
  const { Fetch, Bucket, Cache } = nativeBucket([your worker address]);

  // Example: List files from a bucket
  const myBucket = new Bucket("my-folder");
  myBucket.list().then(console.log);
</script>
```

## 🛠 Usage Examples

### 1. Bucket Operations (Cloudflare R2 / S3)
The library automatically handles multipart uploads for files larger than 5MB to ensure reliability.

```javascript
const storage = new Bucket("assets");

// Upload a file (automatically compresses text-based files)
await storage.put("document.pdf", fileBlob);

// Retrieve a file as a specific type (blob, json, text, arrayBuffer)
const data = await storage.get("config.json", "json");

// Delete a file
await storage.del("document.pdf");
```

### 2. Advanced Fetching
Fetch files through a proxy to bypass CORS or extract specific files from a remote ZIP archive without downloading the entire package.

```javascript
// Extract only 'logo.png' from a remote ZIP file
const logoBlob = await Fetch("[https://example.com/archive.zip](https://example.com/archive.zip)", {
  target: "logo.png",
  type: "blob"
});
```

### 3. Local Caching
Persist large files or data blobs in the user's browser using IndexedDB for near-instant retrieval.

```javascript
const myCache = await Cache("app-data");

// Cache a file
await myCache("header-video", videoBlob);

// Retrieve from cache
const cachedVideo = await myCache("header-video");
```

## 🏗 Development & Build

Ensure you have Node.js installed. The project uses Vite for building and Terser for advanced minification.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (outputs to /dist)
npm run build
```
## Technical Highlights
* Proxy-Aware Fetching: Automatically detects and resolves CORS issues.
* Virtual ZIP File System: Direct access to ZIP entries without full extraction.
* R2 Optimized Storage: Automatic Gzip and Multipart Upload for large payloads.
* IndexedDB Sync: Seamless bridge between Cloud storage and Local cache.

## 📄 License

(c) 2026 Kenji Yoshida. Released under the **MIT License**.