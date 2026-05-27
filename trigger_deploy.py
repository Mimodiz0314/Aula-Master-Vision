import urllib.request
import json

API_KEY = "rnd_V2NRgmItkOwG1Qhs0aRqOU8mNnSk"
SERVICE_ID = "srv-d8b5gb6q1p3s73dsi9v0"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

def request(method, endpoint, data=None):
    url = f"https://api.render.com/v1{endpoint}"
    req = urllib.request.Request(url, method=method, headers=HEADERS)
    if data:
        req.data = json.dumps(data).encode("utf-8")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        return None

print("Triggering new deploy...")
result = request("POST", f"/services/{SERVICE_ID}/deploys")
print("Deploy triggered!", json.dumps(result, indent=2) if result else "done")
