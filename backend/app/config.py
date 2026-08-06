from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ORS_API_KEY: str = ""
    FIREBASE_CREDENTIALS: str = "firebase/serviceAccountKey.json"

    class Config:
        env_file = ".env"

settings = Settings()