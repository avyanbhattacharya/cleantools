const { test, expect } = require('@playwright/test');
const fs = require('fs');

const TEXT_FIXTURE = 'tests/fixtures/qr-scanner-text.png';
const URL_FIXTURE = 'tests/fixtures/qr-scanner-url.png';
const BLANK_FIXTURE = 'tests/fixtures/qr-scanner-blank.png';
const PDF_FIXTURE = 'tests/fixtures/sample.pdf';

// The headless-shell Chromium CI uses cannot open a capture device, so camera
// tests install a fake camera: getUserMedia returns a canvas stream painted
// with a fixture image. Frames are real pixels, decoded through the real path.
// PLAYWRIGHT_CHROMIUM_PATH lets a local run point at a system Chromium;
// when unset, Playwright uses its downloaded browser build as usual.
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
  },
  permissions: ['camera']
});

function fixtureDataUrl(path) {
  return 'data:image/png;base64,' + fs.readFileSync(path).toString('base64');
}

// Installs getUserMedia backed by a canvas stream before page scripts run.
async function useFakeCamera(page, fixture = TEXT_FIXTURE) {
  await page.addInitScript((dataUrl) => {
    window.__fakeCameraReady = (async () => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const stream = canvas.captureStream(10);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: async () => stream },
        configurable: true
      });
    })();
  }, fixtureDataUrl(fixture));
}

async function upload(page, fixture) {
  await page.goto('/qr-scanner/');
  // The file input is visually hidden behind the dropzone; reveal it for the test driver.
  await page.$eval('#fileInput', el => el.removeAttribute('hidden'));
  await page.locator('#fileInput').setInputFiles(fixture);
}

test('uploading a QR picture decodes it on the device', async ({ page }) => {
  await upload(page, TEXT_FIXTURE);
  await expect(page.locator('#resultCard')).toBeVisible();
  await expect(page.locator('#resultFormat')).toContainText('QR code');
  await expect(page.locator('#resultText')).toContainText('CLEAN-LOCAL-TOOLS-QR-SCANNER-TEST');
});

test('bundled decoder reads QR codes when the browser has no native detector', async ({ page }) => {
  await page.addInitScript(() => {
    delete window.BarcodeDetector;
  });
  await upload(page, TEXT_FIXTURE);
  await expect(page.locator('#resultCard')).toBeVisible();
  await expect(page.locator('#resultText')).toContainText('CLEAN-LOCAL-TOOLS-QR-SCANNER-TEST');
});

test('a QR code holding a link offers to open it', async ({ page }) => {
  await upload(page, URL_FIXTURE);
  await expect(page.locator('#resultCard')).toBeVisible();
  await expect(page.locator('#resultText')).toContainText('https://cleanlocaltools.com/qr-scanner/');
  await expect(page.locator('#openLinkBtn')).toBeVisible();
  await expect(page.locator('#openLinkBtn')).toHaveAttribute('href', 'https://cleanlocaltools.com/qr-scanner/');
});

test('a picture without a code explains the failure', async ({ page }) => {
  await upload(page, BLANK_FIXTURE);
  await expect(page.locator('#resultCard')).toBeHidden();
  await expect(page.locator('#uploadError')).toContainText('No QR code or barcode was found');
});

test('a non-picture file is rejected before decoding', async ({ page }) => {
  await upload(page, PDF_FIXTURE);
  await expect(page.locator('#resultCard')).toBeHidden();
  await expect(page.locator('#uploadError')).toContainText('not a picture');
});

test('decoded text can be copied and downloaded', async ({ page }) => {
  await upload(page, TEXT_FIXTURE);
  await expect(page.locator('#resultCard')).toBeVisible();
  await page.locator('#copyBtn').click();
  await expect(page.locator('#copyStatus')).toContainText('Copied.');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#downloadBtn').click()
  ]);
  expect(download.suggestedFilename()).toBe('scanned-code.txt');
});

test('camera tab starts and stops the scanning session', async ({ page }) => {
  await useFakeCamera(page);
  await page.goto('/qr-scanner/');
  await page.evaluate(() => window.__fakeCameraReady);
  await page.locator('#tabCamera').click();
  await expect(page.locator('#panelCamera')).toBeVisible();
  await page.locator('#startCameraBtn').click();
  await expect(page.locator('#videoWrap')).toBeVisible();
  await expect(page.locator('#cameraStatus')).toContainText('Point the camera');
  await page.locator('#stopCameraBtn').click();
  await expect(page.locator('#videoWrap')).toBeHidden();
  await expect(page.locator('#cameraStatus')).toContainText('Camera is off.');
});

