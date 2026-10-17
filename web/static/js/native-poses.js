/**
 * Poses nativas mannequin.js — API oficial, sin mapeo legacy.
 * Basado en el modelo articulado de boytchev/mannequin.js
 */
export const POSE_ENGINE_VER = 37;

const SUPINE = /db_press|bench_press|incline_press|smith_press/i;
const PRONE = /pushup/i;
const LEG_CURL = /leg_curl/i;

export function isSupinePose(poseId) {
  return SUPINE.test(poseId || '');
}

export function isPronePose(poseId) {
  return PRONE.test(poseId || '');
}

export function isLegCurlPose(poseId) {
  return LEG_CURL.test(poseId || '');
}

export function capturePosture(fig) {
  return JSON.parse(JSON.stringify(fig.posture));
}

/** Postura neutra de pie (Male por defecto) */
export function resetStanding(fig) {
  fig.position.set(0, 0, 0);
  fig.body.position.set(0, 0, 0);
  fig.body.bend = 0;
  fig.body.turn = -90;
  fig.body.tilt = 0;
  fig.torso.bend = 2;
  fig.torso.turn = 0;
  fig.torso.tilt = 0;
  fig.head.nod = -10;
  fig.head.turn = 0;
  fig.head.tilt = 0;
  for (const s of ['l', 'r']) {
    const leg = fig[`${s}_leg`];
    const knee = fig[`${s}_knee`];
    const ankle = fig[`${s}_ankle`];
    leg.raise = 0;
    leg.straddle = 6;
    leg.turn = 0;
    knee.bend = 0;
    ankle.bend = 0;
    ankle.turn = 6;
    ankle.tilt = 6;
    const arm = fig[`${s}_arm`];
    const elbow = fig[`${s}_elbow`];
    const wrist = fig[`${s}_wrist`];
    arm.raise = -5;
    arm.straddle = 7;
    arm.turn = 0;
    elbow.bend = 15;
    wrist.bend = 5;
    wrist.turn = 0;
    wrist.tilt = 0;
    fig[`${s}_fingers`].bend = 10;
  }
}

function legs(fig, raise, knee, straddle = 6) {
  for (const s of ['l', 'r']) {
    fig[`${s}_leg`].raise = raise;
    fig[`${s}_leg`].straddle = straddle;
    fig[`${s}_knee`].bend = knee;
    fig[`${s}_ankle`].bend = Math.min(28, knee * 0.24);
  }
}

// Manos recogidas a la altura del hombro, agarrando el yugo del hack squat
// (antebrazo plegado hacia arriba, codo abajo y pegado al cuerpo).
function hackGrip(fig) {
  for (const s of ['l', 'r']) {
    fig[`${s}_arm`].raise = -20;
    fig[`${s}_arm`].straddle = 12;
    fig[`${s}_arm`].turn = 20;
    fig[`${s}_elbow`].bend = 155;
    fig[`${s}_wrist`].bend = 0;
    fig[`${s}_wrist`].turn = 0;
  }
}

function armsSides(fig, raise = -5, straddle = 7, elbow = 15) {
  for (const s of ['l', 'r']) {
    fig[`${s}_arm`].raise = raise;
    fig[`${s}_arm`].straddle = straddle;
    fig[`${s}_arm`].turn = 0;
    fig[`${s}_elbow`].bend = elbow;
    fig[`${s}_wrist`].bend = 5;
  }
}

function armsBarGrip(fig, { raise, straddle, elbow = 8, turnOut = 10 }) {
  fig.l_arm.raise = raise;
  fig.l_arm.straddle = straddle;
  fig.l_arm.turn = -turnOut;
  fig.l_elbow.bend = elbow;
  fig.l_wrist.bend = 4;
  fig.l_wrist.turn = 0;
  fig.l_wrist.tilt = 0;

  fig.r_arm.raise = raise;
  fig.r_arm.straddle = straddle;
  fig.r_arm.turn = turnOut;
  fig.r_elbow.bend = elbow;
  fig.r_wrist.bend = 4;
  fig.r_wrist.turn = 0;
  fig.r_wrist.tilt = 0;
}

