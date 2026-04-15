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


def _ensure_domain_shape(domain_state: dict[str, Any] | None) -> dict[str, Any]:
    result = dict(domain_state or {})
    result.setdefault("existing_plan", "")
    result.setdefault("progress_made", "")
    result.setdefault("current_status", "")
    result.setdefault("barrier", "")
    goal_set = result.setdefault("goal_set", {})
    for key in ALLOWED_GOAL_KEYS:
        goal_set.setdefault(key, {})
    return result


def ensure_fixed_state_shape(state: dict[str, Any] | None) -> dict[str, Any]:
    result = dict(state or {})
    result.setdefault("session", {})
    result["session"].setdefault("session_timestamp", "")
    result["session"].setdefault(
        "agenda", "Choose one domain to focus on: activity, nutrition, or sleep."
    )
    result.setdefault("allowed_domains", sorted(ALLOWED_DOMAINS))
    for domain in ALLOWED_DOMAINS:
        result[domain] = _ensure_domain_shape(result.get(domain))
    return result


def state_to_text(state: dict[str, Any] | None) -> str:
    return json.dumps(ensure_fixed_state_shape(state), ensure_ascii=False, indent=2)


def _ensure_session_entry(state: dict[str, Any], session_num: int | None) -> dict[str, Any]:
    if session_num is None:
        return state
    session_key = f"session_{session_num}"
    for domain in ALLOWED_DOMAINS:
        domain_state = state.setdefault(domain, {})
        goal_set = domain_state.setdefault("goal_set", {})
        for key in ALLOWED_GOAL_KEYS:
            existing = goal_set.get(key, {})
            if not isinstance(existing, dict):
                existing = {"legacy": [existing] if existing else []}
            existing.setdefault(session_key, [])
            goal_set[key] = existing

        barrier = domain_state.get("barrier", {})
        if not isinstance(barrier, dict):
            barrier = {"legacy": [barrier] if barrier else []}
        barrier.setdefault(session_key, [])
        domain_state["barrier"] = barrier
    return state


def build_initial_cst(
    session_timestamp: str, session_num: int | None = None
) -> dict[str, Any]:
    state = ensure_fixed_state_shape({})
    state["session"]["session_timestamp"] = session_timestamp
    return _ensure_session_entry(state, session_num)


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
    session_num: int | None = None,
) -> dict[str, Any]:
    result = _ensure_session_entry(ensure_fixed_state_shape(state), session_num)
    session_key = f"session_{session_num}" if session_num is not None else None

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
            if path[1] == "barrier" and session_key:
                barrier_state = result[root].get("barrier", {})
                if not isinstance(barrier_state, dict):
                    barrier_state = {"legacy": [barrier_state] if barrier_state else []}
                per_session_items = barrier_state.get(session_key, [])
                if not isinstance(per_session_items, list):
                    per_session_items = [per_session_items] if per_session_items else []
                if value and value not in per_session_items:
                    per_session_items.append(value)
                barrier_state[session_key] = per_session_items
                result[root]["barrier"] = barrier_state
            else:
                result[root][path[1]] = value
            continue
        if len(path) == 3 and path[1] == "goal_set" and path[2] in ALLOWED_GOAL_KEYS:
            if session_key:
                goal_state = result[root]["goal_set"].get(path[2], {})
                if not isinstance(goal_state, dict):
                    goal_state = {"legacy": [goal_state] if goal_state else []}
                per_session_items = goal_state.get(session_key, [])
                if not isinstance(per_session_items, list):
                    per_session_items = [per_session_items] if per_session_items else []
                if value and value not in per_session_items:
                    per_session_items.append(value)
                goal_state[session_key] = per_session_items
                result[root]["goal_set"][path[2]] = goal_state
            else:
                result[root]["goal_set"][path[2]] = value

    return result
