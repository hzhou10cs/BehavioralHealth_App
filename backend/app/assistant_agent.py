from app.config import get_settings
from app.schemas import Message
from app.services.chatbox import ChatboxChatAgent, ChatboxChatAgentConfig
from app.services.chatbox.extractor_agent import ChatboxExtractorAgent
from app.services.chatbox.generator_agent import (
    ChatboxGeneratorAgent,
    ChatboxGeneratorAgentConfig,
)


def build_assistant_memory(
    *,
    previous_session_reports_text: str,
    coach_state_text: str,
) -> str:
    memory_parts: list[str] = []
    if previous_session_reports_text:
        memory_parts.append(
            "Previous session summarized reports:\n"
            + previous_session_reports_text.strip()
        )
    if coach_state_text:
        memory_parts.append("Current CST:\n" + coach_state_text)
    return "\n\n".join(memory_parts)


def generate_assistant_reply(
    messages: list[Message],
    *,
    memory_text: str = "",
    prompt_patch: str | None = None,
    base_prompt: str | None = None,
    include_fewshot: bool | None = None,
) -> str:
    settings = get_settings()
    agent = ChatboxChatAgent(
        ChatboxChatAgentConfig(
            test_mode=settings.assistant_test_mode,
            base_url=settings.assistant_llm_base_url,
            api_key=settings.assistant_llm_api_key,
            model_name=settings.assistant_model_name,
            timeout_seconds=settings.assistant_timeout_seconds,
            include_fewshot=settings.assistant_include_fewshot,
            recent_history_turns=settings.assistant_recent_history_turns,
            debug_logging=settings.assistant_debug_logging,
        )
    )
    return agent.reply_from_conversation(
        messages,
        memory_text=memory_text,
        prompt_patch=prompt_patch,
        base_prompt=base_prompt,
        include_fewshot=include_fewshot,
    )


def build_extractor_agent() -> ChatboxExtractorAgent:
    settings = get_settings()
    return ChatboxExtractorAgent(
        test_mode=settings.assistant_test_mode,
        base_url=settings.assistant_llm_base_url,
        api_key=settings.assistant_llm_api_key,
        model_name=settings.assistant_model_name,
        timeout_seconds=settings.assistant_timeout_seconds,
        debug_logging=settings.assistant_debug_logging,
    )


def build_generator_agent() -> ChatboxGeneratorAgent:
    settings = get_settings()
    return ChatboxGeneratorAgent(
        ChatboxGeneratorAgentConfig(
            test_mode=settings.assistant_test_mode,
            base_url=settings.assistant_llm_base_url,
            api_key=settings.assistant_llm_api_key,
            model_name=settings.assistant_model_name,
            timeout_seconds=settings.assistant_timeout_seconds,
            debug_logging=settings.assistant_debug_logging,
        )
    )
