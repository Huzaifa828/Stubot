import asyncio
from playwright.async_api import async_playwright
from scraper.portal_scraper import SSUETScraper
from modules.marks.repo import process_scraped_marks, get_latest_marks
from modules.whatsapp.client import send_whatsapp_message


def format_marks_message(changes: list[dict]) -> str:
    """Formats new or changed marks into a readable WhatsApp message."""
    lines = ["🎓 *SSUET Portal - Marks Update Alert!*", ""]
    for c in changes:
        status_tag = "🆕 *NEW*" if c.get('change_type') == 'new' else "✏️ *UPDATED*"
        lines.append(f"{status_tag} {c.get('course', 'Unknown Course')}")
        lines.append(f"• {c.get('assessment_type', '')} ({c.get('assessment_name', '')})")
        lines.append(f"• Marks: *{c.get('obtained_marks', '-')}* / {c.get('total_marks', '-')}")
        lines.append("")
    return "\n".join(lines)


def format_all_stored_marks(marks: list[dict]) -> str:
    """Formats all stored marks for a student into a clean summary."""
    if not marks:
        return "ℹ️ No marks records found in the database yet."

    # Group by course
    courses = {}
    for m in marks:
        c_name = m.get('course', 'Other')
        if c_name not in courses:
            courses[c_name] = []
        courses[c_name].append(m)

    lines = ["📊 *SSUET Stored Marks Summary*", ""]
    for c_name, items in courses.items():
        lines.append(f"📚 *{c_name}*")
        for item in items:
            lines.append(f"  • {item.get('assessment_type')} - {item.get('assessment_name')}: *{item.get('obtained_marks')}* / {item.get('total_marks')}")
        lines.append("")

    return "\n".join(lines)


async def run_marks_check_for_student(student: dict, shared_browser=None) -> dict:
    """
    Executes live marks scrape for a single student, processes changes,
    and sends WhatsApp notification if new/changed marks are found.
    """
    regno = student.get('regno')
    portal_password = student.get('password_enc')
    student_id = student.get('id')
    whatsapp_number = student.get('whatsapp_number')

    if not regno or not portal_password:
        return {'status': 'error', 'error': 'Missing portal credentials'}

    close_browser_on_exit = False
    browser = shared_browser
    playwright_ctx = None

    try:
        if browser is None:
            playwright_ctx = await async_playwright().start()
            browser = await playwright_ctx.chromium.launch(headless=True)
            close_browser_on_exit = True

        scraper = SSUETScraper(regno=regno, password=portal_password, browser=browser)
        scraped_marks = await scraper.scrape_marks()

        if not scraped_marks:
            return {'status': 'no_changes', 'reason': 'No marks returned from scraper or login failed'}

        result = process_scraped_marks(student_id, scraped_marks)

        if result.get('status') == 'success' and result.get('changes'):
            changes = result['changes']
            msg = format_marks_message(changes)
            if whatsapp_number:
                send_whatsapp_message(whatsapp_number, msg)
            return {'status': 'notified', 'changes': changes}
        else:
            return {'status': 'no_changes'}

    except Exception as e:
        print(f"[{regno}] Error during live marks check: {e}")
        return {'status': 'error', 'error': str(e)}

    finally:
        if close_browser_on_exit and browser:
            await browser.close()
            if playwright_ctx:
                await playwright_ctx.stop()
