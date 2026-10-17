// LucasPortafolio - cliente web
// Captura la camara, manda frames JPEG por WebSocket al servidor (GPU),
// recibe keypoints + feedback y dibuja el esqueleto sobre el video.

const COCO_SKELETON = [
  [5,7],[7,9],[6,8],[8,10],          // brazos
  [5,6],[5,11],[6,12],[11,12],       // torso
  [11,13],[13,15],[12,14],[14,16],   // piernas
  [0,5],[0,6]                         // cuello
];

const SEND_W = 416;
const JPEG_QUALITY = 0.55;

const video    = document.getElementById('video');
const overlay  = document.getElementById('overlay');
const octx     = overlay.getContext('2d');
const capCanvas = document.createElement('canvas');
const cctx     = capCanvas.getContext('2d');

const el = {
  conn: document.getElementById('conn'),
  reps: document.getElementById('reps'),
  stage: document.getElementById('stageVal'),
  status: document.getElementById('status'),
  angles: document.getElementById('angles'),
  messages: document.getElementById('messages'),
  fps: document.getElementById('fps'),
  startOverlay: document.getElementById('startOverlay'),
  exerciseSel: document.getElementById('exerciseSel'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  flipBtn: document.getElementById('flipBtn'),
  refPanel: document.getElementById('refPanel'),
  refCanvas: document.getElementById('refCanvas'),
  refName: document.getElementById('refName'),
  gauge: document.getElementById('gauge'),
  gaugeFill: document.getElementById('gaugeFill'),
  gaugeLabel: document.getElementById('gaugeLabel'),
  liveCue: document.getElementById('liveCue'),
  setupHint: document.getElementById('setupHint'),
  setupTip: document.getElementById('setupTip'),
  voiceBtn: document.getElementById('voiceBtn'),
  guideBanner: document.getElementById('guideBanner'),
  guideBannerTitle: document.getElementById('guideBannerTitle'),
  guideBannerText: document.getElementById('guideBannerText'),
  guideWatchMetrics: document.getElementById('guideWatchMetrics'),
  guidePhaseLink: document.getElementById('guidePhaseLink'),
  backGuideLink: document.getElementById('backGuideLink'),
  reportBtn: document.getElementById('reportBtn'),
  reportModal: document.getElementById('reportModal'),
  reportBody: document.getElementById('reportBody'),
  reportClose: document.getElementById('reportClose'),
  reportGuideLink: document.getElementById('reportGuideLink'),
};

let voiceOn = true;
let ws = null;
let stream = null;
let streaming = false;
let inflight = false;
let pendingSend = false;
let facing = 'environment';
let lastTs = performance.now();
let fps = 0;
let lastResult = null;
let lastSendTs = 0;
let repLog = [];
let coachingData = null;
let guideCtx = null;

const urlParams = new URLSearchParams(location.search);
const urlLiveEx = urlParams.get('ex');
const urlGuideId = urlParams.get('guide');
const urlGuideStep = urlParams.get('step');

// ---- WebSocket ----------------------------------------------------------
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    el.conn.textContent = 'conectado';
    el.conn.className = 'badge on';
    sendConfig();
  };
  ws.onclose = () => {
    el.conn.textContent = 'desconectado';
    el.conn.className = 'badge off';
    setTimeout(connect, 1500); // reconexion automatica
  };
  ws.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (data.event) return;
    inflight = false;
    lastResult = data;
    render(data);
    pendingSend = false;
    captureAndSend();
  };
}

function sendConfig() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'config', exercise: el.exerciseSel.value }));
  }
}

// ---- Camara -------------------------------------------------------------
async function startCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  el.startOverlay.classList.add('hidden');
  streaming = true;
  requestAnimationFrame(captureLoop);
}

function captureLoop() {
  if (!streaming) return;
  if (inflight) pendingSend = true;
  else captureAndSend();
  requestAnimationFrame(captureLoop);
}

function stopCamera() {
  streaming = false;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null;
  octx.clearRect(0, 0, overlay.width, overlay.height); // borra el esqueleto
  el.startOverlay.classList.remove('hidden');           // vuelve la portada
  clearFeedback();
  inflight = false;
  pendingSend = false;
}

