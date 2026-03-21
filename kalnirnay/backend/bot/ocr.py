import pytesseract
import cv2
import numpy as np
import spacy
import dateparser
import re

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
nlp = spacy.load("en_core_web_sm")


def preprocess_image(image_path: str):
    img = cv2.imread(image_path)
    scale = 2.0
    img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 10
    )
    kernel = np.ones((2, 2), np.uint8)
    otsu_clean     = cv2.morphologyEx(otsu,     cv2.MORPH_OPEN, kernel, iterations=1)
    adaptive_clean = cv2.morphologyEx(adaptive, cv2.MORPH_OPEN, kernel, iterations=1)
    if cv2.countNonZero(otsu_clean) > cv2.countNonZero(adaptive_clean):
        return otsu_clean
    return adaptive_clean


def clean_ocr_text(line: str) -> str:
    return re.sub(r'[\\|><@#°º]', '', line).strip()


def parse_date(date_str: str):
    clean = re.sub(r'[°º]', '', date_str).strip()
    parsed = dateparser.parse(
        clean,
        settings={"PREFER_DAY_OF_MONTH": "first", "RETURN_AS_TIMEZONE_AWARE": False}
    )
    if parsed:
        if not re.search(r'\d{4}', clean):
            parsed2 = dateparser.parse(
                f"{clean} 2026",
                settings={"PREFER_DAY_OF_MONTH": "first", "RETURN_AS_TIMEZONE_AWARE": False}
            )
            if parsed2:
                parsed = parsed2
        return parsed.strftime("%Y-%m-%d")
    return None


def noise_ratio(line: str) -> float:
    if not line:
        return 1.0
    noise = len(re.findall(r'[^a-zA-Z0-9\s:,.\-–\'\"!?&()\/]', line))
    return noise / len(line)


