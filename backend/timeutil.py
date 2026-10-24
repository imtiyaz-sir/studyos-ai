import os
from datetime import datetime
from zoneinfo import ZoneInfo

APP_TIMEZONE = os.environ.get("APP_TIMEZONE", "Asia/Kolkata")


def today_local():
    """Today's date in the app's timezone. Servers (Render etc.) run in UTC, so
    date.today() is the wrong day for ~5.5 hours every night in India."""
    return datetime.now(ZoneInfo(APP_TIMEZONE)).date()