// JPEG síncrono → menos espera antes de mandar el frame
function captureAndSend() {
  if (!streaming || inflight || !ws || ws.readyState !== WebSocket.OPEN) return;
  if (!video.videoWidth) return;

  const scale = SEND_W / video.videoWidth;
  const h = Math.round(video.videoHeight * scale);
  if (capCanvas.width !== SEND_W || capCanvas.height !== h) {
    capCanvas.width = SEND_W;
    capCanvas.height = h;
  }
  cctx.drawImage(video, 0, 0, SEND_W, h);

  const dataUrl = capCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

  inflight = true;
  lastSendTs = performance.now();
  ws.send(buf.buffer);
}

// ---- Render -------------------------------------------------------------
function render(d) {
  // FPS
  const now = performance.now();
  fps = 0.85 * fps + 0.15 * (1000 / Math.max(now - lastTs, 1));
  lastTs = now;
  el.fps.textContent = `${fps.toFixed(0)} FPS · ${Math.round(now - lastSendTs)}ms`;

  el.reps.textContent = d.reps ?? 0;
  el.stage.textContent = d.stage ?? '—';

  // angulos (solo numeros, se actualizan en vivo)
  el.angles.innerHTML = '';
  for (const [k, v] of Object.entries(d.metrics || {})) {
    const div = document.createElement('div');
    div.textContent = `${k}: ${v}°`;
    el.angles.appendChild(div);
  }

  updateFeedback(d);
  updateLive(d);
  updateSetup(d);
  drawSkeletonNow(d);
}

function drawSkeletonNow(d) {
  if (!streaming) return;
  if (d.kp && d.kp.length) drawSkeleton(d, d.kp);
  else {
    const rect = video.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
    octx.clearRect(0, 0, overlay.width, overlay.height);
  }
}

function updateSetup(d) {
  if (!el.setupHint) return;
  const msg = (!d.ready && d.setup) ? d.setup : '';
  if (msg) {
    el.setupHint.textContent = msg;
    el.setupHint.classList.remove('hidden');
  } else {
    el.setupHint.classList.add('hidden');
  }
}

// ===== Guía en vivo: medidor, cue grande y coaching por voz ==============
let lastCue = '';
let lastReps = 0;

function cueClass(cue) {
  const c = cue.toLowerCase();
  if (c.includes('profundidad')) return 'ok';
  if (c.includes('pecho') || c.includes('atrás') || c.includes('atras')) return 'bad';
  return 'warn';
}

function updateLive(d) {
  // Medidor (p.ej. profundidad)
  if (d.gauge) {
    el.gauge.classList.add('show');
    el.gaugeFill.style.height = Math.round((d.gauge.value || 0) * 100) + '%';
    el.gaugeFill.classList.toggle('ok', !!d.gauge.ok);
    el.gaugeLabel.textContent = d.gauge.label || '';
  } else {
    el.gauge.classList.remove('show');
  }

  // Cue grande instantáneo
  const cue = d.live || '';
  if (cue) {
    el.liveCue.textContent = cue;
    el.liveCue.className = 'live-cue show ' + cueClass(cue);
  } else {
    el.liveCue.className = 'live-cue';
  }
  // Voz del cue (solo al cambiar)
  if (cue && cue !== lastCue) speak(cue);
  lastCue = cue;

  // Repetición completada -> sonido + anuncio
  if (d.reps > lastReps) {
    lastReps = d.reps;
    const issues = d.issues && d.issues.length ? [...d.issues] : [];
    repLog.push({
      rep: d.reps,
      ok: !issues.length,
      issues,
      metrics: { ...(d.metrics || {}) },
    });
    const bad = issues.length;
    if (!bad) {
      beep(880, 0.12, 'sine', 0.22);
      speak('¡Bien! ' + d.reps, { force: true });
    } else {
      beep(300, 0.18, 'square', 0.18);
      speak(d.issues[0], { force: true });
    }
  } else if (d.reps < lastReps) {
    lastReps = d.reps; // se reinició el contador
  }
}

