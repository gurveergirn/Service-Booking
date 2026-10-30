from datetime import time

from app.services.slots import add_minutes, compute_slots, fits_in_windows


def t(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


def starts(slots):
    return [s.strftime("%H:%M") for s, _ in slots]


def test_slots_fill_window_at_step():
    slots = compute_slots([(t("09:00"), t("11:00"))], [], 60, 30)
    assert starts(slots) == ["09:00", "09:30", "10:00"]
    assert slots[-1][1] == t("11:00")


def test_busy_intervals_are_excluded():
    slots = compute_slots([(t("09:00"), t("12:00"))], [(t("10:00"), t("10:30"))], 30, 30)
    assert starts(slots) == ["09:00", "09:30", "10:30", "11:00", "11:30"]


def test_long_service_cannot_straddle_booking():
    slots = compute_slots([(t("09:00"), t("12:00"))], [(t("10:00"), t("10:30"))], 60, 30)
    assert starts(slots) == ["09:00", "10:30", "11:00"]


def test_not_before_drops_past_times():
    slots = compute_slots([(t("09:00"), t("12:00"))], [], 60, 30, not_before=t("09:45"))
    assert starts(slots) == ["10:00", "10:30", "11:00"]


def test_multiple_windows_sorted_and_deduplicated():
    windows = [(t("13:00"), t("14:00")), (t("09:00"), t("10:00"))]
    assert starts(compute_slots(windows, [], 60, 30)) == ["09:00", "13:00"]


def test_service_longer_than_window_has_no_slots():
    assert compute_slots([(t("09:00"), t("10:00"))], [], 90, 30) == []


def test_fits_in_windows():
    windows = [(t("09:00"), t("12:00"))]
    assert fits_in_windows(windows, t("09:00"), t("12:00"))
    assert not fits_in_windows(windows, t("11:30"), t("12:30"))


def test_add_minutes_rejects_overflow_past_midnight():
    assert add_minutes(t("23:00"), 30) == t("23:30")
    assert add_minutes(t("23:30"), 30) is None
