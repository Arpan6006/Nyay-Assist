from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from backend.modules.auth.router import router as auth_router
from backend.modules.lawyer_directory.router import router as lawyer_dir_router
from backend.modules.lawyer_portal.router import router as lawyer_portal_router
from backend.modules.document_generator.router import router as doc_gen_router
from backend.modules.contract_analyzer.router import router as contract_router
from backend.modules.legal_chat.router import router as chat_router
from backend.modules.blog.router import router as blog_router
from backend.modules.admin.router import router as admin_router
from backend.modules.support.router import router as support_router

app = FastAPI(title="NyayAssist v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router, prefix="/api")
app.include_router(lawyer_dir_router, prefix="/api")
app.include_router(lawyer_portal_router, prefix="/api")
app.include_router(doc_gen_router, prefix="/api")
app.include_router(contract_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(blog_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(support_router, prefix="/api")

# Mount the React frontend static files. 
# This must be the last route so it acts as a catch-all for the SPA.
dist_path = os.path.join("frontend", "dist")
if os.path.exists(dist_path):
    # Mount the assets directory specifically
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    # Catch-all route to serve the React SPA index.html
    from fastapi.responses import FileResponse
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve specific files from dist root if they exist (like favicon.svg)
        potential_file = os.path.join(dist_path, full_path)
        if full_path and os.path.exists(potential_file) and os.path.isfile(potential_file):
            return FileResponse(potential_file)
        # Otherwise serve index.html for SPA routing
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    print(f"Warning: {dist_path} does not exist. Frontend will not be served.")
