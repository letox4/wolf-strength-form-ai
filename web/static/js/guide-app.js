import { MannequinScene } from './mannequin3d.js?v=107';
import { ViewportLabels } from './viewport-labels.js?v=107';

const $ = (id) => document.getElementById(id);

let guide = null;
let coaching = null;
let scene = null;
let labels = null;
let exerciseIdx = -1;
let stepIdx = 0;
let playTimer = null;
let filterQuery = '';

function setLoad(msg, kind = 'loading') {
  const overlay = $('loadOverlay');
  const text = $('loadText');
  if (!overlay || !text) return;
  if (kind === 'hidden') {
    overlay.classList.add('hidden');
    return;
  }
  overlay.classList.remove('hidden');
  text.textContent = msg;
  overlay.classList.toggle('error', kind === 'error');
}

function exIndexById(id) {
  return guide.exercises.findIndex((e) => e.id === id);
}

function selectExerciseById(id) {
  const i = exIndexById(id);
  if (i >= 0) selectExercise(i);
}

function stepInsights(ex, stepIndex) {
  return coaching?.exercises?.[ex.id]?.step_insights?.[String(stepIndex)] || {};
}

function enrichLabels(ex, step, stepIndex) {
  const si = stepInsights(ex, stepIndex);
  const meta = si.angles || {};
  const angles = (step.angles || []).map((a) => ({
    ...a,
    why: a.why || meta[a.label]?.why,
    good_sign: a.good_sign || meta[a.label]?.good_sign,
  }));
  return {
    angles,
    phaseHint: angles.length ? null : (si.coaching || null),
  };
}

async function init() {
  const canvas = $('canvas3d');
  canvas.classList.add('loading');
  setLoad('Cargando motor 3D…');

  scene = new MannequinScene(canvas);
  setLoad('Inicializando personaje…');
  await scene.ready;

  canvas.classList.remove('loading');
  setLoad('', 'hidden');

  labels = new ViewportLabels($('calloutLayer'), scene);
  scene.onFrame = () => labels.update();

  const res = await fetch('/api/guide');
  if (!res.ok) throw new Error(`API /api/guide → ${res.status}`);
  guide = await res.json();
  coaching = guide.coaching || { exercises: {} };

  buildExerciseList();
  buildAngleButtons();

  if (new URLSearchParams(location.search).has('debug')) {
    window.__wolf = {
      scene,
      get guide() { return guide; },
      go(exId, step = 0) { stopPlay(); selectExerciseById(exId); stopPlay(); showStep(step, false); },
      setAngle,
      step: (i) => { stopPlay(); showStep(i, false); },
    };
  }

  $('searchInput').addEventListener('input', (e) => {
    filterQuery = e.target.value.trim().toLowerCase();
    buildExerciseList();
  });
  $('playBtn').addEventListener('click', togglePlay);
  $('prevBtn').addEventListener('click', prevStep);
  $('nextBtn').addEventListener('click', () => { stopPlay(); nextStep(); });

  const qEx = new URLSearchParams(location.search).get('ex');
  if (qEx && exIndexById(qEx) >= 0) selectExerciseById(qEx);
  else if (guide.exercises?.length) selectExercise(0);
  const stepHash = location.hash.match(/step-(\d+)/);
  if (stepHash && exerciseIdx >= 0) showStep(+stepHash[1]);
}

function matchesFilter(ex) {
  if (!filterQuery) return true;
  const hay = [
    ex.name, ex.equipment, ex.summary, ex.category,
    ...(ex.muscles || []),
    ...(ex.tips || []),
  ].join(' ').toLowerCase();
  return hay.includes(filterQuery);
}

function categoryAllProps(cat) {
  const inCat = guide.exercises.filter((e) => (e.category || 'otro') === cat);
  return inCat.length > 0 && inCat.every((e) => (e.props || []).length > 0);
}

