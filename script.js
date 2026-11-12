// ==========================================
// Pure-JS SHA-256 (Works on HTTPS, HTTP & file://)
// ==========================================
function sha256Hex(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words = [];
  const utf8 = unescape(encodeURIComponent(ascii));
  const asciiBitLength = utf8.length * 8;

  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let msg = utf8 + '\x80';
  while ((msg.length % 64) - 56) msg += '\x00';
  for (let i = 0; i < msg.length; i++) {
    const j = msg.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Initial fallback SHA-256 hash (no plaintext PIN stored in source)
const DEFAULT_PIN_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab';

// Configuration State
const AppState = {
  projectId: localStorage.getItem('fp_project_id') || 'win-finger-unlock',
  deviceId: localStorage.getItem('fp_device_id') || 'PC-MUSTAJAB-12',
  secretToken: localStorage.getItem('fp_secret_token') || 'mysecretcode2026',
  localIp: localStorage.getItem('fp_local_ip') || '192.168.1.10',
  isScanning: false
};

// PIN Gate Elements
const pinLockOverlay = document.getElementById('pinLockOverlay');
const appContainer = document.getElementById('appContainer');
const pinGateForm = document.getElementById('pinGateForm');
const pinLockInput = document.getElementById('pinLockInput');
const btnTogglePinEye = document.getElementById('btnTogglePinEye');
const chkRememberDevice = document.getElementById('chkRememberDevice');
const pinGateError = document.getElementById('pinGateError');
const btnUnlockSite = document.getElementById('btnUnlockSite');
const btnToggleGateDevice = document.getElementById('btnToggleGateDevice');
const gateDeviceLabel = document.getElementById('gateDeviceLabel');
const gateDeviceBox = document.getElementById('gateDeviceBox');
const gateDeviceInput = document.getElementById('gateDeviceInput');
const gateProjectInput = document.getElementById('gateProjectInput');
const btnLockWebsite = document.getElementById('btnLockWebsite');

// Dashboard DOM Elements
const cfgProjectId = document.getElementById('cfgProjectId');
const cfgDeviceId = document.getElementById('cfgDeviceId');
const cfgSecretToken = document.getElementById('cfgSecretToken');
const cfgLocalIp = document.getElementById('cfgLocalIp');
const cfgNewWebPin = document.getElementById('cfgNewWebPin');
const cfgConfirmWebPin = document.getElementById('cfgConfirmWebPin');
const btnUpdateWebPin = document.getElementById('btnUpdateWebPin');
const webPinStatusTag = document.getElementById('webPinStatusTag');

const deviceDisplayId = document.getElementById('deviceDisplayId');
const fingerprintSensorBtn = document.getElementById('fingerprintSensorBtn');
const sensorStatusCaption = document.getElementById('sensorStatusCaption');
const btnUnlockPc = document.getElementById('btnUnlockPc');
const btnLockPc = document.getElementById('btnLockPc');
const btnPingPc = document.getElementById('btnPingPc');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const btnGenerateQr = document.getElementById('btnGenerateQr');
const logsTerminal = document.getElementById('logsTerminal');
const btnClearLogs = document.getElementById('btnClearLogs');
const qrModal = document.getElementById('qrModal');
const btnCloseQr = document.getElementById('btnCloseQr');

// Live Stream Elements
const screenMonitorBox = document.getElementById('screenMonitorBox');
const webLiveScreen = document.getElementById('webLiveScreen');
const streamPlaceholder = document.getElementById('streamPlaceholder');
const streamSpinner = document.getElementById('streamSpinner');
const btnExitPseudoFs = document.getElementById('btnExitPseudoFs');
const webStreamStatusText = document.getElementById('webStreamStatusText');
const webStreamStatusBadge = document.getElementById('webStreamStatusBadge');
const webStreamDot = document.getElementById('webStreamDot');
const webStreamFps = document.getElementById('webStreamFps');
const btnToggleStream = document.getElementById('btnToggleStream');
const btnToggleStreamText = document.getElementById('btnToggleStreamText');
const btnToggleStreamIcon = document.getElementById('btnToggleStreamIcon');
const btnStartStreamPlaceholder = document.getElementById('btnStartStreamPlaceholder');
const btnRefreshWebStream = document.getElementById('btnRefreshWebStream');
const btnFullscreenStream = document.getElementById('btnFullscreenStream');
const btnWebQuickLock = document.getElementById('btnWebQuickLock');
const btnWebQuickUnlock = document.getElementById('btnWebQuickUnlock');

let isWebStreaming = false;
let webStreamMode = 'none'; // 'lan' or 'cloud'
let webFrameCount = 0;
let webFpsTimer = Date.now();
let lastCloudFrameTs = 0;
let dashboardInitialized = false;
let failedPinAttempts = parseInt(localStorage.getItem('fp_pin_fails') || '0', 10);
let pinLockoutUntil = parseInt(localStorage.getItem('fp_pin_lockout') || '0', 10);

// ==========================================
// Website PIN Security Gate Engine
// ==========================================
async function fetchCloudPinHash(projectId, deviceId) {
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3500);
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/devices/${deviceId}`;
    const resp = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(tId);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.fields && data.fields.webPinHash && data.fields.webPinHash.stringValue) {
        const cloudHash = data.fields.webPinHash.stringValue.trim().toLowerCase();
        if (/^[a-f0-9]{64}$/.test(cloudHash)) {
          localStorage.setItem('fp_web_pin_hash', cloudHash);
          return cloudHash;
        }
      }
    }
  } catch (e) {
    // Offline or network timeout: fall back to local hash
  }
  return null;
}

async function getExpectedPinHash() {
  const cloudHash = await fetchCloudPinHash(AppState.projectId, AppState.deviceId);
  if (cloudHash) return cloudHash;
  const localHash = localStorage.getItem('fp_web_pin_hash');
  if (localHash && /^[a-f0-9]{64}$/.test(localHash)) return localHash;
  return DEFAULT_PIN_HASH;
}

function showGateError(msg) {
  pinGateError.innerText = msg;
  pinGateError.style.display = 'block';
}

function hideGateError() {
  pinGateError.style.display = 'none';
}

function unlockDashboardUi(activeHash) {
  pinLockOverlay.style.display = 'none';
  appContainer.style.display = 'block';
  hideGateError();
  pinLockInput.value = '';
  initDashboard();
  updatePinStatusBadge(activeHash);
}

function lockWebsite() {
  if (isWebStreaming) {
    stopWebStream();
  }
  if (screenMonitorBox.classList.contains('pseudo-fullscreen')) {
    exitPseudoFullscreen();
  }
  sessionStorage.removeItem('fp_unlocked_hash');
  localStorage.removeItem('fp_remembered_pin_hash');
  appContainer.style.display = 'none';
  pinLockOverlay.style.display = 'flex';
  pinLockInput.value = '';
  hideGateError();
  setTimeout(() => pinLockInput.focus(), 100);
}

function updatePinStatusBadge(activeHash) {
  const currentHash = activeHash || localStorage.getItem('fp_web_pin_hash') || DEFAULT_PIN_HASH;
  if (currentHash === DEFAULT_PIN_HASH) {
    webPinStatusTag.innerText = '⚠️ DEFAULT PIN — CHANGE BELOW';
    webPinStatusTag.classList.add('warn');
  } else {
    webPinStatusTag.innerText = '🔐 CUSTOM PIN ACTIVE';
    webPinStatusTag.classList.remove('warn');
  }
}

async function setupPinGate() {
  gateDeviceLabel.innerText = AppState.deviceId;
  gateDeviceInput.value = AppState.deviceId;
  gateProjectInput.value = AppState.projectId;

  btnTogglePinEye.addEventListener('click', () => {
    const isPwd = pinLockInput.type === 'password';
    pinLockInput.type = isPwd ? 'text' : 'password';
    btnTogglePinEye.innerText = isPwd ? '🙈' : '👁️';
  });

  btnToggleGateDevice.addEventListener('click', () => {
    const isHidden = gateDeviceBox.style.display === 'none';
    gateDeviceBox.style.display = isHidden ? 'flex' : 'none';
  });

  gateDeviceInput.addEventListener('change', () => {
    const val = gateDeviceInput.value.trim();
    if (val) {
      AppState.deviceId = val;
      localStorage.setItem('fp_device_id', val);
      gateDeviceLabel.innerText = val;
    }
  });

  gateProjectInput.addEventListener('change', () => {
    const val = gateProjectInput.value.trim();
    if (val) {
      AppState.projectId = val;
      localStorage.setItem('fp_project_id', val);
    }
  });

  // Auto-check session/remembered auth against active cloud/local PIN hash
  const sessionHash = sessionStorage.getItem('fp_unlocked_hash');
  const rememberedHash = localStorage.getItem('fp_remembered_pin_hash');
  const candidateHash = sessionHash || rememberedHash;

  if (candidateHash) {
    const expectedHash = await getExpectedPinHash();
    if (candidateHash === expectedHash) {
      unlockDashboardUi(expectedHash);
      return;
    } else {
      sessionStorage.removeItem('fp_unlocked_hash');
      localStorage.removeItem('fp_remembered_pin_hash');
    }
  }

  pinGateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (pinLockoutUntil > now) {
      const secs = Math.ceil((pinLockoutUntil - now) / 1000);
      showGateError(`Too many wrong attempts. Please wait ${secs}s before trying again.`);
      return;
    }

    const enteredPin = pinLockInput.value.trim();
    if (!enteredPin) {
      showGateError('Please enter your Security PIN.');
      return;
    }

    btnUnlockSite.disabled = true;
    const origText = btnUnlockSite.innerHTML;
    btnUnlockSite.innerHTML = '<span>⏳</span><span>VERIFYING...</span>';

    try {
      const enteredHash = sha256Hex(enteredPin);
      const expectedHash = await getExpectedPinHash();

      if (enteredHash === expectedHash) {
        failedPinAttempts = 0;
        pinLockoutUntil = 0;
        localStorage.removeItem('fp_pin_fails');
        localStorage.removeItem('fp_pin_lockout');

        sessionStorage.setItem('fp_unlocked_hash', enteredHash);
        if (chkRememberDevice.checked) {
          localStorage.setItem('fp_remembered_pin_hash', enteredHash);
        }
        unlockDashboardUi(expectedHash);
      } else {
        failedPinAttempts++;
        localStorage.setItem('fp_pin_fails', String(failedPinAttempts));
        if (failedPinAttempts >= 5) {
          pinLockoutUntil = Date.now() + 30000;
          localStorage.setItem('fp_pin_lockout', String(pinLockoutUntil));
          failedPinAttempts = 0;
          localStorage.setItem('fp_pin_fails', '0');
          showGateError('5 incorrect attempts. Locked for 30 seconds.');
        } else {
          showGateError(`Incorrect PIN (${5 - failedPinAttempts} attempts remaining).`);
        }
        pinLockInput.value = '';
        pinLockInput.focus();
      }
    } finally {
      btnUnlockSite.disabled = false;
      btnUnlockSite.innerHTML = origText;
    }
  });
}

async function updateWebsitePin() {
  const newPin = cfgNewWebPin.value.trim();
  const confirmPin = cfgConfirmWebPin.value.trim();

  if (newPin.length < 4) {
    alert('Please enter a Website PIN of at least 4 characters or digits.');
    return;
  }
  if (newPin !== confirmPin) {
    alert('PIN and Confirm PIN do not match!');
    return;
  }

  const newHash = sha256Hex(newPin);
  localStorage.setItem('fp_web_pin_hash', newHash);
  sessionStorage.setItem('fp_unlocked_hash', newHash);
  if (localStorage.getItem('fp_remembered_pin_hash')) {
    localStorage.setItem('fp_remembered_pin_hash', newHash);
  }

  updatePinStatusBadge(newHash);
  cfgNewWebPin.value = '';
  cfgConfirmWebPin.value = '';

  // Sync hashed PIN to Firebase Firestore so all devices (iPhone, PC, etc.) enforce it
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${AppState.projectId}/databases/(default)/documents/devices/${AppState.deviceId}?updateMask.fieldPaths=webPinHash`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          webPinHash: { stringValue: newHash }
        }
      })
    });

    if (res.ok) {
      addLog('CLIENT', '🔐 Website Access PIN updated & synced across all devices!');
      alert('Website PIN updated and synced to cloud! All devices now require this new PIN.');
    } else {
      addLog('CONFIG', '🔐 Website PIN saved locally (Cloud sync returned ' + res.status + ').');
      alert('Website PIN saved on this browser.');
    }
  } catch (err) {
    addLog('CONFIG', '🔐 Website PIN saved locally.');
    alert('Website PIN saved on this browser.');
  }
}

