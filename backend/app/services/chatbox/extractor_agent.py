from __future__ import annotations

import re

from app.services.chatbox.client import OpenAIStyleClient
from app.services.chatbox.extractor_prompts import EXAMPLES_B, PROMPT_EXTRACT, SESSION_SUMMARY


def _format_extractor_input(agent_text: str | None, user_text: str) -> str:
    assistant = agent_text.strip() if agent_text else "NULL"
    return f"Agent: {assistant}\nUser: {user_text.strip()}"


def _infer_domain(user_text: str) -> str:
    text = user_text.lower()
    if any(word in text for word in ["sleep", "bed", "tired", "wake", "night"]):
        return "sleep"
    if any(word in text for word in ["walk", "exercise", "gym", "run", "activity"]):
        return "activity"
    if any(word in text for word in ["eat", "food", "meal", "breakfast", "nutrition"]):
        return "nutrition"
    return "sleep"


class ChatboxExtractorAgent:
    def __init__(
        self,
        *,
        test_mode: bool,
        base_url: str,
        model_name: str,
        api_key: str | None = None,
        timeout_seconds: float = 60.0,
        debug_logging: bool = False,
    ) -> None:
        self.test_mode = test_mode
        self.client = OpenAIStyleClient(
            base_url,
            model_name,
            api_key=api_key,
            timeout=timeout_seconds,
            debug_logging=debug_logging,
            component_name="extractor_agent",
        )

    def build_messages(self, agent_text: str | None, user_text: str) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": PROMPT_EXTRACT.strip()}
        ]
        for user_example, assistant_example in EXAMPLES_B:
            messages.append({"role": "user", "content": user_example})
            messages.append({"role": "assistant", "content": assistant_example})
        messages.append(
            {"role": "user", "content": _format_extractor_input(agent_text, user_text)}
        )
        return messages

    def extract_summary_json(self, agent_text: str | None, user_text: str) -> str:
        if self.test_mode:
            if not user_text.strip():
                return "NONE"

            domain = _infer_domain(user_text)
            lower_text = user_text.lower()
            if any(word in lower_text for word in ["too tired", "can't", "cannot", "overwhelmed", "busy", "hard"]):
                field = "barrier"
            elif re.search(r"\b\d+\s*(minute|minutes|hour|hours)\b", lower_text):
                field = "goal_set->Measurable"
            elif any(word in lower_text for word in ["will ", "plan", "going to", "start "]):
                field = "goal_set->Specific"
            else:
                field = "current_status"

            return f'<STATE>\n{domain}->{field}: "{user_text.strip()}"\n</STATE>'

        messages = self.build_messages(agent_text, user_text)
        try:
            return self.client.chat(messages, temperature=0.2, max_tokens=256)
        except Exception as exc:
            return f"[Extractor error] {exc}"

    def generate_session_report(
        self,
        conversation_messages: list[dict[str, str]] | list[tuple[str, str]],
        *,
        session_label: str,
    ) -> str:
        if self.test_mode:
            lines: list[str] = []
            for item in conversation_messages[-3:]:
                if isinstance(item, dict):
                    role = item.get("role", "")
                    content = item.get("content", "")
                    lines.append(f"{role.capitalize()}: {content}")
                else:
                    user_text, assistant_text = item
                    lines.append(f"User: {user_text}")
                    lines.append(f"Assistant: {assistant_text}")
            last_line = lines[-1] if lines else "No messages yet."
            return (
                f"Session Stage Report - Session {session_label}\n"
                "Session with details:\n"
                f"The conversation focused on the user's recent update. Latest note: {last_line}\n"
                "Compact agreement:\n"
                "The user and coach identified the most recent concern and a next step to revisit.\n"
                "Suggested opening (for next session):\n"
                "What felt most manageable since our last conversation?"
            )

        transcript: list[str] = []
        for item in conversation_messages:
            if isinstance(item, dict):
                transcript.append(f"{item.get('role', 'user').capitalize()}: {item.get('content', '')}")
            else:
                user_text, assistant_text = item
                transcript.append(f"User: {user_text}")
                transcript.append(f"Assistant: {assistant_text}")

        messages = [
            {"role": "system", "content": SESSION_SUMMARY},
            {
                "role": "user",
                "content": "Generate a Session Stage Report that will seed the next coaching session.\n"
                + "\n".join(transcript).strip(),
            },
        ]
        return self.client.chat(messages, temperature=0.2, max_tokens=512)
