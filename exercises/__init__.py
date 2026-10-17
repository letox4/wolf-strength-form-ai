"""Registro de ejercicios — Wolf Strength Gym Beta."""
from .squat import Squat
from .bicep_curl import BicepCurl
from .pushup import PushUp
from .gym_machines import LatPulldown, Dip, MachineRow, SmithPress
from .machine_base import CalibratedHingeExercise

Deadlift = CalibratedHingeExercise

REGISTRY = {
    # Máquinas / gimnasio (calibrados con EntrenamientoVideos)
    "jalon": LatPulldown,
    "lat_pulldown": LatPulldown,
    "fondos": Dip,
    "dip": Dip,
    "remo_maquina": MachineRow,
    "remo": MachineRow,
    "peso_muerto": Deadlift,
    "deadlift": Deadlift,
    "press_smith": SmithPress,
    "smith": SmithPress,
    # Peso corporal
    "sentadilla": Squat,
    "squat": Squat,
    "curl": BicepCurl,
    "biceps": BicepCurl,
    "flexion": PushUp,
    "pushup": PushUp,
}

EXERCISE_META = {
    "jalon": {
        "name": "Jalón al pecho",
        "category": "maquina",
        "setup": "De frente o 3/4; brazos y torso visibles",
        "camera": "environment",
        "priority": 1,
    },
    "fondos": {
        "name": "Fondos en paralelas",
        "category": "maquina",
        "setup": "De perfil; paralelas y cuerpo completo",
        "camera": "environment",
        "priority": 2,
    },
    "remo_maquina": {
        "name": "Remo en máquina",
        "category": "maquina",
        "setup": "De lado; brazos visibles",
        "camera": "environment",
        "priority": 3,
    },
    "peso_muerto": {
        "name": "Peso muerto",
        "category": "peso_libre",
        "setup": "De perfil; barra y cuerpo enteros",
        "camera": "environment",
        "priority": 4,
    },
    "press_smith": {
        "name": "Press inclinado Smith",
        "category": "maquina",
        "setup": "De perfil; banco y barra visibles",
        "camera": "environment",
        "priority": 5,
    },
    "sentadilla": {
        "name": "Sentadilla",
        "category": "peso_corporal",
        "setup": "De perfil; cuerpo completo",
        "camera": "environment",
        "priority": 10,
    },
    "curl": {
        "name": "Curl de bíceps",
        "category": "peso_corporal",
        "setup": "De frente; brazo completo",
        "camera": "user",
        "priority": 11,
    },
    "flexion": {
        "name": "Flexiones",
        "category": "peso_corporal",
        "setup": "De perfil; cuerpo completo",
        "camera": "environment",
        "priority": 12,
    },
}


def canonical_exercises():
    """Una entrada por ejercicio (sin alias duplicados)."""
    seen = {}
    for key, cls in REGISTRY.items():
        seen.setdefault(cls, key)
    items = []
    for cls, key in seen.items():
        meta = EXERCISE_META.get(key, {})
        items.append({
            "id": key,
            "name": meta.get("name", cls().name),
            "category": meta.get("category", "otro"),
            "setup": meta.get("setup", ""),
            "camera": meta.get("camera", "environment"),
            "priority": meta.get("priority", 99),
        })
    items.sort(key=lambda x: (x["category"] != "maquina", x["priority"]))
    return items


def get_exercise(name: str):
    key = name.lower().strip()
    if key not in REGISTRY:
        ids = ", ".join(e["id"] for e in canonical_exercises())
        raise ValueError(f"Ejercicio '{name}' no existe. Disponibles: {ids}")
    return REGISTRY[key]()
