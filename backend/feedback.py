import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from mailer import send_email

logger = logging.getLogger(__name__)

router = APIRouter()

_FEEDBACK_EMAIL = os.getenv("FEEDBACK_EMAIL") or os.getenv("EMAIL_FROM", "noreply@speedwrite.app")


class FeedbackRequest(BaseModel):
    message: str


@router.post("/feedback")
def submit_feedback(body: FeedbackRequest, user: dict = Depends(get_current_user)):
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")
    if len(message) > 2000:
        raise HTTPException(status_code=422, detail="Message exceeds 2000 character limit.")
    try:
        send_email(
            to_email=_FEEDBACK_EMAIL,
            subject=f"SpeedWrite feedback from {user['email']}",
            body=message,
        )
    except Exception as exc:
        logger.error("Failed to send feedback email: %s", exc)
    return {"ok": True}
