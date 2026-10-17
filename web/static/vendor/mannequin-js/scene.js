/**
 * Escena inyectable para mannequin.js (sin renderer propio).
 * Basado en mannequin-js — GPL-3.0 — https://github.com/boytchev/mannequin.js
 */
import * as THREE from 'three';

export let renderer = null;
export let scene = null;
export let camera = null;
export let light = null;
export let controls = null;
export const clock = new THREE.Clock();

export function bindStage({ renderer: r, scene: s, camera: c }) {
  renderer = r;
  scene = s;
  camera = c;
}

export function createStage() {
  /* no-op: la guía usa su propio canvas */
}

export function getStage() {
  return { renderer, scene, camera, light, controls, animationLoop: null };
}

export function systemAnimate() {}
