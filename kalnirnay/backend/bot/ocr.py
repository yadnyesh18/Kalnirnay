import pytesseract
import easyocr
import cv2
import numpy as np
import spacy
import dateparser
import re

import platform
import os

# Auto-detect Tesseract path: Windows vs macOS/Linux
if platform.system() == 'Windows':
    _tess_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(_tess_path):
        pytesseract.pytesseract.tesseract_cmd = _tess_path
else:
    # macOS (Homebrew) / Linux
    pytesseract.pytesseract.tesseract_cmd = r'/opt/homebrew/bin/tesseract'
nlp = spacy.load("en_core_web_sm")

_easy_reader = None
def get_easy_reader():
    global _easy_reader
    if _easy_reader is None:
        print("[EasyOCR] Loading model...")
        _easy_reader = easyocr.Reader(['en'])
    return _easy_reader

# ── Preprocessing ────────────────────────────────────────────────
def preprocess_image(image_path):
    img  = cv2.imread(image_path)
    img  = cv2.resize(img, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    _, otsu  = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10)
    kernel   = np.ones((2, 2), np.uint8)
    oc = cv2.morphologyEx(otsu,     cv2.MORPH_OPEN, kernel, iterations=1)
    ac = cv2.morphologyEx(adaptive, cv2.MORPH_OPEN, kernel, iterations=1)
    return oc if cv2.countNonZero(oc) > cv2.countNonZero(ac) else ac

# ── OCR quality score ────────────────────────────────────────────
def ocr_score(text):
    if not text or len(text.strip()) < 20: return 0.0
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    total = sum(len(l) for l in lines)
    if not total: return 0.0
    noise = sum(len(re.findall(r'[^a-zA-Z0-9\s:,.\-\'\"!?&()/₹@+%]', l)) for l in lines)
    alpha = sum(len(re.findall(r'[a-zA-Z]', l)) for l in lines)
    return (alpha / total) * 0.6 + (1 - noise / total) * 0.4

# ── EasyOCR corrections ──────────────────────────────────────────
def fix_easyocr(text):
    # ₹ misread as 7 for comma-formatted amounts only (safe — avoids phone number damage)
    text = re.sub(r'\b7(\d{2},\d{3})\b', r'₹\1', text)   # 750,000 → ₹50,000
    # ₹ misread as ? or {
    text = re.sub(r'\?(\d{3,7})', r'₹\1', text)           # ?3000   → ₹3000
    text = re.sub(r'\{(\d[\d,]{3,9})', r'₹\1', text)         # {2,00,000 → ₹2,00,000
    # Join split ordinal dates: "22\nnd\nMarch" or "25\nTH\nMARCH"
    text = re.sub(r'(\d{1,2})\n(st|nd|rd|th)\n', r'\1\2 ', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d{1,2})\n([A-Z][a-z]{2,8})', r'\1 \2', text)
    # Pull trailing orphan day number to join with following month on next search pass
    text = re.sub(r'\n(\d{1,2}(?:st|nd|rd|th)?)\s*$', r' \1', text, flags=re.IGNORECASE)
    # Fix "MARCH2026" → "MARCH 2026"
    text = re.sub(r'([A-Za-z]{3,9})(\d{4})', r'\1 \2', text)
    return text

def get_best_text(image_path):
    tess_text = pytesseract.image_to_string(preprocess_image(image_path), config=r'--oem 3 --psm 3')
    easy_text = fix_easyocr('\n'.join(get_easy_reader().readtext(image_path, detail=0)))
    ts, es    = ocr_score(tess_text), ocr_score(easy_text)
    print(f"\n[OCR] Tesseract: {ts:.3f} | EasyOCR: {es:.3f}")
    if es >= ts:
        print("[OCR] → EasyOCR")
        print(f"\n--- RAW (EasyOCR) ---\n{easy_text}\n---------------------")
        return easy_text, "easyocr"
    print("[OCR] → Tesseract")
    print(f"\n--- RAW (Tesseract) ---\n{tess_text}\n-----------------------")
    return tess_text, "tesseract"

