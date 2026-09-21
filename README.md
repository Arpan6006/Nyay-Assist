# NyayAssist v2

NyayAssist is a local-first, privacy-first legal assistance platform for Indian citizens. It runs entirely on your local machine with zero internet data transmission during operation.

## Prerequisites

1. **Python 3.10+**: Ensure Python is installed and accessible via `python`.
2. **Node.js 18+**: Required to build the frontend. Ensure `node` and `npm` are installed.
3. **Tesseract OCR**: Required for Contract Analysis.
   - **Windows**: Download the installer from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki). Add the installation path (usually `C:\Program Files\Tesseract-OCR`) to your system's PATH environment variable.
   - **Ubuntu/Debian**: Run `sudo apt-get update && sudo apt-get install tesseract-ocr`.
4. **Ollama**: Required for local LLM inference.
   - Download and install from [ollama.com](https://ollama.com).
   - Once installed, open a terminal and run: `ollama run qwen2.5:7b` to pull and test the model.

## Setup Instructions

### 1. Document Drop Locations
Before running the application, please place the required PDF files in their respective directories:

*   **Corpus PDFs**: Place the official `bns.pdf`, `bnss.pdf`, and `bsa.pdf` files in the `backend/corpus/raw_pdfs/` directory.
*   **BPR&D Comparison PDFs**: Place the three comparison summary PDFs in the `backend/modules/blog/law_mapping/source_pdfs/` directory.

### 2. Initial Setup
Run the setup script to install dependencies and build the frontend (this only needs to be done once, or when dependencies change):

```bash
# Set up Python virtual environment and install backend requirements
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

pip install -r backend/requirements.txt

# Build the frontend (requires npm)
cd frontend
npm install
npm run build
cd ..
```

### 3. Generate Corpus & Index
Before using the chat or blog generation features, run the corpus generation script:
```bash
python backend/modules/legal_chat/build_corpus.py
# (Wait for indexer script instructions once implemented)
```

## Running the Application

To start the application, simply run the single entry point script from the root directory:

```bash
# Ensure your virtual environment is activated
python run.py
```

This will start the FastAPI server, which will also serve the static React frontend. Open your browser and navigate to `http://localhost:8000`.

## Architecture Note
This is a single-process application. The frontend is built into static assets served directly by FastAPI. No separate Node.js development server is required for runtime.
