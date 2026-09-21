# NyayAssist: AI-Powered Legal Enablement & Statutory Assistance Platform

**NyayAssist** is an enterprise-grade LegalTech platform designed for Indian citizens and advocates. It demystifies the new **Bharatiya Nyaya Sanhita (BNS 2023)**, **BNSS 2023**, and **BSA 2023**, providing intelligent legal consultation, automated court document generation, contract risk analysis, and advocate directory workflows powered by ultra-fast cloud LLM inference.

---

## 🚀 Key Features

* **⚖️ Legal Consultation & Voice FIR Assistant**: Multilingual speech-to-text FIR drafter and RAG-grounded statutory legal advice.
* **📄 Automated Document Studio**: Generate court-ready pleadings, rental agreements, NDAs, legal notices, and multi-page vector PDFs.
* **🔍 Contract & Agreement Risk Analyzer**: Automated clause risk scoring, liability audit, and redline suggestions for contracts and agreements.
* **👨‍⚖️ Lawyer Directory & AI Pre-Consultation Dossier**: Connect with verified advocates and 1-click generate structured, court-ready client dossiers.
* **📚 Legal Blog & Statutory Law Mapper**: Plain-language legal guides and IPC $\leftrightarrow$ BNS section conversion with an adjacent interactive AI assistant.
* **🛡️ Advocate Portal & Admin Console**: Certificate of Practice (COP) verification for legal professionals.

---

## 📋 Prerequisites

1. **Python 3.10 to 3.12**: Ensure Python is installed and accessible via `python`.
2. **Node.js 18+**: Required to build the frontend (`node` and `npm`).
3. **Free Cloud AI API Key** *(Any one of the following)*:
   * **Groq Cloud API Key** (*Recommended for ~300 tokens/sec speed*): Get free from [console.groq.com](https://console.groq.com)
   * **Google Gemini API Key**: Get free from [aistudio.google.com](https://aistudio.google.com)

---

## 🛠️ Installation & Setup

### 1. Configure Environment Variables
Create a `.env` file in the project root directory with your API keys:

```env
# AI Provider Keys (Free tier)
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=AIzaSy_your_gemini_key_here

# Security & Admin Secrets
SECRET_KEY=nyayassist_super_secure_jwt_secret_key_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
NYAYASSIST_ADMIN_PWD=admin123
```

### 2. Install Dependencies & Build Frontend

```bash
# 1. Setup Python virtual environment
python -m venv venv

# Activate on Windows:
venv\Scripts\activate
# Activate on Linux/Mac:
# source venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Install frontend dependencies and build static assets
cd frontend
npm install
npm run build
cd ..
```

---

## ▶️ Running the Application

Start the unified server by running:

```bash
python run.py
```

* **Application URL**: Open **`http://localhost:8000`** in your browser.
* **FastAPI Interactive Docs**: Accessible at **`http://localhost:8000/docs`**.

> **Note for Development**: If you are actively editing frontend React files, you can also run `npm run dev` inside `frontend/` to run Vite on `http://localhost:5173`.

---

## 🏗️ Architecture & Technology Stack

* **Frontend**: React 18, TypeScript, TailwindCSS, Lucide Icons, `html2pdf.js`.
* **Backend**: FastAPI (Python), Uvicorn ASGI, Pydantic, SQLAlchemy ORM.
* **Database**: Embedded SQLite (`backend/data/nyayassist.db`) and FAISS vector store.
* **AI Orchestration**: LangChain, Groq Cloud LPU (LLaMA 3.3 / Qwen / GPT-OSS), and Google Gemini Flash fallback.