// ---- Voz (Web Speech API) y sonidos (WebAudio) ----
let lastSpoken = '', lastSpeakTs = 0, audioCtx = null;

function speak(text, { force = false } = {}) {
  if (!voiceOn || !text || !('speechSynthesis' in window)) return;
  const now = performance.now();
  if (!force && now - lastSpeakTs < 1200) return;
  if (!force && text === lastSpoken && now - lastSpeakTs < 3200) return;
  lastSpoken = text; lastSpeakTs = now;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = 1.08;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {}
}

function beep(freq = 660, dur = 0.12, type = 'sine', vol = 0.2) {
  if (!voiceOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

// Los avisos se mantienen visibles un mínimo de tiempo aunque la detección
// parpadee, y el DOM solo se reconstruye cuando el TEXTO cambia -> sin flicker.
const MSG_HOLD = 1300;                 // ms que un aviso permanece tras dejar de verse
const activeMsgs = new Map();          // texto -> { type, last }
let shownSig = '';

function clearFeedback() {
  activeMsgs.clear();
  shownSig = '';
  el.messages.innerHTML = '';
  el.status.textContent = 'LISTO';
  el.status.className = 'status ok';
  el.gauge.classList.remove('show');
  el.liveCue.className = 'live-cue';
  if (el.setupHint) el.setupHint.classList.add('hidden');
  lastCue = ''; lastReps = 0;
  repLog = [];
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function updateFeedback(d) {
  const now = performance.now();
  const current = (d.issues && d.issues.length)
    ? d.issues.map(m => ['bad', m])
    : (d.good || []).map(m => ['good', m]);
  for (const [type, text] of current) activeMsgs.set(text, { type, last: now });
  for (const [text, info] of activeMsgs) {
    if (now - info.last > MSG_HOLD) activeMsgs.delete(text);
  }

  const entries = [...activeMsgs.entries()];
  const hasBad = entries.some(([, i]) => i.type === 'bad');
  const statusTxt = hasBad ? 'CORREGIR' : 'TÉCNICA OK';
  const statusCls = 'status ' + (hasBad ? 'bad' : 'ok');
  if (el.status.textContent !== statusTxt) el.status.textContent = statusTxt;
  if (el.status.className !== statusCls) el.status.className = statusCls;

  const sig = entries.map(([t, i]) => i.type + ':' + t).join('|');
  if (sig === shownSig) return;        // nada cambió -> no tocar el DOM
  shownSig = sig;
  el.messages.innerHTML = '';
  for (const [text, info] of entries) {
    const div = document.createElement('div');
    div.className = `msg ${info.type}`;
    div.textContent = (info.type === 'bad' ? '✕ ' : '✓ ') + text;
    el.messages.appendChild(div);
  }
}

function drawSkeleton(d, kp) {
  // El overlay se dibuja sobre el video mostrado (object-fit: contain).
  kp = kp || d.kp;
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw) return;
  const rect = video.getBoundingClientRect();
  overlay.width = rect.width; overlay.height = rect.height;

  // factor de "contain"
  const s = Math.min(rect.width / vw, rect.height / vh);
  const dx = (rect.width - vw * s) / 2;
  const dy = (rect.height - vh * s) / 2;

  // los keypoints vienen en coords del frame enviado (ancho d.w)
  const k2v = vw / (d.w || vw); // del frame enviado al frame nativo
  const tx = (x) => dx + x * k2v * s;
  const ty = (y) => dy + y * k2v * s;

  octx.clearRect(0, 0, overlay.width, overlay.height);
  if (!kp || !kp.length) return;

  const color = (!d.ready) ? '#ffd23f' : (d.correct ? '#28c66d' : '#ff3340');
  octx.lineWidth = 3; octx.strokeStyle = color; octx.lineCap = 'round';
  const CONF = 0.5;

  for (const [a, b] of COCO_SKELETON) {
    if (kp[a][2] < CONF || kp[b][2] < CONF) continue;
    octx.beginPath();
    octx.moveTo(tx(kp[a][0]), ty(kp[a][1]));
    octx.lineTo(tx(kp[b][0]), ty(kp[b][1]));
    octx.stroke();
  }
  for (const p of kp) {
    if (p[2] < CONF) continue;
    octx.beginPath();
    octx.arc(tx(p[0]), ty(p[1]), 4, 0, Math.PI * 2);
    octx.fillStyle = '#fff'; octx.fill();
    octx.lineWidth = 2; octx.strokeStyle = color; octx.stroke();
  }
}

// ---- Controles ----------------------------------------------------------
let exerciseMeta = {};

async function loadExercises() {
  const res = await fetch('/api/exercises');
  const data = await res.json();
  const list = data.exercises || data;
  el.exerciseSel.innerHTML = '';
  const groups = { maquina: 'Máquinas / gimnasio', peso_libre: 'Peso libre', peso_corporal: 'Peso corporal', otro: 'Otros' };
  const byCat = {};
  for (const ex of list) {
    exerciseMeta[ex.id] = ex;
    const cat = ex.category || 'otro';
    (byCat[cat] = byCat[cat] || []).push(ex);
  }
  for (const [cat, label] of Object.entries(groups)) {
    if (!byCat[cat]) continue;
    const og = document.createElement('optgroup');
    og.label = label;
    for (const ex of byCat[cat]) {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = ex.name;
      og.appendChild(opt);
    }
    el.exerciseSel.appendChild(og);
  }
  applyExerciseCameraHint(el.exerciseSel.value);
  setReference(el.exerciseSel.value);
  if (urlLiveEx) el.exerciseSel.value = urlLiveEx;
}

function applyGuideContext() {
  try {
    guideCtx = JSON.parse(sessionStorage.getItem('ws_guide_ctx') || 'null');
  } catch (_) { guideCtx = null; }
  if (!guideCtx && !urlGuideId) return;
  const gid = guideCtx?.guideId || urlGuideId;
  const step = guideCtx?.step ?? urlGuideStep ?? '0';
  const coach = coachingData?.exercises?.[gid];
  const name = guideCtx?.guideName || gid;
  if (el.guideBanner) {
    el.guideBanner.classList.remove('hidden');
    el.guideBannerTitle.textContent = `Practicando: ${name}`;
    el.guideBannerText.textContent = coach?.watch_intro || guideCtx?.watchIntro || 'Encuadra el cuerpo y completa varias reps.';
    const metrics = coach?.watch_metrics || guideCtx?.watch || [];
    if (el.guideWatchMetrics) {
      el.guideWatchMetrics.textContent = metrics.length
        ? `Métricas clave: ${metrics.join(' · ')}`
        : '';
    }
    const phaseUrl = `/?ex=${encodeURIComponent(gid)}`;
    if (el.guidePhaseLink) el.guidePhaseLink.href = phaseUrl;
    if (el.backGuideLink) el.backGuideLink.href = phaseUrl;
    if (el.reportGuideLink) el.reportGuideLink.href = `${phaseUrl}#step-${step}`;
  }
}

function buildSessionReport() {
  const exId = el.exerciseSel.value;
  const gid = guideCtx?.guideId || urlGuideId;
  const coachEx = coachingData?.exercises?.[gid];
  const patterns = coachEx?.session_patterns || [];
  const total = repLog.length;
  const ok = repLog.filter((r) => r.ok).length;
  const issueCounts = {};
  for (const r of repLog) {
    for (const iss of r.issues) {
      issueCounts[iss] = (issueCounts[iss] || 0) + 1;
    }
  }
  const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
  let html = `<div class="report-stat">
    <div><span>${total}</span>reps</div>
    <div><span>${ok}</span>correctas</div>
    <div><span>${total ? Math.round((ok / total) * 100) : 0}%</span>éxito</div>
  </div>`;
  if (!total) {
    html += '<p>Completa al menos una repetición antes de generar el informe.</p>';
    return html;
  }
  if (topIssues.length) {
    html += '<h3>Patrón detectado</h3><ul>';
    for (const [iss, n] of topIssues.slice(0, 3)) {
      html += `<li>${iss} (${n}/${total} reps)</li>`;
    }
    html += '</ul>';
    const topText = topIssues[0][0].toLowerCase();
    let matched = false;
    for (const p of patterns) {
      const needle = (p.if_issue_contains || '').toLowerCase();
      if (needle && topText.includes(needle)) {
        html += `<h3>Hipótesis</h3><p>${p.hypothesis}</p>`;
        html += `<h3>Próximo paso</h3><p>${p.next}</p>`;
        matched = true;
        break;
      }
    }
    if (!matched && patterns[0]) {
      html += `<h3>Próximo paso</h3><p>${patterns[0].next}</p>`;
    }
  } else {
    html += '<p><strong>Técnica consistente</strong> en esta sesión. Sube carga o añade una pausa en el punto más difícil.</p>';
  }
  if (gid) {
    html += `<p style="margin-top:12px;color:var(--muted)">Revisa la fase crítica en la biblioteca 3D para el ejercicio <em>${guideCtx?.guideName || gid}</em>.</p>`;
  }
  return html;
}

function showReport() {
  if (!el.reportModal || !el.reportBody) return;
  el.reportBody.innerHTML = buildSessionReport();
  el.reportModal.classList.remove('hidden');
}

function hideReport() {
  el.reportModal?.classList.add('hidden');
}

async function loadCoaching() {
  try {
    const res = await fetch('/api/guide');
    const data = await res.json();
    coachingData = data.coaching || null;
  } catch (_) { coachingData = null; }
  applyGuideContext();
}

function applyExerciseCameraHint(id) {
  const ex = exerciseMeta[id] || {};
  const setup = ex.setup || 'Encuadra el cuerpo completo del ejercicio.';
  if (el.setupTip) el.setupTip.textContent = setup;
  facing = (ex.camera === 'user') ? 'user' : 'environment';
}

// INICIAR / DETENER: interruptor de la cámara
el.startBtn.addEventListener('click', async () => {
  if (streaming) {           // estaba en vivo -> detener
    stopCamera();
    el.startBtn.textContent = 'INICIAR';
    el.startBtn.classList.add('primary');
    el.startBtn.classList.remove('stop');
    return;
  }
  try {                      // estaba detenido -> iniciar
    await startCamera();
    initAudio();             // desbloquea voz/sonido con el gesto del usuario
    el.startBtn.textContent = 'DETENER';
    el.startBtn.classList.remove('primary');
    el.startBtn.classList.add('stop');
  } catch (e) {
    alert('No se pudo acceder a la cámara: ' + e.message +
          '\\nDebe abrirse por HTTPS (la URL de ngrok ya lo es).');
  }
});
el.resetBtn.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'reset' }));
  repLog = [];
  lastReps = 0;
});
el.reportBtn?.addEventListener('click', showReport);
el.reportClose?.addEventListener('click', hideReport);
el.reportModal?.addEventListener('click', (e) => { if (e.target === el.reportModal) hideReport(); });
// VOLTEAR: alterna cámara frontal <-> trasera (en móvil)
el.flipBtn.addEventListener('click', async () => {
  facing = facing === 'user' ? 'environment' : 'user';
  if (streaming) await startCamera(); // reabre con la otra cámara al instante
});
el.exerciseSel.addEventListener('change', () => {
  applyExerciseCameraHint(el.exerciseSel.value);
  sendConfig();
  setReference(el.exerciseSel.value);
});

