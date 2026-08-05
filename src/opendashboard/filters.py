"""Jinja2 template filters."""
from datetime import datetime, timedelta, timezone


def timestamp_to_str(ts: int) -> str:
    """Convert millisecond timestamp to human-readable string."""
    return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M")


def date_group_label(ts: int) -> str:
    """Convert millisecond timestamp to a date group label for timeline."""
    dt = datetime.fromtimestamp(ts / 1000)
    now = datetime.now()
    today = now.date()
    ts_date = dt.date()

    if ts_date == today:
        return "Today"

    yesterday = today - timedelta(days=1)
    if ts_date == yesterday:
        return "Yesterday"

    # Current week (Monday-Sunday)
    monday = today - timedelta(days=today.weekday())
    if ts_date >= monday:
        return "This Week"

    # Previous week
    last_monday = monday - timedelta(weeks=1)
    last_sunday = monday - timedelta(days=1)
    if last_monday <= ts_date <= last_sunday:
        return "Last Week"

    return "Older"


def month_label(ym: str) -> str:
    """Convert '2026-06' to 'Jun 2026'."""
    dt = datetime.strptime(ym + "-01", "%Y-%m-%d")
    return dt.strftime("%b %Y")


def time_ago(ts: int) -> str:
    """Convert millisecond timestamp to relative time string (e.g. '2h ago')."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    dt = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    delta = now - dt

    seconds = int(delta.total_seconds())
    if seconds < 0:
        return "just now"
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    if days < 30:
        return f"{days}d ago"
    months = days // 30
    if months < 12:
        return f"{months}mo ago"
    years = months // 12
    return f"{years}y ago"


def register_template_filters(templates):
    """Register all custom filters with a Jinja2 template environment."""
    templates.env.filters["timestamp_to_str"] = timestamp_to_str
    templates.env.filters["date_group_label"] = date_group_label
    templates.env.filters["month_label"] = month_label
    templates.env.filters["time_ago"] = time_ago
