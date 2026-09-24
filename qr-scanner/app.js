'use strict';
/* QR & Barcode Scanner: everything below runs on the visitor's device.
   Pictures and camera frames are decoded on a canvas and never uploaded. */
(function () {
  const $ = (id) => document.getElementById(id);

  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const MAX_DIMENSION = 4096;
  const SCAN_INTERVAL_MS = 350;

  const FORMAT_LABELS = {
    aztec: 'Aztec code', code_128: 'Code 128', code_39: 'Code 39', code_93: 'Code 93',
    codabar: 'Codabar', data_matrix: 'Data Matrix', ean_13: 'EAN-13', ean_8: 'EAN-8',
    itf: 'ITF', pdf417: 'PDF417', qr_code: 'QR code', upc_a: 'UPC-A', upc_e: 'UPC-E',
    micro_qr_code: 'Micro QR code', rm_qr_code: 'rMQR code', maxi_code: 'MaxiCode'
  };
  const labelFor = (format) => FORMAT_LABELS[format] || 'Code';

  const tabUpload = $('tabUpload');
  const tabCamera = $('tabCamera');
  const panelUpload = $('panelUpload');
  const panelCamera = $('panelCamera');
  const fileInput = $('fileInput');
  const dropzone = $('dropzone');
  const uploadError = $('uploadError');
  const startCameraBtn = $('startCameraBtn');
  const stopCameraBtn = $('stopCameraBtn');
  const videoWrap = $('videoWrap');
  const video = $('video');
  const cameraStatus = $('cameraStatus');
  const cameraError = $('cameraError');
  const resultCard = $('resultCard');
  const resultFormat = $('resultFormat');
  const resultText = $('resultText');
  const copyBtn = $('copyBtn');
  const copyStatus = $('copyStatus');
  const openLinkBtn = $('openLinkBtn');
  const downloadBtn = $('downloadBtn');
  const supportNote = $('supportNote');

  const hasNativeDetector = typeof window.BarcodeDetector === 'function';
  let nativeFormats = null;
  let cameraStream = null;
  let scanTimer = null;
  // Generation counter for camera startup: each startCamera() captures the
  // current generation, and stopCamera() increments it. An async startup step
  // that resolves after its generation was invalidated (tab switch, another
  // start, or stop while the permission prompt was open) must tear down its
  // own stream and never publish it as the active session.
  let cameraGeneration = 0;
  // Request counter for uploads: each new selection invalidates decodes still
  // in flight from older selections, so only the latest selection updates the page.
  let uploadRequestId = 0;

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }
  function clearError(el) {
    el.textContent = '';
    el.hidden = true;
  }

  function describeSupport() {
    if (hasNativeDetector) {
      const list = (nativeFormats || ['qr_code']).map(labelFor).join(', ');
      supportNote.textContent =
        'This browser can decode the following code types on this device: ' + list + '.';
    } else {
      supportNote.textContent =
        'This browser decodes QR codes with the scanner\u2019s built-in decoder. ' +
        'Traditional barcodes need a browser with a built-in code detector (recent Chrome, Edge, or Samsung Internet).';
    }
  }

  async function detectNativeFormats() {
    if (!hasNativeDetector) return;
    try {
      if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
        nativeFormats = await window.BarcodeDetector.getSupportedFormats();
      }
    } catch (err) {
      nativeFormats = null;
    }
  }

  function decodeWithJsQR(imageData) {
    if (typeof window.jsQR !== 'function') return null;
    try {
      const code = window.jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) return { text: code.data, format: 'qr_code' };
    } catch (err) {
      /* fall through to no-result */
    }
    return null;
  }

  async function decodeImageData(imageData) {
    if (hasNativeDetector) {
      try {
        const detector = new window.BarcodeDetector({
          formats: nativeFormats && nativeFormats.length ? nativeFormats : ['qr_code']
        });
        const codes = await detector.detect(imageData);
        if (codes && codes.length && codes[0].rawValue) {
          return { text: codes[0].rawValue, format: codes[0].format || 'qr_code' };
        }
      } catch (err) {
        /* a detector failure falls back to the bundled QR decoder below */
      }
    }
    return decodeWithJsQR(imageData);
  }

  function drawToWorkCanvas(source, sw, sh) {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(source, 0, 0, w, h);
    return canvas.getContext('2d').getImageData(0, 0, w, h);
  }

  async function handleImageSource(source, sw, sh) {
    const imageData = drawToWorkCanvas(source, sw, sh);
    return decodeImageData(imageData);
  }

  function showResult(text, format) {
    // Decoded payloads are untrusted input: render as plain text only.
    resultFormat.textContent = labelFor(format);
    resultText.textContent = text;
    copyStatus.textContent = '';
    if (/^https?:\/\//i.test(text.trim())) {
      openLinkBtn.href = text.trim();
      openLinkBtn.hidden = false;
    } else {
      openLinkBtn.hidden = true;
    }
    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleFile(file) {
    clearError(uploadError);
    resultCard.hidden = true;
    // This selection supersedes any decode still in flight from an older one.
    const requestId = ++uploadRequestId;
    const isCurrent = () => requestId === uploadRequestId;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError(uploadError, 'That file is not a picture. Choose a PNG, JPG, GIF, WebP, or BMP image of the code.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError(uploadError, 'That picture is larger than 15 MB. Try a smaller image or take a closer photo of the code.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const found = await handleImageSource(img, img.naturalWidth, img.naturalHeight);
        // An older selection's decode resolving after a newer one must not
        // overwrite the newer result, error, or empty state.
        if (!isCurrent()) return;
        if (found) {
          showResult(found.text, found.format);
        } else {
          showError(uploadError, 'No QR code or barcode was found in that picture. Try a sharper, closer, upright photo of the code.');
        }
      } catch (err) {
        if (!isCurrent()) return;
        showError(uploadError, 'That picture could not be read. Try a different image file.');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (!isCurrent()) return;
      showError(uploadError, 'That picture could not be opened. Try a different image file.');
    };
    img.src = url;
  }

  // ---- tabs ----
  function selectTab(which) {
    const upload = which === 'upload';
    tabUpload.setAttribute('aria-selected', String(upload));
    tabCamera.setAttribute('aria-selected', String(!upload));
    panelUpload.hidden = !upload;
    panelCamera.hidden = upload;
    if (upload) stopCamera();
  }
  tabUpload.addEventListener('click', () => selectTab('upload'));
  tabCamera.addEventListener('click', () => selectTab('camera'));

  // ---- upload input ----
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((name) =>
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((name) =>
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove('drag');
    })
  );
  dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer && event.dataTransfer.files[0];
    handleFile(file);
  });
  document.addEventListener('paste', (event) => {
    if (panelUpload.hidden) return;
    const items = (event.clipboardData && event.clipboardData.items) || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFile(file);
        event.preventDefault();
        return;
      }
    }
  });

  // ---- camera ----
  async function startCamera() {
    clearError(cameraError);
    resultCard.hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError(cameraError, 'This browser cannot open the camera here. Camera access needs a secure page (https or localhost) and a browser with camera support; uploading a picture works instead.');
      return;
    }
    // Stop any live session and invalidate any startup still awaiting its
    // permission prompt, so a second tap cannot leak a duplicate stream.
    stopCamera();
    const generation = ++cameraGeneration;
    cameraStatus.textContent = 'Requesting camera access\u2026';
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
    } catch (err) {
      // Superseded while the prompt was open (tab switch, stop, or a newer
      // start): stay silent so the current state is not clobbered.
      if (generation !== cameraGeneration) return;
      cameraStatus.textContent = 'Camera is off.';
      if (err && err.name === 'NotAllowedError') {
        showError(cameraError, 'Camera access was denied. Allow camera access in your browser\u2019s site settings, or upload a picture of the code instead.');
      } else {
        showError(cameraError, 'The camera could not be started. Uploading a picture of the code works instead.');
      }
      return;
    }
    if (generation !== cameraGeneration) {
      // The user left the camera tab or stopped while the prompt was open:
      // release the granted stream immediately instead of starting it in a
      // hidden panel.
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    cameraStream = stream;
    video.srcObject = cameraStream;
    try {
      await video.play();
    } catch (err) {
      // Only tear down when this startup is still the active one; a newer
      // session must not be disturbed by an older play() rejection.
      if (generation !== cameraGeneration) return;
      stopCamera();
      showError(cameraError, 'The camera stream could not be played. Uploading a picture of the code works instead.');
      return;
    }
    videoWrap.hidden = false;
    startCameraBtn.disabled = true;
    stopCameraBtn.disabled = false;
    cameraStatus.textContent = 'Point the camera at a QR code or barcode. Scanning stays on this device.';
    scanTimer = setInterval(scanCameraFrame, SCAN_INTERVAL_MS);
  }

  async function scanCameraFrame() {
    if (!cameraStream || video.readyState < 2 || scanCameraFrame.busy) return;
    scanCameraFrame.busy = true;
    // Capture the stream this frame belongs to: a stop during the async
    // decode must not publish a stale result or disturb the newer state.
    const stream = cameraStream;
    try {
      const found = await handleImageSource(video, video.videoWidth, video.videoHeight);
      if (found && stream === cameraStream) {
        showResult(found.text, found.format);
        stopCamera();
      }
    } catch (err) {
      /* keep the loop alive through transient frame errors */
    } finally {
      scanCameraFrame.busy = false;
    }
  }

  function stopCamera() {
    // Invalidate any camera startup still awaiting its permission prompt.
    cameraGeneration++;
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    video.srcObject = null;
    videoWrap.hidden = true;
    startCameraBtn.disabled = false;
    stopCameraBtn.disabled = true;
    if (!panelCamera.hidden) cameraStatus.textContent = 'Camera is off.';
  }

  startCameraBtn.addEventListener('click', startCamera);
  stopCameraBtn.addEventListener('click', stopCamera);
  window.addEventListener('pagehide', stopCamera);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopCamera();
  });

  // ---- result actions ----
  copyBtn.addEventListener('click', async () => {
    const text = resultText.textContent;
    try {
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = 'Copied.';
    } catch (err) {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        copyStatus.textContent = 'Copied.';
      } catch (fallbackErr) {
        copyStatus.textContent = 'Copy failed. Select the text above and copy it manually.';
      }
      area.remove();
    }
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([resultText.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scanned-code.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  detectNativeFormats().then(describeSupport);
  describeSupport();
})();
