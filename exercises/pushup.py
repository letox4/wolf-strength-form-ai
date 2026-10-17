"""Flexión (push-up) — evaluación por repetición (v2)."""
from src.geometry import angle
from .base import Exercise, Feedback


class PushUp(Exercise):
    name = "Flexión"

    ELBOW_ENTER_DOWN = 102
    ELBOW_EXIT_UP = 152
    MIN_BODY_LINE = 158
    DEPTH_TARGET = 98
    DEPTH_SHALLOW = 115

    @staticmethod
    def side_joints():
        return ["shoulder", "elbow", "wrist", "hip", "ankle"]

    def _on_reset_rep(self):
        self._bottom = None

    def analyze(self, kp, side: str) -> Feedback:
        fb = Feedback(stage=self.stage, reps=self.reps)
        shoulder = kp.get(f"{side}_shoulder")
        elbow = kp.get(f"{side}_elbow")
        wrist = kp.get(f"{side}_wrist")
        hip = kp.get(f"{side}_hip")
        ankle = kp.get(f"{side}_ankle")
        knee = kp.get(f"{side}_knee")
        required = [f"{side}_shoulder", f"{side}_elbow", f"{side}_wrist", f"{side}_hip"]

        if not self.pose_ready(kp, required):
            fb.setup = "Ponte de perfil; cámara a la altura del suelo o rodillas"
            fb.correct = False
            return fb

        fb.ready = True
        elbow_angle = self.smooth("elbow", angle(shoulder, elbow, wrist))
        fb.metrics["Codo"] = round(elbow_angle)

        ref = ankle if ankle is not None else knee
        body_line = None
        if ref is not None:
            body_line = self.smooth("body", angle(shoulder, hip, ref))
            fb.metrics["Cuerpo"] = round(body_line)

        if self.stage == self.UP:
            if elbow_angle < self.ELBOW_ENTER_DOWN:
                self.stage = self.DOWN
                self.begin_rep_stats()
                self._bottom = {"elbow": elbow_angle, "body": body_line}
        elif self.stage == self.DOWN:
            self.track_min("elbow", elbow_angle)
            if body_line is not None:
                self.track_min("body", body_line)

            if self._bottom is None or (elbow_angle is not None and elbow_angle < self._bottom.get("elbow", 999)):
                self._bottom = {"elbow": elbow_angle, "body": body_line}

            if elbow_angle > self.ELBOW_EXIT_UP:
                self.stage = self.UP
                self.reps += 1
                self.complete_rep(self._evaluate_rep)

        fb.stage = self.stage
        fb.reps = self.reps
        self.apply_verdict(fb)

        ext = 175.0
        phase = (ext - elbow_angle) / (ext - self.DEPTH_TARGET)
        fb.phase = max(0.0, min(1.0, phase))
        deep_ok = elbow_angle <= self.DEPTH_TARGET + 8
        fb.gauge = {"value": fb.phase, "ok": deep_ok, "label": "Profundidad"}

        if self.stage == self.DOWN:
            if body_line is not None and body_line < self.MIN_BODY_LINE:
                fb.live = "Cuerpo recto"
            elif elbow_angle > self.DEPTH_TARGET + 18:
                fb.live = "Baja más"
            elif deep_ok:
                fb.live = "¡Profundidad!"
            else:
                fb.live = "Controla la bajada"

        return fb

    def _evaluate_rep(self, stats: dict) -> list[tuple[str, str]]:
        b = self._bottom or {}
        min_elbow = stats.get("elbow", b.get("elbow", 180.0))
        min_body = stats.get("body", b.get("body", 180.0))
        msgs: list[tuple[str, str]] = []

        if min_elbow > self.DEPTH_SHALLOW:
            msgs.append(("bad", "Muy poca profundidad: baja el pecho"))
        elif min_elbow > self.DEPTH_TARGET:
            msgs.append(("bad", "Casi: un poco más abajo"))

        if min_body is not None and min_body < self.MIN_BODY_LINE:
            msgs.append(("bad", "Cadera hundida o levantada: cuerpo en línea"))
        return msgs
