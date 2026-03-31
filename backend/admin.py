from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from storage import list_documents, load_users

router = APIRouter()


@router.get("/users")
def admin_get_users(user: dict = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Access denied")

    now = datetime.now(timezone.utc)
    all_users = load_users()

    total_actions_this_month = 0
    for u in all_users:
        reset_at = u.get("ai_actions_reset_at")
        if reset_at:
            try:
                dt = datetime.fromisoformat(reset_at.replace("Z", "+00:00"))
                if dt.year == now.year and dt.month == now.month:
                    total_actions_this_month += u.get("ai_actions_used", 0)
            except ValueError:
                pass

    users_out = []
    for u in all_users:
        doc_count = len(list_documents(u["id"]))
        users_out.append({
            "id": u["id"],
            "email": u["email"],
            "display_name": u.get("display_name"),
            "plan": u.get("plan", "free"),
            "ai_actions_used": u.get("ai_actions_used", 0),
            "has_byok_key": bool(u.get("byok_key_encrypted")),
            "document_count": doc_count,
            "is_admin": u.get("is_admin", False),
        })

    return {
        "summary": {
            "total_users": len(all_users),
            "total_actions_this_month": total_actions_this_month,
        },
        "users": users_out,
    }
