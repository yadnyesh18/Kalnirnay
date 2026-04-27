import os
from dotenv import load_dotenv

# Load .env from root of project (local dev), Railway injects env vars directly
_env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
if os.path.exists(_env_path):
    load_dotenv(dotenv_path=_env_path)

BOT_TOKEN = os.getenv("BOT_TOKEN")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN not found in environment")