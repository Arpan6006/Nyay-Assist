import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

# Step 1: List all models that support generateContent
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
r = requests.get(url, timeout=10)
models_data = r.json().get("models", [])

candidates = []
for m in models_data:
    methods = m.get("supportedGenerationMethods", [])
    name = m.get("name", "").replace("models/", "")
    if "generateContent" in methods and "gemini" in name:
        # Skip embedding, tts, transcribe, robotics, computer-use, image, audio, native-audio, live models
        skip_keywords = ["embedding", "tts", "transcribe", "robotics", "computer-use", "image", "audio", "live", "omni"]
        if any(kw in name for kw in skip_keywords):
            continue
        candidates.append(name)

print(f"Candidate text models: {candidates}")

# Step 2: Try each one starting from newest (3.x) down
# Sort to prefer higher version numbers
import re
def version_key(name):
    match = re.search(r'gemini-(\d+\.?\d*)', name)
    if match:
        return -float(match.group(1))  # negative so highest sorts first
    return 0

candidates.sort(key=version_key)
print(f"\nSorted candidates (newest first): {candidates}")

# Step 3: Actually test each one
for model_name in candidates:
    print(f"\nTesting {model_name}...")
    try:
        test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {"contents": [{"parts": [{"text": "Say hello in one word"}]}]}
        resp = requests.post(test_url, json=payload, timeout=15)
        if resp.status_code == 200:
            result = resp.json()
            text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            print(f"  --> SUCCESS! Response: {text[:100]}")
            print(f"\n*** WORKING MODEL FOUND: {model_name} ***")
            break
        else:
            error = resp.json().get("error", {}).get("message", "Unknown error")
            print(f"  --> FAILED ({resp.status_code}): {error[:150]}")
    except Exception as e:
        print(f"  --> ERROR: {str(e)}")
else:
    print("\n*** NO WORKING MODEL FOUND ***")
