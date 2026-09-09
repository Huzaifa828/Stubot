import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from playwright.async_api import async_playwright
from modules.students.repo import get_all_students
from modules.marks.service import run_marks_check_for_student

scheduler = AsyncIOScheduler()


async def scheduled_marks_check_job():
    """
    Periodic job that runs every 30 minutes.
    Scrapes marks for all registered students using batch concurrency.
    Only notifies students when new/changed marks are found.
    """
    students = get_all_students()
    if not students:
        print("[Scheduler] No registered students to check.")
        return

    print(f"[Scheduler] Running 30-minute automated marks check for {len(students)} students...")

    playwright_ctx = None
    browser = None
    try:
        playwright_ctx = await async_playwright().start()
        browser = await playwright_ctx.chromium.launch(headless=True)
        semaphore = asyncio.Semaphore(15)

        async def check_student(student):
            async with semaphore:
                try:
                    res = await run_marks_check_for_student(student, shared_browser=browser)
                    print(f"[Scheduler] [{student.get('regno')}] Result: {res.get('status')}")
                except Exception as e:
                    print(f"[Scheduler] [{student.get('regno')}] Failed: {e}")

        await asyncio.gather(*(check_student(s) for s in students))

    except Exception as e:
        print(f"[Scheduler] Error during scheduled job execution: {e}")
    finally:
        if browser:
            await browser.close()
        if playwright_ctx:
            await playwright_ctx.stop()


def start_scheduler():
    scheduler.add_job(
        scheduled_marks_check_job,
        trigger='interval',
        minutes=30,
        id='scheduled_marks_check',
        replace_existing=True
    )
    scheduler.start()
    print("⏰ [Scheduler] APScheduler started (interval: 30 minutes)")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("⏰ [Scheduler] APScheduler stopped")
