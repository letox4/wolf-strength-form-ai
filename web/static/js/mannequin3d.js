import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { bindStage } from '/static/vendor/mannequin-js/scene.js';
import { Male, getGroundLevel } from 'mannequin';
import { GymProps } from './gym-props.js?v=107';
import { dumbbellModeForExercise } from './grip-pose.js?v=107';
import {
  POSE_ENGINE_VER,
  applyMannequinPose,
  applyFingerGrip,
  capturePosture,
  landFigure,
  isSupinePose,
  isLegCurlPose,
  gripModeForProps,
} from './native-poses.js?v=107';

const CAMERAS = {
  front: { pos: [0, 0.42, 2.85], target: [0, 0.28, 0] },
  side: { pos: [3.0, 0.4, 0], target: [0, 0.28, 0] },
  three_quarter: { pos: [2.1, 0.45, 2.1], target: [0, 0.28, 0] },
  top: { pos: [0, 3.8, 0.02], target: [0, 0.15, 0] },
};

export class MannequinScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.poseLandId = null;
    this.poseCache = {};
    this._posesRef = {};
    this.poseHoldMs = 2800;
    this.camLerp = 0.035;
    this.exercise = null;
    this.camGoal = new THREE.Vector3();
    this.lookGoal = new THREE.Vector3(0, 0.28, 0);
    this._frameBox = new THREE.Box3();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0b0e);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 7;
    this.controls.target.set(0, 0.28, 0);

    bindStage({ renderer: this.renderer, scene: this.scene, camera: this.camera });
    this._lights();
    this._floor();
    this._createFigure();
    this.equipment = new GymProps(this.scene);
    this.equipment.setFigure(this.figure);
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._clock = new THREE.Clock();
    this.onFrame = null;
    this.ready = Promise.resolve();
    requestAnimationFrame(this._tick.bind(this));
  }

  getStepMs() {
    return this.poseHoldMs;
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x1a1218, 0.45));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.35);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xd81f2b, 0.25);
    rim.position.set(-4, 2, -3);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0x8899aa, 0.25));
  }

  _floor() {
    const gy = getGroundLevel();
    const grid = new THREE.GridHelper(10, 24, 0x2a3038, 0x181b22);
    grid.position.y = gy;
    this.scene.add(grid);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x12141a, roughness: 0.85, metalness: 0.15, envMapIntensity: 0.4,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = gy;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  _createFigure() {
    this.figure = new Male(1.78);
    this.figure.recolor(
      '#5c6270', '#3a3f48', '#4e535e', '#d81f2b',
      '#525866', '#5a606c', '#8b909c',
    );
    this.figure.stepOnGround();
    this._syncCameraTarget();
    this.setCameraAngle('side', true);
  }

  _syncCameraTarget() {
    this._frameBox.setFromObject(this.figure);
    const ty = this._frameBox.min.y + (this._frameBox.max.y - this._frameBox.min.y) * 0.36;
    this.lookGoal.set(0, ty, 0);
    this.controls.target.set(0, ty, 0);
  }

  setCameraAngle(id, instant = false) {
    const c = CAMERAS[id] || CAMERAS.side;
    this._frameBox.setFromObject(this.figure);
    const ty = this._frameBox.min.y + (this._frameBox.max.y - this._frameBox.min.y) * 0.36;
    this.lookGoal.set(c.target[0], ty, c.target[2]);
    const pos = new THREE.Vector3(c.pos[0], c.pos[1] - 0.28 + ty, c.pos[2]);
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(this.lookGoal);
      this.camGoal.copy(pos);
    } else {
      this.camGoal.copy(pos);
    }
  }

  setExercise(exercise) {
    this.exercise = exercise;
    this.poseCache = {};
    this._syncExerciseEquipment();
  }

  _gripMode() {
    return gripModeForProps(this.exercise?.props || []);
  }

  _syncExerciseEquipment() {
    const ex = this.exercise;
    if (!ex) return;
    const id = ex.id || '';
    this.equipment.setActive(ex.props || []);
    this.equipment.setDumbbellMode(dumbbellModeForExercise(ex.props, id));
    this.equipment.setUnilateralDb(id.includes('unilateral'));
    this.equipment.setBulgarianMode(id.includes('bulgar'));
    this.equipment.setHackMode(id.includes('hack'));
    this.equipment.setLegCurlMode(
      (ex.props || []).includes('leg_curl') || id.includes('camilla'),
    );
    this.equipment.setPoseId(this.poseLandId);
    this.equipment.setSupine(isSupinePose(this.poseLandId));
  }

  _resolvePosture(poseId, poses) {
    if (this.poseCache[poseId]) return this.poseCache[poseId];

    const p = poses[poseId] || {};
    const grip = this._gripMode();

    if (p.mannequin?.version && p._engineVer === POSE_ENGINE_VER) {
      this.poseCache[poseId] = { posture: p.mannequin, machine: p.props || {} };
      return this.poseCache[poseId];
    }

    applyMannequinPose(this.figure, poseId, poses, grip);
    const entry = { posture: capturePosture(this.figure), machine: p.props || {} };
    this.poseCache[poseId] = entry;
    return entry;
  }

  _applyResolved(entry, poseId) {
    this.figure.posture = entry.posture;
    this.poseLandId = poseId;
    landFigure(this.figure, poseId);
    this._syncExerciseEquipment();
    applyFingerGrip(this.figure, this._gripMode());
    this.equipment.setPropState(entry.machine || {});
    this.figure.updateWorldMatrix(true, true);
    this.equipment.update(1);
  }

  applyPose(poseDef, poses) {
    this._posesRef = poses;
    const target = this._resolvePosture(poseDef, poses);
    this._applyResolved(target, poseDef);
    this._syncCameraTarget();
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _tick() {
    this._clock.getDelta();
    this.camera.position.lerp(this.camGoal, this.camLerp);
    this.controls.target.lerp(this.lookGoal, this.camLerp);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.onFrame) this.onFrame();
    requestAnimationFrame(this._tick.bind(this));
  }
}
