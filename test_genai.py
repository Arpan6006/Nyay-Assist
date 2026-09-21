import requests
import json

BASE = "http://localhost:8000/api"

# Step 1: Login with JSON body (not form data)
print("Step 1: Logging in...")
login_resp = requests.post(f"{BASE}/auth/login", json={"email": "test@test.com", "password": "test123"})
if login_resp.status_code != 200:
    print(f"Login failed, trying register...")
    reg_resp = requests.post(f"{BASE}/auth/register", json={"email": "test2@test.com", "password": "test123"})
    if reg_resp.status_code == 200:
        token = reg_resp.json().get("access_token")
        print(f"Registered! Token: {token[:30]}...")
    else:
        print(f"Register failed: {reg_resp.text[:200]}")
        exit(1)
else:
    token = login_resp.json().get("access_token")
    print(f"Logged in! Token: {token[:30]}...")

# Step 2: Send chat message
print("\nStep 2: Sending structured intake to chat...")
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
payload = {
    "structured_intake": {
        "incident": "murder",
        "location": "Delhi",
        "actions_taken": "None",
        "authority_response": "None",
        "next_steps": "Want to know my rights"
    }
}

chat_resp = requests.post(f"{BASE}/chat/message", json=payload, headers=headers, stream=True, timeout=120)
print(f"Chat response status: {chat_resp.status_code}")

if chat_resp.status_code == 200:
    print("\nStep 3: Reading streamed AI response...\n")
    for line in chat_resp.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            data_str = line[6:]
            try:
                data = json.loads(data_str)
                if data.get("chunk"):
                    print(data["chunk"], end="", flush=True)
                if data.get("error"):
                    print(f"\n\nERROR FROM AI: {data['error']}")
                if data.get("done"):
                    print(f"\n\n--- DONE! Session: {data.get('session_id')} ---")
                    print(f"Citations: {json.dumps(data.get('citations', []), indent=2)}")
            except:
                pass
else:
    print(f"Chat error ({chat_resp.status_code}): {chat_resp.text[:500]}")
