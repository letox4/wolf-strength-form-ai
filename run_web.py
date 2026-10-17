"""Arranca el servidor web y abre un tunel ngrok para acceder desde el movil.

Uso:
    python run_web.py                 # local + tunel ngrok (HTTPS publico)
    python run_web.py --no-tunnel     # solo en tu red local
    python run_web.py --port 8000

Requisito ngrok (gratis): crea cuenta en https://dashboard.ngrok.com y copia
tu authtoken. Pasalo una sola vez con:
    setx NGROK_AUTHTOKEN tu_token_aqui     (reinicia la terminal)
o con  --authtoken tu_token
"""
import argparse
import os
import socket
import threading

import uvicorn


def local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def open_tunnel(port, authtoken):
    from pyngrok import ngrok, conf
    token = authtoken or os.environ.get("NGROK_AUTHTOKEN")
    if token:
        conf.get_default().auth_token = token
    try:
        tunnel = ngrok.connect(port, "http",
                               bind_tls=True)  # fuerza HTTPS (camara en movil)
        url = tunnel.public_url
        print("\n" + "=" * 60)
        print(f"  ACCESO PUBLICO (movil/Chrome):  {url}")
        print("=" * 60 + "\n")
        return url
    except Exception as e:
        print(f"[ngrok] No se pudo abrir el tunel: {e}")
        print("[ngrok] Configura tu authtoken (ver cabecera de run_web.py).")
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--no-tunnel", action="store_true")
    ap.add_argument("--authtoken", default=None)
    ap.add_argument("--model", default=None, help="ej. yolo11n-pose.pt (mas rapido)")
    args = ap.parse_args()

    if args.model:
        os.environ["LP_MODEL"] = args.model

    print(f"[servidor] Wolf Strength Guía 3D v4")
    print(f"[servidor] Guía:   http://{local_ip()}:{args.port}/")
    print(f"[servidor] IA live: http://{local_ip()}:{args.port}/live")
    print(f"[servidor] Local PC:   http://localhost:{args.port}")

    if not args.no_tunnel:
        # abrir el tunel en cuanto el servidor este arriba
        threading.Timer(2.0, open_tunnel, args=(args.port, args.authtoken)).start()

    uvicorn.run("web.server:app", host="0.0.0.0", port=args.port, log_level="info")


if __name__ == "__main__":
    main()
