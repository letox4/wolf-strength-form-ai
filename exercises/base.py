"""Clase base para definir ejercicios y su análisis de técnica (v2)."""
from dataclasses import dataclass, field

from src.geometry import EMA


@dataclass
class Feedback:
    """Resultado del análisis de un frame."""
    reps: int = 0
    stage: str = "-"
    correct: bool = True
    metrics: dict = field(default_factory=dict)
    issues: list = field(default_factory=list)
    good_msgs: list = field(default_factory=list)
    live: str = ""
    gauge: dict = None
    phase: float = 0.0
    ready: bool = False
    setup: str = ""


class Exercise:
    """Base. Cada ejercicio implementa analyze() con evaluación por repetición."""

    name = "base"
    DOWN, UP = "abajo", "arriba"
    initial_stage = UP
    MIN_VISIBLE_RATIO = 0.85

    def __init__(self):
        self.reset()

    def reset(self):
        self.reps = 0
        self.stage = self.initial_stage
        self._smoothers: dict[str, EMA] = {}
        self._verdict: list[tuple[str, str]] = []
        self._verdict_ok = True
        self._rep_stats: dict = {}
        self._on_reset_rep()

    def _on_reset_rep(self):
        """Hook para estado extra de cada ejercicio al resetear."""
        pass

    def smooth(self, key: str, value, alpha: float = 0.72):
        if value is None:
            return self._smoothers[key].value if key in self._smoothers else None
        if key not in self._smoothers:
            self._smoothers[key] = EMA(alpha=alpha)
        return self._smoothers[key].update(value)

    def visible_ratio(self, kp, joint_names: list[str]) -> float:
        if not joint_names:
            return 0.0
        ok = sum(1 for n in joint_names if kp.get(n) is not None)
        return ok / len(joint_names)

    def pose_ready(self, kp, joint_names: list[str]) -> bool:
        return self.visible_ratio(kp, joint_names) >= self.MIN_VISIBLE_RATIO

    def begin_rep_stats(self):
        self._rep_stats = {}

    def track_min(self, key: str, value):
        if value is None:
            return
        cur = self._rep_stats.get(key)
        self._rep_stats[key] = value if cur is None else min(cur, value)

    def track_max(self, key: str, value):
        if value is None:
            return
        cur = self._rep_stats.get(key)
        self._rep_stats[key] = value if cur is None else max(cur, value)

    def set_verdict(self, msgs: list[tuple[str, str]]):
        bad = [m for m in msgs if m[0] == "bad"]
        if bad:
            self._verdict = msgs
            self._verdict_ok = False
        else:
            self._verdict = msgs or [("good", "¡Buena repetición!")]
            self._verdict_ok = True

    def apply_verdict(self, fb: Feedback) -> Feedback:
        if self._verdict:
            if self._verdict_ok:
                fb.good_msgs = [t for _, t in self._verdict]
                fb.correct = True
            else:
                fb.issues = [t for ty, t in self._verdict if ty == "bad"]
                fb.correct = False
        return fb

    def complete_rep(self, evaluator):
        """Evalúa la rep recién terminada y fija el veredicto persistente."""
        self.set_verdict(evaluator(self._rep_stats))
        self.begin_rep_stats()

    def analyze(self, kp, side: str) -> Feedback:
        raise NotImplementedError