function laySupine(fig, torsoBend = 10) {
  fig.body.bend = -84;
  fig.body.turn = -90;
  fig.body.tilt = 0;
  fig.torso.bend = torsoBend;
  fig.torso.tilt = 0;
  fig.head.nod = 14;
  legs(fig, -46, 72, 12);
  fig.l_ankle.bend = 18;
  fig.r_ankle.bend = 18;
}

function layProne(fig) {
  fig.body.bend = 84;
  fig.body.turn = -90;
  fig.body.tilt = 0;
  fig.torso.bend = 4;
  fig.head.nod = -8;
  legs(fig, 0, 0, 4);
}

function hinge(fig, torso, knee = 18, legRaise = 12) {
  fig.torso.bend = torso;
  legs(fig, legRaise, knee);
}

function hingeDeadlift(fig, { torso, knee, legRaise, legStraddle = 10, arms, headNod = -8 }) {
  fig.torso.bend = torso;
  fig.torso.tilt = 0;
  legs(fig, legRaise, knee, legStraddle);
  armsBarGrip(fig, arms);
  fig.head.nod = headNod;
}

function armsFront(fig, raise, straddle, elbow) {
  for (const s of ['l', 'r']) {
    fig[`${s}_arm`].raise = raise;
    fig[`${s}_arm`].straddle = straddle;
    fig[`${s}_arm`].turn = 0;
    fig[`${s}_elbow`].bend = elbow;
    fig[`${s}_wrist`].bend = 3;
  }
}

// Brazos por encima de la cabeza. El "raise" (rotación Z) se envuelve por gimbal
// más allá de ~95°, así que para llevar los brazos arriba usamos "straddle" (abducción).
// straddle 90 = brazos horizontales en T; 180 = brazos rectos hacia arriba.
function armsUp(fig, straddle, elbow = 6, turn = 0) {
  for (const s of ['l', 'r']) {
    fig[`${s}_arm`].raise = 0;
    fig[`${s}_arm`].turn = turn;
    fig[`${s}_arm`].straddle = straddle;
    fig[`${s}_elbow`].bend = elbow;
    fig[`${s}_wrist`].bend = 0;
  }
}

/** Zancada / búlgara — pierna delantera (r) + trasera (l) */
function splitStance(fig, {
  frontRaise, frontKnee, backRaise, backKnee,
  torso = 6, stride = 18, offsetZ = 0, bodyShiftZ = 0,
}) {
  fig.position.set(0, 0, offsetZ);
  fig.body.position.set(0, 0, bodyShiftZ);
  fig.r_leg.raise = frontRaise;
  fig.r_leg.straddle = stride;
  fig.r_leg.turn = 0;
  fig.r_knee.bend = frontKnee;
  fig.r_ankle.bend = Math.min(30, frontKnee * 0.26);
  fig.l_leg.raise = backRaise;
  fig.l_leg.straddle = Math.max(4, stride - 10);
  fig.l_leg.turn = 0;
  fig.l_knee.bend = backKnee;
  fig.l_ankle.bend = Math.min(30, backKnee * 0.22);
  fig.torso.bend = torso;
  fig.torso.tilt = 0;
}

/** Boca abajo en camilla femoral — cadera en banco, piernas colgando */
function layProneCurl(fig) {
  fig.body.bend = 78;
  fig.body.turn = -90;
  fig.body.tilt = 0;
  fig.torso.bend = 10;
  fig.torso.tilt = 0;
  fig.head.nod = -18;
  fig.head.turn = 0;
  for (const s of ['l', 'r']) {
    fig[`${s}_leg`].raise = 0;
    fig[`${s}_leg`].straddle = 5;
    fig[`${s}_leg`].turn = 0;
    fig[`${s}_knee`].bend = 8;
    fig[`${s}_ankle`].bend = 12;
  }
}

