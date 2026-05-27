import urllib.request
import json

API_KEY = "rnd_V2NRgmItkOwG1Qhs0aRqOU8mNnSk"
SERVICE_ID = "srv-d8b5gb6q1p3s73dsi9v0"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
}

def get(endpoint):
    url = f"https://api.render.com/v1{endpoint}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        return None

# Get latest deploy
deploys = get(f"/services/{SERVICE_ID}/deploys?limit=1")
print("Deploys:", json.dumps(deploys, indent=2))
