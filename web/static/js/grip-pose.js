/** Solo cierra dedos — NO toca muñecas (la pose ya las orienta) */
export function applyFingerGrip(fig, mode = 'open') {
  if (!fig || mode === 'open') return;
  const bend = { dumbbell: 88, bar: 92, cable: 82 }[mode] ?? 85;
  fig.l_fingers.bend = bend;
  fig.r_fingers.bend = bend;
}

export function gripModeForProps(names) {
  const s = new Set(names || []);
  if (s.has('ez_bar') || s.has('barbell') || s.has('barbell_bench') || s.has('trap_bar')) return 'bar';
  if (s.has('dumbbells')) return 'dumbbell';
  if (s.has('lat_pulldown') || s.has('cable_crossover')) return 'cable';
  return 'open';
}

export function dumbbellModeForExercise(props, exerciseId = '') {
  const s = new Set(props || []);
  if (!s.has('dumbbells')) return null;
  const id = (exerciseId || '').toLowerCase();
  if (id.includes('muerto') || id.includes('deadlift')) return 'deadlift';
  if (s.has('bench_flat') || s.has('bench_incline') || id.includes('press')) return 'press';
  if (id.includes('vuelo') || id.includes('lateral')) return 'lateral';
  if (id.includes('curl') || id.includes('martillo')) return 'curl';
  if (id.includes('remo')) return 'row';
  return 'hang';
}

/** Presets de offset local en muñeca (alineados a base de dedos del maniquí) */
export const WRIST_GRIP = {
  press: {
    l: { pos: [0.1, 2.28, -0.3], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.1, 2.28, 0.3], rot: [0, 0, -Math.PI / 2] },
  },
  curl: {
    l: { pos: [0.08, 2.2, -0.32], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.08, 2.2, 0.32], rot: [0, 0, -Math.PI / 2] },
  },
  lateral: {
    l: { pos: [0, 2.15, -0.34], rot: [0, Math.PI / 2, Math.PI / 2] },
    r: { pos: [0, 2.15, 0.34], rot: [0, -Math.PI / 2, -Math.PI / 2] },
  },
  row: {
    l: { pos: [0.1, 2.18, -0.34], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.1, 2.18, 0.34], rot: [0, 0, -Math.PI / 2] },
  },
  hang: {
    l: { pos: [0.08, 2.15, -0.3], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.08, 2.15, 0.3], rot: [0, 0, -Math.PI / 2] },
  },
  deadlift: {
    l: { pos: [0.1, 2.1, -0.36], rot: [0, 0, Math.PI / 2] },
    r: { pos: [0.1, 2.1, 0.36], rot: [0, 0, -Math.PI / 2] },
  },
};
