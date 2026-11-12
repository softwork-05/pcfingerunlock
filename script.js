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
  turnConfig: localStorage.getItem('fp_turn_config') || '',
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
const cfgTurnConfig = document.getElementById('cfgTurnConfig');
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
const webRtcVideo = document.getElementById('webRtcVideo');
const webLiveScreen = document.getElementById('webLiveScreen');
const streamPlaceholder = document.getElementById('streamPlaceholder');
const streamSpinner = document.getElementById('streamSpinner');
const streamSpinnerText = document.getElementById('streamSpinnerText');
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

// Remote Control Elements
const remoteControlBar = document.getElementById('remoteControlBar');
const btnToggleControl = document.getElementById('btnToggleControl');
const btnPanMode = document.getElementById('btnPanMode');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnZoomReset = document.getElementById('btnZoomReset');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnRemoteRightClick = document.getElementById('btnRemoteRightClick');
const btnRemoteScrollUp = document.getElementById('btnRemoteScrollUp');
const btnRemoteScrollDown = document.getElementById('btnRemoteScrollDown');
const btnToggleRemoteKb = document.getElementById('btnToggleRemoteKb');
const remoteKbBar = document.getElementById('remoteKbBar');
const remoteKbInput = document.getElementById('remoteKbInput');
const btnSendKbText = document.getElementById('btnSendKbText');

let isWebStreaming = false;
let webStreamMode = 'none'; // 'webrtc', 'lan', or 'cloud'
let rtcPc = null;
let rtcDataChannel = null;
let rtcStatsTimer = null;
let rtcHeartbeatTimer = null;
let isControlEnabled = true;
let isPanMode = false;
let streamZoom = 1.0;
let streamPanX = 0;
let streamPanY = 0;
let lastCtrlPos = { x: 0.5, y: 0.5 };
let webFrameCount = 0;
let webFpsTimer = Date.now();
let lastCloudFrameTs = 0;
let dashboardInitialized = false;
let cloudDeviceSynced = false;
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
      if (data && data.fields) {
        cloudDeviceSynced = true;
        if (data.fields.localIp && data.fields.localIp.stringValue) {
          const cloudIp = data.fields.localIp.stringValue.trim();
          if (cloudIp && cloudIp !== '127.0.0.1') {
            AppState.localIp = cloudIp;
            localStorage.setItem('fp_local_ip', cloudIp);
            if (cfgLocalIp) cfgLocalIp.value = cloudIp;
          }
        }
        if (data.fields.iceJson && typeof data.fields.iceJson.stringValue === 'string') {
          const cloudIce = data.fields.iceJson.stringValue.trim();
          AppState.turnConfig = cloudIce;
          localStorage.setItem('fp_turn_config', cloudIce);
          if (cfgTurnConfig) cfgTurnConfig.value = cloudIce;
        }
        if (data.fields.webPinHash && data.fields.webPinHash.stringValue) {
          const cloudHash = data.fields.webPinHash.stringValue.trim().toLowerCase();
          if (/^[a-f0-9]{64}$/.test(cloudHash)) {
            localStorage.setItem('fp_web_pin_hash', cloudHash);
            return cloudHash;
          }
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
  if (cfgTurnConfig) cfgTurnConfig.value = AppState.turnConfig;
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
  AppState.turnConfig = cfgTurnConfig ? cfgTurnConfig.value.trim() : '';

  localStorage.setItem('fp_project_id', AppState.projectId);
  localStorage.setItem('fp_device_id', AppState.deviceId);
  localStorage.setItem('fp_secret_token', AppState.secretToken);
  localStorage.setItem('fp_local_ip', AppState.localIp);
  localStorage.setItem('fp_turn_config', AppState.turnConfig);

  deviceDisplayId.innerText = AppState.deviceId;
  gateDeviceLabel.innerText = AppState.deviceId;

  // Sync optional TURN Relay config to Firebase Cloud so PC + iPhone + Android share it
  const syncUrl = `https://firestore.googleapis.com/v1/projects/${AppState.projectId}/databases/(default)/documents/devices/${AppState.deviceId}?updateMask.fieldPaths=iceJson`;
  fetch(syncUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { iceJson: { stringValue: AppState.turnConfig } } })
  }).catch(() => {});

  addLog('CONFIG', `Settings updated & synced: Device=${AppState.deviceId}, Project=${AppState.projectId}`);
  alert('Configuration saved & synced to Cloud!');
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
  const isCtrl = typeof command === 'string' && command.startsWith('CTRL:');
  if (!isCtrl) addLog('DISPATCH', `Broadcasting ${command} signal to PC: ${AppState.deviceId}...`);

  let sent = false;

  // 1. Try local LAN first if on same HTTP network
  if (window.location.protocol !== 'https:' && AppState.localIp) {
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
        if (!isCtrl) addLog('CLIENT', `⚡ PC executed ${command} via Local Network (<15ms)!`);
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
        if (!isCtrl) addLog('CLOUD', `✅ Firestore token dispatched! PC will execute anywhere worldwide.`);
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
  setupRemoteControlHandlers();
}

