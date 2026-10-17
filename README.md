# Wolf Strength — Detector de técnica de ejercicios con IA

Sistema que usa **YOLO-Pose** (Ultralytics) para reconocer las articulaciones del
cuerpo y determinar, en tiempo real, si un ejercicio se está haciendo **bien o mal**
y **por qué** — calculando ángulos entre articulaciones y aplicando reglas
biomecánicas por ejercicio.

Optimizado para **NVIDIA RTX 3060** (corre en tiempo real con FP16).

---

## ¿Cómo funciona?

1. **YOLO-Pose** detecta 17 puntos clave del cuerpo (COCO) en cada frame.
2. `geometry.py` calcula ángulos articulares (rodilla, codo, cadera, torso…).
3. Cada ejercicio (`exercises/`) tiene una **máquina de estados** que cuenta
   repeticiones y un conjunto de **reglas de técnica** que generan el feedback.
4. `visualizer.py` dibuja el esqueleto (verde = bien, rojo = corregir) y los mensajes.

```
cámara/video → YOLO-Pose → keypoints → ángulos → reglas por ejercicio → feedback
```

---

## Instalación

```powershell
cd ruta\a\wolf-strength-form-ai   # la carpeta donde clonaste el repo

# 1. Entorno virtual (recomendado)
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. PyTorch con CUDA 12.1 (para la RTX 3060)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 3. Resto de dependencias
pip install -r requirements.txt
```

La primera vez que ejecutes, Ultralytics descarga el modelo `yolo11s-pose.pt` solo.

> Verifica que la GPU se detecta:
> ```powershell
> python -c "import torch; print('CUDA:', torch.cuda.is_available(), torch.cuda.get_device_name(0))"
> ```

---

## Uso desde el móvil (interfaz web + ngrok) ⭐

El teléfono solo actúa como **cámara y pantalla**; toda la IA corre en tu PC
(la RTX 3060). El navegador captura la cámara, envía los frames por WebSocket al
servidor, la GPU corre YOLO-Pose y devuelve el esqueleto + feedback en tiempo real.

```powershell
# 1) (una sola vez) configura tu authtoken gratuito de ngrok
#    obtén el token en https://dashboard.ngrok.com  ->  Your Authtoken
setx NGROK_AUTHTOKEN tu_token_aqui      # reinicia la terminal tras esto

# 2) arranca servidor + túnel
python run_web.py
#    (o doble clic en  IniciarWeb.bat)
```

La consola imprimirá algo como:

```
============================================================
  ACCESO PUBLICO (movil/Chrome):  https://abcd-1234.ngrok-free.app
============================================================
```

Abre esa URL en **Chrome del teléfono** (es HTTPS, así que Chrome permite la
cámara), elige el ejercicio, pulsa **Iniciar** y permite el acceso a la cámara.
Verás el esqueleto, el contador de reps y los avisos de corrección en vivo.

> **Solo en tu red local (sin túnel):** `python run_web.py --no-tunnel` y entra
> desde el móvil a `http://IP-DE-TU-PC:8000` (la consola muestra la IP).
> Ojo: sin HTTPS, Chrome móvil bloquea la cámara salvo en `localhost`; por eso
> para el teléfono se recomienda el túnel ngrok.

> **Más FPS:** `python run_web.py --model yolo11n-pose.pt`

**Controles de la web:** selector de ejercicio · Iniciar · Reiniciar contador ·
Cámara (frontal/trasera).

---

## Uso desde el PC (ventana local OpenCV)

```powershell
# Sentadillas desde la webcam
python main.py --exercise sentadilla

# Curl de bíceps
python main.py --exercise curl

# Flexiones analizando un video
python main.py --exercise flexion --source data/videos/clip.mp4

# Modelo más rápido (menos preciso) si vas justo de FPS
python main.py --exercise sentadilla --model yolo11n-pose.pt

# Guardar el video anotado
python main.py --exercise curl --save salida.mp4
```

**Teclas:** `q` salir · `r` reiniciar contador

**Consejo de encuadre:** para sentadilla y flexión ponte **de perfil** a la cámara;
para el curl, de frente o ligeramente de lado. Buena iluminación = mejor detección.

---

## Ejercicios incluidos

| Ejercicio   | Cuenta reps por | Qué evalúa |
|-------------|-----------------|------------|
| `sentadilla`| ángulo de rodilla | profundidad, inclinación de espalda, rodilla adelantada |
| `curl`      | ángulo de codo  | rango completo, codo pegado al cuerpo, balanceo (impulso) |
| `flexion`   | ángulo de codo  | profundidad, cuerpo en línea recta (cadera) |

---

## Añadir un ejercicio nuevo

1. Crea `exercises/mi_ejercicio.py` heredando de `Exercise` (mira `squat.py`).
2. Implementa `analyze(self, kp) -> Feedback`: calcula ángulos, cuenta reps con
   `self.count_rep(...)` y añade mensajes a `fb.issues` (mal) o `fb.good_msgs` (bien).
3. Regístralo en `exercises/__init__.py`.

---

## Estructura

```
wolf-strength-form-ai/
├── main.py                 # entrada PC (ventana OpenCV, webcam/video)
├── run_web.py              # entrada WEB (servidor + túnel ngrok)
├── IniciarWeb.bat          # lanzador de la web con doble clic
├── requirements.txt
├── src/
│   ├── geometry.py         # keypoints COCO, ángulos, suavizado
│   ├── pose_estimator.py   # wrapper de YOLO-Pose (GPU/FP16)
│   └── visualizer.py       # dibujo de esqueleto y panel (versión PC)
├── exercises/
│   ├── base.py             # clase base + máquina de reps
│   ├── squat.py
│   ├── bicep_curl.py
│   └── pushup.py
├── web/
│   ├── server.py           # FastAPI: WebSocket frames → GPU → feedback
│   └── static/             # index.html, app.js, style.css (UI móvil)
├── models/                 # pesos YOLO descargados
└── data/videos/            # tus clips de prueba
```

---

## Notas técnicas

- **Modelo:** `yolo11s-pose` es el equilibrio ideal para la 3060. `n` para máxima
  velocidad, `m` para más precisión.
- **FP16 (`half=True`)** está activado por defecto: casi duplica los FPS en la 3060.
- Las reglas usan **ángulos relativos**, así que funcionan a distintas distancias de
  cámara. Los umbrales (`KNEE_DOWN`, `MAX_BACK_LEAN`, etc.) se ajustan fácil en cada
  archivo de ejercicio según tu caso.
- Para una versión más robusta a futuro: clasificador ML sobre secuencias de ángulos
  (LSTM/1D-CNN) entrenado con tus propios vídeos etiquetados bien/mal.
