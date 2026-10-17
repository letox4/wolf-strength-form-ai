"""Base para ejercicios de máquina con calibración desde video de referencia."""
from src.calibration import load_calibration, range_ok, threshold
from src.angle_extract import elbow_angle, back_angle, torso_lean, knee_angle
from .base import Exercise, Feedback


class CalibratedElbowExercise(Exercise):
    """Ciclo de rep basado en ángulo de codo + umbrales calibrados."""

    exercise_id = ""
    name = "Ejercicio"
    setup_msg = "Encuadra brazos y torso"
    gauge_label = "Recorrido"
    initial_stage = "arriba"
    DOWN, UP = "abajo", "arriba"
    invert_cycle = False  # pull_down: empieza arriba (UP), baja a DOWN

    def __init__(self):
        self.cal = load_calibration(self.exercise_id)
        self.enter_down = threshold(self.cal, "enter_down", 100)
        self.exit_up = threshold(self.cal, "exit_up", 150)
        super().__init__()

    @staticmethod
    def side_joints():
        return ["shoulder", "elbow", "wrist", "hip"]

    def required(self, side: str):
        return [f"{side}_shoulder", f"{side}_elbow", f"{side}_wrist"]

    def analyze(self, kp, side: str) -> Feedback:
        fb = Feedback(stage=self.stage, reps=self.reps)
        req = self.required(side)
        if not self.pose_ready(kp, req):
            fb.setup = self.setup_msg
            fb.correct = False
            return fb

        fb.ready = True
        elbow = self.smooth("elbow", elbow_angle(kp, side))
        torso = self.smooth("torso", torso_lean(kp, side))
        fb.metrics["Codo"] = round(elbow) if elbow else "-"
        if torso is not None:
            fb.metrics["Torso"] = round(torso)

        if self.stage == self.UP:
            if elbow < self.enter_down:
                self.stage = self.DOWN
                self.begin_rep_stats()
        elif self.stage == self.DOWN:
            self.track_min("elbow", elbow)
            self.track_max("torso", torso)
            if elbow > self.exit_up:
                self.stage = self.UP
                self.reps += 1
                self.complete_rep(self._evaluate_rep)

        fb.stage = self.stage
        fb.reps = self.reps
        self.apply_verdict(fb)

        if elbow is not None:
            lo = self.cal["metrics"]["bottom_rep"]["p50"] if self.cal and "bottom_rep" in self.cal.get("metrics", {}) else 70
            hi = self.cal["metrics"]["top_rep"]["p50"] if self.cal and "top_rep" in self.cal.get("metrics", {}) else 165
            phase = (hi - elbow) / max(hi - lo, 1)
            fb.phase = max(0.0, min(1.0, phase))
            fb.gauge = {"value": fb.phase, "ok": elbow <= lo + 15, "label": self.gauge_label}

        if self.stage == self.DOWN:
            fb.live = self._live_cue(elbow, torso)
        return fb

    def _live_cue(self, elbow, torso) -> str:
        if elbow is None:
            return ""
        if self.stage == self.DOWN and elbow > self.enter_down + 20:
            return "Completa el recorrido"
        return "Controla la fase"

    def _evaluate_rep(self, stats: dict) -> list[tuple[str, str]]:
        msgs = []
        min_el = stats.get("elbow")
        max_torso = stats.get("torso")
        if min_el is not None and self.cal:
            if not range_ok(min_el, self.cal, "elbow", "bottom_rep", margin=18):
                msgs.append(("bad", "Recorrido corto en la fase de máxima contracción"))
        if max_torso is not None and max_torso > 35:
            msgs.append(("bad", "Evita balancear el torso"))
        return msgs


class CalibratedHingeExercise(Exercise):
    """Peso muerto: bisagra de cadera calibrada."""

    exercise_id = "peso_muerto"
    name = "Peso muerto"
    setup_msg = "De perfil; cámara a la altura de la cadera. Barra y cuerpo enteros"
    initial_stage = "arriba"
    DOWN, UP = "abajo", "arriba"

    def __init__(self):
        self.cal = load_calibration(self.exercise_id)
        self.enter_down = threshold(self.cal, "enter_down", 145)
        self.exit_up = threshold(self.cal, "exit_up", 165)
        super().__init__()

    @staticmethod
    def side_joints():
        return ["shoulder", "hip", "knee", "ankle"]

    def analyze(self, kp, side: str) -> Feedback:
        fb = Feedback(stage=self.stage, reps=self.reps)
        req = [f"{side}_{j}" for j in ("shoulder", "hip", "knee", "ankle")]
        if not self.pose_ready(kp, req):
            fb.setup = self.setup_msg
            fb.correct = False
            return fb

        fb.ready = True
        back = self.smooth("back", back_angle(kp, side))
        knee = self.smooth("knee", knee_angle(kp, side))
        if back is not None:
            fb.metrics["Espalda"] = round(back)
        if knee is not None:
            fb.metrics["Rodilla"] = round(knee)

        if self.stage == self.UP:
            if back is not None and back < self.enter_down:
                self.stage = self.DOWN
                self.begin_rep_stats()
        elif self.stage == self.DOWN:
            self.track_min("back", back)
            self.track_min("knee", knee)
            if back is not None and back > self.exit_up:
                self.stage = self.UP
                self.reps += 1
                self.complete_rep(self._evaluate_rep)

        fb.stage = self.stage
        fb.reps = self.reps
        self.apply_verdict(fb)

        if back is not None:
            fb.phase = max(0.0, min(1.0, (175 - back) / 45))
            fb.gauge = {"value": fb.phase, "ok": back < self.enter_down - 5, "label": "Bajada"}

        if self.stage == self.DOWN:
            fb.live = "Espalda neutra, empuja cadera atrás" if back and back > 150 else "Sube controlando"
        return fb

    def _evaluate_rep(self, stats: dict) -> list[tuple[str, str]]:
        msgs = []
        min_back = stats.get("back")
        if min_back is not None and min_back > 155:
            msgs.append(("bad", "Poco rango: baja más controlando la espalda"))
        if min_back is not None and min_back < 115:
            msgs.append(("bad", "Espalda redondeada en la bajada"))
        return msgs
