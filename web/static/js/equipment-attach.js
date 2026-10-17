import * as THREE from 'three';

const CHROME = new THREE.MeshPhysicalMaterial({
  color: 0xc8d0dc, metalness: 0.92, roughness: 0.22, clearcoat: 0.5,
});
const PLATE = new THREE.MeshPhysicalMaterial({
  color: 0x3a424c, metalness: 0.8, roughness: 0.38,
});
const PAD = new THREE.MeshPhysicalMaterial({
  color: 0x2e333c, roughness: 0.88, metalness: 0.05,
});
const FRAME = new THREE.MeshPhysicalMaterial({
  color: 0x4a525c, metalness: 0.65, roughness: 0.35,
});

function part(geo, mat, parent, pos, rot) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  return m;
}

export function buildDumbbell() {
  const g = new THREE.Group();
  g.name = 'dumbbell';
  const bar = part(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 20), CHROME, g);
  bar.rotation.z = Math.PI / 2;
  const pg = new THREE.CylinderGeometry(0.045, 0.045, 0.028, 24);
  const pl = part(pg, PLATE, g, [-0.075, 0, 0]);
  pl.rotation.z = Math.PI / 2;
  const pr = part(pg, PLATE, g, [0.075, 0, 0]);
  pr.rotation.z = Math.PI / 2;
  return g;
}

export function buildBarbell(len = 1.4) {
  const g = new THREE.Group();
  g.name = 'barbell';
  const bar = part(new THREE.CylinderGeometry(0.012, 0.012, len, 20), CHROME, g);
  bar.rotation.z = Math.PI / 2;
  const pg = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 20);
  const pl = part(pg, PLATE, g, [-len * 0.38, 0, 0]);
  pl.rotation.z = Math.PI / 2;
  const pr = part(pg, PLATE, g, [len * 0.38, 0, 0]);
  pr.rotation.z = Math.PI / 2;
  return g;
}

export function buildBench() {
  const g = new THREE.Group();
  g.name = 'bench';
  part(new THREE.BoxGeometry(0.42, 0.07, 0.82), PAD, g);
  part(new THREE.BoxGeometry(0.36, 0.04, 0.06), PAD, g, [0, 0.06, -0.36]);
  part(new THREE.BoxGeometry(0.04, 0.22, 0.04), FRAME, g, [-0.2, -0.14, 0.38]);
  part(new THREE.BoxGeometry(0.04, 0.22, 0.04), FRAME, g, [0.2, -0.14, 0.38]);
  return g;
}

export function buildLatPulldown() {
  const g = new THREE.Group();
  g.name = 'lat_pulldown';
  part(new THREE.BoxGeometry(0.04, 1.6, 0.04), FRAME, g, [0.35, 0.8, -0.2]);
  part(new THREE.BoxGeometry(0.38, 0.04, 0.28), FRAME, g, [0, 0.12, -0.2]);
  part(new THREE.BoxGeometry(0.34, 0.06, 0.24), PAD, g, [0, 0.16, -0.2]);
  part(new THREE.BoxGeometry(0.38, 0.08, 0.1), PAD, g, [0, 0.42, 0.08]);
  return g;
}

const HANDHELD = new Set(['dumbbells', 'barbell', 'barbell_bench', 'ez_bar', 'trap_bar']);

export class EquipmentAttach {
  constructor(floorGroup) {
    this.floor = floorGroup;
    this.model = null;
    this.props = new Set();
    this.pool = {
      dumbbells: buildDumbbell(),
      barbell: buildBarbell(1.35),
      barbell_bench: buildBarbell(1.15),
      bench_flat: buildBench(),
      bench_incline: buildBench(),
      lat_pulldown: buildLatPulldown(),
    };
    this.attached = {};
    for (const g of Object.values(this.pool)) {
      g.visible = false;
      this.floor.add(g);
    }
    this._barKey = null;
  }

  setModel(model) {
    this.model = model;
  }

  setExercise(exercise) {
    this.props = new Set(exercise?.props || []);
    this._releaseAll();
  }

  _bone(name) {
    if (!this.model || !name) return null;
    return (
      this.model.getObjectByName(name)
      || this.model.getObjectByName(name.replace(/^mixamorig:/, 'mixamorig'))
    );
  }

  _hand(side) {
    return this._bone(side === 'l' ? 'mixamorigLeftHand' : 'mixamorigRightHand');
  }

  _releaseAll() {
    for (const obj of Object.values(this.attached)) {
      if (obj?.parent) this.floor.attach(obj);
      if (obj) obj.visible = false;
    }
    this.attached = {};
  }

  update(supine = false) {
    this._releaseAll();
    const p = this.props;

    for (const [k, g] of Object.entries(this.pool)) {
      if (HANDHELD.has(k)) continue;
      if (k === 'bench_flat' || k === 'bench_incline') {
        g.visible = p.has(k) && !supine;
      } else {
        g.visible = p.has(k);
      }
      if (g.parent !== this.floor && !supine) this.floor.attach(g);
    }

    if (supine && (p.has('bench_flat') || p.has('bench_incline'))) {
      const key = p.has('bench_flat') ? 'bench_flat' : 'bench_incline';
      const bench = this.pool[key];
      if (bench.parent !== this.floor) this.floor.attach(bench);
      bench.visible = true;
      bench.position.set(0, 0.02, 0);
      bench.rotation.set(0, 0, 0);
      if (key === 'bench_incline') {
        bench.rotation.x = -0.42;
        bench.position.y = 0.04;
      }
      const other = key === 'bench_flat' ? 'bench_incline' : 'bench_flat';
      this.pool[other].visible = false;
    }

    if (!this.model) return;

    if (p.has('dumbbells')) {
      for (const side of ['l', 'r']) {
        const hand = this._hand(side);
        if (!hand) continue;
        const db = this.pool.dumbbells.clone(true);
        db.scale.setScalar(1.35);
        db.position.set(0, 0.05, 0.04);
        db.rotation.set(Math.PI / 2, 0, side === 'l' ? 0 : Math.PI);
        hand.add(db);
        db.visible = true;
        this.attached[`db_${side}`] = db;
      }
    }

    const barKey = p.has('barbell_bench') ? 'barbell_bench' : p.has('barbell') ? 'barbell' : null;
    this._barKey = barKey;
    if (barKey) this._mountBar(barKey);
  }

  syncHands(supine = false) {
    if (this._barKey) this._mountBar(this._barKey);
  }

  _mountBar(barKey) {
    let bar = this.attached.bar;
    if (!bar || bar.userData.barKey !== barKey) {
      if (bar?.parent) bar.parent.remove(bar);
      bar = this.pool[barKey].clone(true);
      bar.userData.barKey = barKey;
      this.model.add(bar);
      this.attached.bar = bar;
    }
    const hl = this._hand('l');
    const hr = this._hand('r');
    if (!hl || !hr || !this.model) return;
    const pL = new THREE.Vector3();
    const pR = new THREE.Vector3();
    hl.getWorldPosition(pL);
    hr.getWorldPosition(pR);
    const mid = pL.clone().add(pR).multiplyScalar(0.5);
    this.model.worldToLocal(mid);
    bar.position.copy(mid);
    bar.position.y += 0.025;
    const dir = pR.clone().sub(pL).normalize();
    const qW = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    const qM = new THREE.Quaternion();
    this.model.getWorldQuaternion(qM);
    bar.quaternion.copy(qM.invert().multiply(qW));
    bar.visible = true;
  }
}
