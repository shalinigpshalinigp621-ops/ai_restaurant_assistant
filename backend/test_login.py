import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/auth/login"

def test_login(email, password):
    data = json.dumps({"email": email, "password": password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            body = json.loads(res.read().decode())
            print(f"[OK] Login successful for {email}")
            print(f"     Token: {body['access_token'][:40]}...")
            print(f"     User:  {body['user']['full_name']} ({body['user']['role']})")
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"[FAIL] {email}: HTTP {e.code} -> {err}")

test_login("admin@restaurant.com", "Admin@123")
test_login("admin@restaurant.com", "admin123")
test_login("varshakm@gmail.com", "Admin@123")
