"""Sistema de detección de técnica de ejercicios por IA (YOLO-Pose) — v2."""
import argparse
import time

import cv2

from src.pose_estimator import PoseEstimator
from src.pose_tracker import PoseSession
from src.visualizer import draw_skeleton, draw_feedback
from exercises import get_exercise, REGISTRY
from exercises.base import Feedback


def parse_args():
    p = argparse.ArgumentParser(description="Wolf Strength Form AI (YOLO-Pose)")
    p.add_argument("--exercise", "-e", required=True,
                   help=f"Ejercicio: {', '.join(sorted(set(REGISTRY)))}")
    p.add_argument("--source", "-s", default="0",
                   help="0 = webcam, o ruta a un video")
    p.add_argument("--model", "-m", default="yolo11s-pose.pt",
                   help="Modelo YOLO-Pose (n=rapido, s=equilibrado, m=preciso)")
    p.add_argument("--device", default="cuda", help="cuda o cpu")
    p.add_argument("--conf", type=float, default=0.45, help="Confianza minima keypoints")
    p.add_argument("--no-half", action="store_true", help="Desactiva FP16")
    p.add_argument("--save", default=None, help="Ruta para guardar el video anotado")
    return p.parse_args()


def main():
    args = parse_args()
    exercise = get_exercise(args.exercise)
    session = PoseSession()
    estimator = PoseEstimator(
        model_path=args.model, device=args.device,
        conf=args.conf, half=not args.no_half,
    )

    source = int(args.source) if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise SystemExit(f"No se pudo abrir la fuente de video: {args.source}")

    writer = None
    if args.save:
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps_out = cap.get(cv2.CAP_PROP_FPS) or 30
        writer = cv2.VideoWriter(args.save, cv2.VideoWriter_fourcc(*"mp4v"),
                                 fps_out, (w, h))

    print(f"[OK] Wolf Strength Form AI v2 — '{exercise.name}'. q=salir  r=reiniciar")
    prev = time.time()
    fps = 0.0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        kp = estimator.estimate(frame)
        if kp is not None:
            side = session.lock_side(kp, exercise.side_joints())
            fb = exercise.analyze(kp, side)
            draw_skeleton(frame, kp, ok=fb.correct and fb.ready)
        else:
            fb = Feedback(reps=exercise.reps, stage="-", correct=True, ready=False,
                          setup="No se detecta persona en el encuadre")

        now = time.time()
        fps = 0.9 * fps + 0.1 * (1.0 / max(now - prev, 1e-6))
        prev = now

        draw_feedback(frame, exercise.name, fb, fps=fps)

        if writer is not None:
            writer.write(frame)
        cv2.imshow("Wolf Strength — Form AI v2", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == ord("r"):
            exercise.reset()
            session.reset()
            print("[i] Contador y sesión reiniciados")

    cap.release()
    if writer is not None:
        writer.release()
        print(f"[OK] Video guardado en {args.save}")
    cv2.destroyAllWindows()
    print(f"[FIN] Total repeticiones: {exercise.reps}")


if __name__ == "__main__":
    main()