// VOZ on/off
el.voiceBtn.addEventListener('click', () => {
  voiceOn = !voiceOn;
  el.voiceBtn.classList.toggle('on', voiceOn);
  el.voiceBtn.classList.toggle('off', !voiceOn);
  el.voiceBtn.textContent = (voiceOn ? '🔊' : '🔇') + ' VOZ';
  if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
  else { initAudio(); speak('Voz activada', { force: true }); }
});

// Desbloquea audio/voz tras un gesto del usuario (políticas del navegador)
function initAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if ('speechSynthesis' in window) speechSynthesis.resume();
  } catch (e) {}
}

window.addEventListener('resize', () => { if (lastResult) drawSkeletonNow(lastResult); });

// ===== Avatar guía: cómo debería moverse el esqueleto ideal ==============
// Poses normalizadas (x,y en 0..1) de vista lateral. Se interpola A<->B en
// bucle suave para mostrar el movimiento correcto de cada ejercicio.
const REF_BONES = [['nose','sho'],['sho','elb'],['elb','wri'],
                   ['sho','hip'],['hip','kne'],['kne','ank']];
const REF_POSES = {
  sentadilla: {
    label: 'Sentadilla',
    A: { nose:[.50,.12], sho:[.50,.26], elb:[.54,.42], wri:[.56,.56],
         hip:[.50,.55], kne:[.51,.74], ank:[.50,.93] },
    B: { nose:[.41,.30], sho:[.44,.42], elb:[.55,.52], wri:[.66,.50],
         hip:[.39,.61], kne:[.58,.66], ank:[.50,.92] },
  },
  curl: {
    label: 'Curl de bíceps',
    A: { nose:[.50,.12], sho:[.50,.27], elb:[.50,.46], wri:[.535,.66],
         hip:[.50,.58], kne:[.50,.77], ank:[.50,.94] },
    B: { nose:[.50,.12], sho:[.50,.27], elb:[.50,.46], wri:[.45,.33],
         hip:[.50,.58], kne:[.50,.77], ank:[.50,.94] },
  },
  flexion: {
    label: 'Flexión',
    A: { nose:[.26,.46], sho:[.36,.50], elb:[.36,.66], wri:[.36,.80],
         hip:[.60,.56], kne:[.76,.60], ank:[.90,.63] },
    B: { nose:[.26,.55], sho:[.36,.60], elb:[.28,.71], wri:[.36,.80],
         hip:[.60,.63], kne:[.76,.66], ank:[.90,.68] },
  },
};
const ALIAS = {
  squat:'sentadilla', biceps:'curl', pushup:'flexion',
  lat_pulldown:'jalon', dip:'fondos', remo:'remo_maquina',
  deadlift:'peso_muerto', smith:'press_smith',
  jalon:'curl', fondos:'flexion', remo_maquina:'curl',
  peso_muerto:'sentadilla', press_smith:'flexion',
};
const rctx = el.refCanvas?.getContext('2d');
let refKey = 'sentadilla';

