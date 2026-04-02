import os
from dotenv import load_dotenv

# Load .env from root of project
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

BOT_TOKEN = os.getenv("BOT_TOKEN")
GROUP_CHAT_ID = os.getenv("GROUP_CHAT_ID")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN not found in .env file")
if not GROUP_CHAT_ID:
    raise ValueError("GROUP_CHAT_ID not found in .env file")