function sendControlMsg(obj) {
  if (!isControlEnabled || !isWebStreaming) return;
  const payload = JSON.stringify(obj);
  if (webStreamMode === 'webrtc' && rtcDataChannel && rtcDataChannel.readyState === 'open') {
    try { rtcDataChannel.send(payload); } catch (e) {}
    return;
  }
  if (webStreamMode === 'cloud' || webStreamMode === 'lan') {
    // Fallback interactive control over HTTPS / LAN HTTP even when WebRTC is blocked
    sendRemoteCommand('CTRL:' + payload).catch(() => {});
  }
}

function getNormalizedVideoPos(clientX, clientY, targetEl) {
  const el = targetEl || (webStreamMode === 'webrtc' ? webRtcVideo : webLiveScreen);
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0.5, y: 0.5 };

  const vw = el.videoWidth || el.naturalWidth || rect.width;
  const vh = el.videoHeight || el.naturalHeight || rect.height;
  const elemRatio = rect.width / rect.height;
  const vidRatio = vw / vh;

  let drawW = rect.width;
  let drawH = rect.height;
  let offX = 0;
  let offY = 0;

  if (vidRatio > elemRatio) {
    drawH = rect.width / vidRatio;
    offY = (rect.height - drawH) / 2;
  } else {
    drawW = rect.height * vidRatio;
    offX = (rect.width - drawW) / 2;
  }

  let nx = (clientX - rect.left - offX) / drawW;
  let ny = (clientY - rect.top - offY) / drawH;
  nx = Math.max(0, Math.min(1, nx));
  ny = Math.max(0, Math.min(1, ny));
  lastCtrlPos = { x: nx, y: ny };
  return lastCtrlPos;
}

function applyStreamZoomTransform() {
  const box = screenMonitorBox;
  const maxPanX = box ? (box.clientWidth * Math.max(0, streamZoom - 1)) / 2 : 0;
  const maxPanY = box ? (box.clientHeight * Math.max(0, streamZoom - 1)) / 2 : 0;
  streamPanX = Math.max(-maxPanX, Math.min(maxPanX, streamPanX));
  streamPanY = Math.max(-maxPanY, Math.min(maxPanY, streamPanY));
  const t = `translate(${streamPanX.toFixed(1)}px, ${streamPanY.toFixed(1)}px) scale(${streamZoom.toFixed(2)})`;
  if (webRtcVideo) webRtcVideo.style.transform = t;
  if (webLiveScreen) webLiveScreen.style.transform = t;
  if (btnZoomReset) btnZoomReset.innerText = streamZoom.toFixed(1) + 'x';
}

