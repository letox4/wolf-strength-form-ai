import * as THREE from 'three';
import { alignBarBetweenWrists, mountOnWrist, placeOnBone, placeBarOnFloor, placeDumbbellOnFloor, releaseToPool } from './prop-rig.js?v=95';
import { getGroundLevel } from 'mannequin';
import { WRIST_GRIP } from './grip-pose.js';

const METAL = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.4, metalness: 0.75 });
const METAL_LIGHT = new THREE.MeshStandardMaterial({ color: 0x4a5060, roughness: 0.35, metalness: 0.8 });
const PAD = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.85, metalness: 0.05 });
const PAD_BENCH = new THREE.MeshStandardMaterial({ color: 0x303640, roughness: 0.75, metalness: 0.1 });
const BAR = new THREE.MeshStandardMaterial({ color: 0x9aa2ae, roughness: 0.25, metalness: 0.9 });
const PLATE = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.5, metalness: 0.6 });
const DB_HANDLE = new THREE.MeshStandardMaterial({ color: 0xb0b8c4, roughness: 0.3, metalness: 0.85 });
const DB_PLATE = new THREE.MeshStandardMaterial({ color: 0x6e7580, roughness: 0.45, metalness: 0.7 });

function box(w, h, d, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(rt, rb, h, mat, parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function makeDumbbell() {
  const g = new THREE.Group();
  g.scale.setScalar(0.54);
  cyl(0.07, 0.07, 0.5, DB_HANDLE, g, [0, 0, 0], [0, 0, Math.PI / 2]);
  cyl(0.15, 0.15, 0.085, DB_PLATE, g, [-0.24, 0, 0], [0, 0, Math.PI / 2]);
  cyl(0.15, 0.15, 0.085, DB_PLATE, g, [0.24, 0, 0], [0, 0, Math.PI / 2]);
  g.traverse((c) => { if (c.isMesh) c.renderOrder = 8; });
  return g;
}

function makeOlympicBar(len = 2.6, plateR = 0.14) {
  const g = new THREE.Group();
  cyl(0.035, 0.035, len, BAR, g, [0, 0, 0], [0, 0, Math.PI / 2]);
  cyl(plateR, plateR, 0.06, PLATE, g, [-len * 0.42, 0, 0], [0, 0, Math.PI / 2]);
  cyl(plateR, plateR, 0.06, PLATE, g, [len * 0.42, 0, 0], [0, 0, Math.PI / 2]);
  g.traverse((c) => { if (c.isMesh) c.renderOrder = 8; });
  return g;
}

function makeEzBar() {
  const g = new THREE.Group();
  cyl(0.028, 0.028, 0.95, BAR, g, [0, 0, 0], [0, 0, Math.PI / 2]);
  cyl(0.05, 0.05, 0.035, PLATE, g, [-0.38, 0, 0], [0, 0, Math.PI / 2]);
  cyl(0.05, 0.05, 0.035, PLATE, g, [0.38, 0, 0], [0, 0, Math.PI / 2]);
  return g;
}

/**
 * Equipamiento 3D v2
 * - Máquinas fijas en el suelo (banco, poleas, hack…)
 * - Todo lo que va en las manos va bajo figure.handheld (sigue al maniquí)
 */
export class GymProps {
  constructor(scene) {
    this.scene = scene;
    this.figure = null;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.parts = {};
    this.activeSet = new Set();
    this.dbMode = 'hang';
    this.supine = false;
    this.bulgarianMode = false;
    this.hackMode = false;
    this.legCurlMode = false;
    this.poseId = '';
    this.unilateralDb = false;
    this.targetState = {};
    this.currentState = {};
    this._dbMounted = false;

    this._buildMachines();
    this._buildHandheld();
    this._buildFloorMark();
    this.setActive([]);
  }

  _buildFloorMark() {
    this.floorMark = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.006, 0.13),
      new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.25, roughness: 0.88 }),
    );
    this.floorMark.visible = false;
    this.floorMark.receiveShadow = true;
    this.root.add(this.floorMark);
  }

  setFigure(figure) {
    this.figure = figure;
    if (figure && this.handheld.parent !== figure) {
      figure.add(this.handheld);
    }
    this._dbMounted = false;
  }

  setBulgarianMode(on) {
    this.bulgarianMode = !!on;
  }

  setHackMode(on) {
    this.hackMode = !!on;
  }

  setLegCurlMode(on) {
    this.legCurlMode = !!on;
  }

  setDumbbellMode(mode) {
    const next = mode || 'hang';
    if (this.dbMode !== next) {
      this.dbMode = next;
      this._dbMounted = false;
    }
  }

  setSupine(on) {
    this.supine = !!on;
  }

  setUnilateralDb(on) {
    this.unilateralDb = !!on;
    if (this.dbR) this.dbR.visible = this.activeSet.has('dumbbells') && !this.unilateralDb;
  }

  _g(name) {
    const g = new THREE.Group();
    g.visible = false;
    this.root.add(g);
    this.parts[name] = g;
    return g;
  }

  _buildMachines() {
    const lat = this._g('lat_pulldown');
    box(0.08, 2.6, 0.08, METAL, lat, [0.55, 1.3, -0.35]);
    box(0.5, 0.06, 0.4, METAL, lat, [0, 0.32, -0.35]);
    box(0.45, 0.08, 0.35, PAD, lat, [0, 0.38, -0.35]);
    box(0.5, 0.12, 0.15, PAD, lat, [0, 0.72, 0.15]);
    this.pullCable = cyl(0.015, 0.015, 2.2, METAL_LIGHT, lat, [0, 1.35, -0.35]);
    lat.position.z = 0.34;

    this._g('dip_bars');
    box(0.06, 1.5, 0.06, METAL, this.parts.dip_bars, [-0.35, 0.75, 0]);
    box(0.06, 1.5, 0.06, METAL, this.parts.dip_bars, [0.35, 0.75, 0]);
    cyl(0.03, 0.03, 0.5, BAR, this.parts.dip_bars, [-0.35, 1.05, 0], [0, 0, Math.PI / 2]);
    cyl(0.03, 0.03, 0.5, BAR, this.parts.dip_bars, [0.35, 1.05, 0], [0, 0, Math.PI / 2]);

    const row = this._g('row_machine');
    box(0.08, 0.5, 0.6, METAL, row, [0, 0.25, -0.5]);
    box(0.45, 0.5, 0.08, PAD, row, [0, 0.82, -0.12], [0.55, 0, 0]);

    const bench = this._g('bench_flat');
    box(0.5, 0.14, 0.95, PAD_BENCH, bench, [0, 0, 0]);
    box(0.45, 0.06, 0.08, PAD_BENCH, bench, [0, 0.14, -0.42]);
    box(0.08, 0.35, 0.08, METAL, bench, [-0.28, -0.2, 0.48]);
    box(0.08, 0.35, 0.08, METAL, bench, [0.28, -0.2, 0.48]);

    const step = this._g('bulgarian_step');
    box(0.34, 0.05, 0.22, PAD_BENCH, step, [0, 0.44, 0]);
    box(0.04, 0.42, 0.04, METAL, step, [0.13, 0.18, 0.08]);
    box(0.04, 0.42, 0.04, METAL, step, [-0.13, 0.18, 0.08]);

    const incl = this._g('bench_incline');
    box(0.48, 0.12, 0.9, PAD_BENCH, incl, [0, 0, 0], [0.42, 0, 0]);
    box(0.42, 0.06, 0.08, PAD_BENCH, incl, [0, 0.14, -0.35], [0.5, 0, 0]);
    box(0.08, 0.35, 0.08, METAL, incl, [-0.28, -0.2, 0.48]);
    box(0.08, 0.35, 0.08, METAL, incl, [0.28, -0.2, 0.48]);

    const hack = this._g('hack_squat');
    // Estructura fija del hack (sled inclinado) apoyada en el suelo.
    const GYh = -0.70;
    // Plataforma para los pies (ligeramente elevada, al frente del carro).
    box(0.95, 0.07, 0.60, METAL, hack, [0, GYh + 0.05, 0.22]);
    box(0.95, 0.05, 0.10, PAD, hack, [0, GYh + 0.10, 0.48]);
    // Rieles laterales inclinados hacia atrás (~22°).
    box(0.09, 1.9, 0.09, METAL, hack, [-0.46, GYh + 0.86, -0.34], [0.38, 0, 0]);
    box(0.09, 1.9, 0.09, METAL, hack, [0.46, GYh + 0.86, -0.34], [0.38, 0, 0]);
    box(1.0, 0.09, 0.09, METAL, hack, [0, GYh + 1.74, -0.72]);

    // Respaldo inclinado (carro) — se ancla a la espalda en runtime.
    // Alto moderado: sostiene de la cadera a la parte alta de la espalda,
    // sin llegar a la cabeza (si no, la tapa desde el lateral).
    this.hackBack = new THREE.Group();
    hack.add(this.hackBack);
    box(0.52, 0.80, 0.10, PAD, this.hackBack, [0, 0, 0]);

    // Hombreras (yugo) — se anclan sobre los hombros en runtime.
    this.hackPad = new THREE.Group();
    hack.add(this.hackPad);
    box(0.22, 0.13, 0.30, PAD, this.hackPad, [-0.25, 0, 0]);
    box(0.22, 0.13, 0.30, PAD, this.hackPad, [0.25, 0, 0]);
    box(0.68, 0.10, 0.10, METAL, this.hackPad, [0, 0.03, -0.14]);

    const leg = this._g('leg_curl');
    // Estructura fija de la camilla, apoyada en el suelo (GY = nivel del piso).
    const GY = -0.70;
    box(0.10, 0.08, 1.34, METAL, leg, [-0.34, GY + 0.04, 0.02]);
    box(0.10, 0.08, 1.34, METAL, leg, [0.34, GY + 0.04, 0.02]);
    box(0.78, 0.08, 0.14, METAL, leg, [0, GY + 0.04, 0.60]);
    box(0.78, 0.08, 0.14, METAL, leg, [0, GY + 0.04, -0.55]);
    [[-0.30, 0.52], [0.30, 0.52], [-0.30, -0.46], [0.30, -0.46]].forEach((p) => {
      box(0.07, 0.40, 0.07, METAL, leg, [p[0], GY + 0.24, p[1]]);
    });
    // Almohadilla larga: sostiene torso y muslos (se ancla al cuerpo en runtime).
    this.legCurlPad = new THREE.Group();
    box(0.54, 0.10, 1.05, PAD_BENCH, this.legCurlPad, [0, 0, 0]);
    leg.add(this.legCurlPad);
    // Rodillo de tobillos con topes laterales.
    this.legCurlRoll = new THREE.Group();
    leg.add(this.legCurlRoll);
    cyl(0.07, 0.07, 0.46, PAD, this.legCurlRoll, [0, 0, 0], [0, 0, Math.PI / 2]);
    cyl(0.05, 0.05, 0.05, BAR, this.legCurlRoll, [-0.25, 0, 0], [0, 0, Math.PI / 2]);
    cyl(0.05, 0.05, 0.05, BAR, this.legCurlRoll, [0.25, 0, 0], [0, 0, Math.PI / 2]);

    const cable = this._g('cable_crossover');
    box(0.07, 2.3, 0.07, METAL, cable, [-1.1, 1.15, -0.2]);
    box(0.07, 2.3, 0.07, METAL, cable, [1.1, 1.15, -0.2]);
    this.cableL = new THREE.Group();
    this.cableR = new THREE.Group();
    this.cableL.position.set(-1.1, 2.0, -0.2);
    this.cableR.position.set(1.1, 2.0, -0.2);
    cable.add(this.cableL, this.cableR);
    cyl(0.015, 0.015, 1.2, METAL_LIGHT, this.cableL, [0, -0.5, 0.4], [0.4, 0, 0]);
    cyl(0.015, 0.015, 1.2, METAL_LIGHT, this.cableR, [0, -0.5, 0.4], [0.4, 0, 0]);

    const tbar = this._g('tbar_row');
    box(0.08, 0.08, 0.6, METAL, tbar, [0, 0.06, -0.35]);
    cyl(0.03, 0.03, 0.55, BAR, tbar, [0, 0.12, -0.05], [0.3, 0, 0]);

    const smith = this._g('smith_rack');
    box(0.07, 2.4, 0.07, METAL, smith, [-0.55, 1.2, -0.2]);
    box(0.07, 2.4, 0.07, METAL, smith, [0.55, 1.2, -0.2]);
  }

  _buildHandheld() {
    this.handheld = new THREE.Group();
    this.handheld.name = 'handheld';
    this.parts.dumbbells = new THREE.Group();
    this.parts.dumbbells.visible = false;
    this.handheld.add(this.parts.dumbbells);

    this.dbL = makeDumbbell();
    this.dbR = makeDumbbell();
    this.parts.dumbbells.add(this.dbL, this.dbR);

    this.deadliftBar = makeOlympicBar(2.8, 0.20);
    this.deadliftBar.visible = false;
    this.handheld.add(this.deadliftBar);

    this.pressBar = makeOlympicBar(2.4, 0.12);
    this.pressBar.visible = false;
    this.handheld.add(this.pressBar);

    this.ezBar = makeEzBar();
    this.ezBar.visible = false;
    this.handheld.add(this.ezBar);

    this.trapBar = new THREE.Group();
    this.trapBar.visible = false;
    box(0.9, 0.05, 0.7, BAR, this.trapBar);
    box(0.05, 0.65, 0.05, BAR, this.trapBar, [-0.35, 0.28, 0.22]);
    box(0.05, 0.65, 0.05, BAR, this.trapBar, [0.35, 0.28, 0.22]);
    cyl(0.19, 0.19, 0.05, PLATE, this.trapBar, [-0.35, 0.02, 0], [0, 0, Math.PI / 2]);
    cyl(0.19, 0.19, 0.05, PLATE, this.trapBar, [0.35, 0.02, 0], [0, 0, Math.PI / 2]);
    this.handheld.add(this.trapBar);

    this.pullHandle = new THREE.Group();
    this.pullHandle.visible = false;
    box(0.55, 0.04, 0.04, BAR, this.pullHandle);
    cyl(0.015, 0.015, 0.45, METAL_LIGHT, this.pullHandle, [0, -0.28, 0]);
    this.handheld.add(this.pullHandle);

    this.rowHandle = new THREE.Group();
    this.rowHandle.visible = false;
    box(0.35, 0.03, 0.03, BAR, this.rowHandle);
    cyl(0.025, 0.025, 0.12, BAR, this.rowHandle, [-0.18, 0, 0], [0, 0, Math.PI / 2]);
    cyl(0.025, 0.025, 0.12, BAR, this.rowHandle, [0.18, 0, 0], [0, 0, Math.PI / 2]);
    this.handheld.add(this.rowHandle);

    this.cableHandleL = box(0.08, 0.12, 0.04, BAR, this.handheld);
    this.cableHandleR = box(0.08, 0.12, 0.04, BAR, this.handheld);
    this.cableHandleL.visible = false;
    this.cableHandleR.visible = false;

    this.tbarGrip = new THREE.Group();
    this.tbarGrip.visible = false;
    box(0.28, 0.04, 0.04, BAR, this.tbarGrip);
    this.handheld.add(this.tbarGrip);
  }

  setLegCurlMode(on) {
    this.legCurlMode = !!on;
  }

  setPoseId(id) {
    this.poseId = id || '';
  }

  _isDeadliftFromFloor() {
    return /^(dl_setup|db_dl_setup|trap_setup)$/.test(this.poseId);
  }

  _syncFloorMark() {
    const fig = this.figure;
    if (!this.floorMark || !fig) return;
    const show = this._isDeadliftFromFloor();
    this.floorMark.visible = show;
    if (!show) return;
    fig.updateWorldMatrix(true, true);
    const pL = new THREE.Vector3();
    const pR = new THREE.Vector3();
    fig.l_ankle.getWorldPosition(pL);
    fig.r_ankle.getWorldPosition(pR);
    const mid = pL.clone().add(pR).multiplyScalar(0.5);
    mid.z += 0.04;
    mid.y = getGroundLevel() + 0.003;
    this.floorMark.position.copy(mid);
    const dir = pR.clone().sub(pL);
    if (dir.lengthSq() > 1e-8) {
      dir.normalize();
      this.floorMark.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    }
  }

  _syncBarbells() {
    const fig = this.figure;
    if (!fig) return;

    if (this.deadliftBar.visible) {
      if (this._isDeadliftFromFloor()) {
        placeBarOnFloor(this.deadliftBar, fig, { plateRadius: 0.20, forwardZ: 0.04 });
      } else {
        alignBarBetweenWrists(this.deadliftBar, fig, { yLift: -0.01, zShift: 0.02 });
      }
    }

    if (this.trapBar.visible) {
      if (this._isDeadliftFromFloor()) {
        placeBarOnFloor(this.trapBar, fig, { plateRadius: 0.19, forwardZ: 0 });
      } else {
        alignBarBetweenWrists(this.trapBar, fig, { yLift: -0.02, zShift: 0.03 });
      }
    }

    this._syncFloorMark();
  }

  _mountDumbbells() {
    if (!this.figure || !this.activeSet.has('dumbbells')) return;
    const fig = this.figure;
    const mode = this.dbMode || 'hang';
    const cfg = WRIST_GRIP[mode] || WRIST_GRIP.hang;

    if (mode === 'deadlift' && this._isDeadliftFromFloor()) {
      releaseToPool(this.dbL, this.parts.dumbbells);
      releaseToPool(this.dbR, this.parts.dumbbells);
      placeDumbbellOnFloor(this.dbL, fig, fig.l_wrist);
      placeDumbbellOnFloor(this.dbR, fig, fig.r_wrist);
      this.dbL.visible = true;
      this.dbR.visible = !this.unilateralDb;
      this._dbMounted = true;
      return;
    }

    if (this.dbL.parent === fig) releaseToPool(this.dbL, this.parts.dumbbells);
    if (this.dbR.parent === fig) releaseToPool(this.dbR, this.parts.dumbbells);
    mountOnWrist(this.dbL, fig.l_wrist, cfg.l);
    mountOnWrist(this.dbR, fig.r_wrist, cfg.r);
    this.dbL.visible = true;
    this.dbR.visible = !this.unilateralDb;
    this._dbMounted = true;
  }

  _unmountDumbbells() {
    releaseToPool(this.dbL, this.parts.dumbbells);
    releaseToPool(this.dbR, this.parts.dumbbells);
    this._dbMounted = false;
  }

  _releaseAnchored() {
    releaseToPool(this.parts.bulgarian_step, this.root);
    releaseToPool(this.hackBack, this.parts.hack_squat);
    releaseToPool(this.hackPad, this.parts.hack_squat);
    releaseToPool(this.legCurlPad, this.parts.leg_curl);
    releaseToPool(this.legCurlRoll, this.parts.leg_curl);
  }

  _syncAnchoredProps() {
    const fig = this.figure;
    if (!fig) return;
    const V = new THREE.Vector3();
    const pL = new THREE.Vector3();
    const pR = new THREE.Vector3();

    // Step trasero de la búlgara: colocado en el mundo bajo el pie trasero (l)
    const step = this.parts.bulgarian_step;
    if (step?.visible) {
      if (step.parent !== this.root) this.root.attach(step);
      fig.l_ankle.getWorldPosition(V);
      step.position.set(V.x, V.y - 0.465, V.z + 0.02);
      step.rotation.set(0, 0, 0);
      step.scale.setScalar(1);
    }

    // Camilla femoral: banco bajo el cuerpo tumbado + rodillo en los tobillos
    // Hack squat: respaldo inclinado tras la espalda + yugo sobre los hombros.
    const hackOn = this.hackMode && this.activeSet.has('hack_squat');
    if (hackOn && this.hackBack?.visible) {
      if (this.hackBack.parent !== this.root) this.root.attach(this.hackBack);
      fig.torso.getWorldPosition(pL);
      fig.pelvis.getWorldPosition(pR);
      V.copy(pL).add(pR).multiplyScalar(0.5);
      // Detrás de la espalda (la persona mira a +z, la espalda da a -z).
      this.hackBack.position.set(0, V.y - 0.02, V.z - 0.21);
      this.hackBack.rotation.set(0.30, 0, 0);
    }
    if (hackOn && this.hackPad?.visible) {
      if (this.hackPad.parent !== this.root) this.root.attach(this.hackPad);
      fig.l_arm.getWorldPosition(pL);
      fig.r_arm.getWorldPosition(pR);
      V.copy(pL).add(pR).multiplyScalar(0.5);
      this.hackPad.position.set(0, V.y + 0.05, V.z - 0.05);
      this.hackPad.rotation.set(0, 0, 0);
    }

    const curlOn = this.legCurlMode && this.activeSet.has('leg_curl');
    if (curlOn && this.legCurlPad?.visible) {
      if (this.legCurlPad.parent !== this.root) this.root.attach(this.legCurlPad);
      fig.pelvis.getWorldPosition(V);
      this.legCurlPad.position.set(0, V.y - 0.14, 0.02);
      this.legCurlPad.rotation.set(0, 0, 0);
    }
    if (curlOn && this.legCurlRoll?.visible) {
      if (this.legCurlRoll.parent !== this.root) this.root.attach(this.legCurlRoll);
      fig.l_ankle.getWorldPosition(pL);
      fig.r_ankle.getWorldPosition(pR);
      V.copy(pL).add(pR).multiplyScalar(0.5);
      // Boca abajo: el rodillo apoya por encima del dorso del tobillo.
      this.legCurlRoll.position.set(V.x, V.y + 0.08, V.z + 0.02);
      this.legCurlRoll.rotation.set(0, 0, 0);
    }
  }

  _layoutHack() {
    const on = this.hackMode && this.activeSet.has('hack_squat');
    this.parts.hack_squat.visible = on;
    if (this.hackBack) this.hackBack.visible = on;
    if (this.hackPad) this.hackPad.visible = on;
  }

  _layoutLegCurl() {
    const on = this.legCurlMode && this.activeSet.has('leg_curl');
    this.parts.leg_curl.visible = on;
    if (this.legCurlPad) this.legCurlPad.visible = on;
    if (this.legCurlRoll) this.legCurlRoll.visible = on;
  }

  _layoutBenches() {
    const flat = this.activeSet.has('bench_flat');
    const incl = this.activeSet.has('bench_incline');
    const show = flat || incl;
    const bench = incl && !flat ? this.parts.bench_incline : this.parts.bench_flat;
    const other = bench === this.parts.bench_flat ? this.parts.bench_incline : this.parts.bench_flat;
    const step = this.parts.bulgarian_step;

    for (const b of [this.parts.bench_flat, this.parts.bench_incline]) {
      if (b?.parent && b.parent !== this.root) this.root.attach(b);
    }

    if (step) step.visible = false;

    if (!show) {
      this.parts.bench_flat.visible = false;
      this.parts.bench_incline.visible = false;
      return;
    }

    if (this.bulgarianMode && step) {
      this.parts.bench_flat.visible = false;
      this.parts.bench_incline.visible = false;
      step.visible = true;
      return;
    }

    other.visible = false;
    bench.visible = true;

    if (this.supine) {
      bench.position.set(0, 0.07, 0);
      bench.rotation.set(incl ? 0.38 : 0, 0, 0);
      return;
    }

    if (this.unilateralDb) {
      bench.position.set(-0.28, -0.32, 0.05);
      bench.rotation.set(0, 0, 0);
      return;
    }

    bench.position.set(1.05, 0.07, 0);
    bench.rotation.set(0, Math.PI / 2, 0);
  }

  setActive(names) {
    this.activeSet = new Set(names || []);
    for (const [k, g] of Object.entries(this.parts)) {
      if (k === 'dumbbells' || k === 'bench_flat' || k === 'bench_incline'
        || k === 'bulgarian_step' || k === 'hack_squat'
        || k === 'leg_curl') continue;
      g.visible = this.activeSet.has(k);
    }
    const showDb = this.activeSet.has('dumbbells');
    this.parts.dumbbells.visible = showDb;
    if (!showDb) {
      this._unmountDumbbells();
      this.dbL.visible = false;
      this.dbR.visible = false;
    }

    this.deadliftBar.visible = this.activeSet.has('barbell');
    this.pressBar.visible = this.activeSet.has('barbell_bench');
    this.ezBar.visible = this.activeSet.has('ez_bar');
    this.trapBar.visible = this.activeSet.has('trap_bar');
    this.pullHandle.visible = this.activeSet.has('lat_pulldown');
    this.rowHandle.visible = this.activeSet.has('row_machine');
    this.tbarGrip.visible = this.activeSet.has('tbar_row');
    this.cableHandleL.visible = this.activeSet.has('cable_crossover');
    this.cableHandleR.visible = this.activeSet.has('cable_crossover');

    if (!this.supine && !this.bulgarianMode) {
      if (this.activeSet.has('bench_flat')) this.parts.bench_flat.visible = true;
      if (this.activeSet.has('bench_incline')) this.parts.bench_incline.visible = true;
    }
    this._layoutBenches();
    this._layoutHack();
    this._layoutLegCurl();
  }

  setPropState(state) {
    this.targetState = { ...state };
    if (Object.keys(this.currentState).length === 0) {
      this.currentState = { ...this.targetState };
    }
  }

  update(t) {
    if (!this.figure) return;
    const keys = new Set([...Object.keys(this.currentState), ...Object.keys(this.targetState)]);
    for (const k of keys) {
      const a = this.currentState[k] ?? this.targetState[k] ?? 0;
      const b = this.targetState[k] ?? a;
      this.currentState[k] = a + (b - a) * t;
    }

    this._layoutBenches();
    this._layoutHack();
    this._layoutLegCurl();
    this._syncAnchoredProps();

    if (this.activeSet.has('dumbbells')) this._mountDumbbells();

    this._syncBarbells();

    const fig = this.figure;
    if (this.pressBar.visible) {
      alignBarBetweenWrists(this.pressBar, fig, { yLift: -0.01, zShift: 0.02 });
    }
    if (this.ezBar.visible) {
      alignBarBetweenWrists(this.ezBar, fig, { yLift: -0.02, zShift: 0.03 });
    }
    if (this.pullHandle.visible) {
      alignBarBetweenWrists(this.pullHandle, fig, { yLift: -0.02, zShift: 0 });
    }
    if (this.rowHandle.visible) {
      alignBarBetweenWrists(this.rowHandle, fig, { yLift: 0, zShift: 0.05 });
    }
    if (this.tbarGrip.visible) {
      alignBarBetweenWrists(this.tbarGrip, fig, { yLift: 0, zShift: 0.06 });
    }

    if (this.cableHandleL.visible) {
      mountOnWrist(this.cableHandleL, fig.l_wrist, WRIST_GRIP.hang.l);
    }
    if (this.cableHandleR.visible) {
      mountOnWrist(this.cableHandleR, fig.r_wrist, WRIST_GRIP.hang.r);
    }

    if (this.legCurlRoll && this.currentState.leg_curl != null && !this.legCurlMode) {
      this.legCurlRoll.rotation.x = -this.currentState.leg_curl * 1.1;
    }
  }
}
