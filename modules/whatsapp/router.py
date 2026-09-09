from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from modules.students.repo import get_student_by_whatsapp_number
from modules.whatsapp.repo import can_refresh, record_refresh_request
from modules.whatsapp.client import send_whatsapp_message
from modules.marks.repo import get_latest_marks
from modules.marks.service import format_all_stored_marks, run_marks_check_for_student
from utils.async_thread import run_async_in_new_thread

whatsapp_router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


class WebhookPayload(BaseModel):
    from_number: str = Field(..., alias="from")
    message: str

    class Config:
        populate_by_name = True



def handle_refresh_command(student: dict):
    """
    Executes live scrape for student and sends result back via WhatsApp.
    Runs SYNCHRONOUSLY on purpose — this function itself is now the thing
    FastAPI's BackgroundTasks calls in its own thread pool. It internally
    isolates the async Playwright work into its own dedicated thread +
    event loop, sidestepping uvicorn's SelectorEventLoop limitation.
    """
    whatsapp_number = student.get('whatsapp_number')

    try:
        result = run_async_in_new_thread(run_marks_check_for_student(student))
    except Exception as e:
        send_whatsapp_message(whatsapp_number, f"⚠️ Couldn't complete portal check: {e}")
        return

    if result.get('status') == 'no_changes':
        send_whatsapp_message(whatsapp_number, "ℹ️ No new marks since last check.")
    elif result.get('status') == 'error':
        err_msg = result.get('error', 'Unknown error')
        send_whatsapp_message(whatsapp_number, f"⚠️ Couldn't complete portal check: {err_msg}")


@whatsapp_router.post('/webhook')
def whatsapp_webhook(payload: WebhookPayload, background_tasks: BackgroundTasks):
    cmd = payload.message.strip().lower()

    student = get_student_by_whatsapp_number(payload.from_number)

    if not student:
        send_whatsapp_message(payload.from_number, "You're not registered yet. Please sign up first.")
        return {"status": "not_registered"}

    from_number = student['whatsapp_number']

    # Command Handling
    if cmd == "marks":
        marks = get_latest_marks(student['id'])
        reply = format_all_stored_marks(marks)
        send_whatsapp_message(from_number, reply)
        return {"status": "success", "command": "marks"}

    elif cmd in ["refresh", "check now"]:
        student_id = student['id']
        if not can_refresh(student_id):
            send_whatsapp_message(
                from_number,
                "You can only refresh once every 5 minutes. Please try again shortly."
            )
            return {"status": "rate_limited"}

        record_refresh_request(student_id)
        send_whatsapp_message(from_number, "Checking your portal now, this takes a minute...")

        background_tasks.add_task(handle_refresh_command, student)
        return {"status": "processing"}

    else:
        help_text = (
            "🤖 *SSUET Portal Assistant*\n\n"
            "Available commands:\n"
            "• *marks* - View latest stored marks\n"
            "• *refresh* or *check now* - Force live portal check"
        )
        send_whatsapp_message(from_number, help_text)
        return {"status": "help_sent"}