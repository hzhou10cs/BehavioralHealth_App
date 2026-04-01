from __future__ import annotations

from dataclasses import dataclass

from app.schemas import Message
from app.services.chatbox.client import OpenAIStyleClient
from app.services.chatbox.prompts import (
    COACH_SYSTEM_PROMPT_FEWSHOT,
    COACH_SYSTEM_PROMPT_IDENTITY,
)


@dataclass(frozen=True)
class ChatboxChatAgentConfig:
    test_mode: bool = True
    base_url: str = "http://127.0.0.1:8001"
    api_key: str | None = None
    model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    timeout_seconds: float = 60.0
    include_fewshot: bool = True
    recent_history_turns: int = 5
    base_prompt: str | None = None


class ChatboxChatAgent:
    """Backend assistant service adapted from the Chatbox_testbed chat agent."""

    def __init__(
        self,
        config: ChatboxChatAgentConfig,
        client: OpenAIStyleClient | None = None,
    ) -> None:
        self.config = config
        self.client = client or OpenAIStyleClient(
            config.base_url,
            config.model_name,
            api_key=config.api_key,
            timeout=config.timeout_seconds,
        )

    def _build_system_messages(
        self,
        *,
        prompt_patch: str | None = None,
        base_prompt: str | None = None,
        include_fewshot: bool | None = None,
    ) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = []
        base_content = (base_prompt or self.config.base_prompt or COACH_SYSTEM_PROMPT_IDENTITY).strip()
        if base_content:
            messages.append({"role": "system", "content": base_content})
        if prompt_patch:
            messages.append({"role": "system", "content": prompt_patch.strip()})

        should_include_fewshot = (
            self.config.include_fewshot if include_fewshot is None else include_fewshot
        )
        if should_include_fewshot and COACH_SYSTEM_PROMPT_FEWSHOT.strip():
            messages.append(
                {"role": "system", "content": COACH_SYSTEM_PROMPT_FEWSHOT.strip()}
            )
        return messages

    def build_system_prompt(
        self,
        *,
        prompt_patch: str | None = None,
        base_prompt: str | None = None,
        include_fewshot: bool | None = None,
    ) -> str:
        system_messages = self._build_system_messages(
            prompt_patch=prompt_patch,
            base_prompt=base_prompt,
            include_fewshot=include_fewshot,
        )
        return "\n\n---\n\n".join(message["content"] for message in system_messages)

    def format_recent_history(
        self,
        conversation_messages: list[Message],
        *,
        max_turns: int | None = None,
    ) -> str:
        lines: list[str] = []
        turns = self.config.recent_history_turns if max_turns is None else max_turns
        scoped_messages = conversation_messages[-(turns * 2) :] if turns > 0 else conversation_messages

        for message in scoped_messages:
            if message.role == "user":
                lines.append(f"User: {message.content.strip()}")
            elif message.role == "assistant":
                lines.append(f"Assistant: {message.content.strip()}")

        return "\n".join(lines).strip()

    def build_messages_from_text(
        self,
        *,
        user_input: str,
        prompt_patch: str | None = None,
        base_prompt: str | None = None,
        memory_text: str | None = None,
        recent_history_text: str | None = None,
        include_fewshot: bool | None = None,
    ) -> list[dict[str, str]]:
        messages = self._build_system_messages(
            prompt_patch=prompt_patch,
            base_prompt=base_prompt,
            include_fewshot=include_fewshot,
        )
        if memory_text:
            messages.append({"role": "user", "content": memory_text})
        if recent_history_text:
            messages.append({"role": "user", "content": recent_history_text})
        if user_input.strip():
            messages.append({"role": "user", "content": user_input.strip()})
        return messages

    def build_messages(
        self,
        conversation_messages: list[Message],
        *,
        max_history_messages: int = 12,
        prompt_patch: str | None = None,
        base_prompt: str | None = None,
        memory_text: str | None = None,
        include_fewshot: bool | None = None,
    ) -> list[dict[str, str]]:
        latest_user_message = next(
            (
                message.content
                for message in reversed(conversation_messages)
                if message.role == "user"
            ),
            "",
        )
        history_scope = conversation_messages[:-1] if conversation_messages else []
        recent_history_text = self.format_recent_history(
            history_scope[-max_history_messages:]
        )

        return self.build_messages_from_text(
            user_input=latest_user_message,
            prompt_patch=prompt_patch,
            base_prompt=base_prompt,
            memory_text=memory_text,
            recent_history_text=(
                f"Recent chat history:\n{recent_history_text}"
                if recent_history_text
                else None
            ),
            include_fewshot=include_fewshot,
        )

    def reply_from_conversation(
        self,
        conversation_messages: list[Message],
        *,
        prompt_patch: str | None = None,
        base_prompt: str | None = None,
        memory_text: str | None = None,
    ) -> str:
        user_messages = [
            message for message in conversation_messages if message.role == "user"
        ]

        if not user_messages:
            return (
                "Hello, I am here to support you. Share what is on your mind, "
                "and I will respond with a sample reflection."
            )

        latest_user_message = user_messages[-1].content.strip()
        if self.config.test_mode:
            return (
                "Thanks for sharing that. I hear you saying: "
                f"'{latest_user_message}'. "
                "I would encourage you to pause, take one slow breath, and name "
                "one small next step you can take today."
            )

        request_messages = self.build_messages(
            conversation_messages,
            prompt_patch=prompt_patch,
            base_prompt=base_prompt,
            memory_text=memory_text,
        )
        try:
            return self.client.chat(request_messages)
        except Exception as exc:
            return (
                "[LLM error] Failed to get reply from the migrated chat service: "
                f"{exc}"
            )
