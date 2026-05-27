import os
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

service_id = "srv-d8b4o1egvqtc73a8oo5g"

payload = {
    "rootDir": "backend",
    "autoDeploy": "yes",
    "branch": "main",
    "serviceDetails": {
        "env": "python",
        "envSpecificDetails": {
            "buildCommand": "pip install -r requirements.txt",
            "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
        },
        "plan": "free",
        "region": "oregon"
    }
}

service = request("PATCH", f"/services/{service_id}", payload)
print("Service:", json.dumps(service, indent=2))

