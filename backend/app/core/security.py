import os
import hashlib
import hmac
import time
from typing import Any, Union, Dict, Optional
import jwt
from jwt.exceptions import PyJWTError, ExpiredSignatureError, InvalidTokenError

from app.core.config import settings


def hash_password(password: str) -> str:
    """
    Hash password using PBKDF2-HMAC-SHA256 with a 16-byte cryptographically secure salt
    and 100,000 iterations (OWASP recommended standard).
    """
    if not password:
        raise ValueError("Password cannot be empty")
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored salt:hash using constant-time comparison."""
    if not plain_password or not hashed_password:
        return False
    try:
        parts = hashed_password.split(":")
        if len(parts) != 2:
            return False
        salt_hex, key_hex = parts
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        actual_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(actual_key, expected_key)
    except Exception:
        return False


def create_access_token(
    subject: Union[str, Any],
    expires_delta_seconds: Optional[int] = None,
    extra_claims: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate standards-compliant JWT access token signed with HMAC-SHA256.
    Includes subject, issued-at, and expiration claims.
    """
    now = int(time.time())
    if expires_delta_seconds is not None:
        exp = now + expires_delta_seconds
    else:
        exp = now + (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": exp,
    }
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return token


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and cryptographically verify JWT token signature, expiration,
    and required claims using PyJWT.
    Returns None if signature is invalid, token is expired, or claims are malformed.
    """
    if not token or not isinstance(token, str):
        return None
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "iat", "sub"]}
        )
        return payload
    except (ExpiredSignatureError, InvalidTokenError, PyJWTError):
        return None
    except Exception:
        return None