function setReference(id) {
  refKey = REF_POSES[id] ? id : (ALIAS[id] || 'sentadilla');
  if (el.refName) el.refName.textContent = REF_POSES[refKey].label;
}

function lerpPose(A, B, t) {
  const o = {};
  for (const k in A) o[k] = [A[k][0] + (B[k][0]-A[k][0])*t, A[k][1] + (B[k][1]-A[k][1])*t];
  return o;
}

// --- geometría para las etiquetas de inclinación esperada ---
const _rnd = (v) => Math.round(v);
const _mid = (a, b) => [(a[0]+b[0])/2, (a[1]+b[1])/2];
function _segVert(top, bottom) {            // inclinación de un segmento vs la vertical
  const vx = top[0]-bottom[0], vy = top[1]-bottom[1];
  const len = Math.hypot(vx, vy) || 1e-6;
  return Math.acos((-vy)/len) * 180/Math.PI;
}
function _abc(a, b, c) {                     // ángulo en el vértice b
  const v1 = [a[0]-b[0], a[1]-b[1]], v2 = [c[0]-b[0], c[1]-b[1]];
  const d = v1[0]*v2[0] + v1[1]*v2[1];
  const m = (Math.hypot(v1[0],v1[1]) * Math.hypot(v2[0],v2[1])) || 1e-6;
  return Math.acos(Math.max(-1, Math.min(1, d/m))) * 180/Math.PI;
}
// Qué ángulos anotar en cada ejercicio: [texto, punto]
const REF_LABELS = {
  sentadilla: (p) => [
    [`Torso ${_rnd(_segVert(p.sho, p.hip))}°`, _mid(p.sho, p.hip)],
    [`Rodilla ${_rnd(_abc(p.hip, p.kne, p.ank))}°`, p.kne],
    [`Tibia ${_rnd(_segVert(p.kne, p.ank))}°`, _mid(p.kne, p.ank)],
  ],
  curl: (p) => [
    [`Codo ${_rnd(_abc(p.sho, p.elb, p.wri))}°`, p.elb],
    [`Torso ${_rnd(_segVert(p.sho, p.hip))}°`, _mid(p.sho, p.hip)],
  ],
  flexion: (p) => [
    [`Cuerpo ${_rnd(_abc(p.sho, p.hip, p.ank))}°`, p.hip],
    [`Codo ${_rnd(_abc(p.sho, p.elb, p.wri))}°`, p.elb],
  ],
};

