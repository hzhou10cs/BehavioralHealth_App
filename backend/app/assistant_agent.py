from app.config import get_settings
from app.schemas import Message
from app.services.chatbox import ChatboxChatAgent, ChatboxChatAgentConfig
from app.services.chatbox.extractor_agent import ChatboxExtractorAgent


def build_assistant_memory(
    *,
    latest_session_report: str,
    coach_state_text: str,
) -> str:
    memory_parts: list[str] = []
    if latest_session_report:
        memory_parts.append("Last session report:\n" + latest_session_report)
    if coach_state_text:
        memory_parts.append("Current CST:\n" + coach_state_text)
    return "\n\n".join(memory_parts)


def generate_assistant_reply(
    messages: list[Message],
    *,
    memory_text: str = "",
    prompt_patch: str | None = None,
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
        )
    )
    return agent.reply_from_conversation(
        messages, memory_text=memory_text, prompt_patch=prompt_patch
    )


def build_extractor_agent() -> ChatboxExtractorAgent:
    settings = get_settings()
    return ChatboxExtractorAgent(
        test_mode=settings.assistant_test_mode,
        base_url=settings.assistant_llm_base_url,
        api_key=settings.assistant_llm_api_key,
        model_name=settings.assistant_model_name,
        timeout_seconds=settings.assistant_timeout_seconds,
    )
