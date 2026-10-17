"""Extracción de ángulos por frame para calibración y ejercicios."""
from src.geometry import angle, angle_with_vertical


def pick_side(kp, joints):
    return kp.best_side(joints)


def _missing(*pts):
    return any(p is None for p in pts)


def elbow_angle(kp, side: str):
    s, e, w = (kp.get(f"{side}_{j}") for j in ("shoulder", "elbow", "wrist"))
    if _missing(s, e, w):
        return None
    return angle(s, e, w)


def back_angle(kp, side: str):
    sh, hip, knee = (kp.get(f"{side}_{j}") for j in ("shoulder", "hip", "knee"))
    if _missing(sh, hip, knee):
        return None
    return angle(sh, hip, knee)


def torso_lean(kp, side: str):
    sh, hip = kp.get(f"{side}_shoulder"), kp.get(f"{side}_hip")
    if _missing(sh, hip):
        return None
    return angle_with_vertical(sh, hip)


def knee_angle(kp, side: str):
    hip, knee, ankle = (kp.get(f"{side}_{j}") for j in ("hip", "knee", "ankle"))
    if _missing(hip, knee, ankle):
        return None
    return angle(hip, knee, ankle)


def frame_metrics(kp, mode: str = "elbow") -> dict:
    side = pick_side(kp, ["shoulder", "elbow", "wrist", "hip", "knee"])
    out = {"side": side}
    out["elbow"] = elbow_angle(kp, side)
    out["back"] = back_angle(kp, side)
    out["torso"] = torso_lean(kp, side)
    out["knee"] = knee_angle(kp, side)
    return out
