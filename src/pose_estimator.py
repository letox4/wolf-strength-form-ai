"""Envoltorio de YOLO-Pose (Ultralytics) optimizado para GPU."""
import numpy as np
from ultralytics import YOLO

from .geometry import Keypoints


class PoseEstimator:
    """Detecta la pose de la persona principal en cada frame.

    Para la RTX 3060 el modelo 's' (small) va sobrado en tiempo real con half=True.
    Modelos disponibles: yolo11n-pose.pt < yolo11s-pose.pt < yolo11m-pose.pt
    (más grande = más preciso pero más lento).
    """

    def __init__(self, model_path="yolo11s-pose.pt", device="cuda",
                 conf=0.5, half=True, imgsz=480):
        self.model = YOLO(model_path)
        self.device = device
        self.conf = conf
        self.half = half
        self.imgsz = imgsz

    def estimate(self, frame):
        """Devuelve un objeto Keypoints de la persona más prominente, o None."""
        results = self.model.predict(
            frame, device=self.device, conf=self.conf, half=self.half,
            imgsz=self.imgsz, verbose=False, max_det=1,
        )
        if not results:
            return None
        r = results[0]
        if r.keypoints is None or len(r.keypoints) == 0:
            return None

        # Elegir la persona con bounding box de mayor área (la más cercana/principal)
        if r.boxes is not None and len(r.boxes) > 0:
            areas = []
            for b in r.boxes.xywh.cpu().numpy():
                areas.append(b[2] * b[3])
            idx = int(np.argmax(areas))
        else:
            idx = 0

        xy = r.keypoints.xy[idx].cpu().numpy()
        conf = (r.keypoints.conf[idx].cpu().numpy()
                if r.keypoints.conf is not None else np.ones(len(xy)))
        return Keypoints(xy, conf, conf_thr=self.conf)