def find_title(lines: list) -> str:
    scored = []
    for line in lines[:25]:
        line = line.strip()
        if len(line) < 6:
            continue
        if not re.search(r'[a-zA-Z]', line):
            continue
        if noise_ratio(line) > 0.25:
            continue
        if re.match(r'^\d+$', line):
            continue

        score = 0

        # High chance of title if year is mentioned
        if re.search(r'\b20\d{2}\b', line):
            score += 15
        
        # Colons usually mean sub-headings, but sometimes titles have them
        if ':' in line:
            score += 8
            
        # Mixed case is a good indicator of natural language heading
        if any(c.islower() for c in line) and any(c.isupper() for c in line):
            score += 8
            
        score += min(len(line) // 4, 10)
        
        if re.match(r'^[A-Z]', line):
            score += 5

        letters = re.findall(r'[a-zA-Z]', line)
        if letters:
            upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
            # Many hackathon posters have ALL CAPS titles. We shouldn't heavily
            # penalize ALL CAPS unless it looks like a logo or department name.
            if upper_ratio > 0.85:
                pass # Removed the generic -15 penalty for ALL CAPS

        # Penalize institute/department names heavily to avoid picking them as titles
        logo_keywords = ['INSTITUTE', 'TECHNOLOGY', 'DEPARTMENT', 'UNIVERSITY',
                         'COLLEGE', 'COUNCIL', 'SOCIETY', 'INNOVATION', 'INFORMATION',
                         'COMMITTEE', 'CELL', 'CLUB', 'CHAPTER']
        for kw in logo_keywords:
            if kw in line.upper():
                score -= 20 # Increased penalty

        # Start with funny characters -> likely noise
        if re.match(r'^[e¢•\*\-«»_]', line):
            score -= 10
        if re.search(r'[/\\{}|<>]', line):
            score -= 12

        scored.append((score, line))

    if scored:
        scored.sort(key=lambda x: x[0], reverse=True)
        print(f"\n--- TOP 3 TITLE CANDIDATES ---")
        for s, l in scored[:3]:
            print(f"Score: {s}, Line: '{l}'")
        print("------------------------------")
        return clean_ocr_text(scored[0][1])
    return "Untitled Event"


def extract_details(text: str) -> dict:
    doc = nlp(text)
    MONTHS = (r'January|February|March|April|May|June|July|'
              r'August|September|October|November|December|'
              r'Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec')

    # ── Date ─────────────────────────────────────────────────────
    date_found = None
    m = re.search(
        rf'(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)'
        rf'[\s,]+(\d{{1,2}})\s*(?:st|nd|rd|th)?\s*[°º]?\s*({MONTHS})(?:\s+(\d{{4}}))?',
        text, re.IGNORECASE
    )
    if m:
        date_found = parse_date(f"{m.group(1)} {m.group(2)} {m.group(3) or '2026'}")

    if not date_found:
        m = re.search(
            rf'\b(\d{{1,2}})\s*(?:st|nd|rd|th)?\s*[°º]?\s*({MONTHS})(?:\s+(\d{{4}}))?\b',
            text, re.IGNORECASE
        )
        if m:
            date_found = parse_date(f"{m.group(1)} {m.group(2)} {m.group(3) or '2026'}")

    if not date_found:
        m = re.search(r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b', text)
        if m:
            date_found = parse_date(m.group(1))

    # ── Deadline ─────────────────────────────────────────────────
    deadline = None
    m = re.search(
        r'(?:deadline|submit by|last date|due by|register by|registration closes?|register before)[:\s]*([^\n]+)',
        text, re.IGNORECASE
    )
    if m:
        deadline = parse_date(m.group(1).strip())

    # ── Time ─────────────────────────────────────────────────────
    time_found = None
    m = re.search(
        r'\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*[-–to]+\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?'
        r'|\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b',
        text, re.IGNORECASE
    )
    if m:
        time_found = m.group(1).strip()

    # ── Venue ────────────────────────────────────────────────────
    # Only match VENUE keyword followed by a proper room code (not bare numbers)
    venue = None
    m = re.search(
        r'\b(?:VENUE|LOCATION)\b[\s:\n]+([A-Za-z]?\d{2,4}[-–][A-Za-z0-9]+|[A-Za-z]{2,}[-\s]\d+)',
        text, re.IGNORECASE
    )
    if m:
        venue = m.group(1).strip()
    else:
        m = re.search(
            r'(?<!\d)(\d{3}[-–][A-Z]|[A-Z]{4,}\s*[-–]\s*[A-Z0-9]+)(?!\d)',
            text
        )
        if m:
            venue = m.group(1).strip()

    # ── Department ───────────────────────────────────────────────
    department = None
    m = re.search(
        r'(?:department\s+of|dept\.?\s+of|organized\s+by|conducted\s+by|presented\s+by|host|hosted\s+by)[:\s]+([^\n]+)',
        text, re.IGNORECASE
    )
    if m:
        department = m.group(1).strip()
    else:
        # Look for "Department of X" pattern anywhere
        m = re.search(r'(Department\s+of\s+[A-Za-z\s]+)', text, re.IGNORECASE)
        if m:
            department = m.group(1).strip()

    # ── Event head ───────────────────────────────────────────────
    event_head = None
    m = re.search(
        r'(?:event\s+head|event\s+coordinator|organized\s+by|faculty\s+coordinator|'
        r'contact\s+person|spoc|judges?)[:\s]+([A-Za-z\s]+)',
        text, re.IGNORECASE
    )
    if m:
        candidate = m.group(1).strip().split('\n')[0]
        if 3 < len(candidate) < 40:
            event_head = candidate
    else:
        # Look for name on line after "Event Head" label
        eh_match = re.search(r'(?:Event\s+Head|Coordinator)s?\s*\n+\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)', text, re.IGNORECASE)
        if eh_match:
            event_head = eh_match.group(1).strip()
        else:
            # Try spaCy PERSON entities — filter out generic words
            persons = [ent.text for ent in doc.ents if ent.label_ == "PERSON"
                       and len(ent.text) > 3
                       and ent.text.lower() not in ['event head', 'mach', 'nel', 'pri']]
            if persons:
                event_head = persons[0]

    # ── Prize pool ───────────────────────────────────────────────
    prize = None
    m = re.search(
        r'(?:prize|cash\s+prize|prize\s+pool|winning\s+prize|rewards?|goodies)[:\s]*'
        r'((?:rs\.?|₹|inr|usd|\$)?\s*[\d,]+(?:[kK])?(?:\s*/-)?(?:\s*(?:rs\.?|₹|inr))?)',
        text, re.IGNORECASE
    )
    if m:
        prize = m.group(1).strip() # Fixed to only extract the prize amount/group 1

    # ── Domains / tracks ─────────────────────────────────────────
    domains = []
    m = re.search(
        r'(?:domains?|tracks?|themes?|categories)[:\s]*([^\n]+(?:\n[^\n]+){0,4})',
        text, re.IGNORECASE
    )
    if m:
        raw = m.group(1)
        # Split by bullets, commas, or newlines
        parts = re.split(r'[,\n•·*]', raw)
        domains = [p.strip() for p in parts if 3 < len(p.strip()) < 50 and not ":" in p]

    # ── Team size ────────────────────────────────────────────────
    team_size = None
    m = re.search(
        r'(?:team\s*size|team\s*of|per\s*team|members?\s*per)[:\s]*(\d+(?:\s*[-–to]+\s*\d+)?)',
        text, re.IGNORECASE
    )
    if m:
        team_size = m.group(1).strip()

    # ── Registration link ────────────────────────────────────────
    reg_link = None
    m = re.search(r'(https?://[^\s]+|bit\.ly/[^\s]+|forms\.gle/[^\s]+|unstop\.com/[^\s]+)', text, re.IGNORECASE)
    if m:
        reg_link = m.group(1).strip()

    # ── Summary (bullet points / round descriptions) ─────────────
    summary_lines = []
    for line in text.split('\n'):
        line = line.strip()
        # Look for bullet points to identify summary items
        if re.match(r'^[e¢•\*·\-]\s+.{10,}', line):
            clean = re.sub(r'^[e¢•\*·\-]\s+', '', line).strip()
            summary_lines.append(clean)
    summary = '; '.join(summary_lines[:5]) if summary_lines else None

    # ── Title ────────────────────────────────────────────────────
    title = find_title(text.split('\n'))

    result = {
        "title":       title,
        "date":        date_found,
        "time":        time_found,
        "venue":       venue,
        "department":  department,
        "event_head":  event_head,
        "deadline":    deadline,
        "prize":       prize,
        "domains":     domains if domains else None,
        "team_size":   team_size,
        "reg_link":    reg_link,
        "summary":     summary,
        "raw_text":    text.strip()
    }

    print(f"\n--- EXTRACTED DETAILS ---")
    for key, value in result.items():
        if key != "raw_text":
            print(f"{key}: {value}")
    print("-------------------------\n")

    return result


def process_image(image_path: str) -> dict:
    img = preprocess_image(image_path)
    text = pytesseract.image_to_string(img, config=r'--oem 3 --psm 3')
    print(f"\n--- RAW OCR TEXT ---\n{text}\n--------------------")
    return extract_details(text)


def process_text(text: str) -> dict:
    return extract_details(text)