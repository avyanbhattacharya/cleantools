---
render: true
title: QR & Barcode Scanner Architecture
description: On-device QR and barcode decoding architecture and trust boundaries.
route: /docs/architecture/qr-scanner/
index: false
section: Architecture
---

# QR & Barcode Scanner Architecture

The QR & Barcode Scanner reads QR codes and barcodes from an uploaded picture or from the device camera. Decoding happens entirely in the browser: a picture is drawn to a canvas and decoded locally, first with the browser's built-in code detector when one exists, otherwise with a small QR decoder bundled into the page.

## Current scope

- A user uploads a picture (PNG, JPG, GIF, WebP, BMP; up to 15 MB), drags one onto the dropzone, or pastes one from the clipboard.
- A user can instead start the camera; frames are sampled about three times per second and decoded on the device until a code is found or the session is stopped.
- Camera startup is generation-guarded: leaving the camera tab, pressing stop, or tapping Start again while the permission prompt is still open cancels the pending startup, and a stream granted after cancellation is released immediately instead of starting in a hidden panel.
- Each new upload supersedes decodes still in flight from older selections, so only the latest selection can update the result, error, or empty state.
- The result shows the decoded text, the detected format, and three actions: copy the text, open it when it is an http(s) link, or download it as a `.txt` file.
- Decoded text is rendered as plain text, never as HTML, so a hostile code payload cannot inject markup or script into the page.

Camera scanning is the newest and least predictable input path, so upload-a-picture is the primary, most reliable flow. 1D barcode formats (EAN, UPC, Code 128 and friends) are read only where the browser ships a built-in detector; everywhere else the bundled decoder reads QR codes. The page states the device's actual format support in a support note rather than promising universal decoding.

## Privacy boundary

Pictures and camera frames are handled only in browser memory and on a canvas. The scanner makes no API request, has no account or analytics, and sends nothing to a server. The QR decoder is vendored into the repository (`qr-scanner/vendor/jsqr.min.js`, Apache-2.0, see `THIRD-PARTY-NOTICES.txt`), so unlike the QR Code Maker's CDN-loaded library it introduces no new network behavior and keeps working offline.

The product claim is therefore specific: **your files never leave your machine while using the scanner.** The camera stream stays inside the tab: nothing is recorded, and closing the tab or pressing stop ends the session immediately. Camera access requires a secure page (https or localhost) and the user's explicit permission.

## Verification

Static checks enforce the local-only architecture, the route and catalog entries, the sitemap, and the homepage card. Browser coverage uploads real QR fixtures and verifies the decoded text, the no-native-detector fallback path, the open-link branch, the failure messages for blank and non-image files, copy and download of results, mobile viewport containment, and decoding with the network unavailable. Camera coverage installs a fake camera (a canvas stream painted with a fixture, since headless CI browsers have no capture device) and verifies the start/stop session, the permission-denied message, decoding of camera frames through a mocked native detector, decoding of a real QR code from live frames through the bundled decoder, that a camera granted after leaving the tab is released rather than started in the hidden panel, that double-tapping Start while the prompt is open yields exactly one live stream, that an older upload resolving after a newer one cannot overwrite the result, and that no network request leaves the page during scanning. Existing cross-browser route smoke tests include `/qr-scanner/`.

When changing this tool, retain its hard boundaries: no network transport of pictures or frames, no new third-party network loads, bounded input size and scan rate, decoded payloads rendered as text only, and links opened only for explicit http(s) URLs.
