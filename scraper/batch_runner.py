import asyncio
from playwright.async_api import async_playwright
from ssuet_scraper import SSUETScraper


async def run_job_for_student(student: dict, job_type: str, browser, semaphore: asyncio.Semaphore) -> dict:
    """
    Runs one job (marks / voucher / admitcard) for one student.
    The semaphore is the REAL concurrency limiter — batch_size just
    controls how many students are grouped together conceptually
    (e.g. for progress reporting / DB writes), it does NOT mean
    batch_size browsers run at once.
    """
    async with semaphore:
        scraper = SSUETScraper(student['regno'], student['password'], browser)
        try:
            if job_type == 'marks':
                data = await scraper.scrape_marks()
            elif job_type == 'voucher':
                data = await scraper.download_voucher()
            elif job_type == 'admitcard':
                data = await scraper.download_admit_card()  # uses DEFAULT_ADMIT_CARD_DIR / ADMIT_CARD_DIR env var
            else:
                raise ValueError(f"Unknown job_type: {job_type}")

            if isinstance(data, dict) and 'error' in data:
                raise RuntimeError(data['error'])

            return {'regno': student['regno'], 'status': 'success', 'data': data}

        except Exception as e:
            return {'regno': student['regno'], 'status': 'failed', 'error': str(e)}


async def process_all_students(
    students: list[dict],
    job_type: str,
    batch_size: int = 200,
    concurrency: int = 15,
    max_retries: int = 2,
    headless: bool = True,
) -> dict:
    """
    Processes `students` (each a dict with 'regno' and 'password') for the
    given job_type, in batches of `batch_size`. Within each batch, at most
    `concurrency` logins run at the same time (one shared browser, many
    contexts). Any student whose job fails gets pushed to the FRONT of the
    remaining queue, so they're retried as part of the very next batch,
    up to `max_retries` attempts total. After that they're recorded as
    permanently failed.

    Returns {regno: {'status': 'success'|'failed', 'data' | 'error': ..., 'attempts': n}}
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        semaphore = asyncio.Semaphore(concurrency)

        try:
            pending = list(students)
            attempt_counts = {s['regno']: 0 for s in students}
            results: dict[str, dict] = {}
            batch_num = 0

            while pending:
                batch_num += 1
                batch = pending[:batch_size]
                pending = pending[batch_size:]

                print(f"\n=== Batch {batch_num}: {len(batch)} students "
                      f"(concurrency={concurrency}) ===")

                for s in batch:
                    attempt_counts[s['regno']] += 1

                tasks = [run_job_for_student(s, job_type, browser, semaphore) for s in batch]
                batch_results = await asyncio.gather(*tasks)

                retry_this_round = []
                for student, result in zip(batch, batch_results):
                    regno = student['regno']
                    if result['status'] == 'success':
                        results[regno] = {**result, 'attempts': attempt_counts[regno]}
                    else:
                        if attempt_counts[regno] < max_retries:
                            print(f"  [{regno}] failed (attempt {attempt_counts[regno]}) "
                                  f"-> requeued for next batch: {result.get('error')}")
                            retry_this_round.append(student)
                        else:
                            print(f"  [{regno}] failed permanently after "
                                  f"{attempt_counts[regno]} attempts: {result.get('error')}")
                            results[regno] = {**result, 'attempts': attempt_counts[regno]}

                # Failed students go to the FRONT of the queue -> they're
                # part of the very next batch, not stuck at the end.
                pending = retry_this_round + pending

                succeeded = sum(1 for r in results.values() if r['status'] == 'success')
                print(f"=== Batch {batch_num} done. "
                      f"Running total: {succeeded} succeeded so far, "
                      f"{len(pending)} still pending ===")

            return results
        finally:
            await browser.close()


if __name__ == '__main__':
    # Example: load your actual student list from a DB instead of this.
    students = [
        {'regno': 'EE-000-000', 'password': 'placeholder'},
        # ... hundreds more
    ]

    summary = asyncio.run(
        process_all_students(
            students=students,
            job_type='marks',
            batch_size=200,
            concurrency=15,
            max_retries=2,
            headless=True,
        )
    )

    failed = [r for r in summary.values() if r['status'] == 'failed']
    print(f"\nFinal: {len(summary) - len(failed)} succeeded, {len(failed)} permanently failed")