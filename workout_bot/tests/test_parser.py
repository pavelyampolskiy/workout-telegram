import pytest
from parser import parse_set, SetEntry


# ── Valid formats ─────────────────────────────────────────────────────────────

def test_basic_latin_x():
    result = parse_set("140x12")
    assert result == SetEntry(weight=140.0, reps=12)


def test_uppercase_latin_x():
    result = parse_set("100X10")
    assert result == SetEntry(weight=100.0, reps=10)


def test_asterisk_separator():
    result = parse_set("80*5")
    assert result == SetEntry(weight=80.0, reps=5)


def test_cyrillic_lowercase_x():
    result = parse_set("140х12")  # cyrillic х
    assert result == SetEntry(weight=140.0, reps=12)


def test_cyrillic_uppercase_x():
    result = parse_set("140Х12")  # cyrillic Х
    assert result == SetEntry(weight=140.0, reps=12)


def test_decimal_weight_with_dot():
    result = parse_set("102.5x8")
    assert result == SetEntry(weight=102.5, reps=8)


def test_decimal_weight_with_comma():
    result = parse_set("102,5x8")
    assert result == SetEntry(weight=102.5, reps=8)


def test_spaces_around_separator():
    result = parse_set("140 x 12")
    assert result == SetEntry(weight=140.0, reps=12)


def test_leading_trailing_whitespace():
    result = parse_set("  60x20  ")
    assert result == SetEntry(weight=60.0, reps=20)


def test_single_rep():
    result = parse_set("200x1")
    assert result == SetEntry(weight=200.0, reps=1)


def test_max_reps():
    result = parse_set("20x100")
    assert result == SetEntry(weight=20.0, reps=100)


def test_small_weight():
    result = parse_set("0.5x10")
    assert result == SetEntry(weight=0.5, reps=10)


def test_large_weight():
    result = parse_set("500x1")
    assert result == SetEntry(weight=500.0, reps=1)


# ── Invalid formats ───────────────────────────────────────────────────────────

def test_empty_string_raises():
    with pytest.raises(ValueError):
        parse_set("")


def test_garbage_raises():
    with pytest.raises(ValueError):
        parse_set("hello world")


def test_missing_reps_raises():
    with pytest.raises(ValueError):
        parse_set("140x")


def test_missing_weight_raises():
    with pytest.raises(ValueError):
        parse_set("x12")


def test_zero_weight_raises():
    with pytest.raises(ValueError, match="Weight must be greater than 0"):
        parse_set("0x10")


def test_zero_reps_raises():
    with pytest.raises(ValueError, match="Reps must be between 1 and 100"):
        parse_set("100x0")


def test_reps_over_100_raises():
    with pytest.raises(ValueError, match="Reps must be between 1 and 100"):
        parse_set("50x101")


def test_negative_weight_raises():
    with pytest.raises(ValueError):
        parse_set("-10x5")


def test_only_number_raises():
    with pytest.raises(ValueError):
        parse_set("140")


def test_two_separators_raises():
    with pytest.raises(ValueError):
        parse_set("140x12x3")
