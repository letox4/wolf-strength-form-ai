"""Servidor Wolf Strength — Guía 3D (+ análisis IA opcional en /live)."""
import asyncio
import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

STATIC_DIR = Path(__file__).parent / "static"
GUIDE_PATH = ROOT / "data" / "exercises_guide.json"
COACHING_PATH = ROOT / "data" / "coaching_insights.json"
MANNEQUIN_POSES_PATH = ROOT / "data" / "mannequin_poses.json"
APP_VERSION = "4.1-guide-3d-pro"

app = FastAPI(title="Wolf Strength")
estimator = None


def _lazy_pose():
    global estimator
    if estimator is None:
        from src.pose_estimator import PoseEstimator
        model = os.environ.get("LP_MODEL", "yolo11n-pose.pt")
        device = os.environ.get("LP_DEVICE", "cuda")
        estimator = PoseEstimator(model_path=model, device=device, conf=0.45, imgsz=480)
    return estimator


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-cache"})


@app.get("/live")
def live_analyzer():
    return FileResponse(STATIC_DIR / "live.html")


@app.get("/api/guide")
def get_guide():
    with open(GUIDE_PATH, encoding="utf-8") as f:
        data = json.load(f)
    if COACHING_PATH.is_file():
        with open(COACHING_PATH, encoding="utf-8") as f:
            data["coaching"] = json.load(f)
    data["version"] = APP_VERSION
    return data


@app.post("/api/bake-poses")
async def bake_poses(request: Request):
    """Fusiona posturas horneadas del maniquí en exercises_guide.json."""
    baked = await request.json()
    with open(GUIDE_PATH, encoding="utf-8") as f:
        guide = json.load(f)
    merged = 0
    for pose_id, entry in baked.items():
        if pose_id not in guide.get("poses", {}):
            continue
        guide["poses"][pose_id]["mannequin"] = entry.get("mannequin", entry)
        if entry.get("_engineVer") is not None:
            guide["poses"][pose_id]["_engineVer"] = entry["_engineVer"]
        merged += 1
    with open(GUIDE_PATH, "w", encoding="utf-8") as f:
        json.dump(guide, f, ensure_ascii=False, indent=2)
    MANNEQUIN_POSES_PATH.write_text(json.dumps(baked, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "merged": merged, "message": f"Guardadas {merged} poses en biblioteca"}


@app.get("/api/exercises")
def list_exercises():
    from exercises import canonical_exercises
    return {"version": APP_VERSION, "exercises": canonical_exercises()}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    from src.pose_tracker import PoseSession
    from exercises import get_exercise

    await ws.accept()
    exercise = get_exercise("jalon")
    session = PoseSession()
    try:
        while True:
            msg = await ws.receive()
            if msg.get("text") is not None:
                data = json.loads(msg["text"])
                if data.get("type") == "config":
                    exercise = get_exercise(data["exercise"])
                    session.reset()
                    await ws.send_json({"event": "configured", "exercise": exercise.name})
                elif data.get("type") == "reset":
                    exercise.reset()
                    session.reset()
                    await ws.send_json({"event": "reset"})
                continue
            if msg.get("bytes") is not None:
                buf = np.frombuffer(msg["bytes"], dtype=np.uint8)
                frame = cv2.imdecode(buf, cv2.IMREAD_COLOR)
                if frame is None:
                    continue
                est = _lazy_pose()
                h, w = frame.shape[:2]
                kp = est.estimate(frame)
                if kp is None:
                    await ws.send_json({"reps": exercise.reps, "kp": [], "w": w, "h": h,
                                        "ready": False, "setup": "Sin persona"})
                    continue
                side = session.lock_side(kp, exercise.side_joints())
                fb = exercise.analyze(kp, side)
                await ws.send_json({
                    "reps": fb.reps, "stage": fb.stage, "correct": fb.correct,
                    "ready": fb.ready, "setup": fb.setup, "metrics": fb.metrics,
                    "issues": fb.issues, "good": fb.good_msgs, "live": fb.live,
                    "gauge": fb.gauge, "phase": fb.phase,
                    "kp": [[float(x), float(y), float(c)]
                           for (x, y), c in zip(kp.xy, kp.conf)],
                    "w": w, "h": h,
                })
    except WebSocketDisconnect:
        pass


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
