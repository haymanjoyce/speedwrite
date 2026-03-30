"""
Maintenance script — run periodically via cron.
Clears expired reset tokens from users.json.
Usage: python cleanup.py
"""
import sys
from datetime import datetime, timezone
from storage import load_users, save_users


def clear_expired_reset_tokens():
    users = load_users()
    changed = 0
    for user in users:
        expires_str = user.get("reset_token_expires")
        if expires_str:
            try:
                expires = datetime.fromisoformat(expires_str)
                if datetime.now(timezone.utc) > expires:
                    user["reset_token"] = None
                    user["reset_token_expires"] = None
                    changed += 1
            except ValueError:
                user["reset_token"] = None
                user["reset_token_expires"] = None
                changed += 1
    if changed:
        save_users(users)
        print(f"Cleared expired reset tokens for {changed} user(s).")
    else:
        print("No expired reset tokens found.")


def reset_stale_action_counters():
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    users = load_users()
    changed = 0
    for user in users:
        reset_at_str = user.get("ai_actions_reset_at")
        if reset_at_str:
            try:
                reset_at = datetime.fromisoformat(reset_at_str)
                if reset_at.year != now.year or reset_at.month != now.month:
                    user["ai_actions_used"] = 0
                    user["ai_actions_reset_at"] = now.isoformat()
                    changed += 1
            except ValueError:
                user["ai_actions_used"] = 0
                user["ai_actions_reset_at"] = now.isoformat()
                changed += 1
    if changed:
        save_users(users)
        print(f"Reset action counters for {changed} user(s).")
    else:
        print("No stale action counters found.")


if __name__ == "__main__":
    clear_expired_reset_tokens()
    reset_stale_action_counters()
    sys.exit(0)