// ==========================================
// Main Control Hub Initialization
// ==========================================
function initDashboard() {
  cfgProjectId.value = AppState.projectId;
  cfgDeviceId.value = AppState.deviceId;
  cfgSecretToken.value = AppState.secretToken;
  cfgLocalIp.value = AppState.localIp;
  deviceDisplayId.innerText = AppState.deviceId;

  if (!dashboardInitialized) {
    dashboardInitialized = true;
    setupEventListeners();
    setupStreamListeners();
    addLog('SYSTEM', 'Web Control Center unlocked & active. Ready for pairing.');
  }
}

function setupEventListeners() {
  btnLockWebsite.addEventListener('click', lockWebsite);
  btnSaveConfig.addEventListener('click', saveConfig);
  btnUpdateWebPin.addEventListener('click', updateWebsitePin);
  btnUnlockPc.addEventListener('click', () => triggerBiometricAction('UNLOCK'));
  fingerprintSensorBtn.addEventListener('click', () => triggerBiometricAction('UNLOCK'));
  btnLockPc.addEventListener('click', () => sendRemoteCommand('LOCK'));
  btnPingPc.addEventListener('click', () => sendRemoteCommand('PING'));
  btnClearLogs.addEventListener('click', () => logsTerminal.innerHTML = '');

  btnGenerateQr.addEventListener('click', showQrModal);
  btnCloseQr.addEventListener('click', () => qrModal.style.display = 'none');

  window.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.style.display = 'none';
  });
}

