"""Genera data/exercises_guide.json con la biblioteca de 25 ejercicios."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "exercises_guide.json"


def step(n, title, text, pose, camera="side", angles=None, cautions=None):
    s = {
        "title": f"{n}. {title}",
        "text": text,
        "camera": camera,
        "pose": pose,
    }
    if angles:
        s["angles"] = angles
    if cautions:
        s["cautions"] = cautions
    return s


def ex(
    id_, name, category, equipment, summary, props, muscles, cautions, mistakes, tips,
    steps, default_angle="side",
):
    return {
        "id": id_,
        "name": name,
        "category": category,
        "equipment": equipment,
        "summary": summary,
        "default_angle": default_angle,
        "props": props,
        "muscles": muscles,
        "cautions": cautions,
        "mistakes": mistakes,
        "tips": tips,
        "steps": steps,
    }


# ── Poses (grados en huesos del maniquí) ──────────────────────────────────
P = {}

def Pset(name, **kw):
    P[name] = kw

Pset("squat_top", l_thigh=[5,0,0], r_thigh=[5,0,0], l_shin=[5,0,0], r_shin=[5,0,0])
Pset("squat_bottom", pelvis=[22,0,0], spine=[14,0,0],
     l_thigh=[88,0,0], r_thigh=[88,0,0], l_shin=[95,0,0], r_shin=[95,0,0])

Pset("bulgarian_top", l_thigh=[8,0,0], r_thigh=[35,0,0], l_shin=[8,0,0], r_shin=[55,0,0],
     r_foot=[-25,0,0])
Pset("bulgarian_bottom", pelvis=[12,0,0], l_thigh=[12,0,0], r_thigh=[90,0,0],
     l_shin=[10,0,0], r_shin=[48,0,0], r_foot=[-25,0,0])

Pset("hack_top", pelvis=[8,0,0], l_thigh=[12,0,0], r_thigh=[12,0,0], l_shin=[15,0,0], r_shin=[15,0,0],
     props={"hack_pad": 0})
Pset("hack_bottom", pelvis=[15,0,0], l_thigh=[78,0,0], r_thigh=[78,0,0], l_shin=[85,0,0], r_shin=[85,0,0],
     props={"hack_pad": 0.35})

Pset("lunge_top", l_thigh=[5,0,0], r_thigh=[5,0,0], l_shin=[5,0,0], r_shin=[5,0,0])
Pset("lunge_down", pelvis=[8,0,0],
     l_thigh=[75,0,0], r_thigh=[28,0,0], l_shin=[80,0,0], r_shin=[12,0,0])

Pset("dl_setup", rootY=-0.18, pelvis=[68,0,0], spine=[50,0,0], chest=[22,0,0],
     l_upper=[-12,0,8], r_upper=[-12,0,-8], l_lower=[18,0,0], r_lower=[18,0,0],
     l_thigh=[58,0,0], r_thigh=[58,0,0], l_shin=[12,0,0], r_shin=[12,0,0],
     props={"bar_lift": 0})
Pset("dl_top", rootY=0, pelvis=[0,0,0], spine=[0,0,0],
     l_upper=[-8,0,6], r_upper=[-8,0,-6], l_thigh=[3,0,0], r_thigh=[3,0,0],
     props={"bar_lift": 1})

Pset("rdl_top", rootY=0, pelvis=[0,0,0], spine=[0,0,0],
     l_upper=[-5,0,5], r_upper=[-5,0,-5], l_thigh=[5,0,0], r_thigh=[5,0,0],
     props={"bar_lift": 0.55})
Pset("rdl_bottom", rootY=-0.12, pelvis=[48,0,0], spine=[35,0,0], chest=[15,0,0],
     l_upper=[-8,0,6], r_upper=[-8,0,-6], l_lower=[12,0,0], r_lower=[12,0,0],
     l_thigh=[42,0,0], r_thigh=[42,0,0], l_shin=[8,0,0], r_shin=[8,0,0],
     props={"bar_lift": 0.35})

Pset("db_dl_setup", rootY=-0.15, pelvis=[62,0,0], spine=[45,0,0],
     l_upper=[-15,0,12], r_upper=[-15,0,-12], l_lower=[20,0,0], r_lower=[20,0,0],
     l_thigh=[55,0,0], r_thigh=[55,0,0], l_shin=[12,0,0], r_shin=[12,0,0],
     props={"db_height": 0.15})
Pset("db_dl_top", rootY=0, pelvis=[0,0,0], spine=[0,0,0],
     l_upper=[-10,0,10], r_upper=[-10,0,-10],
     props={"db_height": 0.75})

Pset("trap_setup", rootY=-0.16, pelvis=[65,0,0], spine=[48,0,0],
     l_upper=[-18,0,8], r_upper=[-18,0,-8], l_lower=[22,0,0], r_lower=[22,0,0],
     l_thigh=[56,0,0], r_thigh=[56,0,0], l_shin=[10,0,0], r_shin=[10,0,0],
     props={"trap_lift": 0})
Pset("trap_top", rootY=0, pelvis=[0,0,0], spine=[0,0,0],
     l_upper=[-12,0,8], r_upper=[-12,0,-8],
     props={"trap_lift": 0.9})

Pset("leg_curl_start", rootY=-0.25, pelvis=[-5,0,0], l_thigh=[-15,0,0], r_thigh=[-15,0,0],
     l_shin=[8,0,0], r_shin=[8,0,0], props={"leg_curl": 0})
Pset("leg_curl_contract", rootY=-0.25, pelvis=[-5,0,0], l_thigh=[-15,0,0], r_thigh=[-15,0,0],
     l_shin=[-75,0,0], r_shin=[-75,0,0], props={"leg_curl": 1})

Pset("bench_press_top", rootY=-0.48, pelvis=[72,0,0], spine=[16,0,0],
     l_thigh=[55,0,0], r_thigh=[55,0,0], l_shin=[25,0,0], r_shin=[25,0,0],
     l_upper=[-78,0,35], r_upper=[-78,0,-35], l_lower=[10,0,0], r_lower=[10,0,0],
     props={"press_bar": 1.75})
Pset("bench_press_bottom", rootY=-0.48, pelvis=[72,0,0], spine=[16,0,0],
     l_thigh=[55,0,0], r_thigh=[55,0,0], l_shin=[25,0,0], r_shin=[25,0,0],
     l_upper=[-32,0,45], r_upper=[-32,0,-45], l_lower=[88,0,0], r_lower=[88,0,0],
     props={"press_bar": 1.15})

Pset("incline_press_top", rootY=-0.55, pelvis=[35,0,0], spine=[28,0,0], chest=[18,0,0],
     l_thigh=[70,0,0], r_thigh=[70,0,0], l_shin=[28,0,0], r_shin=[28,0,0],
     l_upper=[-78,0,38], r_upper=[-78,0,-38], l_lower=[10,0,0], r_lower=[10,0,0],
     props={"press_bar": 1.82})
Pset("incline_press_bottom", rootY=-0.55, pelvis=[35,0,0], spine=[28,0,0],
     l_upper=[-32,0,48], r_upper=[-32,0,-48], l_lower=[88,0,0], r_lower=[88,0,0],
     props={"press_bar": 1.12})

Pset("db_press_top", rootY=-0.48, pelvis=[72,0,0], spine=[16,0,0],
     l_thigh=[55,0,0], r_thigh=[55,0,0], l_shin=[25,0,0], r_shin=[25,0,0],
     l_upper=[-75,0,42], r_upper=[-75,0,-42], l_lower=[12,0,0], r_lower=[12,0,0],
     props={"db_press": 1.7})
Pset("db_press_bottom", rootY=-0.48, pelvis=[72,0,0], spine=[16,0,0],
     l_thigh=[55,0,0], r_thigh=[55,0,0], l_shin=[25,0,0], r_shin=[25,0,0],
     l_upper=[-35,0,48], r_upper=[-35,0,-48], l_lower=[85,0,0], r_lower=[85,0,0],
     props={"db_press": 1.1})

Pset("pushup_top", rootY=0.52, pelvis=[-8,0,0], spine=[-8,0,0],
     l_upper=[-72,0,28], r_upper=[-72,0,-28], l_lower=[8,0,0], r_lower=[8,0,0],
     l_thigh=[8,0,0], r_thigh=[8,0,0])
Pset("pushup_bottom", rootY=0.32, pelvis=[-2,0,0], spine=[-2,0,0],
     l_upper=[-42,0,32], r_upper=[-42,0,-32], l_lower=[88,0,0], r_lower=[88,0,0])

Pset("crossover_start", rootY=0, l_upper=[-45,0,55], r_upper=[-45,0,-55], l_lower=[15,0,0], r_lower=[15,0,0],
     props={"cable_l": 0.3, "cable_r": 0.3})
Pset("crossover_contract", rootY=0, l_upper=[-25,0,25], r_upper=[-25,0,-25], l_lower=[45,0,0], r_lower=[45,0,0],
     props={"cable_l": 0.85, "cable_r": 0.85})

Pset("front_raise_down", rootY=0, l_upper=[-8,0,8], r_upper=[-8,0,-8], l_lower=[5,0,0], r_lower=[5,0,0])
Pset("front_raise_up", rootY=0, l_upper=[-75,0,5], r_upper=[-75,0,-5], l_lower=[8,0,0], r_lower=[8,0,0])

Pset("bb_row_start", rootY=-0.08, pelvis=[52,0,0], spine=[38,0,0], chest=[20,0,0],
     l_upper=[-12,0,8], r_upper=[-12,0,-8], l_lower=[15,0,0], r_lower=[15,0,0],
     l_thigh=[48,0,0], r_thigh=[48,0,0], l_shin=[12,0,0], r_shin=[12,0,0],
     props={"bar_lift": 0.45})
Pset("bb_row_pull", rootY=-0.08, pelvis=[52,0,0], spine=[38,0,0],
     l_upper=[-28,0,55], r_upper=[-28,0,-55], l_lower=[105,0,0], r_lower=[105,0,0],
     props={"bar_lift": 0.55})

Pset("tbar_start", rootY=-0.12, pelvis=[58,0,0], spine=[42,0,0],
     l_upper=[-15,0,25], r_upper=[-15,0,-25], l_lower=[12,0,0], r_lower=[12,0,0],
     l_thigh=[52,0,0], r_thigh=[52,0,0], props={"tbar_pull": 0})
Pset("tbar_pull", rootY=-0.12, pelvis=[58,0,0], spine=[42,0,0],
     l_upper=[-32,0,65], r_upper=[-32,0,-65], l_lower=[112,0,0], r_lower=[112,0,0],
     props={"tbar_pull": 1})

Pset("lat_pull_start", rootY=-0.38, pelvis=[12,0,0], spine=[10,0,0], chest=[6,0,0],
     l_upper=[-168,0,22], r_upper=[-168,0,-22], l_lower=[8,0,0], r_lower=[8,0,0],
     props={"pull_bar": 2.45})
Pset("lat_pull_mid", rootY=-0.38, pelvis=[14,0,0], spine=[12,0,0],
     l_upper=[-85,0,32], r_upper=[-85,0,-32], l_lower=[85,0,0], r_lower=[85,0,0],
     props={"pull_bar": 1.78})
Pset("lat_pull_bottom", rootY=-0.38, pelvis=[14,0,0], spine=[10,0,0],
     l_upper=[-42,0,38], r_upper=[-42,0,-38], l_lower=[115,0,0], r_lower=[115,0,0],
     props={"pull_bar": 1.32})

Pset("uni_row_start", rootY=-0.18, pelvis=[58,0,0], spine=[42,0,0], chest=[25,0,0],
     l_upper=[-15,0,45], r_upper=[-25,0,-15], l_lower=[12,0,0], r_lower=[8,0,0],
     l_thigh=[48,0,0], r_thigh=[55,0,0], props={"db_row": 0.2})
Pset("uni_row_pull", rootY=-0.18, pelvis=[58,0,0], spine=[42,0,0],
     l_upper=[-35,0,72], r_upper=[-25,0,-15], l_lower=[115,0,0], r_lower=[8,0,0],
     props={"db_row": 0.75})

Pset("curl_down", l_upper=[-8,0,8], r_upper=[-8,0,-8], l_lower=[5,0,0], r_lower=[5,0,0])
Pset("curl_up", l_upper=[-8,0,8], r_upper=[-8,0,-8], l_lower=[135,0,0], r_lower=[135,0,0])

Pset("hammer_down", l_upper=[-8,0,5], r_upper=[-8,0,-5], l_lower=[5,0,0], r_lower=[5,0,0])
Pset("hammer_up", l_upper=[-8,0,5], r_upper=[-8,0,-5], l_lower=[130,0,0], r_lower=[130,0,0],
     l_hand=[0,0,90], r_hand=[0,0,-90])

Pset("ez_curl_down", l_upper=[-8,0,10], r_upper=[-8,0,-10], l_lower=[5,0,0], r_lower=[5,0,0],
     props={"ez_angle": 0})
Pset("ez_curl_up", l_upper=[-8,0,10], r_upper=[-8,0,-10], l_lower=[132,0,0], r_lower=[132,0,0],
     props={"ez_angle": 1})

Pset("ohp_top", rootY=0, l_upper=[-175,0,15], r_upper=[-175,0,-15], l_lower=[5,0,0], r_lower=[5,0,0],
     props={"ohp_bar": 2.1})
Pset("ohp_bottom", rootY=0, l_upper=[-95,0,25], r_upper=[-95,0,-25], l_lower=[85,0,0], r_lower=[85,0,0],
     props={"ohp_bar": 1.55})

Pset("lat_raise_down", rootY=0, l_upper=[-8,0,8], r_upper=[-8,0,-8], l_lower=[5,0,0], r_lower=[5,0,0])
Pset("lat_raise_up", rootY=0, l_upper=[-88,0,75], r_upper=[-88,0,-75], l_lower=[12,0,0], r_lower=[12,0,0])


A_KNEE = [{"label": "Rodilla", "range": "80–95°", "note": "Flexión controlada"}]
A_ELBOW = [{"label": "Codo", "range": "70–90°", "note": "Contracción"}]
A_BACK = [{"label": "Espalda", "range": "Neutra", "note": "Sin redondear"}]

EXERCISES = [
    ex("sentadilla", "Sentadilla", "piernas", "Barra o peso corporal",
       "Cadera atrás, rodillas alineadas con pies, profundidad controlada.",
       [], ["Cuádriceps", "Glúteos", "Core"],
       ["Talones en el suelo", "Rodillas en línea con pies"],
       ["Rodillas hacia dentro", "Perder neutralidad lumbar", "Poca profundidad"],
       ["Pecho arriba", "Empujar el suelo", "Paralelo o más abajo"],
       [
           step(1, "Arriba", "Pies ancho de hombros, core activo, mirada al frente.", "squat_top",
                angles=[{"label": "Rodilla", "range": "170–180°", "note": "De pie"}]),
           step(2, "Bajada", "Cadera atrás y abajo. Rodillas siguen los pies.", "squat_bottom",
                camera="three_quarter", angles=A_KNEE + [{"label": "Cadera", "range": "Atrás", "note": "Bisagra"}]),
           step(3, "Subida", "Empuja con todo el pie sin dejar colapsar rodillas.", "squat_top"),
       ]),
    ex("bulgara", "Sentadilla búlgara", "piernas", "Banco + mancuernas o barra",
       "Un pie atrás en banco, baja la rodilla trasera hacia el suelo.",
       ["bench_flat"], ["Cuádriceps", "Glúteos"],
       ["Torso erguido", "Rodilla delantera no pase mucho la punta del pie"],
       ["Inclinarse demasiado", "Rodilla delantera colapsando"],
       ["Peso en pierna delantera", "Core activo", "Rango completo"],
       [
           step(1, "Posición", "Pie trasero en banco, pie delantero adelante. Torso vertical.", "bulgarian_top"),
           step(2, "Bajada", "Baja hasta muslo paralelo o rodilla trasera cerca del suelo.", "bulgarian_bottom",
                angles=A_KNEE),
           step(3, "Subida", "Empuja con el talón delantero.", "bulgarian_top"),
       ]),
    ex("hack_squat", "Hack squat", "piernas", "Máquina hack",
       "Espalda en el respaldo, pies en la plataforma, baja controlado.",
       ["hack_squat"], ["Cuádriceps", "Glúteos"],
       ["Lumbar pegada al respaldo", "No bloquear rodillas de golpe"],
       ["Despegar espalda del respaldo", "Pies muy juntos sin control"],
       ["Pies al ancho de hombros", "Bajada 2–3 s", "Empuje con piernas"],
       [
           step(1, "Arriba", "Espalda y hombros en el respaldo. Piernas casi extendidas.", "hack_top"),
           step(2, "Bajada", "Flexiona rodillas sin perder contacto lumbar.", "hack_bottom", angles=A_KNEE),
           step(3, "Empuje", "Extiende sin hiperextender.", "hack_top"),
       ]),
    ex("estocadas", "Estocadas", "piernas", "Mancuernas o barra",
       "Paso largo adelante, baja la rodilla trasera hacia el suelo.",
       [], ["Cuádriceps", "Glúteos", "Isquios"],
       ["Torso erguido", "Rodilla delantera estable"],
       ["Paso demasiado corto", "Inclinarse excesivamente"],
       ["90° en ambas rodillas", "Empujar con pierna delantera", "Alternar piernas"],
       [
           step(1, "Inicio", "De pie, paso largo hacia delante.", "lunge_top"),
           step(2, "Bajada", "Baja verticalmente. Rodilla trasera hacia el suelo.", "lunge_down", angles=A_KNEE),
           step(3, "Subida", "Empuja con el talón delantero para volver.", "lunge_top"),
       ]),
    ex("peso_muerto_conv", "Peso muerto convencional", "peso_muerto", "Barra olímpica",
       "Tirón desde el suelo con espalda neutra y barra pegada.",
       ["barbell"], ["Erectores", "Glúteos", "Isquios"],
       ["Espalda neutra", "Barra cerca del cuerpo", "No hiperextender arriba"],
       ["Espalda redondeada", "Barra lejos de piernas", "Tirar solo de espalda"],
       ["Pies bajo la barra", "Empujar el suelo", "Bloquear cadera arriba"],
       [
           step(1, "Setup", "Pies al ancho de caderas, agarre fuera de piernas, pecho arriba.", "dl_setup",
                angles=[{"label": "Cadera", "range": "45–55°", "note": "Bisagra"}, A_BACK[0]]),
           step(2, "Subida", "Empuja suelo, barra rozando muslos.", "dl_top",
                angles=[{"label": "Cadera", "range": "0°", "note": "Extensión completa"}]),
           step(3, "Bajada", "Cadera atrás primero, barra pegada.", "dl_setup", camera="three_quarter"),
       ]),
    ex("peso_muerto_rumano", "Peso muerto rumano", "peso_muerto", "Barra o mancuernas",
       "Bisagra de cadera con rodillas semiflexionadas, estira isquios.",
       ["barbell"], ["Isquios", "Glúteos", "Erectores"],
       ["Espalda neutra", "Barra cerca de muslos", "No hiperextender lumbar"],
       ["Flexionar demasiado rodillas", "Redondear espalda", "Bajar sin control"],
       ["Cadera atrás", "Sentir estiramiento en isquios", "Subir apretando glúteos"],
       [
           step(1, "Arriba", "De pie, barra a la altura de caderas.", "rdl_top"),
           step(2, "Bajada", "Cadera atrás, barra rozando piernas, rodillas semiflexionadas.", "rdl_bottom",
                angles=[{"label": "Cadera", "range": "45–55°", "note": "Bisagra profunda"}] + A_BACK),
           step(3, "Subida", "Extiende cadera apretando glúteos.", "rdl_top"),
       ]),
    ex("peso_muerto_mancuernas", "Peso muerto con mancuernas", "peso_muerto", "Mancuernas",
       "Misma mecánica que convencional con mancuernas a los lados.",
       ["dumbbells"], ["Glúteos", "Isquios", "Erectores"],
       ["Espalda neutra", "Mancuernas cerca del cuerpo"],
       ["Separar mancuernas del cuerpo", "Redondear lumbar"],
       ["Pecho arriba", "Empujar el suelo", "Control en la bajada"],
       [
           step(1, "Setup", "Mancuernas a los lados, pies al ancho de caderas.", "db_dl_setup", angles=A_BACK),
           step(2, "Subida", "Extiende cadera y rodillas juntas.", "db_dl_top"),
           step(3, "Bajada", "Cadera atrás, mancuernas pegadas.", "db_dl_setup"),
       ]),
    ex("peso_muerto_hex", "Peso muerto con barra hexagonal", "peso_muerto", "Barra hexagonal",
       "Agarre neutro lateral, menos estrés lumbar que convencional.",
       ["trap_bar"], ["Glúteos", "Cuádriceps", "Erectores"],
       ["Espalda neutra", "Centro de masa alineado"],
       ["Encorvarse", "Tirar con brazos"],
       ["Agarre firme", "Empuje de piernas", "Torso más vertical"],
       [
           step(1, "Setup", "Dentro de la barra hex, agarre neutro, pecho arriba.", "trap_setup", angles=A_BACK),
           step(2, "Subida", "Empuja el suelo, extiende cadera.", "trap_top"),
           step(3, "Bajada", "Cadera atrás controlando.", "trap_setup"),
       ]),
    ex("camilla_femoral", "Camilla femoral", "piernas", "Máquina de curl femoral",
       "Boca abajo, flexiona rodillas llevando talones al glúteo.",
       ["leg_curl"], ["Isquios"],
       ["Cadera pegada al banco", "Movimiento solo de rodilla"],
       ["Elevar cadera", "Impulso con lumbar", "Rango parcial"],
       ["Cadera quieta", "Contracción arriba 1 s", "Bajada lenta"],
       [
           step(1, "Inicio", "Boca abajo, rodillas al borde, tobillos bajo el rodillo.", "leg_curl_start",
                angles=[{"label": "Rodilla", "range": "170°", "note": "Piernas extendidas"}]),
           step(2, "Contracción", "Flexiona llevando talones al glúteo.", "leg_curl_contract",
                angles=[{"label": "Rodilla", "range": "35–50°", "note": "Máxima flexión"}]),
           step(3, "Extensión", "Baja controlando 2–3 s.", "leg_curl_start"),
       ]),
    ex("press_plano_mancuernas", "Press plano con mancuernas", "pecho", "Banco plano + mancuernas",
       "Press horizontal con mayor rango que barra.",
       ["bench_flat", "dumbbells"], ["Pectoral", "Tríceps", "Deltoides"],
       ["Omóplatos retraídos", "Pies firmes en el suelo"],
       ["Codos a 90° pegados", "Rebotar en el pecho", "Perder retracción"],
       ["Codos a 45°", "Control en bajada", "Empuje vertical"],
       [
           step(1, "Arriba", "Mancuernas sobre pecho, omóplatos atrás.", "db_press_top", camera="three_quarter"),
           step(2, "Bajada", "Baja hasta codos a 90° aprox.", "db_press_bottom", angles=A_ELBOW),
           step(3, "Empuje", "Empuja sin perder estabilidad escapular.", "db_press_top"),
       ]),
    ex("press_inclinado_mancuernas", "Press inclinado con mancuernas", "pecho", "Banco inclinado + mancuernas",
       "Enfatiza pectoral superior.",
       ["bench_incline", "dumbbells"], ["Pectoral superior", "Deltoides", "Tríceps"],
       ["Glúteos en el banco", "Muñecas neutras"],
       ["Ángulo excesivo del banco", "Abrir demasiado codos"],
       ["Inclinación 30–45°", "Barra/mancuernas al pecho alto", "Sin rebote"],
       [
           step(1, "Arriba", "Banco inclinado, mancuernas sobre pecho alto.", "incline_press_top", camera="side"),
           step(2, "Bajada", "Baja 2–3 s al pecho alto.", "incline_press_bottom", angles=A_ELBOW),
           step(3, "Empuje", "Empuja en línea con antebrazos.", "incline_press_top"),
       ]),
    ex("press_plano_barra", "Press plano con barra", "pecho", "Banco plano + barra",
       "Press clásico de banca plana.",
       ["bench_flat", "barbell_bench"], ["Pectoral", "Tríceps", "Deltoides"],
       ["Retraer omóplatos", "Arco lumbar natural"],
       ["Rebotar la barra", "Codos abiertos a 90°"],
       ["Agarre ancho de hombros+", "Pies firmes", "Control excéntrico"],
       [
           step(1, "Arriba", "Barra extendida sobre pecho.", "bench_press_top"),
           step(2, "Bajada", "Lleva la barra al pecho medio.", "bench_press_bottom", angles=A_ELBOW),
           step(3, "Empuje", "Empuja sin perder posición escapular.", "bench_press_top"),
       ]),
    ex("press_inclinado_barra", "Press inclinado con barra", "pecho", "Banco inclinado + barra",
       "Press inclinado para pectoral superior.",
       ["bench_incline", "barbell_bench"], ["Pectoral superior", "Deltoides", "Tríceps"],
       ["Glúteos en banco", "Muñecas rectas"],
       ["Rebote en pecho", "Inclinación excesiva"],
       ["Codos a 45°", "Bajada controlada", "Empuje explosivo controlado"],
       [
           step(1, "Arriba", "Barra sobre pecho alto, banco 30–45°.", "incline_press_top"),
           step(2, "Bajada", "Barra al pecho alto sin rebote.", "incline_press_bottom", angles=A_ELBOW),
           step(3, "Empuje", "Extiende codos sin perder retracción.", "incline_press_top"),
       ]),
    ex("flexiones", "Flexiones", "pecho", "Suelo",
       "Cuerpo en línea recta, pecho al suelo.",
       [], ["Pectoral", "Tríceps", "Core"],
       ["Cuerpo alineado", "Cuello neutro"],
       ["Cadera caída", "Codos muy abiertos", "Rango parcial"],
       ["Codos ~45°", "Core apretado", "Pecho cerca del suelo"],
       [
           step(1, "Plancha", "Manos bajo hombros, cuerpo recto.", "pushup_top"),
           step(2, "Bajada", "Codos a 45°, pecho al suelo.", "pushup_bottom", angles=A_ELBOW),
           step(3, "Empuje", "Empuja manteniendo línea corporal.", "pushup_top", camera="three_quarter"),
       ]),
    ex("cruce_polea", "Cruce en polea", "pecho", "Polea doble",
       "Cruza las manos al frente apretando pectorales.",
       ["cable_crossover"], ["Pectoral", "Deltoides anterior"],
       ["Ligera flexión de codos", "Pecho alto"],
       ["Bloquear codos", "Usar demasiado peso"],
       ["Arco de convergencia", "Contracción 1 s abajo", "Control al volver"],
       [
           step(1, "Apertura", "Brazos abiertos, ligera inclinación adelante.", "crossover_start", camera="front"),
           step(2, "Cruce", "Junta manos al frente apretando pecho.", "crossover_contract", camera="three_quarter"),
           step(3, "Vuelta", "Extiende controlando el peso.", "crossover_start"),
       ]),
    ex("empuje_frontal", "Empuje frontal", "hombros", "Mancuernas o polea",
       "Elevación frontal para deltoides anterior.",
       ["dumbbells"], ["Deltoides anterior"],
       ["Sin balanceo", "No elevar por encima de hombros si molesta"],
       ["Arquear espalda", "Usar impulso"],
       ["Brazos casi extendidos", "Subida controlada", "Bajada lenta"],
       [
           step(1, "Abajo", "Mancuernas frente a muslos, codos semiflexionados.", "front_raise_down", camera="front"),
           step(2, "Subida", "Eleva al frente hasta altura de hombros.", "front_raise_up",
                angles=[{"label": "Hombro", "range": "0–90°", "note": "Flexión frontal"}]),
           step(3, "Bajada", "Baja controlando 2 s.", "front_raise_down"),
       ]),
    ex("remo_barra", "Remo con barra", "espalda", "Barra olímpica",
       "Bisagra de cadera, tira la barra al ombligo.",
       ["barbell"], ["Dorsal", "Romboides", "Bíceps"],
       ["Espalda neutra", "Barra al ombligo"],
       ["Redondear espalda", "Tirar con bíceps solo", "Encoger hombros"],
       ["Codos atrás", "Pecho quieto", "Apretar omóplatos"],
       [
           step(1, "Posición", "Bisagra, agarre prono, brazos extendidos.", "bb_row_start", angles=A_BACK),
           step(2, "Tirón", "Lleva codos atrás, barra al ombligo.", "bb_row_pull",
                angles=[{"label": "Codo", "range": "70–90°", "note": "Codos atrás"}]),
           step(3, "Bajada", "Extiende controlando.", "bb_row_start"),
       ]),
    ex("remo_t", "Remo en T", "espalda", "Barra T o landmine",
       "Tirón con agarre en T, pecho más vertical que remo con barra.",
       ["tbar_row"], ["Dorsal", "Romboides", "Trapecio medio"],
       ["Espalda neutra", "No usar impulso de cadera"],
       ["Redondear lumbar", "Tirar con brazos solos"],
       ["Pecho alto", "Codos cerca del cuerpo", "Contracción escapular"],
       [
           step(1, "Estiramiento", "Agarre en T, brazos extendidos, torso inclinado.", "tbar_start"),
           step(2, "Tirón", "Tira al pecho bajo, aprieta omóplatos.", "tbar_pull", angles=A_ELBOW),
           step(3, "Vuelta", "Extiende lento.", "tbar_start"),
       ]),
    ex("jalon", "Jalón al pecho", "espalda", "Polea alta",
       "Tira la barra al pecho alto con codos hacia abajo.",
       ["lat_pulldown"], ["Dorsal ancho", "Bíceps", "Redondo mayor"],
       ["No balancear torso", "Hombros abajo"],
       ["Tirar detrás del cuello", "Tirar con antebrazos", "Encoger hombros"],
       ["Codos al bolsillo", "Pecho quieto", "Contracción arriba"],
       [
           step(1, "Inicio", "Sentado, muslos fijos, brazos extendidos.", "lat_pull_start",
                angles=[{"label": "Codo", "range": "160–175°", "note": "Arriba"}]),
           step(2, "Tirón", "Codos abajo y atrás.", "lat_pull_mid", camera="three_quarter",
                angles=[{"label": "Codo", "range": "90–110°", "note": "A mitad"}]),
           step(3, "Contracción", "Barra al pecho alto, pausa breve.", "lat_pull_bottom", angles=A_ELBOW),
           step(4, "Subida", "Extiende controlando.", "lat_pull_start", camera="front"),
       ]),
    ex("remo_unilateral", "Remo unilateral", "espalda", "Mancuerna + banco",
       "Apoyo en banco, tira mancuerna al bolsillo.",
       ["bench_flat", "dumbbells"], ["Dorsal", "Romboides", "Bíceps"],
       ["Espalda paralela al suelo", "Cadera estable"],
       ["Rotar torso", "Encoger hombro"],
       ["Codo al bolsillo", "Pausa abajo", "Sin impulso"],
       [
           step(1, "Estiramiento", "Mano y rodilla en banco, brazo extendido.", "uni_row_start", camera="three_quarter"),
           step(2, "Tirón", "Lleva codo al techo, aprieta omóplato.", "uni_row_pull", angles=A_ELBOW),
           step(3, "Bajada", "Extiende controlando.", "uni_row_start"),
       ]),
    ex("curl_mancuernas", "Curl bíceps con mancuernas", "biceps", "Mancuernas",
       "Codos fijos, flexión completa sin balanceo.",
       ["dumbbells"], ["Bíceps braquial"],
       ["Codos quietos", "Sin balanceo"],
       ["Mover codos adelante", "Rango incompleto"],
       ["Supinación al subir", "Contracción arriba", "Bajada 2–3 s"],
       [
           step(1, "Abajo", "Brazos extendidos, codos al torso.", "curl_down", camera="three_quarter"),
           step(2, "Subida", "Flexiona sin mover codos.", "curl_up",
                angles=[{"label": "Codo", "range": "30–45°", "note": "Contracción"}]),
           step(3, "Bajada", "Extiende controlando.", "curl_down"),
       ]),
    ex("curl_martillo", "Curl martillo", "biceps", "Mancuernas",
       "Agarre neutro, enfatiza braquial y braquiorradial.",
       ["dumbbells"], ["Braquial", "Bíceps", "Antebrazo"],
       ["Codos fijos", "Muñecas neutras"],
       ["Balancear torso", "Agarre incorrecto"],
       ["Palmas enfrentadas", "Codos quietos", "Rango completo"],
       [
           step(1, "Abajo", "Mancuernas a los lados, agarre neutro.", "hammer_down"),
           step(2, "Subida", "Flexiona sin supinar.", "hammer_up",
                angles=[{"label": "Codo", "range": "30–45°", "note": "Agarre neutro"}]),
           step(3, "Bajada", "Control excéntrico.", "hammer_down"),
       ]),
    ex("curl_barra_z", "Curl con barra Z", "biceps", "Barra EZ",
       "Agarre angular reduce estrés en muñeca.",
       ["ez_bar"], ["Bíceps braquial", "Braquial"],
       ["Codos al torso", "Sin impulso"],
       ["Balanceo", "Codos que avanzan"],
       ["Agarre en parte angulada", "Subida controlada", "No hiperextender abajo"],
       [
           step(1, "Abajo", "Brazos extendidos, barra Z al frente.", "ez_curl_down"),
           step(2, "Subida", "Flexiona manteniendo codos fijos.", "ez_curl_up", angles=A_ELBOW),
           step(3, "Bajada", "Baja lento sin soltar tensión.", "ez_curl_down"),
       ]),
    ex("press_militar", "Press militar", "hombros", "Barra o mancuernas",
       "Press vertical de pie o sentado, core activo.",
       ["barbell_bench"], ["Deltoides", "Tríceps", "Core"],
       ["Core apretado", "No arquear lumbar excesivo"],
       ["Arqueo lumbar excesivo", "Abrir demasiado codos"],
       ["Barra frente al rostro", "Empuje vertical", "Mentón atrás al bajar"],
       [
           step(1, "Arriba", "Barra sobre cabeza, brazos extendidos.", "ohp_top", camera="three_quarter"),
           step(2, "Bajada", "Baja a la clavícula/controlado.", "ohp_bottom", angles=A_ELBOW),
           step(3, "Empuje", "Empuja vertical sin rebote.", "ohp_top"),
       ]),
    ex("vuelos_laterales", "Vuelos laterales", "hombros", "Mancuernas",
       "Elevación lateral para deltoides medio.",
       ["dumbbells"], ["Deltoides lateral"],
       ["Codos ligeramente flexionados", "Sin trap impulso"],
       ["Demasiado peso", "Elevar por encima de hombros con balanceo"],
       ["Subida hasta hombros", "Meñiques ligeramente arriba", "Bajada lenta"],
       [
           step(1, "Abajo", "Mancuernas a los lados del cuerpo.", "lat_raise_down", camera="front"),
           step(2, "Subida", "Eleva lateralmente hasta hombros.", "lat_raise_up",
                angles=[{"label": "Hombro", "range": "0–90°", "note": "Abducción"}]),
           step(3, "Bajada", "Baja controlando 2–3 s.", "lat_raise_down"),
       ]),
]

# Remove stray kwargs if any
for e in EXERCISES:
    for s in e["steps"]:
        s.pop("props_note", None)

DATA = {
    "version": 4,
    "app": "Wolf Strength — Biblioteca 3D",
    "angles": [
        {"id": "front", "label": "Frontal", "hint": "Vista de frente"},
        {"id": "side", "label": "Lateral", "hint": "Vista lateral (recomendada)"},
        {"id": "three_quarter", "label": "3/4", "hint": "Vista diagonal"},
        {"id": "top", "label": "Cenital", "hint": "Vista desde arriba"},
    ],
    "categories": [
        {"id": "piernas", "label": "Piernas"},
        {"id": "peso_muerto", "label": "Peso muerto"},
        {"id": "pecho", "label": "Pecho"},
        {"id": "espalda", "label": "Espalda"},
        {"id": "hombros", "label": "Hombros"},
        {"id": "biceps", "label": "Bíceps"},
    ],
    "exercises": EXERCISES,
    "poses": P,
}

def _merge_baked_poses(data):
    baked_path = ROOT / "data" / "mannequin_poses.json"
    if not baked_path.exists():
        return 0
    baked = json.loads(baked_path.read_text(encoding="utf-8"))
    n = 0
    for pose_id, entry in baked.items():
        if pose_id not in data["poses"]:
            continue
        data["poses"][pose_id]["mannequin"] = entry.get("mannequin", entry)
        if entry.get("_engineVer") is not None:
            data["poses"][pose_id]["_engineVer"] = entry["_engineVer"]
        n += 1
    return n


if __name__ == "__main__":
    merged = _merge_baked_poses(DATA)
    OUT.write_text(json.dumps(DATA, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(EXERCISES)} exercises -> {OUT}" + (f" (+{merged} poses horneadas)" if merged else ""))
