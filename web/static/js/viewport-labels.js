import * as THREE from 'three';

const JOINT_RULES = [
  { re: /rodilla/i, joint: 'l_knee' },
  { re: /codo/i, joint: 'l_elbow' },
  { re: /cadera|bisagra/i, joint: 'pelvis' },
  { re: /torso|espalda|lumbar|pecho/i, joint: 'torso' },
  { re: /hombro|escápula/i, joint: 'l_arm' },
  { re: /cabeza|cuello/i, joint: 'head' },
  { re: /tobillo|pie|talón/i, joint: 'l_ankle' },
  { re: /barra|mano|muñeca/i, joint: 'l_wrist' },
  { re: /banco/i, joint: 'torso' },
];

const CARD_OFFSETS = [
  { dx: 92, dy: -40 },
  { dx: -128, dy: -32 },
  { dx: 100, dy: 44 },
  { dx: -118, dy: 50 },
];

function jointForLabel(label) {
  for (const { re, joint } of JOINT_RULES) {
    if (re.test(label)) return joint;
  }
  return 'torso';
}

function getJoint(fig, joint) {
  if (!fig) return null;
  if (fig[joint]?.getWorldPosition) return fig[joint];
  return null;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Etiquetas ancladas al personaje — solo contexto útil por fase */
export class ViewportLabels {
  constructor(layerEl, scene) {
    this.layer = layerEl;
    this.scene = scene;
    this._v = new THREE.Vector3();
    this.callouts = [];
  }

  clear() {
    this.layer.innerHTML = '';
    this.callouts = [];
  }

  setStepData({ angles, phaseHint }) {
    this.clear();
    const list = angles || [];
    list.forEach((a, i) => this._addAngleCallout(a, i));
    if (!list.length && phaseHint) this._addPhaseCallout(phaseHint);
  }

  _cardHtml({ label, range, note, why, good_sign, kind = 'angle' }) {
    const whyBlock = why
      ? `<p class="callout-why">${esc(why)}</p>`
      : '';
    const goodBlock = good_sign
      ? `<p class="callout-good">${esc(good_sign)}</p>`
      : '';
    const rangeBlock = range
      ? `<strong class="callout-value">${esc(range)}</strong>`
      : '';
    const noteBlock = note
      ? `<span class="callout-note">${esc(note)}</span>`
      : '';

    return `
      <div class="callout-card callout-${kind}">
        ${label ? `<span class="callout-label">${esc(label)}</span>` : ''}
        ${rangeBlock}
        ${noteBlock}
        ${whyBlock}
        ${goodBlock}
      </div>`;
  }

  _mountCallout({ joint, html, index = 0, kind = 'angle' }) {
    const off = CARD_OFFSETS[index % CARD_OFFSETS.length];
    const el = document.createElement('div');
    el.className = 'callout';
    el.dataset.joint = joint;
    el.dataset.dx = off.dx;
    el.dataset.dy = off.dy;
    el.innerHTML = `
      <svg class="callout-line" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/></svg>
      <div class="callout-dot"></div>
      ${html}`;
    this.layer.appendChild(el);
    this.callouts.push(el);
  }

  _addAngleCallout(angle, index) {
    const joint = jointForLabel(angle.label);
    const html = this._cardHtml({
      label: angle.label,
      range: angle.range,
      note: angle.note,
      why: angle.why,
      good_sign: angle.good_sign,
      kind: 'angle',
    });
    this._mountCallout({ joint, html, index, kind: 'angle' });
  }

  _addPhaseCallout(text) {
    const html = this._cardHtml({
      label: 'En esta fase',
      note: text,
      kind: 'phase',
    });
    this._mountCallout({ joint: 'torso', html, index: 0, kind: 'phase' });
  }

  update() {
    const fig = this.scene.figure;
    const cam = this.scene.camera;
    const canvas = this.scene.canvas;
    if (!fig || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    for (const el of this.callouts) {
      const bone = getJoint(fig, el.dataset.joint);
      if (!bone) { el.style.opacity = '0'; continue; }

      bone.getWorldPosition(this._v);
      this._v.project(cam);
      if (this._v.z > 1) { el.style.opacity = '0'; continue; }

      const ax = (this._v.x * 0.5 + 0.5) * w;
      const ay = (-this._v.y * 0.5 + 0.5) * h;
      const dx = +el.dataset.dx;
      const dy = +el.dataset.dy;
      const cx = ax + dx;
      const cy = ay + dy;

      el.style.opacity = '1';
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;

      const dot = el.querySelector('.callout-dot');
      dot.style.left = `${-dx}px`;
      dot.style.top = `${-dy}px`;

      const line = el.querySelector('line');
      line.setAttribute('x1', String(-dx));
      line.setAttribute('y1', String(-dy));
      line.setAttribute('x2', '0');
      line.setAttribute('y2', '0');
    }
  }
}
