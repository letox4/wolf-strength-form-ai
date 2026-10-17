/**
 * Convierte poses legacy (huesos) → propiedades mannequin.js
 * y soporta posturas nativas { version: 7, data: [...] }
 */
import { blend } from 'mannequin';

const PARTS = [
  'body', 'torso', 'head',
  'l_leg', 'l_knee', 'l_ankle',
  'r_leg', 'r_knee', 'r_ankle',
  'l_arm', 'l_elbow', 'l_wrist',
  'r_arm', 'r_elbow', 'r_wrist',
];

function isSupineBench(poseId, p) {
  if (/db_press|bench_press|incline_press|smith_press/i.test(poseId || '')) return true;
  return (p.rootY ?? 0) <= -0.35 && (p.l_upper?.[0] ?? 0) < -25;
}

function resetFigure(fig) {
  fig.body.position.set(0, 0, 0);
  fig.body.bend = 0; fig.body.turn = -90; fig.body.tilt = 0;
  fig.torso.bend = 2; fig.torso.turn = 0; fig.torso.tilt = 0;
  fig.head.nod = -10; fig.head.turn = 0; fig.head.tilt = 0;
  for (const side of ['l', 'r']) {
    fig[`${side}_leg`].raise = 0; fig[`${side}_leg`].straddle = 6; fig[`${side}_leg`].turn = 0;
    fig[`${side}_knee`].bend = 0;
    fig[`${side}_ankle`].bend = 0; fig[`${side}_ankle`].turn = 6; fig[`${side}_ankle`].tilt = 6;
    fig[`${side}_arm`].raise = -5; fig[`${side}_arm`].straddle = 7; fig[`${side}_arm`].turn = 0;
    fig[`${side}_elbow`].bend = 15;
    fig[`${side}_wrist`].bend = 5; fig[`${side}_wrist`].turn = 0; fig[`${side}_wrist`].tilt = 0;
  }
}

function applySupineTorso(fig, p) {
  const incline = (p.pelvis?.[0] ?? 70) + (p.spine?.[0] ?? 15) + (p.chest?.[0] ?? 0);
  fig.body.bend = Math.min(86, 60 + incline * 0.24);
  fig.torso.bend = Math.min(22, 10 + incline * 0.05);
  fig.torso.tilt = 0;
  fig.torso.turn = 0;
  fig.head.nod = 18;
  fig.head.turn = 0;
}

function applySupineLegs(fig, p) {
  const t = p.l_thigh?.[0] ?? 55;
  const s = p.l_shin?.[0] ?? 25;
  for (const side of ['l', 'r']) {
    const leg = fig[`${side}_leg`];
    const knee = fig[`${side}_knee`];
    const ankle = fig[`${side}_ankle`];
    leg.raise = 44;
    leg.straddle = 18;
    leg.turn = 0;
    knee.bend = Math.min(92, 32 + t * 0.58 + s * 0.38);
    ankle.bend = 20;
    ankle.turn = 6;
    ankle.tilt = 6;
  }
}

function finishPose(fig, p, poseId) {
  fig.stepOnGround();
  if (isSupineBench(poseId, p)) {
    fig.position.y += Math.abs(p.rootY ?? 0.48) * 0.42;
  }
}

export function landFigure(fig, poseId, p) {
  finishPose(fig, p || {}, poseId);
}

export function isSupinePose(poseId, p) {
  return isSupineBench(poseId, p);
}

export function capturePosture(fig) {
  return JSON.parse(JSON.stringify(fig.posture));
}

export function applyMannequinPose(fig, poseId, poses) {
  const p = poses[poseId] || {};
  if (p.mannequin) {
    fig.posture = p.mannequin;
    finishPose(fig, p, poseId);
    return capturePosture(fig);
  }
  resetFigure(fig);
  const supine = isSupineBench(poseId, p);

  if (supine) {
    applySupineTorso(fig, p);
  } else {
    const torso = (p.pelvis?.[0] || 0) + (p.spine?.[0] || 0) + (p.chest?.[0] || 0);
    fig.torso.bend = 2 + torso * 0.85;
    fig.torso.tilt = (p.pelvis?.[2] || 0) * 0.3;
  }

  const mapArm = (prefix, upper, lower) => {
    if (!upper) return;
    const arm = fig[`${prefix}_arm`];
    const elbow = fig[`${prefix}_elbow`];
    arm.raise = -90 - (upper[0] || 0);
    arm.straddle = 7 + (upper[2] || 0) * 0.9;
    arm.turn = upper[1] || 0;
    if (lower) elbow.bend = Math.max(0, (lower[0] || 0) - 15);
  };
  mapArm('l', p.l_upper, p.l_lower);
  mapArm('r', p.r_upper, p.r_lower);

  if (supine) {
    applySupineLegs(fig, p);
  } else {
    const mapLeg = (prefix, thigh, shin, foot) => {
      if (!thigh && !shin) return;
      const leg = fig[`${prefix}_leg`];
      const knee = fig[`${prefix}_knee`];
      const ankle = fig[`${prefix}_ankle`];
      const t = thigh?.[0] ?? 0;
      const s = shin?.[0] ?? 0;

      if (t > 25 || s > 25) {
        leg.raise = Math.min(75, t * 0.65);
        knee.bend = Math.min(130, Math.max(s, t) * 1.08);
        ankle.bend = Math.min(38, knee.bend * 0.25);
      } else if (t < -5) {
        leg.raise = t * 0.45;
        knee.bend = Math.max(0, Math.abs(s));
        ankle.bend = 6;
      } else {
        leg.raise = Math.max(0, t * 0.2);
        knee.bend = Math.max(0, s * 0.45);
        ankle.bend = 6;
      }
      leg.straddle = 6 + (thigh?.[2] || 0) * 0.1;
      leg.turn = thigh?.[1] || 0;
      if (foot?.[0]) ankle.bend = foot[0];
    };
    mapLeg('l', p.l_thigh, p.l_shin, p.l_foot);
    mapLeg('r', p.r_thigh, p.r_shin, p.r_foot);
  }

  finishPose(fig, p, poseId);
  return capturePosture(fig);
}

export function lerpPosture(a, b, t) {
  return blend(a, b, t);
}

export function cachePose(fig, poseId, poses) {
  if (!poses[poseId]) poses[poseId] = {};
  if (!poses[poseId].mannequin) {
    applyMannequinPose(fig, poseId, poses);
    poses[poseId].mannequin = capturePosture(fig);
  }
  return poses[poseId].mannequin;
}
