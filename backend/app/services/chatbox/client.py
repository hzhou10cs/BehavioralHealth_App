from __future__ import annotations

import json
from typing import Any
from urllib import error, request


class OpenAIStyleClient:
    """HTTP client for OpenAI-compatible chat completion endpoints."""

    def __init__(
        self,
        base_url: str,
        model_name: str,
        *,
        api_key: str | None = None,
        timeout: float = 60.0,
        debug_logging: bool = False,
        component_name: str = "chatbox",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name
        self.api_key = api_key
        self.timeout = timeout
        self.debug_logging = debug_logging
        self.component_name = component_name

    def chat(self, messages: list[dict[str, str]], **kwargs: Any) -> str:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 256),
            "stream": False,
        }
        if self.debug_logging:
            print(
                (
                    f"[LLM API][{self.component_name}] "
                    f"POST {self.base_url}/v1/chat/completions "
                    f"model={self.model_name} "
                    f"temperature={payload['temperature']} "
                    f"max_tokens={payload['max_tokens']} "
                    f"messages={json.dumps(messages, ensure_ascii=False)}"
                ),
                flush=True,
            )

        req = request.Request(
            url=f"{self.base_url}/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if self.debug_logging:
                print(
                    f"[LLM API][{self.component_name}] HTTPError status={exc.code} detail={detail}",
                    flush=True,
                )
            raise RuntimeError(
                f"LLM request failed with status {exc.code}: {detail}"
            ) from exc
        except error.URLError as exc:
            if self.debug_logging:
                print(
                    f"[LLM API][{self.component_name}] URLError reason={exc.reason}",
                    flush=True,
                )
            raise RuntimeError(f"Could not reach LLM service: {exc.reason}") from exc

        try:
            content = str(data["choices"][0]["message"]["content"])
            if self.debug_logging:
                print(
                    f"[LLM API][{self.component_name}] response_content={content}",
                    flush=True,
                )
            return content
        except (KeyError, IndexError, TypeError) as exc:
            if self.debug_logging:
                print(
                    f"[LLM API][{self.component_name}] invalid_response={json.dumps(data, ensure_ascii=False)}",
                    flush=True,
                )
            raise RuntimeError("LLM response did not match OpenAI chat format") from exc
