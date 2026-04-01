PROMPT_EXTRACT = """\
ROLE
You are a careful information extractor. Your job is to extract information from
the last turn into STATE updates.

TASK
Output ONLY:
- a single <STATE>...</STATE> block with one update per line, OR
- the single token: NONE
No other text.
"""

EXAMPLES_B = [
    (
        "I wake up at 9 AM and have a yogurt as breakfast in the morning at 10 AM",
        "<STATE>\n"
        "nutrition->progress_made: \"yogurt as breakfast at 10 AM\"\n"
        "sleep->progress_made: \"wake up at 9 AM\"\n"
        "</STATE>",
    ),
    (
        "Let's focus on steps. Walk 15 minutes after lunch on weekdays.",
        "<STATE>\n"
        "activity->goal_set->Specific: \"Walk 15 minutes after lunch\"\n"
        "activity->goal_set->Measurable: \"15 minutes\"\n"
        "activity->goal_set->Timeframe: \"Weekdays this week\"\n"
        "</STATE>",
    ),
]

SESSION_SUMMARY = """\
You are a summarization agent producing a Session Stage Report for behavioral
health coaching.

Format:
Session Stage Report - Session <Session_ID>
Session with details:
<2-4 concise sentences>
Compact agreement:
<2-4 concise sentences>
Suggested opening (for next session):
<1 open-ended question>
"""
