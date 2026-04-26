# 📅 Kaalnirnay — Smart Academic Event Calendar

An intelligent event management system that automatically detects, extracts, and organizes academic events from Telegram group messages and poster images. Features a Telegram bot with dual-engine OCR, a Node.js REST API backed by Supabase, and a React frontend with calendar, checklists, and exam countdowns.

---

## 🏗️ Architecture

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Telegram Bot    │─────▶│  Node.js REST API │─────▶│  Supabase (DB)   │
│  (Python)        │      │  (Express)        │      │  PostgreSQL      │
│  OCR + NLP       │      │  CRUD + Auth      │      │                  │
└──────────────────┘      └────────▲─────────┘      └──────────────────┘
                                   │
                          ┌────────┴─────────┐
                          │  React Frontend  │
                          │  (Vite + JSX)    │
                          └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer        | Technology                                                         |
| ------------ | ------------------------------------------------------------------ |
| **Bot**      | Python, python-telegram-bot, APScheduler                           |
| **OCR**      | Tesseract, EasyOCR, OpenCV, spaCy (en_core_web_sm), dateparser    |
| **Backend**  | Node.js, Express, bcryptjs, CORS                                  |
| **Database** | Supabase (PostgreSQL), @supabase/supabase-js                      |
| **Frontend** | React 19, Vite, Axios, FullCalendar                               |
| **Hosting**  | Railway (Bot, Server, Frontend as separate services)               |

---

## 🧬 OOP Concepts Used

### 1. Classes & Objects

Objects are instantiated from classes throughout the project:

```python
# Python Bot — APScheduler class instantiation
scheduler = AsyncIOScheduler()

# Telegram Application built from ApplicationBuilder class
app = ApplicationBuilder().token(BOT_TOKEN).build()

# EasyOCR model object
_easy_reader = easyocr.Reader(['en'])
```

```javascript
// Node.js — Express app and Supabase client objects
const app = express()
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const router = express.Router()
```

---

### 2. Encapsulation

Internal state and logic are bundled together and hidden from external modules:

- **`config.py`** — encapsulates all env-var loading; other modules import named constants, never call `os.getenv()` directly.
- **`PENDING_EVENTS = {}`** and **`EDITING_USERS = {}`** — module-level private state stores in `bot.py`, accessed only through handler functions.
- **`supabaseClient.js`** — wraps the Supabase connection; route files import the client without knowing creation details.
- **`SmartChecklists.jsx`** — all checklist state is internal; the parent only passes `user` as a prop.

---

### 3. Abstraction

Complex operations are hidden behind simple function interfaces:

| Function                  | What It Abstracts                                            |
| ------------------------- | ------------------------------------------------------------ |
| `process_image(path)`     | Full OCR pipeline: preprocessing → dual OCR → NLP extraction |
| `save_event(details)`     | Date range splitting, per-date API calls, error aggregation  |
| `schedule_notifications()`| Fan-out logic, APScheduler job creation, time calculations   |
| `extract_message_details()`| Message classification, date/time/venue parsing             |
| REST API endpoints        | Supabase query syntax, RLS, joins                            |

---

### 4. Inheritance

Child classes inherit and extend parent class behaviour:

```python
# Telegram handler classes inherit from BaseHandler
# MessageHandler, CommandHandler, CallbackQueryHandler, ChatMemberHandler
# all share handle_update() but override check_update()

# Exception hierarchy for error handling
from telegram.error import ChatMigrated, Forbidden  # both inherit TelegramError
if isinstance(e, ChatMigrated): ...
if isinstance(e, Forbidden): ...

# AsyncIOScheduler inherits from BaseScheduler (APScheduler)
```

```javascript
// Express Router inherits from Node's EventEmitter
const router = express.Router()  // inherits event-driven request handling
```

---

### 5. Polymorphism

The same interface produces different behaviour depending on context:

- **`send_notification(bot, chat_id, ...)`** — same function sends to a group chat (visible to all) or a personal DM, depending on the `chat_id`.
- **OCR engine selection** — `get_best_text()` runs both Tesseract and EasyOCR (different implementations, same purpose) and picks the better result.
- **`normalize_date()`** — iterates multiple date format strategies until one matches.
- **Express middleware chain** — `cors()`, `express.json()`, and route handlers all share `(req, res, next)` but do completely different things.
- **`EventListItem`** in React — renders differently (orange vs blue, "Personal" vs group name) based on `isPersonal` flag.

---

### 6. Design Patterns

