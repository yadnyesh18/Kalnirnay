import os
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")  # suppress pin_memory warning on CPU-only hosts
import re
import logging
import httpx
from datetime import datetime, timezone
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from config import BOT_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY, API_URL
from ocr import process_image, process_text, is_informational, extract_message_details

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_images")
os.makedirs(TEMP_DIR, exist_ok=True)

SUPABASE_HEADERS = {"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"}

scheduler = AsyncIOScheduler()

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
        # Ensure domains is always a list
        if isinstance(event_copy.get("domains"), str):
            event_copy["domains"] = [x.strip() for x in event_copy["domains"].split(',') if x.strip()]
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


async def fetch_all_group_ids() -> list:
    """Fetch all registered group_ids directly from Supabase."""
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/groups?select=group_id",
                headers=SUPABASE_HEADERS,
                timeout=10.0
            )
            return [row["group_id"] for row in r.json()]
    except Exception as e:
        logger.error(f"Failed to fetch group IDs: {e}")
        return []


async def fetch_group_members(group_id: str) -> list:
    """Return telegram_ids of all users who are members of the given group."""
    try:
        import urllib.parse
        encoded = urllib.parse.quote('{' + group_id + '}')
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/users?select=telegram_id&groups=cs.{encoded}",
                headers=SUPABASE_HEADERS,
                timeout=10.0
            )
            return [row["telegram_id"] for row in r.json() if row.get("telegram_id")]
    except Exception as e:
        logger.error(f"Failed to fetch members for group {group_id}: {e}")
        return []


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
        if group_id and group_name:
            await register_group(group_id, group_name)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_URL}/users",
                json={"telegram_id": telegram_id, "username": username, "telegram_username": username, "group_id": group_id},
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



# ── Bot added to group handler ──────────────────────────────────
async def handle_bot_added(update: Update, context: ContextTypes.DEFAULT_TYPE):
    result = update.my_chat_member
    if not result:
        return
    chat = result.chat
    new_status = result.new_chat_member.status
    if new_status in ("member", "administrator") and chat.type in ("group", "supergroup"):
        group_id   = str(chat.id)
        group_name = chat.title or "Unknown Group"
        await register_group(group_id, group_name)
        logger.info(f"Bot added to group: {group_name} ({group_id})")
        try:
            await context.bot.send_message(
                chat_id=chat.id,
                text="Hi! I am Kaalnirnay bot. I will automatically detect events from images and messages. Use /join in this group to link it to your calendar."
            )
        except Exception as e:
            logger.warning(f"Could not send welcome message to {group_id}: {e}")

