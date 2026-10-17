import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _off = new THREE.Matrix4();
const _pL = new THREE.Vector3();
const _pR = new THREE.Vector3();
const _pM = new THREE.Vector3();
const _pD = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();

export function syncBoneAttachment(mesh, bone, parent, offset = { pos: [0, 0, 0], rot: [0, 0, 0] }) {
  if (!mesh || !bone || !parent) return;
  bone.updateWorldMatrix(true, false);
  parent.updateWorldMatrix(true, false);
  _off.identity();
  _off.makeRotationFromEuler(new THREE.Euler(...offset.rot, 'XYZ'));
  _off.setPosition(...offset.pos);
  _m.copy(bone.matrixWorld).multiply(_off);
  _inv.copy(parent.matrixWorld).invert();
  _m.premultiply(_inv);
  _m.decompose(mesh.position, mesh.quaternion, mesh.scale);
}

export function syncBarBetween(mesh, boneL, boneR, parent, { y = 0, z = 0 } = {}) {
  if (!mesh || !boneL || !boneR || !parent) return;
  boneL.updateWorldMatrix(true, false);
  boneR.updateWorldMatrix(true, false);
  boneL.getWorldPosition(_pL);
  boneR.getWorldPosition(_pR);
  _pM.copy(_pL).add(_pR).multiplyScalar(0.5);
  if (y || z) {
    boneL.getWorldQuaternion(_qA);
    _pD.set(0, y, z).applyQuaternion(_qA);
    _pM.add(_pD);
  }
  parent.updateWorldMatrix(true, false);
  _inv.copy(parent.matrixWorld).invert();
  _pM.applyMatrix4(_inv);
  mesh.position.copy(_pM);
  _pD.copy(_pR).sub(_pL);
  if (_pD.lengthSq() < 1e-8) return;
  _pD.normalize();
  _qA.setFromUnitVectors(_axisX, _pD);
  parent.getWorldQuaternion(_qB);
  mesh.quaternion.copy(_qB.invert().multiply(_qA));
}

export const GRIP_OFFSETS = {
  press: {
    l: { pos: [0.08, 2.26, -0.32], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.08, 2.26, 0.32], rot: [0, 0, -Math.PI / 2] },
  },
  curl: {
    l: { pos: [0.06, 2.18, -0.34], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.06, 2.18, 0.34], rot: [0, 0, -Math.PI / 2] },
  },
  lateral: {
    l: { pos: [0, 2.12, -0.36], rot: [0, Math.PI / 2, Math.PI / 2] },
    r: { pos: [0, 2.12, 0.36], rot: [0, -Math.PI / 2, -Math.PI / 2] },
  },
  row: {
    l: { pos: [0.08, 2.15, -0.36], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.08, 2.15, 0.36], rot: [0, 0, -Math.PI / 2] },
  },
  hang: {
    l: { pos: [0.06, 2.12, -0.3], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.06, 2.12, 0.3], rot: [0, 0, -Math.PI / 2] },
  },
};

const CHROME = new THREE.MeshPhysicalMaterial({
  color: 0xb8c0cc, metalness: 0.92, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.15,
});
const PAD = new THREE.MeshPhysicalMaterial({ color: 0x2a2e36, metalness: 0.02, roughness: 0.88 });
const FRAME = new THREE.MeshPhysicalMaterial({ color: 0x3a4048, metalness: 0.7, roughness: 0.35 });
const PLATE = new THREE.MeshPhysicalMaterial({ color: 0x4a525c, metalness: 0.75, roughness: 0.4 });

function mesh(geo, mat, parent, pos, rot) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function makeDumbbell() {
  const g = new THREE.Group();
  g.scale.setScalar(0.44);
  mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.48, 20), CHROME, g, [0, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.085, 24), PLATE, g, [-0.22, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.085, 24), PLATE, g, [0.22, 0, 0], [0, 0, Math.PI / 2]);
  g.traverse((c) => { if (c.isMesh) c.renderOrder = 10; });
  return g;
}

function makeOlympicBar(len = 2.5) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.032, 0.032, len, 20), CHROME, g, [0, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.055, 20), PLATE, g, [-len * 0.4, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.055, 20), PLATE, g, [len * 0.4, 0, 0], [0, 0, Math.PI / 2]);
  g.traverse((c) => { if (c.isMesh) c.renderOrder = 10; });
  return g;
}