#### A. Singleton Pattern
```python
# EasyOCR model loaded once and reused (expensive ~5s init)
_easy_reader = None
def get_easy_reader():
    global _easy_reader
    if _easy_reader is None:
        _easy_reader = easyocr.Reader(['en'])
    return _easy_reader
```
Also: `supabaseClient.js` (single DB client), `scheduler` (single APScheduler instance).

#### B. Builder Pattern
```python
app = (
    ApplicationBuilder()
    .token(BOT_TOKEN)
    .connect_timeout(30.0)
    .read_timeout(30.0)
    .write_timeout(30.0)
    .build()
)
```

#### C. Observer Pattern
- Telegram handlers observe update types: `app.add_handler(MessageHandler(filters.PHOTO, handle_image))`
- React `useEffect` hooks observe state changes: `useEffect(() => { fetchEvents() }, [user])`
- APScheduler `DateTrigger` jobs observe the clock and fire at scheduled times.

#### D. Strategy Pattern
- **OCR engine selection**: two strategies (Tesseract, EasyOCR), best quality score wins.
- **Date parsing**: multiple format strings tried in sequence — each is a parsing strategy.
- **Message classification**: weighted keyword scoring across 6 category strategies.

#### E. Facade Pattern
- REST API facades over Supabase — frontend calls simple endpoints without knowing query syntax.
- `process_image()` facades the entire OCR pipeline.
- `config.py` facades environment variable loading.

#### F. Template Method Pattern
- `extract_details()` defines a 12-step extraction template (date → deadline → time → venue → ... → title).
- `handle_callback()` follows: extract key → get event → process action → cleanup.

#### G. Command Pattern
- APScheduler jobs encapsulate notification commands with function, args, trigger time, and ID.
- `InlineKeyboardButton` encapsulates user actions as callback data strings (`"save_123"`, `"edit_123"`).

#### H. Repository Pattern
Each route file acts as a data access repository:
- `events.js` → Event CRUD
- `users.js` → User CRUD
- `groups.js` → Group CRUD
- `checklists.js` → Checklist CRUD

---

### 7. SOLID Principles

| Principle | Application |
| --------- | ----------- |
| **S** — Single Responsibility | `config.py` loads env vars only; `ocr.py` handles OCR only; each route file handles one resource |
| **O** — Open/Closed | `EVENT_KEYWORDS` list extensible without modifying `is_event_message()`; new routes mount without changing existing ones |
| **L** — Liskov Substitution | `ChatMigrated` and `Forbidden` substitute for `TelegramError`; all Express handlers accept `(req, res, next)` |
| **I** — Interface Segregation | Handlers segregated by type: `handle_image` (photos), `handle_text` (text), `handle_join` (command) |
| **D** — Dependency Inversion | `bot.py` depends on `API_URL` abstraction; React components depend on props, not data sources |

---

### 8. Async / Concurrent OOP

```python
# All bot handlers are async coroutines
async def handle_image(update, context): ...

# httpx.AsyncClient as async context manager with connection pooling
async with httpx.AsyncClient() as client:
    response = await client.post(...)

# _fan_out() — nested async closure capturing outer scope variables
async def _fan_out(bot, notify_chat_id, telegram_id, event_title, hours):
    await send_notification(bot, notify_chat_id, event_title, hours, telegram_id)
    members = await fetch_group_members(notify_chat_id)
    for member_id in members:
        await send_notification(bot, member_id, event_title, hours, member_id)
```

---

## 📡 REST API Reference

**Base URL:** `https://<server-host>:<PORT>`

