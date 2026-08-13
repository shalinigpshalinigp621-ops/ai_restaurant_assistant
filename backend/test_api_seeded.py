import requests

BASE_URL = "http://localhost:8000/api/v1"

# 1. Login
print("Logging in...")
response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "admin@restaurant.com", "password": "Admin@123"}
)
if response.status_code != 200:
    print(f"Login failed: {response.text}")
    exit(1)

token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Login successful.")

# 2. Fetch Dashboard
print("\nFetching Dashboard Metrics...")
response = requests.get(f"{BASE_URL}/dashboard/", headers=headers)
if response.status_code == 200:
    data = response.json()
    print("Dashboard Data:")
    for stat in data.get("quick_stats", []):
        print(f"  {stat['label']}: {stat['value']} ({stat.get('trend', 'none')})")
    print(f"  Low stock items: {len(data.get('low_stock_items', []))}")
else:
    print(f"Dashboard failed: {response.text}")

# 3. Fetch Inventory
print("\nFetching Inventory...")
response = requests.get(f"{BASE_URL}/inventory/", headers=headers)
if response.status_code == 200:
    data = response.json()
    print(f"Total Inventory Items: {data.get('total')}")
else:
    print(f"Inventory failed: {response.text}")
