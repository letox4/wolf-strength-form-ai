"""Sentadilla — evaluación por repetición en el punto más bajo (v2)."""
from src.geometry import angle, angle_with_vertical
from .base import Exercise, Feedback


class Squat(Exercise):
    name = "Sentadilla"

    KNEE_ENTER_DOWN = 128
    KNEE_EXIT_UP = 152
    DEPTH_PARALLEL = 102
    DEPTH_SHALLOW = 122
    LEAN_FWD_MAX = 56
    LEAN_BACK_MIN = -8
    KNEE_AHEAD_PX = 28

    @staticmethod
    def side_joints():
        return ["hip", "knee", "ankle", "shoulder"]

    def _on_reset_rep(self):
        self._min_knee = 180.0
        self._bottom = None

    def analyze(self, kp, side: str) -> Feedback:
        fb = Feedback(stage=self.stage, reps=self.reps)
        hip = kp.get(f"{side}_hip")
        knee = kp.get(f"{side}_knee")
        ankle = kp.get(f"{side}_ankle")
        shoulder = kp.get(f"{side}_shoulder")
        required = [f"{side}_hip", f"{side}_knee", f"{side}_ankle", f"{side}_shoulder"]

        if not self.pose_ready(kp, required):
            fb.setup = "Ponte de perfil, cámara a la altura de la cadera y encuadra todo el cuerpo"
            fb.correct = False
            return fb

        fb.ready = True
        knee_angle = self.smooth("knee", angle(hip, knee, ankle))
        facing = 1.0 if (knee[0] - hip[0]) >= 0 else -1.0
        torso_mag = angle_with_vertical(shoulder, hip)
        torso_dir = 1.0 if (shoulder[0] - hip[0]) * facing >= 0 else -1.0
        torso_signed = torso_mag * torso_dir
        knee_ahead = (knee[0] - ankle[0]) * facing

        fb.metrics["Rodilla"] = round(knee_angle)
        fb.metrics["Torso"] = round(torso_signed)

        if self.stage == self.UP:
            if knee_angle < self.KNEE_ENTER_DOWN:
                self.stage = self.DOWN
                self.begin_rep_stats()
                self._min_knee = knee_angle
                self._bottom = {
                    "knee": knee_angle,
                    "torso": torso_signed,
                    "knee_ahead": knee_ahead,
                }
        elif self.stage == self.DOWN:
            self.track_min("knee", knee_angle)
            self.track_max("torso_fwd", torso_signed)
            self.track_min("torso_back", torso_signed)
            self.track_max("knee_ahead", knee_ahead)

            if knee_angle < self._min_knee:
                self._min_knee = knee_angle
                self._bottom = {
                    "knee": knee_angle,
                    "torso": torso_signed,
                    "knee_ahead": knee_ahead,
                }

            if knee_angle > self.KNEE_EXIT_UP:
                self.stage = self.UP
                self.reps += 1
                self.complete_rep(self._evaluate_rep)

        fb.stage = self.stage
        fb.reps = self.reps

        if self.stage == self.DOWN and not self._verdict:
            fb.good_msgs = ["Baja controlado…"]

        self.apply_verdict(fb)

        stand = 172.0
        phase = (stand - knee_angle) / (stand - self.DEPTH_PARALLEL)
        fb.phase = max(0.0, min(1.0, phase))
        deep_ok = knee_angle <= self.DEPTH_PARALLEL + 6
        fb.gauge = {"value": fb.phase, "ok": deep_ok, "label": "Profundidad"}

        if self.stage == self.DOWN:
            if torso_signed > self.LEAN_FWD_MAX:
                fb.live = "Pecho arriba"
            elif torso_signed < self.LEAN_BACK_MIN:
                fb.live = "No te eches atrás"
            elif knee_ahead > self.KNEE_AHEAD_PX:
                fb.live = "Rodillas atrás"
            elif knee_angle > self.DEPTH_PARALLEL + 16:
                fb.live = "Más abajo"
            elif deep_ok:
                fb.live = "¡Profundidad!"
            else:
                fb.live = "Casi…"

        return fb

    def _evaluate_rep(self, stats: dict) -> list[tuple[str, str]]:
        b = self._bottom or {}
        knee_min = stats.get("knee", b.get("knee", 180.0))
        torso_fwd = stats.get("torso_fwd", b.get("torso", 0.0))
        torso_back = stats.get("torso_back", b.get("torso", 0.0))
        knee_ahead = stats.get("knee_ahead", b.get("knee_ahead", 0.0))
        msgs: list[tuple[str, str]] = []

        if knee_min > self.DEPTH_SHALLOW:
            msgs.append(("bad", "Muy arriba: baja hasta el paralelo"))
        elif knee_min > self.DEPTH_PARALLEL:
            msgs.append(("bad", "Casi: un poco más de profundidad"))

        if torso_fwd > self.LEAN_FWD_MAX:
            msgs.append(("bad", "Te inclinas demasiado al frente"))
        elif torso_back < self.LEAN_BACK_MIN:
            msgs.append(("bad", "Te echas hacia atrás: pecho al frente"))

        if knee_ahead > self.KNEE_AHEAD_PX:
            msgs.append(("bad", "Rodillas muy adelantadas: empuja cadera atrás"))

        return msgs
