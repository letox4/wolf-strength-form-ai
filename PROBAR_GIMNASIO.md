# Wolf Strength — Guía de prueba en gimnasio (Beta v3)

## Qué es

App de **análisis de técnica en tiempo real** para el gimnasio. La cámara del móvil (o PC) captura el movimiento; la **GPU del PC** corre la IA y devuelve:

- Contador de **repeticiones**
- Avisos de **técnica incorrecta** (por rep, no spam frame a frame)
- Esqueleto sobre el vídeo

## Ejercicios incluidos (calibrados con vuestros videos)

| Ejercicio | ID en app |
|-----------|-----------|
| Jalón al pecho | `jalon` |
| Fondos en paralelas | `fondos` |
| Remo en máquina | `remo_maquina` |
| Peso muerto | `peso_muerto` |
| Press inclinado Smith | `press_smith` |
| Sentadilla / Curl / Flexiones | peso corporal |

Los 5 primeros usan umbrales sacados de los videos en `EntrenamientoVideos/`.

---

## Arranque rápido (PC del gimnasio)

1. Doble clic en **`IniciarPruebaGimnasio.bat`**
2. Esperar a que diga que el servidor está listo (~10–20 s la primera vez; descarga modelo YOLO)
3. En el **móvil** (misma WiFi): abrir `http://IP-DEL-PC:8000`  
   - La IP sale en la consola al arrancar, o en Windows: `ipconfig` → IPv4
4. Elegir ejercicio → **INICIAR** → permitir cámara
5. **VOLTEAR** cámara si hace falta (casi siempre **trasera**)
6. **RESET** reinicia el contador

### Requisitos PC

- Windows con **NVIDIA** (recomendado RTX o superior)
- Python 3.10+
- Primera vez: en la carpeta del proyecto:
  ```powershell
  pip install -r requirements.txt
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
  ```

---

## Cómo encuadrar (importante)

| Ejercicio | Cámara | Ángulo |
|-----------|--------|--------|
| Jalón | Trasera | Frente o 3/4, brazos visibles |
| Fondos | Trasera | **Perfil** |
| Remo máquina | Trasera | **Lado**, brazos visibles |
| Peso muerto | Trasera | **Perfil**, barra y cuerpo |
| Press Smith | Trasera | **Perfil** |

Si sale banner amarillo de encuadre, ajustar distancia/ángulo hasta que desaparezca.

---

## Qué probar y feedback útil

Anotad por ejercicio:

1. ¿Cuenta reps bien? (sí / a veces / no)
2. ¿Los avisos tienen sentido? (ejemplo: “recorrido corto” en jalón)
3. ¿Latencia aceptable? (mirad `FPS · XXms` abajo)
4. ¿Encuadre difícil por la máquina?

Enviad captura o vídeo corto si algo falla.

---

## Recalibrar con nuevos videos

1. Grabar ejecución **correcta** (como los de WhatsApp)
2. Guardar en `EntrenamientoVideos/`
3. Editar `data/exercises_manifest.json` si es ejercicio nuevo
4. Ejecutar: `python tools/calibrate_from_videos.py`
5. Reiniciar el servidor

---

## Limitaciones conocidas (beta)

- **No detecta solo** qué ejercicio haces: hay que **elegirlo** en el menú
- Máquinas que **tapan** torso/brazos (remo apoyado) → menos precisión
- Móvil por WiFi: ~80–150 ms de latencia es normal
- Sin cuenta ni nube: todo corre en el PC local

---

## Contacto / soporte

Proyecto: `LucasPortafolio` — Wolf Strength Form AI  
Versión: **3.0-gym-beta**
