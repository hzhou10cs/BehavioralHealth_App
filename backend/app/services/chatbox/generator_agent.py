from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from app.services.chatbox.client import OpenAIStyleClient
from app.services.chatbox.generator_prompts import GENERATOR_CONTRO_PROMPT

PATCH_BLOCK_RE = re.compile(r"<PATCH>\s*(.*?)\s*</PATCH>", re.IGNORECASE | re.DOTALL)


@dataclass(frozen=True)
class ChatboxGeneratorAgentConfig:
    test_mode: bool = True
    base_url: str = "http://127.0.0.1:8001"
    api_key: str | None = None
    model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    timeout_seconds: float = 60.0
    debug_logging: bool = False


class ChatboxGeneratorAgent:
    def __init__(
        self,
        config: ChatboxGeneratorAgentConfig,
        client: OpenAIStyleClient | None = None,
    ) -> None:
        self.config = config
        self.client = client or OpenAIStyleClient(
            config.base_url,
            config.model_name,
            api_key=config.api_key,
            timeout=config.timeout_seconds,
            debug_logging=config.debug_logging,
            component_name="generator_agent",
        )

    def build_messages(
        self,
        cst_state: dict[str, Any],
        *,
        chat_history_text: str | None = None,
        meta_text: str | None = None,
    ) -> list[dict[str, str]]:
        cst_text = json.dumps(cst_state, ensure_ascii=False, indent=2)
        system_text = GENERATOR_CONTRO_PROMPT.strip()
        if meta_text:
            system_text = meta_text.strip() + "\n\n" + system_text

        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_text},
            {"role": "user", "content": "CST (JSON):\n" + cst_text},
        ]
        if chat_history_text:
            messages.append(
                {
                    "role": "user",
                    "content": "Recent chat history:\n" + chat_history_text.strip(),
                }
            )
        return messages

    @staticmethod
    def _normalize_patch_text(raw_text: str) -> str:
        text = (raw_text or "").strip()
        if not text:
            return ""
        match = PATCH_BLOCK_RE.search(text)
        if not match:
            return text
        body = match.group(1).strip()
        return f"<PATCH>\n{body}\n</PATCH>"

    def generate_prompt_patch(
        self,
        cst_state: dict[str, Any],
        *,
        chat_history_text: str | None = None,
        meta_text: str | None = None,
    ) -> str:
        if self.config.test_mode:
            return ""

        messages = self.build_messages(
            cst_state,
            chat_history_text=chat_history_text,
            meta_text=meta_text,
        )
        if self.config.debug_logging:
            print(
                f"[GeneratorAgent] patch_request_messages={json.dumps(messages, ensure_ascii=False)}",
                flush=True,
            )
        try:
            response = self.client.chat(messages, temperature=0.2, max_tokens=256)
        except Exception as exc:
            if self.config.debug_logging:
                print(f"[GeneratorAgent] patch_generation_error={exc}", flush=True)
            return ""
        patch = self._normalize_patch_text(response)
        if self.config.debug_logging:
            print(f"[GeneratorAgent] patch_response={patch}", flush=True)
        return patch