function drawReference(ts) {
  if (!el.refCanvas || !rctx) return;
  const set = REF_POSES[refKey] || REF_POSES.sentadilla;
  const t = 0.5 - 0.5 * Math.cos(ts / 620);           // 0..1 suave, ciclo ~3.9s
  const p = lerpPose(set.A, set.B, t);
  const W = el.refCanvas.width, H = el.refCanvas.height;
  const X = (x) => x * W, Y = (y) => y * H;
  rctx.clearRect(0, 0, W, H);

  // 1) Plomada: línea vertical de referencia (gravedad) a través de la cadera
  rctx.save();
  rctx.setLineDash([5, 6]); rctx.lineWidth = 1.5; rctx.strokeStyle = 'rgba(255,255,255,.45)';
  rctx.beginPath(); rctx.moveTo(X(p.hip[0]), Y(0.04)); rctx.lineTo(X(p.hip[0]), Y(0.98)); rctx.stroke();
  rctx.restore();

  // 2) Esqueleto ideal
  rctx.lineCap = 'round'; rctx.lineWidth = 5; rctx.strokeStyle = '#28c66d';
  rctx.shadowColor = 'rgba(40,198,109,.6)'; rctx.shadowBlur = 8;
  for (const [a, b] of REF_BONES) {
    rctx.beginPath(); rctx.moveTo(X(p[a][0]), Y(p[a][1])); rctx.lineTo(X(p[b][0]), Y(p[b][1])); rctx.stroke();
  }
  rctx.shadowBlur = 0;
  rctx.fillStyle = '#28c66d';                          // cabeza
  rctx.beginPath(); rctx.arc(X(p.nose[0]), Y(p.nose[1]), 8, 0, 7); rctx.fill();
  rctx.fillStyle = '#dffaec';                          // articulaciones
  for (const k in p) { rctx.beginPath(); rctx.arc(X(p[k][0]), Y(p[k][1]), 3, 0, 7); rctx.fill(); }

  // 3) Etiquetas de inclinación esperada por articulación
  const labels = (REF_LABELS[refKey] || REF_LABELS.sentadilla)(p);
  rctx.font = "700 12px 'Barlow Condensed', sans-serif"; rctx.textBaseline = 'middle';
  for (const [text, pt] of labels) {
    const lx = pt[0] > 0.5 ? X(pt[0]) - 6 : X(pt[0]) + 6;
    rctx.textAlign = pt[0] > 0.5 ? 'right' : 'left';
    rctx.lineWidth = 3; rctx.strokeStyle = 'rgba(0,0,0,.7)';
    rctx.strokeText(text, lx, Y(pt[1]));
    rctx.fillStyle = '#ffd23f';
    rctx.fillText(text, lx, Y(pt[1]));
  }
  requestAnimationFrame(drawReference);
}
if (el.refCanvas) requestAnimationFrame(drawReference);
if (el.refPanel) el.refPanel.addEventListener('click', () => el.refPanel.classList.toggle('min'));

// ---- Init ---------------------------------------------------------------
loadCoaching();
loadExercises().then(() => {
  if (urlLiveEx && el.exerciseSel.querySelector(`option[value="${urlLiveEx}"]`)) {
    el.exerciseSel.value = urlLiveEx;
    applyExerciseCameraHint(urlLiveEx);
    sendConfig();
    setReference(urlLiveEx);
  }
  connect();
});