# ── Constants ────────────────────────────────────────────────────
DEPT_PATTERNS = [
    r'Department\s+of\s+Information\s+Technology',
    r'Department\s+of\s+Computer\s+(?:Science|Engineering)',
    r'Department\s+of\s+AI(?:\s*(?:&|and)\s*(?:ML|DS|Data\s+Science))?',
    r'Department\s+of\s+(?:AIDS|AIML|CSE|IT|ECE|EXTC)',
    r'Dept\.?\s+of\s+\w+',
]

SPONSOR_NAMES = {
    'featherless', 'featherless ai', 'vartul', 'n8n', 'ottarra', 'imc',
    'synapse', 'google', 'microsoft', 'amazon', 'aws', 'pag',
    'end to end', 'traceability', 'product traceability'
}

TECH_RE = re.compile(
    r'^(AI|ML|Machine\s+Learning|Artificial\s+Intelligence|'
    r'Web(?:\s*/\s*App)?|App(?:\s+Dev)?|IoT|Cyber(?:security)?|'
    r'Cloud(?:\s+Computing)?|Blockchain|Data\s+(?:Science|Analytics)?|'
    r'AR|VR|FinTech|HealthTech|GameDev|Robotics|NLP|CV|'
    r'WEB/APP|WEBFAPP|WEBAPP|WEBDEV|MOBILE|FULLSTACK|DEVOPS|'
    r'Open\s+Innovation|Sustainability|EdTech|AgriTech)$',
    re.IGNORECASE
)

# Lines containing these phrases can NEVER be the title
TITLE_NEVER = [
    'entry fee', 'entry fees', 'per team', 'members in',
    'scan to', 'sponsored by', 'sponsered by',
    'contact', 'queries', 'prize money', 'prizes worth',
    'cash prize', 'last date', 'deadline', 'submit', 'form',
    'register'
]

TITLE_SKIP_KW = {
    'INSTITUTE','TECHNOLOGY','DEPARTMENT','UNIVERSITY','COLLEGE','COUNCIL',
    'SOCIETY','INNOVATION','INFORMATION','COMMITTEE','NAAC','AUTONOMOUS',
    'AFFILIATED','ACCREDITED','CGPA','SPONSOR','INKIND','BEVERAGE',
    'INFERENCE','TRACEABILITY','KELAVANI','MANDAL','SVKM','SYNAPSE',
    'DEVELOPER','GROUP','GOOGLE','END TO END','PRODUCT','SHIRODA',
    'STUDENT','TECHNICAL'
}

def is_valid_domain(text):
    t  = text.strip()
    tl = t.lower()
    if not t or len(t) < 2 or len(t) > 35: return False
    if any(s in tl for s in SPONSOR_NAMES):  return False
    return bool(TECH_RE.match(t))

def normalize_domain(text):
    t = text.strip()
    if re.match(r'web\s*[f/\\]\s*app|webfapp|webapp|web\s+app', t, re.IGNORECASE):
        return 'Web/App'
    return t.upper() if len(t) <= 4 else t.title()

# ── NLP helpers ──────────────────────────────────────────────────
def parse_date(s):
    s = re.sub(r'[°º]', '', str(s)).strip()
    p = dateparser.parse(s, settings={"PREFER_DAY_OF_MONTH": "first", "RETURN_AS_TIMEZONE_AWARE": False})
    if p:
        if not re.search(r'\d{4}', s):
            p2 = dateparser.parse(f"{s} 2026", settings={"PREFER_DAY_OF_MONTH": "first", "RETURN_AS_TIMEZONE_AWARE": False})
            if p2: p = p2
        return p.strftime("%d %m %Y")
    return None

def noise_r(line):
    if not line: return 1.0
    return len(re.findall(r'[^a-zA-Z0-9\s:,.\-\'\"!?&()\/₹@+%\']', line)) / len(line)

