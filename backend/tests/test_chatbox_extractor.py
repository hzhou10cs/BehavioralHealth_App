from app.services.chatbox.extractor_agent import ChatboxExtractorAgent
from app.services.chatbox.state_tracker import (
    apply_delta_text,
    build_initial_cst,
    state_to_text,
)


def test_extractor_agent_test_mode_generates_state_delta():
    agent = ChatboxExtractorAgent(
        test_mode=True,
        base_url="http://127.0.0.1:8001",
        model_name="test-model",
    )

    result = agent.extract_summary_json(
        None,
        "I feel too tired after work to go to the gym.",
    )

    assert "<STATE>" in result
    assert "barrier" in result


def test_state_tracker_applies_goal_updates():
    initial = build_initial_cst("conv-1")

    updated = apply_delta_text(
        initial,
        '<STATE>\nactivity->goal_set->Specific: "Walk after lunch"\n</STATE>',
    )

    assert updated["activity"]["goal_set"]["Specific"] == "Walk after lunch"
    assert updated["session"]["session_timestamp"] == "conv-1"
    assert '"Specific": "Walk after lunch"' in state_to_text(updated)


def test_extractor_agent_test_mode_generates_session_report():
    agent = ChatboxExtractorAgent(
        test_mode=True,
        base_url="http://127.0.0.1:8001",
        model_name="test-model",
    )

    report = agent.generate_session_report(
        [
            ("I feel stressed about classes.", "What feels most urgent right now?"),
            ("Time management is the hardest part.", "Let us look at one small next step."),
        ],
        session_label="conv-1",
    )

    assert "Session Stage Report - Session conv-1" in report
    assert "Suggested opening" in report
