/**
 * Re-export del motor nativo (mannequin.js directo).
 * El mapeo legacy fue retirado — causaba brazos invertidos y espalda rota.
 */
export {
  POSE_ENGINE_VER,
  applyMannequinPose,
  applyFingerGrip,
  capturePosture,
  landFigure,
  isSupinePose,
  gripModeForProps,
  resetStanding,
  applyNativePose,
} from './native-poses.js?v=107';

export function lerpPosture(a, b, t) {
  if (!a || !b) return b || a;
  if (t >= 1) return JSON.parse(JSON.stringify(b));
  if (t <= 0) return JSON.parse(JSON.stringify(a));
  function lerpAngle(x, y, k) {
    let d = y - x;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return x + d * k;
  }
  function lerpRow(x, y, k) {
    if (Array.isArray(x) && Array.isArray(y)) return x.map((v, i) => lerpAngle(v, y[i] ?? v, k));
    return lerpAngle(x, y, k);
  }
  return { version: b.version, data: a.data.map((row, i) => lerpRow(row, b.data[i], t)) };
}
