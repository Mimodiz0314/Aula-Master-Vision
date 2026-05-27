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

print("Fetching owner ID...")
service = request("GET", "/services/srv-d8b4o1egvqtc73a8oo5g")
owner_id = service["ownerId"]
print(f"Owner ID: {owner_id}")

payload = {
    "type": "static_site",
    "name": "aulamaster-frontend",
    "ownerId": owner_id,
    "repo": "https://github.com/Mimodiz0314/Aula-Master-Vision",
    "autoDeploy": "yes",
    "branch": "main",
    "rootDir": "frontend",
    "serviceDetails": {
        "publishPath": "dist",
        "buildCommand": "npm install && npm run build"
    }
}

print("Creating frontend static site...")
new_service = request("POST", "/services", payload)
if new_service:
    print(f"Success! Frontend deployed at: {new_service['service']['serviceDetails']['url']}")
    print(f"Dashboard URL: {new_service['service']['dashboardUrl']}")
