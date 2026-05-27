import urllib.request
import json

API_KEY = "rnd_V2NRgmItkOwG1Qhs0aRqOU8mNnSk"
SERVICE_ID = "srv-d8b5gb6q1p3s73dsi9v0"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"}
req = urllib.request.Request(f"https://api.render.com/v1/services/{SERVICE_ID}/deploys?limit=1", headers=HEADERS)
try:
    with urllib.request.urlopen(req) as r:
        deploys = json.loads(r.read().decode())
        if deploys:
            d = deploys[0]["deploy"]
            print(f"Frontend Deploy: {d['status']}, {d.get('finishedAt')}, commit: {d.get('commit',{}).get('id')}")
except Exception as e:
    print("Error:", e)
