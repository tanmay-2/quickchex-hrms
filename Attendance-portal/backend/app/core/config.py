import os
import secrets
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
IS_PRODUCTION = APP_ENV in {"prod", "production"}
DATABASE_URL = os.getenv("DATABASE_URL", "")
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if IS_PRODUCTION and (
    len(SECRET_KEY) < 32
    or any(marker in SECRET_KEY.lower() for marker in ("change-this", "replace_with", "your_secret"))
):
    raise RuntimeError("Production requires SECRET_KEY to be a unique random value of at least 32 characters.")
if not SECRET_KEY:
    # Keep local development self-contained without a weak committed secret.
    # Tokens are invalidated when the development process restarts.
    SECRET_KEY = secrets.token_urlsafe(48)
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
