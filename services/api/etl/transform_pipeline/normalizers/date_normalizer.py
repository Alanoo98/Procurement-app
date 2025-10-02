from datetime import datetime
import re

DANISH_MONTHS = {
    "januar": "01", "februar": "02", "marts": "03",
    "april": "04", "maj": "05", "juni": "06",
    "juli": "07", "august": "08", "september": "09",
    "oktober": "10", "november": "11", "december": "12"
}

def normalize_date(date_str):
    if not date_str or not isinstance(date_str, str):
        return None
    date_str = date_str.strip().lower()
    for dk_month, num in DANISH_MONTHS.items():
        if dk_month in date_str:
            date_str = re.sub(rf"\b{dk_month}\b", num, date_str)
            break
    date_str = re.sub(r"[^\d]", "-", date_str)
    for fmt in ["%d-%m-%Y", "%Y-%m-%d"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except:
            continue
    return None
