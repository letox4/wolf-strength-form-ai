"""Dibuja el esqueleto y el panel de feedback sobre el frame."""
import cv2

from .geometry import SKELETON

GREEN = (0, 200, 0)
RED = (0, 0, 255)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
YELLOW = (0, 215, 255)
ORANGE = (0, 165, 255)


def draw_skeleton(frame, kp, ok=True):
    color = GREEN if ok else RED
    xy, conf = kp.xy, kp.conf
    for a, b in SKELETON:
        if conf[a] >= kp.conf_thr and conf[b] >= kp.conf_thr:
            pa = tuple(map(int, xy[a]))
            pb = tuple(map(int, xy[b]))
            cv2.line(frame, pa, pb, color, 2)
    for i, (x, y) in enumerate(xy):
        if conf[i] >= kp.conf_thr:
            cv2.circle(frame, (int(x), int(y)), 4, WHITE, -1)
            cv2.circle(frame, (int(x), int(y)), 4, color, 1)


def _panel(frame, x, y, w, h, alpha=0.55):
    overlay = frame.copy()
    cv2.rectangle(overlay, (x, y), (x + w, y + h), BLACK, -1)
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)


def draw_feedback(frame, exercise_name, fb, fps=None):
    h, w = frame.shape[:2]

    _panel(frame, 0, 0, w, 96)
    cv2.putText(frame, f"{exercise_name}  ·  v2", (15, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.85, YELLOW, 2)
    cv2.putText(frame, f"Reps: {fb.reps}", (15, 68),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, WHITE, 2)
    cv2.putText(frame, f"Fase: {fb.stage}", (200, 68),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, WHITE, 2)

    mx = w - 250
    if not fb.ready and fb.setup:
        cv2.putText(frame, "AJUSTA ENCUADRE", (mx, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, ORANGE, 2)
        cv2.putText(frame, fb.setup[:48], (mx, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, WHITE, 1)
    else:
        cv2.putText(frame, f"Tecnica: {'OK' if fb.correct else 'CORREGIR'}",
                    (mx, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    GREEN if fb.correct else RED, 2)
        yy = 58
        for k, v in fb.metrics.items():
            cv2.putText(frame, f"{k}: {v}", (mx, yy),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, WHITE, 1)
            yy += 22

    if fb.live:
        cv2.putText(frame, fb.live, (w // 2 - 80, h // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0,
                    GREEN if fb.correct else ORANGE, 2)

    msgs = [(m, RED) for m in fb.issues] or [(m, GREEN) for m in fb.good_msgs]
    if msgs:
        ph = 30 * len(msgs) + 10
        _panel(frame, 0, h - ph, w, ph)
        yy = h - ph + 28
        for text, color in msgs:
            cv2.putText(frame, f"- {text}", (15, yy),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            yy += 30

    if fps is not None:
        cv2.putText(frame, f"{fps:.0f} FPS", (w - 90, h - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, YELLOW, 1)
    return frame
