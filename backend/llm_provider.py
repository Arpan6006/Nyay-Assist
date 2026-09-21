import os
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

# Prioritized Groq models with high reliability and ultra-fast response
GROQ_CANDIDATE_MODELS: List[str] = [
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
]

_cached_groq_model: Optional[str] = None

def get_best_groq_model(groq_key: str) -> str:
    """Finds the best active model available on the Groq account."""
    global _cached_groq_model
    if _cached_groq_model:
        return _cached_groq_model

    env_model = os.environ.get("GROQ_MODEL")
    if env_model:
        _cached_groq_model = env_model
        return env_model

    try:
        from groq import Groq
        client = Groq(api_key=groq_key)
        available = {m.id for m in client.models.list().data}
        
        for candidate in GROQ_CANDIDATE_MODELS:
            if candidate in available:
                print(f"[NyayAssist] Selected Groq model: '{candidate}'")
                _cached_groq_model = candidate
                return candidate
        
        # Fallback to first available text model
        text_models = [m for m in available if "whisper" not in m and "guard" not in m and "compound" not in m]
        if text_models:
            _cached_groq_model = text_models[0]
            return _cached_groq_model
    except Exception as e:
        print(f"[NyayAssist] Groq model lookup note: {e}")

    _cached_groq_model = "openai/gpt-oss-20b"
    return _cached_groq_model


def get_llm(temperature: float = 0.2, max_tokens: int = 2000):
    """
    Returns the best available cloud LLM instance:
    1. Groq Cloud LPU (if GROQ_API_KEY is configured in .env) -> #1 Priority
    2. Google Gemini API (if GEMINI_API_KEY is configured in .env) -> #2 Priority
    """
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key and groq_key.strip():
        try:
            from langchain_groq import ChatGroq
            selected_model = get_best_groq_model(groq_key.strip())
            
            # Safe token limit for fast streaming and no timeouts
            safe_max_tokens = min(max_tokens, 2000)
            
            print(f"[NyayAssist] Initializing Groq LLM (Model: {selected_model}, max_tokens: {safe_max_tokens})")
            return ChatGroq(
                groq_api_key=groq_key.strip(),
                model_name=selected_model,
                temperature=temperature,
                max_tokens=safe_max_tokens,
                request_timeout=30,
                max_retries=3,
            )
        except Exception as e:
            print(f"[NyayAssist] Failed to initialize Groq: {e}, attempting Gemini fallback...")

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key and gemini_key.strip():
        try:
            from .gemini_models import get_best_gemini_model
            model_name = get_best_gemini_model(gemini_key.strip()) or "gemini-3-flash-preview"
            from langchain_google_genai import ChatGoogleGenerativeAI
            print(f"[NyayAssist] Initializing Gemini LLM (Model: {model_name})")
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=gemini_key.strip(),
                max_output_tokens=min(max_tokens, 2000),
                temperature=temperature,
            )
        except Exception as e:
            print(f"[NyayAssist] Failed to initialize Gemini: {e}")

    raise RuntimeError("No cloud LLM API key configured. Please add GROQ_API_KEY (from console.groq.com) or GEMINI_API_KEY (from aistudio.google.com) in your .env file.")
