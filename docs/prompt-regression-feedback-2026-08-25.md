# Prompt regression feedback — 2026-08-25

## Scope

This regression changed prompts only. The CST schema, state merge implementation, API flow, and model configuration were left unchanged so the comparison isolates prompt behavior as much as possible.

The live run used `gpt-4.1-mini`, Android Emulator `emulator-5554`, backend conversation `conv-6`, and the same three-turn Maya Chen scenario used for the previous run.

## Prompt changes

- Extractor: added strict domain/field mappings, one-line aggregation for scalar paths, active-plan revision rules, and corrected few-shot examples.
- Control generator: separated a fully defined SMART goal from completed behavior, limited ending and switching to explicit user requests, and gave execution results precedence as `review_progress`.
- Coach: added protocols for partial completion, revised plans, explicit focus retention, exact end-session summaries, and unsupported-commitment avoidance.
- Session summary: added evidence rules so only explicit user commitments or explicitly accepted coach proposals appear in `Compact agreement`.

## Three-turn live result

### Turn 1 — baseline and initial plan

Extractor result:

- Preserved `3000 steps` and `stress 8/10` together in one activity `current_status` value.
- Put `5.5 to 6 hours` in sleep `current_status`.
- Put the shoes cue and `7/10` confidence in activity `Attainable`.
- Did not label the future shoes cue or walking plan as `existing_plan`.

Remaining behavior: the first-session coach asked how Maya would remind herself even though the user had already said she would leave her shoes by the dining table. This path uses the separate first-session prompt and still needs a “do not re-ask answered details” rule.

### Turn 2 — partial execution and adaptation

Extractor result:

- Produced one combined `progress_made` update for two of three walks, full duration, stress change, and useful cues.
- Correctly captured late work and rain as a barrier.
- Correctly captured the indoor-video fallback as `Attainable` and tea after all three sessions as `Reward`.
- Did not write a future plan to `existing_plan`.

Control result:

```text
FOCUS: activity
MISSING_SMART_ASPECT: none
PRIORITY: review_progress
ASK_TYPE: summarize_and_check
```

This fixed the previous premature `switch_another_domain` decision. The coach accurately reviewed `2/3`, the `8 -> 6` stress change, barriers, fallback, and reward, without offering nutrition or sleep.

### Turn 3 — longer mixed-domain update and explicit ending

Correct behavior:

- Classified `9/10` confidence as activity `Attainable`.
- Classified one episode after four sessions as `Reward`.
- Captured the latest 15-minute, four-day, two-week plan and 5-minute fallback.
- Kept activity as the focus and selected `End_session` because the user explicitly requested ending.
- The coach ended without a question and summarized the latest plan rather than the older Monday/Wednesday/Friday plan.

Remaining extractor errors:

- `sleep about 6.5 hours` was still placed inside activity `current_status`, despite the explicit sleep-domain rule.
- The missed session caused by an urgent deadline was included in `progress_made` instead of being emitted as a new barrier.
- `Attainable` was emitted twice in one turn instead of combining fallback and confidence. This does not overwrite data because SMART fields are lists, but it makes active-plan resolution noisier.

## Final session report

The report preserved the latest commitment: 15 minutes after dinner on Monday, Tuesday, Thursday, and Saturday for two weeks; a minimum 5-minute indoor fallback after late work; and one episode after four sessions.

The prior unsupported commitment to track completion and stress did not recur. No new reminder, monitoring, or follow-up obligation was invented.

## Automated checks

- Prompt modules compiled successfully.
- `test_chatbox_extractor.py` and `test_chatbox_service.py`: 7/7 passed.
- Combined targeted suite: 36/37 passed.
- The single failure was the pre-existing login assertion that expects registration and login JWT strings to remain identical even when their `iat`/`exp` timestamps differ by one second. Authentication code was not changed in this work.

## Assessment

In this single controlled run, six of the eight previously identified prompt-level issues were resolved: scalar fact loss, future-plan `existing_plan` misuse, premature domain switching, confidence classification, reward classification, and unsupported summary commitments.

Two classification problems remain under a long mixed-domain input: sleep-domain leakage and missed-action/barrier confusion. The next prompt-only iteration should add a final per-fact validation pass and a negative few-shot example containing both activity progress and a sleep fact. If those remain unreliable, the stronger fix is structural validation after extraction: reject domain-incompatible values and represent progress/current status as lists or typed events rather than scalar strings.
