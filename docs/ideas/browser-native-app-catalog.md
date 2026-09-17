# Browser-native app ideas

Status: idea catalog only. Nothing in this document is a commitment or a roadmap.

Clean Local Tools should organize tools by the job a person wants done, not by implementation technology. Browser technologies such as WebAssembly, WebGPU, workers, WebRTC, WebCodecs, and local AI are useful implementation notes and should remain secondary.

## Current product baseline

Existing tools already cover:

- PDF and print: Compress PDF, Merge PDF, Split PDF, Image to PDF, Clean PDF Printer, Clean HTML Printer.
- Photos and images: Free Passport Photo Maker, Photo to Scan, Resize Image, Document Flattener, HEIC to JPG, Remove Photo Metadata.
- Everyday utilities: QR Code Maker, Touchless Japa Counter, Tap Japa Counter.

## Recommended public categories

1. **PDF & Print** - prepare, combine, print, and convert documents.
2. **Photos & Images** - scan, resize, clean, format, and protect images.
3. **Files & Data** - work with personal files, tables, search, and local records.
4. **Audio & Video** - trim, convert, clean, and create media.
5. **Everyday Tools** - small focused utilities such as QR and counters.
6. **Labs** - clearly marked desktop-first or experimental tools, including local AI, hardware access, browser compute, and peer-to-peer experiments.

This keeps the homepage understandable today. A tool may use AI or WebAssembly without being placed in a separate AI or WebAssembly category. Labs should not distract from reliable, phone-friendly utilities.

## Sequencing principle

Prefer small, dependable, privacy-first tools that share existing browser capabilities and can be tested on desktop and mobile. Treat Local AI Lab as an experiment until it proves a smooth device and model experience; do not make AI the near-term dependency for the rest of the site.

## Full idea catalog

### PDF & Print

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| DocMerge | Local PDF merge, split, redact, and OCR toolkit. | PDFium/WASM; Tesseract.js; selected local files only. |
| Print Layout Maker | Lay out photos, labels, cards, or documents precisely on standard paper. | Canvas/SVG composition; browser print styles; local output. |

### Photos & Images

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| Background Eraser | Remove a photo background and export transparent PNG. | Local segmentation model in a worker; WebGPU/WASM where supported. |
| Batch Resize | Resize and compress many images at once. | Worker pool, OffscreenCanvas, progress and local downloads. |
| PhotoVault | Local photo organizer with tags and fast search. | User-selected folder; thumbnails in workers; OPFS-backed local index. |
| PixelForge | Layer-based raster editor with filters and brushes. | Canvas/OffscreenCanvas; WASM only for per-pixel operations. |
| VectorCraft | Simple vector editor for paths, shapes, and SVG export. | TypeScript scene graph; resvg-wasm for preview/export. |

### Files & Data

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| SheetLocal | Open local CSV/XLSX files and query them with SQL. | SheetJS + DuckDB-WASM or SQLite/WASM in a worker. |
| BigScatter | Explore million-row local data with fast scatter plots and heatmaps. | DuckDB-WASM plus WebGPU rendering; desktop-first. |
| GrepLocal | Search a selected local code or text folder in parallel. | File System Access API plus worker pool and WASM matcher. |
| LocalNotes | Local-first notes with full-text search and no account. | Selected folder; Markdown/plain files; OPFS SQLite FTS index. |
| LedgerLocal | Offline personal-finance tracker from bank CSV files. | Local SQLite/OPFS, rule-based categories, no statement uploads. |

### Audio & Video

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| ClipTrim | Trim, crop, and compress local video without upload. | WebCodecs + mp4box.js/webm-muxer in workers; desktop-first. |
| GifSmith | Convert a local video clip into an optimized animated GIF. | WebCodecs, worker palette quantization, GIF WASM encoder. |
| PodClean | Remove background noise and normalize voice recordings. | Web Audio + RNNoise WASM + offline render. |
| BeatLab | Lightweight step sequencer for music sketches. | AudioWorklets, Web Audio scheduling, offline WAV render. |
| ThumbFarm | Create preview sprite sheets from many local videos. | Worker pool, WebCodecs, OffscreenCanvas; desktop-first. |

### Everyday Tools

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| RecipeBox | Offline recipe manager and installable cookbook. | IndexedDB/OPFS, cached images, PWA. |
| TaskOffline | Simple offline task manager with explicit export/import. | IndexedDB, service worker, no automatic cloud sync. |
| FieldLog | Offline form and survey tool for field collection. | PWA, IndexedDB queue, Background Sync where supported. |

### Labs: Local AI and browser compute

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| Local AI Lab / ChatLocal | Private on-device chat with downloadable local models. | WebLLM + WebGPU; cache models locally; explicitly report unsupported devices. |
| WhisperNote | Local voice-to-text notes and recordings. | Whisper ONNX or whisper.cpp in a worker. |
| SmartSummarize | Summarize pasted text or selected documents locally. | Small local model, chunking in a worker. |
| ParticleForge | Generative art and particle simulations. | WGSL WebGPU compute and render pipelines. |
| RayView | Progressive path tracer for simple scenes or local glTF files. | WebGPU compute shader; desktop-first. |
| MonteCarloLab | Local financial/risk simulation with live charts. | Worker pool, SharedArrayBuffer, COOP/COEP headers. |
| CADSketch | Minimal parametric 2D/3D CAD tool. | opencascade.js; high-complexity, later idea. |
| RetroArcade | Emulator hub for user-provided ROMs. | EmulatorJS/libretro WASM; legal sensitivity, not a current priority. |

### Labs: Local device and developer tools

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| SerialScope | Live plotter for microcontroller sensor data. | Web Serial API and lightweight Canvas chart. |
| BLEInspector | Explore BLE GATT services and characteristics. | Web Bluetooth; browser/device support varies. |
| FlashPad | Flash user-provided firmware onto supported boards. | Web Serial + esptool-js; explicit safety confirmation. |
| MidiMapper | Map MIDI controls to on-screen actions. | Web MIDI and IndexedDB/localStorage. |

### Labs: Browser-to-browser collaboration

| Idea | What it does | Implementation notes |
| --- | --- | --- |
| DropWire | Direct browser-to-browser file transfer. | WebRTC data channels; minimal signaling only, never file storage. |
| MeetSmall | Small group video calls. | WebRTC mesh; requires signaling and often TURN for reliability. |
| BoardSync | Peer-synced collaborative whiteboard. | Yjs + y-webrtc; optional local export. |
| WhisperChat | Ephemeral peer-to-peer private text chat. | WebRTC data channels plus WebCrypto key exchange. |

## Near-term opportunity filter

Before building an idea, require:

- a clear one-sentence user job;
- completely local processing with no account or backend;
- an MVP that works without AI;
- a credible mobile or desktop support statement;
- a narrow test plan.

High-complexity or dependency-heavy tools belong in Labs until they earn a place in the main catalog.
