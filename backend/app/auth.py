import base64
import hashlib
import hmac
import json
import secrets


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """Hash a password with scrypt and return (salt, hash) for storage."""
    salt_bytes = (
        base64.b64decode(salt.encode("utf-8"))
        if salt is not None
        else secrets.token_bytes(16)
    )
    password_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_bytes,
        n=2**14,
        r=8,
        p=1,
    )
    return (
        base64.b64encode(salt_bytes).decode("utf-8"),
        base64.b64encode(password_hash).decode("utf-8"),
    )


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    _, computed_hash = hash_password(password, salt=salt)
    return hmac.compare_digest(computed_hash, expected_hash)


def _urlsafe_b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def create_access_token(
    *,
    auth_user_id: int,
    user_id: int,
    email: str,
    secret_key: str,
) -> str:
    payload = json.dumps(
        {
            "auth_user_id": auth_user_id,
            "user_id": user_id,
            "email": email.lower(),
        },
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    signature = hmac.new(secret_key.encode("utf-8"), payload, hashlib.sha256).digest()
    return f"{_urlsafe_b64encode(payload)}.{_urlsafe_b64encode(signature)}"


def verify_access_token(token: str, *, secret_key: str) -> dict[str, int | str]:
    try:
        payload_segment, signature_segment = token.split(".", 1)
        payload = _urlsafe_b64decode(payload_segment)
        expected_signature = hmac.new(
            secret_key.encode("utf-8"), payload, hashlib.sha256
        ).digest()
        actual_signature = _urlsafe_b64decode(signature_segment)
        if not hmac.compare_digest(actual_signature, expected_signature):
            raise ValueError("Invalid token signature")

        parsed = json.loads(payload.decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("Invalid token") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Invalid token payload")

    auth_user_id = parsed.get("auth_user_id")
    user_id = parsed.get("user_id")
    email = parsed.get("email")
    if not isinstance(auth_user_id, int):
        raise ValueError("Invalid auth user id")
    if not isinstance(user_id, int):
        raise ValueError("Invalid user id")
    if not isinstance(email, str) or not email:
        raise ValueError("Invalid email")

    return {
        "auth_user_id": auth_user_id,
        "user_id": user_id,
        "email": email.lower(),
    }
