import os
from pathlib import Path
from dotenv import load_dotenv

# Locate backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]  # go up TWO levels to reach backend/
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    def __init__(self):
        self.PROJECT_NAME: str = "AI Based Tender Evaluation"
        self.DATABASE_URL: str = os.getenv("DATABASE_URL")
        self.JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
        if not self.JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY not set in environment")
        self.JWT_ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

settings = Settings()
