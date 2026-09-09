import asyncio
from typing import Optional
from playwright.async_api import async_playwright, Browser
import os
from dotenv import load_dotenv

load_dotenv()
url = 'https://edusmartz.ssuet.edu.pk/StudentPortal/Login'
admit_card_url = 'https://edusmartz.ssuet.edu.pk/studentportal/viewadmitcard'

DEFAULT_ADMIT_CARD_DIR = os.path.abspath(
    os.getenv('ADMIT_CARD_DIR', os.path.join(os.path.dirname(__file__), 'admit_cards'))
)

DEFAULT_VOUCHER_DIR = os.path.abspath(
    os.getenv('VOUCHER_DIR', os.path.join(os.path.dirname(__file__), 'vouchers'))
)

class SSUETScraper:
    """
    Async scraper. Takes an already-launched Browser (shared across many
    students) and opens its own isolated BrowserContext per login — this is
    what makes it cheap to run hundreds of these concurrently: you pay for
    one Chromium process, not one per student.
    """

    def __init__(self, regno: str, password: str, browser: Browser):
        self.regno    = regno
        self.password = password
        self.browser  = browser   # shared, NOT owned by this instance
        self.context  = None
        self.page     = None

    async def login(self) -> dict:
        """Opens a fresh context/page on the shared browser and logs in."""
        self.context = await self.browser.new_context()
        self.page    = await self.context.new_page()

        await self.page.goto(url)
        await self.page.wait_for_load_state('load')
        await asyncio.sleep(5)

        await self.page.fill('[name="txtRegistrationNo_cs"]', self.regno)
        await self.page.fill('[name="txtPassword_m6cs"]',     self.password)
        await self.page.press('[name="txtPassword_m6cs"]',    'Enter')
        await self.page.wait_for_load_state('networkidle')
        await asyncio.sleep(10)

        if await self.page.is_visible('[name="txtPassword_m6cs"]'):
            await self.close()
            return {'error': 'Login Failed'}

        print(f"[{self.regno}] Logged in: {self.page.url}")
        await asyncio.sleep(5)

        # Dismiss popup if present — always continue afterwards
        try:
            modal = self.page.locator('#exampleModal')
            if await modal.is_visible(timeout=2000):
                print(f'[{self.regno}] modal detected')
                popup = modal.locator("button:has-text('close'), [data-dismiss='modal'], .close")
                if await popup.is_visible(timeout=2000):
                    await popup.click()
                    await asyncio.sleep(2)
        except Exception as e:
            print(f"[{self.regno}] No popup or couldn't dismiss it: {e}")

        return {'status': 'success'}

    async def scrape_marks(self) -> list:
        """Explicit login — logs in itself, works standalone or in a batch."""
        result = await self.login()
        if 'error' in result:
            print(f"[{self.regno}] {result['error']}")
            return []

        page = self.page

        try:
            await page.get_by_role("link", name='Exam', exact=False).click()
            await page.wait_for_load_state('networkidle')
            await page.get_by_role("link", name='Assessment Result', exact=False).click()
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(3)

            session_dropdown = page.locator('select[id*="ctl00_ContentPlaceHolder1_cmbSession_grp1_ct"]')
            await session_dropdown.wait_for(state='visible', timeout=15000)
            await session_dropdown.select_option(index=1)
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(5)

            marks = []
            course_options = await page.query_selector_all(
                'select[id*="ctl00_ContentPlaceHolder1_cmbCourse"] option'
            )
            print(f"[{self.regno}] Found {len(course_options)} courses")

            for i in range(1,len(course_options)):
                try:
                    course_name = (await course_options[i].inner_text()).strip()
                    print(f"[{self.regno}] Scraping course {i}: {course_name}")

                    await page.select_option(
                        'select[id*="ctl00_ContentPlaceHolder1_cmbCourse"]', index=i
                    )
                    await page.wait_for_load_state('networkidle')
                    await asyncio.sleep(3)

                    table = page.locator('table[id*="TgridAssesmentDetail"]')
                    if await table.count() == 0:
                        print(f"[{self.regno}]   No table for {course_name}")
                        continue

                    group_rows  = table.locator('tr.rgGroupHeader')
                    group_count = await group_rows.count()
                    for g in range(group_count):
                        expand_btn = group_rows.nth(g).locator('input.rgExpand')
                        if await expand_btn.count() > 0:
                            await expand_btn.click()
                            await page.wait_for_load_state('networkidle')
                            await asyncio.sleep(1)

                    rows = table.locator('tr.rgRow, tr.rgAltRow')
                    row_count = await rows.count()
                    print(f"[{self.regno}]   Found {row_count} rows")

                    for idx in range(row_count):
                        row   = rows.nth(idx)
                        cells = row.locator('td')
                        if await cells.count() >= 9:
                            marks.append({
                                'assessment_type': (await cells.nth(1).inner_text()).strip(),
                                'assessment_name': (await cells.nth(2).inner_text()).strip(),
                                'course':          (await cells.nth(3).inner_text()).strip(),
                                'section':         (await cells.nth(4).inner_text()).strip(),
                                'teacher':         (await cells.nth(5).inner_text()).strip(),
                                'total_marks':     (await cells.nth(6).inner_text()).strip(),
                                'passing_marks':   (await cells.nth(7).inner_text()).strip(),
                                'obtained_marks':  (await cells.nth(8).inner_text()).strip(),
                            })

                except Exception as e:
                    print(f"[{self.regno}] Course {i} failed: {e}")
                    continue

                await asyncio.sleep(2)

            print(f"[{self.regno}] Total marks scraped: {len(marks)}")
            return marks
        finally:
            await self.close()

    async def download_voucher(self, save_dir: Optional[str] = None) -> dict:
        """
        Explicit login — logs in itself, works standalone or in a batch.
        Mirrors download_admit_card()'s save/capture logic. NOTE: unlike
        the admit card, the exact click behavior of btnGenerateVoucher
        hasn't been confirmed via dev tools — it may trigger a direct
        download (handled below) or open a report viewer / new tab
        instead, in which case this will return an error rather than
        silently reporting success with nothing saved. Inspect the real
        behavior and adjust the capture logic if that happens.
        """
        save_dir = os.path.abspath(save_dir) if save_dir else DEFAULT_VOUCHER_DIR
 
        result = await self.login()
        if 'error' in result:
            print(f"[{self.regno}] {result['error']}")
            return result
 
        page = self.page
 
        try:
            await page.get_by_role("link", name='Fee', exact=False).click()
            await page.wait_for_load_state('networkidle')
            await page.get_by_role("link", name='Generate Current Balance Voucher', exact=False).click()
            await page.wait_for_load_state('domcontentloaded')
            await asyncio.sleep(5)
 
            voucher_btn = page.locator('[id*="ctl00_ContentPlaceHolder1_btnGenerateVoucher"]')
            if await voucher_btn.count() == 0:
                return {'error': 'Generate voucher button not found'}
 
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(save_dir, f'{self.regno}_voucher.pdf')
 
            try:
                async with page.expect_download(timeout=30000) as download_info:
                    await voucher_btn.click()
                download = await download_info.value
                await download.save_as(save_path)
                print(f"[{self.regno}] Voucher saved to {save_path}")
                return {'status': 'downloaded', 'path': save_path}
            except Exception as e:
                print(f"[{self.regno}] No direct download captured: {e}")
                return {'error': f'Voucher click did not trigger a direct download: {e}'}
        finally:
            await self.close()

    async def download_admit_card(self, save_dir: Optional[str] = None) -> dict:
        """
        Explicit login — logs in itself, works standalone or in a batch.
        Navigates straight to the admit card URL (session cookie carries
        over from login, so no need to click through menus). The page's
        `downloadAdmitCard()` JS function (bound to the "Save as PDF" icon)
        renders #DivCourseTable via html2pdf.js — applying a temporary
        CSS scale for a cleaner capture, then generating 'AdmitCard.pdf'
        client-side and triggering a real file download — captured here
        with page.expect_download(). Rendering takes a moment, hence the
        longer timeout.
        """
        save_dir = os.path.abspath(save_dir) if save_dir else DEFAULT_ADMIT_CARD_DIR
 
        result = await self.login()
        if 'error' in result:
            print(f"[{self.regno}] {result['error']}")
            return result
 
        page = self.page
 
        try:
            await page.goto(admit_card_url)
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(2)
 
            content = page.locator('#DivCourseTable')
            if await content.count() == 0:
                return {'error': 'Admit card page did not load as expected'}
 
            # Empty table generally means the admit card hasn't been issued yet
            table_text = (await content.inner_text()).strip()
            if not table_text:
                print(f"[{self.regno}] Admit card not available yet")
                return {'status': 'not_available'}
 
            download_link = page.locator('a[href*="downloadAdmitCard"]')
            if await download_link.count() == 0:
                return {'error': 'Download link not found on page'}
 
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(save_dir, f'{self.regno}_admitcard.pdf')
 
            async with page.expect_download(timeout=45000) as download_info:
                await download_link.click()
            download = await download_info.value
            await download.save_as(save_path)
 
            print(f"[{self.regno}] Admit card saved to {save_path}")
            return {'status': 'downloaded', 'path': save_path}
 
        except Exception as e:
            print(f"[{self.regno}] Admit card download failed: {e}")
            return {'error': str(e)}
        finally:
            await self.close()

    async def close(self):
        """Closes this student's context only — the shared browser stays open."""
        if self.context:
            await self.context.close()
            self.context = None
            self.page = None


if __name__ == '__main__':
    async def _demo():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            try:
                scraper = SSUETScraper(
                    regno=os.getenv('stu_id', 'Your-Student-ID'),
                    password=os.getenv('pass', 'Your-Password-Here'),
                    browser=browser,
                )
                marks = await scraper.scrape_marks()
                # dv= await scraper.download_voucher()
                # adc= await scraper.download_admit_card()
                print(marks)
                # print(dv)
                # print(adc)
            finally:
                await browser.close()

    asyncio.run(_demo())