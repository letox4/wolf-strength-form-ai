"""Genera data/coaching_insights.json desde exercises_guide.json."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GUIDE = ROOT / "data" / "exercises_guide.json"
OUT = ROOT / "data" / "coaching_insights.json"

LIVE_MAP = {
    "sentadilla": "sentadilla",
    "bulgara": "sentadilla",
    "hack_squat": "sentadilla",
    "estocadas": "sentadilla",
    "flexiones": "flexion",
    "curl_mancuernas": "curl",
    "curl_martillo": "curl",
    "curl_barra_z": "curl",
    "jalon": "jalon",
    "peso_muerto_conv": "peso_muerto",
    "peso_muerto_rumano": "peso_muerto",
    "peso_muerto_mancuernas": "peso_muerto",
    "peso_muerto_hex": "peso_muerto",
    "remo_barra": "remo_maquina",
    "remo_t": "remo_maquina",
    "remo_unilateral": "remo_maquina",
    "press_plano_barra": "press_smith",
    "press_inclinado_barra": "press_smith",
}

WATCH_BY_LIVE = {
    "sentadilla": {
        "metrics": ["Rodilla", "Torso"],
        "intro": "Medimos profundidad real en el fondo, inclinación de torso y si la rodilla se adelanta al tobillo.",
    },
    "flexion": {
        "metrics": ["Cuerpo", "Codo"],
        "intro": "Vigilamos línea corporal (cadera alineada) y flexión de codos en la bajada.",
    },
    "curl": {
        "metrics": ["Codo"],
        "intro": "El codo debe quedarse estable; solo se mueve el antebrazo.",
    },
    "jalon": {
        "metrics": ["Codo", "Torso"],
        "intro": "Tirón con codos hacia el torso, sin balanceo lumbar excesivo.",
    },
    "peso_muerto": {
        "metrics": ["Torso", "Rodilla"],
        "intro": "Bisagra de cadera con espalda neutra; barra cerca del cuerpo.",
    },
    "remo_maquina": {
        "metrics": ["Codo", "Torso"],
        "intro": "Codos hacia atrás sin encoger hombros ni arquear lumbar.",
    },
    "press_smith": {
        "metrics": ["Codo"],
        "intro": "Recorrido controlado; codos no demasiado abiertos en la bajada.",
    },
}

COMPARISONS = [
    {
        "id": "squat_hack",
        "title": "Sentadilla libre vs Hack squat",
        "a": "sentadilla",
        "b": "hack_squat",
        "insight": "En hack squat el torso queda más vertical y la rodilla viaja más al frente con menos demanda de tobillo. Si pierdes profundidad por talones o lumbar, el hack te permite cargar pierna sin forzar la misma geometría.",
        "joint_focus": "Tobillo y cadera",
    },
    {
        "id": "dl_conv_rdl",
        "title": "Peso muerto convencional vs Rumano",
        "a": "peso_muerto_conv",
        "b": "peso_muerto_rumano",
        "insight": "Convencional: más flexión de rodilla al inicio, barra desde el suelo. Rumano: bisagra pura con rodillas semiflejadas, énfasis en isquios y glúteos. No son intercambiables si buscas un estímulo concreto.",
        "joint_focus": "Rodilla vs cadera",
    },
    {
        "id": "press_flat_incline",
        "title": "Press plano vs Inclinado",
        "a": "press_plano_mancuernas",
        "b": "press_inclinado_mancuernas",
        "insight": "Inclinado aumenta el ángulo del hombro y carga más la porción clavicular del pecho. Plano reparte más en el pecho medio. Elige según qué zona quieres priorizar, no solo por 'variar'.",
        "joint_focus": "Hombro y pecho",
    },
    {
        "id": "curl_hammer",
        "title": "Curl supino vs Martillo",
        "a": "curl_mancuernas",
        "b": "curl_martillo",
        "insight": "Supino enfatiza cabeza corta del bíceps; martillo (neutro) mete más braquial y antebrazo. Si el codo molesta en supino, el martillo suele ser más tolerable.",
        "joint_focus": "Codo y antebrazo",
    },
]

ERROR_TEMPLATES = {
    "rodilla": {
        "causes": ["Déficit de dorsiflexión de tobillo", "Glúteo medio débil en la bajada", "Pie demasiado estrecho para tu anatomía"],
        "fixes": ["Prueba pies un poco más abiertos", "Pista: rodillas siguen la punta del pie", "Movilidad de tobillo 2–3 min antes de entrenar"],
    },
    "lumbar": {
        "causes": ["Pérdida de presión abdominal", "Carga alejada del centro de masa", "Fatiga o peso excesivo"],
        "fixes": ["Bracing antes de cada rep", "Reduce carga hasta mantener neutro", "Pausa 1 s en el punto más difícil"],
    },
    "codo": {
        "causes": ["Codo que viaja adelante o atrás", "Peso excesivo", "Hombro elevado compensando"],
        "fixes": ["Codos pegados al torso (según ejercicio)", "Baja el peso 10–15%", "2 s de pausa arriba sin impulso"],
    },
    "hombro": {
        "causes": ["Escápulas inestables", "Rango forzado sin movilidad", "Agarre o ángulo inadecuado"],
        "fixes": ["Retrae escápulas antes del movimiento", "Reduce rango 10–20%", "Prueba agarre neutro o más cerrado"],
    },
    "profundidad": {
        "causes": ["Tobillo limitado", "Miedo a perder equilibrio", "Falta de control excéntrico"],
        "fixes": ["Box squat para aprender profundidad", "Goblet squat con pausa", "Trabaja excéntrica lenta"],
    },
    "default": {
        "causes": ["Técnica no automatizada aún", "Fatiga acumulada", "Carga por encima de lo que puedes controlar"],
        "fixes": ["Repite la fase lenta en la biblioteca 3D", "Baja series o peso", "Filma una serie y compara con el modelo"],
    },
}

SCREENING_LEG = [
    {"id": "heel", "q": "¿Se te levantan los talones al bajar?", "if_yes": "caution",
     "msg": "Probable limitación de tobillo o estrategia de compensación.",
     "alt": "hack_squat", "alt_label": "Hack squat"},
    {"id": "knee_pain", "q": "¿Dolor agudo en rodilla al bajar?", "if_yes": "avoid",
     "msg": "No fuerces profundidad hasta valorar con un profesional.",
     "alt": "camilla_femoral", "alt_label": "Camilla femoral (menos carga en rodilla)"},
    {"id": "long_femur", "q": "¿Torso muy inclinado aunque rodillas sigan bien?", "if_yes": "ok_variant",
     "msg": "Con fémur largo respecto al torso, más inclinación puede ser geometría normal, no 'mala técnica'. Prioriza peso sobre mediopié.",
     "alt": None},
]

SCREENING_PUSH = [
    {"id": "wrist", "q": "¿Molestia en muñeca en plancha?", "if_yes": "caution",
     "msg": "Prueba manos en paralelas o flexiones inclinadas.",
     "alt": "press_inclinado_mancuernas", "alt_label": "Press inclinado (menos carga en muñeca)"},
    {"id": "low_back", "q": "¿Cadera cae o lumbar se arquea en la bajada?", "if_yes": "caution",
     "msg": "Falta control de core o fuerza relativa.",
     "alt": "flexiones", "alt_label": "Flexiones con manos elevadas"},
]

SCREENING_PULL = [
    {"id": "shoulder", "q": "¿Hombros suben hacia las orejas al tirar?", "if_yes": "caution",
     "msg": "Compensación de trapecio; baja peso y piensa 'codos al bolsillo'.",
     "alt": "jalon", "alt_label": "Jalón con agarre neutro"},
]

SCREENING_BY_CAT = {
    "piernas": SCREENING_LEG,
    "peso_muerto": SCREENING_LEG[:2] + [
        {"id": "round", "q": "¿Redondeas lumbar al iniciar desde el suelo?", "if_yes": "avoid",
         "msg": "Empieza con rumano o elevaciones desde bloques hasta dominar bisagra.",
         "alt": "peso_muerto_rumano", "alt_label": "Peso muerto rumano"},
    ],
    "pecho": SCREENING_PUSH,
    "espalda": SCREENING_PULL,
    "hombros": SCREENING_PULL,
    "biceps": [
        {"id": "elbow", "q": "¿Dolor en cara interna del codo?", "if_yes": "caution",
         "msg": "Evita impulso y agarre martillo puede aliviar.",
         "alt": "curl_martillo", "alt_label": "Curl martillo"},
    ],
}

ANTHRO_BY_CAT = {
    "piernas": "Fémur largo respecto al torso → más inclinación al bajar no siempre es error; lo crítico es mantener el peso sobre el mediopié y rodillas alineadas con los pies.",
    "peso_muerto": "Brazos largos facilitan el convencional desde el suelo; brazos cortos suelen sentirse mejor con déficit o más flexión de rodilla al inicio.",
    "pecho": "Hombros estrechos o historial de molestias: mancuernas permiten ajustar el arco y el agarre mejor que barra fija.",
    "espalda": "Torso corto: en remo de pie cuida no hiperextender lumbar al final del tirón.",
    "hombros": "Hiperlaxitud: evita bloquear codos arriba y prioriza control escapular.",
    "biceps": "Antebrazo dominante: el martillo suele sentirse más natural que supino estricto.",
}


def _error_key(mistake: str) -> str:
    m = mistake.lower()
    if "rodilla" in m or "valgo" in m or "dentro" in m:
        return "rodilla"
    if "lumbar" in m or "espalda" in m or "arque" in m:
        return "lumbar"
    if "codo" in m:
        return "codo"
    if "hombro" in m or "escápula" in m:
        return "hombro"
    if "profund" in m or "arriba" in m or "paralelo" in m:
        return "profundidad"
    return "default"


def _angle_why(label: str, note: str, ex_name: str) -> dict:
    l = label.lower()
    if "rodilla" in l:
        return {
            "why": "Por debajo de ~90° el momento en rodilla aumenta; si el torso se va mucho al frente, la carga se aleja del centro y la lumbar trabaja de más.",
            "good_sign": "Rodillas siguen la punta del pie sin colapsar hacia dentro.",
        }
    if "cadera" in l or "bisagra" in l:
        return {
            "why": "La bisagra de cadera reparte carga entre glúteo e isquios; sin ella la rodilla o la espalda absorben lo que no deberían.",
            "good_sign": "Sientes el peso en glúteos, no solo en rodillas.",
        }
    if "codo" in l:
        return {
            "why": "El ángulo del codo define si el bíceps/pecho trabaja o si el hombro compensa con impulso.",
            "good_sign": "Codos estables; solo se mueve lo que debe moverse.",
        }
    if "torso" in l or "espalda" in l:
        return {
            "why": "La posición del torso determina qué músculos reciben tensión y cuánta carga pasa por la columna.",
            "good_sign": "Pecho abierto, columna neutra en todo el recorrido.",
        }
    return {
        "why": f"En {ex_name}, este punto es la referencia que separa técnica controlada de compensación.",
        "good_sign": note or "Movimiento suave, sin tirones.",
    }


def build_exercise(ex: dict) -> dict:
    eid = ex["id"]
    live = LIVE_MAP.get(eid)
    watch = WATCH_BY_LIVE.get(live, {}) if live else {}
    cat = ex.get("category", "otro")

    error_trees = {}
    for m in ex.get("mistakes", []):
        tpl = ERROR_TEMPLATES[_error_key(m)]
        error_trees[m] = {
            "causes": tpl["causes"],
            "fixes": tpl["fixes"],
            "alt_exercise": None,
        }
    if "Rodillas hacia dentro" in error_trees:
        error_trees["Rodillas hacia dentro"]["alt_exercise"] = "hack_squat"
    if "Poca profundidad" in error_trees or "Muy arriba" in error_trees:
        for k in list(error_trees):
            if "profund" in k.lower() or "arriba" in k.lower():
                error_trees[k]["alt_exercise"] = "hack_squat"

    step_insights = {}
    for i, step in enumerate(ex.get("steps", [])):
        angles = {}
        for a in step.get("angles", []):
            angles[a["label"]] = _angle_why(a["label"], a.get("note", ""), ex["name"])
        if angles or step.get("text"):
            step_insights[str(i)] = {
                "phase_title": step.get("title", ""),
                "angles": angles,
                "coaching": step.get("text", ""),
            }

    comp_ids = [c["id"] for c in COMPARISONS if c["a"] == eid or c["b"] == eid]

    return {
        "live_id": live,
        "live_available": live is not None,
        "watch_metrics": watch.get("metrics", []),
        "watch_intro": watch.get("intro", "Análisis en cámara disponible próximamente para este ejercicio. Mientras tanto usa la biblioteca 3D y el cuestionario."),
        "anthropometry": ANTHRO_BY_CAT.get(cat, "Cada cuerpo tiene proporciones distintas: compara contigo mismo entre sesiones, no con un maniquí 'ideal'."),
        "screening": SCREENING_BY_CAT.get(cat, SCREENING_LEG[:1]),
        "error_trees": error_trees,
        "step_insights": step_insights,
        "comparison_ids": comp_ids,
        "session_patterns": _session_patterns(eid, live),
    }


def _session_patterns(eid: str, live: str | None) -> list:
    if live == "sentadilla":
        return [
            {"if_issue_contains": "profundidad", "hypothesis": "Tobillo o control excéntrico limitan la bajada.",
             "next": "Prueba box squat o hack squat; 2 semanas de movilidad de tobillo."},
            {"if_issue_contains": "inclin", "hypothesis": "Carga adelantada o core que cede en la bajada.",
             "next": "Goblet squat con pausa; refuerza brace abdominal."},
            {"if_issue_contains": "rodilla", "hypothesis": "Rodillas adelantadas o valgo bajo fatiga.",
             "next": "Pies más abiertos; banda elástica sobre rodillas en calentamiento."},
        ]
    if live == "flexion":
        return [
            {"if_issue_contains": "cadera", "hypothesis": "Core insuficiente para mantener línea.",
             "next": "Flexiones inclinadas; plancha con pausa."},
            {"if_issue_contains": "codo", "hypothesis": "Codos muy abiertos o recorrido corto.",
             "next": "Codos a 45°; pausa 1 s abajo."},
        ]
    if live == "curl":
        return [
            {"if_issue_contains": "impulso", "hypothesis": "Peso alto o codo que viaja.",
             "next": "Baja 15%; apoya espalda en pared."},
        ]
    return [
        {"if_issue_contains": "", "hypothesis": "Revisa la fase marcada en rojo en la biblioteca 3D.",
         "next": "Repite 3 series lentas enfocando la primera corrección."},
    ]


def main():
    with open(GUIDE, encoding="utf-8") as f:
        guide = json.load(f)
    exercises = {}
    for ex in guide.get("exercises", []):
        exercises[ex["id"]] = build_exercise(ex)
    out = {
        "version": 1,
        "comparisons": COMPARISONS,
        "exercises": exercises,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Escrito {OUT} ({len(exercises)} ejercicios)")


if __name__ == "__main__":
    main()