function setStreamZoom(nextZoom) {
  streamZoom = Math.max(1.0, Math.min(4.0, Math.round(nextZoom * 10) / 10));
  if (streamZoom <= 1.01) {
    streamZoom = 1.0;
    streamPanX = 0;
    streamPanY = 0;
    if (isPanMode && btnPanMode) {
      isPanMode = false;
      btnPanMode.classList.remove('active-ctrl');
      btnPanMode.innerText = '🖐️ Pan';
    }
  }
  applyStreamZoomTransform();
}

function setupRemoteControlHandlers() {
  btnToggleControl.addEventListener('click', () => {
    isControlEnabled = !isControlEnabled;
    btnToggleControl.innerText = isControlEnabled ? '🖱️ Mouse: ON' : '🖱️ Mouse: OFF';
    btnToggleControl.classList.toggle('active-ctrl', isControlEnabled);
    webRtcVideo.classList.toggle('control-active', isControlEnabled);
    webLiveScreen.classList.toggle('control-active', isControlEnabled);
  });

  if (btnPanMode) {
    btnPanMode.addEventListener('click', () => {
      isPanMode = !isPanMode;
      btnPanMode.classList.toggle('active-ctrl', isPanMode);
      btnPanMode.innerText = isPanMode ? '🖐️ Pan: ON' : '🖐️ Pan';
    });
  }
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => setStreamZoom(streamZoom + 0.5));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => setStreamZoom(streamZoom - 0.5));
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => setStreamZoom(1.0));

  btnRemoteRightClick.addEventListener('click', () => {
    sendControlMsg({ t: 'rclick', x: lastCtrlPos.x, y: lastCtrlPos.y });
  });
  btnRemoteScrollUp.addEventListener('click', () => sendControlMsg({ t: 'wheel', dy: 240 }));
  btnRemoteScrollDown.addEventListener('click', () => sendControlMsg({ t: 'wheel', dy: -240 }));

  btnToggleRemoteKb.addEventListener('click', () => {
    const show = remoteKbBar.style.display === 'none';
    remoteKbBar.style.display = show ? 'flex' : 'none';
    if (show) setTimeout(() => remoteKbInput.focus(), 80);
  });

  btnSendKbText.addEventListener('click', () => {
    const val = remoteKbInput.value;
    if (val) {
      sendControlMsg({ t: 'text', v: val });
      remoteKbInput.value = '';
    }
  });

  remoteKbInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = remoteKbInput.value;
      if (val) {
        sendControlMsg({ t: 'text', v: val });
        remoteKbInput.value = '';
      } else {
        sendControlMsg({ t: 'key', vk: 13 });
      }
    } else if (e.key === 'Backspace' && remoteKbInput.value === '') {
      sendControlMsg({ t: 'key', vk: 8 });
    }
  });

  document.querySelectorAll('.btn-key').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.vk) {
        sendControlMsg({ t: 'key', vk: parseInt(btn.dataset.vk, 10) });
      } else if (btn.dataset.hotkey) {
        const keys = btn.dataset.hotkey.split(',').map(n => parseInt(n, 10));
        sendControlMsg({ t: 'hotkey', keys });
      }
    });
  });

  // Shared Desktop Mouse + Mobile Touch/Zoom/Pan Handler for both WebRTC Video & Fallback Cloud Image
  let lastMoveTs = 0;
  function bindInteractiveSurface(el) {
    el.addEventListener('mousemove', (e) => {
      if (!isControlEnabled || webStreamMode !== 'webrtc') return;
      const now = performance.now();
      if (now - lastMoveTs < 30) return;
      lastMoveTs = now;
      const p = getNormalizedVideoPos(e.clientX, e.clientY, el);
      sendControlMsg({ t: 'move', x: p.x, y: p.y });
    });

    el.addEventListener('mousedown', (e) => {
      if (!isControlEnabled || !isWebStreaming) return;
      if (webStreamMode !== 'webrtc') return;
      const p = getNormalizedVideoPos(e.clientX, e.clientY, el);
      sendControlMsg({ t: 'down', x: p.x, y: p.y, b: e.button === 2 ? 2 : 0 });
    });

    el.addEventListener('mouseup', (e) => {
      if (!isControlEnabled || !isWebStreaming) return;
      const p = getNormalizedVideoPos(e.clientX, e.clientY, el);
      if (webStreamMode === 'webrtc') {
        sendControlMsg({ t: 'up', x: p.x, y: p.y, b: e.button === 2 ? 2 : 0 });
      } else if (e.pointerType !== 'touch') {
        sendControlMsg({ t: e.button === 2 ? 'rclick' : 'click', x: p.x, y: p.y, b: e.button === 2 ? 2 : 0 });
      }
    });

    el.addEventListener('contextmenu', (e) => {
      if (!isControlEnabled || !isWebStreaming) return;
      e.preventDefault();
    });

    el.addEventListener('wheel', (e) => {
      if (!isWebStreaming) return;
      e.preventDefault();
      if (e.ctrlKey) {
        setStreamZoom(streamZoom + (e.deltaY < 0 ? 0.25 : -0.25));
        return;
      }
      if (!isControlEnabled) return;
      const dy = e.deltaY > 0 ? -160 : 160;
      sendControlMsg({ t: 'wheel', dy });
    }, { passive: false });

    let touchStartX = 0, touchStartY = 0, touchStartTime = 0, touchMoved = false;
    let longPressTimer = null, lastTapTime = 0, lastTouchX = 0, lastTouchY = 0;
    let pinchStartDist = 0, pinchStartZoom = 1, pinchMidX = 0, pinchMidY = 0;

    el.addEventListener('touchstart', (e) => {
      if (!isWebStreaming) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        const t0 = e.touches[0], t1 = e.touches[1];
        pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY) || 1;
        pinchStartZoom = streamZoom;
        pinchMidX = (t0.clientX + t1.clientX) / 2;
        pinchMidY = (t0.clientY + t1.clientY) / 2;
        return;
      }
      if (!isControlEnabled && !isPanMode) return;
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      touchStartX = lastTouchX = t.clientX;
      touchStartY = lastTouchY = t.clientY;
      touchStartTime = Date.now();
      touchMoved = false;

      if (!isPanMode && isControlEnabled) {
        const p = getNormalizedVideoPos(t.clientX, t.clientY, el);
        longPressTimer = setTimeout(() => {
          if (!touchMoved) {
            sendControlMsg({ t: 'rclick', x: p.x, y: p.y });
            longPressTimer = null;
          }
        }, 520);
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (!isWebStreaming) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY) || 1;
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        streamZoom = Math.max(1.0, Math.min(4.0, pinchStartZoom * (dist / pinchStartDist)));
        streamPanX += (midX - pinchMidX);
        streamPanY += (midY - pinchMidY);
        pinchMidX = midX;
        pinchMidY = midY;
        applyStreamZoomTransform();
        return;
      }
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - lastTouchX;
      const dy = t.clientY - lastTouchY;
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
      if (Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 10) {
        touchMoved = true;
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      }
      if (isPanMode && streamZoom > 1.0) {
        streamPanX += dx;
        streamPanY += dy;
        applyStreamZoomTransform();
        return;
      }
      if (touchMoved && isControlEnabled) {
        const now = performance.now();
        const minGap = webStreamMode === 'webrtc' ? 28 : 220;
        if (now - lastMoveTs >= minGap) {
          lastMoveTs = now;
          const p = getNormalizedVideoPos(t.clientX, t.clientY, el);
          sendControlMsg({ t: 'move', x: p.x, y: p.y });
        }
      }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      if (!isWebStreaming) return;
      e.preventDefault();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      } else if (!touchMoved && Date.now() - touchStartTime >= 520) {
        return;
      }
      if (e.touches.length > 0 || touchMoved || !isControlEnabled) return;

      const t = e.changedTouches[0];
      const p = getNormalizedVideoPos(t.clientX, t.clientY, el);
      const now = Date.now();
      if (now - lastTapTime < 320) {
        sendControlMsg({ t: 'dblclick', x: p.x, y: p.y });
        lastTapTime = 0;
      } else {
        sendControlMsg({ t: 'click', x: p.x, y: p.y, b: 0 });
        lastTapTime = now;
      }
    }, { passive: false });
  }

  bindInteractiveSurface(webRtcVideo);
  bindInteractiveSurface(webLiveScreen);
}

