# states.py
from aiogram.fsm.state import State, StatesGroup


class Flow(StatesGroup):
    home = State()
    new_workout = State()
    day_menu = State()
    set_input = State()
    rest_timer = State()
    cardio_input = State()
    history_menu = State()
    history_entry_actions = State()
    history_edit_select_ex = State()
    history_edit_select_set = State()
    history_edit_set_input = State()
    add_custom_exercise = State()
    add_custom_exercise_group = State()
