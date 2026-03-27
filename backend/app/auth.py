import base64
import hashlib
import hmac
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
