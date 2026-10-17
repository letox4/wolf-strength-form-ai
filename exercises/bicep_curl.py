"""Curl de bíceps — evaluación por repetición (v2)."""
from src.geometry import angle, angle_with_vertical
from .base import Exercise, Feedback


class BicepCurl(Exercise):
    name = "Curl de bíceps"
    initial_stage = "abajo"

    ELBOW_FLEX = 58
    ELBOW_EXT = 148
    ELBOW_ENTER_FLEX = 68
    ELBOW_EXIT_EXT = 138
    MAX_ELBOW_DRIFT = 20
    MAX_TORSO_SWING = 22
    MIN_CONTRACTION = 72

    @staticmethod
    def side_joints():
        return ["shoulder", "elbow", "wrist"]

    def analyze(self, kp, side: str) -> Feedback:
        fb = Feedback(stage=self.stage, reps=self.reps)
        shoulder = kp.get(f"{side}_shoulder")
        elbow = kp.get(f"{side}_elbow")
        wrist = kp.get(f"{side}_wrist")
        hip = kp.get(f"{side}_hip")
        required = [f"{side}_shoulder", f"{side}_elbow", f"{side}_wrist"]

        if not self.pose_ready(kp, required):
            fb.setup = "De frente o ligeramente de lado; que se vea el brazo completo"
            fb.correct = False
            return fb

        fb.ready = True
        elbow_angle = self.smooth("elbow", angle(shoulder, elbow, wrist))
        fb.metrics["Codo"] = round(elbow_angle)

        elbow_drift = None
        torso_lean = None
        if hip is not None:
            elbow_drift = self.smooth("drift", angle_with_vertical(elbow, shoulder))
            torso_lean = self.smooth("torso", angle_with_vertical(shoulder, hip))
            fb.metrics["Codo-torso"] = round(elbow_drift)

        if self.stage == self.DOWN:
            if elbow_angle < self.ELBOW_ENTER_FLEX:
                self.stage = self.UP
                self.begin_rep_stats()
                self.track_min("elbow", elbow_angle)
        elif self.stage == self.UP:
            self.track_min("elbow", elbow_angle)
            if elbow_drift is not None:
                self.track_max("drift", elbow_drift)
            if torso_lean is not None:
                self.track_max("torso", torso_lean)

            if elbow_angle > self.ELBOW_EXIT_EXT:
                self.stage = self.DOWN
                self.reps += 1
                self.complete_rep(self._evaluate_rep)

        fb.stage = self.stage
        fb.reps = self.reps
        self.apply_verdict(fb)

        ext = 175.0
        flex = self.ELBOW_FLEX
        phase = (ext - elbow_angle) / (ext - flex)
        fb.phase = max(0.0, min(1.0, phase))
        fb.gauge = {
            "value": fb.phase,
            "ok": elbow_angle <= self.ELBOW_FLEX + 8,
            "label": "Contracción",
        }

        if self.stage == self.UP:
            if elbow_angle > self.ELBOW_FLEX + 25:
                fb.live = "Sube más"
            elif elbow_drift is not None and elbow_drift > self.MAX_ELBOW_DRIFT:
                fb.live = "Codo quieto"
            else:
                fb.live = "Contrae"
        elif self.stage == self.DOWN and elbow_angle < self.ELBOW_EXT - 12:
            fb.live = "Extiende"

        return fb

    def _evaluate_rep(self, stats: dict) -> list[tuple[str, str]]:
        msgs: list[tuple[str, str]] = []
        min_elbow = stats.get("elbow", 180.0)
        max_drift = stats.get("drift", 0.0)
        max_torso = stats.get("torso", 0.0)

        if min_elbow > self.MIN_CONTRACTION:
            msgs.append(("bad", "No contraes del todo: sube la mancuerna"))
        if max_drift > self.MAX_ELBOW_DRIFT:
            msgs.append(("bad", "El codo se separa del torso"))
        if max_torso > self.MAX_TORSO_SWING:
            msgs.append(("bad", "No balancees: usa solo el bíceps"))
        return msgs
