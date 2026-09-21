import os
import requests
import json
from typing import Optional, List
from langchain_google_genai import ChatGoogleGenerativeAI

# Prioritized list of Gemini Flash and Pro models
CANDIDATE_MODELS: List[str] = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-pro-latest",
    "gemini-1.5-flash",
]

_cached_model: Optional[str] = None
_blacklisted_models: set = set()

def get_best_gemini_model(api_key: Optional[str] = None) -> Optional[str]:
    """
    Finds and verifies the best working Gemini Flash/Pro model for the given API key.
    Sends a lightweight probe to ensure the model responds with 200 OK.
    """
    global _cached_model, _blacklisted_models
    
    if _cached_model and _cached_model not in _blacklisted_models:
        return _cached_model

    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    # Check for user-defined model override in .env
    env_model = os.environ.get("GEMINI_MODEL")
    candidates = []
    if env_model and env_model not in _blacklisted_models:
        candidates.append(env_model)
    
    for m in CANDIDATE_MODELS:
        if m not in candidates and m not in _blacklisted_models:
            candidates.append(m)

    for model_name in candidates:
        try:
            test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {"contents": [{"parts": [{"text": "ping"}]}]}
            resp = requests.post(test_url, json=payload, timeout=5)
            
            if resp.status_code == 200:
                print(f"[NyayAssist] Verified working Gemini model: '{model_name}'")
                _cached_model = model_name
                return model_name
            else:
                err = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                print(f"[NyayAssist] Model '{model_name}' unavailable ({resp.status_code}): {err[:100]}")
                _blacklisted_models.add(model_name)
        except Exception as e:
            print(f"[NyayAssist] Model '{model_name}' timeout/error: {e}")
            _blacklisted_models.add(model_name)

    # Fallback to gemini-3.6-flash if all tests failed
    _cached_model = "gemini-3.6-flash"
    return _cached_model

def blacklist_current_model(model_name: Optional[str] = None):
    """Blacklists a model upon runtime error and invalidates cache for instant failover."""
    global _cached_model, _blacklisted_models
    target = model_name or _cached_model
    if target:
        print(f"[NyayAssist] Blacklisting model '{target}' due to error.")
        _blacklisted_models.add(target)
    _cached_model = None

def get_gemini_llm(
    api_key: Optional[str] = None, 
    model_name: Optional[str] = None,
    max_output_tokens: int = 4000,
    temperature: float = 0.2
) -> ChatGoogleGenerativeAI:
    """Returns an initialized ChatGoogleGenerativeAI instance."""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing.")

    selected_model = model_name or get_best_gemini_model(api_key)
    return ChatGoogleGenerativeAI(
        model=selected_model,
        google_api_key=api_key,
        max_output_tokens=max_output_tokens,
        temperature=temperature,
    )