/** Catálogo de poses — valores afinados a mannequin.js */
const POSES = {
  squat_top() {
    resetStanding(this);
  },
  squat_bottom() {
    resetStanding(this);
    // raise se mantiene <=76: por encima de ~78 la pierna cruza el umbral de
    // gimbal de mannequin.js y la rodilla se dispara lateralmente (splay).
    this.torso.bend = 36;
    legs(this, 76, 116, 12);
    this.l_ankle.bend = 28;
    this.r_ankle.bend = 28;
    armsSides(this, 8, 14, 25);
  },
  bulgarian_top() {
    resetStanding(this);
    splitStance(this, {
      frontRaise: 18,
      frontKnee: 28,
      backRaise: -46,
      backKnee: 42,
      torso: 6,
      stride: 22,
      offsetZ: 0.1,
    });
    armsSides(this, -5, 10, 15);
  },
  bulgarian_bottom() {
    resetStanding(this);
    splitStance(this, {
      frontRaise: 62,
      frontKnee: 98,
      backRaise: -48,
      backKnee: 94,
      torso: 12,
      stride: 22,
      offsetZ: 0.1,
    });
    armsSides(this, 6, 12, 22);
  },
  hack_top() {
    resetStanding(this);
    // Reclinado hacia atrás contra el carro del hack.
    this.body.bend = -12;
    this.torso.bend = 4;
    this.head.nod = 10;
    legs(this, 10, 14, 12);
    hackGrip(this);
  },
  hack_bottom() {
    resetStanding(this);
    this.body.bend = -12;
    this.torso.bend = 6;
    this.head.nod = 10;
    legs(this, 66, 104, 12);
    hackGrip(this);
  },
  lunge_top() {
    resetStanding(this);
    splitStance(this, {
      frontRaise: 16,
      frontKnee: 22,
      backRaise: -42,
      backKnee: 32,
      torso: 8,
      stride: 32,
      offsetZ: 0,
      bodyShiftZ: -0.08,
    });
    armsSides(this, -2, 10, 15);
  },
  lunge_down() {
    resetStanding(this);
    splitStance(this, {
      frontRaise: 64,
      frontKnee: 98,
      backRaise: -2,
      backKnee: 98,
      torso: 16,
      stride: 32,
      offsetZ: 0.48,
      bodyShiftZ: 0.12,
    });
    armsSides(this, 6, 12, 22);
  },
  dl_setup() {
    resetStanding(this);
    hingeDeadlift(this, {
      torso: 54,
      knee: 130,
      legRaise: 50,
      legStraddle: 5,
      arms: { raise: 28, straddle: 11, elbow: 6, turnOut: 10 },
      headNod: -14,
    });
    this.l_ankle.bend = 30;
    this.r_ankle.bend = 30;
  },
  dl_top() {
    resetStanding(this);
    this.torso.bend = 2;
    legs(this, 0, 0, 9);
    armsBarGrip(this, { raise: -28, straddle: 10, elbow: 14, turnOut: 5 });
    this.head.nod = -8;
  },
  rdl_top() {
    resetStanding(this);
    this.torso.bend = 4;
    legs(this, 4, 12, 8);
    armsBarGrip(this, { raise: -26, straddle: 9, elbow: 10, turnOut: 5 });
    this.head.nod = -10;
  },
  rdl_bottom() {
    resetStanding(this);
    hingeDeadlift(this, {
      torso: 58,
      knee: 12,
      legRaise: 6,
      legStraddle: 8,
      arms: { raise: 44, straddle: 10, elbow: 8, turnOut: 8 },
      headNod: -6,
    });
  },
  db_dl_setup() {
    resetStanding(this);
    hingeDeadlift(this, {
      torso: 52,
      knee: 128,
      legRaise: 50,
      legStraddle: 5,
      arms: { raise: 26, straddle: 13, elbow: 6, turnOut: 12 },
      headNod: -14,
    });
    this.l_ankle.bend = 30;
    this.r_ankle.bend = 30;
  },
  db_dl_top() {
    resetStanding(this);
    this.torso.bend = 2;
    legs(this, 0, 0, 10);
    armsBarGrip(this, { raise: -36, straddle: 28, elbow: 12, turnOut: 8 });
  },
  trap_setup() {
    resetStanding(this);
    hingeDeadlift(this, {
      torso: 50,
      knee: 128,
      legRaise: 50,
      legStraddle: 5,
      arms: { raise: 26, straddle: 17, elbow: 6, turnOut: 14 },
      headNod: -14,
    });
    this.l_ankle.bend = 30;
    this.r_ankle.bend = 30;
  },
  trap_top() {
    resetStanding(this);
    this.torso.bend = 2;
    legs(this, 0, 0, 12);
    armsBarGrip(this, { raise: -34, straddle: 32, elbow: 12, turnOut: 8 });
  },
  leg_curl_start() {
    layProneCurl(this);
    armsSides(this, -18, 16, 38);
  },
  leg_curl_contract() {
    layProneCurl(this);
    this.l_knee.bend = 118;
    this.r_knee.bend = 118;
    armsSides(this, -18, 16, 38);
  },
  bench_press_top() {
    laySupine(this, 8);
    armsFront(this, 12, 34, 12);
  },
  bench_press_bottom() {
    laySupine(this, 8);
    armsFront(this, 6, 36, 82);
  },
  incline_press_top() {
    laySupine(this, 18);
    armsFront(this, 18, 38, 10);
  },
  incline_press_bottom() {
    laySupine(this, 18);
    armsFront(this, 10, 40, 86);
  },
  db_press_top() {
    POSES.bench_press_top.call(this);
  },
  db_press_bottom() {
    POSES.bench_press_bottom.call(this);
  },
  pushup_top() {
    layProne(this);
    armsFront(this, -72, 22, 165);
    this.l_leg.raise = 2;
    this.r_leg.raise = 2;
  },
  pushup_bottom() {
    POSES.pushup_top.call(this);
    armsFront(this, -68, 24, 95);
  },
  crossover_start() {
    resetStanding(this);
    armsFront(this, 5, 42, 12);
  },
  crossover_contract() {
    resetStanding(this);
    armsFront(this, 8, 8, 95);
  },
  front_raise_down() {
    resetStanding(this);
    armsFront(this, -8, 12, 8);
  },
  front_raise_up() {
    resetStanding(this);
    armsFront(this, 88, 10, 6);
  },
  bb_row_start() {
    resetStanding(this);
    hinge(this, 42, 18, 14);
    armsSides(this, 33, 9, 10);
    this.head.nod = -10;
  },
  bb_row_pull() {
    POSES.bb_row_start.call(this);
    armsSides(this, 8, 16, 82);
  },
  tbar_start() {
    POSES.bb_row_start.call(this);
  },
  tbar_pull() {
    POSES.bb_row_pull.call(this);
  },
  lat_pull_start() {
    resetStanding(this);
    this.torso.bend = 4;
    legs(this, 88, 90, 16);
    this.l_ankle.bend = 22;
    this.r_ankle.bend = 22;
    armsUp(this, 150, 8);
    this.head.nod = -4;
  },
  lat_pull_mid() {
    POSES.lat_pull_start.call(this);
    armsUp(this, 128, 46);
    this.head.nod = -2;
  },
  lat_pull_bottom() {
    POSES.lat_pull_start.call(this);
    armsSides(this, 6, 22, 96);
    this.torso.bend = -6;
    this.head.nod = 0;
  },
  uni_row_start() {
    resetStanding(this);
    hinge(this, 82, 20, 14);
    this.torso.tilt = 0;
    this.head.nod = -12;
    this.r_arm.raise = 30;
    this.r_arm.straddle = 8;
    this.r_arm.turn = 6;
    this.r_elbow.bend = 8;
    this.r_wrist.bend = 4;
    this.l_arm.raise = 30;
    this.l_arm.straddle = 12;
    this.l_arm.turn = 0;
    this.l_elbow.bend = 14;
  },
  uni_row_pull() {
    POSES.uni_row_start.call(this);
    this.l_arm.raise = 12;
    this.l_arm.straddle = 20;
    this.l_elbow.bend = 96;
  },
  curl_down() {
    resetStanding(this);
    armsFront(this, -6, 12, 12);
  },
  curl_up() {
    resetStanding(this);
    armsFront(this, -4, 14, 118);
  },
  hammer_down() {
    POSES.curl_down.call(this);
    this.l_arm.turn = 16;
    this.r_arm.turn = -16;
  },
  hammer_up() {
    POSES.curl_up.call(this);
    this.l_arm.turn = 16;
    this.r_arm.turn = -16;
  },
  ez_curl_down() {
    POSES.curl_down.call(this);
    this.l_arm.turn = 10;
    this.r_arm.turn = -10;
  },
  ez_curl_up() {
    POSES.curl_up.call(this);
    this.l_arm.turn = 10;
    this.r_arm.turn = -10;
  },
  ohp_top() {
    resetStanding(this);
    armsUp(this, 166, 6);
    this.head.nod = 2;
  },
  ohp_bottom() {
    resetStanding(this);
    armsFront(this, 8, 14, 92);
  },
  lat_raise_down() {
    resetStanding(this);
    armsSides(this, -8, 18, 12);
  },
  lat_raise_up() {
    resetStanding(this);
    armsUp(this, 86, 10);
  },
};

