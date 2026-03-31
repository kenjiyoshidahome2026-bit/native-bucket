# nativeBucket.js

A lightweight, high-performance web storage & utility library.  
**Extremely small footprint (~6.6KB Gzipped).**

## 🚀 Key Features
- **Zero Dependencies**: Pure JavaScript, no external bloat.
- **Ultra Lightweight**: Only 6.6KB, perfect for CDN distribution.
- **All-in-One Utility**:
  - **Fetch**: Smart proxy handling and direct ZIP entry fetching.
  - **Bucket**: R2/S3 compatible storage operations (List, Put, Get, Del).
  - **Cache**: Fast browser-side file caching using IndexedDB.
  - **ZIP Support**: Built-in compression/decompression.

## 📦 Quick Start (CDN)
Just add this single line to your HTML:

```html
<script src="[https://your-domain.pages.dev/my-module.js](https://your-domain.pages.dev/my-module.js)"></script>
<script>
  const { Fetch, Bucket, Cache } = nativeBucket();

  // Example: List files from a bucket
  const myBucket = new Bucket("my-folder");
  myBucket.list().then(console.log);
</script>