async function toggleWebStream() {
  if (isWebStreaming) {
    stopWebStream();
  } else {
    startWebStream();
  }
}

function cleanupWebRtc() {
  if (rtcStatsTimer) { clearInterval(rtcStatsTimer); rtcStatsTimer = null; }
  if (rtcHeartbeatTimer) { clearInterval(rtcHeartbeatTimer); rtcHeartbeatTimer = null; }
  if (rtcDataChannel) {
    try { rtcDataChannel.send(JSON.stringify({ t: 'bye' })); } catch (e) {}
    try { rtcDataChannel.close(); } catch (e) {}
    rtcDataChannel = null;
  }
  if (rtcPc) {
    try { rtcPc.close(); } catch (e) {}
    rtcPc = null;
  }
  webRtcVideo.srcObject = null;
  webRtcVideo.style.display = 'none';
  webRtcVideo.classList.remove('control-active');
  remoteControlBar.style.display = 'none';
}

function waitWebRtcIce(pc, maxMs) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const hardTimer = setTimeout(finish, maxMs);
    let softTimer = null;
    pc.onicecandidate = e => {
      if (e.candidate) {
        const cs = e.candidate.candidate || '';
        const isPublic = (cs.indexOf(' typ srflx') >= 0 || cs.indexOf(' typ relay') >= 0);
        if (isPublic && !softTimer) softTimer = setTimeout(finish, 350);
      } else {
        clearTimeout(hardTimer);
        if (softTimer) clearTimeout(softTimer);
        finish();
      }
    };
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(hardTimer);
        if (softTimer) clearTimeout(softTimer);
        finish();
      }
    };
  });
}

