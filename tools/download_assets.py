"""Descarga assets GLB base para Wolf Strength.

Ejecutar desde la raíz del proyecto:
    python tools/download_assets.py

Para añadir animaciones de fitness (Mixamo):
1. Descarga animaciones FBX desde mixamo.com (gratis con cuenta Adobe)
2. Coloca los FBX en tools/mixamo_fbx/
3. Usa Mixamo2GLBAnimationMerger o Blender para fusionar en xbot.glb
4. Reinicia el servidor y recarga con Ctrl+F5
"""
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "static" / "models"

ASSETS = {
    "xbot.glb": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb",
    "soldier.glb": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb",
    "../vendor/three/build/three.module.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "../vendor/three/examples/jsm/controls/OrbitControls.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js",
    "../vendor/three/examples/jsm/loaders/GLTFLoader.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js",
    "../vendor/three/examples/jsm/environments/RoomEnvironment.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js",
    "../vendor/three/examples/jsm/utils/BufferGeometryUtils.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js",
    "../vendor/three/examples/jsm/loaders/FontLoader.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FontLoader.js",
    "../vendor/three/examples/jsm/geometries/TextGeometry.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/TextGeometry.js",
    "../vendor/three/examples/jsm/geometries/ParametricGeometry.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/ParametricGeometry.js",
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, url in ASSETS.items():
        if name.startswith("../"):
            dest = ROOT / "web" / "static" / name.replace("../", "").replace("/", os.sep)
        else:
            dest = OUT / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"Descargando {name}…")
        urllib.request.urlretrieve(url, dest)
        print(f"  -> {dest} ({dest.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
