"""Genera perfiles de calibración desde EntrenamientoVideos/.

Uso:
    python tools/calibrate_from_videos.py
    python tools/calibrate_from_videos.py --model yolo11n-pose.pt --device cuda
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.pose_estimator import PoseEstimator  # noqa: E402
from src.angle_extract import frame_metrics  # noqa: E402

MANIFEST = ROOT / "data" / "exercises_manifest.json"
VIDEO_DIR = ROOT / "EntrenamientoVideos"
OUT_DIR = ROOT / "data" / "calibration"


def stats(values: list[float]) -> dict:
    if not values:
        return {}
    a = np.array(values, dtype=np.float32)
    return {
        "min": float(np.min(a)),
        "max": float(np.max(a)),
        "mean": float(np.mean(a)),
        "p10": float(np.percentile(a, 10)),
        "p50": float(np.percentile(a, 50)),
        "p90": float(np.percentile(a, 90)),
    }


def segment_reps_elbow(series: list[float]) -> list[dict]:
    """Detecta ciclos de rep por mínimos/máximos del codo."""
    if len(series) < 30:
        return []
    a = np.array(series, dtype=np.float32)
    # suavizado ligero
    kernel = np.ones(5) / 5
    s = np.convolve(a, kernel, mode="same")
    reps = []
    i = 10
    n = len(s)
    while i < n - 10:
        lo = max(0, i - 8)
        hi = min(n, i + 8)
        window = s[lo:hi]
        if s[i] <= float(np.min(window)) + 0.5:
            bottom = float(s[i])
            j = i + 1
            while j < n - 5 and s[j] < s[j - 1] + 2:
                j += 1
            top_after = float(np.max(s[j:min(j + 40, n)])) if j < n else bottom
            reps.append({"bottom": bottom, "top_after": top_after, "frame": i})
            i = j + 15
        else:
            i += 1
    return reps


def segment_reps_hinge(back_series: list[float], knee_series: list[float]) -> list[dict]:
    reps = []
    backs = [b for b in back_series if b is not None]
    if len(backs) < 30:
        return reps
    a = np.array(back_series, dtype=np.float32)
    a = np.where(np.isnan(a), np.nanmedian(a), a)
    kernel = np.ones(7) / 7
    s = np.convolve(a, kernel, mode="same")
    for i in range(10, len(s) - 10):
        lo = max(0, i - 8)
        hi = min(len(s), i + 8)
        if s[i] <= float(np.min(s[lo:hi])) + 0.5:
            knee = knee_series[i] if i < len(knee_series) else None
            reps.append({"bottom_back": float(s[i]), "knee": knee, "frame": i})
    # dedupe cercanos
    deduped = []
    for r in reps:
        if not deduped or r["frame"] - deduped[-1]["frame"] > 25:
            deduped.append(r)
    return deduped


def calibrate_video(entry: dict, estimator: PoseEstimator, stride: int = 2) -> dict:
    vid_path = VIDEO_DIR / entry["file"]
    if not vid_path.exists():
        raise FileNotFoundError(vid_path)

    cap = cv2.VideoCapture(str(vid_path))
    primary = entry["primary_metric"]
    series: dict[str, list] = {"elbow": [], "back": [], "torso": [], "knee": []}
    frame_i = 0
    detected = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_i % stride != 0:
            frame_i += 1
            continue
        kp = estimator.estimate(frame)
        if kp is not None:
            m = frame_metrics(kp)
            for k in series:
                series[k].append(m.get(k))
            detected += 1
        else:
            for k in series:
                series[k].append(None)
        frame_i += 1
    cap.release()

    clean = {k: [v for v in vals if v is not None] for k, vals in series.items()}
    metrics = {k: stats(v) for k, v in clean.items() if v}

    rep_mode = entry.get("rep_mode", "elbow")
    reps_data = []
    if rep_mode in ("pull_down", "pull_back", "push_up_pattern"):
        reps_data = segment_reps_elbow(clean.get("elbow", []))
    elif rep_mode == "hinge":
        reps_data = segment_reps_hinge(series["back"], series["knee"])

    rep_thresholds = {}
    if reps_data and primary == "elbow":
        bottoms = [r["bottom"] for r in reps_data]
        tops = [r.get("top_after", r["bottom"]) for r in reps_data]
        b = stats(bottoms)
        t = stats(tops)
        metrics["bottom_rep"] = b
        metrics["top_rep"] = t
        rep_thresholds = {
            "enter_down": round((b["p90"] + t["p50"]) / 2, 1),
            "exit_up": round((b["p50"] + t["p10"]) / 2, 1),
        }
    elif reps_data and primary == "back":
        backs = [r["bottom_back"] for r in reps_data]
        b = stats(backs)
        metrics["bottom_rep"] = b
        all_b = clean.get("back", [])
        t = stats(all_b)
        metrics["top_rep"] = {"p10": t.get("p90", 170), "p50": t.get("max", 175), "p90": t.get("max", 175)}
        rep_thresholds = {
            "enter_down": round(b["p90"] + 8, 1),
            "exit_up": round(min(t.get("p90", 168), b["p50"] + 25), 1),
        }

    return {
        "exercise_id": entry["exercise_id"],
        "label": entry["label"],
        "source_video": entry["file"],
        "frames_sampled": frame_i // stride,
        "frames_with_pose": detected,
        "metrics": metrics,
        "rep_thresholds": rep_thresholds,
        "reps_detected": len(reps_data),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="yolo11n-pose.pt")
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--stride", type=int, default=2)
    args = ap.parse_args()

    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[calib] Cargando {args.model} en {args.device} ...")
    est = PoseEstimator(model_path=args.model, device=args.device, conf=0.4, imgsz=320)

    summary = []
    for entry in manifest["videos"]:
        eid = entry["exercise_id"]
        print(f"[calib] Procesando {entry['label']} ({entry['file']}) ...")
        try:
            profile = calibrate_video(entry, est, stride=args.stride)
            out = OUT_DIR / f"{eid}.json"
            with open(out, "w", encoding="utf-8") as f:
                json.dump(profile, f, indent=2, ensure_ascii=False)
            print(f"  -> {out.name}  reps={profile['reps_detected']}  "
                  f"pose={profile['frames_with_pose']}/{profile['frames_sampled']}")
            summary.append(profile)
        except Exception as e:
            print(f"  !! Error: {e}")

    with open(OUT_DIR / "_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"[calib] Listo. Perfiles en {OUT_DIR}")


if __name__ == "__main__":
    main()
