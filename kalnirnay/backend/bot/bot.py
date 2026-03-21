import os
import logging
import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from config import BOT_TOKEN, GROUP_CHAT_ID
from ocr import process_image, process_text

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_images")
os.makedirs(TEMP_DIR, exist_ok=True)

API_URL = "http://localhost:3000"

# Simple in-memory store — persists for the whole bot session
PENDING_EVENTS = {}


# ── Save event to Express API ────────────────────────────────────
async def save_event(details: dict) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/events",
                json=details,
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logger.error(f"Failed to save event: {e}")
        return {"error": str(e)}


# ── Subscribe user ────────────────────────────────────────────────
async def subscribe_user(telegram_id: str, username: str) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/subscriptions",
                json={"telegram_id": telegram_id, "username": username},
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logger.error(f"Failed to subscribe: {e}")
        return {"error": str(e)}


# ── Handlers ─────────────────────────────────────────────────────

async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    if chat_id != GROUP_CHAT_ID:
        return

    logger.info(f"Image received from chat {chat_id}")
    photo      = update.message.photo[-1]
    file       = await context.bot.get_file(photo.file_id)
    image_path = os.path.join(TEMP_DIR, f"{photo.file_id}.jpg")
    await file.download_to_drive(image_path)

    await update.message.reply_text("Processing image, please wait...")
    details = process_image(image_path)
    reply   = build_reply(details)

    # Use message_id as key — simple and unique
    key = str(update.message.message_id)
    PENDING_EVENTS[key] = details
    logger.info(f"Stored event with key: {key}, total pending: {len(PENDING_EVENTS)}")

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("Save to calendar", callback_data=f"save_{key}"),
        InlineKeyboardButton("Discard", callback_data=f"disc_{key}")
    ]])

    await update.message.reply_text(reply, parse_mode="Markdown", reply_markup=keyboard)

    try:
        if os.path.exists(image_path):
            os.remove(image_path)
    except Exception as e:
        logger.warning(f"Failed to delete temp image: {e}")


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    if chat_id != GROUP_CHAT_ID:
        return
    text = update.message.text
    if not text or len(text.strip()) < 10:
        return

    logger.info(f"Text received: {text[:60]}...")
    details = process_text(text)
    reply   = build_reply(details)

    key = str(update.message.message_id)
    PENDING_EVENTS[key] = details
    logger.info(f"Stored event with key: {key}, total pending: {len(PENDING_EVENTS)}")

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("Save to calendar", callback_data=f"save_{key}"),
        InlineKeyboardButton("Discard", callback_data=f"disc_{key}")
    ]])

    await update.message.reply_text(reply, parse_mode="Markdown", reply_markup=keyboard)


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle Save / Discard button presses."""
    query = update.callback_query
    await query.answer()

    data = query.data
    logger.info(f"Callback received: {data}")
    logger.info(f"Pending events keys: {list(PENDING_EVENTS.keys())}")

    # Discard
    if data.startswith("disc_"):
        key = data[5:]
        PENDING_EVENTS.pop(key, None)
        await query.edit_message_text("Discarded. Event not saved.")
        return

    # Save
    if data.startswith("save_"):
        key     = data[5:]
        details = PENDING_EVENTS.get(key)

        logger.info(f"Looking for key: {key}, found: {details is not None}")

        if not details:
            await query.edit_message_text(
                "Could not find event data. Please resend the image or message."
            )
            return

        result = await save_event(details)

        if "error" in result:
            if result.get("error") == "Duplicate event":
                await query.edit_message_text(
                    f"Already in calendar: *{details.get('title')}*",
                    parse_mode="Markdown"
                )
            else:
                await query.edit_message_text(f"Failed to save: {result['error']}")
        else:
            await query.edit_message_text(
                f"Saved to Kalnirnay calendar!\n\n"
                f"*{details.get('title')}*\n"
                f"Date: {details.get('date') or 'Not detected'}",
                parse_mode="Markdown"
            )

        PENDING_EVENTS.pop(key, None)


async def handle_subscribe(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/subscribe command — opt in to event reminders."""
    user        = update.effective_user
    telegram_id = str(user.id)
    username    = user.username or user.first_name
    result      = await subscribe_user(telegram_id, username)

    if "error" in result:
        await update.message.reply_text("Failed to subscribe. Please try again.")
    else:
        await update.message.reply_text(
            "You are now subscribed to Kalnirnay notifications! "
            "You will receive reminders for upcoming events."
        )


# ── Reply builder ─────────────────────────────────────────────────
def build_reply(details: dict) -> str:
    lines = ["*Kalnirnay — Event Detected*\n"]

    def add(label, key):
        val = details.get(key)
        if val:
            lines.append(f"*{label}:* {val}")

    add("Title",      "title")
    add("Date",       "date")
    add("Time",       "time")
    add("Venue",      "venue")
    add("Department", "department")
    add("Deadline",   "deadline")
    add("Prize Pool", "prize")
    add("Team Size",  "team_size")
    add("Register",   "reg_link")
    add("Contact",    "contact")

    domains = details.get("domains")
    if domains:
        lines.append(f"*Domains:* {', '.join(domains)}")

    summary = details.get("summary")
    if summary:
        lines.append(f"\n*Summary:*\n_{summary}_")

    if not details.get("date"):
        lines.append("*Date:* Not detected")

    return "\n".join(lines)


# ── Main ─────────────────────────────────────────────────────────
def main():
    logger.info("Starting Kalnirnay bot...")
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.Command("subscribe"), handle_subscribe))
    logger.info("Bot is polling... Send a message or image to your group!")
    app.run_polling()


if __name__ == "__main__":
    main()