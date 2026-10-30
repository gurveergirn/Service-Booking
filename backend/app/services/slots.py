"""Pure time-slot arithmetic, kept free of I/O so it is easy to test."""
from datetime import time
from typing import Iterable, List, Optional, Tuple

Interval = Tuple[time, time]


def to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def from_minutes(m: int) -> time:
    return time(m // 60, m % 60)


def add_minutes(t: time, minutes: int) -> Optional[time]:
    """Returns None if the result spills past midnight."""
    total = to_minutes(t) + minutes
    if total >= 24 * 60:
        return None
    return from_minutes(total)


def overlaps(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and b_start < a_end


def compute_slots(
    windows: Iterable[Interval],
    busy: Iterable[Interval],
    duration_minutes: int,
    step_minutes: int,
    not_before: Optional[time] = None,
) -> List[Interval]:
    """Start times (every `step_minutes` from each window start) where a
    `duration_minutes` appointment fits inside an availability window without
    touching any busy interval. `not_before` drops slots in the past.
    """
    busy_m = [(to_minutes(s), to_minutes(e)) for s, e in busy]
    floor = to_minutes(not_before) if not_before else -1
    slots: List[Interval] = []
    seen = set()
    for w_start, w_end in sorted(windows):
        start, end = to_minutes(w_start), to_minutes(w_end)
        t = start
        while t + duration_minutes <= end:
            if t > floor and t not in seen and not any(overlaps(t, t + duration_minutes, b0, b1) for b0, b1 in busy_m):
                slots.append((from_minutes(t), from_minutes(t + duration_minutes)))
                seen.add(t)
            t += step_minutes
    slots.sort()
    return slots


def fits_in_windows(windows: Iterable[Interval], start: time, end: time) -> bool:
    s, e = to_minutes(start), to_minutes(end)
    return any(to_minutes(w0) <= s and e <= to_minutes(w1) for w0, w1 in windows)
