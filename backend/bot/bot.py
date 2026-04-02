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

# In-memory stores
PENDING_EVENTS  = {}   # key → event details dict
EDITING_USERS   = {}   # user_id → event key (tracks who is in edit mode)


# ── API calls ────────────────────────────────────────────────────
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


# ── Image handler ────────────────────────────────────────────────
async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    logger.info(f"Image received from chat {chat_id}")
    photo      = update.message.photo[-1]
    file       = await context.bot.get_file(photo.file_id)
    image_path = os.path.join(TEMP_DIR, f"{photo.file_id}.jpg")
    await file.download_to_drive(image_path)

    # Message 1
    await update.message.reply_text("Processing image, please wait...")

    details = process_image(image_path)

    key = str(update.message.message_id)
    PENDING_EVENTS[key] = details
    logger.info(f"Stored event key: {key}")

    # Message 2 — extracted details + buttons
    await update.message.reply_text(
        build_reply(details),
        parse_mode="Markdown",
        reply_markup=build_keyboard(key)
    )

    try:
        if os.path.exists(image_path):
            os.remove(image_path)
    except Exception as e:
        logger.warning(f"Failed to delete temp image: {e}")


# ── Text handler ─────────────────────────────────────────────────
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text    = update.message.text.strip()

    if not text or len(text) < 2:
        return

    # ── Check if user is in edit mode ────────────────────────────
    if user_id in EDITING_USERS:
        key     = EDITING_USERS[user_id]
        details = PENDING_EVENTS.get(key)

        if not details:
            del EDITING_USERS[user_id]
            return

        # Parse "field: value"
        if ':' not in text:
            await update.message.reply_text(
                "Use format: `field: value`\n\n"
                "Example: `title: Codeathon 2026`\n\n"
                "Fields: `title` `date` `time` `venue` `deadline` `prize` `contact` `department` `team_size`",
                parse_mode="Markdown"
            )
            return

        field, value = text.split(':', 1)
        field = field.strip().lower()
        value = value.strip()

        allowed = {
            'title', 'date', 'time', 'venue', 'deadline',
            'prize', 'contact', 'department', 'team_size',
            'reg_link', 'summary'
        }

        if field not in allowed:
            await update.message.reply_text(
                f"Unknown field `{field}`.\n\n"
                f"Allowed: {', '.join(f'`{f}`' for f in sorted(allowed))}",
                parse_mode="Markdown"
            )
            return

        old_val = details.get(field) or 'empty'
        details[field] = value
        PENDING_EVENTS[key] = details
        del EDITING_USERS[user_id]

        logger.info(f"User {user_id} edited {field}: {old_val} → {value}")

        await update.message.reply_text(
            f"Updated *{field}*: `{value}`\n\nHere are the updated details:",
            parse_mode="Markdown"
        )
        await update.message.reply_text(
            build_reply(details),
            parse_mode="Markdown",
            reply_markup=build_keyboard(key)
        )
        return

    # ── Normal text message — extract event ──────────────────────
    if len(text) < 10:
        return

    logger.info(f"Text received: {text[:60]}...")
    details = process_text(text)

    key = str(update.message.message_id)
    PENDING_EVENTS[key] = details
    logger.info(f"Stored event key: {key}")

    await update.message.reply_text(
        build_reply(details),
        parse_mode="Markdown",
        reply_markup=build_keyboard(key)
    )


# ── Callback handler ─────────────────────────────────────────────
async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query   = update.callback_query
    user_id = update.effective_user.id
    await query.answer()

    data = query.data
    logger.info(f"Callback: {data} from user {user_id}")

    # ── Add to calendar ──────────────────────────────────────────
    if data.startswith("save_"):
        key     = data[5:]
        details = PENDING_EVENTS.get(key)

        if not details:
            await query.answer("Session expired. Please resend the image.", show_alert=True)
            return

        result = await save_event(details)

        # Keep message 2 text, just remove buttons
        await query.edit_message_reply_markup(reply_markup=None)

        # Message 3 — new separate message
        if "error" in result:
            if result.get("error") == "Duplicate event":
                await query.message.reply_text(
                    f"Already in calendar: *{details.get('title')}*",
                    parse_mode="Markdown"
                )
            else:
                await query.message.reply_text("Failed to save. Please try again.")
        else:
            await query.message.reply_text(
                f"Added to calendar!\n*{details.get('title')}* — {details.get('date') or 'No date'}",
                parse_mode="Markdown"
            )

        PENDING_EVENTS.pop(key, None)
        EDITING_USERS.pop(user_id, None)
        return

    # ── Edit details ─────────────────────────────────────────────
    if data.startswith("edit_"):
        key     = data[5:]
        details = PENDING_EVENTS.get(key)

        if not details:
            await query.answer("Session expired. Please resend the image.", show_alert=True)
            return

        EDITING_USERS[user_id] = key
        logger.info(f"User {user_id} entered edit mode for key {key}")
        await query.answer()

        fields_display = "\n".join([
            f"• `title` → {details.get('title') or 'empty'}",
            f"• `date` → {details.get('date') or 'empty'}",
            f"• `time` → {details.get('time') or 'empty'}",
            f"• `venue` → {details.get('venue') or 'empty'}",
            f"• `deadline` → {details.get('deadline') or 'empty'}",
            f"• `prize` → {details.get('prize') or 'empty'}",
            f"• `contact` → {details.get('contact') or 'empty'}",
            f"• `department` → {details.get('department') or 'empty'}",
            f"• `team_size` → {details.get('team_size') or 'empty'}",
            f"• `reg_link` → {details.get('reg_link') or 'empty'}",
            f"• `summary` → {details.get('summary') or 'empty'}",
        ])

        await query.message.reply_text(
            f"*Current event details:*\n{fields_display}\n\n"
            f"Reply with: `field: new value`\n"
            f"Example: `title: Codeathon 2026`",
            parse_mode="Markdown"
        )
        return

    # ── Discard ──────────────────────────────────────────────────
    if data.startswith("disc_"):
        key = data[5:]
        PENDING_EVENTS.pop(key, None)
        EDITING_USERS.pop(user_id, None)
        await query.edit_message_reply_markup(reply_markup=None)
        await query.message.reply_text("Event discarded.")
        return


# ── Subscribe command ────────────────────────────────────────────
async def handle_subscribe(update: Update, context: ContextTypes.DEFAULT_TYPE):
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


# ── Helpers ──────────────────────────────────────────────────────
def build_keyboard(key: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("Add to calendar", callback_data=f"save_{key}"),
        InlineKeyboardButton("Edit details",    callback_data=f"edit_{key}"),
        InlineKeyboardButton("Discard",         callback_data=f"disc_{key}"),
    ]])


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