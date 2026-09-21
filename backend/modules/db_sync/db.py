import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

def find_master_db() -> str:
    """Finds the master populated SQLite database across possible deployment directory depths."""
    base_dir = os.path.dirname(os.path.abspath(__file__)) # .../backend/modules/db_sync
    dir_modules = os.path.dirname(base_dir)              # .../backend/modules
    dir_backend = os.path.dirname(dir_modules)            # .../backend
    dir_root = os.path.dirname(dir_backend)               # .../root

    candidates = [
        os.path.join(dir_backend, "data", "nyayassist.db"),
        os.path.join(dir_root, "data", "nyayassist.db"),
        os.path.join(dir_root, "backend", "data", "nyayassist.db"),
        os.path.join(dir_modules, "data", "nyayassist.db"),
        os.path.abspath("backend/data/nyayassist.db"),
        os.path.abspath("data/nyayassist.db"),
    ]

    for p in candidates:
        if os.path.exists(p) and os.path.getsize(p) > 10000:
            print(f"[NyayAssist] Found master seed database at: {p} ({os.path.getsize(p)} bytes)")
            return p

    for p in candidates:
        if os.path.exists(p):
            return p

    return os.path.join(dir_backend, "data", "nyayassist.db")

# In serverless environments like Vercel/AWS Lambda, root filesystem is read-only.
# We copy SQLite database to /tmp if running on Vercel/Lambda so write operations succeed.
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_DIR = "/tmp/nyayassist_data"
    os.makedirs(DB_DIR, exist_ok=True)
    target_db = os.path.join(DB_DIR, "nyayassist.db")
    
    master_db = find_master_db()
    if os.path.exists(master_db):
        # Copy if target doesn't exist or is smaller than master seed db
        if not os.path.exists(target_db) or os.path.getsize(target_db) < 10000:
            try:
                shutil.copy2(master_db, target_db)
                print(f"[NyayAssist] Copied {master_db} to {target_db}")
            except Exception as e:
                print(f"[NyayAssist] Database copy error: {e}")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{target_db}"
else:
    chosen_db = find_master_db()
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{chosen_db}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
