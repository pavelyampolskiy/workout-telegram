# parser.py
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class SetEntry:
    weight: float
    reps: int


# Вес: цифры, опционально разделитель (любой символ) и ещё цифры
_SET_RE = re.compile(r"^\s*(?P<w>\d+(?:[^\d]*\d+)?)\s*([xX\*хХ])\s*(?P<r>\d+)\s*$")


def _normalize_weight(s: str) -> str:
    """Любой разделитель дробной части (запятая, пробел и т.д.) → одна точка."""
    return re.sub(r"[^\d.]+", ".", s, count=1)


def parse_set(text: str) -> SetEntry:
    text = text.strip()
    m = _SET_RE.match(text)
    if not m:
        raise ValueError("Неверный формат. Пример: 140x12")

    w_raw = _normalize_weight(m.group("w"))
    r_raw = m.group("r")

    weight = float(w_raw)
    reps = int(r_raw)

    if weight <= 0:
        raise ValueError("Вес должен быть больше 0.")
    if reps <= 0 or reps > 100:
        raise ValueError("Повторы должны быть в диапазоне 1–100.")

    return SetEntry(weight=weight, reps=reps)