function makeEzBar() {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.9, 16), CHROME, g, [0, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 16), PLATE, g, [-0.36, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 16), PLATE, g, [0.36, 0, 0], [0, 0, Math.PI / 2]);
  return g;
}

const HANDHELD = new Set(['dumbbells', 'barbell', 'barbell_bench', 'ez_bar', 'trap_bar']);

export function profileForExercise(exercise) {
  const props = exercise?.props || [];
  const s = new Set(props);
  const id = (exercise?.id || '').toLowerCase();
  let dbMode = 'hang';
  if (s.has('dumbbells')) {
    if (s.has('bench_flat') || s.has('bench_incline') || id.includes('press')) dbMode = 'press';
    else if (id.includes('vuelo') || id.includes('lateral')) dbMode = 'lateral';
    else if (id.includes('curl') || id.includes('martillo')) dbMode = 'curl';
    else if (id.includes('remo')) dbMode = 'row';
  }
  return {
    machines: props.filter((p) => !HANDHELD.has(p)),
    props: s,
    dbMode,
    grip: gripModeFromProps(s),
    supine: s.has('bench_flat') || s.has('bench_incline'),
    unilateral: id.includes('unilateral'),
  };
}

function gripModeFromProps(s) {
  if (s.has('ez_bar') || s.has('barbell') || s.has('barbell_bench') || s.has('trap_bar')) return 'bar';
  if (s.has('dumbbells')) return 'dumbbell';
  if (s.has('lat_pulldown') || s.has('cable_crossover')) return 'cable';
  return 'open';
}