// Installs getUserMedia whose permission grant is held until the test releases
// it, so the "prompt open" window can be exercised deterministically.
async function useControllableCamera(page) {
  await page.addInitScript(() => {
    window.__grantedStreams = [];
    let resolveGrant;
    window.__grantCameraPromise = new Promise((res) => { resolveGrant = res; });
    window.__resolveCameraGrant = () => resolveGrant();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () => {
          await window.__grantCameraPromise;
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          // Paint once so the capture stream carries real frames and the
          // video element can start playing.
          canvas.getContext('2d').fillRect(0, 0, 64, 64);
          const stream = canvas.captureStream(10);
          window.__grantedStreams.push(stream);
          return stream;
        }
      },
      configurable: true
    });
  });
}

async function liveStreamCount(page) {
  return page.evaluate(() =>
    window.__grantedStreams.filter((s) => s.getTracks().some((t) => t.readyState === 'live')).length
  );
}

test('a camera granted after leaving the tab is released, not started', async ({ page }) => {
  await useControllableCamera(page);
  await page.goto('/qr-scanner/');
  await page.locator('#tabCamera').click();
  await page.locator('#startCameraBtn').click();
  await expect(page.locator('#cameraStatus')).toContainText('Requesting camera access');
  // Leave the camera tab while the permission prompt is still open.
  await page.locator('#tabUpload').click();
  await expect(page.locator('#panelCamera')).toBeHidden();
  // Grant permission now: the stream must be torn down, never published.
  await page.evaluate(() => window.__resolveCameraGrant());
  await page.waitForFunction(() => window.__grantedStreams.length === 1);
  await page.waitForFunction(() =>
    window.__grantedStreams[0].getTracks().every((t) => t.readyState === 'ended')
  );
  await expect(page.locator('#videoWrap')).toBeHidden();
  const srcObject = await page.evaluate(() => document.getElementById('video').srcObject);
  expect(srcObject).toBeNull();
  await expect(page.locator('#cameraError')).toBeHidden();
});

test('tapping start twice while the prompt is open starts only one session', async ({ page }) => {
  await useControllableCamera(page);
  await page.goto('/qr-scanner/');
  await page.locator('#tabCamera').click();
  await page.locator('#startCameraBtn').click();
  await page.locator('#startCameraBtn').click();
  await page.evaluate(() => window.__resolveCameraGrant());
  await expect(page.locator('#videoWrap')).toBeVisible();
  await page.waitForFunction(() => window.__grantedStreams.length === 2);
  expect(await liveStreamCount(page)).toBe(1);
  await page.locator('#stopCameraBtn').click();
  await page.waitForFunction(() =>
    window.__grantedStreams.every((s) => s.getTracks().every((t) => t.readyState === 'ended'))
  );
  await expect(page.locator('#videoWrap')).toBeHidden();
});

test('an older upload resolving after a newer one does not overwrite the result', async ({ page }) => {
  // Hold every native detection behind a test-controlled promise so the two
  // selections can be ordered: older first, newer resolved first. The
  // headless shell has no BarcodeDetector, so install a stub class.
  await page.addInitScript(() => {
    window.__pendingDetects = [];
    window.BarcodeDetector = class {
      detect() {
        return new Promise((resolve) => window.__pendingDetects.push(resolve));
      }
      static async getSupportedFormats() { return ['qr_code']; }
    };
  });
  await page.goto('/qr-scanner/');
  await page.$eval('#fileInput', el => el.removeAttribute('hidden'));
  await page.locator('#fileInput').setInputFiles(TEXT_FIXTURE);
  await page.waitForFunction(() => window.__pendingDetects.length === 1);
  await page.locator('#fileInput').setInputFiles(URL_FIXTURE);
  await page.waitForFunction(() => window.__pendingDetects.length === 2);
  // The newer selection's decode finishes first.
  await page.evaluate(() => window.__pendingDetects[1]([{ rawValue: 'NEWER-RESULT', format: 'qr_code' }]));
  await expect(page.locator('#resultText')).toContainText('NEWER-RESULT');
  // The older selection's decode finishes last: it must be ignored.
  await page.evaluate(() => window.__pendingDetects[0]([{ rawValue: 'OLDER-RESULT', format: 'qr_code' }]));
  // The stale continuation after a detection resolves is promise-driven only
  // (no timers or I/O), so flushing microtask turns deterministically lets it
  // run before asserting it changed nothing.
  await page.evaluate(() => new Promise((resolve) => {
    let i = 0;
    const tick = () => { if (++i >= 50) resolve(); else queueMicrotask(tick); };
    queueMicrotask(tick);
  }));
  await expect(page.locator('#resultText')).toContainText('NEWER-RESULT');
  await expect(page.locator('#resultText')).not.toContainText('OLDER-RESULT');
  await expect(page.locator('#uploadError')).toBeHidden();
});

