import uvicorn
import os

# Limit CPU thread usage to prevent rapid heating (forces tools to use fewer cores or shift to integrated graphics if available via backend tools)
os.environ["OMP_THREAD_LIMIT"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"

if __name__ == "__main__":
    # Ensure frontend/dist exists, otherwise the server will crash trying to serve it.
    if not os.path.exists(os.path.join("frontend", "dist")):
        print("WARNING: frontend/dist not found. Please run 'npm run build' in the frontend directory.")
        # Create a dummy index.html to prevent crash on startup if not built yet
        os.makedirs(os.path.join("frontend", "dist"), exist_ok=True)
        with open(os.path.join("frontend", "dist", "index.html"), "w") as f:
            f.write("<html><body><h1>NyayAssist Frontend Not Built</h1><p>Run 'npm run build' in the frontend directory.</p></body></html>")
    
    # Run the FastAPI app via uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