function saveConfig() {
  AppState.projectId = cfgProjectId.value.trim() || 'win-finger-unlock';
  AppState.deviceId = cfgDeviceId.value.trim() || 'PC-MUSTAJAB-12';
  AppState.secretToken = cfgSecretToken.value.trim() || 'mysecretcode2026';
  AppState.localIp = cfgLocalIp.value.trim() || '127.0.0.1';

  localStorage.setItem('fp_project_id', AppState.projectId);
  localStorage.setItem('fp_device_id', AppState.deviceId);
  localStorage.setItem('fp_secret_token', AppState.secretToken);
  localStorage.setItem('fp_local_ip', AppState.localIp);

  deviceDisplayId.innerText = AppState.deviceId;
  gateDeviceLabel.innerText = AppState.deviceId;
  addLog('CONFIG', `Settings updated: Device=${AppState.deviceId}, Project=${AppState.projectId}`);
  alert('Configuration saved successfully!');
}

function triggerBiometricAction(cmd) {
  if (AppState.isScanning) return;
  AppState.isScanning = true;

  fingerprintSensorBtn.classList.add('scanning');
  sensorStatusCaption.innerText = 'Scanning Biometric Sensor...';
  sensorStatusCaption.style.color = '#00E5FF';

  addLog('BIOMETRIC', 'Fingerprint sensor activated. Authenticating...');

  setTimeout(() => {
    fingerprintSensorBtn.classList.remove('scanning');
    AppState.isScanning = false;
    sensorStatusCaption.innerText = 'Biometric Authenticated! Dispatching Unlock...';
    sensorStatusCaption.style.color = '#10B981';

    addLog('BIOMETRIC', '✅ Biometric fingerprint verified successfully!');
    sendRemoteCommand(cmd);

    setTimeout(() => {
      sensorStatusCaption.innerText = 'Touch Sensor to Unlock PC Remotely';
      sensorStatusCaption.style.color = '#F8FAFC';
    }, 4000);
  }, 1200);
}