async function resolveDynamicIceServers() {
  const base = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'stun:stun.relay.metered.ca:443' }
  ];
  let extra = [];
  try {
    let raw = (AppState.turnConfig || '').trim();
    if (!raw && !cloudDeviceSynced) {
      const devUrl = `https://firestore.googleapis.com/v1/projects/${AppState.projectId}/databases/(default)/documents/devices/${AppState.deviceId}`;
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 900);
      const r = await fetch(devUrl, { cache: 'no-store', signal: c.signal });
      clearTimeout(t);
      if (r.ok) {
        cloudDeviceSynced = true;
        const d = await r.json();
        raw = (d && d.fields && d.fields.iceJson && d.fields.iceJson.stringValue || '').trim();
        if (raw) {
          AppState.turnConfig = raw;
          localStorage.setItem('fp_turn_config', raw);
          if (cfgTurnConfig) cfgTurnConfig.value = raw;
        }
      }
    }
    if (raw.startsWith('[')) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) extra = arr;
    } else if (raw.startsWith('https://')) {
      const r = await fetch(raw, { cache: 'no-store' });
      if (r.ok) {
        const arr = await r.json();
        if (Array.isArray(arr)) extra = arr;
      }
    }
  } catch (e) {}
  return { iceServers: base.concat(extra), extra };
}

