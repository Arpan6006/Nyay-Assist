import traceback
from backend.modules.db_sync.db import SessionLocal
from backend.modules.auth.router import register, UserCreate

def test_register():
    db = SessionLocal()
    try:
        user = UserCreate(email='test500_3@gmail.com', password='password')
        register(user_data=user, db=db)
        print("SUCCESS")
    except Exception as e:
        print("ERROR:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_register()
