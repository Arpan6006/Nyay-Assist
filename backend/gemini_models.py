import os
import requests
import json
from typing import Optional, List, Any
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatResult, ChatGeneration

# Prioritized list of Gemini Flash and Pro models
CANDIDATE_MODELS: List[str] = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-flash-latest",
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
            print(f"[NyayAssist] Probe failed for '{model_name}': {e}")
            _blacklisted_models.add(model_name)

    return "gemini-2.5-flash"


class GeminiRESTChat(BaseChatModel):
    """
    Ultra-lightweight Gemini Chat Model using direct Google REST API.
    Replaces 400MB+ of grpcio and google-api-python-client dependencies.
    """
    model_name: str = "gemini-2.5-flash"
    google_api_key: str = ""
    temperature: float = 0.2
    max_output_tokens: int = 2000

    def _generate(self, messages: List[Any], stop: Optional[List[str]] = None, run_manager: Any = None, **kwargs) -> ChatResult:
        contents = []
        system_instruction = None

        for m in messages:
            if isinstance(m, SystemMessage):
                system_instruction = {"parts": [{"text": str(m.content)}]}
            elif isinstance(m, HumanMessage):
                contents.append({"role": "user", "parts": [{"text": str(m.content)}]})
            elif isinstance(m, AIMessage):
                contents.append({"role": "model", "parts": [{"text": str(m.content)}]})
            elif isinstance(m, str):
                contents.append({"role": "user", "parts": [{"text": m}]})
            elif hasattr(m, "content"):
                role = "user" if getattr(m, "type", "") == "human" else "model"
                contents.append({"role": role, "parts": [{"text": str(m.content)}]})
            else:
                contents.append({"role": "user", "parts": [{"text": str(m)}]})

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.google_api_key}"
        body: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": self.max_output_tokens,
            }
        }
        if system_instruction:
            body["systemInstruction"] = system_instruction

        resp = requests.post(url, json=body, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        text = ""
        try:
            candidates = data.get("candidates", [])
            if candidates:
                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception:
            text = ""

        message = AIMessage(content=text)
        return ChatResult(generations=[ChatGeneration(message=message)])

    @property
    def _llm_type(self) -> str:
        return "gemini-rest"