export function applyNativePose(fig, poseId) {
  const fn = POSES[poseId];
  if (!fn) {
    resetStanding(fig);
    return false;
  }
  fn.call(fig);
  return true;
}

const ROOT_OFFSETS = {
  lunge_top: { f: [0, 0, 0], b: [0, 0, -0.08] },
  lunge_down: { f: [0, 0, 0.48], b: [0, 0, 0.12] },
  bulgarian_top: { f: [0, 0, 0.1], b: [0, 0, 0] },
  bulgarian_bottom: { f: [0, 0, 0.1], b: [0, 0, 0] },
};

export function landFigure(fig, poseId) {
  if (isLegCurlPose(poseId)) {
    fig.position.set(0, -0.23, fig.position.z || 0);
    fig.updateMatrixWorld(true);
    return;
  }
  if (isSupinePose(poseId)) {
    fig.position.set(0, 0.06, fig.position.z || 0);
    fig.updateMatrixWorld(true);
    return;
  }
  if (isPronePose(poseId)) {
    fig.position.set(0, 0, fig.position.z || 0);
    fig.body.position.set(0, 0, 0);
    fig.stepOnGround();
    return;
  }
  if (/bulgarian|lunge/i.test(poseId || '')) {
    // Los offsets de raíz de zancada/búlgara no viven en la postura cacheada,
    // así que se fijan explícitamente por pose para evitar arrastre entre pasos.
    const off = ROOT_OFFSETS[poseId] || { f: [0, 0, 0], b: [0, 0, 0] };
    fig.position.set(off.f[0], off.f[1], off.f[2]);
    fig.body.position.set(off.b[0], off.b[1], off.b[2]);
    fig.stepOnGround();
    return;
  }
  if (/^(dl_|db_dl_|trap_|rdl_)/.test(poseId || '')) {
    fig.position.set(0, 0, 0);
    fig.stepOnGround();
    return;
  }
  fig.position.set(0, 0, 0);
  fig.body.position.set(0, 0, 0);
  fig.stepOnGround();
}

