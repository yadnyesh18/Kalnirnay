import os
from dotenv import load_dotenv

_env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
if os.path.exists(_env_path):
    load_dotenv(dotenv_path=_env_path)

BOT_TOKEN      = os.getenv("BOT_TOKEN")
SUPABASE_URL   = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
API_URL        = os.getenv("API_URL", "http://localhost:3000").rstrip("/")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN not found in environment")
if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL or SUPABASE_ANON_KEY not found in environment")