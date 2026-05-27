import urllib.request
import json

API_KEY = "rnd_V2NRgmItkOwG1Qhs0aRqOU8mNnSk"
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
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        return None

# Get environment variables
envs = request("GET", "/services/srv-d8b5gb6q1p3s73dsi9v0/env-vars")

# Add NODE_VERSION
payload = [
    {"key": "NODE_VERSION", "value": "20"}
]
request("PUT", "/services/srv-d8b5gb6q1p3s73dsi9v0/env-vars", payload)

# Trigger deploy
print("Triggering new deploy...")
request("POST", "/services/srv-d8b5gb6q1p3s73dsi9v0/deploys")
print("Done!")
