import urllib.request
import json

API_KEY = "rnd_V2NRgmItkOwG1Qhs0aRqOU8mNnSk"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"}

try:
    req = urllib.request.Request("https://api.render.com/v1/services?limit=20", headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        svcs = json.loads(r.read().decode())
        for s in svcs:
            if "backend" in s["service"]["name"]:
                print("Backend ID:", s["service"]["id"])
                req2 = urllib.request.Request(f"https://api.render.com/v1/services/{s['service']['id']}/env-vars", headers=HEADERS)
                with urllib.request.urlopen(req2) as r2:
                    envs = json.loads(r2.read().decode())
                    print("Backend ENVs:", [e['envVar']['key'] for e in envs])
except Exception as e:
    print("Error:", e)