export function applyMannequinPose(fig, poseId, poses, gripMode = 'open') {
  const p = poses?.[poseId] || {};
  if (p.mannequin?.version && p._engineVer === POSE_ENGINE_VER) {
    fig.posture = p.mannequin;
  } else {
    applyNativePose(fig, poseId);
    p.mannequin = capturePosture(fig);
    p._engineVer = POSE_ENGINE_VER;
  }
  landFigure(fig, poseId);
  if (gripMode !== 'open') {
    const bend = { dumbbell: 88, bar: 92, cable: 82 }[gripMode] ?? 85;
    fig.l_fingers.bend = bend;
    fig.r_fingers.bend = bend;
  }
  return capturePosture(fig);
}

export function gripModeForProps(names) {
  const s = new Set(names || []);
  if (s.has('ez_bar') || s.has('barbell') || s.has('barbell_bench') || s.has('trap_bar')) return 'bar';
  if (s.has('dumbbells')) return 'dumbbell';
  if (s.has('lat_pulldown') || s.has('cable_crossover')) return 'cable';
  return 'open';
}

export function applyFingerGrip(fig, mode = 'open') {
  if (!fig || mode === 'open') return;
  const bend = { dumbbell: 88, bar: 92, cable: 82 }[mode] ?? 85;
  fig.l_fingers.bend = bend;
  fig.r_fingers.bend = bend;
}
