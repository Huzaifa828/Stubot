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


def aggregate_course_marks(items: list[dict]) -> dict:
    mid_obtained, mid_max = 0.0, 0.0
    qa_obtained, qa_max = 0.0, 0.0
    lab_obtained, lab_max = 0.0, 0.0

    for item in items:
        a_type = (item.get('assessment_type') or '').lower()
        a_name = (item.get('assessment_name') or '').lower()
        title = f"{a_type} {a_name}"

        try:
            obt = float(item.get('obtained_marks') or 0)
            tot = float(item.get('total_marks') or 0)
        except (ValueError, TypeError):
            continue

        if tot == 0 and ('clo' in title or 'outcome' in title):
            continue

        if 'mid' in title:
            mid_obtained += obt
            mid_max += tot
        elif 'lab' in title or 'practical' in title or 'viva' in title or 'journal' in title:
            lab_obtained += obt
            lab_max += tot
        else:
            qa_obtained += obt
            qa_max += tot

    mid_scaled = round((mid_obtained / mid_max) * 30, 1) if mid_max > 0 else None
    qa_scaled = round((qa_obtained / qa_max) * 20, 1) if qa_max > 0 else None
    lab_scaled = round((lab_obtained / lab_max) * 50, 1) if lab_max > 0 else None

    total_scaled = 0.0
    has_val = False
    if mid_scaled is not None:
        total_scaled += mid_scaled
        has_val = True
    if qa_scaled is not None:
        total_scaled += qa_scaled
        has_val = True
    if lab_scaled is not None:
        total_scaled += lab_scaled
        has_val = True

    return {
        'midterm': f"{mid_scaled} / 30" if mid_scaled is not None else "N/A / 30",
        'quizzes_assignments': f"{qa_scaled} / 20" if qa_scaled is not None else "N/A / 20",
        'lab': f"{lab_scaled} / 50" if lab_scaled is not None else "N/A / 50",
        'total': f"{round(total_scaled, 1)} / 100" if has_val else "N/A / 100"
    }


def format_all_stored_marks(marks: list[dict]) -> str:
    """Formats all stored marks into a clean course summary (Midterm/30, Quizzes+Assign/20, Lab/50)."""
    if not marks:
        return "ℹ️ No marks records found in the database yet."

    courses = {}
    for m in marks:
        c_name = m.get('course', 'Other Subject')
        if c_name not in courses:
            courses[c_name] = []
        courses[c_name].append(m)

    lines = ["📊 *SSUET Academic Marks Summary*", ""]
    for c_name, items in courses.items():
        summary = aggregate_course_marks(items)
        lines.append(f"📚 *{c_name}*")
        lines.append(f"  • Midterm: *{summary['midterm']}*")
        lines.append(f"  • Quizzes & Assignments: *{summary['quizzes_assignments']}*")
        lines.append(f"  • Lab / Practical: *{summary['lab']}*")
        lines.append(f"  🏆 Total: *{summary['total']}*")
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
