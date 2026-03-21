import os
import logging
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    MessageHandler,
    ContextTypes,
    filters,
)
from config import BOT_TOKEN, GROUP_CHAT_ID
from ocr import process_image, process_text

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_images")
os.makedirs(TEMP_DIR, exist_ok=True)


async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    if chat_id != GROUP_CHAT_ID:
        return

    logger.info(f"Image received from chat {chat_id}")
    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    image_path = os.path.join(TEMP_DIR, f"{photo.file_id}.jpg")
    await file.download_to_drive(image_path)
    logger.info(f"Image saved to {image_path}")

    # Process image
    await update.message.reply_text("🔍 Processing image, please wait...")
    details = process_image(image_path)
    
    # Reply with formatted details
    reply = build_reply(details)
    await update.message.reply_text(reply, parse_mode="Markdown")
    
    # Clean up the downloaded temporary image
    try:
        if os.path.exists(image_path):
            os.remove(image_path)
    except Exception as e:
        logger.warning(f"Failed to delete temp image {image_path}: {e}")


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    if chat_id != GROUP_CHAT_ID:
        return

    text = update.message.text
    if not text or len(text.strip()) < 10:
        return

    logger.info(f"Text received: {text[:60]}...")
    details = process_text(text)
    reply = build_reply(details)
    await update.message.reply_text(reply, parse_mode="Markdown")


def build_reply(details: dict) -> str:
    lines = ["📌 *Kalnirnay — Event Detected*\n"]

    def add(label, key, emoji=""):
        val = details.get(key)
        if val:
            lines.append(f"{emoji}*{label}:* {val}")

    add("Title",       "title",      "🎯 ")
    add("Date",        "date",       "📅 ")
    add("Time",        "time",       "⏰ ")
    add("Venue",       "venue",      "📍 ")
    add("Department",  "department", "🏫 ")
    add("Event Head",  "event_head", "👤 ")
    add("Deadline",    "deadline",   "⚠️ ")
    add("Prize",       "prize",      "🏆 ")
    add("Team Size",   "team_size",  "👥 ")
    add("Register",    "reg_link",   "🔗 ")

    domains = details.get("domains")
    if set(domains if domains else []) - {None}:
        lines.append(f"🧩 *Domains:* {', '.join(domains)}")

    summary = details.get("summary")
    if summary:
        lines.append(f"\n📝 *Summary:*\n_{summary}_")

    if not details.get("date"):
        lines.append("\n📅 *Date:* Not detected")

    lines.append("\n_Saved to Kalnirnay calendar._")
    return "\n".join(lines)


def main():
    logger.info("Starting Kalnirnay bot...")
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    logger.info("Bot is polling... Send a message or image to your group!")
    app.run_polling()


if __name__ == "__main__":
    main()