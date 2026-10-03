import json, os, sys
from http.server import BaseHTTPRequestHandler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _farinha import gerar_farinha as gerar


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            n = int(self.headers.get('content-length', 0))
            out = gerar(json.loads(self.rfile.read(n) or b'{}'))
        except Exception as e:
            self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode()); return
        self.send_response(200)
        self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers(); self.wfile.write(out)
