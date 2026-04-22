from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.api.v1.deps import get_current_user, get_db
from app.models.user import User
from app.core.mail import send_email, load_admin_emails

router = APIRouter(prefix="/contact", tags=["Contact & Reports"])

CONTACT_CATEGORIES = ["Bug Report", "Account Issue", "Feature Request", "Other"]
REPORT_REASONS = ["Spam", "Fake Profile", "Harassment", "Inappropriate Content", "Other"]


def _user_display(user: User) -> str:
    if user.profile and user.profile.full_name:
        return user.profile.full_name
    return user.email


def _now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _contact_html(sender: User, category: str, message: str) -> str:
    name = _user_display(sender)
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px;background:#0f0c1a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:0 auto;background:#1a1730;border-radius:16px;padding:32px;border:1px solid rgba(139,92,246,0.25);">
    <h2 style="margin:0 0 24px;color:#8b5cf6;font-size:20px;">⚡ Spark — New Support Request</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#94a3b8;width:130px;">From</td><td style="color:#fff;font-weight:600;">{name}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Email</td><td style="color:#fff;">{sender.email}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Category</td>
          <td><span style="background:rgba(139,92,246,0.2);color:#a78bfa;padding:2px 12px;border-radius:20px;font-size:12px;font-weight:600;">{category}</span></td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Sent at</td><td style="color:#64748b;">{_now_utc()}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:20px 0;">
    <p style="color:#94a3b8;margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;">Message</p>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px;color:#e2e8f0;line-height:1.7;white-space:pre-wrap;">{message}</div>
  </div>
</body>
</html>"""


def _report_html(reporter: User, reported_name: str, reported_id: int, reason: str, description: str) -> str:
    r_name = _user_display(reporter)
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:32px;background:#0f0c1a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:0 auto;background:#1a1730;border-radius:16px;padding:32px;border:1px solid rgba(239,68,68,0.3);">
    <h2 style="margin:0 0 24px;color:#ef4444;font-size:20px;">🚨 Spark — User Report</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#94a3b8;width:150px;">Reporter</td><td style="color:#fff;font-weight:600;">{r_name} (ID: {reporter.id})</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Reporter email</td><td style="color:#fff;">{reporter.email}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Reported user</td><td style="color:#fff;font-weight:600;">{reported_name} (ID: {reported_id})</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Reason</td>
          <td><span style="background:rgba(239,68,68,0.15);color:#f87171;padding:2px 12px;border-radius:20px;font-size:12px;font-weight:600;">{reason}</span></td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Reported at</td><td style="color:#64748b;">{_now_utc()}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:20px 0;">
    <p style="color:#94a3b8;margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;">Description</p>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px;color:#e2e8f0;line-height:1.7;white-space:pre-wrap;">{description}</div>
  </div>
</body>
</html>"""


class ContactRequest(BaseModel):
    category: str
    message: str


class ReportRequest(BaseModel):
    reported_user_id: int
    reason: str
    description: str


@router.post("/send")
async def contact_support(
    body: ContactRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    if body.category not in CONTACT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    msg = body.message.strip()
    if not msg or len(msg) > 2000:
        raise HTTPException(status_code=400, detail="Message must be 1–2000 characters")

    recipients = load_admin_emails()
    html = _contact_html(current_user, body.category, msg)
    subject = f"[Spark Support] {body.category} – {_user_display(current_user)}"
    background_tasks.add_task(send_email, subject, html, recipients)
    return {"status": "sent"}


@router.post("/report")
async def report_user(
    body: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Invalid reason")
    desc = body.description.strip()
    if not desc or len(desc) > 2000:
        raise HTTPException(status_code=400, detail="Description must be 1–2000 characters")
    if body.reported_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")

    reported = db.query(User).filter(User.id == body.reported_user_id).first()
    if not reported:
        raise HTTPException(status_code=404, detail="User not found")

    reported_name = reported.profile.full_name if reported.profile else reported.email
    recipients = load_admin_emails()
    html = _report_html(current_user, reported_name, reported.id, body.reason, desc)
    subject = f"[Spark Report] {body.reason} – by {_user_display(current_user)}"
    background_tasks.add_task(send_email, subject, html, recipients)
    return {"status": "sent"}
