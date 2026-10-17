"""Utilidades geométricas sobre los 17 keypoints del formato COCO (YOLO-Pose)."""
import numpy as np

# Índices de keypoints COCO que devuelve YOLO-Pose
KP = {
    "nose": 0, "left_eye": 1, "right_eye": 2, "left_ear": 3, "right_ear": 4,
    "left_shoulder": 5, "right_shoulder": 6, "left_elbow": 7, "right_elbow": 8,
    "left_wrist": 9, "right_wrist": 10, "left_hip": 11, "right_hip": 12,
    "left_knee": 13, "right_knee": 14, "left_ankle": 15, "right_ankle": 16,
}

# Conexiones del esqueleto para dibujar
SKELETON = [
    (5, 7), (7, 9), (6, 8), (8, 10),        # brazos
    (5, 6), (5, 11), (6, 12), (11, 12),     # torso
    (11, 13), (13, 15), (12, 14), (14, 16), # piernas
    (0, 5), (0, 6),                          # cuello
]


class Keypoints:
    """Envuelve la salida de una persona: xy (17,2) y confianza (17,)."""

    def __init__(self, xy: np.ndarray, conf: np.ndarray, conf_thr: float = 0.5):
        self.xy = np.asarray(xy, dtype=np.float32)
        self.conf = np.asarray(conf, dtype=np.float32)
        self.conf_thr = conf_thr

    def get(self, name: str):
        """Devuelve (x, y) del keypoint o None si la confianza es baja."""
        i = KP[name]
        if self.conf[i] < self.conf_thr:
            return None
        return self.xy[i]

    def visible(self, *names) -> bool:
        return all(self.get(n) is not None for n in names)

    def best_side(self, joints) -> str:
        """Elige el lado ('left'/'right') con mayor confianza media en `joints`."""
        def score(side):
            idxs = [KP[f"{side}_{j}"] for j in joints]
            return float(np.mean([self.conf[i] for i in idxs]))
        return "left" if score("left") >= score("right") else "right"


def angle(a, b, c) -> float:
    """Ángulo en grados en el vértice `b` formado por los segmentos b->a y b->c."""
    a, b, c = np.asarray(a), np.asarray(b), np.asarray(c)
    ba, bc = a - b, c - b
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))


def angle_with_vertical(p_top, p_bottom) -> float:
    """Inclinación en grados de un segmento respecto a la vertical (0 = recto)."""
    p_top, p_bottom = np.asarray(p_top), np.asarray(p_bottom)
    v = p_top - p_bottom
    vertical = np.array([0.0, -1.0])  # en imagen, y crece hacia abajo
    cos = np.dot(v, vertical) / (np.linalg.norm(v) * 1.0 + 1e-9)
    return float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))


class EMA:
    """Suavizado exponencial para estabilizar los ángulos cuadro a cuadro."""

    def __init__(self, alpha: float = 0.4):
        self.alpha = alpha
        self.value = None

    def update(self, x):
        if x is None:
            return self.value
        self.value = x if self.value is None else self.alpha * x + (1 - self.alpha) * self.value
        return self.value
