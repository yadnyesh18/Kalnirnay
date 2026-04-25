import os
import re
import logging
import httpx
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from config import BOT_TOKEN
from ocr import process_image, process_text, is_informational, extract_message_details, classify_message

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
    'eligibility', 'certificate', 'internship', 'opportunity',
    # Academic triggers
    'assignment', 'timetable', 'schedule', 'lecture', 'lab',
    'batch', 'exam', 'assessment', 'oral', 'practical',
    'tomorrow', 'today', 'please note', 'kindly note',
    'extra lab', 'file correction', 'attendance'
]

# Category label mapping for reply messages
CATEGORY_LABEL = {
    'event': '[EVENT]',
    'exam': '[EXAM]',
    'assignment': '[ASSIGNMENT]',
    'lab': '[LAB]',
    'timetable': '[TIMETABLE]',
    'notice': '[NOTICE]',
}



# ── Date helpers ─────────────────────────────────────────────────
def normalize_date(date_str: str) -> str:
    """Convert 'DD MM YYYY' or 'DD-MM-YYYY' to 'YYYY-MM-DD' for database storage."""
    if not date_str:
        return date_str
    date_str = date_str.strip()
    for fmt in ("%d %m %Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str  # return as-is if no format matched


def display_date(date_str: str) -> str:
    """Convert any date to 'DD-MM-YYYY' for display in bot messages."""
    if not date_str:
        return date_str
    date_str = date_str.strip()
    for fmt in ("%Y-%m-%d", "%d %m %Y", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return date_str


def split_date_range(date_str: str) -> list:
    """Split 'DD MM YYYY to DD MM YYYY' into a list of normalized dates.
    If single date, returns a list with one element."""
    if not date_str:
        return [None]
    # Match 'DD MM YYYY to DD MM YYYY' pattern
    m = re.match(r'^(.+?)\s+to\s+(.+?)$', date_str.strip(), re.IGNORECASE)
    if m:
        d1 = normalize_date(m.group(1).strip())
        d2 = normalize_date(m.group(2).strip())
        if d1 and d2 and d1 != d2:
            return [d1, d2]
        return [d1]
    return [normalize_date(date_str)]


async def save_event(details: dict) -> dict:
    """Save event(s) to backend. If date is a range, saves one event per date."""
    date_raw = details.get("date", "")
    dates = split_date_range(date_raw)

    results = []
    for d in dates:
        event_copy = dict(details)
        event_copy["date"] = d
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_URL}/events",
                    json=event_copy,
                    timeout=10.0
                )
                results.append(response.json())
        except Exception as e:
            logger.error(f"Failed to save event: {e}")
            results.append({"error": str(e)})

    # If only one date, return its result directly
    if len(results) == 1:
        return results[0]
    # If multi-day, return a combined result
    errors = [r for r in results if "error" in r]
    if errors and len(errors) == len(results):
        return errors[0]  # all failed
    return {"message": f"Event saved on {len(results)} dates", "results": results}


