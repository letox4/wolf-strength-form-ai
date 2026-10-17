"""Carga perfiles de calibración generados desde videos de referencia."""
import json
from pathlib import Path

CALIB_DIR = Path(__file__).resolve().parent.parent / "data" / "calibration"


def load_calibration(exercise_id: str) -> dict | None:
    path = CALIB_DIR / f"{exercise_id}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def threshold(cal: dict | None, key: str, fallback: float) -> float:
    if not cal:
        return fallback
    rep = cal.get("rep_thresholds") or {}
    if key in rep:
        return float(rep[key])
    metrics = cal.get("metrics") or {}
    if key in metrics and "p50" in metrics[key]:
        return float(metrics[key]["p50"])
    return fallback


def range_ok(value: float | None, cal: dict | None, metric: str,
             band: str, margin: float = 12.0) -> bool:
    """Comprueba si un valor cae en la banda calibrada (p10-p90 + margen)."""
    if value is None or not cal:
        return True
    metrics = cal.get("metrics") or {}
    src = metrics.get(metric) or {}
    band_data = src.get(band) or src
    lo = band_data.get("p10", band_data.get("min"))
    hi = band_data.get("p90", band_data.get("max"))
    if lo is None or hi is None:
        return True
    return (lo - margin) <= value <= (hi + margin)