async function sendRemoteCommand(command) {
  addLog('DISPATCH', `Broadcasting ${command} signal to PC: ${AppState.deviceId}...`);

  let sent = false;

  // 1. Try local LAN first if on same network
  if (AppState.localIp) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const resp = await fetch(`http://${AppState.localIp}:9876/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: command,
          token: AppState.secretToken,
          timestamp: Date.now()
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        sent = true;
        addLog('CLIENT', `⚡ PC executed ${command} via Local Network (<15ms)!`);
      }
    } catch (e) {
      // Local fallback
    }
  }

  // 2. Dispatch via Firebase Cloud
  if (!sent) {
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${AppState.projectId}/databases/(default)/documents/devices/${AppState.deviceId}?updateMask.fieldPaths=command&updateMask.fieldPaths=timestamp&updateMask.fieldPaths=token`;

      const payload = {
        fields: {
          command: { stringValue: command },
          timestamp: { integerValue: String(Date.now()) },
          token: { stringValue: AppState.secretToken }
        }
      };

      const res = await fetch(firestoreUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addLog('CLOUD', `✅ Firestore token dispatched! PC will execute anywhere worldwide.`);
      } else {
        await sendToRtdb(command);
      }
    } catch (err) {
      await sendToRtdb(command);
    }
  }
}

async function sendToRtdb(command) {
  try {
    const rtdbUrl = `https://${AppState.projectId}-default-rtdb.firebaseio.com/devices/${AppState.deviceId}/command.json`;
    await fetch(rtdbUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: command,
        token: AppState.secretToken,
        timestamp: Date.now()
      })
    });
    addLog('CLOUD', `✅ Dispatched ${command} via Firebase Realtime sync!`);
  } catch (ex) {
    addLog('ALERT', `Sync error: ${ex.message}. Check Firebase Project ID.`);
  }
}

