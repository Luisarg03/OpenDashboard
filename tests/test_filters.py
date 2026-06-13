"""Tests for template filters."""
from opendashboard.filters import timestamp_to_str


class TestTimestampToStr:
    def test_format(self):
        result = timestamp_to_str(1700006400000)
        assert isinstance(result, str)
        assert len(result) == 16  # "YYYY-MM-DD HH:MM"

    def test_zero(self):
        result = timestamp_to_str(0)
        assert isinstance(result, str)
        assert len(result) == 16
