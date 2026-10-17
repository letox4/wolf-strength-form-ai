from src.calibration import range_ok
from .machine_base import CalibratedElbowExercise


class LatPulldown(CalibratedElbowExercise):
    exercise_id = "jalon"
    name = "Jalón al pecho"
    setup_msg = "De frente o 3/4; brazos y torso visibles. Cámara a la altura del pecho"
    gauge_label = "Jalón"

    def _live_cue(self, elbow, torso):
        if elbow is None:
            return ""
        if elbow > self.enter_down + 25:
            return "Baja hasta el pecho"
        if torso and torso > 30:
            return "Pecho arriba, no te tires atrás"
        return "Controla la subida"


class Dip(CalibratedElbowExercise):
    exercise_id = "fondos"
    name = "Fondos en paralelas"
    setup_msg = "De perfil; paralelas y cuerpo completo en cuadro"
    gauge_label = "Profundidad"

    def _live_cue(self, elbow, torso):
        if elbow is None:
            return ""
        if elbow > self.enter_down + 20:
            return "Baja más"
        if torso and torso > 25:
            return "Cuerpo recto"
        return "Sube fuerte"

    def _evaluate_rep(self, stats):
        msgs = super()._evaluate_rep(stats)
        min_el = stats.get("elbow")
        if min_el is not None and min_el > 115:
            msgs.append(("bad", "Poca profundidad en el fondo"))
        return msgs


class MachineRow(CalibratedElbowExercise):
    exercise_id = "remo_maquina"
    name = "Remo en máquina"
    setup_msg = "De lado; brazos y espalda visibles (aunque el pecho esté apoyado)"
    gauge_label = "Tirón"

    def _live_cue(self, elbow, torso):
        if elbow is None:
            return ""
        if elbow > self.enter_down + 20:
            return "Lleva codos atrás"
        return "Estira controlado"

    def _evaluate_rep(self, stats):
        msgs = super()._evaluate_rep(stats)
        min_el = stats.get("elbow")
        if min_el is not None and not range_ok(min_el, self.cal, "elbow", "bottom_rep", 20):
            if self.cal:
                msgs.append(("bad", "No contraes lo suficiente al final del tirón"))
        return msgs


class SmithPress(CalibratedElbowExercise):
    exercise_id = "press_smith"
    name = "Press inclinado Smith"
    setup_msg = "De perfil; banco, barra y brazos visibles"
    gauge_label = "Press"

    def _live_cue(self, elbow, torso):
        if elbow is None:
            return ""
        if elbow > self.enter_down + 18:
            return "Baja controlado"
        return "Empuja sin rebotar"

    def _evaluate_rep(self, stats):
        msgs = super()._evaluate_rep(stats)
        min_el = stats.get("elbow")
        if min_el is not None and min_el > 105:
            msgs.append(("bad", "Poco recorrido: baja más la barra"))
        return msgs


# re-export hinge
from .machine_base import CalibratedHingeExercise as Deadlift  # noqa: E402
