import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# In serverless environments like Vercel/AWS Lambda, root filesystem is read-only.
# We copy SQLite database to /tmp if running on Vercel/Lambda so write operations succeed.
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_DIR = "/tmp/nyayassist_data"
    os.makedirs(DB_DIR, exist_ok=True)
    target_db = os.path.join(DB_DIR, "nyayassist.db")
    source_db = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "nyayassist.db")
    if not os.path.exists(target_db) and os.path.exists(source_db):
        try:
            shutil.copy2(source_db, target_db)
        except Exception:
            pass
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{target_db}"
else:
    DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    os.makedirs(DB_DIR, exist_ok=True)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'nyayassist.db')}"

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

