/**
 * Poses para rig Mixamo (Xbot/Soldier) — rotaciones locales en radianes [x,y,z].
 * root: transform del modelo completo para supino, etc.
 */
export const MIXAMO_POSES = {
  _default: { clip: 'idle' },

  squat_top: { clip: 'idle', mode: 'anim' },
  squat_bottom: { clip: 'sneak_pose', mode: 'anim' },

  dl_setup: {
    clip: 'sad_pose',
    bones: {
      'mixamorigHips': { pos: [0, -0.15, 0], rot: [0.95, 0, 0] },
      'mixamorigSpine': { rot: [0.45, 0, 0] },
      'mixamorigLeftArm': { rot: [0.15, 0, -1.25] },
      'mixamorigRightArm': { rot: [0.15, 0, 1.25] },
      'mixamorigLeftForeArm': { rot: [0.35, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.35, 0, 0] },
      'mixamorigLeftUpLeg': { rot: [-0.55, 0, 0] },
      'mixamorigRightUpLeg': { rot: [-0.55, 0, 0] },
    },
  },
  dl_top: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.1, 0, -1.15] },
      'mixamorigRightArm': { rot: [0.1, 0, 1.15] },
      'mixamorigLeftForeArm': { rot: [0.2, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.2, 0, 0] },
    },
  },

  db_press_top: {
    clip: 'idle',
    root: { pos: [0, 0.1, 0], rot: [-Math.PI / 2, 0, 0] },
    bones: {
      'mixamorigLeftArm': { rot: [1.52, 0.08, -0.12] },
      'mixamorigRightArm': { rot: [1.52, -0.08, 0.12] },
      'mixamorigLeftForeArm': { rot: [0.35, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.35, 0, 0] },
      'mixamorigLeftUpLeg': { rot: [-0.12, 0, 0.08] },
      'mixamorigRightUpLeg': { rot: [-0.12, 0, -0.08] },
      'mixamorigLeftLeg': { rot: [0.22, 0, 0] },
      'mixamorigRightLeg': { rot: [0.22, 0, 0] },
    },
  },
  db_press_bottom: {
    clip: 'idle',
    root: { pos: [0, 0.1, 0], rot: [-Math.PI / 2, 0, 0] },
    bones: {
      'mixamorigLeftArm': { rot: [1.35, 0.08, -0.12] },
      'mixamorigRightArm': { rot: [1.35, -0.08, 0.12] },
      'mixamorigLeftForeArm': { rot: [1.25, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.25, 0, 0] },
      'mixamorigLeftUpLeg': { rot: [-0.12, 0, 0.08] },
      'mixamorigRightUpLeg': { rot: [-0.12, 0, -0.08] },
      'mixamorigLeftLeg': { rot: [0.22, 0, 0] },
      'mixamorigRightLeg': { rot: [0.22, 0, 0] },
    },
  },

  bench_press_top: { alias: 'db_press_top' },
  bench_press_bottom: { alias: 'db_press_bottom' },
  incline_press_top: {
    clip: 'idle',
    root: { pos: [0, 0.1, 0], rot: [-Math.PI / 2.15, 0, 0] },
    bones: {
      'mixamorigLeftArm': { rot: [1.35, 0.08, -0.12] },
      'mixamorigRightArm': { rot: [1.35, -0.08, 0.12] },
      'mixamorigLeftForeArm': { rot: [0.45, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.45, 0, 0] },
    },
  },
  incline_press_bottom: {
    clip: 'idle',
    root: { pos: [0, 0.1, 0], rot: [-Math.PI / 2.15, 0, 0] },
    bones: {
      'mixamorigLeftArm': { rot: [1.2, 0.08, -0.12] },
      'mixamorigRightArm': { rot: [1.2, -0.08, 0.12] },
      'mixamorigLeftForeArm': { rot: [1.2, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.2, 0, 0] },
    },
  },

  curl_top: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.05, 0, -1.35] },
      'mixamorigRightArm': { rot: [0.05, 0, 1.35] },
      'mixamorigLeftForeArm': { rot: [1.85, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.85, 0, 0] },
    },
  },
  curl_bottom: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.05, 0, -1.35] },
      'mixamorigRightArm': { rot: [0.05, 0, 1.35] },
      'mixamorigLeftForeArm': { rot: [0.25, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.25, 0, 0] },
    },
  },
  hammer_top: { alias: 'curl_top' },
  hammer_bottom: { alias: 'curl_bottom' },
  curl_up: { alias: 'curl_top' },
  curl_down: { alias: 'curl_bottom' },
  ez_curl_up: { alias: 'curl_top' },
  ez_curl_down: { alias: 'curl_bottom' },

  rdl_bottom: { alias: 'dl_setup' },
  rdl_top: { clip: 'idle', mode: 'anim' },
  db_dl_setup: { alias: 'dl_setup' },
  db_dl_top: { alias: 'dl_top' },
  trap_setup: { alias: 'dl_setup' },
  trap_top: { alias: 'dl_top' },

  hack_bottom: { alias: 'squat_bottom' },
  hack_top: { alias: 'squat_top' },
  bulgarian_bottom: { clip: 'sneak_pose', mode: 'anim' },
  bulgarian_top: { clip: 'idle', mode: 'anim' },
  lunge_down: { clip: 'walk', mode: 'anim' },
  lunge_top: { clip: 'idle', mode: 'anim' },

  lat_pull_start: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.2, 0, -0.55] },
      'mixamorigRightArm': { rot: [0.2, 0, 0.55] },
      'mixamorigLeftForeArm': { rot: [0.55, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.55, 0, 0] },
    },
  },
  lat_pull_mid: { alias: 'lat_pull_start' },
  lat_pull_bottom: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.35, 0, -0.25] },
      'mixamorigRightArm': { rot: [0.35, 0, 0.25] },
      'mixamorigLeftForeArm': { rot: [1.1, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.1, 0, 0] },
    },
  },

  bb_row_start: {
    clip: 'sad_pose',
    bones: {
      'mixamorigHips': { rot: [0.55, 0, 0] },
      'mixamorigLeftArm': { rot: [0.2, 0, -0.85] },
      'mixamorigRightArm': { rot: [0.2, 0, 0.85] },
    },
  },
  bb_row_pull: {
    clip: 'sad_pose',
    bones: {
      'mixamorigHips': { rot: [0.55, 0, 0] },
      'mixamorigLeftArm': { rot: [0.45, 0, -0.55] },
      'mixamorigRightArm': { rot: [0.45, 0, 0.55] },
      'mixamorigLeftForeArm': { rot: [1.2, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.2, 0, 0] },
    },
  },
  tbar_start: { alias: 'bb_row_start' },
  tbar_pull: { alias: 'bb_row_pull' },
  uni_row_start: { alias: 'bb_row_start' },
  uni_row_pull: { alias: 'bb_row_pull' },

  pushup_top: {
    root: { pos: [0, 0.38, 0.42], rot: [0, 0, 0] },
    bones: {
      'mixamorigHips': { rot: [1.48, 0, 0] },
      'mixamorigSpine': { rot: [0.12, 0, 0] },
      'mixamorigSpine1': { rot: [0.06, 0, 0] },
      'mixamorigNeck': { rot: [-0.15, 0, 0] },
      'mixamorigLeftArm': { rot: [1.12, 0.1, -0.38] },
      'mixamorigRightArm': { rot: [1.12, -0.1, 0.38] },
      'mixamorigLeftForeArm': { rot: [0.08, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.08, 0, 0] },
      'mixamorigLeftUpLeg': { rot: [-0.05, 0, 0] },
      'mixamorigRightUpLeg': { rot: [-0.05, 0, 0] },
      'mixamorigLeftLeg': { rot: [0.04, 0, 0] },
      'mixamorigRightLeg': { rot: [0.04, 0, 0] },
    },
  },
  pushup_bottom: {
    root: { pos: [0, 0.24, 0.42], rot: [0, 0, 0] },
    bones: {
      'mixamorigHips': { rot: [1.42, 0, 0] },
      'mixamorigSpine': { rot: [0.08, 0, 0] },
      'mixamorigSpine1': { rot: [0.05, 0, 0] },
      'mixamorigNeck': { rot: [-0.1, 0, 0] },
      'mixamorigLeftArm': { rot: [0.78, 0.1, -0.42] },
      'mixamorigRightArm': { rot: [0.78, -0.1, 0.42] },
      'mixamorigLeftForeArm': { rot: [1.48, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.48, 0, 0] },
      'mixamorigLeftUpLeg': { rot: [-0.05, 0, 0] },
      'mixamorigRightUpLeg': { rot: [-0.05, 0, 0] },
    },
  },

  ohp_top: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [-0.15, 0, -2.85] },
      'mixamorigRightArm': { rot: [-0.15, 0, 2.85] },
      'mixamorigLeftForeArm': { rot: [0.2, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.2, 0, 0] },
    },
  },
  ohp_bottom: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.05, 0, -1.35] },
      'mixamorigRightArm': { rot: [0.05, 0, 1.35] },
      'mixamorigLeftForeArm': { rot: [1.35, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.35, 0, 0] },
    },
  },
  front_raise_up: { alias: 'lat_raise_up' },
  front_raise_down: { alias: 'lat_raise_down' },

  lat_raise_up: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.1, 0, -0.35] },
      'mixamorigRightArm': { rot: [0.1, 0, 0.35] },
      'mixamorigLeftForeArm': { rot: [0.15, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.15, 0, 0] },
    },
  },
  lat_raise_down: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.05, 0, -1.25] },
      'mixamorigRightArm': { rot: [0.05, 0, 1.25] },
    },
  },

  leg_curl_start: {
    clip: 'idle',
    root: { pos: [0, 0.38, 0.48], rot: [Math.PI / 2, 0, 0] },
    bones: {
      'mixamorigHips': { rot: [-0.08, 0, 0] },
      'mixamorigSpine': { rot: [-0.06, 0, 0] },
      'mixamorigLeftArm': { rot: [-0.35, 0.2, 0.35] },
      'mixamorigRightArm': { rot: [-0.35, -0.2, -0.35] },
      'mixamorigLeftForeArm': { rot: [0.45, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.45, 0, 0] },
      'mixamorigLeftLeg': { rot: [0.18, 0, 0] },
      'mixamorigRightLeg': { rot: [0.18, 0, 0] },
    },
  },
  leg_curl_contract: {
    clip: 'idle',
    root: { pos: [0, 0.38, 0.48], rot: [Math.PI / 2, 0, 0] },
    bones: {
      'mixamorigHips': { rot: [-0.08, 0, 0] },
      'mixamorigSpine': { rot: [-0.06, 0, 0] },
      'mixamorigLeftArm': { rot: [-0.35, 0.2, 0.35] },
      'mixamorigRightArm': { rot: [-0.35, -0.2, -0.35] },
      'mixamorigLeftForeArm': { rot: [0.45, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.45, 0, 0] },
      'mixamorigLeftLeg': { rot: [1.55, 0, 0] },
      'mixamorigRightLeg': { rot: [1.55, 0, 0] },
    },
  },
  crossover_start: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.15, 0, -0.85] },
      'mixamorigRightArm': { rot: [0.15, 0, 0.85] },
      'mixamorigLeftForeArm': { rot: [0.35, 0, 0] },
      'mixamorigRightForeArm': { rot: [0.35, 0, 0] },
    },
  },
  crossover_contract: {
    clip: 'idle',
    bones: {
      'mixamorigLeftArm': { rot: [0.35, 0, -0.25] },
      'mixamorigRightArm': { rot: [0.35, 0, 0.25] },
      'mixamorigLeftForeArm': { rot: [1.05, 0, 0] },
      'mixamorigRightForeArm': { rot: [1.05, 0, 0] },
    },
  },
};

export function resolveMixamoPose(poseId) {
  let p = MIXAMO_POSES[poseId] || MIXAMO_POSES._default;
  if (p.alias) p = MIXAMO_POSES[p.alias] || MIXAMO_POSES._default;
  return p;
}

export function isSupineRoot(poseId) {
  return /db_press|bench_press|incline_press/i.test(poseId || '');
}

export function isProneRoot(poseId) {
  return /pushup|leg_curl/i.test(poseId || '');
}
