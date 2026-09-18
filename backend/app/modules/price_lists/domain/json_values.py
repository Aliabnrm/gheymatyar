import math
from collections.abc import Mapping, Sequence
from datetime import date, datetime, time
from decimal import Decimal


def to_json_value(value: object) -> object:
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else str(value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Mapping):
        return {str(key): to_json_value(item) for key, item in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [to_json_value(item) for item in value]
    return str(value)


def json_safe_mapping(value: Mapping[str, object]) -> dict[str, object]:
    return {str(key): to_json_value(item) for key, item in value.items()}
