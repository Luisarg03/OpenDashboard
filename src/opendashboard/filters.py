"""Jinja2 template filters."""
from datetime import datetime


def timestamp_to_str(ts: int) -> str:
    """Convert millisecond timestamp to human-readable string."""
    return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M")


def register_template_filters(templates):
    """Register all custom filters with a Jinja2 template environment."""
    templates.env.filters["timestamp_to_str"] = timestamp_to_str
