# ARAMO en localhost para probar.
# Sirve ESTA carpeta (la de este archivo), revisa que lo que responde localhost sea
# exactamente esta carpeta y no otro proyecto, y lo abre SIEMPRE en Chrome, en una
# ventana nueva del escritorio donde estás.
# Uso: doble clic en abrir-local.cmd. Para apagarlo, cerrá la ventana negra.
import http.server, os, socket, subprocess, sys, threading, time, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
PUERTO = 5510          # propio de ARAMO (el 8081 lo usa otro proyecto)
PAGINA = 'APP.html'

def chrome():
    for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe',
              r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
              os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe')):
        if os.path.exists(p):
            return p
    return None

def sirve_esta_carpeta(puerto):
    """True si localhost:puerto entrega el mismo APP.html que hay en esta carpeta."""
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{puerto}/{PAGINA}', timeout=2) as r:
            remoto = r.read()
    except Exception:
        return None  # nadie responde
    with open(os.path.join(AQUI, PAGINA), 'rb') as f:
        return remoto == f.read()

def libre(puerto):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1', puerto)) != 0

def abrir(puerto):
    if '--sin-chrome' in sys.argv:  # solo encender el servidor (Chrome ya está abierto)
        return
    c = chrome()
    url = f'http://localhost:{puerto}/{PAGINA}'
    if not c:
        print('No encontré Chrome instalado. Abrí a mano en Chrome:', url)
        return
    # --new-window: ventana nueva en el escritorio actual (no una pestaña en otro escritorio)
    subprocess.Popen([c, '--new-window', url])
    print('Abierto en Chrome:', url)

class SinCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=AQUI, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, *a):
        pass

def main():
    print('Carpeta:', AQUI)
    puerto = PUERTO
    while True:
        estado = sirve_esta_carpeta(puerto)
        if estado is True:
            print(f'Ya estaba encendido en el puerto {puerto} con esta misma carpeta.')
            abrir(puerto)
            return
        if estado is None and libre(puerto):
            break
        print(f'El puerto {puerto} lo usa otra cosa; pruebo el siguiente.')
        puerto += 1

    srv = http.server.ThreadingHTTPServer(('127.0.0.1', puerto), SinCache)

    def revisar_y_abrir():
        time.sleep(0.3)
        if sirve_esta_carpeta(puerto) is True:
            print(f'Verificado: localhost:{puerto} entrega esta carpeta.')
            abrir(puerto)
        else:
            print('ERROR: localhost no está entregando esta carpeta. No abro Chrome.')
    threading.Thread(target=revisar_y_abrir, daemon=True).start()
    print(f'ARAMO encendido en http://localhost:{puerto}/{PAGINA}  (cerrá esta ventana para apagarlo)')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    main()
