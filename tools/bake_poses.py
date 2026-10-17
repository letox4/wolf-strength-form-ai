"""Hornea posturas mannequin v7 vía navegador headless (Playwright).

Uso:
    python tools/bake_poses.py [--port 8000]

Arranca el servidor si no está activo, abre /static/bake-poses.html y guarda
data/mannequin_poses.json + fusiona en exercises_guide.json.
"""
import argparse
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANNEQUIN_OUT = ROOT / "data" / "mannequin_poses.json"


def server_up(port):
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{port}/api/guide", timeout=2)
        return True
    except Exception:
        return False


def start_server(port):
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "web.server:app", "--host", "127.0.0.1", f"--port={port}"],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    port = args.port

    proc = None
    if not server_up(port):
        proc = start_server(port)
        for _ in range(40):
            if server_up(port):
                break
            time.sleep(0.25)
        else:
            if proc:
                proc.terminate()
            raise SystemExit(f"No se pudo arrancar servidor en puerto {port}")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Instalando playwright…")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright", "-q"])
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        from playwright.sync_api import sync_playwright

    url = f"http://127.0.0.1:{port}/static/bake-poses.html"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="networkidle", timeout=120_000)
        page.wait_for_function(
            "() => document.getElementById('status').textContent.includes('Guardado')"
            " || document.getElementById('status').textContent.includes('Listo')",
            timeout=120_000,
        )
        baked = page.evaluate("() => window.__BAKED_POSES__")
        browser.close()

    if not baked:
        raise SystemExit("No se generaron poses")

    MANNEQUIN_OUT.write_text(json.dumps(baked, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Horneadas {len(baked)} poses -> {MANNEQUIN_OUT}")

    if proc:
        proc.terminate()


if __name__ == "__main__":
    main()
