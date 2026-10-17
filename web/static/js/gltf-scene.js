import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EquipmentAttach } from './equipment-attach.js?v=71';
import { resolveMixamoPose, isSupineRoot, isProneRoot } from './mixamo-poses.js?v=71';

/** GLTFLoader strips ":" from Mixamo node names (mixamorig:Hips → mixamorigHips). */
function resolveBone(root, name) {
  if (!root || !name) return null;
  const direct = root.getObjectByName(name);
  if (direct) return direct;
  if (name.includes(':')) return root.getObjectByName(name.replace(/^mixamorig:/, 'mixamorig'));
  if (name.startsWith('mixamorig')) return root.getObjectByName(name.replace(/^mixamorig/, 'mixamorig:'));
  return null;
}

const CAMERAS = {
  front: { pos: [0, 1.05, 2.6], target: [0, 0.85, 0] },
  side: { pos: [2.8, 1.0, 0.2], target: [0, 0.85, 0] },
  three_quarter: { pos: [2.0, 1.05, 2.0], target: [0, 0.85, 0] },
  top: { pos: [0, 3.5, 0.1], target: [0, 0.5, 0] },
};

const BIND_POSE = new Map();

export class MannequinScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.exercise = null;
    this.poseLandId = null;
    this.poseHoldMs = 2800;
    this._poseUsesClip = false;
    this._supineMode = false;
    this._proneMode = false;
    this._poseMode = 'anim'; // 'anim' | 'static'
    this.camLerp = 0.04;
    this.camGoal = new THREE.Vector3();
    this.lookGoal = new THREE.Vector3(0, 0.85, 0);
    this._frameBox = new THREE.Box3();
    this.mixer = null;
    this.clips = {};
    this.currentAction = null;
    this.ready = this._init();
    this.onFrame = null;
  }

  async _init() {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0b0e);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 6;
    this.controls.target.set(0, 0.85, 0);

    this._lights();
    this._floor();

    this.propsRoot = new THREE.Group();
    this.scene.add(this.propsRoot);
    this.equipment = new EquipmentAttach(this.propsRoot);

    const gltf = await Promise.race([
      new GLTFLoader().loadAsync('/static/models/xbot.glb'),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout cargando xbot.glb (30s)')), 30000);
      }),
    ]);
    this.model = gltf.scene;
    this.model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.model.scale.setScalar(1);
    this.scene.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) {
      this.clips[clip.name] = clip;
    }

    this._captureBindPose();
    this.equipment.setModel(this.model);
    this._snapIdle();

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._clock = new THREE.Clock();
    this.setCameraAngle('side', true);
    requestAnimationFrame(this._tick.bind(this));
    } catch (err) {
      console.error('[MannequinScene]', err);
      throw new Error(err.message?.includes('WebGL') ? 'WebGL no disponible en este navegador' : (err.message || 'Fallo al cargar el modelo 3D'));
    }
  }

  get figure() {
    return this.model;
  }

  getStepMs() {
    return this.poseHoldMs;
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x1a1218, 0.5));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.4);
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
    this.scene.add(new THREE.DirectionalLight(0xd81f2b, 0.2).translateX(-4).translateY(2).translateZ(-3));
    this.scene.add(new THREE.AmbientLight(0x8899aa, 0.2));
  }

  _floor() {
    const grid = new THREE.GridHelper(8, 20, 0x2a3038, 0x181b22);
    this.scene.add(grid);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4, 64),
      new THREE.MeshPhysicalMaterial({ color: 0x12141a, roughness: 0.85, metalness: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  _captureBindPose() {
    BIND_POSE.clear();
    this.model.traverse((o) => {
      if (o.isBone) {
        BIND_POSE.set(o.name, {
          pos: o.position.clone(),
          quat: o.quaternion.clone(),
          rot: o.rotation.clone(),
        });
      }
    });
  }

  _resetBones() {
    this.model.traverse((o) => {
      const b = BIND_POSE.get(o.name);
      if (b && o.isBone) {
        o.position.copy(b.pos);
        o.quaternion.copy(b.quat);
      }
    });
  }

  _snapIdle() {
    this._playClip('idle', 0);
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    if (this.mixer) this.mixer.update(1 / 60);
  }

  _playClip(name, fade = 0) {
    const clip = this.clips[name];
    if (!clip || !this.mixer) return null;
    this.mixer.stopAllAction();
    const next = this.mixer.clipAction(clip);
    next.reset();
    next.setLoop(THREE.LoopRepeat);
    next.setEffectiveWeight(1);
    next.fadeIn(fade).play();
    this.currentAction = next;
    this._poseMode = 'anim';
    return next;
  }

  /** Aplica el clip en un instante y detiene el mixer. */
  _sampleClipPose(name, time = 0.35) {
    const clip = this.clips[name];
    if (!clip || !this.mixer) return false;
    this.mixer.stopAllAction();
    this._resetBones();
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.play();
    action.time = Math.min(time, clip.duration * 0.45);
    this.mixer.update(1 / 60);
    this.mixer.stopAllAction();
    this.currentAction = null;
    this._poseMode = 'static';
    return true;
  }

  _applyBoneOverrides(def) {
    if (def.bones) {
      for (const [name, t] of Object.entries(def.bones)) {
        const bone = resolveBone(this.model, name);
        if (!bone) continue;
        if (t.pos) bone.position.set(...t.pos);
        if (t.rot) {
          bone.rotation.order = 'XYZ';
          bone.rotation.set(...t.rot);
          bone.updateMatrix();
        }
      }
    }
    if (def.root) {
      if (def.root.pos) this.model.position.set(...def.root.pos);
      if (def.root.rot) this.model.rotation.set(...def.root.rot);
    } else {
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
    }
    this.model.updateMatrixWorld(true);
    this.model.traverse((o) => {
      if (o.isSkinnedMesh && o.skeleton) o.skeleton.update();
    });
  }

  _applyBonePose(def) {
    this._resetBones();
    this._applyBoneOverrides(def);
  }

  _syncCameraTarget() {
    this._frameBox.setFromObject(this.model);
    const cx = (this._frameBox.min.x + this._frameBox.max.x) * 0.5;
    const cy = this._frameBox.min.y + (this._frameBox.max.y - this._frameBox.min.y) * 0.42;
    const cz = (this._frameBox.min.z + this._frameBox.max.z) * 0.5;
    this.lookGoal.set(cx, cy, cz);
    this.controls.target.copy(this.lookGoal);
  }

  setCameraAngle(id, instant = false) {
    if (this._supineMode) {
      this._frameSupineCamera(instant);
      return;
    }
    if (this._proneMode) {
      this._frameProneCamera(instant);
      return;
    }
    const c = CAMERAS[id] || CAMERAS.side;
    this._frameBox.setFromObject(this.model);
    const cx = (this._frameBox.min.x + this._frameBox.max.x) * 0.5;
    const cy = this._frameBox.min.y + (this._frameBox.max.y - this._frameBox.min.y) * 0.42;
    const cz = (this._frameBox.min.z + this._frameBox.max.z) * 0.5;
    this.lookGoal.set(cx, cy, cz);
    const pos = new THREE.Vector3(cx + c.pos[0], cy + c.pos[1] - 0.85, cz + c.pos[2]);
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
    this.equipment.setExercise(exercise);
  }

  applyPose(poseId, _poses) {
    this.poseLandId = poseId;
    const def = resolveMixamoPose(poseId);
    const supine = isSupineRoot(poseId);
    const prone = isProneRoot(poseId);
    const hasBoneKeys = !!(def.bones && Object.keys(def.bones).length);
    const hasRoot = !!def.root;
    const hasClip = !!def.clip;
    const wantAnim = def.mode === 'anim' || (hasClip && !hasBoneKeys && !hasRoot);

    if (wantAnim && hasClip) {
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
      this._playClip(def.clip, 0);
      if (this.mixer) this.mixer.update(1 / 60);
      this._poseUsesClip = true;
      this._poseMode = 'anim';
    } else if (hasClip) {
      this._sampleClipPose(def.clip, def.clipTime ?? 0.35);
      if (hasBoneKeys || hasRoot) this._applyBoneOverrides(def);
      this._poseUsesClip = false;
      this._poseMode = 'static';
    } else if (hasBoneKeys || hasRoot) {
      if (this.mixer) this.mixer.stopAllAction();
      this.currentAction = null;
      this._applyBonePose(def);
      this._poseUsesClip = false;
      this._poseMode = 'static';
    } else {
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
      this._playClip('idle', 0);
      this._poseUsesClip = true;
      this._poseMode = 'anim';
    }

    if (this.exercise) this.equipment.setExercise(this.exercise);
    this.equipment.update(supine);
    this._supineMode = supine;
    this._proneMode = prone;
    if (supine) this._frameSupineCamera(true);
    else if (prone) this._frameProneCamera(true);
    else this._syncCameraTarget();
  }

  _frameProneCamera(instant = false) {
    this._frameBox.setFromObject(this.model);
    const cx = (this._frameBox.min.x + this._frameBox.max.x) * 0.5;
    const cy = (this._frameBox.min.y + this._frameBox.max.y) * 0.5;
    const cz = (this._frameBox.min.z + this._frameBox.max.z) * 0.5;
    const span = Math.max(
      this._frameBox.max.x - this._frameBox.min.x,
      this._frameBox.max.y - this._frameBox.min.y,
      this._frameBox.max.z - this._frameBox.min.z,
      1.0,
    );
    this.lookGoal.set(cx, cy, cz);
    this.camGoal.set(cx + span * 1.15, cy + span * 0.22, cz + span * 0.55);
    this.controls.target.copy(this.lookGoal);
    if (instant) {
      this.camera.position.copy(this.camGoal);
      this.controls.update();
    }
  }

  _frameSupineCamera(instant = false) {
    this._frameBox.setFromObject(this.model);
    if (this.propsRoot) {
      this.propsRoot.traverse((o) => {
        if (o.visible && o !== this.propsRoot) this._frameBox.expandByObject(o);
      });
    }
    const cx = (this._frameBox.min.x + this._frameBox.max.x) * 0.5;
    const cy = (this._frameBox.min.y + this._frameBox.max.y) * 0.5;
    const cz = (this._frameBox.min.z + this._frameBox.max.z) * 0.5;
    const sx = this._frameBox.max.x - this._frameBox.min.x;
    const sy = this._frameBox.max.y - this._frameBox.min.y;
    const sz = this._frameBox.max.z - this._frameBox.min.z;
    const span = Math.max(sx, sy, sz, 1.0);
    this.lookGoal.set(cx, cy, cz);
    this.camGoal.set(cx + span * 0.55, cy + span * 0.42, cz + span * 1.05);
    this.controls.target.copy(this.lookGoal);
    if (instant) {
      this.camera.position.copy(this.camGoal);
      this.controls.update();
    }
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
    const dt = this._clock.getDelta();
    if (this._poseMode === 'anim' && this.mixer) this.mixer.update(dt);
    if (this._poseMode === 'anim' && this._poseUsesClip && this.exercise) {
      this.equipment.syncHands(isSupineRoot(this.poseLandId));
    }
    this.camera.position.lerp(this.camGoal, this.camLerp);
    this.controls.target.lerp(this.lookGoal, this.camLerp);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.onFrame) this.onFrame();
    requestAnimationFrame(this._tick.bind(this));
  }
}