test('decoding keeps working with the network unavailable', async ({ page, context }) => {
  await page.goto('/qr-scanner/');
  await context.setOffline(true);
  try {
    await page.$eval('#fileInput', el => el.removeAttribute('hidden'));
    await page.locator('#fileInput').setInputFiles(TEXT_FIXTURE);
    await expect(page.locator('#resultCard')).toBeVisible();
    await expect(page.locator('#resultText')).toContainText('CLEAN-LOCAL-TOOLS-QR-SCANNER-TEST');
  } finally {
    await context.setOffline(false);
  }
});

test('denied camera permission explains the fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const err = new DOMException('Permission denied', 'NotAllowedError');
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(err) },
      configurable: true
    });
  });
  await page.goto('/qr-scanner/');
  await page.locator('#tabCamera').click();
  await page.locator('#startCameraBtn').click();
  await expect(page.locator('#cameraError')).toContainText('Camera access was denied');
  await expect(page.locator('#cameraStatus')).toContainText('Camera is off.');
});

test('camera frames decode through a native detector when one exists', async ({ page }) => {
  await useFakeCamera(page);
  await page.addInitScript(() => {
    window.BarcodeDetector = class {
      constructor(opts) { window.__detectorFormats = opts && opts.formats; }
      async detect() { return [{ rawValue: 'NATIVE-CAMERA-TEST', format: 'qr_code' }]; }
      static async getSupportedFormats() { return ['qr_code', 'ean_13']; }
    };
  });
  await page.goto('/qr-scanner/');
  await page.evaluate(() => window.__fakeCameraReady);
  await expect(page.locator('#supportNote')).toContainText('QR code');
  await page.locator('#tabCamera').click();
  await page.locator('#startCameraBtn').click();
  await expect(page.locator('#resultCard')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#resultFormat')).toContainText('QR code');
  await expect(page.locator('#resultText')).toContainText('NATIVE-CAMERA-TEST');
  // A successful scan stops the camera on its own.
  await expect(page.locator('#videoWrap')).toBeHidden();
  const formats = await page.evaluate(() => window.__detectorFormats);
  expect(formats).toContain('qr_code');
});

test('camera frames decode a real QR code through the bundled decoder', async ({ page }) => {
  await page.addInitScript(() => {
    delete window.BarcodeDetector;
  });
  await useFakeCamera(page, TEXT_FIXTURE);
  await page.goto('/qr-scanner/');
  await page.evaluate(() => window.__fakeCameraReady);
  await page.locator('#tabCamera').click();
  await page.locator('#startCameraBtn').click();
  await expect(page.locator('#resultCard')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#resultFormat')).toContainText('QR code');
  await expect(page.locator('#resultText')).toContainText('CLEAN-LOCAL-TOOLS-QR-SCANNER-TEST');
  // A successful scan stops the camera on its own.
  await expect(page.locator('#videoWrap')).toBeHidden();
});

test('decoding makes no network requests', async ({ page }) => {
  const external = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^https?:\/\//i.test(url) && !url.startsWith('http://127.0.0.1:4173/')) external.push(url);
  });
  await useFakeCamera(page);
  await upload(page, TEXT_FIXTURE);
  await expect(page.locator('#resultCard')).toBeVisible();
  await page.evaluate(() => window.__fakeCameraReady);
  await page.locator('#tabCamera').click();
  await page.locator('#startCameraBtn').click();
  await expect(page.locator('#videoWrap')).toBeVisible();
  await page.locator('#stopCameraBtn').click();
  expect(external).toEqual([]);
});

test('scanner stays within the viewport on mobile-sized layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/qr-scanner/');
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(m.sw - m.cw).toBeLessThanOrEqual(2);
});
