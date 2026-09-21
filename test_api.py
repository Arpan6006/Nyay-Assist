import os
from dotenv import load_dotenv
import requests

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
r = requests.get(url)
models = r.json().get("models", [])
print(f"Total models: {len(models)}")
for m in models:
    print(m["name"])