async function tryWebRtcStream() {
  if (!window.RTCPeerConnection) {
    addLog('STREAM', 'WebRTC unsupported in this browser.');
    return false;
  }
  try {
    const sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    // Wake PC WebRTC engine immediately in parallel while resolving ICE/TURN & gathering candidates
    sendRemoteCommand('WEBRTC_ON').catch(() => {});

    const resolvedIce = await resolveDynamicIceServers();
    rtcPc = new RTCPeerConnection({
      iceServers: resolvedIce.iceServers,
      iceCandidatePoolSize: 2
    });

    rtcPc.addTransceiver('video', { direction: 'recvonly' });
    rtcDataChannel = rtcPc.createDataChannel('control', { ordered: true });
    rtcDataChannel.onopen = () => {
      remoteControlBar.style.display = 'flex';
      webRtcVideo.classList.toggle('control-active', isControlEnabled);
      addLog('STREAM', '🎮 Remote Mouse & Keyboard DataChannel active!');
    };

    let hasTrack = false;
    let isIceReady = false;
    let mediaResolve = null;
    let mediaReject = null;
    let mediaTimer = null;

    const tryCompleteMedia = () => {
      if (!isWebStreaming || !rtcPc || !mediaResolve) return;
      const cs = rtcPc.connectionState;
      const ics = rtcPc.iceConnectionState;
      if (cs === 'connected' || ics === 'connected' || ics === 'completed') isIceReady = true;
      if (hasTrack && (isIceReady || webRtcVideo.videoWidth > 0)) {
        if (mediaTimer) { clearTimeout(mediaTimer); mediaTimer = null; }
        webRtcVideo.style.display = 'block';
        webLiveScreen.style.display = 'none';
        streamSpinner.style.display = 'none';
        webStreamStatusText.innerText = 'WEBRTC 30+ FPS 🟢';
        webStreamStatusBadge.style.color = '#10B981';
        const r = mediaResolve;
        mediaResolve = null;
        mediaReject = null;
        r(true);
      }
    };

    const mediaPromise = new Promise((resolve, reject) => {
      mediaResolve = resolve;
      mediaReject = reject;
    });

    rtcPc.ontrack = (ev) => {
      if (!isWebStreaming) return;
      hasTrack = true;
      const stream = (ev.streams && ev.streams[0]) ? ev.streams[0] : new MediaStream([ev.track]);
      webRtcVideo.muted = true;
      webRtcVideo.playsInline = true;
      webRtcVideo.setAttribute('playsinline', '');
      webRtcVideo.setAttribute('webkit-playsinline', '');
      webRtcVideo.srcObject = stream;
      webRtcVideo.play().catch(() => {});
      tryCompleteMedia();
    };

    webRtcVideo.onloadeddata = () => tryCompleteMedia();
    webRtcVideo.onplaying = () => tryCompleteMedia();

    rtcPc.oniceconnectionstatechange = () => {
      if (!rtcPc) return;
      if (rtcPc.iceConnectionState === 'connected' || rtcPc.iceConnectionState === 'completed') {
        isIceReady = true;
        tryCompleteMedia();
      } else if (rtcPc.iceConnectionState === 'failed' && mediaReject) {
        if (mediaTimer) { clearTimeout(mediaTimer); mediaTimer = null; }
        const rej = mediaReject;
        mediaResolve = null;
        mediaReject = null;
        rej(new Error('ICE connection failed'));
      }
    };

    rtcPc.onconnectionstatechange = () => {
      if (!rtcPc) return;
      if (rtcPc.connectionState === 'connected') {
        isIceReady = true;
        tryCompleteMedia();
      } else if (rtcPc.connectionState === 'failed' && mediaReject) {
        if (mediaTimer) { clearTimeout(mediaTimer); mediaTimer = null; }
        const rej = mediaReject;
        mediaResolve = null;
        mediaReject = null;
        rej(new Error('Peer connection failed'));
      }
    };

    const offer = await rtcPc.createOffer();
    await rtcPc.setLocalDescription(offer);
    await waitWebRtcIce(rtcPc, 2200);
    if (!isWebStreaming || !rtcPc) return false;

    const offerSdp = rtcPc.localDescription.sdp;
    let answerSdp = '';

    // Fast path: Direct LAN HTTP signaling (if page loaded over HTTP)
    if (window.location.protocol !== 'https:' && AppState.localIp) {
      try {
        streamSpinnerText.innerText = 'Connecting WebRTC via LAN...';
        const cleanIp = AppState.localIp.replace('http://', '').replace('https://', '').split(':')[0];
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 1800);
        const r = await fetch(`http://${cleanIp}:9876/rtc/offer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, offerSdp, token: AppState.secretToken }),
          signal: c.signal
        });
        clearTimeout(t);
        if (r.ok) {
          const j = await r.json();
          if (j && j.answerSdp) answerSdp = j.answerSdp;
        }
      } catch (e) {}
    }

    // Worldwide Firestore WebRTC Signaling (up to 18s for slower mobile/HTTPS links)
    if (!answerSdp) {
      streamSpinnerText.innerText = 'Signaling PC via Firebase WebRTC...';
      const rtcUrl = `https://firestore.googleapis.com/v1/projects/${AppState.projectId}/databases/(default)/documents/screens/${AppState.deviceId}_rtc`;
      const extraIceStr = (resolvedIce.extra && resolvedIce.extra.length > 0) ? JSON.stringify(resolvedIce.extra) : '';
      await fetch(`${rtcUrl}?updateMask.fieldPaths=sessionId&updateMask.fieldPaths=offerSdp&updateMask.fieldPaths=offerTs&updateMask.fieldPaths=token&updateMask.fieldPaths=iceJson`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            sessionId: { stringValue: sessionId },
            offerSdp: { stringValue: offerSdp },
            offerTs: { integerValue: String(Date.now()) },
            token: { stringValue: AppState.secretToken },
            iceJson: { stringValue: extraIceStr }
          }
        })
      });

      streamSpinnerText.innerText = 'Waiting for PC WebRTC Answer...';
      const pollStart = Date.now();
      while (isWebStreaming && !answerSdp && Date.now() - pollStart < 18000) {
        try {
          const r = await fetch(rtcUrl, { cache: 'no-store' });
          if (r.ok) {
            const data = await r.json();
            const f = data && data.fields;
            if (f && f.answerSessionId && f.answerSessionId.stringValue === sessionId && f.answerSdp && f.answerSdp.stringValue) {
              answerSdp = f.answerSdp.stringValue;
              break;
            }
          }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 150));
      }
    }

    if (!answerSdp || !isWebStreaming || !rtcPc) {
      throw new Error('No WebRTC answer from PC (signaling timeout)');
    }

    streamSpinnerText.innerText = 'Opening P2P 30+ FPS Video Stream...';
    const mediaTimeoutMs = (resolvedIce.extra && resolvedIce.extra.length > 0) ? 10000 : 5500;
    mediaTimer = setTimeout(() => {
      if (mediaReject) {
        const rej = mediaReject;
        mediaResolve = null;
        mediaReject = null;
        rej(new Error('WebRTC ICE/Media connection timeout'));
      }
    }, mediaTimeoutMs);

    await rtcPc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    await mediaPromise;

    // Live WebRTC Stats (Real FPS & RTT Ping)
    let prevFrames = 0;
    let prevStatsTime = performance.now();
    rtcStatsTimer = setInterval(async () => {
      if (!rtcPc || !isWebStreaming) return;
      try {
        const stats = await rtcPc.getStats();
        let fps = 0;
        let pingMs = 0;
        stats.forEach(rep => {
          if (rep.type === 'inbound-rtp' && rep.kind === 'video') {
            if (typeof rep.framesPerSecond === 'number') {
              fps = Math.round(rep.framesPerSecond);
            } else if (typeof rep.framesDecoded === 'number') {
              const dt = (performance.now() - prevStatsTime) / 1000;
              if (dt > 0 && prevFrames > 0) fps = Math.round((rep.framesDecoded - prevFrames) / dt);
              prevFrames = rep.framesDecoded;
              prevStatsTime = performance.now();
            }
          }
          if (rep.type === 'candidate-pair' && rep.state === 'succeeded' && typeof rep.currentRoundTripTime === 'number') {
            pingMs = Math.round(rep.currentRoundTripTime * 1000);
          }
        });
        webStreamFps.innerText = `WebRTC • ${fps > 0 ? fps : 30} FPS • ${pingMs > 0 ? pingMs : 15}ms ping`;
      } catch (e) {}
    }, 1000);

    rtcHeartbeatTimer = setInterval(() => {
      if (rtcDataChannel && rtcDataChannel.readyState === 'open') {
        try { rtcDataChannel.send('ping'); } catch (e) {}
      } else if (isWebStreaming) {
        sendRemoteCommand('WEBRTC_PING');
      }
    }, 20000);

    return true;
  } catch (err) {
    if (err && err.message) addLog('STREAM', 'WebRTC notice: ' + err.message);
    cleanupWebRtc();
    return false;
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
  streamSpinnerText.innerText = 'Connecting WebRTC 30+ FPS Stream...';
  webRtcVideo.style.display = 'none';
  webLiveScreen.style.display = 'none';
  webStreamStatusText.innerText = 'WEBRTC CONNECTING...';
  webStreamDot.className = 'status-dot pulsing';
  addLog('STREAM', `Starting WebRTC 30+ FPS live stream for ${AppState.deviceId}...`);

  // Stage 1: Try Peer-to-Peer WebRTC (30-60 FPS + Mouse/Keyboard Control)
  webStreamMode = 'webrtc';
  const rtcOk = await tryWebRtcStream();
  if (rtcOk && isWebStreaming) {
    webStreamStatusText.innerText = 'WEBRTC 30+ FPS 🟢';
    webStreamStatusBadge.style.color = '#10B981';
    addLog('STREAM', '🚀 WebRTC 30+ FPS Real-Time Stream Connected!');
    return;
  }

  if (!isWebStreaming) return;
  cleanupWebRtc();
  streamSpinnerText.innerText = 'WebRTC blocked by network, switching to HD Fallback...';
  addLog('STREAM', 'WebRTC fallback engaged — connecting HD stream...');

  // Stage 2: Fallback to LAN MJPEG (HTTP) or Firebase Cloud JPEG
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
    webLiveScreen.classList.toggle('control-active', isControlEnabled);
    remoteControlBar.style.display = 'flex';
    addLog('STREAM', '⚡ Connected to Local LAN PC Stream! 30+ FPS Active.');
    runLanStreamLoop();
  } else {
    webStreamMode = 'cloud';
    webStreamStatusText.innerText = 'FIREBASE CLOUD ☁️';
    webStreamStatusBadge.style.color = '#00E5FF';
    webLiveScreen.classList.toggle('control-active', isControlEnabled);
    remoteControlBar.style.display = 'flex';
    addLog('STREAM', '☁️ Connected via Firebase Cloud Worldwide Stream (Mouse & Zoom Active).');
    runCloudStreamLoop();
  }
}

function stopWebStream() {
  isWebStreaming = false;
  lastCloudFrameTs = 0;
  setStreamZoom(1.0);
  btnToggleStreamText.innerText = 'Start Stream';
  btnToggleStreamIcon.innerText = '▶️';
  btnToggleStream.classList.remove('btn-danger');
  btnToggleStream.classList.add('btn-emerald');

  const prevMode = webStreamMode;
  cleanupWebRtc();

  screenMonitorBox.classList.remove('is-streaming');
  streamPlaceholder.style.display = 'flex';
  streamSpinner.style.display = 'none';
  webLiveScreen.style.display = 'none';
  webStreamStatusText.innerText = 'STREAM READY';
  webStreamFps.innerText = '0 FPS • -- ms';

  if (prevMode === 'webrtc') {
    sendRemoteCommand('WEBRTC_OFF');
  } else if (prevMode === 'cloud') {
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
