import hashlib
import hmac
import secrets
from dataclasses import dataclass


@dataclass
class UserAccount:
    email: str
    user_name: str
    password_salt: str
    password_hash: str


class InMemoryAuthStore:
    def __init__(self) -> None:
        self._users_by_email: dict[str, UserAccount] = {}
        self._seed_demo_account()

    def reset(self) -> None:
        self._users_by_email = {}
        self._seed_demo_account()

    def _seed_demo_account(self) -> None:
        self.register(
            email="demo@health.app",
            user_name="demo",
            password="password123",
        )

    def register(self, email: str, user_name: str, password: str) -> UserAccount:
        normalized_email = email.strip().lower()
        if normalized_email in self._users_by_email:
            raise ValueError("Email already registered")

        salt = secrets.token_hex(16)
        password_hash = self._hash_password(password=password, salt=salt)
        account = UserAccount(
            email=normalized_email,
            user_name=user_name.strip(),
            password_salt=salt,
            password_hash=password_hash,
        )
        self._users_by_email[normalized_email] = account
        return account

    def authenticate(self, email: str, password: str) -> UserAccount | None:
        normalized_email = email.strip().lower()
        account = self._users_by_email.get(normalized_email)
        if account is None:
            return None
        expected_hash = self._hash_password(password=password, salt=account.password_salt)
        if not hmac.compare_digest(account.password_hash, expected_hash):
            return None
        return account

    def _hash_password(self, password: str, salt: str) -> str:
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120_000,
        )
        return digest.hex()
