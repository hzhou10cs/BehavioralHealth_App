from app.schemas import Message


def generate_assistant_reply(messages: list[Message]) -> str:
    user_messages = [message for message in messages if message.role == "user"]

    if not user_messages:
        return (
            "Hello, I am here to support you. Share what is on your mind, "
            "and I will respond with a sample reflection."
        )

    latest_user_message = user_messages[-1].content.strip()

    return (
        "Thanks for sharing that. I hear you saying: "
        f"'{latest_user_message}'. "
        "I would encourage you to pause, take one slow breath, and name "
        "one small next step you can take today."
    )
