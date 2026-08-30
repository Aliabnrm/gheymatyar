from collections import OrderedDict, deque
from datetime import UTC, datetime, timedelta
from threading import Lock


class LoginRateLimiter:
    def __init__(self, *, max_failures: int, window_seconds: int, max_entries: int) -> None:
        self._max_failures = max_failures
        self._window = timedelta(seconds=window_seconds)
        self._max_entries = max_entries
        self._failures: OrderedDict[str, deque[datetime]] = OrderedDict()
        self._lock = Lock()

    @property
    def entry_count(self) -> int:
        with self._lock:
            return len(self._failures)

    def retry_after(self, key: str, *, now: datetime | None = None) -> int | None:
        checked_at = now or datetime.now(UTC)
        with self._lock:
            failures = self._prune_key(key, checked_at)
            if len(failures) < self._max_failures:
                return None
            remaining = self._window - (checked_at - failures[0])
            return max(1, int(remaining.total_seconds()) + 1)

    def record_failure(self, key: str, *, now: datetime | None = None) -> None:
        recorded_at = now or datetime.now(UTC)
        with self._lock:
            failures = self._prune_key(key, recorded_at)
            failures.append(recorded_at)
            self._failures[key] = failures
            self._failures.move_to_end(key)
            while len(self._failures) > self._max_entries:
                self._failures.popitem(last=False)

    def clear(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def _prune_key(self, key: str, now: datetime) -> deque[datetime]:
        failures = self._failures.get(key, deque())
        threshold = now - self._window
        while failures and failures[0] <= threshold:
            failures.popleft()
        if failures:
            self._failures[key] = failures
            self._failures.move_to_end(key)
        else:
            self._failures.pop(key, None)
        return failures