### Health Check

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/`      | API health check — returns `{ "status": "Kalnirnay API is running" }` |

---

### Events (`/events`)

| Method   | Endpoint              | Description                                         | Request Body / Query                                   |
| -------- | --------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `GET`    | `/events`             | Fetch events for a user (personal + subscribed groups) | `?user_id=xxx&groups=g1,g2`                          |
| `GET`    | `/events/upcoming`    | Fetch future events with `telegram_id` (for notification rescheduling) | —                                      |
| `GET`    | `/events/:id`         | Fetch a single event by ID                          | —                                                      |
| `POST`   | `/events`             | Save a new event (from bot or personal)             | `{ title, date, time, venue, department, deadline, prize, domains[], team_size, reg_link, contact, summary, group_id, source, user_id, telegram_id }` |
| `POST`   | `/events/notify-log`  | Log a sent notification                             | `{ telegram_id, event_title, hours_before }`           |
| `DELETE` | `/events/:id`         | Delete an event                                     | —                                                      |

---

### Users (`/users`)

| Method   | Endpoint                     | Description                                      | Request Body / Query                     |
| -------- | ---------------------------- | ------------------------------------------------ | ---------------------------------------- |
| `GET`    | `/users`                     | List all users                                   | —                                        |
| `POST`   | `/users`                     | Register (web sign-up or bot `/join`)             | `{ email, password, full_name, university, major, year, program }` or `{ telegram_id, username, group_id }` |
| `POST`   | `/users/login`               | Email + password login                           | `{ email, password }`                    |
| `POST`   | `/users/telegram-login`      | Login via Telegram numeric ID                    | `{ telegram_id }`                        |
| `POST`   | `/users/connect-telegram`    | Link Telegram username to web account            | `{ user_id, telegram_username }`         |
| `GET`    | `/users/user/:username`      | Get user by Telegram username                    | —                                        |
| `DELETE` | `/users/:telegram_id`        | Remove a user                                    | —                                        |

---

### Groups (`/groups`)

| Method | Endpoint   | Description                                | Request Body / Query     |
| ------ | ---------- | ------------------------------------------ | ------------------------ |
| `POST` | `/groups`  | Upsert a group (called by bot on activity) | `{ group_id, group_name }` |
| `GET`  | `/groups`  | Get groups — all or by IDs                 | `?ids=g1,g2` (optional)  |

---

### Checklists (`/checklists`)

| Method   | Endpoint                      | Description                     | Request Body / Query     |
| -------- | ----------------------------- | ------------------------------- | ------------------------ |
| `GET`    | `/checklists`                 | Get all checklists with items   | `?user_id=xxx`           |
| `POST`   | `/checklists`                 | Create a new checklist          | `{ user_id, title }`     |
| `PATCH`  | `/checklists/:id`             | Rename a checklist              | `{ title }`              |
| `DELETE` | `/checklists/:id`             | Delete checklist (cascades items) | —                      |
| `POST`   | `/checklists/:id/items`       | Add item to a checklist         | `{ text, parent_id?, position? }` |
| `PATCH`  | `/checklists/items/:itemId`   | Toggle done or update item text | `{ done?, text? }`      |
| `DELETE` | `/checklists/items/:itemId`   | Delete a checklist item         | —                        |

---

## 🔌 External APIs & Services Used

| Service / API                 | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| **Telegram Bot API**          | Receive messages/images, send replies, inline keyboards, notifications |
| **Supabase REST API**         | PostgreSQL database (events, users, groups, checklists, notifications_log) |
| **Tesseract OCR**             | Primary OCR engine for text extraction from images    |
| **EasyOCR**                   | Secondary OCR engine — dual-engine strategy for accuracy |
| **spaCy (en_core_web_sm)**    | NLP pipeline for named entity recognition (NER)       |
| **dateparser**                | Intelligent date string parsing with multiple formats |
| **FullCalendar**              | Interactive calendar component in the React frontend  |

---

## 🚀 Telegram Bot Commands

| Command        | Description                                              |
| -------------- | -------------------------------------------------------- |
| `/start`       | Welcome message with usage instructions                  |
| `/join`        | Link the current group to your calendar (use in a group) |
| `/testnotify`  | Send a test notification to verify routing works         |

The bot also automatically:
- Detects event posters (images) and extracts details via OCR
- Detects event/notice messages (text) and classifies them into 6 categories
- Provides inline buttons to **Add to calendar**, **Edit details**, or **Discard**
- Schedules 24hr, 12hr, and 2hr reminders with fan-out to group members
- Auto-registers groups when added

---

## ⚙️ Setup & Run

### Prerequisites
- Python 3.10+, Node.js 18+, Tesseract OCR installed
- Supabase project with tables: `events`, `users`, `groups`, `checklists`, `checklist_items`, `notifications_log`

### Environment Variables (`.env`)
```env
BOT_TOKEN=<telegram-bot-token>
SUPABASE_URL=<supabase-project-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
API_URL=<backend-server-url>
```

### Bot (Python)
```bash
cd kalnirnay/backend/bot
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python bot.py
```

### Server (Node.js)
```bash
cd kalnirnay/backend/server
npm install
node server.js
```

### Frontend (React + Vite)
```bash
cd kalnirnay/frontend
npm install
npm run dev
```

---

## 📄 License

This project is for academic purposes (Mini Project — Semester 4).