function buildExerciseList() {
  const list = $('exerciseList');
  list.innerHTML = '';
  const catLabels = Object.fromEntries((guide.categories || []).map((c) => [c.id, c.label]));
  const order = (guide.categories || []).map((c) => c.id);
  const groups = {};
  guide.exercises.forEach((ex, i) => {
    if (!matchesFilter(ex)) return;
    const c = ex.category || 'otro';
    (groups[c] = groups[c] || []).push({ ex, i });
  });
  if (!Object.keys(groups).length) {
    list.innerHTML = '<p class="empty">Sin resultados</p>';
    return;
  }
  const sorted = [...order, ...Object.keys(groups).filter((k) => !order.includes(k))];
  for (const cat of sorted) {
    const items = groups[cat];
    if (!items?.length) continue;
    const h = document.createElement('div');
    h.className = 'cat-label';
    h.textContent = catLabels[cat] || cat;
    if (categoryAllProps(cat)) {
      const wip = document.createElement('span');
      wip.className = 'cat-wip';
      wip.textContent = '(work in progress)';
      h.appendChild(wip);
    }
    list.appendChild(h);
    for (const { ex, i } of items) {
      const btn = document.createElement('button');
      btn.className = 'ex-btn';
      btn.type = 'button';
      btn.dataset.idx = i;
      btn.innerHTML = `<strong>${ex.name}</strong><span>${ex.equipment || ''}</span>`;
      btn.addEventListener('click', () => selectExercise(i));
      list.appendChild(btn);
    }
  }
}

function buildAngleButtons() {
  const row = $('angleRow');
  row.innerHTML = '';
  (guide.angles || []).forEach((a) => {
    const b = document.createElement('button');
    b.className = 'angle-btn';
    b.type = 'button';
    b.dataset.id = a.id;
    b.textContent = a.label;
    b.title = a.hint || '';
    b.addEventListener('click', () => setAngle(a.id));
    row.appendChild(b);
  });
}

function stepMs() {
  return scene?.getStepMs?.() ?? 2800;
}

function stopPlay() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  const btn = $('playBtn');
  btn.textContent = '▶';
  btn.classList.remove('playing');
  btn.title = 'Repetición completa';
}

function startPlay() {
  stopPlay();
  if (exerciseIdx < 0) return;
  const btn = $('playBtn');
  btn.textContent = '⏸';
  btn.classList.add('playing');
  btn.title = 'Pausar demo';
  playTimer = setInterval(nextStep, stepMs());
}

function togglePlay() {
  if (playTimer) stopPlay();
  else startPlay();
}

function selectExercise(i) {
  exerciseIdx = i;
  stepIdx = 0;
  const ex = guide.exercises[i];
  document.querySelectorAll('.ex-btn').forEach((b) => {
    b.classList.toggle('active', +b.dataset.idx === i);
  });
  $('exTitle').textContent = ex.name;
  renderPhaseTimeline(ex);
  scene.setExercise(ex);
  showStep(0, false);
  setAngle(ex.default_angle || 'side', true);
  startPlay();
}

function renderPhaseTimeline(ex) {
  const wrap = $('phaseTimeline');
  wrap.innerHTML = '';
  ex.steps.forEach((s, i) => {
    const dot = document.createElement('button');
    dot.className = 'phase-dot';
    dot.type = 'button';
    dot.title = s.title;
    dot.dataset.idx = i;
    dot.addEventListener('click', () => {
      stopPlay();
      showStep(i);
    });
    wrap.appendChild(dot);
  });
}

function showStep(i, animateCam = true) {
  if (exerciseIdx < 0) return;
  stepIdx = i;
  const ex = guide.exercises[exerciseIdx];
  const step = ex.steps[i];

  document.querySelectorAll('.phase-dot').forEach((b) => {
    b.classList.toggle('active', +b.dataset.idx === i);
  });

  const title = step.title.replace(/^\d+\.\s*/, '');
  $('stepText').textContent = step.text;
  const counter = $('stepCounter');
  counter.textContent = `${title} · ${i + 1}/${ex.steps.length}`;
  counter.classList.remove('hidden');

  scene.applyPose(step.pose, guide.poses);
  labels.setStepData(enrichLabels(ex, step, i));

  if (step.camera) setAngle(step.camera, !animateCam);
}

function setAngle(id, instant = false) {
  document.querySelectorAll('.angle-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === id);
  });
  scene.setCameraAngle(id, instant);
}

function nextStep() {
  const n = guide.exercises[exerciseIdx].steps.length;
  showStep((stepIdx + 1) % n);
}

function prevStep() {
  stopPlay();
  const n = guide.exercises[exerciseIdx].steps.length;
  showStep((stepIdx - 1 + n) % n);
}

init().catch((err) => {
  console.error('Wolf Strength init failed:', err);
  $('canvas3d')?.classList.remove('loading');
  setLoad(`Error: ${err.message}. Usa IniciarGuia3D.bat y abre http://localhost:8000 (Ctrl+F5).`, 'error');
  $('stepText').textContent = 'No se pudo cargar el visor 3D.';
});