def find_title(lines):
    scored = []
    for line in lines[:30]:
        line = line.strip()
        if len(line) < 4 or not re.search(r'[a-zA-Z]', line): continue
        if noise_r(line) > 0.40: continue

        line_lower = line.lower()
        if any(phrase in line_lower for phrase in TITLE_NEVER): continue

        score = 0
        if re.search(r'\b\d+\.\d+\b', line):   score += 20  # version 4.0
        if re.search(r'[\'\']\d{2}\b', line):  score += 18  # shorthand year '26
        if re.search(r'\b20\d{2}\b', line):    score += 15  # full year
        if ':' in line:                         score += 3
        if any(c.islower() for c in line) and any(c.isupper() for c in line): score += 6
        score += min(len(line) // 4, 10)
        if re.match(r'^[A-Z]', line):           score += 4

        for kw in TITLE_SKIP_KW:
            if kw in line.upper():              score -= 20
        if re.match(r'^[e¢•\*«»_=]', line):    score -= 15
        if re.search(r'[/\\{}|<>]', line):      score -= 12
        if re.search(r'\+\d{2}\s*\d{5}', line): score -= 20
        if re.search(r'(?:₹|rs\.?)\s*[\d,]+', line, re.IGNORECASE): score -= 15
        # Penalise digit-heavy lines unless they have a year
        if len(re.findall(r'\d', line)) > 3 and not re.search(r'\b20\d{2}\b|[\'\']\d{2}', line): score -= 8

        scored.append((score, line))

    if scored:
        scored.sort(key=lambda x: x[0], reverse=True)
        print(f"\n--- TOP 3 TITLE CANDIDATES ---")
        for s, l in scored[:3]: print(f"  {s:>3}: '{l}'")
        print("------------------------------")
        best = re.sub(r'[\\|<>{}°º]', '', scored[0][1]).strip()
        # Strip trailing date/time fragment merged into title line
        best = re.sub(r'\s*\|.*$', '', best).strip()
        best = re.sub(
            r'\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*.*$',
            '', best, flags=re.IGNORECASE
        ).strip()
        # Strip trailing standalone month name e.g. "INSOMNIA'26 March"
        best = re.sub(
            r"\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$",
            '', best, flags=re.IGNORECASE
        ).strip()
        return best
    return "Untitled Event"

# ── Main NLP extraction ──────────────────────────────────────────
def extract_details(text, engine="unknown"):
    doc    = nlp(text)
    MONTHS = r'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
    joined = ' '.join(text.split())

    # ── Date & date range ────────────────────────────────────────
    date_found = date_end = None
    for t in [text, joined]:
        m = re.search(rf'(\d{{1,2}})\s*[-–]\s*(\d{{1,2}})(?:st|nd|rd|th)?\s+({MONTHS})(?:\s+(\d{{4}}))?', t, re.IGNORECASE)
        if m:
            yr = m.group(4) or "2026"
            date_found = parse_date(f"{m.group(1)} {m.group(3)} {yr}")
            date_end   = parse_date(f"{m.group(2)} {m.group(3)} {yr}")
            break
    if not date_found:
        for t in [text, joined]:
            m = re.search(rf'(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*[\s,]+(\d{{1,2}})\s*(?:st|nd|rd|th)?\s*[°º]?\s*({MONTHS})(?:\s+(\d{{4}}))?', t, re.IGNORECASE)
            if m: date_found = parse_date(f"{m.group(1)} {m.group(2)} {m.group(3) or '2026'}"); break
    if not date_found:
        for t in [text, joined]:
            m = re.search(rf'\b(\d{{1,2}})\s*(?:st|nd|rd|th)?\s*[°º]?\s*({MONTHS})(?:\s+(\d{{4}}))?\b', t, re.IGNORECASE)
            if m: date_found = parse_date(f"{m.group(1)} {m.group(2)} {m.group(3) or '2026'}"); break
    if not date_found:
        m = re.search(r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b', text)
        if m: date_found = parse_date(m.group(1))
    date_display = f"{date_found} to {date_end}" if (date_found and date_end and date_found != date_end) else date_found

    # ── Deadline ─────────────────────────────────────────────────
    deadline = None
    m = re.search(r'(?:deadline|submit by|last date|due by|register by|registration closes?|register before)[:\s]*([^\n]+)', text, re.IGNORECASE)
    if m: deadline = parse_date(m.group(1).strip())

    # ── Time — range first, then single ──────────────────────────
    time_found = None
    m = re.search(r'\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)(?:\s*IST)?)\b', text, re.IGNORECASE)
    if m: time_found = m.group(1).strip()
    if not time_found:
        m = re.search(r'\b(\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)\b', text, re.IGNORECASE)
        if m: time_found = m.group(1).strip()
    if not time_found:
        m = re.search(r'\b(\d{1,2}:\d{2}\s*(?:AM|PM))\b', text, re.IGNORECASE)
        if m: time_found = m.group(1).strip()

    # ── Venue ────────────────────────────────────────────────────
    venue = None
    m = re.search(r'\b(?:VENUE|LOCATION)\b[\s:\n]+([A-Za-z]?\d{2,4}[-–][A-Za-z0-9]+|[A-Za-z]{2,}[-\s]\d+)', text, re.IGNORECASE)
    if m: venue = m.group(1).strip()
    if not venue:
        m = re.search(r'(?<!\d)(\d{3}[-–][A-Z])(?!\d)', text)
        if m: venue = m.group(1).strip()

    # ── Department ───────────────────────────────────────────────
    department = None
    for pat in DEPT_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m: department = m.group(0).strip(); break
    if not department:
        m = re.search(r'((?:Dwarkadas|Sanghvi|Rayeshwar|A\.?P\.?\s*Shah|SVKM)[^\n]{5,60})', text, re.IGNORECASE)
        if m: department = m.group(1).strip()

    # ── Event head ───────────────────────────────────────────────
    event_head = None
    m = re.search(r'Event\s+Head\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', text, re.IGNORECASE)
    if m:
        c = m.group(1).strip()
        if 2 < len(c) < 30 and not re.search(r'\d', c): event_head = c
    if not event_head:
        m = re.search(r'(?:event\s+coordinator|faculty\s+coordinator|spoc)[:\s]+([A-Za-z\s]{3,30})', text, re.IGNORECASE)
        if m: event_head = m.group(1).strip().split('\n')[0]
    if not event_head:
        ignore = {'event head','mach','nel','pri','shri','vile','parle','kelavani',
                  'mandal','hack','ship','fiesta','prize','round','stage','speed',
                  'bucket','solo','intel','paper','challenge','format','scoring',
                  'anish','anusha','gawade','aastik','tridipta'}
        persons = [e.text for e in doc.ents if e.label_ == "PERSON"
                   and len(e.text) > 3 and not re.search(r'\d', e.text)
                   and e.text.lower() not in ignore
                   and re.match(r'^[A-Z][a-zA-Z\s]+$', e.text)]
        if persons: event_head = persons[0]

    # ── Prize pool ───────────────────────────────────────────────
    prize = None
    # Check for total pool statement first
    # Normalize lakh format: ₹2,00,000 → treat as 200000
    worth = re.search(r'(?:cash\s+)?prizes?\s+worth\s+₹\s*([\d,]+)', text, re.IGNORECASE)
    if worth:
        val = worth.group(1).replace(',', '')
        if val.isdigit(): prize = f"Total pool: ₹{int(val):,}"
    if not prize:
        raw  = re.findall(r'₹\s*([\d,]+)', text)
        raw += re.findall(r'(?:rs\.?|inr)\s*([\d,]+)', text, re.IGNORECASE)
        raw += re.findall(r'(?:1st|2nd|3rd|first|second|third)[^\n₹]{0,10}₹\s*([\d,]+)', text, re.IGNORECASE)
        if raw:
            amounts = sorted({int(p.replace(',','')) for p in raw
                             if p.replace(',','').isdigit() and int(p.replace(',','')) > 100},
                            reverse=True)
            if amounts:
                prize = ', '.join([f"{['1st','2nd','3rd'][i]}: ₹{a:,}" for i,a in enumerate(amounts[:3])])

    # ── Domains ──────────────────────────────────────────────────
    domains = []
    m = re.search(r'(?:domains?|tracks?|themes?|categories)[:\s]*([^\n]+)', text, re.IGNORECASE)
    if m:
        for p in re.split(r'[,•·*\-–|/]', m.group(1)):
            p = p.strip()
            if is_valid_domain(p): domains.append(normalize_domain(p))
    if not domains:
        for line in text.split('\n'):
            line = line.strip()
            if len(line) > 40: continue
            parts = re.split(r'\s*[-–|/]\s*', line)
            if len(parts) >= 2 and all(is_valid_domain(p.strip()) for p in parts if p.strip()):
                domains = [normalize_domain(p.strip()) for p in parts if p.strip()]
                break
    if not domains:
        collected = []
        for line in text.split('\n'):
            line = line.strip()
            if is_valid_domain(line) and len(line) < 25:
                collected.append(normalize_domain(line))
        if 1 < len(collected) <= 6: domains = collected

    # ── Team size ────────────────────────────────────────────────
    team_size = None
    m = re.search(r'(\d+)\s*members?\s+in\s+a\s+team', text, re.IGNORECASE)
    if m: team_size = m.group(1)
    if not team_size:
        m = re.search(r'(?:team\s*size|team\s*of|per\s*team)[:\s]*(\d+(?:\s*[-–to]+\s*\d+)?)', text, re.IGNORECASE)
        if m: team_size = m.group(1).strip()

    # ── Registration link ────────────────────────────────────────
    reg_link = None
    m = re.search(r'(https?://[^\s]+|bit\.ly/[^\s]+|forms\.gle/[^\s]+|unstop\.com/[^\s]+)', text, re.IGNORECASE)
    if m: reg_link = m.group(1).strip()

    # ── Contact ──────────────────────────────────────────────────
    contact = None
    np_ = re.findall(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:\s]\s*\(?\+?(\d[\d\s]{9,12})\)?', text)
    np_ = [(n, p) for n, p in np_ if n.lower() not in SPONSOR_NAMES and len(n) > 2]
    if np_:
        contact = ', '.join([f"{n.strip()}: {re.sub(r'\\s+','',p).strip()}" for n,p in np_[:2]])
    if not contact:
        np2 = re.findall(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)[:\s]+(?:\+\d{1,2}\s*)?([\d\s]{10,13})', text)
        np2 = [(n, p) for n, p in np2 if n.lower() not in SPONSOR_NAMES]
        if np2: contact = ', '.join([f"{n.strip()}: {p.strip()}" for n,p in np2[:2]])
    if not contact:
        ph = re.findall(r'(?:\+\d{1,2}\s*)?[6-9]\d{9}', text)
        if ph: contact = ', '.join(ph[:2])

    # ── Summary ──────────────────────────────────────────────────
    summary_lines = []
    for line in text.split('\n'):
        line = line.strip()
        if re.match(r'^[e¢•\*·]\s+.{10,}', line):
            summary_lines.append(re.sub(r'^[e¢•\*·]\s+', '', line).strip())
    if not summary_lines:
        summary_lines = re.findall(r'Round\s+\d+[:\s–-]+([^\n]{10,60})', text, re.IGNORECASE)[:4]
    if not summary_lines:
        for line in text.split('\n'):
            line = line.strip()
            if len(line) > 60 and len(line.split()) > 8 and line[0].isupper():
                if not any(kw in line.upper() for kw in TITLE_SKIP_KW):
                    summary_lines.append(line[:150])
                    break
    if not summary_lines:
        parts = []
        if domains:      parts.append(f"Domains: {', '.join(domains)}")
        if prize:        parts.append(f"Prize pool: {prize}")
        if date_display: parts.append(f"Date: {date_display}")
        summary_lines = parts
    summary = '; '.join(summary_lines[:3]) if summary_lines else None

    # ── Title ────────────────────────────────────────────────────
    title = find_title(text.split('\n'))

    result = {
        "title": title, "date": date_display, "time": time_found,
        "venue": venue, "department": department, "event_head": event_head,
        "deadline": deadline, "prize": prize,
        "domains": domains if domains else None,
        "team_size": team_size, "reg_link": reg_link,
        "contact": contact, "summary": summary,
        "ocr_engine": engine, "raw_text": text.strip()
    }

    print("\n--- EXTRACTED DETAILS ---")
    for k, v in result.items():
        if k != "raw_text": print(f"  {k}: {v}")
    print("-------------------------\n")
    return result

# ── Public: Image processing ─────────────────────────────────────
def process_image(image_path):
    text, engine = get_best_text(image_path)
    return extract_details(text, engine)

def process_text(text):
    return extract_details(text, "text")


# ══════════════════════════════════════════════════════════════════
# TEXT MESSAGE PARSER — handles assignments, timetable changes,
# lab schedules, exams, events, and general notices.
# Everything is pattern-based and dynamic.
# ══════════════════════════════════════════════════════════════════

from datetime import datetime, timedelta

# ── Message classification keywords (weighted) ───────────────────
CATEGORY_SIGNALS = {
    'event': [
        (r'\b(?:hackathon|codeathon|workshop|seminar|webinar|fest|competition|contest)\b', 5),
        (r'\b(?:register|registration|rsvp|sign\s*up)\b', 4),
        (r'(?:prize\s*pool|prizes?|goodies|certificates?)\b', 3),
        (r'\b(?:team|members?\s+per\s+team|cross.?departmental)\b', 2),
        (r'\b(?:rounds?|round\s*\d)\b', 2),
        (r'https?://\S+', 2),
    ],
    'exam': [
        (r'\b(?:internal\s+assessment|IA\s*[-]?\s*(?:I{1,3}|[1-3]))\b', 5),
        (r'\b(?:exam|examination|end\s*sem|endsem)\b', 4),
        (r'\b(?:oral|practical|viva|oral\s+practical)\b', 4),
        (r'\btimetable\b.*\b(?:assessment|exam|oral|practical)\b', 5),
    ],
    'assignment': [
        (r'\b(?:assignment|submission|submit|due\s+date)\b', 5),
        (r'\b(?:file\s+correction|miniproject|project\s+report)\b', 4),
        (r'\b(?:contents?\s+of\s+the\s+file|index|tutorial\s+sheets?)\b', 3),
    ],
    'lab': [
        (r'\b(?:extra\s+lab|lab\s+session|lab\s+scheduled)\b', 5),
        (r'\b(?:batch\s+[A-Z]\d|[A-Z]\d\s+batch)\b', 3),
        (r'\blab\b.*\b(?:start|wind\s*up|sharp)\b', 3),
    ],
    'timetable': [
        (r'\b(?:timetable|schedule|lecture\s+schedule)\b', 5),
        (r'\b(?:slight\s+change|change\s+in.*timetable)\b', 5),
        (r'\b(?:tomorrow.s?\s+lecture|today.s?\s+timetable)\b', 4),
        (r'\b(?:remains?\s+unchanged)\b', 3),
    ],
    'notice': [
        (r'\b(?:please\s+note|kindly\s+note|note\s+that|attention)\b', 3),
        (r'\b(?:dear\s+students|all\s+(?:the\s+)?students)\b', 2),
    ],
}

_MSG_MIN_SCORE = 3

_IGNORE_PATTERNS = [
    r'^(?:ok|okay|thanks|thank\s*you|yes|no|sure|done|noted|good|great|nice|lol|haha)[\s!.]*$',
    r'^(?:hi|hello|hey|gm|good\s+morning|good\s+night|bye)[\s!.]*$',
    r'^\S+$',
]


def _msg_score(text):
    score = 0
    text_lower = text.lower()
    for patterns in CATEGORY_SIGNALS.values():
        for pattern, weight in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                score += weight
    if re.search(r'\b(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b', text_lower):
        score += 2
    MTHS = r'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
    if re.search(rf'\b\d{{1,2}}(?:st|nd|rd|th)?\s+(?:{MTHS})', text, re.IGNORECASE):
        score += 2
    if re.search(r'\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b', text_lower):
        score += 1
    if re.search(r'\b(?:venue|room|lab|classroom)\s*:?\s*\d', text_lower):
        score += 1
    if len(text) < 50:
        score -= 2
    return score


def is_informational(text):
    """Check if a text message contains actionable info worth saving."""
    if not text or len(text.strip()) < 30:
        return False
    text_clean = text.strip()
    for pat in _IGNORE_PATTERNS:
        if re.match(pat, text_clean, re.IGNORECASE):
            return False
    return _msg_score(text_clean) >= _MSG_MIN_SCORE


def classify_message(text):
    """Classify a message into: event, exam, assignment, lab, timetable, notice."""
    scores = {}
    text_lower = text.lower()
    for category, patterns in CATEGORY_SIGNALS.items():
        total = 0
        for pattern, weight in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                total += weight
        scores[category] = total
    best = max(scores, key=scores.get)
    if scores[best] >= _MSG_MIN_SCORE:
        return best
    if re.search(r'\b(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b', text_lower):
        return 'notice'
    MTHS = r'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
    if re.search(rf'\b\d{{1,2}}(?:st|nd|rd|th)?\s+(?:{MTHS})', text, re.IGNORECASE):
        return 'notice'
    return 'notice'


def _msg_generate_title(text, category):
    """Auto-generate a concise title from message content."""
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    if category == 'event':
        for line in lines[:10]:
            clean = re.sub(r'[^a-zA-Z0-9\s\'\-!:,.]', '', line).strip()
            if not clean:
                continue
            if re.match(r'^[A-Z][A-Z\s\'\-!]+$', clean) and 3 < len(clean) < 50:
                return clean.title()
            m = re.match(r'^(.+?)\s+is\s+(?:finally\s+)?here', clean, re.IGNORECASE)
            if m:
                return m.group(1).strip()

    if category == 'exam':
        m = re.search(r'(Internal\s+Assessment\s*(?:I{1,3}|[1-3])?|Oral\s+Practical|End\s*Sem(?:ester)?)', text, re.IGNORECASE)
        if m:
            return m.group(1).strip().title()

    if category == 'assignment':
        m = re.search(r'([\w\s]+?assignment\s*\d*|file\s+correction|miniproject\s+report)', text, re.IGNORECASE)
        if m:
            return m.group(1).strip().title()

    if category == 'lab':
        batch = ''
        m_batch = re.search(r'([A-Z]\d)\s+batch|batch\s+([A-Z]\d)', text, re.IGNORECASE)
        if m_batch:
            batch = f" ({(m_batch.group(1) or m_batch.group(2)).upper()})"
        m_lab = re.search(r'(?:extra\s+)?lab.*?(?:for\s+)?([\w\s]+?)(?:\s+lab|\s+tomorrow|\s+on\s)', text, re.IGNORECASE)
        if m_lab:
            lab_name = m_lab.group(1).strip()
            if len(lab_name) < 30:
                return f"{lab_name} Lab{batch}".strip().title()
        return f"Extra Lab Session{batch}"

    if category == 'timetable':
        if re.search(r'change', text, re.IGNORECASE):
            return "Timetable Change"
        return "Lecture Schedule Update"

    for line in lines:
        clean = re.sub(r'[^\w\s\-\':,]', '', line).strip()
        if len(clean) > 10 and len(clean) < 60 and re.search(r'[a-zA-Z]', clean):
            return clean[:50]
    return "Notice"


def extract_message_details(text):
    """Extract structured data from a text message. Returns event-compatible dict."""
    category = classify_message(text)
    MTHS = r'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec'

    # ── Date extraction ─────────────────────────────────────────
    date_found = None
    m = re.search(rf'(?:starting\s+from|from|on)\s+(\d{{1,2}}(?:st|nd|rd|th)?\s+(?:{MTHS})(?:[,\s]+\d{{4}})?)', text, re.IGNORECASE)
    if m:
        date_found = parse_date(m.group(1))
    if not date_found:
        if re.search(r'\btomorrow\b', text, re.IGNORECASE):
            date_found = (datetime.now() + timedelta(days=1)).strftime("%d %m %Y")
        elif re.search(r'\btoday\b', text, re.IGNORECASE):
            date_found = datetime.now().strftime("%d %m %Y")
    if not date_found:
        m = re.search(r'(?:on\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*\((\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+\w+)\)', text, re.IGNORECASE)
        if m:
            date_found = parse_date(m.group(1))
    if not date_found:
        m = re.search(r'\((\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\)', text)
        if m:
            date_found = parse_date(m.group(1))
    if not date_found:
        m = re.search(rf'\b(\d{{1,2}}(?:st|nd|rd|th)?\s+(?:{MTHS})(?:[,\s]+\d{{4}})?)\b', text, re.IGNORECASE)
        if m:
            date_found = parse_date(m.group(1))
    if not date_found:
        m = re.search(r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b', text)
        if m:
            date_found = parse_date(m.group(1))

    # ── Time extraction ─────────────────────────────────────────
    time_found = None
    m = re.search(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)', text, re.IGNORECASE)
    if m:
        time_found = m.group(1).strip()
    if not time_found:
        m = re.search(r'(?:at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))', text, re.IGNORECASE)
        if m:
            time_found = m.group(1).strip()

    # ── Venue extraction ────────────────────────────────────────
    venue = None
    m = re.search(r'(?:venue|location|room|classroom|lab)\s*:?\s*(\d{2,4}[A-Za-z]?)', text, re.IGNORECASE)
    if m:
        venue = m.group(0).strip()
    if not venue:
        m = re.search(r'\bin\s+(?:lab\s+)?(\d{3}[A-Za-z]?)\b', text, re.IGNORECASE)
        if m:
            venue = m.group(1).strip()
    if not venue:
        m = re.search(r'(?:in|at)\s+((?:lab|room|classroom|hall)\s*[-\s]?\d{2,4}[A-Za-z]?)', text, re.IGNORECASE)
        if m:
            venue = m.group(1).strip().title()

    # ── Registration link ───────────────────────────────────────
    reg_link = None
    m = re.search(r'(https?://\S+)', text)
    if m:
        reg_link = m.group(1).strip().rstrip(')')

    # ── Batch info for summary ──────────────────────────────────
    batches = re.findall(r'\b([A-Z]\d)\s*(?:batch|[-:])', text, re.IGNORECASE)
    if not batches:
        batches = re.findall(r'\bbatch\s+([A-Z]\d)\b', text, re.IGNORECASE)
    if not batches:
        m = re.search(r'([A-Z]\d(?:\s*,\s*[A-Z]\d)+)', text)
        if m:
            batches = re.findall(r'[A-Z]\d', m.group(1))

    # ── Schedule slots ──────────────────────────────────────────
    schedule_lines = []
    for line in text.split('\n'):
        line = line.strip()
        if re.search(r'\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?', line, re.IGNORECASE):
            if len(line) > 5:
                schedule_lines.append(line)
        elif re.search(r'\d{1,2}:\d{2}\s*(?:am|pm)', line, re.IGNORECASE) and re.search(r'[a-zA-Z]{2,}', line):
            schedule_lines.append(line)

    # ── Summary ─────────────────────────────────────────────────
    summary_parts = []
    if batches:
        summary_parts.append(f"Batches: {', '.join(b.upper() for b in batches)}")
    if schedule_lines:
        summary_parts.append("Schedule: " + " | ".join(schedule_lines[:4]))
    elif len(text) > 50:
        meaningful = []
        for line in text.split('\n'):
            clean = re.sub(r'[^\w\s\-\':,.!?@/()]', '', line).strip()
            if len(clean) > 15 and re.search(r'[a-zA-Z]{3,}', clean):
                meaningful.append(clean)
            if len(meaningful) >= 3:
                break
        if meaningful:
            summary_parts.append('; '.join(meaningful))
    summary = ' | '.join(summary_parts) if summary_parts else text[:200].strip()

    # ── Title ───────────────────────────────────────────────────
    title = _msg_generate_title(text, category)

    # ── Prize (for events) ──────────────────────────────────────
    prize = None
    if category == 'event':
        m = re.search(r'(?:prize\s*pool|prizes?\s*worth?)\s*:?\s*(?:Rs\.?|Rs)\s*([\d,]+)', text, re.IGNORECASE)
        if m:
            val = m.group(1).replace(',', '')
            if val.isdigit():
                prize = f"Rs.{int(val):,}"

    # ── Team size (for events) ──────────────────────────────────
    team_size = None
    if category == 'event':
        m = re.search(r'(\d+)\s*members?\s+per\s+team', text, re.IGNORECASE)
        if m:
            team_size = m.group(1)

    return {
        "title": title,
        "date": date_found,
        "time": time_found,
        "venue": venue,
        "summary": summary,
        "reg_link": reg_link,
        "prize": prize,
        "team_size": team_size,
        "department": None,
        "deadline": None,
        "domains": None,
        "contact": None,
        "ocr_engine": "text_parser",
        "raw_text": text.strip(),
        "_category": category,
    }