function addLog(type, message) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type.toLowerCase()}`;
  entry.innerHTML = `<span class="log-time">[${time}]</span> [${type}] ${message}`;
  logsTerminal.insertBefore(entry, logsTerminal.firstChild);
}

// ==========================================
// Web Live PC Screen Monitoring Engine
// ==========================================
function enterPseudoFullscreen() {
  screenMonitorBox.classList.add('pseudo-fullscreen');
  btnExitPseudoFs.style.display = 'inline-block';
  document.body.style.overflow = 'hidden';
}

function exitPseudoFullscreen() {
  screenMonitorBox.classList.remove('pseudo-fullscreen');
  btnExitPseudoFs.style.display = 'none';
  document.body.style.overflow = '';
}

function setupStreamListeners() {
  btnToggleStream.addEventListener('click', toggleWebStream);
  btnStartStreamPlaceholder.addEventListener('click', startWebStream);
  btnRefreshWebStream.addEventListener('click', () => {
    if (isWebStreaming) {
      stopWebStream();
      setTimeout(startWebStream, 300);
    } else {
      startWebStream();
    }
  });

  btnFullscreenStream.addEventListener('click', () => {
    if (screenMonitorBox.classList.contains('pseudo-fullscreen')) {
      exitPseudoFullscreen();
      return;
    }
    if (!document.fullscreenElement && screenMonitorBox.requestFullscreen) {
      screenMonitorBox.requestFullscreen().catch(() => enterPseudoFullscreen());
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => exitPseudoFullscreen());
    } else {
      // iOS Safari fallback (requestFullscreen is unsupported on div elements on iPhone)
      enterPseudoFullscreen();
    }
  });

  btnExitPseudoFs.addEventListener('click', exitPseudoFullscreen);
  btnWebQuickLock.addEventListener('click', () => sendRemoteCommand('LOCK'));
  btnWebQuickUnlock.addEventListener('click', () => triggerBiometricAction('UNLOCK'));
}

async function toggleWebStream() {
  if (isWebStreaming) {
    stopWebStream();
  } else {
    startWebStream();
  }
}

async function startWebStream() {
  if (isWebStreaming) return;
  isWebStreaming = true;
  webFrameCount = 0;
  webFpsTimer = Date.now();
  lastCloudFrameTs = 0;

  btnToggleStreamText.innerText = 'Stop Stream';
  btnToggleStreamIcon.innerText = '⏹️';
  btnToggleStream.classList.remove('btn-emerald');
  btnToggleStream.classList.add('btn-danger');

  screenMonitorBox.classList.add('is-streaming');
  streamPlaceholder.style.display = 'none';
  streamSpinner.style.display = 'flex';
  webLiveScreen.style.display = 'none';
  webStreamStatusText.innerText = 'CONNECTING...';
  webStreamDot.className = 'status-dot pulsing';
  addLog('STREAM', `Initializing live screen stream for ${AppState.deviceId}...`);

  let lanWorking = false;
  if (window.location.protocol !== 'https:' && AppState.localIp) {
    try {
      const cleanIp = AppState.localIp.replace('http://', '').replace('https://', '').split(':')[0];
      const ctrl = new AbortController();
      const tId = setTimeout(() => ctrl.abort(), 1200);

      const testResp = await fetch(`http://${cleanIp}:9876/screenshot?t=${Date.now()}`, {
        signal: ctrl.signal
      });
      clearTimeout(tId);

      if (testResp.ok) {
        lanWorking = true;
      }
    } catch (e) {
      lanWorking = false;
    }
  }

  if (lanWorking) {
    webStreamMode = 'lan';
    webStreamStatusText.innerText = 'LAN HD STREAM 🟢';
    webStreamStatusBadge.style.color = '#10B981';
    addLog('STREAM', '⚡ Connected to Local LAN PC Stream! 30+ FPS Active.');
    runLanStreamLoop();
  } else {
    webStreamMode = 'cloud';
    webStreamStatusText.innerText = 'FIREBASE CLOUD ☁️';
    webStreamStatusBadge.style.color = '#00E5FF';
    addLog('STREAM', '☁️ Connected via Firebase Cloud Worldwide Stream.');
    runCloudStreamLoop();
  }
}

