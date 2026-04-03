import os
import logging
import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from config import BOT_TOKEN
from ocr import process_image, process_text

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_images")
os.makedirs(TEMP_DIR, exist_ok=True)

API_URL = "http://localhost:3000"

# In-memory stores
PENDING_EVENTS = {}
EDITING_USERS  = {}

MIN_EVENT_WORDS = 8

IGNORE_TRIGGERS = {
    'ignore', '#ignore', 'skip', '#skip', 'notanevent', '#notanevent'
}

EVENT_KEYWORDS = [
    'hackathon', 'workshop', 'seminar', 'webinar', 'competition',
    'contest', 'event', 'deadline', 'register', 'registration',
    'submission', 'fest', 'techfest', 'symposium', 'conference',
    'march', 'april', 'may', 'june', 'july', 'august', 'september',
    'october', 'november', 'december', 'january', 'february',
    'prize', 'cash', 'venue', 'date', 'time', 'team', 'participate',
    'eligibility', 'certificate', 'internship', 'opportunity'
]


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


async def subscribe_user(telegram_id: str, username: str, group_id: str = None) -> dict:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/subscriptions",
                json={"telegram_id": telegram_id, "username": username, "group_id": group_id},
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logger.error(f"Failed to subscribe: {e}")
        return {"error": str(e)}


# ── Helpers ──────────────────────────────────────────────────────
def should_ignore(text: str) -> bool:
    text_lower = text.lower()
    words = set(text_lower.split())
    for trigger in IGNORE_TRIGGERS:
        if trigger in words or trigger in text_lower:
            return True
    return False


def is_event_message(text: str) -> bool:
    words = text.strip().split()
    if len(words) < MIN_EVENT_WORDS:
        return False
    text_lower = text.lower()
    matches = sum(1 for kw in EVENT_KEYWORDS if kw in text_lower)
    return matches >= 2


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


# ── Image handler ────────────────────────────────────────────────
async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)

    caption = update.message.caption or ""
    if should_ignore(caption):
        return

    photo      = update.message.photo[-1]
    file       = await context.bot.get_file(photo.file_id)
    image_path = os.path.join(TEMP_DIR, f"{photo.file_id}.jpg")
    await file.download_to_drive(image_path)

    await update.message.reply_text("Processing image, please wait...")

    details = process_image(image_path)
    details["group_id"] = chat_id

    raw_text = details.get("raw_text", "")
    if should_ignore(raw_text):
        await update.message.reply_text("Ignored.")
        if os.path.exists(image_path):
            os.remove(image_path)
        return

    key = str(update.message.message_id)
    PENDING_EVENTS[key] = details

    await update.message.reply_text(
        build_reply(details),
        parse_mode="Markdown",
        reply_markup=build_keyboard(key)
    )

    if os.path.exists(image_path):
        os.remove(image_path)


# ── Text handler ─────────────────────────────────────────────────
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    user_id = update.effective_user.id
    text    = update.message.text.strip() if update.message.text else ""

    if not text:
        return

    # ── EDIT MODE ───────────────────────────────────────────────
    if user_id in EDITING_USERS:
        key     = EDITING_USERS[user_id]
        details = PENDING_EVENTS.get(key)

        if not details:
            del EDITING_USERS[user_id]
            return

        lines = text.split('\n')
        allowed = {
            'title', 'date', 'time', 'venue', 'deadline',
            'prize', 'contact', 'department', 'team_size',
            'reg_link', 'summary', 'domains'
        }

        updated_any = False

        for line in lines:
            if ':' not in line:
                continue
            field, value = line.split(':', 1)
            field = field.strip().lower()
            value = value.strip()

            if field in allowed:
                details[field] = value
                updated_any = True

        if not updated_any:
            await update.message.reply_text(
                "No valid fields found. Please ensure you use the format `field: value`.",
                parse_mode="Markdown"
            )
            return

        PENDING_EVENTS[key] = details
        del EDITING_USERS[user_id]

        await update.message.reply_text(
            "✅ *Event details updated!*\n\nHere is the updated event:",
            parse_mode="Markdown"
        )

        await update.message.reply_text(
            build_reply(details),
            parse_mode="Markdown",
            reply_markup=build_keyboard(key)
        )
        return

    if should_ignore(text):
        return

    if not is_event_message(text):
        return

    await update.message.reply_text("Analysing message, please wait...")

    details = process_text(text)
    details["group_id"] = chat_id

    raw_text = details.get("raw_text", "")
    if should_ignore(raw_text):
        return

    key = str(update.message.message_id)
    PENDING_EVENTS[key] = details

    await update.message.reply_text(
        build_reply(details),
        parse_mode="Markdown",
        reply_markup=build_keyboard(key)
    )


# ── Join Command Handler ───────────────────────────────────────────
async def handle_join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    user_id = update.effective_user.id
    username = update.effective_user.username or str(user_id)
    
    res = await subscribe_user(str(user_id), username, chat_id)
    if "error" in res:
        await update.message.reply_text("Failed to link group to your account. Ensure backend is running.")
    else:
        await update.message.reply_text(f"Successfully linked @{username} to this group's calendar!")

# ── Callback handler ─────────────────────────────────────────────
async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query   = update.callback_query
    user_id = update.effective_user.id
    data = query.data

    # ── SAVE ────────────────────────────────────────────────────
    if data.startswith("save_"):
        key     = data[5:]
        details = PENDING_EVENTS.get(key)

        if not details:
            await query.answer("Session expired.", show_alert=True)
            return

        result = await save_event(details)

        await query.edit_message_reply_markup(reply_markup=None)

        if "error" in result:
            await query.message.reply_text("Failed to save.")
        else:
            await query.message.reply_text("Added to calendar!")

        PENDING_EVENTS.pop(key, None)
        EDITING_USERS.pop(user_id, None)
        return

    # ── EDIT (UPDATED BLOCK-EDIT) ───────────────────────────────
    if data.startswith("edit_"):
        key     = data[5:]
        details = PENDING_EVENTS.get(key)

        if not details:
            await query.answer("Session expired.", show_alert=True)
            return

        EDITING_USERS[user_id] = key
        await query.answer()

        DISPLAY_FIELDS = [
            'title','date','time','venue','department','deadline',
            'prize','team_size','reg_link','contact','domains','summary'
        ]

        extracted_lines = []
        for field in DISPLAY_FIELDS:
            val = details.get(field)
            if val:
                display_val = ', '.join(val) if isinstance(val, list) else str(val)
                extracted_lines.append(f"{field}: {display_val}")

        edit_textblock = '\n'.join(extracted_lines)

        await query.message.reply_text(
            "👇 *Tap the block below to copy all details instantly.*\n"
            "Then simply paste it into your typing area, make your changes, and send it back to me!\n\n"
            f"```text\n{edit_textblock}\n```",
            parse_mode="Markdown"
        )
        return

    # ── DISCARD ─────────────────────────────────────────────────
    if data.startswith("disc_"):
        key = data[5:]
        PENDING_EVENTS.pop(key, None)
        EDITING_USERS.pop(user_id, None)
        await query.edit_message_reply_markup(reply_markup=None)
        await query.message.reply_text("Event discarded.")
        return


# ── Main ─────────────────────────────────────────────────────────
def main():
    from telegram.ext import CommandHandler
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("join", handle_join))
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_callback))

    app.run_polling()


if __name__ == "__main__":
    main()