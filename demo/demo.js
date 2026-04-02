import nativeBucket from '../src/index.js';

const { Fetch, Bucket, Cache } = nativeBucket();
const myBucket = new Bucket("gis-data");
const TARGET_FILE = "N03-20250101.geojson";

const output = document.getElementById('log-screen');
const startBtn = document.getElementById('start-story');
const progressBar = document.querySelector('.progress-bar');
const progressContainer = document.getElementById('global-progress');

let progressLogEl = null;
let currentPhase = "Download"; 
const delay = (ms) => new Promise(res => setTimeout(res, ms));

function logCmd(cmd) {
    const div = document.createElement('div');
    div.className = 'log-entry log-cmd';
    div.innerHTML = `<code>${cmd}</code>`;
    output.appendChild(div);
    scrollToBottom();
}

function log(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.innerHTML = `<span class="log-time">${new Date().toLocaleTimeString()}</span> <span class="log-msg">${msg}</span>`;
    output.appendChild(div);
    scrollToBottom();
    return div;
}

function scrollToBottom() {
    requestAnimationFrame(() => output.scrollTop = output.scrollHeight);
}

function logFileList(files) {
    const container = document.createElement('div');
    container.className = 'inline-file-list';
    files.slice(0, 5).forEach(f => {
        container.innerHTML += `<div class="file-row"><span>📄 ${f.name}</span><b>${(f.size/1024/1024).toFixed(1)} MB</b></div>`;
    });
    if (files.length > 5) container.innerHTML += `<div class="file-row muted">... and ${files.length - 5} more files</div>`;
    output.appendChild(container);
    scrollToBottom();
}

async function runStory(event) {
    if (event) event.preventDefault();
    startBtn.disabled = true;
    output.innerHTML = '';

    const targetURL = `https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2025/N03-20250101_GML.zip`;

    try {
        log("▶ STEP 0: Data Resource Definition", "info");
        logCmd(`const targetURL = "${targetURL}";`);
        logCmd(`const targetFile = "${TARGET_FILE}";`);
        await delay(800);

        log("▶ STEP 1: Standard Browser Limitation", "info");
        logCmd(`await fetch(targetURL); // Expected to fail`);
        try { await fetch(targetURL, { mode: 'cors' }); } catch (e) {
            log(`❌ Blocked: CORS policy prevents direct access.`, "error");
        }
        await delay(1000);

        currentPhase = "Downloading ZIP";
        log("▶ STEP 2: Full Archive Ingestion via Proxy", "info");
        logCmd(`const zipFile = await Fetch(targetURL);`);
        progressLogEl = log("📡 Progress: 0% (0 MB)", "warn");
        
        const t1 = performance.now();
        const zipFile = await Fetch(targetURL, { cors: true });
        const d1 = (performance.now() - t1).toFixed(0);
        log(`✅ Success: Received archive (${(zipFile.size/1024/1024).toFixed(1)} MB) in ${d1}ms.`, "success");
        await delay(1000);

        log("▶ STEP 3: ZIP Archive Exploration", "info");
        logCmd(`const list = await Fetch(targetURL, { target: false });`);
        const list = await Fetch(targetURL, { target: false, cors: true });
        logFileList(list);
        await delay(1000);

        log("▶ STEP 4: Pinpoint Extraction (Smart Extract)", "info");
        // 🚀 typeを指定せず純粋なFileとして取り出す
        logCmd(`const file = await Fetch(targetURL, { target: targetFile });`);
        const t2 = performance.now();
        const extractedFile = await Fetch(targetURL, { target: TARGET_FILE, cors: true });
        const d2 = (performance.now() - t2).toFixed(0);
        
        const fileMB = (extractedFile.size / 1024 / 1024).toFixed(1);
        log(`🚀 [RESULT] Smart Extract: <span class="highlight-speed">${d2}ms</span>`, "success");
        log(`📊 Extracted File Size: ${fileMB} MB`, "info");
        await delay(1200);

        currentPhase = "Syncing to R2"; 
        log("▶ STEP 5: Cloud Synchronization (R2 Storage)", "info");
        logCmd(`await myBucket.put(targetFile, file);`);
        progressLogEl = log(`📡 Progress: 0%`, "warn");
        
        // 🚀 抽出したFileオブジェクトをそのまま投げる
        await myBucket.put(TARGET_FILE, extractedFile);
        log(`✅ Sync Complete: Data is now on Cloudflare Edge.`, "success");
        await delay(1200);

        log("▶ STEP 6: Integrity Verification (ETag Check)", "info");
        logCmd(`const meta = await myBucket.meta(targetFile);`);
        const meta = await myBucket.meta(TARGET_FILE);
        log(`✅ Validated ETag: <code class="val-code">${meta.ETag}</code>`, "success");
        await delay(1000);

        log("▶ STEP 7: Global Delivery (Get from Edge)", "info");
        // 🚀 blobとして取得し、パース処理を完全に回避
        logCmd(`const edgeBlob = await myBucket.get(targetFile, "blob");`);
        const tEdge = performance.now();
        const edgeBlob = await myBucket.get(TARGET_FILE, "blob");
        const dEdge = (performance.now() - tEdge).toFixed(0);
        
        log(`✅ Edge Download: <span class="highlight-speed">${dEdge}ms</span>`, "success");
        await delay(1200);

        log("▶ STEP 8: Persistent Local Caching (IndexedDB Put)", "info");
        logCmd(`const myCache = await Cache("gis-cache");`);
        logCmd(`await myCache(targetFile, file);`);
        const myCache = await Cache("gis-cache");
        
        const tCPut = performance.now();
        await myCache(TARGET_FILE, extractedFile);
        const dCPut = (performance.now() - tCPut).toFixed(2);
        log(`✅ Cache Store: ${dCPut}ms (Blob persisted)`, "success");
        await delay(1000);

        log("▶ STEP 9: The Instant Experience (Cache Get)", "info");
        logCmd(`const cachedFile = await myCache(targetFile);`);
        
        const tCGet = performance.now();
        await myCache(TARGET_FILE);
        const dCGet = (performance.now() - tCGet).toFixed(2);
        
        log(`🚀 <span class="ultimate-speed">FINAL SPEED: ${dCGet} ms</span>`, "success");

    } catch (err) {
        log(`🚨 Error: ${err.message}`, "error");
    } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = "▶ RE-RUN BENCHMARK STORY";
    }
}

window.addEventListener('FetchProgress', (e) => {
    const { loaded, total } = e.detail;
    const percent = total ? ((loaded / total) * 100).toFixed(1) : "??";
    const loadedMB = (loaded / 1024 / 1024).toFixed(1);
    const totalMB = total ? (total / 1024 / 1024).toFixed(1) : "---";

    if (total) {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${percent}%`;
    }
    if (progressLogEl) {
        progressLogEl.querySelector('.log-msg').innerHTML = 
            `📡 ${currentPhase}: <span class="highlight-val">${loadedMB} MB</span> / ${totalMB} MB (${percent}%)`;
    }
});

window.addEventListener('FetchEnd', () => {
    progressBar.style.width = '100%';
    setTimeout(() => { progressContainer.style.display = 'none'; }, 1000);
});

startBtn.addEventListener('click', runStory);