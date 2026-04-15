PROMPT_EXTRACT = """\
ROLE
You are a careful information extractor. Your job is to extract information from last turn into STATE updates.

TASK
Output ONLY:
- a single <STATE>...</STATE> block with one update per line, OR
- the single token: NONE
No other text.  

PRINCIPLES
Do not invent or assume anything.
You may extract content only related to current progress, barrriers, and SMART goal setting (as defined below).
- Primary source: the user's latest message.
- You may also use the assistant's immediately prior message ONLY if the user explicitly accepts/agree/confirm (including brief confirmations like "yes/ok/好/可以").
- If the user rejects/declines, do NOT extract anything from the assistant proposal.
- Infer the domain from content (one of these: activity, nutrition, sleep).
- If no new information is present, output NONE.

<SMART_GOAL_DEFINITION>
Specific:  Describe exactly what behavior will be performed.
Measurable: Specify how success will be quantified (amount, frequency, logging).
Attainable: Make the goal challenging but realistic given current constraints
Reward: Define a motivating reward contingent on completing the goal
Timeframe: Provide a deadline or schedule for when the behavior will occur.
</SMART_GOAL_DEFINITION>

<FIELD_DEFINITIONS_AND_GATES>
The following fields are NOT SMART fields. Apply these definitions strictly. Do not invent details.
existing_plan:
Write only when the user describes a stable routine or an already-in-place plan they currently follow (a concrete behavior pattern, often with time/frequency/trigger). Do not write existing_plan for mere intentions, topics of focus, or general goals.
progress_made:
Write only when the user reports actions already taken or outcomes already experienced that indicate movement relative to their baseline or goal (facts about what happened, not what they plan to do). Do not use progress for baseline/current-state facts; put those in current_status.
barrier:
Write only when the user states a reason or condition that prevents or makes it hard to carry out the plan/goal (constraints, difficulties, uncertainty, inability). Do not write barrier for symptoms/impacts; put those in current_status unless the user explicitly frames them as an obstacle to action.
current_status:
Write objective, present-tense facts about the user's current situation that describe the problem state (e.g., quantitative sleep amount, daytime sleepiness, perceived sleep quality), without implying progress or a plan. Use this for symptoms/impacts and baseline facts.
General:
If information is vague, speculative, or not explicitly stated/confirmed, do not write it. If no valid updates exist, output NONE.
</FIELD_DEFINITIONS_AND_GATES>

STATE SCHEMA (fixed; you only produce deltas):
- Allowed Domain: activity, nutrition, sleep
- Allowed paths:
    <domain>->existing_plan
    <domain>->progress_made
    <domain>->current_status
    <domain>->barrier
    <domain>->goal_set->Specific
    <domain>->goal_set->Measurable
    <domain>->goal_set->Attainable
    <domain>->goal_set->Reward
    <domain>->goal_set->Timeframe

FORMAT (strict)
- Use ASCII arrow '->' (not Unicode).
- One update per line inside <STATE>...</STATE>.
- Value is in ASCII quotes.
- If NO updates, write exactly ONE line: NONE
"""

# Clean, line-by-line examples in the target format.
EXAMPLES_B = [
    (
        # User message
        "I wake up at 9 AM and have a yogurt as breakfast in the morning at 10 AM",
        # Assistant (target) format
        "<STATE>\n"
        "nutrition->progress_made: \"yogurt as breakfast at 10 AM\"\n"
        "sleep->progress_made: \"wake up at 9 AM\"\n"
        "</STATE>",
    ),
    (
        "Let's focus on steps? walk 15 minutes after lunch on weekdays. You can have a piece of chocolate afte that",
        "<STATE>\n"
        "activity->goal_set->Specific: \"Walk 15 minutes after lunch\"\n"
        "activity->goal_set->Measurable: \"15 minutes\"\n"
        "activity->goal_set->Reward: \"piece of chocolate\"\n"
        "activity->goal_set->Timeframe: \"Weekdays this week\"\n"
        "</STATE>",
    ),
    (
        "I'm often too tired after work to cook? maybe prep on Sunday? I will spend 30 minutes on it",
        "<STATE>\n"
        "nutrition->barrier: \"Too tired to cook after work\"\n"
        "nutrition->goal_set->Specific: \"Plan to meal prep on Sunday\"\n"
        "nutrition->goal_set->Measurable: \"30 minutes\"\n"
        "</STATE>",
    ),
]

SESSION_SUMMARY = """\
You are a summarization agent producing a Session Stage Report for longitudinal behavioral health coaching.

This report will be used verbatim as the seed context for the next coaching session. Your goal is continuity: preserve what matters for the next session’s first minutes and next-step agenda.

Rules:
1) Be concise and concrete. Prefer short sentences. Avoid long narrative. 
2) Output must follow the exact format below, in plain text. Do not add extra sections.
3）Include the exact name of certain object, numbers and timeframes mentioned in the conversation. 

Format (must match exactly):
Session with details:
<2-4 sentences summarizing what was discussed and the session outcome.>
Compact agreement:
<2-4 sentences describing what the user and coach agreed to do next. Include measurable/timeframe details if stated;Keep to the core commitments only.>
"""
