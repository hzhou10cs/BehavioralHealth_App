from __future__ import annotations

import json
import re
from typing import Any


ALLOWED_DOMAINS = {"activity", "nutrition", "sleep"}
ALLOWED_GOAL_KEYS = {
    "Specific",
    "Measurable",
    "Attainable",
    "Reward",
    "Timeframe",
}


def ensure_fixed_state_shape(state: dict[str, Any] | None) -> dict[str, Any]:
    result = dict(state or {})
    result.setdefault("session", {})
    result["session"].setdefault("session_timestamp", "")
    result["session"].setdefault(
        "agenda", "Choose one domain to focus on: activity, nutrition, or sleep."
    )
    for domain in ALLOWED_DOMAINS:
        result.setdefault(domain, {})
        result[domain].setdefault("existing_plan", "")
        result[domain].setdefault("progress_made", "")
        result[domain].setdefault("current_status", "")
        result[domain].setdefault("barrier", "")
        result[domain].setdefault("goal_set", {})
        for key in ALLOWED_GOAL_KEYS:
            result[domain]["goal_set"].setdefault(key, "")
    return result


def state_to_text(state: dict[str, Any] | None) -> str:
    return json.dumps(ensure_fixed_state_shape(state), ensure_ascii=False, indent=2)


def build_initial_cst(session_timestamp: str) -> dict[str, Any]:
    state = ensure_fixed_state_shape({})
    state["session"]["session_timestamp"] = session_timestamp
    return state


def parse_and_clean_deltas(delta_output: str | None) -> list[tuple[list[str], str]]:
    if not delta_output:
        return []
    text = delta_output.strip()
    if not text or text.upper() == "NONE":
        return []

    match = re.search(r"<STATE>\s*(.*?)\s*</STATE>", text, flags=re.DOTALL | re.IGNORECASE)
    body = match.group(1) if match else text
    updates: list[tuple[list[str], str]] = []

    for raw_line in body.splitlines():
        line = raw_line.strip().rstrip(",")
        if not line or ":" not in line:
            continue
        path_text, value_text = line.split(":", 1)
        path = [part.strip() for part in path_text.split("->") if part.strip()]
        value = value_text.strip().strip('"').strip("'")
        if not path or not value:
            continue
        updates.append((path, value))

    return updates


def apply_delta_text(
    state: dict[str, Any] | None,
    delta_output: str | None,
) -> dict[str, Any]:
    result = ensure_fixed_state_shape(state)

    for path, value in parse_and_clean_deltas(delta_output):
        root = path[0]
        if root not in ALLOWED_DOMAINS:
            continue
        if len(path) == 2 and path[1] in {
            "existing_plan",
            "progress_made",
            "current_status",
            "barrier",
        }:
            result[root][path[1]] = value
            continue
        if len(path) == 3 and path[1] == "goal_set" and path[2] in ALLOWED_GOAL_KEYS:
            result[root]["goal_set"][path[2]] = value

    return result
