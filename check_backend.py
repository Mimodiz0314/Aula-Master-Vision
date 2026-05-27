import urllib.request
import json

API_KEY = "rnd_V2NRgmItkOwG1Qhs0aRqOU8mNnSk"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Accept": "application/json"}

def get(endpoint):
    url = f"https://api.render.com/v1{endpoint}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

deploys = get("/services/srv-d8b4o1egvqtc73a8oo5g/deploys?limit=1")
if deploys:
    d = deploys[0]["deploy"]
    print(f"Backend deploy: {d['status']}")
    print(f"  Started: {d.get('startedAt','?')}")
    print(f"  Finished: {d.get('finishedAt','still running...')}")