# ── Test Notification Command ────────────────────────────────────
async def handle_testnotify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send an instant test notification to verify routing works."""
    is_private = update.effective_chat.type == 'private'
    user_id = str(update.effective_user.id)
    chat_id = user_id if is_private else str(update.effective_chat.id)
    label = "Personal DM" if is_private else f"Group: {update.effective_chat.title}"

    await update.message.reply_text("Sending test notification...")

    if is_private:
        await send_notification(update.get_bot(), user_id, "Test Event", 24, user_id)
        await update.message.reply_text("✅ Personal DM notification sent!")
    else:
        # Group: notify group + DM all members
        await send_notification(update.get_bot(), chat_id, "Test Event", 24, user_id)
        members = await fetch_group_members(chat_id)
        dm_count = 0
        for member_id in members:
            if member_id != user_id:
                await send_notification(update.get_bot(), member_id, "Test Event", 24, member_id)
                dm_count += 1
        await update.message.reply_text(
            f"✅ Group notification sent!\n👤 DMed {dm_count} member(s)."
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
    is_private = update.effective_chat.type == 'private'
    user_id = update.effective_user.id
    username = update.effective_user.username or str(user_id)

    if is_private:
        await update.message.reply_text(
            "Please use /join inside your college Telegram group, not in a private chat."
        )
        return

    group_id   = str(update.effective_chat.id)
    group_name = update.effective_chat.title or "Unknown Group"

    res = await subscribe_user(str(user_id), username, group_id, group_name)
    if "error" in res:
        await update.message.reply_text("Failed to link group to your account. Ensure backend is running.")
    else:
        await update.message.reply_text(
            f"@{username} linked to {group_name}! Events from this group will appear on your calendar."
        )

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

        save_payload = {k: v for k, v in details.items() if not k.startswith('_')}
        save_payload["telegram_id"] = str(user_id)
        # Ensure domains is always a list, never a plain string
        if isinstance(save_payload.get("domains"), str):
            save_payload["domains"] = [d.strip() for d in save_payload["domains"].split(',') if d.strip()]
        result = await save_event(save_payload)

        await query.edit_message_reply_markup(reply_markup=None)

        if "error" in result:
            if "Duplicate" in result.get("error", "") or "already exists" in result.get("message", ""):
                await query.message.reply_text("Event already exists in calendar!")
            else:
                await query.message.reply_text(f"Failed to save: {result.get('error', 'Unknown error')}")
        elif "results" in result:
            saved = sum(1 for r in result["results"] if "error" not in r)
            total = len(result["results"])
            if saved == total:
                await query.message.reply_text(f"✅ Added to calendar on {saved} dates!")
            else:
                await query.message.reply_text(f"Saved on {saved}/{total} dates (some may already exist).")
            first = next((r for r in result["results"] if "error" not in r), None)
            if first and first.get("event"):
                ev = first["event"]
                notify_chat_id = details.get("group_id") or str(user_id)
                dt = parse_event_datetime(ev.get("date"), ev.get("time"))
                if dt:
                    schedule_notifications(context.bot, str(user_id), ev["title"], dt, notify_chat_id)
                if ev.get("deadline") and ev["deadline"] != ev.get("date"):
                    dl_dt = parse_event_datetime(ev["deadline"])
                    if dl_dt:
                        schedule_notifications(context.bot, str(user_id), f"{ev['title']} (Deadline)", dl_dt, notify_chat_id)
        else:
            await query.message.reply_text("✅ Added to calendar!")
            ev = result.get("event", {})
            title = ev.get("title") or details.get("title", "Event")
            notify_chat_id = details.get("group_id") or str(user_id)
            dt = parse_event_datetime(ev.get("date"), ev.get("time"))
            if dt:
                schedule_notifications(context.bot, str(user_id), title, dt, notify_chat_id)
            if ev.get("deadline") and ev["deadline"] != ev.get("date"):
                dl_dt = parse_event_datetime(ev["deadline"])
                if dl_dt:
                    schedule_notifications(context.bot, str(user_id), f"{title} (Deadline)", dl_dt, notify_chat_id)

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


# ── Notification helpers ──────────────────────────────────────────
async def send_notification(bot, chat_id: str, event_title: str, hours_before: int, telegram_id: str = None):
    """Send a reminder to the correct chat (group or personal DM)."""
    if hours_before == 24:
        msg = f"*Reminder:* 24 hours left for *{event_title}*!"
    elif hours_before == 12:
        msg = f"*Reminder:* 12 hours left for *{event_title}*!"
    else:
        msg = f"*Heads up!* Only 2 hours left for *{event_title}*!"
    try:
        await bot.send_message(chat_id=chat_id, text=msg, parse_mode="Markdown")
        logger.info(f"Sent {hours_before}hr reminder to chat {chat_id} for '{event_title}'")
        async with httpx.AsyncClient() as client:
            await client.post(f"{API_URL}/events/notify-log", json={
                "telegram_id": telegram_id or chat_id,
                "event_title": event_title,
                "hours_before": hours_before
            }, timeout=5.0)
    except Exception as e:
        # Handle Telegram group → supergroup migration automatically
        from telegram.error import ChatMigrated
        if isinstance(e, ChatMigrated):
            new_id = str(e.new_chat_id)
            logger.warning(f"Group migrated: {chat_id} → {new_id}, updating Supabase")
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/groups",
                    headers={**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates", "Content-Type": "application/json"},
                    json={"group_id": new_id},
                    timeout=5.0
                )
                await client.delete(
                    f"{SUPABASE_URL}/rest/v1/groups?group_id=eq.{chat_id}",
                    headers=SUPABASE_HEADERS,
                    timeout=5.0
                )
            # Retry with new ID
            await bot.send_message(chat_id=new_id, text=msg, parse_mode="Markdown")
        else:
            from telegram.error import Forbidden
            if isinstance(e, Forbidden):
                logger.warning(f"Cannot DM {chat_id} — user hasn't started the bot yet. Skipping.")
            else:
                logger.error(f"Failed to send notification to {chat_id}: {e}")


def schedule_notifications(bot, telegram_id: str, event_title: str, event_datetime: datetime, notify_chat_id: str = None):
    """Schedule 24hr, 12hr, and 2hr reminders.
    - Group event (notify_chat_id set): sends to the group chat so all members see it.
      Also schedules personal DMs to every member of that group.
    - Personal event: sends only to the user's DM.
    """
    now = datetime.now(timezone.utc)
    if event_datetime.tzinfo is None:
        event_datetime = event_datetime.replace(tzinfo=timezone.utc)

    from datetime import timedelta

    async def _fan_out(bot, notify_chat_id, telegram_id, event_title, hours):
        """Send to group chat + DM every member who isn't the sender."""
        # 1. Send to the group chat (visible to everyone)
        await send_notification(bot, notify_chat_id, event_title, hours, telegram_id)
        # 2. DM each member of the group individually
        members = await fetch_group_members(notify_chat_id)
        for member_id in members:
            if member_id != telegram_id:   # sender already saw it in the group
                await send_notification(bot, member_id, event_title, hours, member_id)

    for hours in [24, 12, 2]:
        fire_time = event_datetime - timedelta(hours=hours)
        if fire_time <= now:
            logger.info(f"Skipping {hours}hr reminder for '{event_title}' — time already passed")
            continue

        if notify_chat_id and notify_chat_id != telegram_id:
            # Group event — fan out
            job_id = f"notif_{notify_chat_id}_{event_title[:20]}_{hours}h"
            scheduler.add_job(
                _fan_out,
                trigger=DateTrigger(run_date=fire_time),
                args=[bot, notify_chat_id, telegram_id, event_title, hours],
                id=job_id,
                replace_existing=True
            )
            logger.info(f"Scheduled {hours}hr group fan-out for '{event_title}' at {fire_time} → {notify_chat_id}")
        else:
            # Personal event — DM only
            job_id = f"notif_{telegram_id}_{event_title[:20]}_{hours}h"
            scheduler.add_job(
                send_notification,
                trigger=DateTrigger(run_date=fire_time),
                args=[bot, telegram_id, event_title, hours],
                kwargs={"telegram_id": telegram_id},
                id=job_id,
                replace_existing=True
            )
            logger.info(f"Scheduled {hours}hr personal reminder for '{event_title}' at {fire_time} → {telegram_id}")