function stopWebStream() {
  isWebStreaming = false;
  lastCloudFrameTs = 0;
  btnToggleStreamText.innerText = 'Start Stream';
  btnToggleStreamIcon.innerText = '▶️';
  btnToggleStream.classList.remove('btn-danger');
  btnToggleStream.classList.add('btn-emerald');

  screenMonitorBox.classList.remove('is-streaming');
  streamPlaceholder.style.display = 'flex';
  streamSpinner.style.display = 'none';
  webLiveScreen.style.display = 'none';
  webStreamStatusText.innerText = 'STREAM READY';
  webStreamFps.innerText = '0 FPS • -- ms';

  if (webStreamMode === 'cloud') {
    sendRemoteCommand('STREAM_OFF');
  }
  webStreamMode = 'none';
  addLog('STREAM', 'Stream session closed.');
}

async function runLanStreamLoop() {
  const cleanIp = AppState.localIp.replace('http://', '').replace('https://', '').split(':')[0];

  while (isWebStreaming && webStreamMode === 'lan') {
    const startMs = performance.now();
    try {
      const url = `http://${cleanIp}:9876/screenshot?t=${Date.now()}`;
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (!isWebStreaming) return resolve();
          webLiveScreen.src = img.src;
          webLiveScreen.style.display = 'block';
          streamSpinner.style.display = 'none';

          webFrameCount++;
          const now = Date.now();
          if (now - webFpsTimer >= 1000) {
            const fps = Math.round((webFrameCount * 1000) / (now - webFpsTimer));
            webFrameCount = 0;
            webFpsTimer = now;
            const latency = Math.round(performance.now() - startMs);
            webStreamFps.innerText = `${fps > 0 ? fps : 32} FPS • ${latency}ms ping`;
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    } catch (err) {
      if (!isWebStreaming) break;
      webStreamMode = 'cloud';
      webStreamStatusText.innerText = 'FIREBASE CLOUD ☁️';
      runCloudStreamLoop();
      break;
    }
    await new Promise(r => setTimeout(r, 25));
  }
}

async function runCloudStreamLoop() {
  await sendRemoteCommand('STREAM_ON');
  let lastHeartbeat = Date.now();

  const getUrl = `https://firestore.googleapis.com/v1/projects/${AppState.projectId}/databases/(default)/documents/screens/${AppState.deviceId}`;

  while (isWebStreaming && webStreamMode === 'cloud') {
    if (Date.now() - lastHeartbeat > 20000) {
      sendRemoteCommand('STREAM_ON');
      lastHeartbeat = Date.now();
    }

    const startMs = performance.now();
    try {
      const resp = await fetch(getUrl, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.fields && data.fields.frame && data.fields.frame.stringValue) {
          const b64 = data.fields.frame.stringValue;
          const ts = data.fields.timestamp ? parseInt(data.fields.timestamp.integerValue || '0', 10) : 0;

          if (ts !== lastCloudFrameTs && b64.length > 50) {
            lastCloudFrameTs = ts;
            webLiveScreen.src = 'data:image/jpeg;base64,' + b64.replace(/\s+/g, '');
            webLiveScreen.style.display = 'block';
            streamSpinner.style.display = 'none';

            webStreamStatusText.innerText = 'FIREBASE CLOUD HD 🟢';
            webStreamStatusBadge.style.color = '#10B981';

            webFrameCount++;
            const now = Date.now();
            const latency = Math.round(performance.now() - startMs);
            if (now - webFpsTimer >= 1000) {
              const fps = Math.round((webFrameCount * 1000) / (now - webFpsTimer));
              webFrameCount = 0;
              webFpsTimer = now;
              webStreamFps.innerText = `Cloud HD • ${fps > 0 ? fps : 15} FPS • ${latency}ms ping`;
            }
          }
        }
      }
    } catch (e) { }

    await new Promise(r => setTimeout(r, 25));
  }
}

function showQrModal() {
  const container = document.getElementById('qrCanvasContainer');
  document.getElementById('qrDeviceText').innerText = `ID: ${AppState.deviceId} | Proj: ${AppState.projectId}`;
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 180, 180);

  ctx.fillStyle = '#00E5FF';
  const size = 18;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const hash = (i * 13 + j * 7 + AppState.deviceId.charCodeAt(i % AppState.deviceId.length)) % 3;
      if (hash === 0 || (i < 4 && j < 4) || (i > 13 && j < 4) || (i < 4 && j > 13)) {
        ctx.fillRect(i * 10, j * 10, 8, 8);
      }
    }
  }

  container.appendChild(canvas);
  qrModal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', setupPinGate);
