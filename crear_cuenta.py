import urllib.request
import json

url = "https://aulamaster-backend.onrender.com/api/auth/registro"
data = json.dumps({
    "nombre": "Milton Morales Diaz",
    "email": "miltonmoralesdiaz@gmail.com",
    "password": "Mimodiz0314"
}).encode("utf-8")

req = urllib.request.Request(url, data=data, method="POST", headers={
    "Content-Type": "application/json"
})

try:
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read().decode())
        print("✅ CUENTA CREADA EXITOSAMENTE!")
        print(f"   Nombre: {resp.get('nombre')}")
        print(f"   ID Docente: {resp.get('docente_id')}")
        print(f"   Token: {resp.get('token', 'ok')[:30]}...")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Error {e.code}: {body}")
except Exception as e:
    print(f"Error de conexion: {e}")
