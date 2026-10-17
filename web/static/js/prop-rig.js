import * as THREE from 'three';
import { getGroundLevel } from 'mannequin';

const _pL = new THREE.Vector3();
const _pR = new THREE.Vector3();
const _pM = new THREE.Vector3();
const _pD = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();

/** Coloca un objeto en el espacio local de `parent` siguiendo un punto mundo */
export function worldPointToLocal(parent, worldPt, out) {
  parent.updateWorldMatrix(true, true);
  out.copy(worldPt);
  parent.worldToLocal(out);
}

function orientBarAlong(bar, boneL, boneR) {
  boneL.getWorldPosition(_pL);
  boneR.getWorldPosition(_pR);
  _pD.copy(_pR).sub(_pL);
  if (_pD.lengthSq() < 1e-8) return;
  _pD.normalize();
  _qA.setFromUnitVectors(_axisX, _pD);
  bar.parent.getWorldQuaternion(_qB);
  bar.quaternion.copy(_qB.invert().multiply(_qA));
}

/** Barra entre dos muñecas — parent debe ser el maniquí (o grupo fijo al maniquí) */
export function alignBarBetweenWrists(bar, figure, { yLift = 0, zShift = 0 } = {}) {
  if (!bar?.parent || !figure?.l_wrist || !figure?.r_wrist) return;
  figure.updateWorldMatrix(true, true);
  figure.l_wrist.getWorldPosition(_pL);
  figure.r_wrist.getWorldPosition(_pR);
  _pM.copy(_pL).add(_pR).multiplyScalar(0.5);
  if (yLift || zShift) {
    figure.l_wrist.getWorldQuaternion(_qA);
    _pD.set(0, yLift, zShift).applyQuaternion(_qA);
    _pM.add(_pD);
  }
  worldPointToLocal(bar.parent, _pM, _pM);
  bar.position.copy(_pM);

  _pD.copy(_pR).sub(_pL);
  if (_pD.lengthSq() < 1e-8) return;
  _pD.normalize();
  _qA.setFromUnitVectors(_axisX, _pD);
  bar.parent.getWorldQuaternion(_qB);
  bar.quaternion.copy(_qB.invert().multiply(_qA));
}

/**
 * Barra apoyada en el suelo de la escena (mismo plano que los pies).
 * Centrada entre tobillos en XZ; Y = getGroundLevel() + radio del disco.
 */
export function placeBarOnFloor(bar, figure, { plateRadius = 0.035, forwardZ = 0.05 } = {}) {
  if (!bar?.parent || !figure?.l_wrist || !figure?.r_wrist) return;
  figure.updateWorldMatrix(true, true);
  figure.l_wrist.getWorldPosition(_pL);
  figure.r_wrist.getWorldPosition(_pR);
  _pM.copy(_pL).add(_pR).multiplyScalar(0.5);
  _pM.z += forwardZ;
  // La barra se agarra a la altura de las manos; nunca por debajo del suelo.
  _pM.y = Math.max(_pM.y, getGroundLevel() + plateRadius);
  worldPointToLocal(bar.parent, _pM, _pM);
  bar.position.copy(_pM);
  orientBarAlong(bar, figure.l_wrist, figure.r_wrist);
}

/** Mancuerna en el suelo, directamente bajo la mano que la agarra */
export function placeDumbbellOnFloor(db, figure, handBone, { plateRadius = 0.08 } = {}) {
  if (!db?.parent || !figure || !handBone) return;
  figure.updateWorldMatrix(true, true);
  handBone.getWorldPosition(_pM);
  // La mancuerna se agarra a la altura de la mano; nunca por debajo del suelo.
  _pM.y = Math.max(_pM.y, getGroundLevel() + plateRadius);
  worldPointToLocal(db.parent, _pM, _pM);
  db.position.copy(_pM);
  db.rotation.set(0, 0, Math.PI / 2);
}

/** Agarre en muñeca — offsets en unidades internas del maniquí */
export function mountOnWrist(mesh, wrist, { pos = [0, 2.05, 0], rot = [0, 0, 0] } = {}) {
  if (!mesh || !wrist) return;
  if (mesh.parent !== wrist) wrist.add(mesh);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
}

const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _off = new THREE.Matrix4();

/** Coloca un prop como hijo del maniquí, alineado a un hueso */
export function placeOnBone(prop, figure, bone, { pos = [0, 0, 0], rot = [0, 0, 0] } = {}) {
  if (!prop || !figure || !bone) return;
  if (prop.parent !== figure) figure.add(prop);
  bone.updateWorldMatrix(true, false);
  figure.updateWorldMatrix(true, false);
  _off.identity();
  _off.makeRotationFromEuler(new THREE.Euler(...rot, 'XYZ'));
  _off.setPosition(...pos);
  _m.copy(bone.matrixWorld).multiply(_off);
  _inv.copy(figure.matrixWorld).invert();
  _m.premultiply(_inv);
  _m.decompose(prop.position, prop.quaternion, prop.scale);
}

export function releaseToPool(mesh, pool) {
  if (!mesh || !pool) return;
  if (mesh.parent && mesh.parent !== pool) pool.attach(mesh);
}