def parse_event_datetime(date_str: str, time_str: str = None) -> datetime | None:
    """Parse event date + optional time into a datetime object."""
    if not date_str:
        return None
    # Normalize to YYYY-MM-DD first
    normalized = normalize_date(date_str)
    if not normalized or normalized == date_str and not re.match(r'\d{4}-\d{2}-\d{2}', normalized):
        return None
    try:
        if time_str:
            time_part = re.split(r'[-–]', time_str)[0].strip()
            time_part = re.sub(r'\s*IST\s*', '', time_part, flags=re.IGNORECASE).strip()
            for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M", "%I %p", "%I.%M %p", "%I.%M%p"):
                try:
                    t = datetime.strptime(time_part.upper(), fmt)
                    d = datetime.strptime(normalized, "%Y-%m-%d")
                    return d.replace(hour=t.hour, minute=t.minute)
                except ValueError:
                    continue
        return datetime.strptime(normalized, "%Y-%m-%d").replace(hour=9, minute=0)  # default 9 AM
    except Exception:
        return None


async def load_and_reschedule(bot):
    """On bot startup, fetch all future events from DB and reschedule their notifications."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_URL}/events/upcoming", timeout=10.0)
            events = response.json()
        if not isinstance(events, list):
            return
        count = 0
        for event in events:
            telegram_id = event.get("telegram_id")
            title = event.get("title")
            date_str = event.get("date")
            time_str = event.get("time")
            deadline_str = event.get("deadline")
            if not telegram_id or not title:
                continue
            # Schedule for event date
            group_id = event.get("group_id")
            notify_chat_id = group_id or telegram_id
            dt = parse_event_datetime(date_str, time_str)
            if dt:
                schedule_notifications(bot, telegram_id, title, dt, notify_chat_id)
                count += 1
            if deadline_str and deadline_str != date_str:
                dl_dt = parse_event_datetime(deadline_str)
                if dl_dt:
                    schedule_notifications(bot, telegram_id, f"{title} (Deadline)", dl_dt, notify_chat_id)
                    count += 1
        logger.info(f"Rescheduled notifications for {count} upcoming events on startup")
    except Exception as e:
        logger.error(f"Failed to load upcoming events for rescheduling: {e}")


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
    app.add_handler(CommandHandler("testnotify", handle_testnotify))
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_callback))

    # Register group as soon as bot is added to it
    from telegram.ext import ChatMemberHandler
    app.add_handler(ChatMemberHandler(handle_bot_added, ChatMemberHandler.MY_CHAT_MEMBER))

    async def post_init(application):
        scheduler.start()
        await load_and_reschedule(application.bot)

    app.post_init = post_init

    app.run_polling(bootstrap_retries=5)


if __name__ == "__main__":
    main()

