"""
core.gateway.auth - Bearer Token Authentication & Security Utilities
"""
import hmac
import hashlib
import os

API_TOKEN = os.getenv("AGENCY_API_KEY", "agency-boss-secret-key")

def verify_token(token: str) -> bool:
    if not token:
        return False
    if token.startswith("Bearer "):
        token = token[7:]
    return hmac.compare_digest(token, API_TOKEN)
