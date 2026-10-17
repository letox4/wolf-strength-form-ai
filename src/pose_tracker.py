"""Suavizado temporal de keypoints y bloqueo de lado visible por sesión."""
import numpy as np

from .geometry import KP, Keypoints


class PoseSession:
    """Estabiliza la pose entre frames para reducir saltos y cambios de lado."""

    def __init__(self, kp_alpha: float = 0.38, side_lock_frames: int = 12):
        self.kp_alpha = kp_alpha
        self.side_lock_frames = side_lock_frames
        self._xy_ema: dict[int, np.ndarray] = {}
        self._locked_side: str | None = None
        self._side_streak = 0
        self._last_side: str | None = None

    def reset(self):
        self._xy_ema.clear()
        self._locked_side = None
        self._side_streak = 0
        self._last_side = None

    def smooth_keypoints(self, kp: Keypoints) -> Keypoints:
        xy = kp.xy.copy()
        for i in range(len(xy)):
            if kp.conf[i] < kp.conf_thr:
                continue
            if i not in self._xy_ema:
                self._xy_ema[i] = xy[i].copy()
            else:
                a = self.kp_alpha
                self._xy_ema[i] = a * xy[i] + (1.0 - a) * self._xy_ema[i]
            xy[i] = self._xy_ema[i]
        return Keypoints(xy, kp.conf, kp.conf_thr)

    def lock_side(self, kp: Keypoints, joints: list[str]) -> str:
        side = kp.best_side(joints)

        if self._locked_side:
            locked = self._mean_conf(kp, self._locked_side, joints)
            other = "right" if self._locked_side == "left" else "left"
            other_conf = self._mean_conf(kp, other, joints)
            if other_conf > locked + 0.18 and other_conf >= 0.55:
                self._locked_side = None
                self._side_streak = 0
            else:
                return self._locked_side

        if side == self._last_side:
            self._side_streak += 1
        else:
            self._last_side = side
            self._side_streak = 1

        if self._side_streak >= self.side_lock_frames:
            self._locked_side = side
        return self._locked_side or side

    @staticmethod
    def _mean_conf(kp: Keypoints, side: str, joints: list[str]) -> float:
        idxs = [KP[f"{side}_{j}"] for j in joints]
        return float(np.mean([kp.conf[i] for i in idxs]))