export class EquipmentSystem {
  constructor(scene, groundY = 0) {
    this.scene = scene;
    this.figure = null;
    this.profile = profileForExercise({});
    this.machineState = {};

    this.floor = new THREE.Group();
    this.floor.position.y = groundY;
    scene.add(this.floor);

    this.handheld = new THREE.Group();
    this.handheld.name = 'handheld';

    this.dbL = makeDumbbell();
    this.dbR = makeDumbbell();
    this.barDead = makeOlympicBar(2.7);
    this.barPress = makeOlympicBar(2.3);
    this.ezBar = makeEzBar();
    this.pullHandle = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.52, 0.038, 0.038), CHROME, this.pullHandle);
    this.rowHandle = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.34, 0.028, 0.028), CHROME, this.rowHandle);
    mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 12), CHROME, this.rowHandle, [-0.17, 0, 0], [0, 0, Math.PI / 2]);
    mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 12), CHROME, this.rowHandle, [0.17, 0, 0], [0, 0, Math.PI / 2]);
    this.trapBar = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.85, 0.04, 0.65), CHROME, this.trapBar);
    this.cableL = mesh(new THREE.BoxGeometry(0.07, 0.11, 0.035), CHROME, this.handheld);
    this.cableR = mesh(new THREE.BoxGeometry(0.07, 0.11, 0.035), CHROME, this.handheld);

    for (const o of [this.dbL, this.dbR, this.barDead, this.barPress, this.ezBar,
      this.pullHandle, this.rowHandle, this.trapBar, this.cableL, this.cableR]) {
      o.visible = false;
      this.handheld.add(o);
    }

    this.machines = {};
    this._buildMachines();
  }

  setFigure(fig) {
    this.figure = fig;
    if (fig && this.handheld.parent !== fig) fig.add(this.handheld);
  }

  setExercise(exercise) {
    this.profile = profileForExercise(exercise);
    this._benchMounted = false;
    this._applyVisibility();
  }

  setSupine(on) {
    if (this.profile.supine !== on) {
      this.profile = { ...this.profile, supine: on };
      this._benchMounted = false;
    }
  }

  setMachineState(state) {
    this.machineState = { ...this.machineState, ...state };
  }

  lerpMachineState(target, t) {
    for (const [k, v] of Object.entries(target)) {
      const a = this.machineState[k] ?? v;
      this.machineState[k] = a + (v - a) * t;
    }
  }

  _g(name) {
    const g = new THREE.Group();
    g.visible = false;
    this.floor.add(g);
    this.machines[name] = g;
    return g;
  }

  _buildMachines() {
    const lat = this._g('lat_pulldown');
    mesh(new THREE.BoxGeometry(0.07, 2.5, 0.07), FRAME, lat, [0.5, 1.25, -0.3]);
    mesh(new THREE.BoxGeometry(0.48, 0.05, 0.38), FRAME, lat, [0, 0.3, -0.3]);
    mesh(new THREE.BoxGeometry(0.42, 0.07, 0.32), PAD, lat, [0, 0.36, -0.3]);
    mesh(new THREE.BoxGeometry(0.48, 0.1, 0.14), PAD, lat, [0, 0.7, 0.12]);

    const bench = this._g('bench_flat');
    mesh(new THREE.BoxGeometry(0.48, 0.12, 0.92), PAD, bench);
    mesh(new THREE.BoxGeometry(0.42, 0.055, 0.07), PAD, bench, [0, 0.13, -0.4]);
    mesh(new THREE.BoxGeometry(0.07, 0.32, 0.07), FRAME, bench, [-0.26, -0.18, 0.46]);
    mesh(new THREE.BoxGeometry(0.07, 0.32, 0.07), FRAME, bench, [0.26, -0.18, 0.46]);

    const incl = this._g('bench_incline');
    mesh(new THREE.BoxGeometry(0.46, 0.1, 0.88), PAD, incl, [0, 0, 0], [0.4, 0, 0]);
    mesh(new THREE.BoxGeometry(0.4, 0.05, 0.07), PAD, incl, [0, 0.12, -0.36], [0.48, 0, 0]);

    const hack = this._g('hack_squat');
    mesh(new THREE.BoxGeometry(0.07, 1.9, 0.5), PAD, hack, [0, 0.95, -0.32]);
    this.hackPad = new THREE.Group();
    this.hackPad.position.set(0, 0.52, -0.3);
    hack.add(this.hackPad);
    mesh(new THREE.BoxGeometry(0.38, 0.32, 0.07), PAD, this.hackPad);

    const leg = this._g('leg_curl');
    mesh(new THREE.BoxGeometry(0.52, 0.1, 0.82), PAD, leg, [0, 0.4, 0]);
    this.legRoll = new THREE.Group();
    this.legRoll.position.set(0, 0.55, 0.12);
    leg.add(this.legRoll);
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 16), CHROME, this.legRoll, [0, 0, 0], [0, 0, Math.PI / 2]);

    this._g('cable_crossover');
    mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), FRAME, this.machines.cable_crossover, [-1.05, 1.1, -0.15]);
    mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), FRAME, this.machines.cable_crossover, [1.05, 1.1, -0.15]);

    this._g('dip_bars');
    mesh(new THREE.BoxGeometry(0.05, 1.4, 0.05), FRAME, this.machines.dip_bars, [-0.32, 0.7, 0]);
    mesh(new THREE.BoxGeometry(0.05, 1.4, 0.05), FRAME, this.machines.dip_bars, [0.32, 0.7, 0]);
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.45, 12), CHROME, this.machines.dip_bars, [-0.32, 1.0, 0], [0, 0, Math.PI / 2]);
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.45, 12), CHROME, this.machines.dip_bars, [0.32, 1.0, 0], [0, 0, Math.PI / 2]);

    this._g('row_machine');
    mesh(new THREE.BoxGeometry(0.07, 0.45, 0.55), FRAME, this.machines.row_machine, [0, 0.22, -0.45]);
    mesh(new THREE.BoxGeometry(0.42, 0.45, 0.07), PAD, this.machines.row_machine, [0, 0.78, -0.1], [0.5, 0, 0]);

    this._g('smith_rack');
    mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), FRAME, this.machines.smith_rack, [-0.5, 1.1, -0.15]);
    mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), FRAME, this.machines.smith_rack, [0.5, 1.1, -0.15]);

    this._g('tbar_row');
    mesh(new THREE.BoxGeometry(0.07, 0.07, 0.55), FRAME, this.machines.tbar_row, [0, 0.05, -0.32]);

    for (const k of ['barbell_bench', 'barbell', 'trap_bar', 'ez_bar', 'dumbbells']) this._g(k);
  }

  _applyVisibility() {
    const p = this.profile.props;
    for (const [name, g] of Object.entries(this.machines)) {
      if (HANDHELD.has(name)) continue;
      const on = p.has(name);
      if (name === 'bench_flat' || name === 'bench_incline') {
        g.visible = on && !this.profile.supine;
      } else {
        g.visible = on;
      }
    }
    this.dbL.visible = p.has('dumbbells');
    this.dbR.visible = p.has('dumbbells') && !this.profile.unilateral;
    this.barDead.visible = p.has('barbell');
    this.barPress.visible = p.has('barbell_bench');
    this.ezBar.visible = p.has('ez_bar');
    this.trapBar.visible = p.has('trap_bar');
    this.pullHandle.visible = p.has('lat_pulldown');
    this.rowHandle.visible = p.has('row_machine');
    this.cableL.visible = p.has('cable_crossover');
    this.cableR.visible = p.has('cable_crossover');
  }

  _syncBench() {
    const p = this.profile.props;
    const flat = p.has('bench_flat');
    const incl = p.has('bench_incline');
    if (!this.figure || !this.profile.supine || (!flat && !incl)) {
      this._detachBench();
      return;
    }
    const bench = flat ? this.machines.bench_flat : this.machines.bench_incline;
    const other = flat ? this.machines.bench_incline : this.machines.bench_flat;
    other.visible = false;
    bench.visible = true;
    if (bench.parent !== this.figure.torso) {
      this.floor.attach(bench);
      this.figure.torso.add(bench);
    }
    bench.position.set(0, 2.5, 0.2);
    bench.rotation.set(incl ? 1.15 : 1.45, 0, 0);
    this._benchMounted = true;
  }

  _detachBench() {
    for (const k of ['bench_flat', 'bench_incline']) {
      const b = this.machines[k];
      if (b?.parent && b.parent !== this.floor) {
        this.floor.attach(b);
        b.position.set(0, 0.38, 0.04);
        b.rotation.set(0, 0, 0);
      }
      if (this.profile.props.has(k) && !this.profile.supine) b.visible = true;
    }
    this._benchMounted = false;
  }

  _updateMachines() {
    const s = this.machineState;
    if (this.hackPad && s.hack_pad != null) this.hackPad.position.y = 0.52 + s.hack_pad * 0.38;
    if (this.legRoll && s.leg_curl != null) this.legRoll.rotation.x = -s.leg_curl * 1.05;
  }

  update() {
    if (!this.figure) return;
    this.figure.updateWorldMatrix(true, true);
    this._applyVisibility();
    this._syncBench();
    this._updateMachines();

    const fig = this.figure;
    const parent = this.handheld;
    const g = GRIP_OFFSETS[this.profile.dbMode] || GRIP_OFFSETS.hang;

    if (this.dbL.visible) syncBoneAttachment(this.dbL, fig.l_wrist, parent, g.l);
    if (this.dbR.visible) syncBoneAttachment(this.dbR, fig.r_wrist, parent, g.r);
    if (this.barDead.visible) syncBarBetween(this.barDead, fig.l_wrist, fig.r_wrist, parent, { y: -0.02, z: 0.02 });
    if (this.barPress.visible) syncBarBetween(this.barPress, fig.l_wrist, fig.r_wrist, parent, { y: -0.01, z: 0.02 });
    if (this.ezBar.visible) syncBarBetween(this.ezBar, fig.l_wrist, fig.r_wrist, parent, { y: -0.02, z: 0.03 });
    if (this.trapBar.visible) syncBarBetween(this.trapBar, fig.l_wrist, fig.r_wrist, parent, { y: -0.04, z: 0.04 });
    if (this.pullHandle.visible) syncBarBetween(this.pullHandle, fig.l_wrist, fig.r_wrist, parent);
    if (this.rowHandle.visible) syncBarBetween(this.rowHandle, fig.l_wrist, fig.r_wrist, parent, { z: 0.04 });
    if (this.cableL.visible) syncBoneAttachment(this.cableL, fig.l_wrist, parent, GRIP_OFFSETS.hang.l);
    if (this.cableR.visible) syncBoneAttachment(this.cableR, fig.r_wrist, parent, GRIP_OFFSETS.hang.r);
  }
}