async def register_group(group_id: str, group_name: str) -> dict:
    """Upsert group info into the groups table."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/groups",
                json={"group_id": group_id, "group_name": group_name},
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logger.error(f"Failed to register group: {e}")
        return {"error": str(e)}


async def subscribe_user(telegram_id: str, username: str, group_id: str = None, group_name: str = None) -> dict:
    try:
        # If we have group info, register it first
        if group_id and group_name:
            await register_group(group_id, group_name)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/users",
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
    if matches >= 2:
        return True
    # Also check via the smart text parser
    return is_informational(text)


def build_keyboard(key: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("Add to calendar", callback_data=f"save_{key}"),
        InlineKeyboardButton("Edit details",    callback_data=f"edit_{key}"),
        InlineKeyboardButton("Discard",         callback_data=f"disc_{key}"),
    ]])


def build_reply(details: dict) -> str:
    category = details.get('_category', 'event')
    tag = CATEGORY_LABEL.get(category, '[INFO]')
    label = category.replace('_', ' ').title()
    lines = [f"{tag} *Kalnirnay -- {label} Detected*\n"]

    def add(lbl, key, formatter=None):
        val = details.get(key)
        if val:
            display_val = formatter(val) if formatter else val
            lines.append(f"*{lbl}:* {display_val}")

    # Format date for display: show range nicely if present
    def format_date_display(date_val):
        if not date_val:
            return date_val
        m = re.match(r'^(.+?)\s+to\s+(.+?)$', str(date_val).strip(), re.IGNORECASE)
        if m:
            d1 = display_date(m.group(1).strip())
            d2 = display_date(m.group(2).strip())
            return f"{d1} to {d2}"
        return display_date(date_val)

    add("Title",      "title")
    add("Date",       "date",       format_date_display)
    add("Time",       "time")
    add("Venue",      "venue")
    add("Department", "department")
    add("Deadline",   "deadline",   lambda v: display_date(v))
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

    # Show multi-day notice
    date_raw = details.get("date", "")
    if date_raw and re.search(r'\bto\b', str(date_raw), re.IGNORECASE):
        lines.append("\n_📅 Multi-day event — will be added on each date separately_")

    return "\n".join(lines)


# ── Image handler ────────────────────────────────────────────────
async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    is_private = update.effective_chat.type == 'private'
    chat_id = None if is_private else str(update.effective_chat.id)
    group_name = None if is_private else (update.effective_chat.title or "Unknown Group")

    # Auto-register the group whenever bot processes an image in it
    if chat_id and group_name:
        await register_group(chat_id, group_name)

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
    details["source"] = "personal" if is_private else "telegram"

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
    is_private = update.effective_chat.type == 'private'
    chat_id = None if is_private else str(update.effective_chat.id)
    group_name = None if is_private else (update.effective_chat.title or "Unknown Group")
    user_id = update.effective_user.id
    text    = update.message.text.strip() if update.message.text else ""

    # Auto-register the group whenever bot processes text in it
    if chat_id and group_name:
        await register_group(chat_id, group_name)

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

        # Map display labels → internal field names (matches edit block + build_reply)
        LABEL_TO_FIELD = {
            'title': 'title',
            'date': 'date',
            'time': 'time',
            'venue': 'venue',
            'department': 'department',
            'deadline': 'deadline',
            'prize': 'prize',
            'prize pool': 'prize',
            'team size': 'team_size',
            'team_size': 'team_size',
            'register': 'reg_link',
            'reg_link': 'reg_link',
            'contact': 'contact',
            'domains': 'domains',
            'summary': 'summary',
        }

        updated_any = False

        for line in lines:
            if ':' not in line:
                continue
            field, value = line.split(':', 1)
            field_key = LABEL_TO_FIELD.get(field.strip().lower())
            value = value.strip()

            if field_key and value:
                details[field_key] = value
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

    # Use the smart text parser for all messages
    details = extract_message_details(text)
    category = details.get('_category', 'notice')

    # For event-type messages, also try the OCR NLP extractor for richer data
    if category == 'event':
        ocr_details = process_text(text)
        # Merge: prefer OCR details for event-specific fields, keep parser's title/category
        for field in ['prize', 'team_size', 'domains', 'contact', 'department', 'deadline']:
            if ocr_details.get(field) and not details.get(field):
                details[field] = ocr_details[field]
        # Prefer OCR title if it's not "Untitled Event"
        if ocr_details.get('title') and ocr_details['title'] != 'Untitled Event':
            details['title'] = ocr_details['title']

    details["group_id"] = chat_id
    details["source"] = "personal" if is_private else "telegram"

    # Remove internal category key before saving
    clean_details = {k: v for k, v in details.items() if not k.startswith('_')}
    clean_details["_category"] = category  # keep for reply formatting

    raw_text = clean_details.get("raw_text", "")
    if should_ignore(raw_text):
        return

    key = str(update.message.message_id)
    PENDING_EVENTS[key] = clean_details

    await update.message.reply_text(
        build_reply(clean_details),
        parse_mode="Markdown",
        reply_markup=build_keyboard(key)
    )


# ── Start Command Handler ─────────────────────────────────────────
async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "*Welcome to Kaalnirnay Bot!*\n\n"
        "I automatically detect and save events from posters and messages in your college groups.\n\n"
        "*What you can do:*\n"
        "- Send me an event poster image -- I'll extract the details\n"
        "- Send event text -- I'll parse and save it\n"
        "- Use /join in your college group to link it to your calendar\n\n"
        "*Get started:*\n"
        "1. Add me to your college Telegram group\n"
        "2. Send /join in that group\n"
        "3. Log in at the Kaalnirnay website to see your events",
        parse_mode="Markdown"
    )

# ── Join Command Handler ───────────────────────────────────────────
async def handle_join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    user_id = update.effective_user.id
    username = update.effective_user.username or str(user_id)
    group_name = update.effective_chat.title or "Unknown Group"
    
    res = await subscribe_user(str(user_id), username, chat_id, group_name)
    if "error" in res:
        await update.message.reply_text("Failed to link group to your account. Ensure backend is running.")
    else:
        await update.message.reply_text(f"[OK] @{username} linked to *{group_name}*! All events from this group will appear on your calendar.", parse_mode="Markdown")

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

        result = await save_event({k: v for k, v in details.items() if not k.startswith('_')})

        await query.edit_message_reply_markup(reply_markup=None)

        if "error" in result:
            if "Duplicate" in result.get("error", "") or "already exists" in result.get("message", ""):
                await query.message.reply_text("Event already exists in calendar!")
            else:
                await query.message.reply_text(f"Failed to save: {result.get('error', 'Unknown error')}")
        elif "results" in result:
            # Multi-day event — report how many were saved
            saved = sum(1 for r in result["results"] if "error" not in r)
            total = len(result["results"])
            if saved == total:
                await query.message.reply_text(f"✅ Added to calendar on {saved} dates!")
            else:
                await query.message.reply_text(f"Saved on {saved}/{total} dates (some may already exist).")
        else:
            await query.message.reply_text("✅ Added to calendar!")

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

        # Use same labels as build_reply so user sees exact same format
        EDIT_FIELDS = [
            ('Title',      'title'),
            ('Date',       'date'),
            ('Time',       'time'),
            ('Venue',      'venue'),
            ('Department', 'department'),
            ('Deadline',   'deadline'),
            ('Prize Pool', 'prize'),
            ('Team Size',  'team_size'),
            ('Register',   'reg_link'),
            ('Contact',    'contact'),
            ('Domains',    'domains'),
            ('Summary',    'summary'),
        ]

        extracted_lines = []
        for label, field in EDIT_FIELDS:
            val = details.get(field)
            if val:
                display_val = ', '.join(val) if isinstance(val, list) else str(val)
                extracted_lines.append(f"{label}: {display_val}")

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

    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .connect_timeout(30.0)
        .read_timeout(30.0)
        .write_timeout(30.0)
        .pool_timeout(30.0)
        .get_updates_connect_timeout(30.0)
        .get_updates_read_timeout(30.0)
        .get_updates_write_timeout(30.0)
        .get_updates_pool_timeout(30.0)
        .build()
    )

    app.add_handler(CommandHandler("start", handle_start))
    app.add_handler(CommandHandler("join", handle_join))
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_callback))

    # bootstrap_retries=5 means retry 5 times before giving up
    app.run_polling(bootstrap_retries=5)


if __name__ == "__main__":
    main()
